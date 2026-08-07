"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Send,
  Type,
  Underline as UnderlineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  noteCount?: number;
  statusText?: string;
  onOpenNotes?: () => void;
  reviewerName?: string;
  onCreateReviewNote?: (input: {
    title?: string;
    assignee?: string;
    body: string;
    quotedText?: string;
    highlightId?: string;
  }) => Promise<boolean>;
  onCitationClick?: (index: number) => void;
  className?: string;
};

type ToolbarAction = {
  id: string;
  label: string;
  icon: typeof Bold;
  run: (root: HTMLDivElement) => void;
};

let reviewHighlightSequence = 0;

function normalizeHtml(html: string) {
  return html
    .replace(/<div><br><\/div>/g, "")
    .replace(/<p><br><\/p>/g, "")
    .trim();
}

function renderCitationBubble(index: string) {
  return `<span contenteditable="false" data-citation-bubble="${index}" class="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700 shadow-sm">[${index}]</span>`;
}

function storageHtmlToEditorHtml(html: string) {
  return html.replace(/\[\{(\d+)\}\]/g, (_, index: string) => renderCitationBubble(index));
}

function editorHtmlToStorageHtml(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll<HTMLElement>("[data-citation-bubble]").forEach((node) => {
    const index = node.dataset.citationBubble;
    node.replaceWith(document.createTextNode(index ? ` [{${index}}]` : ""));
  });
  return root.innerHTML;
}

function nextReviewHighlightId() {
  reviewHighlightSequence += 1;
  return `hl-${reviewHighlightSequence.toString(36)}`;
}

