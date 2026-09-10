import { useEffect, useMemo, useState } from "react";
import { Check, Cpu, ShieldCheck, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { Panel, SegmentedControl, Pill } from "./SaltControls";
import { useSaltCanvas, useSaltPrefs } from "./salt-context";
import {
  DEFAULT_ADVISOR_PROMPT,
  MAX_SPEC_PAYLOAD_CHARS,
  PRESETS,
  SALT_AST_SCHEMA,
  generateSpec,
  validateSaltSpec,
  type SaltUiSpec,
} from "@/lib/salt-ast-schema";
import { saltUiSpecContract } from "@/lib/salt-contracts";
import { contrastRatio, readToken, verdict } from "@/lib/salt-color";

type Tab = "form" | "spec" | "rules";

const DEFAULT_PROMPT = DEFAULT_ADVISOR_PROMPT;

/** Debounces a fast-changing value so heavy validation never runs per keystroke. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (Object.is(debounced, value)) return;
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);
  return debounced;
}

function useProviderEl() {
  const [el, setEl] = useState<Element | null>(null);
  useEffect(() => {
    setEl(document.querySelector("[data-salt-provider]"));
  }, []);
  return el;
}

function AuditRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "warning" | "negative" | "info";
}) {
  return (
    <li className="grid min-w-0 grid-cols-1 gap-[var(--salt-spacing-50)] bg-salt-container-primary px-[var(--salt-spacing-100)] py-[var(--salt-spacing-100)]">
      <span className="min-w-0 text-[0.7rem] leading-snug text-salt-content-secondary">{label}</span>
      <div className="min-w-0 max-w-full justify-self-start [&>span]:max-w-full [&>span]:whitespace-normal [&>span]:break-words [&>span]:leading-snug">
        <Pill tone={tone}>{value}</Pill>
      </div>
    </li>
  );
}

export function GenerationEngine() {
  const el = useProviderEl();
  const { density, theme, mode, setDensity, setTheme } = useSaltPrefs();
  const { setCanvas } = useSaltCanvas();
  const [tab, setTab] = useState<Tab>("form");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [spec, setSpec] = useState(() =>
    generateSpec(DEFAULT_PROMPT, { density: "medium", theme: "jpmBrand" }),
  );

  /* Validation, JSON parsing and the global canvas push only run on the
     debounced value, so typing in the textarea stays a local state update. */
  const debouncedSpec = useDebounced(spec, 175);
  const result = useMemo(() => validateSaltSpec(debouncedSpec), [debouncedSpec]);
  const parsed = useMemo<Partial<SaltUiSpec>>(() => {
    try {
      return JSON.parse(debouncedSpec) as Partial<SaltUiSpec>;
    } catch {
      return {};
    }
  }, [debouncedSpec]);

  /* Hard runtime gate: only a payload that satisfies the strict Zod contract
     may ever reach the canvas — no unchecked casts. */
  const gated = useMemo(() => saltUiSpecContract.safeParse(parsed), [parsed]);

  useEffect(() => {
    if (result.ok && gated.success) setCanvas(gated.data, prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.ok, gated]);

  const [contrast, setContrast] = useState<
    { label: string; ratio: number | null; grade: string }[]
  >([]);

  useEffect(() => {
    if (!el) return;
    const bg = readToken(el, "--salt-container-primary-background");
    const tokens = (parsed.assetClasses ?? [])
      .map((a) => a?.saltCategoricalToken)
      .filter((t): t is string => /^--salt-palette-categorical-[1-6]$/.test(String(t)));
    const pairs = [
      { label: "content-primary on container-primary", token: "--salt-content-primary-foreground" },
      ...tokens.map((t) => ({ label: `${t.replace("--salt-palette-", "")} on container`, token: t })),
    ];
    setContrast(
      pairs.map((p) => {
        const ratio = contrastRatio(readToken(el, p.token), bg);
        return { label: p.label, ratio, grade: ratio === null ? "—" : verdict(ratio, true) };
      }),
    );
  }, [el, mode, theme, parsed]);

  const worst = contrast.reduce<number | null>(
    (acc, r) => (r.ratio === null ? acc : acc === null ? r.ratio : Math.min(acc, r.ratio)),
    null,
  );
  const bodyRatio = contrast[0]?.ratio ?? null;

  function generate(text: string) {
    setPrompt(text);
    setSpec(
      generateSpec(text, {
        density,
        theme: theme === "chase" ? "chase" : "jpmBrand",
      }),
    );
  }


  function applySpec() {
    if (parsed.density) setDensity(parsed.density);
    if (parsed.theme) setTheme(parsed.theme === "chase" ? "chase" : "jpm");
  }

  return (
    <Panel
      eyebrow="Layer 01"
      title="AI Generation Engine"
      action={
        result.ok ? (
          <Pill tone="positive">AST valid</Pill>
        ) : (
          <Pill tone="negative">
            {result.violations.filter((v) => v.severity === "error").length} blocked
          </Pill>
        )
      }
    >
      <div
        role="tablist"
        aria-label="Salt inspector view"
        className="flex rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary p-[2px]"
      >
        {(
          [
            { id: "form", label: "UI Form" },
            { id: "spec", label: "Salt JSON Spec" },
            { id: "rules", label: "AST Schema Rules" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`salt-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`salt-tabpanel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "flex-1 rounded-[calc(var(--salt-control-borderRadius)-1px)] bg-salt-actionable px-[var(--salt-spacing-50)] py-[var(--salt-spacing-50)] text-[0.66rem] font-semibold text-salt-actionable-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
                : "flex-1 rounded-[calc(var(--salt-control-borderRadius)-1px)] px-[var(--salt-spacing-50)] py-[var(--salt-spacing-50)] text-[0.66rem] font-semibold text-salt-content-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "form" && (
        <div
          role="tabpanel"
          id="salt-tabpanel-form"
          aria-labelledby="salt-tab-form"
          className="flex flex-col gap-[var(--salt-spacing-100)]"
        >
          <label
            htmlFor="salt-advisor-prompt"
            className="text-[0.7rem] font-semibold text-salt-content-secondary"
          >
            Advisor Natural Language Request
          </label>
          <textarea
            id="salt-advisor-prompt"
            value={prompt}
            rows={4}
            maxLength={600}
            spellCheck={false}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Stress test the muni sleeve against a 200bps rate hike through 2026…"
            className="w-full resize-y rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-secondary p-[var(--salt-spacing-100)] font-salt-mono text-[0.7rem] leading-[1.5] text-salt-content-primary placeholder:text-salt-content-tertiary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-salt-info"
          />
          <button
            type="button"
            onClick={() => generate(prompt)}
            className="inline-flex min-h-[var(--salt-size-control)] items-center justify-center gap-[var(--salt-spacing-50)] rounded-[var(--salt-control-borderRadius)] bg-salt-actionable px-[var(--salt-spacing-200)] font-semibold text-salt-actionable-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
          >
            <Cpu aria-hidden="true" className="size-3.5" />
            Generate &amp; validate Salt spec
          </button>

          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-salt-content-tertiary">
            Quick presets
          </p>
          <div className="flex flex-col gap-[var(--salt-spacing-50)]">
            {PRESETS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => generate(p.prompt)}
                className="flex items-start gap-[var(--salt-spacing-50)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary p-[var(--salt-spacing-100)] text-left text-[0.68rem] leading-[1.45] text-salt-content-secondary hover:border-salt-actionable focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
              >
                {p.hostile ? (
                  <TriangleAlert aria-hidden="true" className="mt-[2px] size-3.5 shrink-0 text-salt-negative" />
                ) : (
                  <Sparkles aria-hidden="true" className="mt-[2px] size-3.5 shrink-0 text-salt-info" />
                )}
                <span>
                  <span className="block font-semibold text-salt-content-primary">
                    Preset {i + 1}
                  </span>
                  <span className="block text-salt-content-primary">{p.label}</span>
                  <span className="mt-[2px] block text-salt-content-tertiary">{p.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "spec" && (
        <div
          role="tabpanel"
          id="salt-tabpanel-spec"
          aria-labelledby="salt-tab-spec"
          className="flex flex-col gap-[var(--salt-spacing-100)]"
        >
          <textarea
            value={spec}
            rows={12}
            maxLength={MAX_SPEC_PAYLOAD_CHARS}
            spellCheck={false}
            aria-label="Generated Salt JSON spec"
            onChange={(e) => setSpec(e.target.value)}
            className="w-full resize-y rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-secondary p-[var(--salt-spacing-100)] font-salt-mono text-[0.66rem] leading-[1.5] text-salt-content-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-salt-info"
          />
          <button
            type="button"
            disabled={!result.ok}
            onClick={applySpec}
            className="inline-flex min-h-[var(--salt-size-control)] items-center justify-center gap-[var(--salt-spacing-50)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary px-[var(--salt-spacing-200)] font-semibold text-salt-content-primary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
          >
            <Wand2 aria-hidden="true" className="size-3.5" />
            Apply spec to canvas
          </button>
        </div>
      )}

      {tab === "rules" && (
        <div role="tabpanel" id="salt-tabpanel-rules" aria-labelledby="salt-tab-rules">
          <pre className="max-h-80 overflow-auto whitespace-pre rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-tertiary p-[var(--salt-spacing-100)] font-salt-mono text-[0.62rem] leading-[1.5] text-salt-content-secondary">
            {JSON.stringify(SALT_AST_SCHEMA, null, 2)}
          </pre>
        </div>
      )}

      {/* Audit panel */}
      <div className="flex flex-col gap-[var(--salt-spacing-50)]">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-salt-content-tertiary">
          Compliance audit
        </p>
        <ul className="divide-y divide-salt-container-border rounded-[var(--salt-control-borderRadius)] border border-salt-container-border">
          <AuditRow
            label="Salt semantic token mapping"
            value={
              result.tokensExpected > 0 && result.tokensResolved === result.tokensExpected
                ? `PASS: ${result.tokensResolved}/${result.tokensExpected} → categorical-*`
                : `FAIL: ${result.tokensResolved}/${result.tokensExpected} resolved`
            }
            tone={
              result.tokensExpected > 0 && result.tokensResolved === result.tokensExpected
                ? "positive"
                : "negative"
            }
          />
          <AuditRow
            label="Contrast ratio (body text on container)"
            value={
              bodyRatio === null
                ? "—"
                : `${bodyRatio.toFixed(1)}:1 — ${verdict(bodyRatio) === "FAIL" ? "FAILED" : `PASSED (WCAG 2.1 ${verdict(bodyRatio)})`}`
            }
            tone={bodyRatio !== null && verdict(bodyRatio) === "AAA" ? "positive" : "warning"}
          />
          <AuditRow
            label="Worst categorical data pair"
            value={worst === null ? "—" : `${worst.toFixed(1)}:1 — ${verdict(worst, true)}`}
            tone={worst !== null && verdict(worst, true) === "AAA" ? "positive" : "warning"}
          />
          <AuditRow
            label="Density grid alignment"
            value={result.offGrid.length ? `FAIL: ${result.offGrid.join(", ")}px` : "4px Spatial Grid: PASSED"}
            tone={result.offGrid.length ? "negative" : "positive"}
          />
          <AuditRow
            label="Schema validation status"
            value={
              result.ok
                ? "PASS: 0 Unapproved CSS Properties Detected"
                : `FAIL: ${result.cssPropertyCount} unapproved CSS propert${result.cssPropertyCount === 1 ? "y" : "ies"}`
            }
            tone={result.ok ? "positive" : "negative"}
          />
        </ul>

        {result.violations.length > 0 && (
          <ul className="flex flex-col gap-[var(--salt-spacing-50)]">
            {result.violations.map((v) => (
              <li key={`${v.rule}-${v.detail}`} className="flex items-start gap-[var(--salt-spacing-50)]">
                <TriangleAlert
                  aria-hidden="true"
                  className={
                    v.severity === "error"
                      ? "mt-[2px] size-3.5 shrink-0 text-salt-negative"
                      : "mt-[2px] size-3.5 shrink-0 text-salt-warning"
                  }
                />
                <span>
                  <span className="font-salt-mono text-[0.66rem] font-semibold text-salt-content-primary">
                    {v.rule}
                  </span>
                  <span className="block text-[0.66rem] text-salt-content-secondary">{v.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {result.ok && (
          <div className="flex items-center gap-[var(--salt-spacing-50)] text-[0.66rem] text-salt-content-secondary">
            <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-salt-positive" />
            Draft-07 SaltUiSpec satisfied · additionalProperties:false enforced
          </div>
        )}

        <div className="mt-[var(--salt-spacing-100)] min-w-0 rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary p-[var(--salt-spacing-100)]">
          <ul className="flex flex-wrap gap-x-[var(--salt-spacing-100)] gap-y-[var(--salt-spacing-50)]">
            {result.passes.map((p) => (
              <li
                key={p}
                className="flex min-w-0 items-center gap-[var(--salt-spacing-50)] text-[0.62rem] text-salt-content-tertiary"
              >
                <Check aria-hidden="true" className="size-3 shrink-0 text-salt-positive" />
                <span className="truncate font-salt-mono">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SegmentedControl
        label="Compiled density"
        value={density}
        onChange={setDensity}
        options={[
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
        ]}
      />
    </Panel>
  );
}
