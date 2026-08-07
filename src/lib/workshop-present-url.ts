import { ALL_DEPARTMENTS } from "@/lib/workshop-department";

export type WorkshopPresentParams = {
  mode?: "pillar" | "department";
  pillarId?: string | null;
  facilitatorDepartment?: string | null;
  /** Data scope filter (organization-wide when omitted). */
  department?: string | null;
  subPillarId?: string | null;
};

export function buildWorkshopPresentUrl(
  assessmentId: string,
  params: WorkshopPresentParams = {}
): string {
  const q = new URLSearchParams();
  const mode = params.mode ?? "pillar";
  q.set("mode", mode);

  if (params.pillarId) q.set("pillarId", params.pillarId);
  if (params.facilitatorDepartment) q.set("facilitatorDepartment", params.facilitatorDepartment);
  if (params.department && params.department !== ALL_DEPARTMENTS) {
    q.set("department", params.department);
  }
  if (params.subPillarId) q.set("subPillarId", params.subPillarId);

  return `/assessments/${assessmentId}/workshop?${q.toString()}`;
}

export function openWorkshopPresenter(assessmentId: string, params: WorkshopPresentParams = {}) {
  const url = buildWorkshopPresentUrl(assessmentId, params);
  window.open(url, "_blank", "noopener,noreferrer,width=1280,height=900");
}