export function LimitedRichTextEditor({
  label,
  value,
  onChange,
  onFocus,
  placeholder = "Add workpaper documentation...",
  noteCount = 0,
  statusText,
  onOpenNotes,
  reviewerName,
  onCreateReviewNote,
  onCitationClick,
  className,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteAssignee, setNoteAssignee] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [quotedText, setQuotedText] = useState("");
  const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const current = normalizeHtml(editorRef.current.innerHTML);
    const next = normalizeHtml(storageHtmlToEditorHtml(value));
    if (current !== next) {
      editorRef.current.innerHTML = next || "";
    }
  }, [value]);

  const toolbar = useMemo<ToolbarAction[]>(
    () => [
      {
        id: "bold",
        label: "Bold",
        icon: Bold,
        run: () => document.execCommand("bold"),
      },
      {
        id: "italic",
        label: "Italic",
        icon: Italic,
        run: () => document.execCommand("italic"),
      },
      {
        id: "underline",
        label: "Underline",
        icon: UnderlineIcon,
        run: () => document.execCommand("underline"),
      },
      {
        id: "heading",
        label: "Heading",
        icon: Type,
        run: () => document.execCommand("formatBlock", false, "h3"),
      },
      {
        id: "bullets",
        label: "Bullets",
        icon: List,
        run: () => document.execCommand("insertUnorderedList"),
      },
      {
        id: "numbers",
        label: "Numbered list",
        icon: ListOrdered,
        run: () => document.execCommand("insertOrderedList"),
      },
      {
        id: "link",
        label: "Insert link",
        icon: Link2,
        run: () => {
          const href = window.prompt("Enter URL");
          if (!href) return;
          document.execCommand("createLink", false, href);
        },
      },
    ],
    []
  );

  function emitChange() {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(normalizeHtml(editorHtmlToStorageHtml(html)));
  }

  function runAction(action: ToolbarAction) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    action.run(editorRef.current);
    emitChange();
  }

  function selectionInsideEditor() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !editorRef.current) {
      return null;
    }
    const range = selection.getRangeAt(0).cloneRange();
    const root = editorRef.current;
    const startNode = range.startContainer;
    const endNode = range.endContainer;
    if (!root.contains(startNode) || !root.contains(endNode)) return null;
    const text = selection.toString().trim();
    if (!text) return null;
    return { range, text };
  }

  function unwrapHighlight(highlightId: string) {
    if (!editorRef.current) return;
    editorRef.current
      .querySelectorAll<HTMLElement>(`mark[data-review-highlight="${highlightId}"]`)
      .forEach((node) => {
        const parent = node.parentNode;
        if (!parent) return;
        while (node.firstChild) {
          parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
      });
  }

  function wrapSelectionWithHighlight(range: Range, highlightId: string) {
    const mark = document.createElement("mark");
    mark.dataset.reviewHighlight = highlightId;
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
  }

  function resetComposer() {
    setNoteComposerOpen(false);
    setNoteTitle("");
    setNoteAssignee("");
    setNoteBody("");
    setQuotedText("");
    setPendingHighlightId(null);
  }

  function cancelComposer() {
    if (pendingHighlightId) {
      unwrapHighlight(pendingHighlightId);
      emitChange();
    }
    resetComposer();
  }

  function openNoteComposer() {
    onOpenNotes?.();
    if (!onCreateReviewNote) {
      return;
    }
    if (pendingHighlightId) {
      unwrapHighlight(pendingHighlightId);
      emitChange();
    }
    const selected = selectionInsideEditor();
    let nextHighlightId: string | null = null;
    if (selected) {
      nextHighlightId = nextReviewHighlightId();
      wrapSelectionWithHighlight(selected.range, nextHighlightId);
      emitChange();
    }
    setQuotedText(selected?.text ?? "");
    setPendingHighlightId(nextHighlightId);
    setNoteComposerOpen(true);
  }

  async function submitComposer() {
    if (!onCreateReviewNote || !noteBody.trim()) return;
    const success = await onCreateReviewNote({
      title: noteTitle.trim() || undefined,
      assignee: noteAssignee.trim() || undefined,
      body: noteBody,
      quotedText: quotedText || undefined,
      highlightId: pendingHighlightId ?? undefined,
    });
    if (success) {
      resetComposer();
    }
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const bubble = target.closest<HTMLElement>("[data-citation-bubble]");
    if (!bubble || !onCitationClick) return;
    const index = Number(bubble.dataset.citationBubble);
    if (!Number.isFinite(index)) return;
    event.preventDefault();
    onCitationClick(index);
  }

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          {statusText && <p className="mt-1 text-xs text-slate-500">{statusText}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {noteCount > 0 && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onOpenNotes}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800"
            >
              {noteCount} open note{noteCount === 1 ? "" : "s"}
            </button>
          )}
          {(onCreateReviewNote || onOpenNotes) && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={openNoteComposer}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600"
            >
              Add review note
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-2">
        {toolbar.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-slate-600"
              onClick={() => runAction(action)}
              title={action.label}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          );
        })}
      </div>

      {noteComposerOpen && (
        <div className="border-b border-slate-100 bg-amber-50/40 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
              New review note
            </p>
            {!reviewerName?.trim() && (
              <p className="text-[11px] text-amber-800">
                Enter reviewer name in sign-off to add notes.
              </p>
            )}
          </div>
          {quotedText && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-white/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                Highlighted text
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{quotedText}</p>
            </div>
          )}
          <div className="mt-3 space-y-2">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Short title (optional)"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Assign to (optional)"
              value={noteAssignee}
              onChange={(event) => setNoteAssignee(event.target.value)}
            />
            <textarea
              className="min-h-[92px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Describe the change required for this text."
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={!reviewerName?.trim() || !noteBody.trim()}
                onClick={() => void submitComposer()}
              >
                <Send className="h-3.5 w-3.5" />
                Save review note
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={cancelComposer}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onClick={handleEditorClick}
          onFocus={onFocus}
          data-placeholder={placeholder}
          className={cn(
            "min-h-[180px] rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none transition",
            "focus-within:border-indigo-300 focus-within:bg-white",
            "[&:empty:before]:pointer-events-none [&:empty:before]:text-slate-400 [&:empty:before]:content-[attr(data-placeholder)]",
            "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-900",
            "[&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1",
            "[&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1",
            "[&_a]:text-indigo-700 [&_a]:underline",
            "[&_mark[data-review-highlight]]:rounded-sm [&_mark[data-review-highlight]]:bg-amber-200/80 [&_mark[data-review-highlight]]:px-0.5 [&_mark[data-review-highlight]]:text-slate-900"
          )}
        />
      </div>
    </div>
  );
}
