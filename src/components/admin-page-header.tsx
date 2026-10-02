import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  /** Small uppercase label above the title */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Stats or secondary chrome under the lead copy */
  children?: ReactNode;
  /**
   * `default` — light admin list/detail pages.
   * `hero` — dark catalog hero (frameworks, controls, risk taxonomy).
   */
  variant?: "default" | "hero";
  className?: string;
};

/**
 * Canonical admin page header. Prefer this over one-off h1 blocks.
 * Immersive maturity/workshop portals keep MaturityPortalShell instead.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  variant = "default",
  className,
}: AdminPageHeaderProps) {
  const isHero = variant === "hero";

  return (
    <header
      className={cn(
        isHero
          ? "admin-hero-header brand-ink-surface overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/30 lg:px-8"
          : "space-y-3",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          !isHero && "sm:flex-row sm:items-start sm:justify-between"
        )}
      >
        <div className="min-w-0">
          {eyebrow && (
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.24em]",
                isHero ? "text-indigo-200" : "text-indigo-700"
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "font-bold tracking-tight",
              isHero ? "mt-2 text-3xl lg:text-4xl" : "text-3xl text-slate-900",
              eyebrow && !isHero && "mt-1"
            )}
          >
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "mt-2 max-w-3xl text-sm leading-relaxed",
                isHero ? "text-slate-200" : "text-slate-600"
              )}
            >
              {description}
            </p>
          )}
        </div>
        {!isHero && actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
      {isHero && actions && (
        <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export function AdminPageHeaderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2 text-slate-200">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
