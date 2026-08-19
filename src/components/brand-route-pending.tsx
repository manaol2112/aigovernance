"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLoadingOverlay } from "@/components/brand-page-loader";
import {
  isInternalNavigationClick,
  shouldShowMaturityRoutePending,
} from "@/lib/brand-navigation";

/** Instant Deloitte overlay while App Router navigations are in flight. */
export function BrandRoutePending() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const locationRef = useRef("");

  useEffect(() => {
    locationRef.current = `${window.location.pathname}${window.location.search}`;
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  useEffect(() => {
    locationRef.current = `${window.location.pathname}${window.location.search}`;

    const onClick = (event: MouseEvent) => {
      if (!isInternalNavigationClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (
        shouldShowMaturityRoutePending(window.location.href, anchor.href, window.location.origin)
      ) {
        setPending(true);
      }
    };
    const onPopState = () => {
      const next = `${window.location.pathname}${window.location.search}`;
      const from = locationRef.current
        ? `${window.location.origin}${locationRef.current}`
        : window.location.href;
      if (!shouldShowMaturityRoutePending(from, window.location.href, window.location.origin)) {
        return;
      }
      locationRef.current = next;
      setPending(true);
    };
    const onHashChange = () => setPending(false);

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return <BrandLoadingOverlay show={pending} label="Loading" />;
}
