/**
 * Salt Design System AST validator.
 * Strict Draft-07 schema compiled with AJV; bound to Salt token rules.
 */
import Ajv, { type ErrorObject } from "ajv";

export const SALT_AST_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://nexus-tokens.jpm/salt/ui-spec.schema.json",
  title: "SaltUiSpec",
  type: "object",
  additionalProperties: false,
  required: ["chartType", "density", "theme", "assetClasses", "wcagTarget"],
  properties: {
    chartType: {
      type: "string",
      enum: ["donut", "bar", "line", "dataGrid", "stackedBar"],
    },
    density: { type: "string", enum: ["high", "medium", "low"] },
    theme: { type: "string", enum: ["jpmBrand", "chase"] },
    wcagTarget: { const: "AAA" },
    assetClasses: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "yieldData", "saltCategoricalToken", "ariaLabel"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 64 },
          yieldData: {
            type: "array",
            minItems: 1,
            items: { type: "number", minimum: -100, maximum: 100 },
          },
          saltCategoricalToken: {
            type: "string",
            pattern: "^--salt-palette-categorical-[1-6]$",
          },
          ariaLabel: { type: "string", minLength: 4, maxLength: 160 },
        },
      },
    },
  },
} as const;

export type SaltUiSpec = {
  chartType: string;
  density: "high" | "medium" | "low";
  theme: "jpmBrand" | "chase";
  wcagTarget: "AAA";
  assetClasses: {
    name: string;
    yieldData: number[];
    saltCategoricalToken: string;
    ariaLabel: string;
  }[];
};

const ajv = new Ajv({ allErrors: true, strict: false });
const compiled = ajv.compile(SALT_AST_SCHEMA as unknown as object);

export type SaltViolation = {
  rule: string;
  detail: string;
  severity: "error" | "warning";
};

export type SaltValidationResult = {
  ok: boolean;
  violations: SaltViolation[];
  passes: string[];
  cssPropertyCount: number;
  offGrid: number[];
  tokensResolved: number;
  tokensExpected: number;
};

const CSS_PROPERTY_KEYS =
  /"(style|css|className|class|cssText|color|background|backgroundColor|boxShadow|fontFamily|padding|margin|border)"\s*:/g;

function describe(err: ErrorObject): SaltViolation {
  const path = err.instancePath || "/";
  if (err.keyword === "additionalProperties") {
    const extra = (err.params as { additionalProperty?: string }).additionalProperty;
    return {
      rule: "additionalProperties:false",
      detail: `SALT AST SCHEMA VALIDATION ERROR — unapproved property "${extra}" at ${path}. Only Salt-governed keys compile.`,
      severity: "error",
    };
  }
  return {
    rule: `${err.keyword}${path === "/" ? "" : ` @ ${path}`}`,
    detail: `SALT AST SCHEMA VALIDATION ERROR — ${err.message ?? "invalid value"}`,
    severity: "error",
  };
}

