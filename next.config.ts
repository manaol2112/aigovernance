import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads .afm font metrics from disk; bundling breaks __dirname paths.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
