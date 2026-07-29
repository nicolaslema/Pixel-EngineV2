/**
 * Canonical `prefers-reduced-motion` check. Guarded for non-browser environments (SSR,
 * vitest/jsdom without matchMedia) the same way as everywhere else in this codebase that
 * touches `window`.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
