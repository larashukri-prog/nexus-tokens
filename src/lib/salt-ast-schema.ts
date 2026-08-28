/**
 * Salt Design System AST validator.
 * Strict Draft-07 schema compiled with AJV; bound to Salt token rules.
 */
import Ajv, { type ErrorObject } from "ajv";

import {
  assertContract,
  assetRiskContract,
  isEngineToken,
  riskTileContract,
  saltUiSpecContract,
  type SaltUiSpec as SaltUiSpecShape,
} from "./salt-contracts";
import { z } from "zod";

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
      enum: [
        "stressTestCurve",
        "liquidityTimeline",
        "donut",
        "bar",
        "line",
        "dataGrid",
        "stackedBar",
      ],
    },
    density: { type: "string", enum: ["high", "medium", "low"] },
    theme: { type: "string", enum: ["jpmBrand", "chase"] },
    wcagTarget: { const: "AAA" },
    timeframe: { type: "string", pattern: "^\\d{4}-\\d{4}$" },
    riskIndicatorToken: {
      type: "string",
      pattern: "^--salt-status-(warning|error|success|info)-foreground$",
    },
    complianceRules: {
      type: "array",
      maxItems: 6,
      items: { type: "string", minLength: 4, maxLength: 160 },
    },
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
          unit: { type: "string", enum: ["percent", "usdMillions"] },
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

/** Derived from the strict Zod contract — never hand-maintained. */
export type { SaltUiSpec, SaltAssetClass, SaltChartType } from "./salt-contracts";

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
  /** Measured wall-clock cost of this validation pass, in milliseconds. */
  validationMs: number;
  /** True when the result was served from the memo cache (near-zero cost). */
  memoized: boolean;
};

/**
 * Single combined scan over the serialized payload. One regex pass replaces the
 * previous five, keeping the validator inside the <2ms AST boundary.
 */
const GOVERNANCE_SCAN =
  /"(style|css|className|class|cssText|color|background|backgroundColor|boxShadow|fontFamily|padding|margin|border)"\s*:|#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(|var\(--(?!salt-)|"[a-z]+-(?:legacy|override)"|--salt-palette-(?:navy|slate|blue|gold|teal|amber|white|black|grey|gray|red|green)(?:-\d{2,3})?\b|"(\d+)px"/g;

const CSS_PROPERTY_NAMES = new Set([
  "style",
  "css",
  "className",
  "class",
  "cssText",
  "color",
  "background",
  "backgroundColor",
  "boxShadow",
  "fontFamily",
  "padding",
  "margin",
  "border",
]);

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

/** Bounded LRU memo so repeated renders of an unchanged payload cost a map hit. */
const MEMO_LIMIT = 32;
/** Hard client-side payload cap — anything larger is rejected before parsing. */
export const MAX_SPEC_PAYLOAD_CHARS = 50_000;

const memo = new Map<string, SaltValidationResult>();

function remember(key: string, result: SaltValidationResult): SaltValidationResult {
  memo.set(key, result);
  if (memo.size > MEMO_LIMIT) {
    const oldest = memo.keys().next().value;
    if (oldest !== undefined) memo.delete(oldest);
  }
  return result;
}

function now(): number {
  return typeof performance === "undefined" ? 0 : performance.now();
}

