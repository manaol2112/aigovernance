import type { AiRegisterOrgRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  parseRegisterActorFromHeaders,
  type RegisterActor,
} from "@/lib/ai-system-register-actor-shared";
import {
  roleHasPermission,
  type RegisterPermission,
} from "@/lib/ai-system-register-governance";

export type { RegisterActor };
export {
  REGISTER_ACTOR_EMAIL_HEADER,
  REGISTER_ACTOR_NAME_HEADER,
  REGISTER_ACTOR_STORAGE_KEY,
} from "@/lib/ai-system-register-actor-shared";

export type ResolvedRegisterAccess = {
  actor: RegisterActor;
  role: AiRegisterOrgRole | null;
  /** True when org has no members yet — first actor may bootstrap as admin. */
  bootstrap: boolean;
};

export function parseRegisterActor(req: Request): RegisterActor | null {
  return parseRegisterActorFromHeaders(req.headers);
}

export async function resolveRegisterAccess(
  organizationId: string,
  actor: RegisterActor | null
): Promise<ResolvedRegisterAccess | { error: string; status: number }> {
  if (!actor) {
    return {
      error:
        "Identify yourself to make changes. Set your name and work email in the register actor panel.",
      status: 401,
    };
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { email: true, role: true },
  });

  if (members.length === 0) {
    return { actor, role: "admin", bootstrap: true };
  }

  const member = members.find((row) => row.email === actor.email);
  if (!member) {
    return {
      error: "You are not a member of this organization.",
      status: 403,
    };
  }

  return { actor, role: member.role, bootstrap: false };
}

export function assertPermission(
  access: ResolvedRegisterAccess,
  permission: RegisterPermission
): string | null {
  if (access.bootstrap) return null;
  if (!roleHasPermission(access.role, permission)) {
    return `Your role (${access.role ?? "none"}) cannot perform this action.`;
  }
  return null;
}

export async function ensureBootstrapAdmin(
  organizationId: string,
  actor: RegisterActor
): Promise<void> {
  const count = await prisma.organizationMember.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.organizationMember.create({
    data: {
      organizationId,
      email: actor.email,
      displayName: actor.displayName,
      role: "admin",
    },
  });
}

export async function writeChangeLog(input: {
  systemId: string;
  organizationId: string;
  action: string;
  summary: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  actor?: RegisterActor | null;
}) {
  await prisma.aiSystemRegisterChangeLog.create({
    data: {
      systemId: input.systemId,
      organizationId: input.organizationId,
      action: input.action,
      summary: input.summary,
      field: input.field ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      actorName: input.actor?.displayName ?? null,
      actorEmail: input.actor?.email ?? null,
    },
  });
}
