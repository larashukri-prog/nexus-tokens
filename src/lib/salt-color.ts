/**
 * Color utilities for the Salt token engine.
 * Parses token values (oklch / rgb / hex) and computes WCAG 2.1 contrast.
 */

export type RGB = { r: number; g: number; b: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** OKLCH -> sRGB (0-1 per channel, gamma encoded). */
export function oklchToRgb(l: number, c: number, hDeg: number): RGB {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const bb = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = l - 0.0894841775 * a - 1.291485548 * bb;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  const lr = 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S;
  const lg = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S;
  const lb = -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S;

  const enc = (v: number) =>
    clamp01(v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055);

  return { r: enc(lr), g: enc(lg), b: enc(lb) };
}

export function parseColor(raw: string): RGB | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  const ok = value.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/);
  if (ok) {
    const [, lRaw = "0", cRaw = "0", hRaw = "0"] = ok;
    const l = lRaw.endsWith("%") ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
    return oklchToRgb(l, parseFloat(cRaw), parseFloat(hRaw));
  }

  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) {
    const [, r = "0", g = "0", b = "0"] = rgb;
    return {
      r: parseFloat(r) / 255,
      g: parseFloat(g) / 255,
      b: parseFloat(b) / 255,
    };
  }

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const digits = hex[1] ?? "";
    const h = digits.length === 3 ? digits.replace(/(.)/g, "$1$1") : digits;
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
    };
  }

  return null;
}

export function relativeLuminance({ r, g, b }: RGB): number {
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(fg: string, bg: string): number | null {
  const a = parseColor(fg);
  const b = parseColor(bg);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function toCssRgb(rgb: RGB): string {
  const c = (v: number) => Math.round(clamp01(v) * 255);
  return `rgb(${c(rgb.r)}, ${c(rgb.g)}, ${c(rgb.b)})`;
}

export type WcagVerdict = "AAA" | "AA" | "FAIL";

export function verdict(ratio: number, large = false): WcagVerdict {
  const aaa = large ? 4.5 : 7;
  const aa = large ? 3 : 4.5;
  if (ratio >= aaa) return "AAA";
  if (ratio >= aa) return "AA";
  return "FAIL";
}

/** Reads a CSS custom property off an element (falls back to documentElement). */
export function readToken(el: Element | null, name: string): string {
  if (typeof window === "undefined") return "";
  const target = el ?? document.documentElement;
  return getComputedStyle(target).getPropertyValue(name).trim();
}
