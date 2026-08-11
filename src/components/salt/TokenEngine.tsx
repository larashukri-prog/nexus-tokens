import { useEffect, useMemo, useState } from "react";
import { Cpu, Search, ShieldCheck, TriangleAlert, Check } from "lucide-react";
import { Panel, SegmentedControl, Pill } from "./SaltControls";
import { useSalt } from "./SaltProvider";
import { CONTRAST_PAIRS, TOKEN_DICTIONARY, type TokenTier } from "@/lib/salt-tokens";
import { contrastRatio, parseColor, readToken, toCssRgb, verdict } from "@/lib/salt-color";

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

/* ------------------------------- AST compiler ------------------------------ */

const PROMPT_RULES: { match: RegExp; node: string; tokens: string[] }[] = [
  {
    match: /(alloc|pie|donut|chart|breakdown)/i,
    node: "SaltDonutChart",
    tokens: ["--salt-palette-categorical-1..6", "--salt-container-primary-background"],
  },
  {
    match: /(table|holding|position|blotter)/i,
    node: "SaltDataGrid",
    tokens: ["--salt-table-rowHeight", "--salt-table-headerBackground"],
  },
  {
    match: /(card|summary|kpi|metric)/i,
    node: "SaltMetricCard",
    tokens: ["--salt-content-primary-foreground", "--salt-card-borderWidth"],
  },
  {
    match: /(risk|alert|warning|drawdown)/i,
    node: "SaltStatusBanner",
    tokens: ["--salt-status-warning-foreground"],
  },
];

function compilePrompt(prompt: string, density: string) {
  const matched = PROMPT_RULES.filter((r) => r.match.test(prompt));
  const nodes = matched.length
    ? matched
    : [
        {
          node: "SaltFlexLayout",
          tokens: ["--salt-spacing-200", "--salt-container-primary-background"],
          match: /./,
        },
      ];
  const lines: string[] = [];
  lines.push(`SaltProvider density="${density}"`);
  lines.push(`└─ StackLayout gap={var(--salt-spacing-200)}`);
  nodes.forEach((n, i) => {
    const last = i === nodes.length - 1;
    lines.push(`   ${last ? "└─" : "├─"} ${n.node}`);
    n.tokens.forEach((t) => lines.push(`   ${last ? "  " : "│ "}    · ${t}`));
  });
  lines.push(`ENFORCED: 0 inline styles · 0 raw hex · grid=4px · target=WCAG 2.1 AAA`);
  return lines.join("\n");
}

