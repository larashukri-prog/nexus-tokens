import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Panel, SegmentedControl, Pill } from "./SaltControls";
import { useSalt } from "./SaltProvider";
import { CONTRAST_PAIRS, TOKEN_DICTIONARY, type TokenTier } from "@/lib/salt-tokens";
import { contrastRatio, parseColor, readToken, toCssRgb, verdict } from "@/lib/salt-color";
import { GenerationEngine } from "./GenerationEngine";

const TIER_LABEL: Record<TokenTier, string> = {
  primitive: "T1",
  semantic: "T2",
  component: "T3",
};

function useProviderEl() {
  const [el, setEl] = useState<Element | null>(null);
  useEffect(() => {
    setEl(document.querySelector("[data-salt-provider]"));
  }, []);
  return el;
}


/* ----------------------------- Token dictionary ---------------------------- */

function TokenDictionary() {
  const el = useProviderEl();
  const { mode, theme, density } = useSalt();
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"all" | TokenTier>("all");
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!el) return;
    const next: Record<string, string> = {};
    for (const t of TOKEN_DICTIONARY) next[t.name] = readToken(el, t.name);
    setResolved(next);
  }, [el, mode, theme, density]);

  const rows = useMemo(
    () =>
      TOKEN_DICTIONARY.filter(
        (t) =>
          (tier === "all" || t.tier === tier) &&
          (t.name.includes(query.toLowerCase()) ||
            (t.note ?? "").toLowerCase().includes(query.toLowerCase()) ||
            t.group.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, tier],
  );

  return (
    <Panel
      eyebrow="Layer 02"
      title="Token Dictionary"
      action={<Pill tone="info">{rows.length} tokens</Pill>}
    >
      <div className="flex items-center gap-[var(--salt-spacing-50)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-secondary px-[var(--salt-spacing-100)]">
        <Search aria-hidden="true" className="size-3.5 text-salt-content-tertiary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter tokens…"
          aria-label="Filter tokens"
          className="min-h-[var(--salt-size-control)] w-full bg-transparent text-salt-content-primary placeholder:text-salt-content-tertiary focus:outline-none"
        />
      </div>
      <SegmentedControl
        label="Tier"
        value={tier}
        onChange={setTier}
        options={[
          { value: "all", label: "All" },
          { value: "primitive", label: "T1" },
          { value: "semantic", label: "T2" },
          { value: "component", label: "T3" },
        ]}
      />
      <ul className="max-h-72 divide-y divide-salt-container-border overflow-y-auto rounded-[var(--salt-control-borderRadius)] border border-salt-container-border">
        {rows.map((t) => {
          const value = resolved[t.name] ?? "";
          const isColor = Boolean(parseColor(value));
          return (
            <li
              key={t.name}
              className="flex items-center gap-[var(--salt-spacing-100)] bg-salt-container-primary px-[var(--salt-spacing-100)] py-[var(--salt-spacing-50)]"
            >
              <span
                aria-hidden="true"
                className="size-4 shrink-0 border border-salt-container-border"
                style={
                  isColor
                    ? { backgroundColor: `var(${t.name})` }
                    : { backgroundColor: "var(--salt-container-tertiary-background)" }
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-salt-mono text-[0.68rem] text-salt-content-primary">
                  {t.name}
                </span>
                <span className="block truncate text-[0.65rem] text-salt-content-tertiary">
                  {t.group}
                  {t.note ? ` · ${t.note}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-salt-mono text-[0.62rem] text-salt-content-secondary">
                  {isColor ? toCssRgb(parseColor(value)!) : value || "—"}
                </span>
                <span className="text-[0.6rem] font-semibold tracking-widest text-salt-content-tertiary">
                  {TIER_LABEL[t.tier]}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}


/* --------------------------- WCAG contrast inspector ----------------------- */

function ContrastInspector() {
  const el = useProviderEl();
  const { mode, theme } = useSalt();
  const [rows, setRows] = useState<{ label: string; ratio: number | null; grade: string }[]>([]);

  useEffect(() => {
    if (!el) return;
    setRows(
      CONTRAST_PAIRS.map((p) => {
        const ratio = contrastRatio(readToken(el, p.fg), readToken(el, p.bg));
        return {
          label: p.label,
          ratio,
          grade: ratio === null ? "—" : verdict(ratio, p.large),
        };
      }),
    );
  }, [el, mode, theme]);

  const aaa = rows.filter((r) => r.grade === "AAA").length;

  return (
    <Panel
      eyebrow="Layer 04"
      title="WCAG Contrast Inspect"
      action={
        <Pill tone={aaa === rows.length && rows.length > 0 ? "positive" : "warning"}>
          {aaa}/{rows.length || 0} AAA
        </Pill>
      }
    >
      <p className="text-[0.68rem] text-salt-content-tertiary">
        Ratios computed live from resolved token values for the active theme and mode.
      </p>
      <ul className="divide-y divide-salt-container-border rounded-[var(--salt-control-borderRadius)] border border-salt-container-border">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-[var(--salt-spacing-100)] bg-salt-container-primary px-[var(--salt-spacing-100)] py-[var(--salt-spacing-50)]"
          >
            <span className="min-w-0 flex-1 truncate text-[0.7rem] text-salt-content-secondary">
              {r.label}
            </span>
            <span className="font-salt-mono text-[0.7rem] font-semibold text-salt-content-primary">
              {r.ratio ? `${r.ratio.toFixed(2)}:1` : "—"}
            </span>
            <Pill
              tone={r.grade === "AAA" ? "positive" : r.grade === "AA" ? "warning" : "negative"}
            >
              {r.grade}
            </Pill>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-[var(--salt-spacing-50)] text-[0.68rem] text-salt-content-secondary">
        <ShieldCheck aria-hidden="true" className="size-3.5 text-salt-positive" />
        Enforced upstream: compiler rejects any pair below 7:1 for body text.
      </div>
    </Panel>
  );
}

/* --------------------------------- Sidebar -------------------------------- */

export function TokenEngineSidebar() {
  const { density, setDensity } = useSalt();

  return (
    <aside
      aria-label="Salt AST and Token Engine"
      className="flex w-full shrink-0 flex-col gap-[var(--salt-spacing-200)] border-salt-container-border bg-salt-container-secondary p-[var(--salt-spacing-200)] lg:h-screen lg:w-[380px] lg:overflow-y-auto lg:border-r"
    >
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-salt-content-tertiary">
          Nexus-Tokens
        </p>
        <h1 className="font-semibold text-salt-content-primary [font-size:var(--salt-text-h1-fontSize)]">
          Salt AST &amp; Token Engine
        </h1>
        <p className="mt-[var(--salt-spacing-50)] text-[0.7rem] text-salt-content-secondary">
          Layouts compile against JPM Salt tokens. Unapproved inline CSS and legacy overrides never
          reach the canvas.
        </p>
      </div>

      <SegmentedControl
        label="Density"
        value={density}
        onChange={setDensity}
        options={[
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
        ]}
      />

      <GenerationEngine />
      <TokenDictionary />
      <ContrastInspector />

    </aside>
  );
}
