/**
 * Strict runtime contracts for the Salt pipeline.
 *
 * Every object shape is declared `.strict()` so no unapproved attribute — and in
 * particular no raw CSS property — can pass any boundary. All TypeScript types
 * in the pipeline are derived from these contracts with `z.infer`, so the schema
 * is the single source of truth and cannot drift from the types.
 */
import { z } from "zod";

/* --------------------------- token tier contracts -------------------------- */

/**
 * Tier 1 primitives. These carry raw palette values and are NEVER referenceable
 * from an AI-generated spec — the engine may only speak semantic + component.
 */
export const PRIMITIVE_TOKEN_PATTERN =
  /^--salt-palette-(navy|slate|blue|gold|teal|amber|white|black|grey|gray|red|green)(-\d{2,3})?$/;

/** Tier 2 semantic + Tier 3 component tokens: the only engine-referenceable surface. */
export const ENGINE_TOKEN_PATTERNS: RegExp[] = [
  // semantic
  /^--salt-content-(primary|secondary|tertiary)-foreground$/,
  /^--salt-container-(primary|secondary|tertiary)-(background|border)$/,
  /^--salt-status-(info|success|warning|error)-foreground$/,
  /^--salt-sentiment-(accent|positive|negative)-foreground$/,
  /^--salt-actionable-primary-(background|foreground)$/,
  /^--salt-palette-categorical-[1-6]$/,
  // component
  /^--salt-card-(borderRadius|borderWidth)$/,
  /^--salt-control-borderRadius$/,
  /^--salt-table-(rowHeight|headerBackground)$/,
  /^--salt-spacing-\d{2,3}$/,
  /^--salt-size-control$/,
  /^--salt-text-(fontSize|lineHeight)$/,
];

export function isPrimitiveToken(token: string): boolean {
  return PRIMITIVE_TOKEN_PATTERN.test(token.trim());
}

/** True only for semantic / component tokens the engine is allowed to emit. */
export function isEngineToken(token: string): boolean {
  const value = token.trim();
  if (isPrimitiveToken(value)) return false;
  return ENGINE_TOKEN_PATTERNS.some((p) => p.test(value));
}

const engineToken = z
  .string()
  .refine(isEngineToken, "token is not on the semantic/component engine allowlist");

const categoricalToken = z
  .string()
  .regex(/^--salt-palette-categorical-[1-6]$/, "must be a categorical data-vis token")
  .refine(isEngineToken, "token is not on the semantic/component engine allowlist");

/* ------------------------------ AST contracts ----------------------------- */

export const saltChartTypeContract = z.enum([
  "stressTestCurve",
  "liquidityTimeline",
  "donut",
  "bar",
  "line",
  "dataGrid",
  "stackedBar",
]);

export const saltDensityContract = z.enum(["high", "medium", "low"]);
export const saltThemeContract = z.enum(["jpmBrand", "chase"]);

export const saltAssetClassContract = z
  .object({
    name: z.string().min(2).max(64),
    unit: z.enum(["percent", "usdMillions"]).optional(),
    yieldData: z.array(z.number().min(-100).max(100)).min(1),
    saltCategoricalToken: categoricalToken,
    ariaLabel: z.string().min(4).max(160),
  })
  .strict();

export const saltUiSpecContract = z
  .object({
    chartType: saltChartTypeContract,
    density: saltDensityContract,
    theme: saltThemeContract,
    wcagTarget: z.literal("AAA"),
    timeframe: z
      .string()
      .regex(/^\d{4}-\d{4}$/)
      .optional(),
    riskIndicatorToken: z
      .string()
      .regex(
        /^--salt-status-(warning|error|success|info)-foreground$/,
        "must be a Salt status foreground token",
      )
      .refine(isEngineToken, "token is not on the semantic/component engine allowlist")
      .optional(),
    complianceRules: z.array(z.string().min(4).max(160)).max(6).optional(),
    assetClasses: z.array(saltAssetClassContract).min(1).max(6),
  })
  .strict();

export type SaltChartType = z.infer<typeof saltChartTypeContract>;
export type SaltUiSpec = z.infer<typeof saltUiSpecContract>;
export type SaltAssetClass = z.infer<typeof saltAssetClassContract>;

/* --------------------------- design data contracts ------------------------- */

const toneContract = z.enum(["positive", "warning", "negative", "info"]);

export const assetRiskContract = z
  .object({
    risk: z.string().min(1),
    tone: z.enum(["positive", "warning", "negative"]),
    metric: z.string().min(1),
  })
  .strict();

export const riskTileContract = z
  .object({
    name: z.string().min(2),
    token: engineToken,
    headline: z.string().min(1),
    headlineLabel: z.string().min(1),
    subtitle: z.string().min(1).nullable(),
    rows: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) }).strict()).min(1),
    badge: z.object({ text: z.string().min(1), tone: toneContract }).strict(),
    aria: z.string().min(4),
  })
  .strict();

export const tokenEntryContract = z
  .object({
    name: z.string().regex(/^--salt-/),
    tier: z.enum(["primitive", "semantic", "component"]),
    group: z.string().min(1),
    note: z.string().min(1).optional(),
  })
  .strict();

export const contrastPairContract = z
  .object({
    label: z.string().min(1),
    fg: z.string().regex(/^--salt-/),
    bg: z.string().regex(/^--salt-/),
    large: z.boolean().optional(),
  })
  .strict();

export const assetClassRowContract = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    token: engineToken,
    allocation: z.number().min(0).max(100),
    value: z.number().min(0),
    ytd: z.number(),
    yield: z.number(),
    risk: z.enum(["Low", "Moderate", "Elevated"]),
  })
  .strict();

export const holdingContract = z
  .object({
    ticker: z.string().min(1),
    name: z.string().min(1),
    sleeve: z.string().min(1),
    sleeveToken: engineToken,
    qty: z.number(),
    price: z.number(),
    marketValue: z.number(),
    dayChange: z.number(),
  })
  .strict();

export const kpiContract = z
  .object({
    label: z.string().min(1),
    value: z.string().min(1),
    delta: z.number(),
    meta: z.string().min(1),
  })
  .strict();

export type TokenTier = z.infer<typeof tokenEntryContract>["tier"];
export type TokenEntry = z.infer<typeof tokenEntryContract>;
export type ContrastPair = z.infer<typeof contrastPairContract>;
export type RiskTile = z.infer<typeof riskTileContract>;
export type AssetClassRow = z.infer<typeof assetClassRowContract>;
export type Holding = z.infer<typeof holdingContract>;
export type Kpi = z.infer<typeof kpiContract>;

/**
 * Dev-only contract gate. Reports loudly during development if a design-data
 * literal drifts out of contract; a no-op in production so there is zero cost
 * on the render path.
 */
export function assertContract(contract: z.ZodTypeAny, value: unknown, label: string): void {
  if (!import.meta.env.DEV) return;
  const result = contract.safeParse(value);
  if (!result.success) {
    console.error(`[salt-contracts] ${label} violates its strict contract`, result.error.issues);
  }
}
