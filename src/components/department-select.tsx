"use client";

import type { WorkshopDepartmentOption } from "@/lib/workshop-departments-catalog";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: WorkshopDepartmentOption[];
  /** Shown when value is empty — e.g. org-wide / not assigned. */
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

export function DepartmentSelect({
  value,
  onChange,
  options,
  emptyLabel = "Not assigned (organization-wide)",
  className = "w-full rounded-lg border px-3 py-2 text-sm",
  disabled = false,
  id,
}: Props) {
  const grouped = {
    fromControls: options.filter((o) => o.fromScopedControls),
    framework: options.filter((o) => !o.fromScopedControls),
  };

  return (
    <select
      id={id}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {grouped.fromControls.length > 0 && (
        <optgroup label="In scope — control owners">
          {grouped.fromControls.map((dept) => (
            <option key={dept.id} value={dept.label} title={dept.description}>
              {dept.label}
            </option>
          ))}
        </optgroup>
      )}
      {grouped.framework.length > 0 && (
        <optgroup
          label={
            grouped.fromControls.length > 0
              ? "Framework workshop stakeholders"
              : "Suggested workshop departments"
          }
        >
          {grouped.framework.map((dept) => (
            <option key={dept.id} value={dept.label} title={dept.description}>
              {dept.label}
            </option>
          ))}
        </optgroup>
      )}
      {value && !options.some((o) => o.label === value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  );
}
