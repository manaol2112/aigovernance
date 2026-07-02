"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { SourceTracePanel, type Citation } from "@/components/cited-analysis";
import { cn } from "@/lib/utils";

type EvidenceCorpus = {
  workshopNotes: string;
  facilitatorNotes: string;
  evidenceTexts: Record<string, { fileName: string; text: string }>;
};

type EvidenceDrawerContextValue = {
  openCitation: (citation: Citation) => void;
  close: () => void;
  isOpen: boolean;
  activeCitation: Citation | null;
};

const EvidenceDrawerContext = createContext<EvidenceDrawerContextValue | null>(null);

export function EvidenceDrawerProvider({
  children,
  workshopNotes,
  facilitatorNotes,
  evidenceTexts,
}: EvidenceCorpus & { children: ReactNode }) {
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [open, setOpen] = useState(false);

  const openCitation = useCallback((citation: Citation) => {
    setActiveCitation(citation);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openCitation, close, isOpen: open, activeCitation }),
    [openCitation, close, open, activeCitation]
  );

  return (
    <EvidenceDrawerContext.Provider value={value}>
      {children}
      <EvidenceDrawerPanel
        open={open}
        citation={activeCitation}
        onClose={close}
        workshopNotes={workshopNotes}
        facilitatorNotes={facilitatorNotes}
        evidenceTexts={evidenceTexts}
      />
    </EvidenceDrawerContext.Provider>
  );
}

export function useEvidenceDrawer() {
  return useContext(EvidenceDrawerContext);
}

/** Opens shared drawer when inside provider; returns false to fall back to local dialog. */
export function openSharedEvidenceCitation(
  drawer: EvidenceDrawerContextValue | null,
  citation: Citation | null
): boolean {
  if (!drawer || !citation) return false;
  drawer.openCitation(citation);
  return true;
}

type PanelProps = EvidenceCorpus & {
  open: boolean;
  citation: Citation | null;
  onClose: () => void;
};

function EvidenceDrawerPanel({
  open,
  citation,
  onClose,
  workshopNotes,
  facilitatorNotes,
  evidenceTexts,
}: PanelProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-slate-900/25 backdrop-blur-[1px] transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
        role="dialog"
        aria-label="Source evidence"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Source evidence
            </p>
            <p className="text-sm font-medium text-slate-800">Verify findings against workshop sources</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close evidence panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <SourceTracePanel
            citation={citation}
            workshopNotes={workshopNotes}
            facilitatorNotes={facilitatorNotes}
            evidenceTexts={evidenceTexts}
            minHeight="min-h-full"
            className="h-full"
          />
        </div>
      </aside>
    </>
  );
}
