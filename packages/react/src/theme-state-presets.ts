import { useEffect, useMemo, useState } from "react";
import { PixelGridConfig } from "@pixel-engine/effects";
import { StatePresetInput, StatePresetName, ThemeSyncMode, ThemeSyncOptions } from "./types";

const LIGHT_THEME: Partial<PixelGridConfig> = {
  colors: ["#cbd5e1", "#94a3b8", "#64748b"],
  canvasBackground: "#f8fafc",
  hoverEffects: {
    tintPalette: ["#64748b", "#475569", "#334155"]
  },
  rippleEffects: {
    tintPalette: ["#0f172a", "#334155", "#475569"]
  }
};

const DARK_THEME: Partial<PixelGridConfig> = {
  colors: ["#334155", "#475569", "#64748b"],
  canvasBackground: "#0b1220",
  hoverEffects: {
    tintPalette: ["#94a3b8", "#cbd5e1", "#f8fafc"]
  },
  rippleEffects: {
    tintPalette: ["#f8fafc", "#cbd5e1", "#94a3b8"]
  }
};

const STATE_PRESET_OVERRIDES: Record<StatePresetName, Partial<PixelGridConfig>> = {
  idle: {
    effects: {
      paletteCycle: { enabled: false }
    }
  },
  hover: {
    hoverEffects: {
      mode: "reactive",
      strength: 1.1,
      displace: 3,
      jitter: 1
    }
  },
  active: {
    rippleEffects: {
      enabled: true,
      strength: 34,
      maxRipples: 48
    },
    effects: {
      shockwaveBurst: {
        enabled: true,
        triggerMode: "both",
        strength: 0.55
      }
    }
  },
  success: {
    colors: ["#14532d", "#16a34a", "#22c55e"],
    effects: {
      paletteCycle: {
        enabled: true,
        speed: 0.55,
        scope: "activeOnly",
        palette: ["#166534", "#22c55e", "#86efac"]
      }
    }
  },
  error: {
    colors: ["#7f1d1d", "#b91c1c", "#ef4444"],
    effects: {
      paletteCycle: {
        enabled: true,
        speed: 0.6,
        scope: "activeOnly",
        palette: ["#991b1b", "#ef4444", "#fca5a5"]
      }
    }
  },
  loading: {
    effects: {
      paletteCycle: {
        enabled: true,
        speed: 0.9,
        scope: "all",
        palette: ["#1e3a8a", "#2563eb", "#60a5fa"]
      }
    },
    breathing: {
      enabled: true,
      speed: 1.4
    }
  }
};

function cloneArray(values: string[] | undefined): string[] | undefined {
  return values ? [...values] : undefined;
}

function clonePartialConfig(config: Partial<PixelGridConfig> | undefined): Partial<PixelGridConfig> {
  if (!config) return {};
  return {
    ...config,
    colors: cloneArray(config.colors),
    hoverEffects: config.hoverEffects
      ? {
        ...config.hoverEffects,
        tintPalette: cloneArray(config.hoverEffects.tintPalette),
        magnetic: config.hoverEffects.magnetic
          ? { ...config.hoverEffects.magnetic }
          : undefined
      }
      : undefined,
    rippleEffects: config.rippleEffects
      ? {
        ...config.rippleEffects,
        tintPalette: cloneArray(config.rippleEffects.tintPalette)
      }
      : undefined,
    breathing: config.breathing ? { ...config.breathing } : undefined,
    effects: config.effects
      ? {
        ...config.effects,
        paletteCycle: config.effects.paletteCycle
          ? {
            ...config.effects.paletteCycle,
            palette: cloneArray(config.effects.paletteCycle.palette)
          }
          : undefined,
        dissolve: config.effects.dissolve
          ? { ...config.effects.dissolve }
          : undefined,
        shockwaveBurst: config.effects.shockwaveBurst
          ? { ...config.effects.shockwaveBurst }
          : undefined
      }
      : undefined
  };
}

