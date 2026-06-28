import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar pathname={pathname} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
