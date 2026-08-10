import { Badge } from "@/components/ui/badge";
import { FRAMEWORK_COLUMNS } from "@/lib/risk-pillars";
import { cn } from "@/lib/utils";

const SHORT_BY_CODE = Object.fromEntries(
  FRAMEWORK_COLUMNS.map((fw) => [fw.code, fw.short])
) as Record<string, string>;

export function MaturityFrameworkTags({
  frameworkCodes,
  className,
  max = 4,
}: {
  frameworkCodes: string[];
  className?: string;
  max?: number;
}) {
  if (frameworkCodes.length === 0) return null;

  const visible = frameworkCodes.slice(0, max);
  const overflow = frameworkCodes.length - visible.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((code) => (
        <Badge
          key={code}
          variant="outline"
          className="border-indigo-200/80 bg-indigo-50/60 px-1.5 py-0 text-[10px] font-medium text-indigo-700"
        >
          {SHORT_BY_CODE[code] ?? code}
        </Badge>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-slate-400">+{overflow}</span>
      )}
    </div>
  );
}
