"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DELOITTE_BRAND } from "@/lib/deloitte-brand";
import { cn } from "@/lib/utils";

function BrandPulse({ size = "md" }: { size?: "sm" | "md" }) {
  const ring = size === "sm" ? "h-12 w-12" : "h-16 w-16";
  const mid = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const dot = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span className="relative flex items-center justify-center" aria-hidden>
      <span
        className={cn("absolute animate-ping rounded-full opacity-30", ring)}
        style={{ backgroundColor: DELOITTE_BRAND.green, animationDuration: "1.5s" }}
      />
      <span
        className={cn("absolute animate-pulse rounded-full opacity-25", mid)}
        style={{ backgroundColor: DELOITTE_BRAND.green }}
      />
      <span
        className={cn("relative rounded-full shadow-[0_0_22px_rgba(134,188,37,0.7)]", dot)}
        style={{ backgroundColor: DELOITTE_BRAND.green }}
      />
    </span>
  );
}

export function BrandPageLoader({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex h-full min-h-[70vh] w-full flex-col items-center justify-center bg-slate-950 px-6",
        className
      )}
    >
      <BrandPulse />
      <p
        className="mt-7 text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: DELOITTE_BRAND.green }}
      >
        {label}
      </p>
      <p className="mt-2 text-xs text-slate-500">Please wait — this can take a moment.</p>
    </div>
  );
}

export function BrandLoadingOverlay({
  show,
  label,
}: {
  show: boolean;
  label: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!show || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <BrandPageLoader label={label} className="min-h-0 bg-transparent" />
    </div>,
    document.body
  );
}
