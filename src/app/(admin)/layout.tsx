import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminProviders } from "@/components/admin-providers";
import { getColorTheme } from "@/lib/theme-settings";
import { cn } from "@/lib/utils";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";
  const isMaturityPortal = pathname.startsWith("/maturity-assessment");
  const colorTheme = await getColorTheme();

  return (
    <AdminProviders initialTheme={colorTheme}>
      <div className="flex min-h-screen bg-theme-page">
        {!isMaturityPortal && <Sidebar pathname={pathname} />}
        <div className="relative z-0 flex min-w-0 flex-1 flex-col">
          <main className={cn("flex-1 overflow-auto", !isMaturityPortal && "p-8")}>
            {children}
          </main>
        </div>
      </div>
    </AdminProviders>
  );
}
