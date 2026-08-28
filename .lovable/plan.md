# Architectural Audit — Schema Contracts, Token Decoupling, Validator Performance

Hardening pass on the validation and token layers only. No visible UI styling, copy, layout, or chart output changes.

## Audit findings (from reading the current code)

- `SALT_AST_SCHEMA` already sets `additionalProperties: false` on the root and on `assetClasses.items`, but no other object shapes in the pipeline are schema-governed at all: `RISK_TILES`, `ASSET_RISK`, `ASSET_LIBRARY`, `TOKEN_DICTIONARY`, `CONTRAST_PAIRS`, and the portfolio data in `src/lib/portfolio-data.ts` are plain literals with hand-written types.
- `SaltUiSpec` is a hand-maintained type that duplicates the schema — the two can silently drift.
- Token tiers are declarative labels only: nothing stops an engine-generated spec from referencing a primitive such as `--salt-palette-navy-900`. The validator only checks the categorical pattern, and `salt/no-raw-color` only catches literal hex/rgb.
- `validateSaltSpec` recompiles nothing (AJV compile is a module singleton — good) but re-runs five separate regex scans over the stringified payload on every keystroke, with no memoization and no measured timing.

## What gets tightened

1. **Strict contracts everywhere**
   - Add `additionalProperties: false` plus explicit `required`/type constraints to every nested object shape in the AST schema, including future `complianceRules` and `riskIndicatorToken` variants, so no unapproved attribute path exists at any depth.
   - Introduce Zod contracts for the design-data literals (risk tiles, asset library, token dictionary, contrast pairs, portfolio data) in a new `src/lib/salt-contracts.ts`, each declared `.strict()`. Parsed once at module init in dev so an out-of-contract literal fails loudly instead of rendering.
   - Derive `SaltUiSpec` from the schema/Zod contract rather than hand-writing it, eliminating type drift.

2. **3-tier token decoupling**
   - Promote the tier metadata into a single authoritative registry with an explicit engine allowlist: only semantic (`--salt-content-*`, `--salt-container-*`, `--salt-status-*`, `--salt-sentiment-*`, `--salt-palette-categorical-1..6`) and component (`--salt-card-*`, `--salt-control-*`, `--salt-table-*`, `--salt-spacing-*`, `--salt-size-*`, `--salt-text-*`) tokens are referenceable from a spec.
   - New validator rule `salt/primitive-leak`: any spec referencing a primitive token (`--salt-palette-navy-*`, `-slate-*`, `-white`, `-blue-*`) is a schema error, same severity as raw hex.
   - Tighten `salt/no-raw-color` to also catch `hsl()`, `oklch()`, `color()`, and named CSS colors in string values, so no primitive value can be generated at all.
   - `generateSpec` output is run through the same allowlist in a dev assertion, guaranteeing the engine can only ever emit semantic/component tokens. The hostile preset keeps its raw-hex payload — it exists to be blocked.
   - Raw color parsing stays in `salt-color.ts` because contrast math must resolve computed values via `getComputedStyle`; that read path is separated from the engine's authoring path and documented as read-only.

3. **Validation performance under 2ms**
   - Memoize `validateSaltSpec` with a small bounded (LRU) cache keyed on the payload string, so repeated re-renders and unchanged specs cost a map lookup.
   - Replace the five independent regex passes with one combined scan over the serialized payload, and short-circuit governance checks once a blocking error is found.
   - Return a measured `validationMs` (via `performance.now()`) on the result so the existing audit panel can read real timing instead of a static claim. The `< 2ms` label already rendered in the UI keeps its exact text and position.

## Technical notes

- Files touched: `src/lib/salt-ast-schema.ts`, `src/lib/salt-tokens.ts`, `src/lib/portfolio-data.ts` (contract annotations only), new `src/lib/salt-contracts.ts`. Component files change only if a type import needs updating.
- Zod is already a dependency via the template; AJV stays the Draft-07 engine so the "AST Schema Rules" tab keeps showing the same JSON Schema document.
- All existing values (numbers, labels, tokens, presets) are preserved byte-for-byte — this is a type/validation change, not a data change.
- Verification: run the three presets through the validator, confirm preset 3 still blocks with the same violation list, confirm presets 1 and 2 still render identically, and screenshot light/dark to prove no visual delta.
- Separately, an SSR Suspense error is currently logged on the preview; it will be root-caused and fixed as part of this pass since it originates in the same module graph.
