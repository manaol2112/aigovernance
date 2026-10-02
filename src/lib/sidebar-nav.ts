/** True when a sidebar href should show as the active route. */
export function isSidebarNavActive(pathname: string, href: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}
