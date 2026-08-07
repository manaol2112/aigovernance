import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads .afm font metrics from disk; bundling breaks __dirname paths.
  serverExternalPackages: ["pdfkit"],
  // Allow other devices on the local network (same Wi-Fi) to load Next.js dev
  // resources (_next assets, HMR, fonts). Without this, cross-origin hosts get
  // blocked and client pages (assessments, maturity survey) fail to hydrate.
  //
  // Your current Mac LAN IP is shown by `next dev` as "Network: http://…".
  // Add that host here when it changes (common on corporate / hotel Wi‑Fi).
  allowedDevOrigins: [
    "10.81.2.216",
    "10.81.2.*",
    "10.0.0.*",
    "10.0.*.*",
    "192.168.0.*",
    "192.168.1.*",
    "192.168.*.*",
  ],
};

export default nextConfig;
