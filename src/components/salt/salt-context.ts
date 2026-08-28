import { createContext, useContext, useMemo, type Context } from "react";
import type { SaltUiSpec } from "@/lib/salt-ast-schema";

export type SaltMode = "light" | "dark";
export type SaltTheme = "jpm" | "chase";
export type SaltDensity = "high" | "medium" | "low";
export type SaltVision = "standard" | "deuteranopia" | "protanopia" | "monochromacy";

export type SaltPrefsValue = {
  mode: SaltMode;
  theme: SaltTheme;
  density: SaltDensity;
  vision: SaltVision;
  setMode: (m: SaltMode) => void;
  setTheme: (t: SaltTheme) => void;
  setDensity: (d: SaltDensity) => void;
  setVision: (v: SaltVision) => void;
};

export type SaltCanvasValue = {
  /** Last spec that passed Salt AST validation and was compiled to the canvas. */
  canvasSpec: SaltUiSpec | null;
  canvasPrompt: string;
  setCanvas: (spec: SaltUiSpec | null, prompt: string) => void;
};

export type SaltContextValue = SaltPrefsValue & SaltCanvasValue;

/**
 * Contexts are cached on globalThis so a duplicated module instance (e.g. an
 * HMR-invalidated copy served with a `?t=` query) reuses the SAME context
 * object as the provider. Without this, provider and consumer can end up on
 * two distinct contexts and every consumer throws "must be used inside
 * <SaltProvider>" even though the tree is correct.
 */
const registry = globalThis as typeof globalThis & {
  __saltPrefsContext?: Context<SaltPrefsValue | null>;
  __saltCanvasContext?: Context<SaltCanvasValue | null>;
};

export const SaltPrefsContext: Context<SaltPrefsValue | null> =
  registry.__saltPrefsContext ?? (registry.__saltPrefsContext = createContext<SaltPrefsValue | null>(null));

export const SaltCanvasContext: Context<SaltCanvasValue | null> =
  registry.__saltCanvasContext ??
  (registry.__saltCanvasContext = createContext<SaltCanvasValue | null>(null));

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
