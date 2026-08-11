# Nexus-Tokens — Salt Design System Wealth Portal

A single-page enterprise portal that demonstrates a token-governed design system: a left engine panel that defines and validates Salt tokens, and a right live canvas that renders a wealth-advisor dashboard built strictly from those tokens.

## Screen layout

```text
+--------------------------------------------------------------+
| Top bar: Nexus-Tokens | Mode [Light|Dark] Theme [JPM|Chase]  |
|          Vision [Standard|Deuteranopia|Protanopia|Mono]      |
+---------------------------+----------------------------------+
| Salt AST & Token Engine   | Wealth Advisor Live Canvas       |
| (380px, scrollable)       |                                  |
| - AI prompt input         | - Portfolio KPI row              |
| - Density: High/Med/Low   | - Allocation chart (categorical) |
| - Token dictionary list   | - Asset class cards              |
| - JSON schema validator   | - Holdings table (density-aware) |
| - WCAG contrast inspector | - Theme/density status strip     |
+---------------------------+----------------------------------+
```

## What gets built

1. **Token foundation** in `src/styles.css`: Salt-style 3-tier tokens — primitives (`--salt-palette-*`), semantic (`--salt-content-primary-foreground`, `--salt-container-primary-background/-border`, `--salt-status-info-foreground`, `--salt-sentiment-accent-foreground`, positive/negative sentiment), and component tokens. Categorical data-vis scale 1–6 mapped to asset classes (Municipal Bonds, Private Equity, US Treasuries, Equities, Cash, Alternatives), chosen for AAA-level contrast and color-blind separability. 4px spatial scale + three density scales (spacing, control height, font size, row height).
2. **SaltProvider simulation**: a React context + wrapper that sets `data-mode`, `data-theme`, `data-density`, and `data-vision` attributes on the app root; CSS attribute selectors re-bind token values. Vision simulation applied via SVG color-matrix filters (deuteranopia/protanopia) and grayscale for monochromacy.
3. **Engine sidebar**: prompt input that "compiles" a request into a fake AST preview; density segmented control; searchable token dictionary showing token name, tier, resolved value, and a swatch; JSON schema validator that parses pasted component JSON and reports violations (raw hex, inline style, non-4px spacing, unapproved token); WCAG contrast inspector listing foreground/background pairs with computed ratio and AA/AAA verdict, live per mode/theme.
4. **Live canvas**: KPI stat row, allocation donut/bar chart drawn with SVG using categorical tokens, asset-class cards with sentiment deltas, and a holdings table whose row height and type scale react to density. No chart library needed.
5. **Amplitude-style typography tokens**: font-size/line-height/weight tokens with a system-stack fallback loaded via `<link>` in the root route head if a suitable web font is used.
6. **SEO**: route-specific `head()` on `/` with title, description, og/twitter tags.

## Technical notes

- Everything renders at `/` by rewriting `src/routes/index.tsx`; supporting components under `src/components/nexus/*` and token/contrast utilities under `src/lib/`.
- Contrast ratios computed at runtime from resolved CSS variables (`getComputedStyle`) converted oklch/rgb → relative luminance, so the inspector reflects the actual active theme.
- Zero hardcoded color utilities in components: all colors come through `var(--salt-*)` tokens registered in `@theme inline` so Tailwind classes resolve to them.
- Frontend only — no backend, no auth, no database.
