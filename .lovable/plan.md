## Responsive Chart Container Fix for Tablet/iPad

### Goal
Prevent the main chart/canvas in `YieldCanvas.tsx` from collapsing or disappearing on mid-range viewports (768px–1024px) by wrapping it in an explicit, always-visible container with a fixed minimum height.

### Changes
1. **In `src/components/salt/YieldCanvas.tsx`**
   - Wrap the `<svg>` element (and its associated readout/status panel) inside a new container `<div className="w-full min-h-[350px] block">`.
   - Ensure no responsive visibility classes (e.g. `hidden md:block`) hide the chart at any breakpoint.
   - Keep the existing `aspect-[640/240]`, `w-full`, `h-auto`, and `viewBox` behavior so the SVG scales proportionally, but give the outer wrapper the requested `min-h-[350px]` so WebKit/iPad Safari cannot collapse it when a parent uses flexible height.

2. **Verification**
   - Confirm the change applies to both `StressCurveChart` and `LiquidityTimelineChart` render paths.
   - Verify no `hidden *` Tailwind classes are introduced or left around the chart.

### What will not change
- No visual styling, color, chart data, labels, or interactive behavior changes.
- No other components or layouts touched.
