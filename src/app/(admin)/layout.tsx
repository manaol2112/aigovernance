import { AdminProviders } from "@/components/admin-providers";
import { AdminChromeShell } from "@/components/admin-chrome-shell";
import { BrandRoutePending } from "@/components/brand-route-pending";
import { getColorTheme } from "@/lib/theme-settings";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const colorTheme = await getColorTheme();

  return (
    <AdminProviders initialTheme={colorTheme}>
      <BrandRoutePending />
      <AdminChromeShell>{children}</AdminChromeShell>
    </AdminProviders>
  );
}
