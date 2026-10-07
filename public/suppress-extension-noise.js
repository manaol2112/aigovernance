/**
 * Runs before Next.js client code so Prisma Access "digest" crashes never open the overlay.
 */
(function () {
  function isNoise(value, filename) {
    if (filename && /chrome-extension:/i.test(filename)) return true;
    var text =
      value && typeof value === "object" && "message" in value
        ? String(value.message || "") + "\n" + String(value.stack || "")
        : String(value || "");
    return (
      /chrome-extension:/i.test(text) ||
      /reading ['"]digest['"]/i.test(text) ||
      /Unknown url scheme ['"]chrome-extension/i.test(text) ||
      (/digest/i.test(text) && /<computed>/i.test(text))
    );
  }

  window.addEventListener(
    "error",
    function (event) {
      if (!isNoise(event.error || event.message, event.filename)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  window.addEventListener(
    "unhandledrejection",
    function (event) {
      if (!isNoise(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  function removeOverlay() {
    document.querySelectorAll("nextjs-portal").forEach(function (portal) {
      var text = portal.textContent || "";
      if (
        isNoise(text) ||
        (/digest/i.test(text) && /call stack/i.test(text))
      ) {
        portal.remove();
      }
    });
  }

  if (document.documentElement) {
    new MutationObserver(removeOverlay).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
