# Performance, Context & Validation Hardening Pass

Internals-only pass. No visible UI, layout, styling, copy, or chart output changes.

## Verified current state

- `YieldCanvas.tsx:592` owns the `active` scrub index for the whole panel; `StressCurveChart` (line 33) and `LiquidityTimelineChart` (line 235) call `onActive` from `onMouseMove={(e) => pick(e.clientX)}` on every pointer event, so each pixel of movement re-renders the parent panel, legend, risk tiles and compliance content. Neither chart is wrapped in `React.memo`.
- `GenerationEngine.tsx:55-69` runs `validateSaltSpec(spec)` and `JSON.parse(spec)` in `useMemo` on every keystroke, then an effect calls `setCanvas(parsed as SaltUiSpec, prompt)` — an unchecked cast — pushing global context updates while typing.
- `SaltProvider.tsx:72-90` builds one context object whose memo deps include `canvasSpec` and `canvasPrompt`, so every canvas update re-renders every `useSalt()` consumer (app bar, sidebar, engine, live canvas, yield canvas).
- The spec `<textarea>` (`GenerationEngine.tsx:228`) has no `maxLength`; `validateSaltSpec` (`salt-ast-schema.ts:308`) has an LRU memo and measured `validationMs` already, but no payload size short-circuit before `JSON.parse` + `JSON.stringify` + `GOVERNANCE_SCAN`.
- AJV is compiled with `strict: false` (line 80) and the Zod `.strict()` contract (`saltUiSpecContract`) is not consulted by `validateSaltSpec` at all — the two boundaries can disagree today.

## Changes

### 1. Pointer scrubbing (YieldCanvas.tsx)
- Add a small `useRafThrottle`-style helper: `onMouseMove` stores the latest `clientX` and commits it once per animation frame, cancelling the pending frame on unmount.
- Keep `active` as the single source of truth for the crosshair, but stop the churn from reaching siblings: memoize the chart subtrees with `React.memo` plus explicit comparators (compare `active`, `labels` identity, and series identity), and memoize the props passed in (`onActive` via `useCallback`, series/labels via `useMemo`) so the risk tiles, legend, compliance panel and toolbar don't re-render on scrub.
- Verify tooltip/crosshair values and keyboard arrow/Home/End behaviour are byte-identical to today.

### 2. Debounced validation + context split
- `GenerationEngine.tsx`: keep the textarea fully controlled (instant typing), but derive a `debouncedSpec` (175ms) and run `validateSaltSpec` / `JSON.parse` / `setCanvas` against that value only. Preset and Generate actions flush immediately so there is no perceived delay.
- `SaltProvider.tsx`: split into two providers behind the same public API — a stable `SaltPreferencesContext` (`mode`, `theme`, `density`, `vision` + setters) and a `SaltCanvasContext` (`canvasSpec`, `canvasPrompt`, `setCanvas`). `useSalt()` keeps its current shape and return type so no consumer changes, and new focused hooks (`useSaltPrefs`, `useSaltCanvas`) are used inside the components that only need one slice — so canvas updates no longer re-render the app bar/token sidebar, and preference toggles no longer re-render via canvas identity.

### 3. Validation boundary hardening
- Replace `parsed as SaltUiSpec` in `GenerationEngine.tsx` with `saltUiSpecContract.safeParse(parsed)`; only a successful parse reaches `setCanvas`. A failure surfaces as an explicit validation-error entry in the existing violations list rendering (same Pill/AuditRow components, no new layout).
- `validateSaltSpec`: after AJV succeeds, also run `saltUiSpecContract.safeParse`. `ok: true` requires both; Zod issues map into the existing `SaltViolation` shape under a `salt/strict-contract` rule so the audit panel renders them exactly like current rules. The hostile preset must still block with the same visible violation list.
- Add `maxLength={50000}` to the spec textarea and a length short-circuit at the top of `validateSaltSpec`: over the cap it returns a single `salt/payload-cap` error without parsing, stringifying or regex scanning.

## Technical notes

- Files touched: `src/components/salt/YieldCanvas.tsx`, `src/components/salt/GenerationEngine.tsx`, `src/components/salt/SaltProvider.tsx`, `src/lib/salt-ast-schema.ts`. No token, theme, CSS or data-literal files change.
- `useSalt()` stays exported with its current type so `SaltAppBar`, `TokenEngine`, `LiveCanvas` compile untouched unless they're switched to a narrower hook.
- Verification: run all three presets (rate shock, liquidity mandate, inline-CSS attack) and confirm identical rendered output and violation lists; scrub both charts and confirm tooltip values match; screenshot light and dark to prove zero visual delta; confirm `validationMs` stays under 2ms.