function runValidation(input: string, startedAt: number): SaltValidationResult {
  const empty = {
    passes: [] as string[],
    cssPropertyCount: 0,
    offGrid: [] as number[],
    tokensResolved: 0,
    tokensExpected: 0,
    memoized: false,
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
      validationMs: now() - startedAt,
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

  // AJV covers structure; the Zod .strict() contract is the allowlist boundary.
  // A payload is only ok when BOTH agree.
  const contract = saltUiSpecContract.safeParse(parsed);
  if (!contract.success) {
    for (const issue of contract.error.issues.slice(0, 8)) {
      violations.push({
        rule: "salt/strict-contract",
        detail: `SALT AST SCHEMA VALIDATION ERROR — ${issue.path.join(".") || "/"}: ${issue.message}`,
        severity: "error",
      });
    }
  } else {
    passes.push("zod/strict-allowlist");
  }

  // ---- one combined governance scan -------------------------------------
  const cssHits = new Set<string>();
  const primitiveHits = new Set<string>();
  const offGrid: number[] = [];
  let rawColor = false;
  let namespaceLeak = false;

  GOVERNANCE_SCAN.lastIndex = 0;
  for (let m = GOVERNANCE_SCAN.exec(flat); m !== null; m = GOVERNANCE_SCAN.exec(flat)) {
    const [match, cssProp, pxValue] = m;
    if (cssProp && CSS_PROPERTY_NAMES.has(cssProp)) {
      cssHits.add(cssProp);
      continue;
    }
    if (pxValue) {
      const n = Number(pxValue);
      if (n % 4 !== 0) offGrid.push(n);
      continue;
    }
    if (match.startsWith("--salt-palette-")) {
      primitiveHits.add(match);
      continue;
    }
    if (match.startsWith("var(--")) {
      namespaceLeak = true;
      continue;
    }
    if (match.startsWith('"')) {
      namespaceLeak = true;
      continue;
    }
    rawColor = true;
  }

  if (cssHits.size) {
    violations.push({
      rule: "salt/no-raw-css",
      detail: `Unapproved CSS propert${cssHits.size > 1 ? "ies" : "y"} detected: ${[...cssHits].join(", ")}`,
      severity: "error",
    });
  } else passes.push("salt/no-raw-css");

  if (rawColor) {
    violations.push({
      rule: "salt/no-raw-color",
      detail:
        "Raw hex / rgb() / hsl() / oklch() literal found — must reference a --salt-* semantic token",
      severity: "error",
    });
  } else passes.push("salt/no-raw-color");

  if (primitiveHits.size) {
    violations.push({
      rule: "salt/primitive-leak",
      detail: `Tier-1 primitive token referenced (${[...primitiveHits].join(", ")}) — the engine may only bind semantic and component tokens`,
      severity: "error",
    });
  } else passes.push("salt/primitive-leak");

  if (namespaceLeak) {
    violations.push({
      rule: "salt/namespace",
      detail: "Non-Salt variable or legacy component override referenced",
      severity: "error",
    });
  } else passes.push("salt/namespace");

  if (offGrid.length) {
    violations.push({
      rule: "salt/4px-grid",
      detail: `Off-grid spacing: ${offGrid.join(", ")}px`,
      severity: "warning",
    });
  } else passes.push("salt/4px-grid");

  const spec = parsed as Partial<SaltUiSpecShape>;
  const list = Array.isArray(spec.assetClasses) ? spec.assetClasses : [];
  const tokensResolved = list.filter((a) =>
    isEngineToken(String(a?.saltCategoricalToken ?? "")),
  ).length;

  if (spec.chartType === "liquidityTimeline") {
    const floor = list.find((a) => /liquidity floor/i.test(String(a?.name ?? "")));
    if (!floor) {
      violations.push({
        rule: "ips/liquidity-floor",
        detail:
          "SALT AST SCHEMA VALIDATION ERROR — liquidityTimeline specs must declare a Treasury Liquidity Floor series for IPS compliance",
        severity: "error",
      });
    } else {
      passes.push("ips/liquidity-floor");
    }
  }

  return {
    ok: violations.filter((v) => v.severity === "error").length === 0,
    violations,
    passes,
    cssPropertyCount: cssHits.size,
    offGrid,
    tokensResolved,
    tokensExpected: list.length,
    validationMs: now() - startedAt,
    memoized: false,
  };
}

/** Memoized AST validation entry point. Repeat payloads resolve from cache. */
export function validateSaltSpec(input: string): SaltValidationResult {
  const startedAt = now();
  if (input.length > MAX_SPEC_PAYLOAD_CHARS) {
    return {
      ok: false,
      violations: [
        {
          rule: "salt/payload-cap",
          detail: `SALT AST SCHEMA VALIDATION ERROR — payload of ${input.length} characters exceeds the ${MAX_SPEC_PAYLOAD_CHARS}-character safety cap and was rejected without parsing`,
          severity: "error",
        },
      ],
      passes: [],
      cssPropertyCount: 0,
      offGrid: [],
      tokensResolved: 0,
      tokensExpected: 0,
      validationMs: now() - startedAt,
      memoized: false,
    };
  }
  const cached = memo.get(input);
  if (cached) return { ...cached, validationMs: now() - startedAt, memoized: true };
  return remember(input, runValidation(input, startedAt));
}

/* --------------------------------- presets -------------------------------- */

export type PresetId = "rateShock" | "liquidityMandate" | "inlineCssAttack";

export const PRESETS: {
  id: PresetId;
  label: string;
  description: string;
  prompt: string;
  hostile?: boolean;
}[] = [
  {
    id: "liquidityMandate",
    label: "UHNW Liquidity Mandate: PE Drawdowns vs $10M IPS Floor",
    description:
      "Models uncalled Private Equity capital drawdowns against a mandatory $10M short-term Treasury liquidity floor.",
    prompt: "UHNW Liquidity Mandate: PE Drawdowns vs $10M IPS Floor",
  },
  {
    id: "rateShock",
    label: "Macro Stress Test: 200bps Rate Shock & NAV Compression",
    description:
      "Simulates a 200-basis-point interest rate shock across fixed income and private equity yield curves (2024-2026).",
    prompt: "Macro Stress Test: 200bps Rate Shock & NAV Compression",
  },
  {
    id: "inlineCssAttack",
    label: "Compliance Boundary: Unapproved Inline Style Injection",
    description:
      'Attempts to inject unapproved inline CSS ("style": "color: #FF0000") — intercepted and blocked at the AST boundary.',
    prompt: "Compliance Boundary: Unapproved Inline Style Injection (governance test)",
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

/** Quarterly labels derived from a validated `timeframe` such as "2024-2029". */
export function periodsFor(timeframe: string | undefined, count: number): string[] {
  const match = /^(\d{4})-(\d{4})$/.exec(timeframe ?? "");
  const startYear = match ? Number(match[1]) : 2024;
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const year = startYear + Math.floor(i / 4);
    out.push(`Q${(i % 4) + 1} ${String(year).slice(2)}`);
  }
  return out;
}

export const LIQUIDITY_FLOOR_USD_M = 10;

export const ASSET_RISK: Record<
  string,
  { risk: string; tone: "positive" | "warning" | "negative"; metric: string }
> = {
  "Duration-Adjusted Muni Bonds": {
    risk: "Rate sensitive",
    tone: "warning",
    metric: "Duration 4.2y · Rate sensitivity -3.8%",
  },
  "Private Equity Valuations": {
    risk: "Illiquid",
    tone: "negative",
    metric: "NAV $18.5M · 10-yr lockup",
  },
  "PE Capital Calls": {
    risk: "Committed",
    tone: "warning",
    metric: "Undrawn commitment $24.0M",
  },
  "Treasury Liquidity Floor": {
    risk: "Liquid",
    tone: "positive",
    metric: "IPS floor $10.0M · T+0",
  },
  "Municipal Bonds": { risk: "Low", tone: "positive", metric: "Duration 6.1y · VaR 1.8%" },
  "Private Equity": { risk: "Elevated", tone: "negative", metric: "Illiquidity 7y · VaR 12.4%" },
  "US Treasuries": { risk: "Low", tone: "positive", metric: "Duration 8.4y · VaR 2.6%" },
  Equities: { risk: "Moderate", tone: "warning", metric: "Beta 1.04 · VaR 9.1%" },
  Alternatives: { risk: "Elevated", tone: "negative", metric: "Vol 14.2% · VaR 11.0%" },
  Cash: { risk: "Low", tone: "positive", metric: "T+0 liquidity · VaR 0.1%" },
};

/** Scenario summary cards rendered beneath the canvas chart. */
export const RISK_TILES = [
  {
    name: "Private Equity Capital Calls",
    token: "--salt-palette-categorical-2",
    headline: "$0.9M",
    headlineLabel: "Next scheduled drawdown",
    subtitle: null as string | null,
    rows: [
      { label: "Uncalled commitment", value: "$18.5M" },
      { label: "Funding source", value: "Treasury sleeve only" },
    ],
    badge: { text: "Committed", tone: "warning" as const },
    aria:
      "Private equity capital calls, next drawdown 0.9 million dollars, uncalled commitment 18.5 million dollars",
  },
  {
    name: "Treasury Liquidity Reserves",
    token: "--salt-palette-categorical-3",
    headline: "$13.1M",
    headlineLabel: "Total unencumbered balance",
    subtitle: "US Treasuries ($10.22M) + Cash Equivalents ($2.88M)" as string | null,
    rows: [
      { label: "Available yield", value: "4.8%" },
      { label: "IPS floor test", value: "Passes $10M IPS Floor" },
    ],
    badge: { text: "Liquid", tone: "positive" as const },
    aria:
      "Treasury liquidity reserves 13.1 million dollars unencumbered at a 4.8 percent available yield, passes the 10 million dollar IPS liquidity floor",
  },
  {
    name: "IPS Governance Engine",
    token: "--salt-status-warning-foreground",
    headline: "ips/liquidity-floor",
    headlineLabel: "Active rule ID",
    subtitle: null as string | null,
    rows: [
      { label: "Constraint", value: "Cash equivalents ≥ $10.0M" },
      { label: "Enforcement", value: "Salt AST validation boundary" },
    ],
    badge: { text: "Enforced", tone: "info" as const },
    aria:
      "IPS governance engine, rule ID ips slash liquidity floor, constraint: cash equivalents must never fall below the 10.0 million dollar floor",
  },
];

const ASSET_LIBRARY: Record<
  string,
  { token: string; yieldData: number[]; unit?: "percent" | "usdMillions" }
> = {
  "Duration-Adjusted Muni Bonds": {
    token: "--salt-palette-categorical-1",
    yieldData: [3.42, 3.55, 3.62, 3.71, 3.78, 3.85, 3.9, 3.96, 4.05, 4.12, 4.18, 4.24],
  },
  "Private Equity Valuations": {
    token: "--salt-palette-categorical-2",
    yieldData: [7.8, 8.4, 9.1, 9.9, 10.6, 11.2, 11.78, 12.05, 12.2, 12.62, 12.9, 13.35],
  },
  "PE Capital Calls": {
    token: "--salt-palette-categorical-2",
    unit: "usdMillions",
    yieldData: [
      2.4, 3.1, 1.8, 4.2, 3.6, 5.1, 2.9, 4.8, 6.2, 3.4, 2.2, 5.6, 4.1, 2.8, 3.9, 1.6, 2.1, 3.3,
      1.4, 0.9,
    ],
  },
  "Treasury Liquidity Floor": {
    token: "--salt-palette-categorical-3",
    unit: "usdMillions",
    yieldData: [
      12.4, 12.1, 12.6, 11.8, 12.0, 11.2, 11.6, 10.9, 10.2, 11.1, 11.8, 10.6, 10.8, 11.4, 10.9,
      12.0, 12.4, 11.9, 12.6, 13.1,
    ],
  },
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
    ...(meta.unit ? { unit: meta.unit } : {}),
    yieldData: meta.yieldData,
    saltCategoricalToken: meta.token,
    ariaLabel: `${name} trailing series for the selected mandate timeframe`,
  };
}

const BASE_PORTFOLIO_YIELD = [
  4.18, 4.24, 4.31, 4.36, 4.42, 4.48, 4.52, 4.58, 4.61, 4.66, 4.7, 4.74,
];
const SHOCKED_PORTFOLIO_YIELD = [
  4.18, 4.02, 3.74, 3.46, 3.28, 3.19, 3.24, 3.36, 3.52, 3.68, 3.81, 3.94,
];

/** Simulated AI generation: natural language -> Salt UI JSON spec. */
export function generateSpec(
  prompt: string,
  fallback: { density: "high" | "medium" | "low"; theme: "jpmBrand" | "chase" },
): string {
  const p = prompt.toLowerCase();

  if (/inline css|attack|unapproved|should fail|governance test/.test(p)) {
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

  if (/stress test|rate hike|200\s?bps|basis[- ]point|shock/.test(p)) {
    return JSON.stringify(
      {
        chartType: "stressTestCurve",
        density: /high[- ]?density/.test(p) ? "high" : fallback.density,
        theme: /chase/.test(p) ? "chase" : "jpmBrand",
        wcagTarget: "AAA",
        timeframe: "2024-2026",
        riskIndicatorToken: "--salt-status-warning-foreground",
        complianceRules: [
          "Stress scenario: +200bps parallel shift applied to all fixed income sleeves",
          "Duration-adjusted repricing required for municipal bond sleeve",
        ],
        assetClasses: [
          {
            name: "Duration-Adjusted Muni Bonds",
            unit: "percent",
            yieldData: BASE_PORTFOLIO_YIELD,
            saltCategoricalToken: "--salt-palette-categorical-1",
            ariaLabel:
              "Base portfolio yield for duration-adjusted municipal bonds, 2024 through 2026, in percent",
          },
          {
            name: "Private Equity Valuations",
            unit: "percent",
            yieldData: SHOCKED_PORTFOLIO_YIELD,
            saltCategoricalToken: "--salt-palette-categorical-2",
            ariaLabel:
              "200 basis point rate shock scenario yield for private equity valuations, 2024 through 2026, in percent",
          },
        ],
      },
      null,
      2,
    );
  }

  if (/liquidity|capital call|uhnw mandate|ips/.test(p)) {
    return JSON.stringify(
      {
        chartType: "liquidityTimeline",
        density: fallback.density,
        theme: /chase/.test(p) ? "chase" : "jpmBrand",
        wcagTarget: "AAA",
        timeframe: "2024-2029",
        riskIndicatorToken: "--salt-status-warning-foreground",
        complianceRules: [
          "ips/liquidity-floor — unencumbered Treasury cash equivalents must never fall below $10.0M",
          "ips/liquidity-floor — capital calls funded from the Treasury sleeve only, never from illiquid marks",
        ],
        assetClasses: [assetNode("PE Capital Calls"), assetNode("Treasury Liquidity Floor")],
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
      timeframe: "2024-2026",
      assetClasses: names.map(assetNode),
    },
    null,
    2,
  );
}

/* --------------------------- default canvas state -------------------------- */

/** Scenario 1 is the default showcase: PE drawdowns vs the $10M IPS floor. */
export const DEFAULT_ADVISOR_PROMPT = "UHNW Liquidity Mandate: PE Drawdowns vs $10M IPS Floor";

/** Parsed through the strict contract, so the default canvas cannot ship off-contract. */
export const DEFAULT_CANVAS_SPEC: SaltUiSpecShape = saltUiSpecContract.parse(
  JSON.parse(generateSpec(DEFAULT_ADVISOR_PROMPT, { density: "medium", theme: "jpmBrand" })),
);

/* Dev-only strict-contract gates for the design-data literals in this module. */
assertContract(z.array(riskTileContract), RISK_TILES, "RISK_TILES");
assertContract(z.record(assetRiskContract), ASSET_RISK, "ASSET_RISK");
/* Dev-only guarantee: the engine can only ever emit semantic/component tokens. */
if (import.meta.env.DEV) {
  for (const preset of PRESETS) {
    if (preset.hostile) continue;
    assertContract(
      saltUiSpecContract,
      JSON.parse(generateSpec(preset.prompt, { density: "medium", theme: "jpmBrand" })),
      `generateSpec("${preset.id}")`,
    );
  }
}
