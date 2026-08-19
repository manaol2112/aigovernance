export function isMaturityOrWorkshopPath(pathname: string): boolean {
  return pathname.startsWith("/maturity-assessment") || pathname.startsWith("/guided-workshop");
}

/** True when only the hash changed — in-page report sections, not a route change. */
export function isHashOnlyUrlChange(fromHref: string, toHref: string, base = "http://local.test"): boolean {
  try {
    const from = new URL(fromHref, base);
    const to = new URL(toHref, base);
    return from.pathname === to.pathname && from.search === to.search && from.hash !== to.hash;
  } catch {
    return false;
  }
}

export function shouldShowMaturityRoutePending(
  fromHref: string,
  toHref: string,
  base = "http://local.test"
): boolean {
  try {
    const from = new URL(fromHref, base);
    const to = new URL(toHref, base);
    if (from.pathname === to.pathname && from.search === to.search) return false;
    return isMaturityOrWorkshopPath(from.pathname) || isMaturityOrWorkshopPath(to.pathname);
  } catch {
    return false;
  }
}

export function isInternalNavigationClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return false;

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.hasAttribute("download") || anchor.target === "_blank") return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}
