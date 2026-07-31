import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@pixel-engine/effects";

/**
 * Reactively tracks `prefers-reduced-motion: reduce`, re-rendering when the OS/browser
 * preference changes without a page reload. Same `matchMedia(...).addEventListener("change",
 * ...)` pattern already used by `useResolvedThemeMode` for theme syncing.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();

    const listener = () => apply();
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, []);

  return reduced;
}
