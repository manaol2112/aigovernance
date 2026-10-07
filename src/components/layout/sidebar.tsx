"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  type ComponentType,
  type FocusEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  Gauge,
  GitCompareArrows,
  Grid3x3,
  LayoutDashboard,
  Palette,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { isSidebarNavActive } from "@/lib/sidebar-nav";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "aigovernance-sidebar-expanded";

/** Signature green dot — restrained (no glow/ping); inspired by Deloitte mark. */
function DeloitteBrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dotSize = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  return (
    <span
      className={cn("inline-block shrink-0 rounded-full bg-[#86BC25]", dotSize)}
      aria-hidden
    />
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
    href: "/ai-system-register",
    label: "AI System Register",
    title: "Multi-org AI inventory, risk, and evidence",
    icon: Database,
  },
  {
    href: "/maturity-assessment",
    label: "Maturity Survey",
    title: "Rapid pillar & control self-assessment with roadmap",
    icon: Gauge,
  },
  {
    href: "/guided-workshop",
    label: "Guided Workshop",
    title: "Live client workshop with weighted scoring",
    icon: Users,
  },
  {
    href: "/admin",
    label: "Admin",
    title: "Question packs, defaults, and appearance",
    icon: Palette,
  },
];

type HoverTip = {
  label: string;
  title: string;
  top: number;
  left: number;
};

function SidebarNavItem({
  href,
  label,
  title,
  icon: Icon,
  active,
  expanded,
  onShowTip,
  onHideTip,
}: {
  href: string;
  label: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  expanded: boolean;
  onShowTip: (tip: HoverTip) => void;
  onHideTip: () => void;
}) {
  function revealTip(el: HTMLElement) {
    if (expanded) return;
    const rect = el.getBoundingClientRect();
    onShowTip({
      label,
      title,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  }

  function handleEnter(event: MouseEvent<HTMLAnchorElement>) {
    revealTip(event.currentTarget);
  }

  function handleFocus(event: FocusEvent<HTMLAnchorElement>) {
    revealTip(event.currentTarget);
  }

  return (
    <Link
      href={href}
      aria-label={label}
      onMouseEnter={handleEnter}
      onMouseLeave={onHideTip}
      onFocus={handleFocus}
      onBlur={onHideTip}
      className={cn(
        "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        expanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
        active
          ? "bg-white/12 text-white shadow-inner ring-1 ring-white/15"
          : "text-slate-400 hover:bg-white/10 hover:text-white hover:shadow-md hover:shadow-black/25 hover:ring-1 hover:ring-white/10",
        !expanded && "hover:scale-[1.02]"
      )}
      aria-current={active ? "page" : undefined}
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
    </Link>
  );
}

export function Sidebar({ pathname: pathnameProp }: { pathname?: string }) {
  const clientPathname = usePathname();
  const pathname = clientPathname || pathnameProp || "/";
  const [expanded, setExpanded] = useState(false);
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setExpanded(true);
  }, []);

  useEffect(() => {
    if (expanded) setHoverTip(null);
  }, [expanded]);

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
        // h-full + min-h-0 keep the rail inside the chrome shell so the last
        // nav items (Admin) stay reachable via the scrollable nav region.
        "relative z-40 flex h-full min-h-0 shrink-0 flex-col border-r border-theme text-[var(--theme-sidebar-fg)] transition-[width] duration-200 ease-in-out",
        "bg-[var(--theme-sidebar-bg)]",
        expanded ? "w-72" : "w-[4.25rem]"
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b border-slate-800 py-5 transition-colors",
          expanded ? "px-6" : "flex flex-col items-center px-2"
        )}
      >
        {expanded ? (
          <Link href="/" className="block min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[#86BC25]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Deloitte
            </p>
            <p className="mt-1.5 text-xl font-light tracking-tight text-white">
              AI Assurance Hub
              <span className="text-[#86BC25]" aria-hidden>
                .
              </span>
            </p>
            <p className="mt-1 text-xs text-neutral-400">Crosswalk &amp; Assessment</p>
          </Link>
        ) : (
          <Link
            href="/"
            className="group relative flex h-10 w-10 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/10 hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86BC25]"
            title="AI Assurance Hub"
            aria-label="AI Assurance Hub home"
          >
            <DeloitteBrandMark />
          </Link>
        )}
      </div>

      <nav
        className={cn(
          "min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-2",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {nav.map((item) => {
          const active = isSidebarNavActive(pathname, item.href);
          return (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              title={item.title}
              icon={item.icon}
              active={active}
              expanded={expanded}
              onShowTip={setHoverTip}
              onHideTip={() => setHoverTip(null)}
            />
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-slate-800 p-2">
        {expanded && (
          <p className="mb-1 px-2 text-[10px] leading-relaxed text-slate-400">
            NIST · ISO 42001 · EU AI Act · OECD · COSO
          </p>
        )}
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex w-full items-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:shadow-md hover:shadow-black/25",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
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

      {mounted &&
        hoverTip &&
        !expanded &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[100] w-max max-w-[220px] -translate-y-1/2 rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-2 text-left shadow-xl shadow-black/40"
            style={{ top: hoverTip.top, left: hoverTip.left }}
          >
            <span className="block text-sm font-semibold text-white">{hoverTip.label}</span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-400">
              {hoverTip.title}
            </span>
            <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-slate-700/80 bg-slate-900" />
          </div>,
          document.body
        )}
    </aside>
  );
}
