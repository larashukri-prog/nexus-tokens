# Canvas Data Reconciliation + Focus Mode

Two changes on the main canvas: make every widget agree on the same numbers, and add an AI-style focus toggle that collapses the generic macro widgets.

## 1. Reconciled numbers (Total AUM exactly $48.0M)

| Sleeve | Value | Weight |
| --- | --- | --- |
| Municipal Bonds | $11,380,000 | 23.7% |
| Private Equity | $10,560,000 | 22.0% |
| US Treasuries | $10,220,000 | 21.3% |
| Equities | $8,640,000 | 18.0% |
| Alternatives | $4,320,000 | 9.0% |
| Cash & Equivalents | $2,880,000 | 6.0% |
| **Total** | **$48,000,000** | **100.0%** |

Unencumbered liquidity = $10.22M Treasuries + $2.88M Cash = **$13.1M**, matching the Treasury Liquidity hero card and the $10M IPS floor headroom.

Applied to:
- Asset breakdown tiles and the allocation legend (values + weights above).
- Donut chart slices (same weights, center label stays $48.0M).
- Holdings blotter: muni line (NYC 5s 2039) and Treasury line (T 4.25 2034) market values adjusted so each sleeve's holdings sum to its new sleeve value.
- Hero Card 2 ("Treasury Liquidity Reserves"): total balance $13.1M plus a small Salt badge subtitle "US Treasuries ($10.22M) + Cash Equivalents ($2.88M)", keeping the existing "Passes $10M IPS Floor" badge.
- KPI row keeps Total AUM at $48.0M.

## 2. Canvas Focus Mode

A segmented toggle at the top of the canvas, next to the theme/density pills: **Canvas Focus Mode** — [ Focused Liquidity View (AI Default) | Full Portfolio Dashboard ]. Default is Focused Liquidity View.

Focused Liquidity View:
- Liquidity chart, readout strip, KPI row and the three asset summary cards stay fully expanded.
- Asset Allocation Donut, Portfolio Growth chart and Holdings Blotter move inside one collapsed drawer labeled "Additional Portfolio Context & Holdings Blotter (3 Widgets Collapsed)", expandable by click or keyboard.
- A small badge sits on the drawer: "AI Context Filtering: Non-essential widgets collapsed to prioritize cash-flow decision making."

Full Portfolio Dashboard: all three widgets render inline, expanded, as they do today; the drawer and AI badge are hidden.

## 3. Preserved

Salt semantic and `--salt-palette-categorical-*` tokens only (no raw hex), AST validator and audit panel, WCAG AAA contrast inspector, mode/theme/density/vision toggles, screen-reader tree and copy-payload actions — all unchanged.

## Technical notes

- `src/lib/portfolio-data.ts`: sleeve values/allocations, holdings market values.
- `src/lib/salt-ast-schema.ts`: Treasury liquidity tile metrics + new subtitle line.
- `src/components/salt/YieldCanvas.tsx`: render the subtitle badge in the Treasury card; screen-reader tree text updated for the new figures and focus mode.
- `src/components/salt/LiveCanvas.tsx`: focus-mode state, segmented control, collapsible drawer wrapping the three widgets.
- Frontend only; no backend or schema-validation changes.