export function mergeGridConfigPartials(
  ...configs: Array<Partial<PixelGridConfig> | undefined>
): Partial<PixelGridConfig> {
  let merged: Partial<PixelGridConfig> = {};

  for (const candidate of configs) {
    if (!candidate) continue;
    const next = clonePartialConfig(candidate);
    merged = {
      ...merged,
      ...next,
      colors: next.colors ?? merged.colors,
      hoverEffects:
        merged.hoverEffects || next.hoverEffects
          ? {
            ...(merged.hoverEffects ?? {}),
            ...(next.hoverEffects ?? {}),
            tintPalette: next.hoverEffects?.tintPalette ?? merged.hoverEffects?.tintPalette,
            magnetic:
              merged.hoverEffects?.magnetic || next.hoverEffects?.magnetic
                ? {
                  ...(merged.hoverEffects?.magnetic ?? {}),
                  ...(next.hoverEffects?.magnetic ?? {})
                }
                : undefined
          }
          : undefined,
      rippleEffects:
        merged.rippleEffects || next.rippleEffects
          ? {
            ...(merged.rippleEffects ?? {}),
            ...(next.rippleEffects ?? {}),
            tintPalette: next.rippleEffects?.tintPalette ?? merged.rippleEffects?.tintPalette
          }
          : undefined,
      breathing:
        merged.breathing || next.breathing
          ? {
            ...(merged.breathing ?? {}),
            ...(next.breathing ?? {})
          }
          : undefined,
      effects:
        merged.effects || next.effects
          ? {
            ...(merged.effects ?? {}),
            ...(next.effects ?? {}),
            paletteCycle:
              merged.effects?.paletteCycle || next.effects?.paletteCycle
                ? {
                  ...(merged.effects?.paletteCycle ?? {}),
                  ...(next.effects?.paletteCycle ?? {}),
                  palette:
                    next.effects?.paletteCycle?.palette ??
                    merged.effects?.paletteCycle?.palette
                }
                : undefined,
            dissolve:
              merged.effects?.dissolve || next.effects?.dissolve
                ? {
                  ...(merged.effects?.dissolve ?? {}),
                  ...(next.effects?.dissolve ?? {})
                }
                : undefined,
            shockwaveBurst:
              merged.effects?.shockwaveBurst || next.effects?.shockwaveBurst
                ? {
                  ...(merged.effects?.shockwaveBurst ?? {}),
                  ...(next.effects?.shockwaveBurst ?? {})
                }
                : undefined
          }
          : undefined
    };
  }

  return merged;
}

function readSystemTheme(): ThemeSyncMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useResolvedThemeMode(options?: ThemeSyncOptions): ThemeSyncMode | null {
  const enabled = options?.enabled ?? false;
  const mode = options?.mode ?? "dark";
  const followSystem = options?.followSystem ?? true;

  const initialMode = useMemo<ThemeSyncMode | null>(() => {
    if (!enabled) return null;
    if (mode === "brand") return "brand";
    return followSystem ? readSystemTheme() : mode;
  }, [enabled, followSystem, mode]);

  const [resolvedMode, setResolvedMode] = useState<ThemeSyncMode | null>(initialMode);

  useEffect(() => {
    if (!enabled) {
      setResolvedMode(null);
      return;
    }
    if (mode === "brand") {
      setResolvedMode("brand");
      return;
    }
    if (!followSystem) {
      setResolvedMode(mode);
      return;
    }
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setResolvedMode("dark");
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setResolvedMode(media.matches ? "dark" : "light");
    apply();

    const listener = () => apply();
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, [enabled, followSystem, mode]);

  return resolvedMode;
}

export function resolveThemeSyncGridOverride(
  options: ThemeSyncOptions | undefined,
  resolvedMode: ThemeSyncMode | null
): Partial<PixelGridConfig> | undefined {
  if (!options?.enabled || !resolvedMode) return undefined;

  if (resolvedMode === "light") {
    return clonePartialConfig(LIGHT_THEME);
  }
  if (resolvedMode === "dark") {
    return clonePartialConfig(DARK_THEME);
  }

  const brandColors = options.brandColors?.length
    ? [...options.brandColors]
    : ["#0f766e", "#14b8a6", "#2dd4bf"];
  return {
    colors: brandColors,
    canvasBackground: options.brandCanvasBackground ?? "#0b1220",
    hoverEffects: {
      tintPalette:
        options.brandHoverTintPalette?.length
          ? [...options.brandHoverTintPalette]
          : ["#5eead4", "#99f6e4", "#ccfbf1"]
    },
    rippleEffects: {
      tintPalette:
        options.brandRippleTintPalette?.length
          ? [...options.brandRippleTintPalette]
          : ["#2dd4bf", "#5eead4", "#99f6e4"]
    },
    effects: {
      paletteCycle: {
        enabled: true,
        speed: 0.55,
        scope: "activeOnly",
        palette: [...brandColors]
      }
    }
  };
}

function normalizeStateInput(input: StatePresetInput | undefined): StatePresetName | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (input.enabled === false) return null;
  return input.value ?? "idle";
}

export function resolveStatePresetGridOverride(
  input: StatePresetInput | undefined
): Partial<PixelGridConfig> | undefined {
  const preset = normalizeStateInput(input);
  if (!preset) return undefined;
  return clonePartialConfig(STATE_PRESET_OVERRIDES[preset]);
}
