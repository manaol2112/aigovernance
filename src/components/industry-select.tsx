"use client";

import {
  CLIENT_INDUSTRY_OPTIONS,
  CLIENT_INDUSTRY_OTHER,
} from "@/lib/client-industries";

type Props = {
  selection: string;
  customValue: string;
  onSelectionChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  className?: string;
  id?: string;
};

const selectClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export function IndustrySelect({
  selection,
  customValue,
  onSelectionChange,
  onCustomChange,
  className,
  id = "client-industry",
}: Props) {
  const showCustom = selection === CLIENT_INDUSTRY_OTHER;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        Industry
      </label>
      <select
        id={id}
        className={selectClass}
        value={selection}
        onChange={(e) => onSelectionChange(e.target.value)}
      >
        <option value="">Select industry (optional)</option>
        {CLIENT_INDUSTRY_OPTIONS.map((industry) => (
          <option key={industry} value={industry}>
            {industry}
          </option>
        ))}
        <option value={CLIENT_INDUSTRY_OTHER}>Other (specify)</option>
      </select>

      {showCustom && (
        <div className="mt-2">
          <label htmlFor={`${id}-custom`} className="sr-only">
            Custom industry
          </label>
          <input
            id={`${id}-custom`}
            type="text"
            autoFocus
            className={selectClass.replace("mt-1 ", "")}
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="Enter industry"
          />
        </div>
      )}
    </div>
  );
}
