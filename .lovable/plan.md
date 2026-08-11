# Fix Compliance Audit overlap in GenerationEngine

## Problem
In the left sidebar’s **Compliance Audit** panel, the list of schema-pass checks (below the audit rows) is visually overlapping the **Schema validation status** row. The current layout relies only on the parent flex gap, which is too tight once the pass list wraps.

## Fix
Update `src/components/salt/GenerationEngine.tsx`:

1. **Increase separation between audit rows and pass details**
   - Add a top margin/padding utility (e.g. `mt-[var(--salt-spacing-100)]`) to the `<ul>` that renders `result.passes`.
   - Keep the existing `flex flex-wrap gap-[var(--salt-spacing-50)]` behavior.

2. **Contain the pass list so wrapped items don’t encroach**
   - Wrap the pass list in a bordered/rounded container or add `py-[var(--salt-spacing-100)]` so wrapped rows have internal breathing room.
   - Ensure the container uses `min-w-0` to avoid forcing the parent sidebar wider.

3. **Verify the audit row itself doesn’t overflow**
   - Confirm the `AuditRow` value `Pill` allows text wrapping without clipping into adjacent content (it currently does, but the spacing fix should resolve the perceived overlap).

## Verification
- Capture a Playwright screenshot of the left sidebar Compliance Audit section at the current viewport.
- Confirm the pass-details checkmarks are clearly separated from the “Schema validation status” row and no text overlaps.

## Scope
Single-file change in `src/components/salt/GenerationEngine.tsx`. No schema, data, or other components affected.
