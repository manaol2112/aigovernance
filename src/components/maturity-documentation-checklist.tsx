"use client";

import type { MaturityDocumentStatus } from "@prisma/client";
import { Check, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MATURITY_DOCUMENT_STATUS_OPTIONS } from "@/lib/maturity-document-constants";
import type { DocumentationChecklistGroup } from "@/lib/maturity-survey-documents";

export type DocumentResponseState = {
  documentId: string;
  pillarId: string;
  status: MaturityDocumentStatus;
};

type Props = {
  groups: DocumentationChecklistGroup[];
  responses: DocumentResponseState[];
  onStatusChange: (input: {
    documentId: string;
    pillarId: string;
    status: MaturityDocumentStatus;
  }) => Promise<void>;
  savingDocumentId: string | null;
};

export function MaturityDocumentationChecklist({
  groups,
  responses,
  onStatusChange,
  savingDocumentId,
}: Props) {
  const responsesByDocumentId = new Map(responses.map((response) => [response.documentId, response]));

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.pillarId}>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {group.pillarLabel}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Mark the status of each expected artifact for this pillar.
            </p>
          </div>

          <div className="space-y-4">
            {group.items.map((item) => {
              const selected = responsesByDocumentId.get(item.id)?.status ?? null;
              const isSaving = savingDocumentId === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Typical owner: {item.typicalOwner}
                      </p>
                    </div>
                    {isSaving && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
                    )}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {MATURITY_DOCUMENT_STATUS_OPTIONS.map((option) => {
                      const isSelected = selected === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={Boolean(savingDocumentId)}
                          onClick={() =>
                            void onStatusChange({
                              documentId: item.id,
                              pillarId: group.pillarId,
                              status: option.value,
                            })
                          }
                          className={cn(
                            "relative rounded-xl border px-3.5 py-3 text-left transition-all",
                            isSelected
                              ? "border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-200"
                              : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white",
                            savingDocumentId && savingDocumentId !== item.id && "opacity-60"
                          )}
                        >
                          {isSelected && (
                            <Check className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-indigo-600" />
                          )}
                          <p className="pr-5 text-sm font-medium text-slate-900">{option.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
