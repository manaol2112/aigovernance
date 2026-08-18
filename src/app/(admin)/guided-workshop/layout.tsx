import { headers } from "next/headers";
import { GuidedWorkshopScrollShell } from "@/components/guided-workshop-scroll-shell";

export default async function GuidedWorkshopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isResultsPage = /^\/guided-workshop\/[^/]+\/results\/?$/.test(pathname);

  // Results owns its own scroll container; other routes use the shared shell.
  if (isResultsPage) {
    return children;
  }

  return <GuidedWorkshopScrollShell>{children}</GuidedWorkshopScrollShell>;
}
