import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminProviders } from "@/components/admin-providers";
import { getColorTheme } from "@/lib/theme-settings";
import { cn } from "@/lib/utils";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";
  const isImmersiveReport =
    pathname.startsWith("/maturity-assessment") ||
    pathname.startsWith("/guided-workshop");
  const isFullBleedMain = isImmersiveReport || pathname === "/";
  const colorTheme = await getColorTheme();

  return (
    <AdminProviders initialTheme={colorTheme}>
      <div className="flex h-dvh overflow-hidden bg-theme-page">
        {!isImmersiveReport && <Sidebar pathname={pathname} />}
        <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
          <main
            className={cn(
              "min-h-0 flex-1",
              isFullBleedMain ? "overflow-hidden p-0" : "overflow-auto p-8"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </AdminProviders>
  );
}
