Add a footer disclaimer to the Nexus-Tokens app.

1. Create a footer component or insert a `<footer>` at the bottom of the root layout in `src/routes/index.tsx` so it spans the full width of the page below the sidebar and live canvas.
2. Render the exact text: "Disclaimer: This project is an independent conceptual prototype created for portfolio demonstration and technical showcase purposes. It is not affiliated with, endorsed by, or an official product of JPMorgan Chase & Co."
3. Style using Salt Design System semantic tokens only: small text size, `text-salt-content-tertiary`, background `bg-salt-container-tertiary`, border-top `border-salt-container-border`, and Salt spacing tokens for padding. No raw hex codes or inline CSS.
4. Add an `aria-label` to the footer for accessibility compliance.
5. Verify in the preview that the footer appears at the bottom, does not overlap any existing content, and renders cleanly across light/dark modes.