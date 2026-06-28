import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  GitCompareArrows,
  Shield,
  ClipboardCheck,
  Grid3x3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/frameworks", label: "Frameworks", icon: BookOpen },
  { href: "/crosswalk", label: "Crosswalk", icon: GitCompareArrows },
  { href: "/matrix", label: "Risk & Control Matrix", icon: Grid3x3 },
  { href: "/controls", label: "Controls", icon: Shield },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
];

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Enterprise
        </div>
        <div className="mt-1 text-lg font-bold tracking-tight">AI Governance</div>
        <div className="text-xs text-slate-500">Crosswalk & Assessment</div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4 text-xs text-slate-500">
        NIST · ISO 42001 · EU AI Act · OECD · COSO
      </div>
    </aside>
  );
}
