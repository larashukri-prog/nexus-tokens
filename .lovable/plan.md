# Keep preset clicks on the UI Form tab

## Problem
Clicking any of the three quick presets currently switches the side panel to the "Salt JSON Spec" tab, which pulls the user away from where they were working.

## Change
In `src/components/salt/GenerationEngine.tsx`, the `generate()` function sets the prompt, builds the spec, and then forces `setTab("spec")`. Remove that forced tab switch so the active tab stays whatever the user had open (the UI Form by default).

Everything else stays as-is: the preset still fills the prompt, regenerates the spec, and the validation/compliance readouts still update immediately. The user can open the JSON Spec tab manually whenever they want.

## Verification
Click each of the three presets and confirm the panel remains on the UI Form tab while the audit readouts and canvas update.
