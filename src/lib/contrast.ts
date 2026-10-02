/** Relative luminance (sRGB), WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const cleaned = hex.replace("#", "").trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = [r, g, b].map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** Contrast ratio between two hex colors (1–21). */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAaText(
  foreground: string,
  background: string,
  options?: { large?: boolean }
): boolean {
  const min = options?.large ? 3 : 4.5;
  return contrastRatio(foreground, background) >= min;
}

export function meetsWcagAaUi(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= 3;
}