export function validateSaltSpec(input: string): SaltValidationResult {
  const empty = {
    passes: [] as string[],
    cssPropertyCount: 0,
    offGrid: [] as number[],
    tokensResolved: 0,
    tokensExpected: 0,
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return {
      ...empty,
      ok: false,
      violations: [
        {
          rule: "json/parse",
          detail: "SALT AST SCHEMA VALIDATION ERROR — payload is not valid JSON",
          severity: "error",
        },
      ],
    };
  }

  const flat = JSON.stringify(parsed);
  const violations: SaltViolation[] = [];
  const passes: string[] = [];

  const valid = compiled(parsed);
  if (!valid) {
    for (const err of compiled.errors ?? []) violations.push(describe(err));
  } else {
    passes.push("draft-07/SaltUiSpec");
  }

  const cssHits = [...flat.matchAll(CSS_PROPERTY_KEYS)].map((m) => m[1] as string);
  if (cssHits.length) {
    violations.push({
      rule: "salt/no-raw-css",
      detail: `Unapproved CSS propert${cssHits.length > 1 ? "ies" : "y"} detected: ${[
        ...new Set(cssHits),
      ].join(", ")}`,
      severity: "error",
    });
  } else passes.push("salt/no-raw-css");

  if (/#[0-9a-fA-F]{3,8}\b/.test(flat) || /rgba?\(/.test(flat)) {
    violations.push({
      rule: "salt/no-raw-color",
      detail: "Raw hex / rgb() literal found — must reference a --salt-* token",
      severity: "error",
    });
  } else passes.push("salt/no-raw-color");

  if (/var\(--(?!salt-)/.test(flat) || /"[a-z]+-(?:legacy|override)"/.test(flat)) {
    violations.push({
      rule: "salt/namespace",
      detail: "Non-Salt variable or legacy component override referenced",
      severity: "error",
    });
  } else passes.push("salt/namespace");

  const offGrid = [...flat.matchAll(/"(\d+)px"/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n % 4 !== 0);
  if (offGrid.length) {
    violations.push({
      rule: "salt/4px-grid",
      detail: `Off-grid spacing: ${offGrid.join(", ")}px`,
      severity: "warning",
    });
  } else passes.push("salt/4px-grid");

  const spec = parsed as Partial<SaltUiSpec>;
  const list = Array.isArray(spec.assetClasses) ? spec.assetClasses : [];
  const tokensResolved = list.filter((a) =>
    /^--salt-palette-categorical-[1-6]$/.test(String(a?.saltCategoricalToken ?? "")),
  ).length;

  return {
    ok: violations.filter((v) => v.severity === "error").length === 0,
    violations,
    passes,
    cssPropertyCount: new Set(cssHits).size,
    offGrid,
    tokensResolved,
    tokensExpected: list.length,
  };
}

/* --------------------------------- presets -------------------------------- */

export type PresetId = "muniVsPe" | "multiAssetGrid" | "inlineCssAttack";

export const PRESETS: { id: PresetId; label: string; prompt: string; hostile?: boolean }[] = [
  {
    id: "muniVsPe",
    label: "Salt Medium-Density: Municipal Bonds vs Private Equity Yields (JPM Brand Theme)",
    prompt:
      "Salt Medium-Density: Municipal Bonds vs Private Equity Yields (JPM Brand Theme)",
  },
  {
    id: "multiAssetGrid",
    label: "Salt High-Density Data Grid: Multi-Asset Yields (Dark Mode WCAG AAA)",
    prompt: "Salt High-Density Data Grid: Multi-Asset Yields (Dark Mode WCAG AAA)",
  },
  {
    id: "inlineCssAttack",
    label: "Unapproved Inline CSS Attack (Should Fail Salt AST Validation)",
    prompt: "Unapproved Inline CSS Attack (Should Fail Salt AST Validation)",
    hostile: true,
  },
];

export const YIELD_PERIODS = [
  "Q1 24",
  "Q2 24",
  "Q3 24",
  "Q4 24",
  "Q1 25",
  "Q2 25",
  "Q3 25",
  "Q4 25",
  "Q1 26",
  "Q2 26",
  "Q3 26",
  "Q4 26",
] as const;

export const ASSET_RISK: Record<string, { risk: string; tone: "positive" | "warning" | "negative"; metric: string }> = {
  "Municipal Bonds": { risk: "Low", tone: "positive", metric: "Duration 6.1y · VaR 1.8%" },
  "Private Equity": { risk: "Elevated", tone: "negative", metric: "Illiquidity 7y · VaR 12.4%" },
  "US Treasuries": { risk: "Low", tone: "positive", metric: "Duration 8.4y · VaR 2.6%" },
  Equities: { risk: "Moderate", tone: "warning", metric: "Beta 1.04 · VaR 9.1%" },
  Alternatives: { risk: "Elevated", tone: "negative", metric: "Vol 14.2% · VaR 11.0%" },
  Cash: { risk: "Low", tone: "positive", metric: "T+0 liquidity · VaR 0.1%" },
};

const ASSET_LIBRARY: Record<string, { token: string; yieldData: number[] }> = {
  "Municipal Bonds": {
    token: "--salt-palette-categorical-1",
    yieldData: [3.42, 3.55, 3.62, 3.71, 3.78, 3.85, 3.9, 3.96, 4.05, 4.12, 4.18, 4.24],
  },
  "Private Equity": {
    token: "--salt-palette-categorical-2",
    yieldData: [7.8, 8.4, 9.1, 9.9, 10.6, 11.2, 11.78, 12.05, 12.2, 12.62, 12.9, 13.35],
  },
  "US Treasuries": {
    token: "--salt-palette-categorical-3",
    yieldData: [4.02, 4.11, 4.16, 4.2, 4.24, 4.29, 4.31, 4.34, 4.29, 4.26, 4.22, 4.18],
  },
  Equities: {
    token: "--salt-palette-categorical-4",
    yieldData: [1.18, 1.2, 1.24, 1.28, 1.3, 1.32, 1.34, 1.36, 1.38, 1.41, 1.44, 1.46],
  },
  Alternatives: {
    token: "--salt-palette-categorical-5",
    yieldData: [1.92, 1.96, 2.0, 2.02, 2.05, 2.08, 2.1, 2.12, 2.14, 2.18, 2.2, 2.24],
  },
  Cash: {
    token: "--salt-palette-categorical-6",
    yieldData: [4.95, 4.92, 4.9, 4.88, 4.85, 4.82, 4.8, 4.76, 4.72, 4.66, 4.6, 4.55],
  },
};

function assetNode(name: string) {
  const meta = ASSET_LIBRARY[name] ?? {
    token: "--salt-palette-categorical-1",
    yieldData: [0],
  };
  return {
    name,
    yieldData: meta.yieldData,
    saltCategoricalToken: meta.token,
    ariaLabel: `${name} trailing yield series, expressed in percent`,
  };
}

/** Simulated AI generation: natural language -> Salt UI JSON spec. */
export function generateSpec(
  prompt: string,
  fallback: { density: "high" | "medium" | "low"; theme: "jpmBrand" | "chase" },
): string {
  const p = prompt.toLowerCase();

  if (/inline css|attack|unapproved|should fail/.test(p)) {
    return JSON.stringify(
      {
        chartType: "bar",
        density: "medium",
        theme: "jpmBrand",
        wcagTarget: "AAA",
        style: "color: #FF0000; box-shadow: 0 2px 6px rgba(0,0,0,.4)",
        className: "legacy-chart-override",
        assetClasses: [
          {
            name: "Municipal Bonds",
            yieldData: [3.85],
            saltCategoricalToken: "#FF0000",
            ariaLabel: "Municipal Bonds yield",
            padding: "6px",
          },
        ],
      },
      null,
      2,
    );
  }

  const density: "high" | "medium" | "low" = /high[- ]?density|data grid|blotter/.test(p)
    ? "high"
    : /low[- ]?density|spacious|touch/.test(p)
      ? "low"
      : /medium/.test(p)
        ? "medium"
        : fallback.density;

  const theme: "jpmBrand" | "chase" = /chase/.test(p)
    ? "chase"
    : /jpm|brand|wealth/.test(p)
      ? "jpmBrand"
      : fallback.theme;

  const chartType = /grid|table|blotter/.test(p)
    ? "dataGrid"
    : /line|trend|over time/.test(p)
      ? "line"
      : /donut|allocation|breakdown|mix/.test(p)
        ? "donut"
        : "bar";

  const named = Object.keys(ASSET_LIBRARY).filter((n) => p.includes(n.toLowerCase()));
  const names = named.length
    ? named
    : /multi[- ]?asset|all asset/.test(p)
      ? ["Municipal Bonds", "Private Equity", "US Treasuries", "Equities", "Alternatives"]
      : ["Municipal Bonds", "Private Equity", "US Treasuries"];

  return JSON.stringify(
    {
      chartType,
      density,
      theme,
      wcagTarget: "AAA",
      assetClasses: names.map(assetNode),
    },
    null,
    2,
  );
}
