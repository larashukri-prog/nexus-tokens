# Scenario 1 as the Default Showcase — UHNW Capital Calls vs $10M IPS Floor

Make the PE capital-call / Treasury liquidity mandate the state the app boots into, and sharpen the liquidity visuals, cards, and preset copy around it. The AST engine, token dictionary, contrast inspector, and grid audit stay exactly as they are.

## 1. Sidebar presets (`src/lib/salt-ast-schema.ts`)

Reorder and relabel `PRESETS` so the liquidity mandate is first and is the load-time default:

1. "UHNW Liquidity Mandate: PE Drawdowns vs $10M IPS Floor" — description: models uncalled PE capital drawdowns against a mandatory $10M short-term Treasury liquidity floor.
2. "Macro Stress Test: 200bps Rate Shock & NAV Compression" — 200bps shock across fixed income and PE yield curves, 2024–2026.
3. "Compliance Boundary: Unapproved Inline Style Injection" — injects `"style": "color: #FF0000"`, intercepted at the AST boundary.

The liquidity branch of `generateSpec` already emits `chartType: "liquidityTimeline"`, `timeframe: "2024-2029"`, and the two asset classes; its `complianceRules` will be restated as explicit `ips/liquidity-floor` rule text so the generated spec names the rule ID.

In `src/components/salt/GenerationEngine.tsx`, change `DEFAULT_PROMPT` to preset 1's prompt so the initial spec, canvas render, and audit panel are the liquidity scenario on first paint.

## 2. Canvas header and executive banner (`src/components/salt/LiveCanvas.tsx`)

- Title becomes "Private Wealth Client Live Meeting Canvas — Capital Commitment & Liquidity Analysis".
- Banner cells: "Active Client Profile: Ultra-High-Net-Worth (UHNW) Family Office", "IPS Mandate Compliance: Enforced via Salt Design System Tokens & Risk Engine Schema", "Execution Latency: < 2ms AST Validation Boundary".

## 3. Default canvas visuals (`src/components/salt/YieldCanvas.tsx`)

The liquidity chart already draws categorical-2 bars, a categorical-3 line, and an amber dashed `--salt-status-warning-foreground` threshold. Refinements:

- Add a soft categorical-3 area fill beneath the Treasury liquidity line so it reads as a solid liquidity band; keep the line stroke on top.
- Give the dashed threshold a token-styled inline label chip reading "$10M IPS Liquidity Floor" so it stays legible in dark mode and against bars.
- Add a vertical crosshair at the selected quarter plus a marker dot on the Treasury line.
- Default the selected period to Q2 2025 (index 5) instead of the first quarter, so the readout opens on: PE capital call $5.1M, Treasury liquidity $11.2M, IPS headroom +$1.2M.
- Extend the readout strip with an explicit status verdict — "MANDATE SATISFIED" when headroom is non-negative, "MANDATE BREACH" when it is not — and phrase headroom as "+$1.2M above floor".
- Series data already yields those exact Q2 2025 values and a $13.1M terminal Treasury balance; no data changes needed there.

## 4. Summary cards below the chart

Replace the three generic risk tiles (`RISK_TILES`) with scenario-specific cards:

1. "Private Equity Capital Calls" — Next drawdown $0.9M, Uncalled commitment $18.5M, token `--salt-palette-categorical-2`.
2. "Treasury Liquidity Reserves" — Available yield 4.8%, Total unencumbered balance $13.1M with a "Passes $10M IPS Floor" badge, token `--salt-palette-categorical-3`.
3. "IPS Governance Engine" — Rule ID `ips/liquidity-floor`, constraint: cash equivalents must never fall below the $10.0M floor.

Each keeps its `aria-label`, focusable card, tokenised accent bar, and Salt badge treatment. The screen-reader tree readout is updated to narrate the new card set and the liquidity scenario heading.

## 5. Preserved

Token dictionary tiers, AJV Draft-07 validator with `additionalProperties: false`, WCAG AAA contrast inspector, 4px grid alignment audit, mode/theme/density/vision toggles, copy-payload and screen-reader-tree actions — all untouched apart from the label and default-state changes above.

## Technical notes

- Files touched: `src/lib/salt-ast-schema.ts` (presets, compliance rules, card definitions), `src/components/salt/GenerationEngine.tsx` (default prompt), `src/components/salt/YieldCanvas.tsx` (chart refinements, default active index, cards, SR tree), `src/components/salt/LiveCanvas.tsx` (header and banner copy).
- All new color usage goes through existing `--salt-*` semantic and categorical variables; no raw hex, no hardcoded Tailwind color utilities.
- Frontend only; no backend, schema, or data-layer changes.
