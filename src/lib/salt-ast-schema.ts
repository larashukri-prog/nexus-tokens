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

const ASSET_LIBRARY: Record<string, { token: string; yieldData: number[] }> = {
  "Municipal Bonds": { token: "--salt-palette-categorical-1", yieldData: [3.62, 3.71, 3.85, 3.9] },
  "Private Equity": { token: "--salt-palette-categorical-2", yieldData: [8.4, 9.9, 11.78, 12.2] },
  "US Treasuries": { token: "--salt-palette-categorical-3", yieldData: [4.11, 4.2, 4.29, 4.31] },
  Equities: { token: "--salt-palette-categorical-4", yieldData: [1.2, 1.28, 1.32, 1.36] },
  Alternatives: { token: "--salt-palette-categorical-5", yieldData: [2.0, 2.05, 2.1, 2.14] },
  Cash: { token: "--salt-palette-categorical-6", yieldData: [4.9, 4.85, 4.8, 4.72] },
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
