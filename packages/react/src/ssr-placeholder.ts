import { CSSProperties } from "react";
import { SsrPlaceholderInput, SsrPlaceholderOptions, SsrPlaceholderPresetName } from "./types";

const PRESET_STYLES: Record<SsrPlaceholderPresetName, CSSProperties> = {
  minimal: {
    backgroundColor: "#0b1220"
  },
  "card-soft": {
    backgroundColor: "#0f172a",
    backgroundImage:
      "radial-gradient(circle at 22% 18%, rgba(148,163,184,0.22), transparent 54%), radial-gradient(circle at 82% 84%, rgba(71,85,105,0.28), transparent 58%)"
  },
  "hero-image": {
    backgroundColor: "#020617",
    backgroundImage:
      "linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.96) 38%, rgba(2,6,23,1) 100%)"
  }
};

function toPlaceholderOptions(input: SsrPlaceholderInput | undefined): SsrPlaceholderOptions {
  if (!input) return { enabled: false };
  if (typeof input === "string") {
    return {
      enabled: true,
      preset: input
    };
  }
  return input;
}

export function resolveSsrPlaceholderCanvasStyle(
  input: SsrPlaceholderInput | undefined,
  isReady: boolean
): CSSProperties {
  const options = toPlaceholderOptions(input);
  if (!options.enabled) return {};
  if (options.hideOnReady && isReady) return {};

  const preset = options.preset ?? "minimal";
  return {
    ...PRESET_STYLES[preset],
    ...options.style
  };
}
