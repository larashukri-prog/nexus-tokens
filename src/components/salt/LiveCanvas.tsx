import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Panel, Pill } from "./SaltControls";
import { useSalt } from "./SaltProvider";
import { YieldCanvas } from "./YieldCanvas";
import {
  ASSET_CLASSES,
  HOLDINGS,
  KPIS,
  PERFORMANCE_SERIES,
  formatCurrency,
} from "@/lib/portfolio-data";

function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={
        positive
          ? "inline-flex items-center gap-[2px] font-semibold text-salt-positive"
          : "inline-flex items-center gap-[2px] font-semibold text-salt-negative"
      }
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {positive ? "+" : ""}
      {value.toFixed(2)}
      {suffix}
    </span>
  );
}

function KpiRow() {
  return (
    <div className="grid grid-cols-2 gap-[var(--salt-spacing-200)] xl:grid-cols-4">
      {KPIS.map((k) => (
        <div key={k.label} className="salt-card p-[var(--salt-spacing-200)]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-salt-content-tertiary">
            {k.label}
          </p>
          <p className="mt-[var(--salt-spacing-50)] font-semibold tabular-nums text-salt-content-primary [font-size:var(--salt-text-display-fontSize)] leading-none">
            {k.value}
          </p>
          <p className="mt-[var(--salt-spacing-50)] flex items-center gap-[var(--salt-spacing-50)]">
            <Delta value={k.delta} />
            <span className="text-[0.68rem] text-salt-content-tertiary">{k.meta}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function AllocationDonut() {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Panel
      eyebrow="Data Visualisation"
      title="Allocation by Asset Class"
      action={<Pill tone="info">Color-blind safe scale</Pill>}
    >
      <div className="flex flex-wrap items-center gap-[var(--salt-spacing-300)]">
        <svg viewBox="0 0 160 160" className="size-40 shrink-0" role="img" aria-label="Allocation">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            strokeWidth="24"
            stroke="var(--salt-container-tertiary-background)"
          />
          {ASSET_CLASSES.map((a) => {
            const length = (a.allocation / 100) * circumference;
            const dash = `${length} ${circumference - length}`;
            const el = (
              <circle
                key={a.id}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                strokeWidth="24"
                stroke={`var(${a.token})`}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                transform="rotate(-90 80 80)"
              />
            );
            offset += length;
            return el;
          })}
          <text
            x="80"
            y="76"
            textAnchor="middle"
            className="fill-salt-content-tertiary text-[9px] font-semibold uppercase tracking-widest"
          >
            AUM
          </text>
          <text
            x="80"
            y="92"
            textAnchor="middle"
            className="fill-salt-content-primary text-[16px] font-semibold"
          >
            $48.0M
          </text>
        </svg>

        <ul className="flex min-w-52 flex-1 flex-col gap-[var(--salt-spacing-50)]">
          {ASSET_CLASSES.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-[var(--salt-spacing-100)] border-b border-salt-container-border py-[var(--salt-spacing-50)] last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="size-3 shrink-0"
                style={{ backgroundColor: `var(${a.token})` }}
              />
              <span className="flex-1 truncate text-salt-content-secondary">{a.name}</span>
              <span className="font-semibold tabular-nums text-salt-content-primary">
                {a.allocation}%
              </span>
              <span className="w-16 text-right tabular-nums">
                <Delta value={a.ytd} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function PerformanceTrend() {
  const min = Math.min(...PERFORMANCE_SERIES);
  const max = Math.max(...PERFORMANCE_SERIES);
  const points = PERFORMANCE_SERIES.map((v, i) => {
    const x = (i / (PERFORMANCE_SERIES.length - 1)) * 300;
    const y = 90 - ((v - min) / (max - min)) * 78;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <Panel eyebrow="Trailing 16 Quarters" title="Portfolio Growth">
      <svg viewBox="0 0 300 100" className="h-28 w-full" role="img" aria-label="Growth trend">
        <polyline
          points={`0,100 ${points} 300,100`}
          fill="var(--salt-palette-categorical-1)"
          opacity="0.12"
          stroke="none"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--salt-palette-categorical-1)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex items-center justify-between text-[0.68rem] text-salt-content-tertiary">
        <span>Q1 FY22</span>
        <span>Indexed growth · net of fees</span>
        <span>Q4 FY25</span>
      </div>
    </Panel>
  );
}

function AssetCards() {
  return (
    <div className="grid gap-[var(--salt-spacing-200)] md:grid-cols-2 xl:grid-cols-3">
      {ASSET_CLASSES.map((a) => (
        <article key={a.id} className="salt-card p-[var(--salt-spacing-200)]">
          <div
            aria-hidden="true"
            className="mb-[var(--salt-spacing-100)] h-[3px] w-10"
            style={{ backgroundColor: `var(${a.token})` }}
          />
          <div className="flex items-start justify-between gap-[var(--salt-spacing-100)]">
            <h3 className="font-semibold text-salt-content-primary">{a.name}</h3>
            <Pill
              tone={
                a.risk === "Low" ? "positive" : a.risk === "Moderate" ? "warning" : "negative"
              }
            >
              {a.risk}
            </Pill>
          </div>
          <p className="mt-[var(--salt-spacing-100)] font-semibold tabular-nums text-salt-content-primary [font-size:var(--salt-text-h1-fontSize)]">
            {formatCurrency(a.value)}
          </p>
          <dl className="mt-[var(--salt-spacing-100)] grid grid-cols-3 gap-[var(--salt-spacing-50)] border-t border-salt-container-border pt-[var(--salt-spacing-100)] text-[0.7rem]">
            <div>
              <dt className="text-salt-content-tertiary">Weight</dt>
              <dd className="font-semibold tabular-nums text-salt-content-primary">
                {a.allocation}%
              </dd>
            </div>
            <div>
              <dt className="text-salt-content-tertiary">YTD</dt>
              <dd className="tabular-nums">
                <Delta value={a.ytd} />
              </dd>
            </div>
            <div>
              <dt className="text-salt-content-tertiary">Yield</dt>
              <dd className="font-semibold tabular-nums text-salt-content-primary">
                {a.yield.toFixed(2)}%
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function HoldingsTable() {
  return (
    <Panel
      eyebrow="Density-aware Grid"
      title="Holdings Blotter"
      action={<Pill>row height = var(--salt-table-rowHeight)</Pill>}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left tabular-nums">
          <caption className="sr-only">Portfolio holdings by sleeve</caption>
          <thead>
            <tr className="bg-salt-container-tertiary">
              {["Instrument", "Sleeve", "Quantity", "Price", "Market Value", "Day"].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={
                    i > 1
                      ? "px-[var(--salt-spacing-100)] py-[var(--salt-spacing-50)] text-right text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-salt-content-secondary"
                      : "px-[var(--salt-spacing-100)] py-[var(--salt-spacing-50)] text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-salt-content-secondary"
                  }
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOLDINGS.map((h) => (
              <tr
                key={h.ticker}
                className="border-t border-salt-container-border [height:var(--salt-table-rowHeight)] hover:bg-salt-container-secondary"
              >
                <td className="px-[var(--salt-spacing-100)]">
                  <span className="font-semibold text-salt-content-primary">{h.ticker}</span>
                  <span className="block text-[0.68rem] text-salt-content-tertiary">{h.name}</span>
                </td>
                <td className="px-[var(--salt-spacing-100)]">
                  <span className="inline-flex items-center gap-[var(--salt-spacing-50)] text-salt-content-secondary">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0"
                      style={{ backgroundColor: `var(${h.sleeveToken})` }}
                    />
                    {h.sleeve}
                  </span>
                </td>
                <td className="px-[var(--salt-spacing-100)] text-right text-salt-content-secondary">
                  {h.qty.toLocaleString("en-US")}
                </td>
                <td className="px-[var(--salt-spacing-100)] text-right text-salt-content-secondary">
                  {h.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-[var(--salt-spacing-100)] text-right font-semibold text-salt-content-primary">
                  {formatCurrency(h.marketValue)}
                </td>
                <td className="px-[var(--salt-spacing-100)] text-right">
                  <Delta value={h.dayChange} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function LiveCanvas() {
  const { theme, mode, density, vision } = useSalt();

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-[var(--salt-spacing-200)] p-[var(--salt-spacing-200)] lg:h-screen lg:overflow-y-auto">
      <div className="flex flex-wrap items-end justify-between gap-[var(--salt-spacing-100)]">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-salt-content-tertiary">
            Wealth Advisor Live Canvas
          </p>
          <h2 className="font-semibold text-salt-content-primary [font-size:var(--salt-text-h1-fontSize)]">
            Thornbury Family Office · Discretionary Mandate
          </h2>
        </div>
        <div className="flex flex-wrap gap-[var(--salt-spacing-50)]">
          <Pill tone="info">{theme === "jpm" ? "JPM Brand" : "Chase"}</Pill>
          <Pill>{mode} mode</Pill>
          <Pill>{density} density</Pill>
          <Pill tone={vision === "standard" ? "neutral" : "warning"}>{vision}</Pill>
        </div>
      </div>

      <YieldCanvas />
      <KpiRow />
      <div className="grid gap-[var(--salt-spacing-200)] xl:grid-cols-[1.4fr_1fr]">
        <AllocationDonut />
        <PerformanceTrend />
      </div>
      <AssetCards />
      <HoldingsTable />
      <p className="text-[0.68rem] text-salt-content-tertiary">
        Every surface above resolves through Salt semantic variables — no raw hex, no legacy
        component overrides.
      </p>
    </main>
  );
}
