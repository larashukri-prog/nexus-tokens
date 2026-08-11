import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, Copy, Ear, LayoutGrid } from "lucide-react";
import { Panel, Pill, SegmentedControl } from "./SaltControls";
import { useSalt } from "./SaltProvider";
import { ASSET_RISK, YIELD_PERIODS, type SaltUiSpec } from "@/lib/salt-ast-schema";

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 26, left: 34 };

type Series = SaltUiSpec["assetClasses"][number];

function niceBounds(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.max(0, Math.floor((min - 0.6) * 2) / 2);
  const hi = Math.ceil((max + 0.6) * 2) / 2;
  return { lo, hi: hi === lo ? lo + 1 : hi };
}

function YieldChart({
  series,
  active,
  onActive,
}: {
  series: Series[];
  active: number;
  onActive: (i: number) => void;
}) {
  const points = Math.max(...series.map((s) => s.yieldData.length), 2);
  const labels = YIELD_PERIODS.slice(0, points);
  const all = series.flatMap((s) => s.yieldData);
  const { lo, hi } = useMemo(() => niceBounds(all.length ? all : [0, 1]), [all.join(",")]);

  const x = (i: number) => PAD.left + (i / (points - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - ((v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const gridLines = 4;
  const svgRef = useRef<SVGSVGElement>(null);

  const pick = useCallback(
    (clientX: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rel = ((clientX - rect.left) / rect.width) * W;
      const step = (W - PAD.left - PAD.right) / (points - 1);
      onActive(Math.min(points - 1, Math.max(0, Math.round((rel - PAD.left) / step))));
    },
    [onActive, points],
  );

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none [height:auto] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
        role="img"
        tabIndex={0}
        aria-label={`Three year yield comparison, 2024 to 2026, for ${series
          .map((s) => s.name)
          .join(", ")}. Use left and right arrow keys to inspect each quarter.`}
        onMouseMove={(e) => pick(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            onActive(Math.min(points - 1, active + 1));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            onActive(Math.max(0, active - 1));
          } else if (e.key === "Home") {
            e.preventDefault();
            onActive(0);
          } else if (e.key === "End") {
            e.preventDefault();
            onActive(points - 1);
          }
        }}
      >
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const v = lo + ((hi - lo) * i) / gridLines;
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--salt-container-border)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y(v) + 3}
                textAnchor="end"
                className="fill-salt-content-tertiary text-[9px] tabular-nums"
              >
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}

        {series.map((s) => {
          const line = s.yieldData.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return (
            <g key={s.saltCategoricalToken + s.name}>
              <polyline
                points={`${PAD.left},${H - PAD.bottom} ${line} ${x(s.yieldData.length - 1)},${H - PAD.bottom}`}
                fill={`var(${s.saltCategoricalToken})`}
                opacity="0.1"
                stroke="none"
              />
              <polyline
                points={line}
                fill="none"
                stroke={`var(${s.saltCategoricalToken})`}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.yieldData[active] !== undefined && (
                <circle
                  cx={x(active)}
                  cy={y(s.yieldData[active] as number)}
                  r="4"
                  fill={`var(${s.saltCategoricalToken})`}
                  stroke="var(--salt-container-primary-background)"
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}

        <line
          x1={x(active)}
          x2={x(active)}
          y1={PAD.top}
          y2={H - PAD.bottom}
          stroke="var(--salt-content-tertiary-foreground)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {labels.map((l, i) =>
          i % 2 === 0 || i === points - 1 ? (
            <text
              key={l}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className={
                i === active
                  ? "fill-salt-content-primary text-[9px] font-semibold"
                  : "fill-salt-content-tertiary text-[9px]"
              }
            >
              {l}
            </text>
          ) : null,
        )}
      </svg>

      {/* Salt data-vis tooltip */}
      <div
        role="status"
        aria-live="polite"
        className="mt-[var(--salt-spacing-100)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-tertiary p-[var(--salt-spacing-100)]"
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-salt-content-tertiary">
          {labels[active]} · yield readout
        </p>
        <ul className="mt-[var(--salt-spacing-50)] flex flex-wrap gap-x-[var(--salt-spacing-300)] gap-y-[var(--salt-spacing-50)]">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-[var(--salt-spacing-50)]">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0"
                style={{ backgroundColor: `var(${s.saltCategoricalToken})` }}
              />
              <span className="text-[0.7rem] text-salt-content-secondary">{s.name}</span>
              <span className="text-[0.7rem] font-semibold tabular-nums text-salt-content-primary">
                {(s.yieldData[Math.min(active, s.yieldData.length - 1)] ?? 0).toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-[var(--salt-spacing-100)]">
      {series.map((s) => {
        const current = s.yieldData[s.yieldData.length - 1] ?? 0;
        return (
          <li
            key={s.name}
            aria-label={`${s.name} yield ${current.toFixed(2)} percent, rendered with Salt categorical token ${s.saltCategoricalToken.replace("--salt-palette-categorical-", "")}`}
            className="flex items-center gap-[var(--salt-spacing-100)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary px-[var(--salt-spacing-100)] py-[var(--salt-spacing-50)]"
          >
            <span
              aria-hidden="true"
              className="h-3 w-1 shrink-0"
              style={{ backgroundColor: `var(${s.saltCategoricalToken})` }}
            />
            <span className="text-[0.7rem] font-semibold text-salt-content-primary">{s.name}</span>
            <span className="text-[0.7rem] font-semibold tabular-nums text-salt-content-secondary">
              {current.toFixed(2)}%
            </span>
            <span className="font-salt-mono text-[0.62rem] text-salt-content-tertiary">
              {s.saltCategoricalToken}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SummaryCards({ series }: { series: Series[] }) {
  return (
    <div className="grid gap-[var(--salt-spacing-200)] md:grid-cols-2 xl:grid-cols-3">
      {series.map((s) => {
        const current = s.yieldData[s.yieldData.length - 1] ?? 0;
        const first = s.yieldData[0] ?? current;
        const meta = ASSET_RISK[s.name] ?? {
          risk: "Moderate",
          tone: "warning" as const,
          metric: "Risk profile unclassified",
        };
        const tokenIndex = s.saltCategoricalToken.replace("--salt-palette-categorical-", "");
        return (
          <article
            key={s.name}
            tabIndex={0}
            aria-label={`${s.name} yield ${current.toFixed(1)} percent, rendered with Salt categorical token ${tokenIndex}`}
            className="salt-card p-[var(--salt-spacing-200)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
          >
            <div className="flex items-center gap-[var(--salt-spacing-100)]">
              <span
                aria-hidden="true"
                className="size-4 shrink-0"
                style={{ backgroundColor: `var(${s.saltCategoricalToken})` }}
              />
              <h3 className="flex-1 font-semibold text-salt-content-primary">{s.name}</h3>
              <Pill tone={meta.tone}>{meta.risk}</Pill>
            </div>
            <p className="mt-[var(--salt-spacing-100)] font-semibold tabular-nums text-salt-content-primary [font-size:var(--salt-text-display-fontSize)] leading-none">
              {current.toFixed(2)}%
            </p>
            <p className="mt-[var(--salt-spacing-50)] text-[0.68rem] text-salt-content-tertiary">
              Current yield · {current >= first ? "+" : ""}
              {(current - first).toFixed(2)}pp since Q1 2024
            </p>
            <dl className="mt-[var(--salt-spacing-100)] border-t border-salt-container-border pt-[var(--salt-spacing-100)] text-[0.68rem]">
              <div className="flex justify-between gap-[var(--salt-spacing-100)]">
                <dt className="text-salt-content-tertiary">Risk metric</dt>
                <dd className="text-right text-salt-content-secondary">{meta.metric}</dd>
              </div>
              <div className="mt-[var(--salt-spacing-50)] flex justify-between gap-[var(--salt-spacing-100)]">
                <dt className="text-salt-content-tertiary">Salt token</dt>
                <dd className="font-salt-mono text-salt-content-secondary">
                  {s.saltCategoricalToken}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

function screenReaderTree(spec: SaltUiSpec, active: number): string {
  const lines = [
    'region "Salt Interactive Data Vis Canvas"',
    `  heading level 2 "3-Year Yield Comparison 2024 – 2026"`,
    `  img "3-year yield comparison, ${spec.assetClasses.length} series" (focusable, arrow-key navigable)`,
    `    status live=polite "${YIELD_PERIODS[active]} yield readout"`,
    '  list "Salt legend"',
  ];
  for (const a of spec.assetClasses) {
    const current = a.yieldData[a.yieldData.length - 1] ?? 0;
    lines.push(
      `    listitem label="${a.name} yield ${current.toFixed(2)} percent, rendered with Salt categorical token ${a.saltCategoricalToken.replace("--salt-palette-categorical-", "")}"`,
    );
  }
  lines.push('  group "Salt asset data summary cards"');
  for (const a of spec.assetClasses) {
    const current = a.yieldData[a.yieldData.length - 1] ?? 0;
    lines.push(
      `    article (tabbable) label="${a.name} yield ${current.toFixed(1)} percent, rendered with Salt categorical token ${a.saltCategoricalToken.replace("--salt-palette-categorical-", "")}"`,
      `      badge "${(ASSET_RISK[a.name]?.risk ?? "Moderate")} risk"`,
    );
  }
  lines.push(
    `  status "compiled density=${spec.density} theme=${spec.theme} wcagTarget=${spec.wcagTarget}"`,
  );
  return lines.join("\n");
}

export function YieldCanvas() {
  const { canvasSpec, canvasPrompt, density, setDensity, mode, theme } = useSalt();
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showTree, setShowTree] = useState(false);

  const series = canvasSpec?.assetClasses ?? [];

  useEffect(() => {
    setActive(Math.max(0, Math.min(...series.map((s) => s.yieldData.length), 12) - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSpec]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  async function copyPayload() {
    if (!canvasSpec) return;
    const payload = JSON.stringify(
      { ...canvasSpec, mode, activePeriod: YIELD_PERIODS[active] },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!canvasSpec) {
    return (
      <Panel
        eyebrow="Salt Interactive Data Vis Canvas"
        title="Awaiting a validated Salt spec"
        action={<Pill tone="info">idle</Pill>}
      >
        <p className="text-[0.72rem] text-salt-content-secondary">
          Enter an advisor request or pick a quick preset in the AI Generation Engine. Once the spec
          passes Salt AST validation it compiles here as a 3-year yield comparison chart with
          token-governed series, legend and summary cards.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      eyebrow="Salt Interactive Data Vis Canvas"
      title="3-Year Yield Comparison · 2024 – 2026"
      action={
        <Pill tone="positive">
          {canvasSpec.assetClasses.length} series · WCAG {canvasSpec.wcagTarget}
        </Pill>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-[var(--salt-spacing-200)]">
        <SegmentedControl
          label="Toggle density"
          value={density}
          onChange={setDensity}
          className="min-w-56"
          options={[
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
        <div className="flex flex-wrap gap-[var(--salt-spacing-100)]">
          <button
            type="button"
            onClick={copyPayload}
            aria-live="polite"
            className="inline-flex min-h-[var(--salt-size-control)] items-center gap-[var(--salt-spacing-50)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary px-[var(--salt-spacing-150)] font-semibold text-salt-content-primary hover:border-salt-actionable focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
          >
            {copied ? (
              <ClipboardCheck aria-hidden="true" className="size-3.5 text-salt-positive" />
            ) : (
              <Copy aria-hidden="true" className="size-3.5" />
            )}
            {copied ? "Payload copied" : "Copy Validated Salt Token Payload"}
          </button>
          <button
            type="button"
            aria-expanded={showTree}
            aria-controls="salt-sr-tree"
            onClick={() => setShowTree((v) => !v)}
            className="inline-flex min-h-[var(--salt-size-control)] items-center gap-[var(--salt-spacing-50)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary px-[var(--salt-spacing-150)] font-semibold text-salt-content-primary hover:border-salt-actionable focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
          >
            <Ear aria-hidden="true" className="size-3.5" />
            Simulate Screen Reader Tree
          </button>
          <span className="inline-flex items-center gap-[var(--salt-spacing-50)] text-[0.66rem] text-salt-content-tertiary">
            <LayoutGrid aria-hidden="true" className="size-3.5" />
            {theme === "jpm" ? "JPM Brand" : "Chase"} · {mode}
          </span>
        </div>
      </div>

      {canvasPrompt ? (
        <p className="font-salt-mono text-[0.66rem] text-salt-content-tertiary">
          compiled from: “{canvasPrompt}”
        </p>
      ) : null}

      <YieldChart series={series} active={active} onActive={setActive} />
      <Legend series={series} />
      <SummaryCards series={series} />

      {showTree && (
        <pre
          id="salt-sr-tree"
          className="max-h-72 overflow-auto whitespace-pre rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-tertiary p-[var(--salt-spacing-100)] font-salt-mono text-[0.62rem] leading-[1.6] text-salt-content-secondary"
        >
          {screenReaderTree(canvasSpec, active)}
        </pre>
      )}
    </Panel>
  );
}
