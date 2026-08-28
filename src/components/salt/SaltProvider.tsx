import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_ADVISOR_PROMPT,
  DEFAULT_CANVAS_SPEC,
  type SaltUiSpec,
} from "@/lib/salt-ast-schema";

export type SaltMode = "light" | "dark";
export type SaltTheme = "jpm" | "chase";
export type SaltDensity = "high" | "medium" | "low";
export type SaltVision = "standard" | "deuteranopia" | "protanopia" | "monochromacy";

type SaltPrefsValue = {
  mode: SaltMode;
  theme: SaltTheme;
  density: SaltDensity;
  vision: SaltVision;
  setMode: (m: SaltMode) => void;
  setTheme: (t: SaltTheme) => void;
  setDensity: (d: SaltDensity) => void;
  setVision: (v: SaltVision) => void;
};

type SaltCanvasValue = {
  /** Last spec that passed Salt AST validation and was compiled to the canvas. */
  canvasSpec: SaltUiSpec | null;
  canvasPrompt: string;
  setCanvas: (spec: SaltUiSpec | null, prompt: string) => void;
};

type SaltContextValue = SaltPrefsValue & SaltCanvasValue;

const SaltPrefsContext = createContext<SaltPrefsValue | null>(null);
const SaltCanvasContext = createContext<SaltCanvasValue | null>(null);

/** Stable UI preferences only — never re-renders when the canvas spec changes. */
export function useSaltPrefs(): SaltPrefsValue {
  const ctx = useContext(SaltPrefsContext);
  if (!ctx) throw new Error("useSaltPrefs must be used inside <SaltProvider>");
  return ctx;
}

/** Fast-changing execution state (compiled spec + prompt). */
export function useSaltCanvas(): SaltCanvasValue {
  const ctx = useContext(SaltCanvasContext);
  if (!ctx) throw new Error("useSaltCanvas must be used inside <SaltProvider>");
  return ctx;
}

export function useSalt(): SaltContextValue {
  const prefs = useSaltPrefs();
  const canvas = useSaltCanvas();
  return useMemo(() => ({ ...prefs, ...canvas }), [prefs, canvas]);
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
