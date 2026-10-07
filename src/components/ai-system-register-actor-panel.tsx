"use client";

import { useEffect, useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  loadRegisterActor,
  registerFetch,
  saveRegisterActor,
  type RegisterActor,
} from "@/lib/ai-system-register-actor-client";
import { cn, titleCase } from "@/lib/utils";

type Member = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

type Props = {
  organizationId: string | null;
};

export function AiSystemRegisterActorPanel({ organizationId }: Props) {
  const [actor, setActor] = useState<RegisterActor | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [accessRole, setAccessRole] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState(false);
  const [memberForm, setMemberForm] = useState({
    displayName: "",
    email: "",
    role: "contributor",
  });
  const [savingMember, setSavingMember] = useState(false);

  useEffect(() => {
    const stored = loadRegisterActor();
    setActor(stored);
    if (stored) {
      setName(stored.displayName);
      setEmail(stored.email);
      setOpen(false);
    } else {
      setOpen(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!organizationId || !actor) {
      setMembers([]);
      setAccessRole(null);
      return;
    }
    void (async () => {
      const res = await registerFetch(`/api/organizations/${organizationId}/members`);
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members ?? []);
      setAccessRole(data.access?.role ?? null);
      setBootstrap(Boolean(data.access?.bootstrap));
    })();
  }, [organizationId, actor]);

  function persistActor() {
    if (!name.trim() || !email.trim()) {
      toast("Enter your name and work email.", { variant: "error" });
      return;
    }
    const next = { displayName: name.trim(), email: email.trim() };
    saveRegisterActor(next);
    setActor(next);
    setOpen(false);
    toast("Identity saved.", { variant: "success" });
  }

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!organizationId) return;
    setSavingMember(true);
    try {
      const res = await registerFetch(`/api/organizations/${organizationId}/members`, {
        method: "POST",
        body: JSON.stringify(memberForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add member");
      setMembers((current) => {
        const without = current.filter((m) => m.email !== data.email);
        return [...without, data].sort((a, b) => a.displayName.localeCompare(b.displayName));
      });
      setMemberForm({ displayName: "", email: "", role: "contributor" });
      setBootstrap(false);
      toast("Member saved.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to add member.", {
        variant: "error",
      });
    } finally {
      setSavingMember(false);
    }
  }

  async function removeMember(memberEmail: string) {
    if (!organizationId) return;
    const res = await registerFetch(`/api/organizations/${organizationId}/members`, {
      method: "DELETE",
      body: JSON.stringify({ email: memberEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error ?? "Failed to remove member.", { variant: "error" });
      return;
    }
    setMembers((current) => current.filter((m) => m.email !== memberEmail));
    toast("Member removed.", { variant: "success" });
  }

  if (!ready) return null;

  const expanded = open || !actor;

  return (
    <section
      className={cn(
        "rounded-[28px] border border-slate-200 bg-white shadow-sm",
        expanded ? "p-6" : "px-4 py-2.5"
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={expanded}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
          <UserRound className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          {actor ? (
            <>
              <p className="truncate text-sm font-medium text-slate-900">
                {actor.displayName}
                <span className="font-normal text-slate-500"> · {actor.email}</span>
              </p>
              {accessRole ? (
                <p className="text-[11px] text-slate-500">
                  {titleCase(accessRole.replace(/_/g, " "))}
                  {bootstrap ? " · bootstrap" : ""}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">Tap to manage identity / members</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900">Set your acting identity</p>
              <p className="text-[11px] text-slate-500">
                Required once for edits, assessments, and risk acceptance
              </p>
            </>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition",
            expanded ? "rotate-180" : ""
          )}
        />
      </button>

      {expanded ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              placeholder="Work email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="button" className="rounded-xl" onClick={persistActor}>
              Save
            </Button>
          </div>

          {organizationId && actor && (accessRole === "admin" || bootstrap) ? (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-slate-900">Organization members</p>
              <p className="mt-1 text-xs text-slate-500">
                Roles: viewer, contributor, risk owner, admin.
              </p>
              <ul className="mt-3 space-y-2">
                {members.length === 0 ? (
                  <li className="text-xs text-slate-500">
                    No members yet. Adding the first member locks access to the roster.
                  </li>
                ) : (
                  members.map((member) => (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium text-slate-900">{member.displayName}</span>
                        <span className="text-slate-500"> · {member.email}</span>
                        <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {member.role.replace(/_/g, " ")}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-lg text-slate-500"
                        onClick={() => void removeMember(member.email)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))
                )}
              </ul>
              <form onSubmit={addMember} className="mt-3 grid gap-2 sm:grid-cols-4">
                <input
                  required
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  placeholder="Name"
                  value={memberForm.displayName}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
                <input
                  required
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  placeholder="Email"
                  value={memberForm.email}
                  onChange={(event) =>
                    setMemberForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <select
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  value={memberForm.role}
                  onChange={(event) =>
                    setMemberForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  <option value="viewer">Viewer</option>
                  <option value="contributor">Contributor</option>
                  <option value="risk_owner">Risk owner</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="submit" disabled={savingMember} className="rounded-xl">
                  {savingMember ? "Saving…" : "Add member"}
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
