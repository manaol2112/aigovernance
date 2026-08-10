import type { MaturityDocumentStatus } from "@prisma/client";

export const MATURITY_DOCUMENT_STATUS_OPTIONS: {
  value: MaturityDocumentStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "documented",
    label: "In place",
    description: "Approved, maintained, and available as needed.",
  },
  {
    value: "draft",
    label: "Draft or informal",
    description: "Work in progress or informal practice — not yet formalized.",
  },
  {
    value: "not_established",
    label: "Not yet established",
    description: "We do not have this artifact today.",
  },
  {
    value: "not_applicable",
    label: "Not applicable",
    description: "Not required in our current scope or context.",
  },
];

export const MATURITY_DOCUMENT_STATUS_LABELS: Record<MaturityDocumentStatus, string> = {
  documented: "In place",
  draft: "Draft or informal",
  not_established: "Not yet established",
  not_applicable: "Not applicable",
};
