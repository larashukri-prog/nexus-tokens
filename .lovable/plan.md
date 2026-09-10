# Keep charts visible on tablet and iPad

## Confirmed cause

At widths below 1024px, the page switches to a single-column layout. The full left panel is 2,326px tall and appears before the wealth canvas, pushing the first chart roughly 3,000px below the top of the page. The chart itself is visible, has a non-zero height, and is not hidden or collapsed.

## Changes

1. Start the split-screen layout at the tablet breakpoint instead of waiting until desktop.
2. Give the left panel a narrower fixed tablet width, retaining its current desktop width at larger sizes.
3. Make the left panel and wealth canvas independently scrollable at tablet sizes so the charts remain in the initial viewport.
4. Keep the existing mobile stacked layout below 768px and preserve all chart sizing, data, interactions, colors, and styling.

## Verification

- Check 768px, 820px, 930px, 1024px, and desktop widths.
- Confirm the wealth canvas and chart are visible without scrolling past the left panel.
- Confirm both panel areas scroll independently and no content overlaps or clips.
- Confirm chart SVGs retain non-zero dimensions and the browser console remains error-free.

## Technical notes

- Update the page wrapper in `src/routes/index.tsx` from a desktop-only row layout to a tablet-and-up row layout.
- Update `TokenEngineSidebar` and `LiveCanvas` breakpoint classes together so their widths, heights, borders, and overflow behavior switch consistently at `md`.
- Preserve the existing `block w-full min-h-[350px]` chart wrappers in `src/components/salt/YieldCanvas.tsx`.
