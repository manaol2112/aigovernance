"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminMainShell } from "@/components/admin-main-shell";

function isImmersivePath(pathname: string): boolean {
  return (
    pathname.startsWith("/maturity-assessment") ||
    pathname.startsWith("/guided-workshop")
  );
}

/** Sidebar + scrollable main; both driven by client pathname. */
export function AdminChromeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const immersive = isImmersivePath(pathname);

  return (
    <div className="flex h-dvh overflow-hidden bg-theme-page">
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      {!immersive && <Sidebar pathname={pathname} />}
      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminMainShell>{children}</AdminMainShell>
      </div>
    </div>
  );
}
