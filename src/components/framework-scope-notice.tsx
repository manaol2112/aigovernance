import { AlertCircle } from "lucide-react";
import { FRAMEWORK_SCOPE } from "@/lib/framework-scope";

export function FrameworkScopeNotice({
  codes,
  compact = false,
}: {
  codes?: string[];
  compact?: boolean;
}) {
  const entries = codes?.length
    ? codes.map((c) => ({ code: c, ...FRAMEWORK_SCOPE[c] })).filter((e) => e.scopeNote)
    : Object.entries(FRAMEWORK_SCOPE).map(([code, v]) => ({ code, ...v }));

  if (entries.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-amber-200/80 bg-amber-50/90 ${
        compact ? "p-3" : "p-4"
      }`}
      role="note"
      aria-label="Framework scope disclosure"
    >
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="space-y-2 text-sm text-amber-950">
          <p className="font-medium">Framework scope & text provenance</p>
          {!compact && (
            <p className="text-amber-900/90">
              Assessments use source-verified requirement rows from seeded manifests. Coverage
              counts below reflect ingested rows only, not entire published standards in all cases.
            </p>
          )}
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.code}>
                <span className="font-mono text-xs font-semibold">{e.code}</span>
                <span className="text-amber-800/80"> ({e.requirementCount} rows)</span>
                <p className="mt-0.5 text-amber-900/90">{e.scopeNote}</p>
                {e.textNote && (
                  <p className="mt-1 text-xs text-amber-800/90 italic">{e.textNote}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
