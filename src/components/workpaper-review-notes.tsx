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
    <div className="rounded-lg border border-[#E3E3E3] bg-white">
      <div className="border-b border-[#E3E3E3] px-3 py-1.5">
        <p className="text-[11px] font-semibold text-black">Review notes</p>
      </div>

      <div className="border-b border-[#E3E3E3] px-2.5 py-1.5">
        <div className="flex flex-wrap gap-0.5">
          {WORKPAPER_FIELDS.map((field) => {
            const openCount = countOpenThreads(threads, field);
            return (
              <button
                key={field}
                type="button"
                onClick={() => onSelectField(field)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                  activeField === field
                    ? "bg-black text-white"
                    : "text-[#53565A] hover:bg-[#F5F5F5] hover:text-black"
                )}
              >
                {getWorkpaperFieldLabel(field)}
                {openCount > 0 ? ` · ${openCount}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 p-2.5">
        <div className="rounded-md border border-[#E3E3E3] bg-[#FAFAFA] p-2">
          <div className="flex items-center gap-1.5">
            <MessageSquarePlus className="h-3.5 w-3.5 text-[#53565A]" />
            <p className="text-[10px] font-semibold text-[#767676]">
              New · {getWorkpaperFieldLabel(activeField)}
            </p>
          </div>
          <div className="mt-1.5 space-y-1.5">
            <input
              className="w-full rounded-md border border-[#E3E3E3] bg-white px-2 py-1 text-xs"
              placeholder="Title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-[#E3E3E3] bg-white px-2 py-1 text-xs"
              placeholder="Assign to (optional)"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
            />
            <textarea
              className="min-h-[64px] w-full rounded-md border border-[#E3E3E3] bg-white px-2 py-1 text-xs"
              placeholder={
                reviewerName.trim()
                  ? "Describe the issue…"
                  : "Enter reviewer name to add notes"
              }
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => void handleCreateThread()}
              disabled={!reviewerName.trim() || !newNote.trim()}
            >
              <Send className="h-3 w-3" />
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {threadsForField.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#E3E3E3] px-3 py-4 text-center text-[11px] text-[#767676]">
              No notes for this field.
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
                <div key={thread.id} className="rounded-md border border-[#E3E3E3] bg-white p-2">
                  <div className="flex flex-wrap items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-black">
                        {thread.title?.trim() || getWorkpaperFieldLabel(thread.fieldKey)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#767676]">
                        {thread.createdBy} · {new Date(thread.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                        open ? "bg-amber-100 text-amber-900" : "bg-[#EEF7E0] text-[#046A38]"
                      )}
                    >
                      {thread.status}
                    </span>
                  </div>

                  {thread.assignee && (
                    <p className="mt-1 text-[10px] text-[#53565A]">
                      Assigned to <span className="font-semibold">{thread.assignee}</span>
                    </p>
                  )}

                  {linkedQuote && (
                    <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-900">
                        Linked text
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#53565A]">{linkedQuote}</p>
                    </div>
                  )}

                  <div className="mt-1.5 space-y-1.5">
                    {thread.messages.map((message) => (
                      <div key={message.id} className="rounded-md border border-[#E3E3E3] bg-[#FAFAFA] px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold text-[#53565A]">{message.author}</p>
                          <p className="text-[9px] text-[#A7A8AA]">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-snug text-[#53565A]">
                          {message.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex gap-1.5">
                      <input
                        className="min-w-0 flex-1 rounded-md border border-[#E3E3E3] px-2 py-1 text-xs"
                        placeholder="Assignee"
                        value={assigneeValue}
                        onChange={(e) =>
                          setAssigneeByThread((prev) => ({ ...prev, [thread.id]: e.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={!reviewerName.trim() || !assigneeValue.trim() || busy}
                        onClick={() =>
                          void onAssignThread({
                            threadId: thread.id,
                            assignee: assigneeValue,
                            createdBy: reviewerName,
                          })
                        }
                      >
                        <UserCheck className="h-3 w-3" />
                      </Button>
                    </div>

                    <textarea
                      className="min-h-[52px] w-full rounded-md border border-[#E3E3E3] px-2 py-1 text-xs"
                      placeholder="Reply"
                      value={replyValue}
                      onChange={(e) =>
                        setReplyByThread((prev) => ({ ...prev, [thread.id]: e.target.value }))
                      }
                    />

                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        disabled={!reviewerName.trim() || !replyValue.trim() || busy}
                        onClick={() =>
                          void onReplyToThread({
                            threadId: thread.id,
                            body: replyValue,
                            createdBy: reviewerName,
                          })
                        }
                      >
                        <Send className="h-3 w-3" />
                        Reply
                      </Button>
                      {open ? (
                        <>
                          <input
                            className="min-w-[120px] flex-1 rounded-md border border-[#E3E3E3] px-2 py-1 text-xs"
                            placeholder="Resolution (optional)"
                            value={resolutionValue}
                            onChange={(e) =>
                              setResolutionByThread((prev) => ({ ...prev, [thread.id]: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            disabled={!reviewerName.trim() || busy}
                            onClick={() =>
                              void onResolveThread({
                                threadId: thread.id,
                                resolvedBy: reviewerName,
                                resolutionNote: resolutionValue || undefined,
                              })
                            }
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Resolve
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          disabled={!reviewerName.trim() || busy}
                          onClick={() =>
                            void onReopenThread({
                              threadId: thread.id,
                              createdBy: reviewerName,
                              resolutionNote: resolutionValue || undefined,
                            })
                          }
                        >
                          <RotateCcw className="h-3 w-3" />
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
