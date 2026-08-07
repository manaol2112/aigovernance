import { MaturityPortalShell } from "@/components/maturity-portal-shell";

export default function MaturityAssessmentLayout({ children }: { children: React.ReactNode }) {
  return <MaturityPortalShell>{children}</MaturityPortalShell>;
}
