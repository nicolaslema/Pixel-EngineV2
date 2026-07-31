import { FitMode } from "./types";

const RESPONSIVE_VALUE_PATTERN =
  /%|vw|vh|vmin|vmax|auto|fit-content|min-content|max-content|stretch/i;

function looksResponsive(value: unknown): boolean {
  return typeof value === "string" && RESPONSIVE_VALUE_PATTERN.test(value);
}

/**
 * Detects the "responsive `style.width`/`height` silently clobbered" footgun: with
 * `fitMode !== "client"`, `Canvas2DRenderer.resize()` overwrites `canvas.style.width`/`height`
 * with a fixed px value on every resize call (including at mount), so a percentage/viewport-unit
 * style is immediately replaced and never restored. Pure function, easy to unit-test in isolation.
 * Returns the warning message, or `null` if nothing looks wrong.
 */
export function getResponsiveCanvasStyleWarning(
  style: { width?: unknown; height?: unknown } | undefined,
  fitMode: FitMode | undefined
): string | null {
  if (fitMode === "client") return null;
  if (!looksResponsive(style?.width) && !looksResponsive(style?.height)) return null;

  return (
    `style.width/height looks like a responsive value (e.g. a percentage or viewport unit), ` +
    `but fitMode is "${fitMode ?? "none"}" (fixed pixel size). Canvas2DRenderer overwrites ` +
    `canvas.style.width/height with a fixed px value on every resize (including at mount), so ` +
    `this will be silently clobbered. Set fitMode="client" (with resizeMode, default "observer") ` +
    `to make the canvas track its container's size instead.`
  );
}

export function warnIfResponsiveCanvasStyleMismatch(
  style: { width?: unknown; height?: unknown } | undefined,
  fitMode: FitMode | undefined
): void {
  const message = getResponsiveCanvasStyleWarning(style, fitMode);
  if (!message) return;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  console.warn(`[pixel-engine/react] ${message}`);
}
