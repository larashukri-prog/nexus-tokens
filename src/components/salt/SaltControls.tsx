import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-[var(--salt-spacing-50)]", className)}>
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-salt-content-tertiary">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap rounded-[var(--salt-control-borderRadius)] border border-salt-container-border bg-salt-container-primary p-[2px]"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "min-h-[var(--salt-size-control)] flex-1 px-[var(--salt-spacing-150)] text-center font-semibold whitespace-nowrap transition-colors",
                "rounded-[var(--salt-control-borderRadius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-salt-info",
                active
                  ? "bg-salt-actionable text-salt-actionable-fg"
                  : "text-salt-content-secondary hover:bg-salt-container-tertiary",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "salt-card p-[var(--salt-spacing-200)] flex flex-col gap-[var(--salt-spacing-150)]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-[var(--salt-spacing-100)]">
        <div>
          {eyebrow ? (
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-salt-content-tertiary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-semibold text-salt-content-primary [font-size:var(--salt-text-h1-fontSize)] leading-tight">
            {title}
          </h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "info" | "warning";
}) {
  const toneClass = {
    neutral: "text-salt-content-secondary border-salt-container-border",
    positive: "text-salt-positive border-salt-positive",
    negative: "text-salt-negative border-salt-negative",
    info: "text-salt-info border-salt-info",
    warning: "text-salt-warning border-salt-warning",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[var(--salt-spacing-25)] border px-[var(--salt-spacing-100)] py-[2px]",
        "rounded-[var(--salt-control-borderRadius)] text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}
