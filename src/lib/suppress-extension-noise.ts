/**
 * Prisma Access Browser (and similar DLP extensions) crash on file pickers with:
 *   TypeError: Cannot read properties of undefined (reading 'digest')
 * at chrome-extension://…/injected.js (`<computed>` in the call stack).
 * That noise is unrelated to app code but trips the Next.js error overlay.
 */

export function isExtensionNoise(value: unknown, filename?: string | null): boolean {
  if (filename && /chrome-extension:/i.test(filename)) return true;

  const text =
    value instanceof Error
      ? `${value.message}\n${value.stack ?? ""}`
      : String(value ?? "");

  return (
    /chrome-extension:/i.test(text) ||
    /reading ['"]digest['"]/i.test(text) ||
    /Unknown url scheme ['"]chrome-extension/i.test(text) ||
    (/digest/i.test(text) && /<computed>/i.test(text))
  );
}

export function installExtensionNoiseFilters(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onError = (event: ErrorEvent) => {
    if (!isExtensionNoise(event.error, event.filename) && !isExtensionNoise(event.message, event.filename)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    if (!isExtensionNoise(event.reason)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const removeNoisyOverlay = () => {
    document.querySelectorAll("nextjs-portal").forEach((portal) => {
      const text = portal.textContent ?? "";
      if (!isExtensionNoise(text) && !(/digest/i.test(text) && /call stack/i.test(text))) {
        return;
      }
      portal.remove();
    });
  };

  window.addEventListener("error", onError, true);
  window.addEventListener("unhandledrejection", onRejection, true);

  const observer = new MutationObserver(removeNoisyOverlay);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  removeNoisyOverlay();

  return () => {
    window.removeEventListener("error", onError, true);
    window.removeEventListener("unhandledrejection", onRejection, true);
    observer.disconnect();
  };
}
