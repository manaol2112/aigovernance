"use client";

import { useEffect, useState } from "react";
import {
  listClientOwnedSessionIds,
  rememberClientOwnedSession,
} from "@/lib/client-owned-sessions";
import type { MaturitySurveyListItem } from "@/components/maturity-survey-list";
import type { GuidedWorkshopListItem } from "@/components/guided-workshop-list";
import { MaturitySurveyResumePanel } from "@/components/maturity-survey-resume-panel";
import { GuidedWorkshopOwnedSessions } from "@/components/guided-workshop-owned-sessions";

type MaturityOwnedSessionsProps = {
  kind: "maturity";
};

type WorkshopOwnedSessionsProps = {
  kind: "workshop";
};

export function ClientOwnedSessionsPanel(props: MaturityOwnedSessionsProps | WorkshopOwnedSessionsProps) {
  const [maturitySurveys, setMaturitySurveys] = useState<MaturitySurveyListItem[] | null>(null);
  const [workshops, setWorkshops] = useState<GuidedWorkshopListItem[] | null>(null);

  useEffect(() => {
    const ids = listClientOwnedSessionIds(props.kind);
    if (ids.length === 0) {
      if (props.kind === "maturity") setMaturitySurveys([]);
      else setWorkshops([]);
      return;
    }

    const controller = new AbortController();
    const endpoint =
      props.kind === "maturity"
        ? `/api/maturity-surveys/owned?ids=${encodeURIComponent(ids.join(","))}`
        : `/api/guided-workshops/owned?ids=${encodeURIComponent(ids.join(","))}`;

    fetch(endpoint, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load sessions");
        return res.json();
      })
      .then((data: MaturitySurveyListItem[] | GuidedWorkshopListItem[]) => {
        // Keep local registry in sync with rows that still exist.
        for (const row of data) {
          rememberClientOwnedSession(props.kind, row.id);
        }
        if (props.kind === "maturity") {
          setMaturitySurveys(data as MaturitySurveyListItem[]);
        } else {
          setWorkshops(data as GuidedWorkshopListItem[]);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        if (props.kind === "maturity") setMaturitySurveys([]);
        else setWorkshops([]);
      });

    return () => controller.abort();
  }, [props.kind]);

  if (props.kind === "maturity") {
    if (!maturitySurveys || maturitySurveys.length === 0) return null;
    return <MaturitySurveyResumePanel surveys={maturitySurveys} />;
  }

  if (!workshops || workshops.length === 0) return null;
  return <GuidedWorkshopOwnedSessions workshops={workshops} />;
}
