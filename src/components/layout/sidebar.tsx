"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  GitCompareArrows,
  Grid3x3,
  LayoutDashboard,
  Palette,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "aigovernance-sidebar-expanded";

function DeloitteBrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dotSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const ringSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <span className="relative flex items-center justify-center" aria-hidden>
      <span
        className={cn(
          "absolute rounded-full bg-[#86BC25] opacity-30 animate-ping",
          ringSize
        )}
        style={{ animationDuration: "1.5s" }}
      />
      <span
        className={cn(
          "relative rounded-full bg-[#86BC25] shadow-[0_0_12px_rgba(134,188,37,0.5)]",
          dotSize
        )}
      />
    </span>
  );
}

const nav = [
  {
    href: "/",
    label: "Dashboard",
    title: "Overview and program status",
    icon: LayoutDashboard,
  },
  {
    href: "/frameworks",
    label: "Frameworks",
    title: "Browse governance frameworks and requirements",
    icon: BookOpen,
  },
  {
    href: "/crosswalk",
    label: "Crosswalk",
    title: "Map requirements across frameworks",
    icon: GitCompareArrows,
  },
  {
    href: "/matrix",
    label: "Risk & Control Matrix",
    title: "Risk pillars linked to controls and coverage",
    icon: Grid3x3,
  },
  {
    href: "/risk-taxonomy",
    label: "Risk Taxonomy",
    title: "Canonical AI risk statements by pillar",
    icon: ShieldAlert,
  },
  {
    href: "/controls",
    label: "Controls",
    title: "Canonical control library and procedures",
    icon: Shield,
  },
  {
    href: "/assessments",
    label: "Assessments",
    title: "Workshop, evidence analysis, validation, and reports",
    icon: ClipboardCheck,
  },
  {
    href: "/maturity-assessment",
    label: "Maturity Survey",
    title: "Rapid pillar & control self-assessment with roadmap",
    icon: Gauge,
  },
  {
    href: "/admin",
    label: "Admin",
    title: "Appearance, branding, and color theme settings",
    icon: Palette,
  },
];

function SidebarNavItem({
  href,
  label,
  title,
  icon: Icon,
  active,
  expanded,
}: {
  href: string;
  label: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
        expanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
        active
          ? "bg-white/12 text-white shadow-inner ring-1 ring-white/15"
          : "text-slate-400 hover:bg-white/10 hover:text-white hover:shadow-md hover:shadow-black/25 hover:ring-1 hover:ring-white/10",
        !expanded && "hover:scale-[1.02]"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
          active ? "bg-white/10" : "bg-transparent group-hover:bg-white/10"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {expanded && (
        <span className="min-w-0 flex-1">
          <span className="block truncate">{label}</span>
          <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-500 group-hover:text-slate-400">
            {title}
          </span>
        </span>
      )}

      {!expanded && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 w-max max-w-[220px] -translate-y-1/2 rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-2 text-left opacity-0 shadow-xl shadow-black/40 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 -translate-x-1"
        >
          <span className="block text-sm font-semibold text-white">{label}</span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-400">{title}</span>
          <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-slate-700/80 bg-slate-900" />
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ pathname }: { pathname: string }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setExpanded(true);
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "relative z-40 flex shrink-0 flex-col overflow-visible border-r border-theme text-[var(--theme-sidebar-fg)] transition-[width] duration-200 ease-in-out",
        "bg-[var(--theme-sidebar-bg)]",
        expanded ? "w-72" : "w-[4.25rem]"
      )}
    >
      <div
        className={cn(
          "border-b border-slate-800 py-5 transition-colors",
          expanded ? "px-6" : "flex flex-col items-center px-2"
        )}
      >
        {expanded ? (
          <div className="flex items-start gap-3">
            <span className="mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <DeloitteBrandMark />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Enterprise</div>
              <div className="mt-1 text-lg font-bold tracking-tight">AI Governance</div>
              <div className="text-xs text-slate-500">Crosswalk & Assessment</div>
            </div>
          </div>
        ) : (
          <Link
            href="/"
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/10 hover:ring-white/20"
            title="AI Governance"
            aria-label="AI Governance home"
          >
            <DeloitteBrandMark />
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-visible p-2">
        {nav.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              title={item.title}
              icon={item.icon}
              active={active}
              expanded={expanded}
            />
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-2">
        {expanded && (
          <p className="mb-2 px-2 text-[10px] leading-relaxed text-slate-500">
            NIST · ISO 42001 · EU AI Act · OECD · COSO
          </p>
        )}
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex w-full items-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:shadow-md hover:shadow-black/25",
            expanded ? "gap-2 px-3 py-2 text-xs font-medium" : "justify-center p-2.5"
          )}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
