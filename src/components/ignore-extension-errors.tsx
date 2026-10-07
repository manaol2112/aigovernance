"use client";

import { useEffect } from "react";
import { installExtensionNoiseFilters } from "@/lib/suppress-extension-noise";

/**
 * Enterprise browser extensions (e.g. Prisma Access Browser) inject scripts that
 * crash on file uploads with: Cannot read properties of undefined (reading 'digest').
 * That noise trips Next.js error overlays even when the app is fine.
 */
export function IgnoreExtensionErrors() {
  useEffect(() => installExtensionNoiseFilters(), []);
  return null;
}
