import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, Copy, Ear, LayoutGrid } from "lucide-react";
import { Panel, Pill, SegmentedControl } from "./SaltControls";
import { useSalt } from "./SaltProvider";
import {
  ASSET_RISK,
  LIQUIDITY_FLOOR_USD_M,
  RISK_TILES,
  periodsFor,
  type SaltUiSpec,
} from "@/lib/salt-ast-schema";

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 26, left: 34 };

type Series = SaltUiSpec["assetClasses"][number];

function niceBounds(values: number[], padUnits = 0.6) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.max(0, Math.floor((min - padUnits) * 2) / 2);
  const hi = Math.ceil((max + padUnits) * 2) / 2;
  return { lo, hi: hi === lo ? lo + 1 : hi };
}

function fmt(value: number, unit: Series["unit"]) {
  return unit === "usdMillions" ? `$${value.toFixed(1)}M` : `${value.toFixed(2)}%`;
}

/* ------------------------------ stress curves ----------------------------- */

function StressCurveChart({
  series,
  labels,
  active,
  onActive,
}: {
  series: Series[];
  labels: string[];
  active: number;
  onActive: (i: number) => void;
}) {
  const points = Math.max(...series.map((s) => s.yieldData.length), 2);
  const all = series.flatMap((s) => s.yieldData);
  const { lo, hi } = useMemo(() => niceBounds(all.length ? all : [0, 1]), [all.join(",")]);

  const x = (i: number) => PAD.left + (i / (points - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - ((v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

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

  const base = series[0];
  const shock = series[1];
  const baseAt = base?.yieldData[Math.min(active, base.yieldData.length - 1)] ?? 0;
  const shockAt = shock?.yieldData[Math.min(active, shock.yieldData.length - 1)] ?? baseAt;
  const compression = shockAt - baseAt;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none [height:auto] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
        role="img"
        tabIndex={0}
        aria-label={`Stress test curve: base portfolio yield versus 200 basis point rate shock scenario across ${labels[0]} to ${labels[labels.length - 1]}. Use left and right arrow keys to inspect each quarter.`}
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
        {Array.from({ length: 5 }, (_, i) => {
          const v = lo + ((hi - lo) * i) / 4;
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

        {series.map((s, si) => {
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
                strokeDasharray={si === 1 ? "6 4" : undefined}
              />
              {s.yieldData[Math.min(active, s.yieldData.length - 1)] !== undefined && (
                <circle
                  cx={x(active)}
                  cy={y(s.yieldData[Math.min(active, s.yieldData.length - 1)] as number)}
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

      <div
        role="status"
        aria-live="polite"
        className="mt-[var(--salt-spacing-100)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-tertiary p-[var(--salt-spacing-100)]"
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-salt-content-tertiary">
          {labels[active]} · stress readout
        </p>
        <ul className="mt-[var(--salt-spacing-50)] flex flex-wrap gap-x-[var(--salt-spacing-300)] gap-y-[var(--salt-spacing-50)]">
          <li className="flex items-center gap-[var(--salt-spacing-50)]">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0"
              style={{ backgroundColor: "var(--salt-palette-categorical-1)" }}
            />
            <span className="text-[0.7rem] text-salt-content-secondary">Base Portfolio Yield</span>
            <span className="text-[0.7rem] font-semibold tabular-nums text-salt-content-primary">
              {baseAt.toFixed(2)}%
            </span>
          </li>
          <li className="flex items-center gap-[var(--salt-spacing-50)]">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0"
              style={{ backgroundColor: "var(--salt-palette-categorical-2)" }}
            />
            <span className="text-[0.7rem] text-salt-content-secondary">
              200bps Rate Shock Scenario
            </span>
            <span className="text-[0.7rem] font-semibold tabular-nums text-salt-content-primary">
              {shockAt.toFixed(2)}%
            </span>
          </li>
          <li className="flex items-center gap-[var(--salt-spacing-50)]">
            <span className="text-[0.7rem] text-salt-content-secondary">Yield compression</span>
            <span className="text-[0.7rem] font-semibold tabular-nums text-salt-warning">
              {compression >= 0 ? "+" : ""}
              {compression.toFixed(2)}pp
            </span>
          </li>
          <li className="flex items-center gap-[var(--salt-spacing-50)]">
            <span className="text-[0.7rem] text-salt-content-secondary">Duration impact</span>
            <span className="text-[0.7rem] font-semibold tabular-nums text-salt-warning">
              {(compression * 4.2).toFixed(2)}% NAV
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* --------------------------- liquidity timeline --------------------------- */

function LiquidityTimelineChart({
  series,
  labels,
  active,
  onActive,
}: {
  series: Series[];
  labels: string[];
  active: number;
  onActive: (i: number) => void;
}) {
  const calls = series.find((s) => /capital call/i.test(s.name)) ?? series[0];
  const floorSeries = series.find((s) => /liquidity floor/i.test(s.name));
  const points = Math.max(calls?.yieldData.length ?? 2, 2);
  const all = [
    ...(calls?.yieldData ?? []),
    ...(floorSeries?.yieldData ?? []),
    LIQUIDITY_FLOOR_USD_M,
  ];
  const { hi } = useMemo(() => niceBounds(all.length ? all : [0, 1], 1), [all.join(",")]);

  const innerW = W - PAD.left - PAD.right;
  const step = innerW / points;
  const barW = Math.max(4, step * 0.56);
  const x = (i: number) => PAD.left + step * i + step / 2;
  const y = (v: number) => H - PAD.bottom - (v / hi) * (H - PAD.top - PAD.bottom);

  const svgRef = useRef<SVGSVGElement>(null);
  const pick = useCallback(
    (clientX: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rel = ((clientX - rect.left) / rect.width) * W;
      onActive(Math.min(points - 1, Math.max(0, Math.floor((rel - PAD.left) / step))));
    },
    [onActive, points, step],
  );

  const callAt = calls?.yieldData[Math.min(active, calls.yieldData.length - 1)] ?? 0;
  const floorAt = floorSeries?.yieldData[Math.min(active, floorSeries.yieldData.length - 1)] ?? 0;
  const headroom = floorAt - LIQUIDITY_FLOOR_USD_M;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none [height:auto] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
        role="img"
        tabIndex={0}
        aria-label={`Five year private equity capital call timeline against a 10 million dollar minimum Treasury liquidity threshold, ${labels[0]} to ${labels[labels.length - 1]}. Use left and right arrow keys to inspect each quarter.`}
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
        {Array.from({ length: 5 }, (_, i) => {
          const v = (hi * i) / 4;
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
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}

        {calls?.yieldData.map((v, i) => (
          <rect
            key={`${labels[i]}-bar`}
            x={x(i) - barW / 2}
            y={y(v)}
            width={barW}
            height={Math.max(1, H - PAD.bottom - y(v))}
            fill={`var(${calls.saltCategoricalToken})`}
            opacity={i === active ? 1 : 0.72}
          />
        ))}

        {floorSeries && (
          <polyline
            points={floorSeries.yieldData.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            fill="none"
            stroke={`var(${floorSeries.saltCategoricalToken})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}

        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(LIQUIDITY_FLOOR_USD_M)}
          y2={y(LIQUIDITY_FLOOR_USD_M)}
          stroke="var(--salt-status-warning-foreground)"
          strokeWidth="2"
          strokeDasharray="8 4"
        />
        <text
          x={W - PAD.right}
          y={y(LIQUIDITY_FLOOR_USD_M) - 5}
          textAnchor="end"
          className="fill-salt-warning text-[9px] font-semibold"
        >
          $10M IPS liquidity floor
        </text>

        {labels.map((l, i) =>
          i % 4 === 0 || i === points - 1 ? (
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

      <div
        role="status"
        aria-live="polite"
        className="mt-[var(--salt-spacing-100)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-tertiary p-[var(--salt-spacing-100)]"
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-salt-content-tertiary">
          {labels[active]} · liquidity readout
        </p>
        <ul className="mt-[var(--salt-spacing-50)] flex flex-wrap gap-x-[var(--salt-spacing-300)] gap-y-[var(--salt-spacing-50)]">
          <li className="flex items-center gap-[var(--salt-spacing-50)]">
            <span className="text-[0.7rem] text-salt-content-secondary">PE capital call</span>
            <span className="text-[0.7rem] font-semibold tabular-nums text-salt-content-primary">
              ${callAt.toFixed(1)}M
            </span>
          </li>
          <li className="flex items-center gap-[var(--salt-spacing-50)]">
            <span className="text-[0.7rem] text-salt-content-secondary">Treasury liquidity</span>
            <span className="text-[0.7rem] font-semibold tabular-nums text-salt-content-primary">
              ${floorAt.toFixed(1)}M
            </span>
          </li>
          <li className="flex items-center gap-[var(--salt-spacing-50)]">
            <span className="text-[0.7rem] text-salt-content-secondary">IPS headroom</span>
            <span
              className={
                headroom >= 0
                  ? "text-[0.7rem] font-semibold tabular-nums text-salt-positive"
                  : "text-[0.7rem] font-semibold tabular-nums text-salt-negative"
              }
            >
              {headroom >= 0 ? "+" : ""}
              {headroom.toFixed(1)}M
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ---------------------------- generic fallback ---------------------------- */

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-[var(--salt-spacing-100)]">
      {series.map((s) => {
        const current = s.yieldData[s.yieldData.length - 1] ?? 0;
        return (
          <li
            key={s.name}
            aria-label={`${s.name} latest value ${fmt(current, s.unit)}, rendered with Salt categorical token ${s.saltCategoricalToken.replace("--salt-palette-categorical-", "")}`}
            className="flex items-center gap-[var(--salt-spacing-100)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary px-[var(--salt-spacing-100)] py-[var(--salt-spacing-50)]"
          >
            <span
              aria-hidden="true"
              className="h-3 w-1 shrink-0"
              style={{ backgroundColor: `var(${s.saltCategoricalToken})` }}
            />
            <span className="text-[0.7rem] font-semibold text-salt-content-primary">{s.name}</span>
            <span className="text-[0.7rem] font-semibold tabular-nums text-salt-content-secondary">
              {fmt(current, s.unit)}
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

function RiskTiles() {
  return (
    <div className="grid gap-[var(--salt-spacing-200)] md:grid-cols-2 xl:grid-cols-3">
      {RISK_TILES.map((tile) => (
        <article
          key={tile.name}
          tabIndex={0}
          aria-label={tile.aria}
          className="salt-card p-[var(--salt-spacing-200)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info"
        >
          <div className="flex items-center gap-[var(--salt-spacing-100)]">
            <span
              aria-hidden="true"
              className="size-4 shrink-0"
              style={{ backgroundColor: `var(${tile.token})` }}
            />
            <h3 className="flex-1 font-semibold text-salt-content-primary">{tile.name}</h3>
            <Pill tone={tile.badge.tone}>{tile.badge.text}</Pill>
          </div>
          <p className="mt-[var(--salt-spacing-100)] font-semibold tabular-nums text-salt-content-primary [font-size:var(--salt-text-display-fontSize)] leading-none">
            {tile.headline}
          </p>
          <p className="mt-[var(--salt-spacing-50)] text-[0.68rem] text-salt-content-tertiary">
            {tile.headlineLabel}
          </p>
          <dl className="mt-[var(--salt-spacing-100)] border-t border-salt-container-border pt-[var(--salt-spacing-100)] text-[0.68rem]">
            {tile.rows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-[var(--salt-spacing-100)] py-[2px]"
              >
                <dt className="text-salt-content-tertiary">{row.label}</dt>
                <dd className="text-right font-semibold text-salt-content-secondary">
                  {row.value}
                </dd>
              </div>
            ))}
            <div className="mt-[var(--salt-spacing-50)] flex justify-between gap-[var(--salt-spacing-100)]">
              <dt className="text-salt-content-tertiary">Salt token</dt>
              <dd className="font-salt-mono text-salt-content-secondary">{tile.token}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function screenReaderTree(spec: SaltUiSpec, labels: string[], active: number): string {
  const lines = [
    'region "Private Wealth Client Live Meeting Canvas"',
    `  heading level 2 "${spec.chartType === "liquidityTimeline" ? "5-Year PE Capital Call Timeline" : "200bps Rate Shock Stress Test"} ${spec.timeframe ?? ""}"`,
    `  img "${spec.chartType}" (focusable, arrow-key navigable)`,
    `    status live=polite "${labels[active]} readout"`,
    '  list "Salt legend"',
  ];
  for (const a of spec.assetClasses) {
    const current = a.yieldData[a.yieldData.length - 1] ?? 0;
    lines.push(
      `    listitem label="${a.name} ${fmt(current, a.unit)}, Salt categorical token ${a.saltCategoricalToken.replace("--salt-palette-categorical-", "")}"`,
    );
  }
  lines.push('  group "Advisor risk tiles"');
  for (const tile of RISK_TILES) {
    lines.push(
      `    article (tabbable) label="${tile.aria}"`,
      `      badge "${tile.badge.text}"`,
    );
  }
  for (const rule of spec.complianceRules ?? []) {
    lines.push(`  note "IPS rule — ${rule}"`);
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
  const pointCount = series.length
    ? Math.max(...series.map((s) => s.yieldData.length), 2)
    : 2;
  const labels = useMemo(
    () => periodsFor(canvasSpec?.timeframe, pointCount),
    [canvasSpec?.timeframe, pointCount],
  );

  useEffect(() => {
    setActive(canvasSpec?.chartType === "liquidityTimeline" ? 0 : Math.max(0, pointCount - 1));
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
      { ...canvasSpec, mode, activePeriod: labels[active] },
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
          passes Salt AST validation it compiles here as a stress-test curve or capital-call
          liquidity timeline with token-governed series, legend and risk tiles.
        </p>
      </Panel>
    );
  }

  const isLiquidity = canvasSpec.chartType === "liquidityTimeline";

  return (
    <Panel
      eyebrow={isLiquidity ? "Liquidity Mandate Analysis" : "Market Shock Stress Analysis"}
      title={
        isLiquidity
          ? `PE Capital Calls vs $10M Treasury Liquidity Floor · ${canvasSpec.timeframe ?? "2024-2029"}`
          : `Base Portfolio Yield vs 200bps Rate Shock · ${canvasSpec.timeframe ?? "2024-2026"}`
      }
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

      {isLiquidity ? (
        <LiquidityTimelineChart
          series={series}
          labels={labels}
          active={active}
          onActive={setActive}
        />
      ) : (
        <StressCurveChart series={series} labels={labels} active={active} onActive={setActive} />
      )}

      <Legend series={series} />

      {canvasSpec.complianceRules?.length ? (
        <ul className="flex flex-col gap-[var(--salt-spacing-50)] rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-tertiary p-[var(--salt-spacing-100)]">
          {canvasSpec.complianceRules.map((rule) => (
            <li key={rule} className="text-[0.66rem] text-salt-content-secondary">
              <span className="font-semibold text-salt-warning">IPS rule</span> · {rule}
            </li>
          ))}
        </ul>
      ) : null}

      <RiskTiles />

      {showTree && (
        <pre
          id="salt-sr-tree"
          className="max-h-72 overflow-auto whitespace-pre rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-tertiary p-[var(--salt-spacing-100)] font-salt-mono text-[0.62rem] leading-[1.6] text-salt-content-secondary"
        >
          {screenReaderTree(canvasSpec, labels, active)}
        </pre>
      )}
    </Panel>
  );
}