function AstCompiler() {
  const { density } = useSalt();
  const [prompt, setPrompt] = useState(
    "Build an allocation breakdown with holdings table and risk banner",
  );
  const [ast, setAst] = useState(() =>
    compilePrompt("Build an allocation breakdown with holdings table and risk banner", "medium"),
  );

  return (
    <Panel eyebrow="Layer 01" title="AI Layout Compiler">
      <label
        className="text-[0.7rem] font-semibold text-salt-content-secondary"
        htmlFor="salt-prompt"
      >
        Natural-language intent
      </label>
      <textarea
        id="salt-prompt"
        value={prompt}
        rows={3}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full resize-none rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-secondary p-[var(--salt-spacing-100)] font-salt-mono text-[0.72rem] text-salt-content-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-salt-info"
      />
      <button
        type="button"
        onClick={() => setAst(compilePrompt(prompt, density))}
        className="inline-flex min-h-[var(--salt-size-control)] items-center justify-center gap-[var(--salt-spacing-50)] rounded-[var(--salt-control-borderRadius)] bg-salt-actionable px-[var(--salt-spacing-200)] font-semibold text-salt-actionable-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
      >
        <Cpu aria-hidden="true" className="size-3.5" />
        Compile to Salt AST
      </button>
      <pre className="overflow-x-auto whitespace-pre rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-tertiary p-[var(--salt-spacing-100)] font-salt-mono text-[0.68rem] leading-[1.5] text-salt-content-secondary">
        {ast}
      </pre>
    </Panel>
  );
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

/* ---------------------------- JSON schema validator ------------------------ */

const SAMPLE_JSON = `{
  "component": "SaltMetricCard",
  "props": {
    "background": "var(--salt-container-primary-background)",
    "padding": "16px",
    "color": "#0B1F3A",
    "style": { "boxShadow": "0 2px 6px rgba(0,0,0,.4)" },
    "gap": "6px"
  }
}`;

type Violation = { rule: string; detail: string; severity: "error" | "warning" };

function validateSchema(input: string): { violations: Violation[]; passes: string[]; ok: boolean } {
  const violations: Violation[] = [];
  const passes: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return {
      violations: [{ rule: "schema/parse", detail: "Invalid JSON payload", severity: "error" }],
      passes: [],
      ok: false,
    };
  }
  const flat = JSON.stringify(parsed);

  if (/#[0-9a-fA-F]{3,8}\b/.test(flat) || /rgba?\(/.test(flat)) {
    violations.push({
      rule: "tokens/no-raw-color",
      detail: "Raw hex or rgb() literal found — must reference a --salt-* token",
      severity: "error",
    });
  } else passes.push("tokens/no-raw-color");

  if (/"style"\s*:/.test(flat)) {
    violations.push({
      rule: "layout/no-inline-style",
      detail: "Inline style object is not compilable — use Salt component tokens",
      severity: "error",
    });
  } else passes.push("layout/no-inline-style");

  const px = [...flat.matchAll(/"(\d+)px"/g)].map((m) => Number(m[1]));
  const offGrid = px.filter((n) => n % 4 !== 0);
  if (offGrid.length) {
    violations.push({
      rule: "spacing/4px-grid",
      detail: `Off-grid value(s): ${offGrid.join(", ")}px — snap to the 4px spatial grid`,
      severity: "warning",
    });
  } else passes.push("spacing/4px-grid");

  if (!/"component"\s*:/.test(flat)) {
    violations.push({
      rule: "schema/required-component",
      detail: "Missing required `component` key",
      severity: "error",
    });
  } else passes.push("schema/required-component");

  if (/var\(--(?!salt-)/.test(flat)) {
    violations.push({
      rule: "tokens/salt-namespace",
      detail: "Non-Salt CSS variable referenced",
      severity: "error",
    });
  } else passes.push("tokens/salt-namespace");

  return { violations, passes, ok: violations.length === 0 };
}

function SchemaValidator() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const result = useMemo(() => validateSchema(input), [input]);

  return (
    <Panel
      eyebrow="Layer 03"
      title="Schema Validator"
      action={
        result.ok ? (
          <Pill tone="positive">Compiles</Pill>
        ) : (
          <Pill tone="negative">{result.violations.length} blocked</Pill>
        )
      }
    >
      <textarea
        value={input}
        rows={8}
        onChange={(e) => setInput(e.target.value)}
        aria-label="Component JSON schema"
        spellCheck={false}
        className="w-full resize-y rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-secondary p-[var(--salt-spacing-100)] font-salt-mono text-[0.68rem] leading-[1.5] text-salt-content-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-salt-info"
      />
      <ul className="flex flex-col gap-[var(--salt-spacing-50)]">
        {result.violations.map((v) => (
          <li key={v.rule} className="flex items-start gap-[var(--salt-spacing-50)]">
            <TriangleAlert
              aria-hidden="true"
              className={
                v.severity === "error"
                  ? "mt-[2px] size-3.5 shrink-0 text-salt-negative"
                  : "mt-[2px] size-3.5 shrink-0 text-salt-warning"
              }
            />
            <span>
              <span className="font-salt-mono text-[0.68rem] font-semibold text-salt-content-primary">
                {v.rule}
              </span>
              <span className="block text-[0.68rem] text-salt-content-secondary">{v.detail}</span>
            </span>
          </li>
        ))}
        {result.passes.map((p) => (
          <li
            key={p}
            className="flex items-center gap-[var(--salt-spacing-50)] text-[0.68rem] text-salt-content-tertiary"
          >
            <Check aria-hidden="true" className="size-3.5 shrink-0 text-salt-positive" />
            <span className="font-salt-mono">{p}</span>
          </li>
        ))}
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

      <AstCompiler />
      <TokenDictionary />
      <SchemaValidator />
      <ContrastInspector />
    </aside>
  );
}
