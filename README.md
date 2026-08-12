# Salt Advisor Canvas

Build a high-performance, enterprise-grade Wealth Management Client Portal named "Nexus-Tokens" using JPMorgan Chase's Salt Design System architecture.

1. Core Objective:

Demonstrate an AI-Native Design System and Token Engine that enforces WCAG 2.1 AAA compliance upstream by strictly compiling layouts against Salt Design System (JPM Brand Theme) tokens, CSS variables, and density grids—preventing unapproved inline CSS or legacy component overrides.

2. Layout & Structure:

- Use a modern split-screen layout styled with Salt Design System tokens and clean B2B financial aesthetic.

- Left Sidebar (Width: 380px): "Salt AST & Token Engine" (contains AI prompt input, token dictionary, JSON schema validator, density controls, and WCAG contrast inspect panel).

- Right Main Panel: "Wealth Advisor Live Canvas" (displays the generated interactive chart, asset cards, and Salt Theme controls).

3. Salt Design System Token & Density Foundations:

- Implement Salt's 3-Tier Token Model: Primitives -> Semantic Tokens (--salt-content-primary-foreground, --salt-status-info-foreground, --salt-sentiment-accent-foreground) -> Component Tokens.

- Categorical Data Visualization Scale: Define Salt Data Vis categorical color tokens (--salt-palette-categorical-1: Municipal Bonds, --salt-palette-categorical-2: Private Equity, --salt-palette-categorical-3: US Treasuries) engineered for high contrast and color-blind safety.

- 4px Spatial Grid & Density System: Support dynamic Salt density switching via container state [ High Density (data-heavy trading) | Medium Density (standard financial app) | Low Density (content-focused presentation) ].

4. System Requirements:

- Wrap application layout in a simulated SaltProvider that supports dynamic Mode switching [ Light Mode | Dark Mode ] and Theme selection [ JPM Brand | Chase ].

- Include an Accessibility & Vision Simulator toggle bar at the top: [ Standard | Deuteranopia (Red-Green) | Protanopia | Monochromacy (Grayscale) ].

- Verify that all visual assets rely strictly on Salt semantic variables (e.g. --salt-container-primary-background, --salt-text-primary-foreground) rather than raw hex codes.

Style: Sleek JPM Wealth Management interface using Amplitude typography tokens, slate/navy container backgrounds, crisp borders (--salt-container-primary-border), and precise financial spatial rhythms.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nexus-tokens.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d2706820-03b5-4a6d-8ffb-c6c2971f4de7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
