"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PACK_ASSESSMENT_COPY } from "@/lib/maturity-client-copy";
import { MountReveal, ScrollProgressBar, useLightHeaderZone, useScrolledPast } from "@/components/maturity-landing-motion";

export type MaturityPortalFooterMode = "framework" | "pack" | "hidden";

const MaturityPortalFooterContext = createContext<{
  mode: MaturityPortalFooterMode;
  setMode: (mode: MaturityPortalFooterMode) => void;
} | null>(null);

/** Pack/custom-question pages opt out of the framework-mapped portal footer. */
export function MaturityPortalFooterMode({ mode }: { mode: MaturityPortalFooterMode }) {
  const context = useContext(MaturityPortalFooterContext);
  if (!context) return null;

  const setMode = context.setMode;

  useEffect(() => {
    setMode(mode);
    return () => setMode("framework");
  }, [mode, setMode]);

  return null;
}

function PortalFooter({ mode }: { mode: MaturityPortalFooterMode }) {
  if (mode === "hidden") return null;

  return (
    <footer className="border-t border-slate-200/80 bg-white py-8 print:hidden">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        {mode === "framework" && (
          <p className="text-xs text-slate-400">
            Mapped to NIST AI RMF · ISO 42001 · EU AI Act · OECD · COSO ERM
          </p>
        )}
        <p className={cn("text-[11px] text-slate-300", mode === "framework" && "mt-1")}>
          {PACK_ASSESSMENT_COPY.printConfidential}
        </p>
      </div>
    </footer>
  );
}

export function MaturityPortalShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [footerMode, setFooterMode] = useState<MaturityPortalFooterMode>("framework");
  const scrolled = useScrolledPast(32);
  const lightZone = useLightHeaderZone();
  const lightHeader = scrolled && lightZone;

  return (
    <MaturityPortalFooterContext.Provider value={{ mode: footerMode, setMode: setFooterMode }}>
    <div
      data-maturity-scroll
      className={cn("h-full min-h-0 overflow-y-auto scroll-smooth bg-theme-page", className)}
    >
      <ScrollProgressBar />
      <header
        className={cn(
          "relative z-40 border-b transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          scrolled
            ? lightHeader
              ? "border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur-xl"
              : "border-white/10 bg-slate-950/90 shadow-lg shadow-black/20 backdrop-blur-xl"
            : "border-transparent bg-slate-950/80 backdrop-blur-md"
        )}
      >
        <MountReveal
          as="div"
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 transition-all duration-500 sm:px-6 lg:px-8",
            scrolled ? "h-14" : "h-16"
          )}
          delay={0}
        >
          <Link
            href="/maturity-assessment"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-lg text-white shadow-sm transition-all duration-500",
                lightHeader ? "h-8 w-8 bg-slate-900" : "h-9 w-9 bg-indigo-600 shadow-indigo-500/30"
              )}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p
                className={cn(
                  "text-sm font-semibold transition-colors duration-500",
                  lightHeader ? "text-slate-900" : "text-white"
                )}
              >
                AI Governance
              </p>
              <p
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wider transition-colors duration-500",
                  scrolled ? "text-slate-400" : "text-slate-400"
                )}
              >
                Maturity Assessment
              </p>
            </div>
          </Link>
        </MountReveal>
      </header>
      {children}
      <PortalFooter mode={footerMode} />
    </div>
    </MaturityPortalFooterContext.Provider>
  );
}
