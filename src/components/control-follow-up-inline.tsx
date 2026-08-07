"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ControlFollowUpEntry } from "@/lib/follow-up-questions-types";

export function ControlFollowUpInline({
  assessmentId,
  controlId,
  active,
  departmentQuery = "",
}: {
  assessmentId: string;
  controlId: string;
  /** Load only when the control is not assessed. */
  active: boolean;
  departmentQuery?: string;
}) {
  const [entry, setEntry] = useState<ControlFollowUpEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/assessments/${assessmentId}/follow-up-questions?controlId=${encodeURIComponent(controlId)}${departmentQuery ? departmentQuery.replace("?", "&") : ""}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load follow-up questions");
      setEntry(data.entry ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load follow-up questions");
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [active, assessmentId, controlId, departmentQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCustom() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/follow-up-questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_custom", controlId, question: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save question");
      if (data.entry) setEntry(data.entry);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  }

  async function removeCustom(questionId: string) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/follow-up-questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_custom", controlId, questionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove question");
      if (data.entry) setEntry(data.entry);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove question");
    } finally {
      setSaving(false);
    }
  }

  if (!active) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading follow-up questions…
      </div>
    );
  }

  if (!entry) return null;

  const recommended = entry.standardQuestions;
  const custom = entry.customQuestions;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Recommended follow-up
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        Use in a follow-up session, then upload responses and re-run analysis.
      </p>

      {recommended.length > 0 && (
        <ul className="mt-3 space-y-2">
          {recommended.map((q) => (
            <li key={q.id} className="flex gap-2 text-sm leading-relaxed text-slate-800">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              <span>{q.text}</span>
            </li>
          ))}
        </ul>
      )}

      {custom.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
          {custom.map((q) => (
            <li key={q.id} className="flex items-start gap-2 text-sm leading-relaxed text-slate-800">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
              <span className="min-w-0 flex-1">{q.text}</span>
              <button
                type="button"
                onClick={() => void removeCustom(q.id)}
                disabled={saving}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                aria-label="Remove custom question"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/80 pt-3 sm:flex-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addCustom()}
          placeholder="Add a custom question…"
          disabled={saving}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving || !draft.trim()}
          onClick={() => void addCustom()}
          className="shrink-0 gap-1.5"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquarePlus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
