"use client";

import { useEffect } from "react";
import {
  rememberClientOwnedSession,
  type ClientOwnedSessionKind,
} from "@/lib/client-owned-sessions";

/** Registers this session ID in the browser so the landing page can resume it privately. */
export function RememberClientOwnedSession({
  kind,
  id,
}: {
  kind: ClientOwnedSessionKind;
  id: string;
}) {
  useEffect(() => {
    rememberClientOwnedSession(kind, id);
  }, [kind, id]);

  return null;
}
