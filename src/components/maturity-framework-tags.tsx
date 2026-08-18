import { Badge } from "@/components/ui/badge";
import { sortFrameworkCodes } from "@/lib/framework-library";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import { cn } from "@/lib/utils";

const SHORT_BY_CODE = Object.fromEntries(
  FRAMEWORK_COLUMNS.map((fw) => [fw.code, fw.short])
) as Record<string, string>;

const COLOR_BY_CODE = Object.fromEntries(
  FRAMEWORK_COLUMNS.map((fw) => [fw.code, fw.color])
) as Record<string, string>;

export function MaturityFrameworkTags({
  frameworkCodes,
  className,
  max = 4,
  tone = "light",
}: {
  frameworkCodes: string[];
  className?: string;
  max?: number;
  /** `dark` — high-contrast pills for slate-950 hero sections. */
  tone?: "light" | "dark";
}) {
  if (frameworkCodes.length === 0) return null;

  const ordered = sortFrameworkCodes(frameworkCodes);
  const visible = ordered.slice(0, max);
  const overflow = ordered.length - visible.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((code) => (
        <Badge
          key={code}
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold leading-none",
            tone === "dark"
              ? "border-white/25 bg-white text-slate-900 shadow-sm shadow-black/20"
              : "border-slate-200 bg-white text-slate-800 shadow-sm"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              COLOR_BY_CODE[code] ?? "bg-slate-500"
            )}
            aria-hidden
          />
          {SHORT_BY_CODE[code] ?? code}
        </Badge>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "text-[11px] font-medium",
            tone === "dark" ? "text-slate-300" : "text-slate-500"
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
