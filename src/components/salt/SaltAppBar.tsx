import { Hexagon } from "lucide-react";
import { SegmentedControl } from "./SaltControls";
import { useSaltPrefs } from "./SaltProvider";

export function SaltAppBar() {
  const { mode, setMode, theme, setTheme, vision, setVision } = useSaltPrefs();

  return (
    <header className="flex flex-wrap items-end justify-between gap-[var(--salt-spacing-200)] border-b border-salt-container-border bg-salt-container-primary px-[var(--salt-spacing-200)] py-[var(--salt-spacing-100)]">
      <div className="flex items-center gap-[var(--salt-spacing-100)]">
        <Hexagon aria-hidden="true" className="size-5 text-salt-accent" />
        <span className="font-semibold tracking-tight text-salt-content-primary [font-size:var(--salt-text-h1-fontSize)]">
          Nexus-Tokens
        </span>
        <span className="hidden text-salt-content-tertiary sm:inline">
          Wealth Management Client Portal
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-[var(--salt-spacing-200)]">
        <SegmentedControl
          label="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <SegmentedControl
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "jpm", label: "JPM Brand" },
            { value: "chase", label: "Chase" },
          ]}
        />
        <SegmentedControl
          label="Vision Simulator"
          value={vision}
          onChange={setVision}
          options={[
            { value: "standard", label: "Standard" },
            { value: "deuteranopia", label: "Deuteranopia" },
            { value: "protanopia", label: "Protanopia" },
            { value: "monochromacy", label: "Monochromacy" },
          ]}
        />
      </div>
    </header>
  );
}
