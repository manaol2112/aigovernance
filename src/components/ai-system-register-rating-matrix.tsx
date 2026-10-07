"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Table2 } from "lucide-react";
import {
  MATRIX_RATING_COLORS,
  activeRatingMatrixColumns,
  buildRatingMatrixRows,
  filterRowsWithRatings,
  type MatrixDisplayRating,
  type RatingMatrixCell,
  type RatingMatrixSystemInput,
} from "@/lib/ai-system-register-rating-matrix";
import { USE_CASE_TYPES } from "@/lib/use-case-types";
import { cn, titleCase } from "@/lib/utils";

function RatingOrb({
  rating,
  status,
  label,
  size = "md",
}: {
  rating: MatrixDisplayRating | null;
  status: RatingMatrixCell["status"];
  label: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (!rating) {
    return (
      <span
        className={cn(
          "mx-auto block rounded-full border border-dashed border-slate-300/90 bg-slate-50",
          dim
        )}
        title={`${label}: not rated`}
        aria-label={`${label}: not rated`}
      />
    );
  }

  const colors = MATRIX_RATING_COLORS[rating];
  const statusHint =
    status === "waived" ? " (waived)" : status === "stale" ? " (needs re-affirmation)" : "";

  return (
    <span
      className={cn(
        "relative mx-auto block rounded-full",
        dim,
        status === "stale" && "opacity-75"
      )}
      title={`${label}: ${colors.label}${statusHint}`}
      aria-label={`${label}: ${colors.label}${statusHint}`}
      style={{
        background: `
          radial-gradient(circle at 30% 26%, ${colors.highlight} 0%, transparent 48%),
          radial-gradient(circle at 72% 78%, rgba(15,23,42,0.12) 0%, transparent 52%),
          linear-gradient(155deg, ${colors.from}, ${colors.to})
        `,
        boxShadow: `
          inset 0 1px 1.5px rgba(255,255,255,0.65),
          inset 0 -1px 1.5px rgba(15,23,42,0.12),
          0 1px 2px rgba(15,23,42,0.12)
        `,
      }}
    >
      {status === "waived" ? (
        <span className="absolute inset-0 rounded-full ring-1 ring-slate-400/50 ring-offset-1 ring-offset-white" />
      ) : null}
      {status === "stale" ? (
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-300/90 ring-1 ring-white" />
      ) : null}
    </span>
  );
}

export function AiSystemRegisterRatingMatrix({
  systems,
}: {
  systems: RatingMatrixSystemInput[];
}) {
  const { rows, columns } = useMemo(() => {
    const allRows = buildRatingMatrixRows(systems);
    const withRatings = filterRowsWithRatings(allRows);
    return {
      rows: withRatings,
      columns: activeRatingMatrixColumns(withRatings),
    };
  }, [systems]);

  if (rows.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Table2 className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
          No completed assessment ratings yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Complete detailed assessments (or the formal risk rating) on a use case to see its
          portfolio heat map here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Assessment rating matrix
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length} use case{rows.length === 1 ? "" : "s"} with ratings · Overall is the
            residual tier; other columns are per-assessment ratings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          {(
            ["minimal", "limited", "high", "prohibited"] as MatrixDisplayRating[]
          ).map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <RatingOrb
                rating={key}
                status="completed"
                label={MATRIX_RATING_COLORS[key].label}
                size="sm"
              />
              {MATRIX_RATING_COLORS[key].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <RatingOrb rating={null} status="empty" label="Empty" size="sm" />
            Not rated
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[14rem] border-b border-r border-slate-100 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
                Use case
              </th>
              <th className="sticky left-[14rem] z-20 min-w-[6.5rem] border-b border-r border-slate-200 bg-slate-100/95 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 backdrop-blur">
                Overall
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  title={col.title}
                  className="border-b border-slate-100 bg-slate-50/80 px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"
                >
                  <span className="mx-auto block max-w-[4.5rem] leading-snug">{col.shortTitle}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const typeLabel =
                USE_CASE_TYPES.find((type) => type.value === row.useCaseType)?.label ??
                titleCase(row.useCaseType.replace(/_/g, " "));
              const cellByType = new Map(row.cells.map((cell) => [cell.assessmentType, cell]));
              const overallLabel = row.overall.rating
                ? MATRIX_RATING_COLORS[row.overall.rating].label
                : "—";

              return (
                <tr key={row.systemId} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-4 py-3 text-left font-normal group-hover:bg-slate-50/90"
                  >
                    <Link
                      href={`/ai-system-register/${row.systemId}`}
                      className="block min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                          {row.code}
                        </span>
                        <span className="truncate text-sm font-semibold text-slate-950 group-hover:text-indigo-700">
                          {row.name}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                        {typeLabel}
                      </span>
                    </Link>
                  </th>
                  <td className="sticky left-[14rem] z-10 border-b border-r border-slate-200 bg-slate-50/90 px-3 py-3 text-center group-hover:bg-slate-100/90">
                    <div className="flex flex-col items-center gap-1">
                      <RatingOrb
                        rating={row.overall.rating}
                        status={row.overall.status}
                        label="Overall"
                      />
                      <span className="text-[10px] font-medium text-slate-600">{overallLabel}</span>
                    </div>
                  </td>
                  {columns.map((col) => {
                    const cell = cellByType.get(col.id);
                    return (
                      <td
                        key={col.id}
                        className="border-b border-slate-100 px-2 py-3 text-center group-hover:bg-slate-50/60"
                      >
                        <RatingOrb
                          rating={cell?.rating ?? null}
                          status={cell?.status ?? "empty"}
                          label={col.shortTitle}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
