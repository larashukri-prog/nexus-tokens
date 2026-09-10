# Fix: charts disappearing on iPad / tablet

## What's happening

The two main charts on the wealth canvas (the capital-call timeline and the stress-test curve) are drawn as scalable vector graphics that are told "fill the available width, work out your own height". Desktop Chrome does that correctly. Safari on iPad does not reliably derive the height that way, so the graphic collapses to zero height and the chart looks like it vanished — even though the surrounding card, legend and readouts still render.

Confirmed by inspection: nothing hides the charts on tablet. There are no `hidden md:block`-style visibility rules on the chart or its wrapper, and at 768px and 820px widths the chart still measures a normal size in a Chromium check. So this is a height-resolution issue in iPad Safari, not a breakpoint visibility issue.

## Changes

1. Give both charts a fixed shape instead of "auto" height, so every browser knows the height without having to infer it:
   - replace the `height:auto` rule with a locked 640x240 aspect ratio
   - add a minimum height floor so the chart can never collapse (about 220px on small screens, 260px from tablet up)
2. Add the same minimum height to the wrapper that holds each chart, so the card reserves space even before the graphic paints.
3. Keep the scaling behaviour explicit on the graphic itself (fill width, preserve aspect ratio, centred), which is what keeps the chart crisp at any width.
4. Apply the same height floor to the smaller growth-trend sparkline and allocation donut for consistency.

No layout, colour, spacing, typography, chart content or interaction changes — the charts keep their current appearance on desktop.

## Verification

- Render the page at iPad widths (768px and 820px) and desktop, and confirm the chart graphic reports a non-zero height at each.
- Check the same in a WebKit browser engine, since that is where the failure appears.
- Confirm hover/scrub, keyboard arrow inspection, legends and compliance readouts still behave.

## Technical notes

- Files: `src/components/salt/YieldCanvas.tsx` (both `StressCurveChartBase` and `LiquidityTimelineChartBase` SVGs plus their `relative` wrappers), and the sparkline/donut SVGs in `src/components/salt/LiveCanvas.tsx`.
- `w-full [height:auto]` on a `viewBox`-only SVG becomes `aspect-[640/240] h-auto w-full min-h-[220px] md:min-h-[260px]` with `preserveAspectRatio="xMidYMid meet"`.
- Wrappers get `min-h-[220px] md:min-h-[260px]`; no change to the pointer/rAF logic, which reads `getBoundingClientRect()` and therefore stays correct at any resolved size.
