import { useCallback, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_ADVISOR_PROMPT,
  DEFAULT_CANVAS_SPEC,
  type SaltUiSpec,
} from "@/lib/salt-ast-schema";
import {
  SaltCanvasContext,
  SaltPrefsContext,
  type SaltCanvasValue,
  type SaltDensity,
  type SaltMode,
  type SaltPrefsValue,
  type SaltTheme,
  type SaltVision,
} from "./salt-context";

export type {
  SaltMode,
  SaltTheme,
  SaltDensity,
  SaltVision,
  SaltPrefsValue,
  SaltCanvasValue,
} from "./salt-context";
export { useSalt, useSaltPrefs, useSaltCanvas } from "./salt-context";



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
  const [canvasSpec, setCanvasSpec] = useState<SaltUiSpec | null>(DEFAULT_CANVAS_SPEC);
  const [canvasPrompt, setCanvasPrompt] = useState(DEFAULT_ADVISOR_PROMPT);

  const setCanvas = useCallback((spec: SaltUiSpec | null, prompt: string) => {
    setCanvasSpec(spec);
    setCanvasPrompt(prompt);
  }, []);

  const prefs = useMemo<SaltPrefsValue>(
    () => ({ mode, theme, density, vision, setMode, setTheme, setDensity, setVision }),
    [mode, theme, density, vision],
  );

  const canvas = useMemo<SaltCanvasValue>(
    () => ({ canvasSpec, canvasPrompt, setCanvas }),
    [canvasSpec, canvasPrompt, setCanvas],
  );

  return (
    <SaltPrefsContext.Provider value={prefs}>
      <SaltCanvasContext.Provider value={canvas}>
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
      </SaltCanvasContext.Provider>
    </SaltPrefsContext.Provider>
  );

}
