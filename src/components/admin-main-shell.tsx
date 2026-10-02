"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function isFullBleedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/maturity-assessment") ||
    pathname.startsWith("/guided-workshop")
  );
}

/**
 * Admin content region. Overflow mode follows the client pathname so soft
 * navigations never leave a page stuck with overflow-hidden (Chrome/Safari scroll trap).
 * Full-bleed routes must provide an inner `h-full min-h-0 overflow-y-auto` root.
 */
export function AdminMainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const fullBleed = isFullBleedPath(pathname);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn(
        "relative z-0 flex min-h-0 flex-1 flex-col outline-none",
        fullBleed
          ? "overflow-hidden p-0"
          : "overflow-y-auto overflow-x-hidden overscroll-y-contain px-6 py-8 sm:px-10 lg:px-14 lg:py-10"
      )}
    >
      {fullBleed ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
    </main>
  );
}
