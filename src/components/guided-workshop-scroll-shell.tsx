"use client";

import { cn } from "@/lib/utils";
import { ScrollProgressBar } from "@/components/maturity-landing-motion";

/** Scroll root for guided-workshop routes (list, new, live session). */
export function GuidedWorkshopScrollShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-maturity-scroll
      className={cn("h-full min-h-0 overflow-y-auto scroll-smooth bg-theme-page", className)}
    >
      <ScrollProgressBar />
      {children}
    </div>
  );
}
