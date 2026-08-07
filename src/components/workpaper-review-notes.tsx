"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  MessageSquarePlus,
  RotateCcw,
  Send,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  WorkpaperFieldKey,
  WorkpaperReviewNoteThread,
} from "@/lib/control-review-workpaper";
import { countOpenThreads, getWorkpaperFieldLabel, WORKPAPER_FIELDS } from "@/lib/control-review-workpaper";
import { cn } from "@/lib/utils";

type Props = {
  activeField: WorkpaperFieldKey;
  onSelectField: (field: WorkpaperFieldKey) => void;
  threads: WorkpaperReviewNoteThread[];
  onCreateThread: (input: {
    fieldKey: WorkpaperFieldKey;
    title?: string;
    body: string;
    createdBy: string;
    assignee?: string;
  }) => Promise<boolean>;
  onReplyToThread: (input: { threadId: string; body: string; createdBy: string }) => Promise<void>;
  onAssignThread: (input: { threadId: string; assignee: string; createdBy: string }) => Promise<void>;
  onResolveThread: (input: {
    threadId: string;
    resolvedBy: string;
    resolutionNote?: string;
  }) => Promise<void>;
  onReopenThread: (input: {
    threadId: string;
    createdBy: string;
    resolutionNote?: string;
  }) => Promise<void>;
  reviewerName: string;
  busyThreadId?: string | null;
};

export function WorkpaperReviewNotes({
  activeField,
  onSelectField,
  threads,
  onCreateThread,
  onReplyToThread,
  onAssignThread,
  onResolveThread,
  onReopenThread,
  reviewerName,
  busyThreadId,
}: Props) {
  const [newNote, setNewNote] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [replyByThread, setReplyByThread] = useState<Record<string, string>>({});
  const [resolutionByThread, setResolutionByThread] = useState<Record<string, string>>({});
  const [assigneeByThread, setAssigneeByThread] = useState<Record<string, string>>({});

  const threadsForField = useMemo(
    () => threads.filter((thread) => thread.fieldKey === activeField),
    [threads, activeField]
  );

  async function handleCreateThread() {
    if (!reviewerName.trim() || !newNote.trim()) return;
    const success = await onCreateThread({
      fieldKey: activeField,
      title: newTitle.trim() || undefined,
      body: newNote,
      createdBy: reviewerName,
      assignee: newAssignee.trim() || undefined,
    });
    if (success) {
      setNewNote("");
      setNewTitle("");
      setNewAssignee("");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Field review notes</p>
        <p className="mt-1 text-xs text-slate-500">
          Add threaded comments, assign owners, and resolve issues before sign-off.
        </p>
      </div>

      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {WORKPAPER_FIELDS.map((field) => {
            const openCount = countOpenThreads(threads, field);
            return (
              <button
                key={field}
                type="button"
                onClick={() => onSelectField(field)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                  activeField === field
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {getWorkpaperFieldLabel(field)}
                {openCount > 0 ? ` · ${openCount}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-indigo-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              New note for {getWorkpaperFieldLabel(activeField)}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Short title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Assign to (optional)"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
            />
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder={reviewerName.trim() ? "Describe the issue or requested change..." : "Enter reviewer name below to add notes"}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleCreateThread()}
              disabled={!reviewerName.trim() || !newNote.trim()}
            >
              <Send className="h-3.5 w-3.5" />
              Add note
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {threadsForField.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
              No review notes for this field.
            </div>
          ) : (
            threadsForField.map((thread) => {
              const replyValue = replyByThread[thread.id] ?? "";
              const resolutionValue = resolutionByThread[thread.id] ?? "";
              const assigneeValue = assigneeByThread[thread.id] ?? thread.assignee ?? "";
              const busy = busyThreadId === thread.id;
              const open = thread.status !== "resolved";
              const linkedQuote = thread.messages.find((message) => message.quotedText)?.quotedText;

              return (
                <div key={thread.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {thread.title?.trim() || getWorkpaperFieldLabel(thread.fieldKey)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Opened by {thread.createdBy} on {new Date(thread.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        open ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {thread.status}
                    </span>
                  </div>

                  {thread.assignee && (
                    <p className="mt-2 text-[11px] text-indigo-700">
                      Assigned to <span className="font-semibold">{thread.assignee}</span>
                    </p>
                  )}

                  {linkedQuote && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                        Linked text
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">{linkedQuote}</p>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    {thread.messages.map((message) => (
                      <div key={message.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-slate-700">{message.author}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                          {message.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Update assignee"
                        value={assigneeValue}
                        onChange={(e) =>
                          setAssigneeByThread((prev) => ({ ...prev, [thread.id]: e.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!reviewerName.trim() || !assigneeValue.trim() || busy}
                        onClick={() =>
                          void onAssignThread({
                            threadId: thread.id,
                            assignee: assigneeValue,
                            createdBy: reviewerName,
                          })
                        }
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Assign
                      </Button>
                    </div>

                    <textarea
                      className="min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Reply to thread"
                      value={replyValue}
                      onChange={(e) =>
                        setReplyByThread((prev) => ({ ...prev, [thread.id]: e.target.value }))
                      }
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!reviewerName.trim() || !replyValue.trim() || busy}
                        onClick={() =>
                          void onReplyToThread({
                            threadId: thread.id,
                            body: replyValue,
                            createdBy: reviewerName,
                          })
                        }
                      >
                        <Send className="h-3.5 w-3.5" />
                        Reply
                      </Button>
                      {open ? (
                        <>
                          <input
                            className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Resolution note (optional)"
                            value={resolutionValue}
                            onChange={(e) =>
                              setResolutionByThread((prev) => ({ ...prev, [thread.id]: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            disabled={!reviewerName.trim() || busy}
                            onClick={() =>
                              void onResolveThread({
                                threadId: thread.id,
                                resolvedBy: reviewerName,
                                resolutionNote: resolutionValue || undefined,
                              })
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Resolve
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!reviewerName.trim() || busy}
                          onClick={() =>
                            void onReopenThread({
                              threadId: thread.id,
                              createdBy: reviewerName,
                              resolutionNote: resolutionValue || undefined,
                            })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
