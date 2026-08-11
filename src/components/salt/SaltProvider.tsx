import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type SaltMode = "light" | "dark";
export type SaltTheme = "jpm" | "chase";
export type SaltDensity = "high" | "medium" | "low";
export type SaltVision = "standard" | "deuteranopia" | "protanopia" | "monochromacy";

type SaltContextValue = {
  mode: SaltMode;
  theme: SaltTheme;
  density: SaltDensity;
  vision: SaltVision;
  setMode: (m: SaltMode) => void;
  setTheme: (t: SaltTheme) => void;
  setDensity: (d: SaltDensity) => void;
  setVision: (v: SaltVision) => void;
};

const SaltContext = createContext<SaltContextValue | null>(null);

export function useSalt(): SaltContextValue {
  const ctx = useContext(SaltContext);
  if (!ctx) throw new Error("useSalt must be used inside <SaltProvider>");
  return ctx;
}

/** Color-matrix approximations of dichromatic vision (Machado et al.). */
function VisionFilters() {
  return (
    <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute size-0">
      <defs>
        <filter id="salt-vision-deuteranopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0 0 0
                    0.7   0.3   0 0 0
                    0     0.3   0.7 0 0
                    0     0     0   1 0"
          />
        </filter>
        <filter id="salt-vision-protanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix
            type="matrix"
            values="0.567 0.433 0 0 0
                    0.558 0.442 0 0 0
                    0     0.242 0.758 0 0
                    0     0     0   1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}

export function SaltProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SaltMode>("light");
  const [theme, setTheme] = useState<SaltTheme>("jpm");
  const [density, setDensity] = useState<SaltDensity>("medium");
  const [vision, setVision] = useState<SaltVision>("standard");

  const value = useMemo(
    () => ({ mode, theme, density, vision, setMode, setTheme, setDensity, setVision }),
    [mode, theme, density, vision],
  );

  return (
    <SaltContext.Provider value={value}>
      <VisionFilters />
      <div
        data-salt-provider=""
        data-theme={theme}
        data-mode={mode}
        data-density={density}
        data-vision={vision}
        className="salt-text min-h-screen bg-salt-container-secondary font-salt text-salt-content-primary antialiased"
      >
        {children}
      </div>
    </SaltContext.Provider>
  );
}
