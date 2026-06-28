import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";
import type { VerificationStatus } from "@prisma/client";

export function StatusBadge({ status }: { status: VerificationStatus | string }) {
  const variant =
    status === "verified"
      ? "success"
      : status === "peer_reviewed"
        ? "warning"
        : status === "deprecated"
          ? "danger"
          : "secondary";
  return <Badge variant={variant}>{titleCase(String(status))}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const variant =
    confidence === "high" ? "success" : confidence === "medium" ? "warning" : "secondary";
  return <Badge variant={variant}>{titleCase(confidence)}</Badge>;
}

export function MappingTypeBadge({ type }: { type: string }) {
  return <Badge variant="outline">{titleCase(type)}</Badge>;
}
