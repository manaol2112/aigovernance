import { AdminThemeSettings } from "@/components/admin-theme-settings";

export const metadata = {
  title: "Admin · Appearance",
  description: "Configure application color theme and branding",
};

export default function AdminSettingsPage() {
  return <AdminThemeSettings />;
}
