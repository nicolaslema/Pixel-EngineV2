import { PixelEngine } from "../src/core/PixelEngine";
import { PixelGridEffect } from "../src/entities/PixelGridEffect";
import type { PixelGridConfig, PixelGridInfluenceOptions } from "../src/entities/pixel-grid/types";

type PlaygroundPreset = "minimal" | "card-soft" | "card-ripple" | "hero-image";

interface PlaygroundState {
  preset: PlaygroundPreset;
  config: PixelGridConfig;
  influenceOptions: PixelGridInfluenceOptions;
  pageColor: string;
  webUtilities: {
    scrollReactive: {
      enabled: boolean;
      intensity: number;
      direction: "up" | "down" | "both";
      edge: "leading" | "trailing" | "center";
      cooldownMs: number;
      maxBurstRipples: number;
      respectReducedMotion: boolean;
    };
    sectionTransition: {
      enabled: boolean;
      preset: "fade" | "lift" | "zoom";
      amount: number;
      progress: number;
      rippleOnEnter: boolean;
      playTimelineOnEnter: boolean;
      pauseTimelineOnExit: boolean;
    };
    themeSync: {
      enabled: boolean;
      mode: "light" | "dark" | "brand";
      followSystem: boolean;
      brandColors: [string, string, string];
      brandCanvasBackground: string;
      brandHoverTintPalette: [string, string, string];
      brandRippleTintPalette: [string, string, string];
    };
    statePreset: {
      enabled: boolean;
      value: "idle" | "hover" | "active" | "success" | "error" | "loading";
    };
    debugHud: {
      enabled: boolean;
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      updateIntervalMs: number;
      showFps: boolean;
      showQuality: boolean;
      showLoop: boolean;
      showCells: boolean;
      showRipples: boolean;
      showTimeline: boolean;
    };
  };
  timelineAssets: {
    text1Id: string;
    text2Id: string;
    image1Id: string;
    image2Id: string;
    text1: string;
    text2: string;
    text1FontFamily: string;
    text2FontFamily: string;
    text1FontSize: number;
    text2FontSize: number;
    image1: string;
    image2: string;
    image1Scale: number;
    image2Scale: number;
    image1SampleMode: "alpha" | "luminance" | "threshold" | "invert";
    image2SampleMode: "alpha" | "luminance" | "threshold" | "invert";
    image1ObjectUrl: string | null;
    image2ObjectUrl: string | null;
  };
}

const canvas = document.getElementById("app") as HTMLCanvasElement;

const width = 800;
const height = 600;
const engineRuntimeTuning = {
  quality: "medium" as const,
  loop: {
    fixedTimeStep: 1000 / 60,
    maxDelta: 250,
    maxUpdatesPerFrame: 240
  }
};

const engine = new PixelEngine({
  canvas,
  width,
  height,
  quality: engineRuntimeTuning.quality,
  loop: engineRuntimeTuning.loop
});

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shouldReduceMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createPresetConfig(preset: PlaygroundPreset): PixelGridConfig {
  if (preset === "minimal") {
    return {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 7,
      expandEase: 0.08,
      breathSpeed: 0.75,
      canvasBackground: "#0b1220",
      hoverEffects: {
        mode: "classic",
        radius: 95,
        strength: 1,
        interactionScope: "all",
        deactivate: 0.7,
        displace: 0,
        jitter: 0,
        tintPalette: [],
        magnetic: {
          enabled: false,
          mode: "attract",
          strength: 2.2,
          radius: 95
        }
      },
      rippleEffects: {
        enabled: true,
        speed: 0.42,
        thickness: 45,
        strength: 24,
        maxRipples: 32,
        deactivateMultiplier: 1,
        displaceMultiplier: 1,
        jitterMultiplier: 1,
        tintPalette: []
      },
      breathing: {
        enabled: false,
        speed: 1,
        radius: 100,
        radiusY: 100,
        shape: "circle",
        strength: 0.5,
        minOpacity: 0.5,
        maxOpacity: 1,
        affectHover: true,
        affectImage: false,
        affectText: false
      },
      autoMorph: {
        enabled: false,
        holdImageMs: 1400,
        holdTextMs: 1400,
        morphDurationMs: 900,
        intervalMs: 200
      },
      initialMask: "text"
    };
  }

  if (preset === "card-ripple") {
    return {
      colors: ["#0f172a", "#1e293b", "#334155"],
      gap: 6,
      expandEase: 0.09,
      breathSpeed: 0.9,
      canvasBackground: "#0b1020",
      hoverEffects: {
        mode: "reactive",
        radius: 105,
        strength: 1,
        interactionScope: "all",
        deactivate: 0.82,
        displace: 3.5,
        jitter: 1.1,
        tintPalette: ["#94a3b8", "#cbd5e1"],
        magnetic: {
          enabled: false,
          mode: "attract",
          strength: 2.2,
          radius: 105
        }
      },
      rippleEffects: {
        enabled: true,
        speed: 0.56,
        thickness: 52,
        strength: 30,
        maxRipples: 48,
        deactivateMultiplier: 0.75,
        displaceMultiplier: 1.25,
        jitterMultiplier: 1.2,
        tintPalette: ["#f8fafc", "#cbd5e1", "#94a3b8"]
      },
      breathing: {
        enabled: true,
        speed: 1.3,
        radius: 130,
        radiusY: 110,
        shape: "circle",
        strength: 0.45,
        minOpacity: 0.55,
        maxOpacity: 1,
        affectHover: true,
        affectImage: false,
        affectText: false
      },
      autoMorph: {
        enabled: false,
        holdImageMs: 1200,
        holdTextMs: 1200,
        morphDurationMs: 900,
        intervalMs: 120
      },
      initialMask: "text"
    };
  }

  if (preset === "hero-image") {
    return {
      colors: ["#1f2937", "#374151", "#4b5563"],
      gap: 5,
      expandEase: 0.08,
      breathSpeed: 0.95,
      canvasBackground: "#05070d",
      hoverEffects: {
        mode: "reactive",
        radius: 120,
        strength: 1,
        interactionScope: "imageMask",
        deactivate: 0.85,
        displace: 4,
        jitter: 1.1,
        tintPalette: ["#e5e7eb", "#d1d5db", "#9ca3af"],
        magnetic: {
          enabled: false,
          mode: "attract",
          strength: 2.2,
          radius: 120
        }
      },
      rippleEffects: {
        enabled: true,
        speed: 0.54,
        thickness: 46,
        strength: 28,
        maxRipples: 42,
        deactivateMultiplier: 0.78,
        displaceMultiplier: 1.2,
        jitterMultiplier: 1.15,
        tintPalette: ["#ffffff", "#d1d5db", "#9ca3af"]
      },
      breathing: {
        enabled: true,
        speed: 1.6,
        radius: 140,
        radiusY: 100,
        shape: "circle",
        strength: 0.55,
        minOpacity: 0.45,
        maxOpacity: 1,
        affectHover: true,
        affectImage: true,
        affectText: true
      },
      autoMorph: {
        enabled: false,
        holdImageMs: 1400,
        holdTextMs: 1400,
        morphDurationMs: 900,
        intervalMs: 140
      },
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
      defaultTransition: {
          mode: "morph",
          durationMs: 900,
          seed: 1337
        },
        items: [
          {
            type: "text",
            id: "text-1",
            text: "PIXEL",
            centerX: 400,
            centerY: 300,
            font: "bold 120px Arial",
            strength: 0.95,
            blurRadius: 2
          },
          {
            type: "image",
            id: "image-1",
            src: "/src/assets/cat.png",
            centerX: 400,
            centerY: 280,
            scale: 2,
            sampleMode: "threshold",
            strength: 1.35
          },
          {
            type: "text",
            id: "text-2",
            text: "ENGINE",
            centerX: 400,
            centerY: 300,
            font: "bold 110px Arial",
            strength: 0.95,
            blurRadius: 2
          },
          {
            type: "image",
            id: "image-2",
            src: "/src/assets/cat.png",
            centerX: 400,
            centerY: 280,
            scale: 1.6,
            sampleMode: "luminance",
            strength: 1.25
          }
        ],
        steps: [
          {
            mask: "text",
            assetId: "text-1",
            holdMs: 1400,
            transition: {
              mode: "morph",
              durationMs: 900,
              seed: 1401
            }
          },
          {
            mask: "image",
            assetId: "image-1",
            holdMs: 1400,
            transition: {
              mode: "morph",
              durationMs: 900,
              seed: 2401
            }
          },
          {
            mask: "text",
            assetId: "text-2",
            holdMs: 1400,
            transition: {
              mode: "dissolve",
              durationMs: 900,
              seed: 4201
            }
          },
          {
            mask: "image",
            assetId: "image-2",
            holdMs: 1400,
            transition: {
              mode: "fade",
              durationMs: 900,
              seed: 5201
            }
          }
        ]
      },
      initialMask: "text",
      imageMasks: [
        {
          id: "image-1",
          src: "/src/assets/cat.png",
          centerX: 400,
          centerY: 280,
          scale: 2,
          sampleMode: "threshold",
          strength: 1.35
        },
        {
          id: "image-2",
          src: "/src/assets/cat.png",
          centerX: 400,
          centerY: 280,
          scale: 1.6,
          sampleMode: "luminance",
          strength: 1.25
        }
      ],
      textMasks: [
        {
          id: "text-1",
          text: "PIXEL",
          centerX: 400,
          centerY: 300,
          font: "bold 120px Arial",
          strength: 0.95,
          blurRadius: 2
        },
        {
          id: "text-2",
          text: "ENGINE",
          centerX: 400,
          centerY: 300,
          font: "bold 110px Arial",
          strength: 0.95,
          blurRadius: 2
        }
      ],
      imageMask: {
        src: "/src/assets/cat.png",
        centerX: 400,
        centerY: 280,
        scale: 2,
        sampleMode: "threshold",
        strength: 1.35
      },
      textMask: {
        text: "PIXEL",
        centerX: 400,
        centerY: 300,
        font: "bold 120px Arial",
        strength: 0.95,
        blurRadius: 2
      }
    };
  }

  return {
    colors: ["#334155", "#475569", "#64748b"],
    gap: 6,
    expandEase: 0.08,
    breathSpeed: 0.9,
    canvasBackground: "#141514",
    hoverEffects: {
      mode: "reactive",
      radius: 100,
      strength: 1,
      interactionScope: "all",
      deactivate: 0.85,
      displace: 4,
      jitter: 1.2,
      tintPalette: [],
      magnetic: {
        enabled: false,
        mode: "attract",
        strength: 2.2,
        radius: 100
      }
    },
    rippleEffects: {
      speed: 0.5,
      thickness: 50,
      strength: 30,
      maxRipples: 50,
      enabled: true,
      deactivateMultiplier: 0.7,
      displaceMultiplier: 1.25,
      jitterMultiplier: 1.2,
      tintPalette: []
    },
    breathing: {
      enabled: true,
      speed: 1.9,
      radius: 140,
      radiusY: 100,
      shape: "circle",
      strength: 0.6,
      minOpacity: 0.45,
      maxOpacity: 1,
      affectHover: true,
      affectImage: true,
      affectText: true
    },
    autoMorph: {
      enabled: false,
      holdImageMs: 100,
      holdTextMs: 100,
      morphDurationMs: 100,
      intervalMs: 1050
    },
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
      defaultTransition: {
        mode: "fade",
        durationMs: 900,
        seed: 1337
      },
        items: [
          {
            type: "text",
            id: "text-1",
            text: "HERZA",
            centerX: 400,
            centerY: 300,
            font: "bold 140px Arial",
            strength: 0.9,
            blurRadius: 2
          },
          {
            type: "image",
            id: "image-1",
            src: "/src/assets/cat.png",
            centerX: 400,
            centerY: 300,
            scale: 2,
            sampleMode: "threshold",
            strength: 1.4
          },
          {
            type: "text",
            id: "text-2",
            text: "GRID",
            centerX: 400,
            centerY: 300,
            font: "bold 130px Arial",
            strength: 0.9,
            blurRadius: 2
          },
          {
            type: "image",
            id: "image-2",
            src: "/src/assets/cat.png",
            centerX: 400,
            centerY: 300,
            scale: 1.8,
            sampleMode: "invert",
            strength: 1.2
          }
        ],
        steps: [
          {
            mask: "text",
            assetId: "text-1",
            holdMs: 1100,
            transition: {
              mode: "fade",
              durationMs: 850,
              seed: 1101
            }
          },
          {
            mask: "image",
            assetId: "image-1",
            holdMs: 1100,
            transition: {
              mode: "fade",
              durationMs: 850,
              seed: 2201
            }
          },
          {
            mask: "text",
            assetId: "text-2",
            holdMs: 1100,
            transition: {
              mode: "dissolve",
              durationMs: 850,
              seed: 3301
            }
          },
          {
            mask: "image",
            assetId: "image-2",
            holdMs: 1100,
            transition: {
              mode: "morph",
              durationMs: 850,
              seed: 4401
            }
          }
        ]
      },
      initialMask: "text",
      imageMasks: [
        {
          id: "image-1",
          src: "/src/assets/cat.png",
          centerX: 400,
          centerY: 300,
          scale: 2,
          sampleMode: "threshold",
          strength: 1.4
        },
        {
          id: "image-2",
          src: "/src/assets/cat.png",
          centerX: 400,
          centerY: 300,
          scale: 1.8,
          sampleMode: "invert",
          strength: 1.2
        }
      ],
      textMasks: [
        {
          id: "text-1",
          text: "HERZA",
          centerX: 400,
          centerY: 300,
          font: "bold 140px Arial",
          strength: 0.9,
          blurRadius: 2
        },
        {
          id: "text-2",
          text: "GRID",
          centerX: 400,
          centerY: 300,
          font: "bold 130px Arial",
          strength: 0.9,
          blurRadius: 2
        }
      ],
      imageMask: {
        src: "/src/assets/cat.png",
        centerX: 400,
      centerY: 300,
      scale: 2,
      sampleMode: "threshold",
      strength: 1.4
    },
    textMask: {
      text: "HERZA",
      centerX: 400,
      centerY: 300,
      font: "bold 140px Arial",
      strength: 0.9,
      blurRadius: 2
    },
    organicRadius: 500,
    organicStrength: 0.2,
    organicSpeed: 0.009
  };
}

const state: PlaygroundState = {
  preset: "card-soft",
  config: createPresetConfig("card-soft"),
  influenceOptions: {
    ripple: true,
    hover: true,
    organic: false
  },
  pageColor: "#0b1020",
  webUtilities: {
    scrollReactive: {
      enabled: false,
      intensity: 1,
      direction: "both",
      edge: "leading",
      cooldownMs: 90,
      maxBurstRipples: 3,
      respectReducedMotion: true
    },
    sectionTransition: {
      enabled: false,
      preset: "fade",
      amount: 24,
      progress: 1,
      rippleOnEnter: true,
      playTimelineOnEnter: true,
      pauseTimelineOnExit: false
    },
    themeSync: {
      enabled: false,
      mode: "dark",
      followSystem: true,
      brandColors: ["#0f766e", "#14b8a6", "#2dd4bf"],
      brandCanvasBackground: "#0b1220",
      brandHoverTintPalette: ["#5eead4", "#99f6e4", "#ccfbf1"],
      brandRippleTintPalette: ["#2dd4bf", "#5eead4", "#99f6e4"]
    },
    statePreset: {
      enabled: false,
      value: "idle"
    },
    debugHud: {
      enabled: false,
      position: "top-left",
      updateIntervalMs: 200,
      showFps: true,
      showQuality: true,
      showLoop: true,
      showCells: true,
      showRipples: true,
      showTimeline: true
    }
  },
  timelineAssets: {
    text1Id: "text-1",
    text2Id: "text-2",
    image1Id: "image-1",
    image2Id: "image-2",
    text1: createPresetConfig("card-soft").textMask?.text ?? "TEXT 1",
    text2: "TEXT 2",
    text1FontFamily: "Arial",
    text2FontFamily: "Arial",
    text1FontSize: 140,
    text2FontSize: 130,
    image1: createPresetConfig("card-soft").imageMask?.src ?? "/src/assets/cat.png",
    image2: createPresetConfig("card-soft").imageMask?.src ?? "/src/assets/cat.png",
    image1Scale: createPresetConfig("card-soft").imageMask?.scale ?? 2,
    image2Scale: createPresetConfig("card-soft").imageMask?.scale ?? 2,
    image1SampleMode: createPresetConfig("card-soft").imageMask?.sampleMode ?? "threshold",
    image2SampleMode: createPresetConfig("card-soft").imageMask?.sampleMode ?? "threshold",
    image1ObjectUrl: null,
    image2ObjectUrl: null
  }
};

function resolveThemeMode(): "light" | "dark" | "brand" | null {
  const theme = state.webUtilities.themeSync;
  if (!theme.enabled) return null;
  if (theme.mode === "brand") return "brand";
  if (!theme.followSystem) return theme.mode;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeSyncOverrides(config: PixelGridConfig): PixelGridConfig {
  const mode = resolveThemeMode();
  if (!mode) return config;

  if (mode === "light") {
    config.colors = ["#cbd5e1", "#94a3b8", "#64748b"];
    config.canvasBackground = "#f8fafc";
    config.hoverEffects = {
      ...config.hoverEffects,
      tintPalette: ["#64748b", "#475569", "#334155"]
    };
    config.rippleEffects = {
      ...config.rippleEffects,
      tintPalette: ["#0f172a", "#334155", "#475569"]
    };
    return config;
  }

  if (mode === "dark") {
    config.colors = ["#334155", "#475569", "#64748b"];
    config.canvasBackground = "#0b1220";
    config.hoverEffects = {
      ...config.hoverEffects,
      tintPalette: ["#94a3b8", "#cbd5e1", "#f8fafc"]
    };
    config.rippleEffects = {
      ...config.rippleEffects,
      tintPalette: ["#f8fafc", "#cbd5e1", "#94a3b8"]
    };
    return config;
  }

  const theme = state.webUtilities.themeSync;
  config.colors = [...theme.brandColors];
  config.canvasBackground = theme.brandCanvasBackground;
  config.hoverEffects = {
    ...config.hoverEffects,
    tintPalette: [...theme.brandHoverTintPalette]
  };
  config.rippleEffects = {
    ...config.rippleEffects,
    tintPalette: [...theme.brandRippleTintPalette]
  };
  config.effects = {
    ...config.effects,
    paletteCycle: {
      ...config.effects?.paletteCycle,
      enabled: true,
      speed: config.effects?.paletteCycle?.speed ?? 0.55,
      scope: config.effects?.paletteCycle?.scope ?? "activeOnly",
      palette: [...theme.brandColors]
    }
  };
  return config;
}

function applyStatePresetOverrides(config: PixelGridConfig): PixelGridConfig {
  const presetState = state.webUtilities.statePreset;
  if (!presetState.enabled) return config;

  if (presetState.value === "idle") {
    config.effects = {
      ...config.effects,
      paletteCycle: {
        ...config.effects?.paletteCycle,
        enabled: false
      }
    };
    return config;
  }

  if (presetState.value === "hover") {
    config.hoverEffects = {
      ...config.hoverEffects,
      mode: "reactive",
      strength: 1.1,
      displace: 3,
      jitter: 1
    };
    return config;
  }

  if (presetState.value === "active") {
    config.rippleEffects = {
      ...config.rippleEffects,
      enabled: true,
      strength: 34,
      maxRipples: 48
    };
    config.effects = {
      ...config.effects,
      shockwaveBurst: {
        ...config.effects?.shockwaveBurst,
        enabled: true,
        triggerMode: "both",
        strength: 0.55
      }
    };
    return config;
  }

  if (presetState.value === "success") {
    config.colors = ["#14532d", "#16a34a", "#22c55e"];
    config.effects = {
      ...config.effects,
      paletteCycle: {
        ...config.effects?.paletteCycle,
        enabled: true,
        speed: 0.55,
        scope: "activeOnly",
        palette: ["#166534", "#22c55e", "#86efac"]
      }
    };
    return config;
  }

  if (presetState.value === "error") {
    config.colors = ["#7f1d1d", "#b91c1c", "#ef4444"];
    config.effects = {
      ...config.effects,
      paletteCycle: {
        ...config.effects?.paletteCycle,
        enabled: true,
        speed: 0.6,
        scope: "activeOnly",
        palette: ["#991b1b", "#ef4444", "#fca5a5"]
      }
    };
    return config;
  }

  config.effects = {
    ...config.effects,
    paletteCycle: {
      ...config.effects?.paletteCycle,
      enabled: true,
      speed: 0.9,
      scope: "all",
      palette: ["#1e3a8a", "#2563eb", "#60a5fa"]
    }
  };
  config.breathing = {
    ...config.breathing,
    enabled: true,
    speed: 1.4
  };
  return config;
}

function buildEffectiveConfig(): PixelGridConfig {
  const effective = cloneConfig(state.config);
  return applyStatePresetOverrides(applyThemeSyncOverrides(effective));
}

function buildSectionTransitionStyle(progress: number): { opacity: string; transform: string } {
  const transition = state.webUtilities.sectionTransition;
  const p = clamp(progress, 0, 1);
  if (!transition.enabled) {
    return { opacity: "1", transform: "translate3d(0, 0, 0)" };
  }

  if (transition.preset === "fade") {
    return { opacity: (0.15 + p * 0.85).toFixed(4), transform: "translate3d(0, 0, 0)" };
  }

  if (transition.preset === "zoom") {
    const delta = clamp(transition.amount / 420, 0.02, 0.12);
    const scale = 1 - (1 - p) * delta;
    return {
      opacity: (0.2 + p * 0.8).toFixed(4),
      transform: `translate3d(0, 0, 0) scale(${scale.toFixed(4)})`
    };
  }

  const y = (1 - p) * transition.amount;
  return {
    opacity: (0.15 + p * 0.85).toFixed(4),
    transform: `translate3d(0, ${y.toFixed(2)}px, 0)`
  };
}

function applySectionTransitionPreview(): void {
  const style = buildSectionTransitionStyle(state.webUtilities.sectionTransition.progress);
  canvas.style.opacity = style.opacity;
  canvas.style.transform = style.transform;
  canvas.style.transition = "opacity 160ms linear, transform 160ms linear";
  canvas.style.willChange = "opacity, transform";
}

document.body.style.backgroundColor = state.pageColor;
document.body.style.margin = "0";
document.body.style.minHeight = "100vh";
document.body.style.display = "flex";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.boxSizing = "border-box";
document.body.style.paddingLeft = "396px";
document.body.style.paddingRight = "396px";
canvas.style.display = "block";
canvas.style.maxWidth = "min(62vw, 800px)";
canvas.style.maxHeight = "90vh";
canvas.style.borderRadius = "10px";
canvas.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.35)";

syncTimelineMasksIntoConfig();

let effect = new PixelGridEffect(
  engine,
  width,
  height,
  buildEffectiveConfig(),
  { ...state.influenceOptions }
);
engine.addEntity(effect);
applySectionTransitionPreview();

function rebuildEffect(): void {
  syncTimelineMasksIntoConfig();
  if (state.config.maskTimeline) {
    ensureTimelineConfig();
  }
  engine.removeEntity(effect);
  effect = new PixelGridEffect(
    engine,
    width,
    height,
    buildEffectiveConfig(),
    { ...state.influenceOptions }
  );
  engine.addEntity(effect);
  applySectionTransitionPreview();
}

type TimelineMaskType = "image" | "text";

type TimelineStep = {
  mask: TimelineMaskType;
  maskType?: TimelineMaskType;
  assetId?: string;
  maskId?: string;
  holdMs: number;
  mode?: "morph" | "fade" | "dissolve";
  durationMs?: number;
  transition: {
    mode: "morph" | "fade" | "dissolve";
    durationMs: number;
    seed: number;
  };
};

function sanitizeMaskId(raw: string, fallback: string): string {
  const next = raw.trim();
  return next.length > 0 ? next : fallback;
}

function parseFontDefinition(
  font: string | undefined,
  fallbackSize: number,
  fallbackFamily: string
): { size: number; family: string; weight: string } {
  if (!font || !font.trim()) {
    return {
      size: fallbackSize,
      family: fallbackFamily,
      weight: "bold"
    };
  }

  const trimmed = font.trim();
  const sizeMatch = trimmed.match(/(\d+(?:\.\d+)?)px/);
  const size = sizeMatch ? Math.max(8, Number(sizeMatch[1])) : fallbackSize;
  const family = sizeMatch
    ? trimmed.slice(sizeMatch.index! + sizeMatch[0].length).trim() || fallbackFamily
    : fallbackFamily;
  const prefix = sizeMatch
    ? trimmed.slice(0, sizeMatch.index).trim()
    : "";
  const weight = prefix.length > 0 ? prefix : "bold";

  return { size, family, weight };
}

function composeFont(weight: string, size: number, family: string): string {
  return `${weight} ${Math.max(8, Math.round(size))}px ${family.trim() || "Arial"}`;
}

function createDefaultTimelineStep(mask: TimelineMaskType, seed: number, assetId: string): TimelineStep {
  return {
    mask,
    maskType: mask,
    assetId,
    holdMs: 1200,
    transition: {
      mode: "morph",
      durationMs: 900,
      seed
    }
  };
}

function syncTimelineMasksIntoConfig(): void {
  const centerX = state.config.imageMask?.centerX ?? state.config.textMask?.centerX ?? width * 0.5;
  const centerY = state.config.imageMask?.centerY ?? state.config.textMask?.centerY ?? height * 0.5;
  const fallbackTextFont = parseFontDefinition(state.config.textMask?.font, 140, "Arial");

  const text1Id = sanitizeMaskId(state.timelineAssets.text1Id, "text-1");
  const text2Id = sanitizeMaskId(state.timelineAssets.text2Id, "text-2");
  const image1Id = sanitizeMaskId(state.timelineAssets.image1Id, "image-1");
  const image2Id = sanitizeMaskId(state.timelineAssets.image2Id, "image-2");

  state.timelineAssets.text1Id = text1Id;
  state.timelineAssets.text2Id = text2Id;
  state.timelineAssets.image1Id = image1Id;
  state.timelineAssets.image2Id = image2Id;

  const text1FontFamily = state.timelineAssets.text1FontFamily?.trim() || fallbackTextFont.family;
  const text2FontFamily = state.timelineAssets.text2FontFamily?.trim() || fallbackTextFont.family;
  const text1FontSize = Number.isFinite(state.timelineAssets.text1FontSize)
    ? Math.max(8, state.timelineAssets.text1FontSize)
    : fallbackTextFont.size;
  const text2FontSize = Number.isFinite(state.timelineAssets.text2FontSize)
    ? Math.max(8, state.timelineAssets.text2FontSize)
    : fallbackTextFont.size;

  state.timelineAssets.text1FontFamily = text1FontFamily;
  state.timelineAssets.text2FontFamily = text2FontFamily;
  state.timelineAssets.text1FontSize = text1FontSize;
  state.timelineAssets.text2FontSize = text2FontSize;

  state.config.textMasks = [
    {
      id: text1Id,
      text: state.timelineAssets.text1 || "TEXT 1",
      centerX,
      centerY,
      font: composeFont(fallbackTextFont.weight, text1FontSize, text1FontFamily),
      strength: state.config.textMask?.strength ?? 0.9,
      blurRadius: state.config.textMask?.blurRadius ?? 2
    },
    {
      id: text2Id,
      text: state.timelineAssets.text2 || "TEXT 2",
      centerX,
      centerY,
      font: composeFont(fallbackTextFont.weight, text2FontSize, text2FontFamily),
      strength: state.config.textMask?.strength ?? 0.9,
      blurRadius: state.config.textMask?.blurRadius ?? 2
    }
  ];

  state.config.imageMasks = [
    {
      id: image1Id,
      src: state.timelineAssets.image1,
      centerX,
      centerY,
      scale: state.timelineAssets.image1Scale,
      sampleMode: state.timelineAssets.image1SampleMode,
      strength: state.config.imageMask?.strength ?? 1.4
    },
    {
      id: image2Id,
      src: state.timelineAssets.image2,
      centerX,
      centerY,
      scale: state.timelineAssets.image2Scale,
      sampleMode: state.timelineAssets.image2SampleMode,
      strength: state.config.imageMask?.strength ?? 1.4
    }
  ];

  // Keep legacy singles for compatibility in export/tests and preset fallback behavior.
  state.config.textMask = {
    ...(state.config.textMask ?? {}),
    ...state.config.textMasks[0]
  };
  state.config.imageMask = {
    ...(state.config.imageMask ?? {}),
    ...state.config.imageMasks[0]
  };
}

function buildTimelineItemsFromAssets(): NonNullable<NonNullable<PixelGridConfig["maskTimeline"]>["items"]> {
  const text1Id = sanitizeMaskId(state.timelineAssets.text1Id, "text-1");
  const text2Id = sanitizeMaskId(state.timelineAssets.text2Id, "text-2");
  const image1Id = sanitizeMaskId(state.timelineAssets.image1Id, "image-1");
  const image2Id = sanitizeMaskId(state.timelineAssets.image2Id, "image-2");

  const textMasks = state.config.textMasks ?? [];
  const imageMasks = state.config.imageMasks ?? [];

  const textById = new Map(textMasks.map((mask) => [mask.id, mask]));
  const imageById = new Map(imageMasks.map((mask) => [mask.id, mask]));

  const orderedItems: NonNullable<NonNullable<PixelGridConfig["maskTimeline"]>["items"]> = [];

  const text1 = textById.get(text1Id);
  const image1 = imageById.get(image1Id);
  const text2 = textById.get(text2Id);
  const image2 = imageById.get(image2Id);

  if (text1) orderedItems.push({ type: "text", ...text1 });
  if (image1) orderedItems.push({ type: "image", ...image1 });
  if (text2) orderedItems.push({ type: "text", ...text2 });
  if (image2) orderedItems.push({ type: "image", ...image2 });

  return orderedItems;
}

function getDefaultAssetIdForStep(mask: TimelineMaskType, stepIndex: number): string {
  if (mask === "text") {
    return stepIndex === 0 || stepIndex === 2
      ? sanitizeMaskId(state.timelineAssets.text1Id, "text-1")
      : sanitizeMaskId(state.timelineAssets.text2Id, "text-2");
  }

  return stepIndex === 1 || stepIndex === 3
    ? sanitizeMaskId(state.timelineAssets.image1Id, "image-1")
    : sanitizeMaskId(state.timelineAssets.image2Id, "image-2");
}

function ensureTimelineConfig(): NonNullable<PixelGridConfig["maskTimeline"]> {
  const text1Id = sanitizeMaskId(state.timelineAssets.text1Id, "text-1");
  const text2Id = sanitizeMaskId(state.timelineAssets.text2Id, "text-2");
  const image1Id = sanitizeMaskId(state.timelineAssets.image1Id, "image-1");
  const image2Id = sanitizeMaskId(state.timelineAssets.image2Id, "image-2");

  syncTimelineMasksIntoConfig();

  if (!state.config.maskTimeline) {
    state.config.maskTimeline = {
      enabled: true,
      autoplay: true,
      loop: true,
      initialStep: 0,
      defaultTransition: {
        mode: "morph",
        durationMs: 900,
        seed: 1337
      },
      items: buildTimelineItemsFromAssets(),
      steps: [
        createDefaultTimelineStep("text", 1401, text1Id),
        createDefaultTimelineStep("image", 2401, image1Id),
        createDefaultTimelineStep("text", 3401, text2Id),
        createDefaultTimelineStep("image", 4401, image2Id)
      ]
    };
  }

  if (!state.config.maskTimeline.defaultTransition) {
    state.config.maskTimeline.defaultTransition = {
      mode: "morph",
      durationMs: 900,
      seed: 1337
    };
  }
  state.config.maskTimeline.items = buildTimelineItemsFromAssets();

  if (!state.config.maskTimeline.steps || state.config.maskTimeline.steps.length === 0) {
    state.config.maskTimeline.steps = [
      createDefaultTimelineStep("text", 1401, text1Id),
      createDefaultTimelineStep("image", 2401, image1Id),
      createDefaultTimelineStep("text", 3401, text2Id),
      createDefaultTimelineStep("image", 4401, image2Id)
    ];
  }

  const defaultIds: string[] = [text1Id, image1Id, text2Id, image2Id];
  const defaultTypes: TimelineMaskType[] = ["text", "image", "text", "image"];

  while (state.config.maskTimeline.steps.length < 4) {
    const nextIndex = state.config.maskTimeline.steps.length;
    const nextType = defaultTypes[nextIndex] ?? (nextIndex % 2 === 0 ? "text" : "image");
    state.config.maskTimeline.steps.push(
      createDefaultTimelineStep(
        nextType,
        2401 + nextIndex * 97,
        defaultIds[nextIndex] ?? (nextType === "text" ? text1Id : image1Id)
      )
    );
  }
  if (state.config.maskTimeline.steps.length > 4) {
    state.config.maskTimeline.steps = state.config.maskTimeline.steps.slice(0, 4);
  }

  for (let i = 0; i < state.config.maskTimeline.steps.length; i++) {
    const step = state.config.maskTimeline.steps[i] as TimelineStep;
    const fallbackType = defaultTypes[i] ?? "text";
    const resolvedType = (step.maskType ?? step.mask ?? fallbackType) as TimelineMaskType;

    step.mask = resolvedType;
    step.maskType = resolvedType;

    const resolvedAssetId = typeof step.assetId === "string" && step.assetId.trim()
      ? step.assetId.trim()
      : typeof step.maskId === "string" && step.maskId.trim()
        ? step.maskId.trim()
        : defaultIds[i] ?? (resolvedType === "text" ? text1Id : image1Id);

    step.assetId = resolvedAssetId;
    step.maskId = resolvedAssetId;

    if (!step.transition) {
      step.transition = {
        mode: step.mode ?? state.config.maskTimeline.defaultTransition?.mode ?? "morph",
        durationMs: step.durationMs ?? state.config.maskTimeline.defaultTransition?.durationMs ?? 900,
        seed: (state.config.maskTimeline.defaultTransition?.seed ?? 1337) + i * 97
      };
    }
  }

  return state.config.maskTimeline;
}

function applyTimelineV2Demo(): void {
  const text1Id = sanitizeMaskId(state.timelineAssets.text1Id, "text-1");
  const text2Id = sanitizeMaskId(state.timelineAssets.text2Id, "text-2");
  const image1Id = sanitizeMaskId(state.timelineAssets.image1Id, "image-1");
  const image2Id = sanitizeMaskId(state.timelineAssets.image2Id, "image-2");

  const timeline = ensureTimelineConfig();
  timeline.enabled = true;
  timeline.autoplay = true;
  timeline.loop = true;
  timeline.initialStep = 0;
  timeline.defaultTransition = {
    mode: "morph",
    durationMs: 700,
    seed: 1337
  };
  timeline.items = buildTimelineItemsFromAssets();
  timeline.steps = [
    { mask: "text", assetId: text1Id, holdMs: 1100, mode: "morph", durationMs: 700 },
    { mask: "image", assetId: image1Id, holdMs: 1000, mode: "fade", durationMs: 450 },
    { mask: "text", assetId: text2Id, holdMs: 1100, mode: "dissolve", durationMs: 620 },
    { mask: "image", assetId: image2Id, holdMs: 1000, mode: "fade", durationMs: 450 }
  ] as TimelineStep[];

  rebuildEffect();
  renderTimelineStepEditors();
  updateTimelinePreview();
  updateRuntimeStats();
}

function replaceTimelineImage(slot: 1 | 2, file: File): void {
  const objectUrl = URL.createObjectURL(file);
  if (slot === 1) {
    if (state.timelineAssets.image1ObjectUrl) {
      URL.revokeObjectURL(state.timelineAssets.image1ObjectUrl);
    }
    state.timelineAssets.image1ObjectUrl = objectUrl;
    state.timelineAssets.image1 = objectUrl;
  } else {
    if (state.timelineAssets.image2ObjectUrl) {
      URL.revokeObjectURL(state.timelineAssets.image2ObjectUrl);
    }
    state.timelineAssets.image2ObjectUrl = objectUrl;
    state.timelineAssets.image2 = objectUrl;
  }

  syncTimelineMasksIntoConfig();
  rebuildEffect();
  updateTimelinePreview();
}

function createPanel(side: "left" | "right", title: string, topOffset = 12): HTMLDivElement {
  const panel = document.createElement("div");
  panel.style.position = "fixed";
  panel.style.top = `${topOffset}px`;
  panel.style[side] = "12px";
  panel.style.zIndex = "9999";
  panel.style.padding = "12px";
  panel.style.borderRadius = "10px";
  panel.style.background = "rgba(15, 23, 42, 0.92)";
  panel.style.color = "#e2e8f0";
  panel.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
  panel.style.fontSize = "12px";
  panel.style.display = "grid";
  panel.style.gap = "10px";
  panel.style.minWidth = "320px";
  panel.style.maxWidth = "360px";
  panel.style.maxHeight = "94vh";
  panel.style.overflow = "auto";
  panel.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.35)";

  const header = document.createElement("div");
  header.textContent = title;
  header.style.fontWeight = "700";
  header.style.fontSize = "13px";
  panel.appendChild(header);
  return panel;
}

const controlsPanel = createPanel("right", "Controls", 12);
const leftPanel = createPanel("left", "Effects / Runtime / I/O", 12);

const refreshers: Array<() => void> = [];

function layoutLeftPanels(): void {
  // Single left panel.
}

function createSection(title: string): HTMLDivElement {
  const section = document.createElement("div");
  section.style.display = "grid";
  section.style.gap = "6px";
  section.style.paddingTop = "6px";
  section.style.borderTop = "1px solid rgba(148, 163, 184, 0.25)";

  const label = document.createElement("div");
  label.textContent = title;
  label.style.fontWeight = "700";
  label.style.color = "#93c5fd";
  section.appendChild(label);
  return section;
}

function createRow(title: string): { row: HTMLLabelElement; value: HTMLSpanElement } {
  const row = document.createElement("label");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "1fr auto";
  row.style.alignItems = "center";
  row.style.gap = "8px";

  const name = document.createElement("span");
  name.textContent = title;
  row.appendChild(name);

  const value = document.createElement("span");
  value.style.color = "#cbd5e1";
  row.appendChild(value);
  return { row, value };
}

function addRangeControl(
  section: HTMLElement,
  label: string,
  min: number,
  max: number,
  step: number,
  getValue: () => number,
  setValue: (value: number) => void
): void {
  const row = createRow(label);
  const wrapper = document.createElement("div");
  wrapper.style.display = "grid";
  wrapper.style.gap = "4px";
  wrapper.appendChild(row.row);

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  const sync = () => {
    const value = getValue();
    input.value = String(value);
    row.value.textContent = String(value);
  };
  sync();
  refreshers.push(sync);

  input.addEventListener("input", () => {
    const next = Number(input.value);
    setValue(next);
    row.value.textContent = String(next);
    rebuildEffect();
    updateTimelinePreview();
  });

  wrapper.appendChild(input);
  section.appendChild(wrapper);
}

function addCheckboxControl(
  section: HTMLElement,
  label: string,
  getValue: () => boolean,
  setValue: (value: boolean) => void
): void {
  const row = document.createElement("label");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.justifyContent = "space-between";
  row.style.gap = "8px";

  const name = document.createElement("span");
  name.textContent = label;
  row.appendChild(name);

  const input = document.createElement("input");
  input.type = "checkbox";
  const sync = () => {
    input.checked = getValue();
  };
  sync();
  refreshers.push(sync);
  input.addEventListener("change", () => {
    setValue(input.checked);
    rebuildEffect();
    updateTimelinePreview();
  });
  row.appendChild(input);
  section.appendChild(row);
}

function addSelectControl(
  section: HTMLElement,
  label: string,
  options: string[],
  getValue: () => string,
  setValue: (value: string) => void
): void {
  const row = createRow(label);
  const select = document.createElement("select");
  select.style.gridColumn = "1 / -1";
  select.style.background = "#111827";
  select.style.color = "#e5e7eb";
  select.style.border = "1px solid rgba(148, 163, 184, 0.4)";
  select.style.borderRadius = "6px";
  select.style.padding = "4px 6px";

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = option;
    select.appendChild(element);
  }

  const sync = () => {
    const value = getValue();
    select.value = value;
    row.value.textContent = value;
  };

  sync();
  refreshers.push(sync);
  select.addEventListener("change", () => {
    setValue(select.value);
    sync();
    rebuildEffect();
    updateTimelinePreview();
  });

  row.row.appendChild(select);
  section.appendChild(row.row);
}

function addColorControl(
  section: HTMLElement,
  label: string,
  getValue: () => string,
  setValue: (value: string) => void,
  onApply: () => void
): void {
  const row = createRow(label);
  const input = document.createElement("input");
  input.type = "color";
  const normalizeColor = (value: string): string => {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
      const hex = value.slice(1);
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
    return "#000000";
  };
  const sync = () => {
    const value = normalizeColor(getValue());
    input.value = value;
    row.value.textContent = value;
  };
  sync();
  refreshers.push(sync);
  input.addEventListener("input", () => {
    setValue(input.value);
    row.value.textContent = input.value;
    onApply();
  });
  row.row.appendChild(input);
  section.appendChild(row.row);
}

const DEFAULT_PIXEL_COLORS = ["#334155", "#475569", "#64748b"];
const DEFAULT_HOVER_TINTS = ["#94a3b8", "#cbd5e1", "#ffffff"];
const DEFAULT_RIPPLE_TINTS = ["#f8fafc", "#cbd5e1", "#94a3b8"];
const DEFAULT_EFFECT_PALETTE = ["#334155", "#38bdf8", "#f59e0b"];

function readPaletteColor(
  palette: string[] | undefined,
  index: number,
  fallbacks: string[]
): string {
  return palette?.[index] ?? fallbacks[index] ?? "#ffffff";
}

function writePaletteColor(
  palette: string[] | undefined,
  index: number,
  value: string,
  fallbacks: string[]
): string[] {
  const next = [...(palette ?? [])];
  for (let i = next.length; i <= index; i++) {
    next[i] = fallbacks[i] ?? "#ffffff";
  }
  next[index] = value;
  return next;
}

function readEffectPaletteColor(index: number): string {
  const fallback =
    state.config.colors[index] ??
    DEFAULT_EFFECT_PALETTE[index] ??
    "#ffffff";
  return state.config.effects?.paletteCycle?.palette?.[index] ?? fallback;
}

function addTextControl(
  section: HTMLElement,
  label: string,
  getValue: () => string,
  setValue: (value: string) => void,
  onApply: () => void
): void {
  const row = createRow(label);
  const input = document.createElement("input");
  input.type = "text";
  input.style.gridColumn = "1 / -1";
  input.style.background = "#111827";
  input.style.color = "#e5e7eb";
  input.style.border = "1px solid rgba(148, 163, 184, 0.4)";
  input.style.borderRadius = "6px";
  input.style.padding = "4px 6px";

  const sync = () => {
    const value = getValue();
    input.value = value;
    row.value.textContent = value.length > 18 ? `${value.slice(0, 18)}…` : value;
  };
  sync();
  refreshers.push(sync);
  input.addEventListener("change", () => {
    setValue(input.value);
    onApply();
    sync();
  });
  row.row.appendChild(input);
  section.appendChild(row.row);
}

let debugHudElement: HTMLDivElement | null = null;
let debugHudIntervalId: number | null = null;
let scrollReactiveLastTriggerMs = 0;
let scrollReactiveLastY = typeof window !== "undefined" ? window.scrollY || window.pageYOffset || 0 : 0;

function resolveScrollOriginY(edge: "leading" | "trailing" | "center", direction: "up" | "down"): number {
  if (edge === "center") return height * 0.5;
  const top = 2;
  const bottom = Math.max(2, height - 2);
  if (edge === "leading") {
    return direction === "down" ? bottom : top;
  }
  return direction === "down" ? top : bottom;
}

function triggerScrollReactiveBurst(deltaY: number): void {
  const options = state.webUtilities.scrollReactive;
  if (!options.enabled) return;
  if (options.respectReducedMotion && shouldReduceMotion()) return;
  if (!state.influenceOptions.ripple) return;

  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - scrollReactiveLastTriggerMs < options.cooldownMs) return;
  if (Math.abs(deltaY) < 0.5) return;

  const direction: "up" | "down" = deltaY > 0 ? "down" : "up";
  if (options.direction !== "both" && options.direction !== direction) return;

  const normalizedIntensity = clamp((Math.abs(deltaY) / 120) * options.intensity, 0, 1);
  if (normalizedIntensity <= 0.01) return;

  const rippleCount = Math.max(
    1,
    Math.round(1 + normalizedIntensity * (Math.max(1, options.maxBurstRipples) - 1))
  );
  const centerX = width * 0.5;
  const spread = Math.max(8, width * 0.18 * normalizedIntensity);
  const originY = resolveScrollOriginY(options.edge, direction);

  for (let index = 0; index < rippleCount; index++) {
    const ratio = rippleCount === 1 ? 0.5 : index / (rippleCount - 1);
    const offset = (ratio - 0.5) * 2 * spread;
    const x = clamp(centerX + offset, 0, width);
    effect.triggerRipple(x, originY);
  }

  scrollReactiveLastTriggerMs = now;
}

function ensureDebugHudElement(): HTMLDivElement {
  if (debugHudElement) return debugHudElement;

  const hud = document.createElement("div");
  hud.setAttribute("data-playground-debug-hud", "true");
  hud.style.position = "fixed";
  hud.style.zIndex = "2147483647";
  hud.style.pointerEvents = "none";
  hud.style.background = "rgba(2, 6, 23, 0.86)";
  hud.style.border = "1px solid rgba(148, 163, 184, 0.4)";
  hud.style.borderRadius = "8px";
  hud.style.padding = "8px 10px";
  hud.style.color = "#e2e8f0";
  hud.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
  hud.style.fontSize = "11px";
  hud.style.lineHeight = "1.45";
  hud.style.whiteSpace = "pre";
  document.body.appendChild(hud);
  debugHudElement = hud;
  return hud;
}

function hideDebugHud(): void {
  if (debugHudIntervalId !== null) {
    window.clearInterval(debugHudIntervalId);
    debugHudIntervalId = null;
  }
  debugHudElement?.remove();
  debugHudElement = null;
}

function positionDebugHud(hud: HTMLDivElement): void {
  const options = state.webUtilities.debugHud;
  const rect = canvas.getBoundingClientRect();
  const offsetX = 10;
  const offsetY = 10;
  const xLeft = rect.left + offsetX;
  const xRight = window.innerWidth - rect.right + offsetX;
  const yTop = rect.top + offsetY;
  const yBottom = window.innerHeight - rect.bottom + offsetY;

  hud.style.left = "";
  hud.style.right = "";
  hud.style.top = "";
  hud.style.bottom = "";

  if (options.position === "top-left") {
    hud.style.left = `${xLeft}px`;
    hud.style.top = `${yTop}px`;
    return;
  }
  if (options.position === "top-right") {
    hud.style.right = `${xRight}px`;
    hud.style.top = `${yTop}px`;
    return;
  }
  if (options.position === "bottom-left") {
    hud.style.left = `${xLeft}px`;
    hud.style.bottom = `${yBottom}px`;
    return;
  }
  hud.style.right = `${xRight}px`;
  hud.style.bottom = `${yBottom}px`;
}

function updateDebugHud(): void {
  const options = state.webUtilities.debugHud;
  if (!options.enabled) {
    hideDebugHud();
    return;
  }

  const hud = ensureDebugHudElement();
  positionDebugHud(hud);

  const snapshot = effect.getDebugSnapshot();
  const loopTuning = engine.getLoopTuning();
  const lines: string[] = ["pixel-engine hud"];

  if (options.showFps) {
    lines.push(`fps: ${engine.getFPS().toFixed(1)}`);
  }
  if (options.showQuality) {
    lines.push(`quality: ${engine.getQuality()}`);
  }
  if (options.showLoop) {
    lines.push(
      `loop: step=${loopTuning.fixedTimeStep.toFixed(2)} maxDelta=${loopTuning.maxDelta} maxUpdates=${loopTuning.maxUpdatesPerFrame}`
    );
  }
  if (options.showCells) {
    lines.push(`cells: ${snapshot.activeCells}/${snapshot.totalCells}`);
  }
  if (options.showRipples) {
    lines.push(`ripples: ${snapshot.activeRipples}`);
  }
  if (options.showTimeline) {
    lines.push(`timeline: ${snapshot.timeline.playing ? "playing" : "paused"} step=${snapshot.timeline.stepIndex}`);
  }

  hud.textContent = lines.join("\n");
}

function refreshDebugHudTimer(): void {
  const options = state.webUtilities.debugHud;
  if (!options.enabled) {
    hideDebugHud();
    return;
  }
  if (debugHudIntervalId !== null) {
    window.clearInterval(debugHudIntervalId);
    debugHudIntervalId = null;
  }
  updateDebugHud();
  debugHudIntervalId = window.setInterval(updateDebugHud, clamp(options.updateIntervalMs, 16, 2000));
}

function triggerSectionEnter(): void {
  const options = state.webUtilities.sectionTransition;
  options.progress = 1;
  applySectionTransitionPreview();
  if (options.rippleOnEnter) {
    effect.triggerRipple(width * 0.5, height * 0.5);
  }
  if (options.playTimelineOnEnter) {
    effect.playMaskTimeline();
  }
  updateRuntimeStats();
}

function triggerSectionExit(): void {
  const options = state.webUtilities.sectionTransition;
  options.progress = 0;
  applySectionTransitionPreview();
  if (options.pauseTimelineOnExit) {
    effect.pauseMaskTimeline();
  }
  updateRuntimeStats();
}

window.addEventListener("wheel", (event) => {
  triggerScrollReactiveBurst(event.deltaY);
}, { passive: true });

window.addEventListener("scroll", () => {
  const nextY = window.scrollY || window.pageYOffset || 0;
  const deltaY = nextY - scrollReactiveLastY;
  scrollReactiveLastY = nextY;
  triggerScrollReactiveBurst(deltaY);
}, { passive: true });

const effectsSection = createSection("Effect Pack v1.1");

addCheckboxControl(
  effectsSection,
  "paletteCycle enabled",
  () => !!state.config.effects?.paletteCycle?.enabled,
  (value) => {
    const hasCustomPalette =
      (state.config.effects?.paletteCycle?.palette?.length ?? 0) > 0;
    const paletteDefaults = state.config.effects?.paletteCycle ?? {
      speed: 0.7,
      scope: "all" as const,
      activationThreshold: 0.01,
      palette: [...DEFAULT_EFFECT_PALETTE]
    };

    state.config.effects = {
      ...state.config.effects,
      paletteCycle: {
        ...paletteDefaults,
        ...(hasCustomPalette
          ? {}
          : { palette: [...DEFAULT_EFFECT_PALETTE] }),
        scope: state.config.effects?.paletteCycle?.scope ?? "all",
        enabled: value
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "palette speed",
  0,
  4,
  0.01,
  () => state.config.effects?.paletteCycle?.speed ?? 0.7,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      paletteCycle: {
        ...state.config.effects?.paletteCycle,
        speed: value
      }
    };
  }
);

addSelectControl(
  effectsSection,
  "palette scope",
  ["activeOnly", "all"],
  () => state.config.effects?.paletteCycle?.scope ?? "all",
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      paletteCycle: {
        ...state.config.effects?.paletteCycle,
        scope: value as "activeOnly" | "all"
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "palette threshold",
  0,
  0.2,
  0.001,
  () => state.config.effects?.paletteCycle?.activationThreshold ?? 0.025,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      paletteCycle: {
        ...state.config.effects?.paletteCycle,
        activationThreshold: value
      }
    };
  }
);

addColorControl(
  effectsSection,
  "palette color 1",
  () => readEffectPaletteColor(0),
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      paletteCycle: {
        ...state.config.effects?.paletteCycle,
        palette: writePaletteColor(
          state.config.effects?.paletteCycle?.palette,
          0,
          value,
          [readEffectPaletteColor(0), readEffectPaletteColor(1), readEffectPaletteColor(2)]
        )
      }
    };
  },
  () => rebuildEffect()
);

addColorControl(
  effectsSection,
  "palette color 2",
  () => readEffectPaletteColor(1),
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      paletteCycle: {
        ...state.config.effects?.paletteCycle,
        palette: writePaletteColor(
          state.config.effects?.paletteCycle?.palette,
          1,
          value,
          [readEffectPaletteColor(0), readEffectPaletteColor(1), readEffectPaletteColor(2)]
        )
      }
    };
  },
  () => rebuildEffect()
);

addColorControl(
  effectsSection,
  "palette color 3",
  () => readEffectPaletteColor(2),
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      paletteCycle: {
        ...state.config.effects?.paletteCycle,
        palette: writePaletteColor(
          state.config.effects?.paletteCycle?.palette,
          2,
          value,
          [readEffectPaletteColor(0), readEffectPaletteColor(1), readEffectPaletteColor(2)]
        )
      }
    };
  },
  () => rebuildEffect()
);

addCheckboxControl(
  effectsSection,
  "dissolve enabled",
  () => !!state.config.effects?.dissolve?.enabled,
  (value) => {
    const dissolveDefaults = state.config.effects?.dissolve ?? {
      speed: 0.85,
      amount: 0.35,
      scope: "activeOnly" as const,
      activationThreshold: 0.025
    };
    state.config.effects = {
      ...state.config.effects,
      dissolve: {
        ...dissolveDefaults,
        enabled: value
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "dissolve speed",
  0,
  4,
  0.01,
  () => state.config.effects?.dissolve?.speed ?? 0.85,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      dissolve: {
        ...state.config.effects?.dissolve,
        speed: value
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "dissolve amount",
  0,
  1,
  0.01,
  () => state.config.effects?.dissolve?.amount ?? 0.35,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      dissolve: {
        ...state.config.effects?.dissolve,
        amount: value
      }
    };
  }
);

addSelectControl(
  effectsSection,
  "dissolve scope",
  ["activeOnly", "all"],
  () => state.config.effects?.dissolve?.scope ?? "activeOnly",
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      dissolve: {
        ...state.config.effects?.dissolve,
        scope: value as "activeOnly" | "all"
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "dissolve threshold",
  0,
  0.2,
  0.001,
  () => state.config.effects?.dissolve?.activationThreshold ?? 0.025,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      dissolve: {
        ...state.config.effects?.dissolve,
        activationThreshold: value
      }
    };
  }
);

addCheckboxControl(
  effectsSection,
  "shockwave enabled",
  () => !!state.config.effects?.shockwaveBurst?.enabled,
  (value) => {
    const shockwaveDefaults = state.config.effects?.shockwaveBurst ?? {
      speed: 0.85,
      strength: 0.4,
      thickness: 32,
      maxBursts: 16,
      triggerMode: "pointerDown" as const,
      activationThreshold: 0.025
    };
    state.config.effects = {
      ...state.config.effects,
      shockwaveBurst: {
        ...shockwaveDefaults,
        enabled: value
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "shockwave speed",
  0,
  4,
  0.01,
  () => state.config.effects?.shockwaveBurst?.speed ?? 0.85,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      shockwaveBurst: {
        ...state.config.effects?.shockwaveBurst,
        speed: value
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "shockwave strength",
  0,
  2,
  0.01,
  () => state.config.effects?.shockwaveBurst?.strength ?? 0.4,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      shockwaveBurst: {
        ...state.config.effects?.shockwaveBurst,
        strength: value
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "shockwave thickness",
  1,
  160,
  1,
  () => state.config.effects?.shockwaveBurst?.thickness ?? 32,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      shockwaveBurst: {
        ...state.config.effects?.shockwaveBurst,
        thickness: Math.round(value)
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "shockwave maxBursts",
  1,
  64,
  1,
  () => state.config.effects?.shockwaveBurst?.maxBursts ?? 16,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      shockwaveBurst: {
        ...state.config.effects?.shockwaveBurst,
        maxBursts: Math.round(value)
      }
    };
  }
);

addSelectControl(
  effectsSection,
  "shockwave trigger",
  ["pointerDown", "hoverEnter", "both"],
  () => state.config.effects?.shockwaveBurst?.triggerMode ?? "pointerDown",
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      shockwaveBurst: {
        ...state.config.effects?.shockwaveBurst,
        triggerMode: value as "pointerDown" | "hoverEnter" | "both"
      }
    };
  }
);

addRangeControl(
  effectsSection,
  "shockwave threshold",
  0,
  0.2,
  0.001,
  () => state.config.effects?.shockwaveBurst?.activationThreshold ?? 0.025,
  (value) => {
    state.config.effects = {
      ...state.config.effects,
      shockwaveBurst: {
        ...state.config.effects?.shockwaveBurst,
        activationThreshold: value
      }
    };
  }
);

leftPanel.appendChild(effectsSection);

const webUtilitiesSection = createSection("Web Utilities (Phase 10)");

addCheckboxControl(
  webUtilitiesSection,
  "scrollReactive enabled",
  () => state.webUtilities.scrollReactive.enabled,
  (value) => {
    state.webUtilities.scrollReactive.enabled = value;
  }
);

addRangeControl(
  webUtilitiesSection,
  "scroll intensity",
  0,
  4,
  0.05,
  () => state.webUtilities.scrollReactive.intensity,
  (value) => {
    state.webUtilities.scrollReactive.intensity = value;
  }
);

addSelectControl(
  webUtilitiesSection,
  "scroll direction",
  ["both", "down", "up"],
  () => state.webUtilities.scrollReactive.direction,
  (value) => {
    state.webUtilities.scrollReactive.direction = value as "up" | "down" | "both";
  }
);

addSelectControl(
  webUtilitiesSection,
  "scroll edge",
  ["leading", "trailing", "center"],
  () => state.webUtilities.scrollReactive.edge,
  (value) => {
    state.webUtilities.scrollReactive.edge = value as "leading" | "trailing" | "center";
  }
);

addRangeControl(
  webUtilitiesSection,
  "scroll cooldownMs",
  0,
  2000,
  10,
  () => state.webUtilities.scrollReactive.cooldownMs,
  (value) => {
    state.webUtilities.scrollReactive.cooldownMs = Math.round(value);
  }
);

addRangeControl(
  webUtilitiesSection,
  "scroll maxBurst",
  1,
  12,
  1,
  () => state.webUtilities.scrollReactive.maxBurstRipples,
  (value) => {
    state.webUtilities.scrollReactive.maxBurstRipples = Math.max(1, Math.round(value));
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "scroll respect reduced-motion",
  () => state.webUtilities.scrollReactive.respectReducedMotion,
  (value) => {
    state.webUtilities.scrollReactive.respectReducedMotion = value;
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "sectionTransition enabled",
  () => state.webUtilities.sectionTransition.enabled,
  (value) => {
    state.webUtilities.sectionTransition.enabled = value;
    if (!value) {
      state.webUtilities.sectionTransition.progress = 1;
    }
    applySectionTransitionPreview();
  }
);

addSelectControl(
  webUtilitiesSection,
  "transition preset",
  ["fade", "lift", "zoom"],
  () => state.webUtilities.sectionTransition.preset,
  (value) => {
    state.webUtilities.sectionTransition.preset = value as "fade" | "lift" | "zoom";
    applySectionTransitionPreview();
  }
);

addRangeControl(
  webUtilitiesSection,
  "transition amount",
  0,
  120,
  1,
  () => state.webUtilities.sectionTransition.amount,
  (value) => {
    state.webUtilities.sectionTransition.amount = Math.round(value);
    applySectionTransitionPreview();
  }
);

addRangeControl(
  webUtilitiesSection,
  "transition progress",
  0,
  1,
  0.01,
  () => state.webUtilities.sectionTransition.progress,
  (value) => {
    state.webUtilities.sectionTransition.progress = value;
    applySectionTransitionPreview();
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "enter ripple",
  () => state.webUtilities.sectionTransition.rippleOnEnter,
  (value) => {
    state.webUtilities.sectionTransition.rippleOnEnter = value;
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "enter play timeline",
  () => state.webUtilities.sectionTransition.playTimelineOnEnter,
  (value) => {
    state.webUtilities.sectionTransition.playTimelineOnEnter = value;
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "exit pause timeline",
  () => state.webUtilities.sectionTransition.pauseTimelineOnExit,
  (value) => {
    state.webUtilities.sectionTransition.pauseTimelineOnExit = value;
  }
);

const transitionButtons = document.createElement("div");
transitionButtons.style.display = "flex";
transitionButtons.style.gap = "8px";
transitionButtons.appendChild(createButton("Simulate Enter", triggerSectionEnter));
transitionButtons.appendChild(createButton("Simulate Exit", triggerSectionExit));
webUtilitiesSection.appendChild(transitionButtons);

addCheckboxControl(
  webUtilitiesSection,
  "themeSync enabled",
  () => state.webUtilities.themeSync.enabled,
  (value) => {
    state.webUtilities.themeSync.enabled = value;
  }
);

addSelectControl(
  webUtilitiesSection,
  "theme mode",
  ["dark", "light", "brand"],
  () => state.webUtilities.themeSync.mode,
  (value) => {
    state.webUtilities.themeSync.mode = value as "light" | "dark" | "brand";
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "follow system theme",
  () => state.webUtilities.themeSync.followSystem,
  (value) => {
    state.webUtilities.themeSync.followSystem = value;
  }
);

addColorControl(
  webUtilitiesSection,
  "brand color 1",
  () => state.webUtilities.themeSync.brandColors[0],
  (value) => {
    state.webUtilities.themeSync.brandColors = [
      value,
      state.webUtilities.themeSync.brandColors[1],
      state.webUtilities.themeSync.brandColors[2]
    ];
  },
  () => rebuildEffect()
);

addColorControl(
  webUtilitiesSection,
  "brand color 2",
  () => state.webUtilities.themeSync.brandColors[1],
  (value) => {
    state.webUtilities.themeSync.brandColors = [
      state.webUtilities.themeSync.brandColors[0],
      value,
      state.webUtilities.themeSync.brandColors[2]
    ];
  },
  () => rebuildEffect()
);

addColorControl(
  webUtilitiesSection,
  "brand color 3",
  () => state.webUtilities.themeSync.brandColors[2],
  (value) => {
    state.webUtilities.themeSync.brandColors = [
      state.webUtilities.themeSync.brandColors[0],
      state.webUtilities.themeSync.brandColors[1],
      value
    ];
  },
  () => rebuildEffect()
);

addColorControl(
  webUtilitiesSection,
  "brand canvas bg",
  () => state.webUtilities.themeSync.brandCanvasBackground,
  (value) => {
    state.webUtilities.themeSync.brandCanvasBackground = value;
  },
  () => rebuildEffect()
);

addSelectControl(
  webUtilitiesSection,
  "statePreset",
  ["off", "idle", "hover", "active", "success", "error", "loading"],
  () => (state.webUtilities.statePreset.enabled ? state.webUtilities.statePreset.value : "off"),
  (value) => {
    if (value === "off") {
      state.webUtilities.statePreset.enabled = false;
      return;
    }
    state.webUtilities.statePreset.enabled = true;
    state.webUtilities.statePreset.value = value as "idle" | "hover" | "active" | "success" | "error" | "loading";
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "debugHud enabled",
  () => state.webUtilities.debugHud.enabled,
  (value) => {
    state.webUtilities.debugHud.enabled = value;
    refreshDebugHudTimer();
  }
);

addSelectControl(
  webUtilitiesSection,
  "hud position",
  ["top-left", "top-right", "bottom-left", "bottom-right"],
  () => state.webUtilities.debugHud.position,
  (value) => {
    state.webUtilities.debugHud.position = value as "top-left" | "top-right" | "bottom-left" | "bottom-right";
    updateDebugHud();
  }
);

addRangeControl(
  webUtilitiesSection,
  "hud intervalMs",
  16,
  2000,
  1,
  () => state.webUtilities.debugHud.updateIntervalMs,
  (value) => {
    state.webUtilities.debugHud.updateIntervalMs = Math.round(value);
    refreshDebugHudTimer();
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "hud showFps",
  () => state.webUtilities.debugHud.showFps,
  (value) => {
    state.webUtilities.debugHud.showFps = value;
    updateDebugHud();
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "hud showQuality",
  () => state.webUtilities.debugHud.showQuality,
  (value) => {
    state.webUtilities.debugHud.showQuality = value;
    updateDebugHud();
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "hud showLoop",
  () => state.webUtilities.debugHud.showLoop,
  (value) => {
    state.webUtilities.debugHud.showLoop = value;
    updateDebugHud();
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "hud showCells",
  () => state.webUtilities.debugHud.showCells,
  (value) => {
    state.webUtilities.debugHud.showCells = value;
    updateDebugHud();
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "hud showRipples",
  () => state.webUtilities.debugHud.showRipples,
  (value) => {
    state.webUtilities.debugHud.showRipples = value;
    updateDebugHud();
  }
);

addCheckboxControl(
  webUtilitiesSection,
  "hud showTimeline",
  () => state.webUtilities.debugHud.showTimeline,
  (value) => {
    state.webUtilities.debugHud.showTimeline = value;
    updateDebugHud();
  }
);

leftPanel.appendChild(webUtilitiesSection);

const setupSection = createSection("Setup");

addSelectControl(
  setupSection,
  "preset",
  ["minimal", "card-soft", "card-ripple", "hero-image"],
  () => state.preset,
  (value) => {
    state.preset = value as PlaygroundPreset;
    state.config = createPresetConfig(state.preset);
    const firstText = state.config.textMasks?.[0] ?? state.config.textMask;
    const secondText = state.config.textMasks?.[1];
    const firstImage = state.config.imageMasks?.[0] ?? state.config.imageMask;
    const secondImage = state.config.imageMasks?.[1];

    state.timelineAssets.text1Id = firstText?.id ?? "text-1";
    state.timelineAssets.text2Id = secondText?.id ?? state.timelineAssets.text2Id;
    state.timelineAssets.image1Id = firstImage?.id ?? "image-1";
    state.timelineAssets.image2Id = secondImage?.id ?? state.timelineAssets.image2Id;

    if (firstText?.text) state.timelineAssets.text1 = firstText.text;
    if (secondText?.text) state.timelineAssets.text2 = secondText.text;
    const firstTextFont = parseFontDefinition(firstText?.font, 140, "Arial");
    const secondTextFont = parseFontDefinition(secondText?.font, 130, "Arial");
    state.timelineAssets.text1FontFamily = firstTextFont.family;
    state.timelineAssets.text2FontFamily = secondTextFont.family;
    state.timelineAssets.text1FontSize = firstTextFont.size;
    state.timelineAssets.text2FontSize = secondTextFont.size;

    state.timelineAssets.image1Scale = firstImage?.scale ?? state.timelineAssets.image1Scale;
    state.timelineAssets.image2Scale = secondImage?.scale ?? firstImage?.scale ?? state.timelineAssets.image2Scale;
    state.timelineAssets.image1SampleMode =
      firstImage?.sampleMode ?? state.timelineAssets.image1SampleMode;
    state.timelineAssets.image2SampleMode =
      secondImage?.sampleMode ?? firstImage?.sampleMode ?? state.timelineAssets.image2SampleMode;

    if (!state.timelineAssets.image1ObjectUrl && firstImage?.src) {
      state.timelineAssets.image1 = firstImage.src;
    }
    const nextImage2Src = secondImage?.src ?? firstImage?.src;
    if (!state.timelineAssets.image2ObjectUrl && nextImage2Src) {
      state.timelineAssets.image2 = nextImage2Src;
    }
    renderAllControls();
  }
);

addColorControl(
  setupSection,
  "pageBackground",
  () => state.pageColor,
  (value) => {
    state.pageColor = value;
  },
  () => {
    document.body.style.backgroundColor = state.pageColor;
  }
);

addColorControl(
  setupSection,
  "canvasBackground",
  () => state.config.canvasBackground ?? "#000000",
  (value) => {
    state.config.canvasBackground = value;
  },
  () => rebuildEffect()
);

addRangeControl(
  setupSection,
  "gap",
  3,
  12,
  1,
  () => state.config.gap,
  (value) => {
    state.config.gap = value;
  }
);

addRangeControl(
  setupSection,
  "expandEase",
  0.03,
  0.2,
  0.01,
  () => state.config.expandEase,
  (value) => {
    state.config.expandEase = value;
  }
);

addSelectControl(
  setupSection,
  "quality",
  ["low", "medium", "high"],
  () => state.config.performance?.quality ?? "medium",
  (value) => {
    state.config.performance = {
      ...state.config.performance,
      quality: value as "low" | "medium" | "high"
    };
  }
);

addCheckboxControl(
  setupSection,
  "viewportCulling",
  () => state.config.performance?.viewportCulling ?? true,
  (value) => {
    state.config.performance = {
      ...state.config.performance,
      viewportCulling: value
    };
  }
);

controlsPanel.appendChild(setupSection);

const palettesSection = createSection("Palettes");

addColorControl(
  palettesSection,
  "pixel color 1",
  () => readPaletteColor(state.config.colors, 0, DEFAULT_PIXEL_COLORS),
  (value) => {
    state.config.colors = writePaletteColor(state.config.colors, 0, value, DEFAULT_PIXEL_COLORS);
  },
  () => rebuildEffect()
);

addColorControl(
  palettesSection,
  "pixel color 2",
  () => readPaletteColor(state.config.colors, 1, DEFAULT_PIXEL_COLORS),
  (value) => {
    state.config.colors = writePaletteColor(state.config.colors, 1, value, DEFAULT_PIXEL_COLORS);
  },
  () => rebuildEffect()
);

addColorControl(
  palettesSection,
  "pixel color 3",
  () => readPaletteColor(state.config.colors, 2, DEFAULT_PIXEL_COLORS),
  (value) => {
    state.config.colors = writePaletteColor(state.config.colors, 2, value, DEFAULT_PIXEL_COLORS);
  },
  () => rebuildEffect()
);

addColorControl(
  palettesSection,
  "hover tint 1",
  () => readPaletteColor(state.config.hoverEffects?.tintPalette, 0, DEFAULT_HOVER_TINTS),
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      tintPalette: writePaletteColor(
        state.config.hoverEffects?.tintPalette,
        0,
        value,
        DEFAULT_HOVER_TINTS
      )
    };
  },
  () => rebuildEffect()
);

addColorControl(
  palettesSection,
  "hover tint 2",
  () => readPaletteColor(state.config.hoverEffects?.tintPalette, 1, DEFAULT_HOVER_TINTS),
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      tintPalette: writePaletteColor(
        state.config.hoverEffects?.tintPalette,
        1,
        value,
        DEFAULT_HOVER_TINTS
      )
    };
  },
  () => rebuildEffect()
);

addColorControl(
  palettesSection,
  "hover tint 3",
  () => readPaletteColor(state.config.hoverEffects?.tintPalette, 2, DEFAULT_HOVER_TINTS),
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      tintPalette: writePaletteColor(
        state.config.hoverEffects?.tintPalette,
        2,
        value,
        DEFAULT_HOVER_TINTS
      )
    };
  },
  () => rebuildEffect()
);

addColorControl(
  palettesSection,
  "ripple tint 1",
  () => readPaletteColor(state.config.rippleEffects?.tintPalette, 0, DEFAULT_RIPPLE_TINTS),
  (value) => {
    state.config.rippleEffects = {
      ...state.config.rippleEffects,
      tintPalette: writePaletteColor(
        state.config.rippleEffects?.tintPalette,
        0,
        value,
        DEFAULT_RIPPLE_TINTS
      )
    };
  },
  () => rebuildEffect()
);

addColorControl(
  palettesSection,
  "ripple tint 2",
  () => readPaletteColor(state.config.rippleEffects?.tintPalette, 1, DEFAULT_RIPPLE_TINTS),
  (value) => {
    state.config.rippleEffects = {
      ...state.config.rippleEffects,
      tintPalette: writePaletteColor(
        state.config.rippleEffects?.tintPalette,
        1,
        value,
        DEFAULT_RIPPLE_TINTS
      )
    };
  },
  () => rebuildEffect()
);

addColorControl(
  palettesSection,
  "ripple tint 3",
  () => readPaletteColor(state.config.rippleEffects?.tintPalette, 2, DEFAULT_RIPPLE_TINTS),
  (value) => {
    state.config.rippleEffects = {
      ...state.config.rippleEffects,
      tintPalette: writePaletteColor(
        state.config.rippleEffects?.tintPalette,
        2,
        value,
        DEFAULT_RIPPLE_TINTS
      )
    };
  },
  () => rebuildEffect()
);

controlsPanel.appendChild(palettesSection);

const interactionSection = createSection("Interaction");
addCheckboxControl(
  interactionSection,
  "hover enabled",
  () => !!state.influenceOptions.hover,
  (value) => {
    state.influenceOptions.hover = value;
  }
);

addCheckboxControl(
  interactionSection,
  "ripple enabled",
  () => !!state.influenceOptions.ripple,
  (value) => {
    state.influenceOptions.ripple = value;
  }
);

addSelectControl(
  interactionSection,
  "hover mode",
  ["classic", "reactive"],
  () => state.config.hoverEffects?.mode ?? "classic",
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      mode: value as "classic" | "reactive"
    };
  }
);

addRangeControl(
  interactionSection,
  "hover radius",
  40,
  220,
  1,
  () => state.config.hoverEffects?.radius ?? 100,
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      radius: value,
      magnetic: {
        ...state.config.hoverEffects?.magnetic,
        radius: state.config.hoverEffects?.magnetic?.radius ?? value
      }
    };
  }
);

addCheckboxControl(
  interactionSection,
  "hover magnetic",
  () => !!state.config.hoverEffects?.magnetic?.enabled,
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      magnetic: {
        ...state.config.hoverEffects?.magnetic,
        enabled: value
      }
    };
  }
);

addSelectControl(
  interactionSection,
  "magnetic mode",
  ["attract", "repel"],
  () => state.config.hoverEffects?.magnetic?.mode ?? "attract",
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      magnetic: {
        ...state.config.hoverEffects?.magnetic,
        mode: value as "attract" | "repel"
      }
    };
  }
);

addRangeControl(
  interactionSection,
  "magnetic strength",
  0,
  24,
  0.1,
  () => state.config.hoverEffects?.magnetic?.strength ?? 2.2,
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      magnetic: {
        ...state.config.hoverEffects?.magnetic,
        strength: value
      }
    };
  }
);

addRangeControl(
  interactionSection,
  "magnetic radius",
  20,
  260,
  1,
  () => state.config.hoverEffects?.magnetic?.radius ?? state.config.hoverEffects?.radius ?? 100,
  (value) => {
    state.config.hoverEffects = {
      ...state.config.hoverEffects,
      magnetic: {
        ...state.config.hoverEffects?.magnetic,
        radius: value
      }
    };
  }
);

addRangeControl(
  interactionSection,
  "ripple speed",
  0.1,
  1.2,
  0.01,
  () => state.config.rippleEffects?.speed ?? 0.5,
  (value) => {
    state.config.rippleEffects = {
      ...state.config.rippleEffects,
      speed: value
    };
  }
);

addRangeControl(
  interactionSection,
  "ripple strength",
  1,
  45,
  1,
  () => state.config.rippleEffects?.strength ?? 24,
  (value) => {
    state.config.rippleEffects = {
      ...state.config.rippleEffects,
      strength: value
    };
  }
);

addRangeControl(
  interactionSection,
  "maxRipples",
  1,
  80,
  1,
  () => state.config.rippleEffects?.maxRipples ?? 24,
  (value) => {
    state.config.rippleEffects = {
      ...state.config.rippleEffects,
      maxRipples: value
    };
  }
);
controlsPanel.appendChild(interactionSection);

const timelineSection = createSection("Mask Timeline");
const timelineStepExpanded = [true, false, false, false];

function getTextSlotFromAssetId(assetId: string | undefined): 1 | 2 {
  if (assetId === sanitizeMaskId(state.timelineAssets.text2Id, "text-2")) return 2;
  return 1;
}

function getImageSlotFromAssetId(assetId: string | undefined): 1 | 2 {
  if (assetId === sanitizeMaskId(state.timelineAssets.image2Id, "image-2")) return 2;
  return 1;
}

function getDefaultSlotForStep(stepIndex: number, type: TimelineMaskType): 1 | 2 {
  if (type === "text") return stepIndex >= 2 ? 2 : 1;
  return stepIndex >= 2 ? 2 : 1;
}

function getAssetIdFromSlot(type: TimelineMaskType, slot: 1 | 2): string {
  if (type === "text") {
    return slot === 1
      ? sanitizeMaskId(state.timelineAssets.text1Id, "text-1")
      : sanitizeMaskId(state.timelineAssets.text2Id, "text-2");
  }
  return slot === 1
    ? sanitizeMaskId(state.timelineAssets.image1Id, "image-1")
    : sanitizeMaskId(state.timelineAssets.image2Id, "image-2");
}

function applyTimelinePanelChanges(renderSteps = true): void {
  rebuildEffect();
  if (renderSteps) {
    renderTimelineStepEditors();
  }
  updateTimelinePreview();
  updateRuntimeStats();
}

function createStepField(label: string, control: HTMLElement): HTMLDivElement {
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gap = "4px";

  const caption = document.createElement("div");
  caption.textContent = label;
  caption.style.color = "#cbd5e1";
  caption.style.fontSize = "11px";
  row.appendChild(caption);

  control.style.width = "100%";
  control.style.boxSizing = "border-box";
  control.style.background = "#111827";
  control.style.color = "#e5e7eb";
  control.style.border = "1px solid rgba(148, 163, 184, 0.4)";
  control.style.borderRadius = "6px";
  control.style.padding = "4px 6px";
  row.appendChild(control);

  return row;
}

const timelineStepsContainer = document.createElement("div");
timelineStepsContainer.style.display = "grid";
timelineStepsContainer.style.gap = "8px";

function renderTimelineStepEditors(): void {
  const timeline = ensureTimelineConfig();
  timelineStepsContainer.innerHTML = "";

  for (let stepIndex = 0; stepIndex < 4; stepIndex++) {
    const step = timeline.steps?.[stepIndex] as TimelineStep | undefined;
    if (!step) continue;

    const card = document.createElement("div");
    card.style.border = "1px solid rgba(148, 163, 184, 0.3)";
    card.style.borderRadius = "8px";
    card.style.background = "rgba(2, 6, 23, 0.45)";
    card.style.overflow = "hidden";

    const header = document.createElement("button");
    const stepType = (step.maskType ?? step.mask ?? "text") as TimelineMaskType;
    const stepAsset = step.assetId ?? step.maskId ?? getDefaultAssetIdForStep(stepType, stepIndex);
    header.textContent = `Step${stepIndex} | ${stepType} | ${stepAsset}`;
    header.style.width = "100%";
    header.style.textAlign = "left";
    header.style.background = "rgba(30, 41, 59, 0.9)";
    header.style.color = "#e2e8f0";
    header.style.border = "none";
    header.style.padding = "8px 10px";
    header.style.cursor = "pointer";
    header.addEventListener("click", () => {
      timelineStepExpanded[stepIndex] = !timelineStepExpanded[stepIndex];
      renderTimelineStepEditors();
    });
    card.appendChild(header);

    const body = document.createElement("div");
    body.style.display = timelineStepExpanded[stepIndex] ? "grid" : "none";
    body.style.gap = "8px";
    body.style.padding = "10px";
    if (!timelineStepExpanded[stepIndex]) {
      timelineStepsContainer.appendChild(card);
      continue;
    }

    const typeSelect = document.createElement("select");
    for (const optionValue of ["text", "image"]) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      typeSelect.appendChild(option);
    }
    typeSelect.value = stepType;
    typeSelect.addEventListener("change", () => {
      const nextType = typeSelect.value as TimelineMaskType;
      const nextSlot = getDefaultSlotForStep(stepIndex, nextType);
      step.mask = nextType;
      step.maskType = nextType;
      const nextAssetId = getAssetIdFromSlot(nextType, nextSlot);
      step.assetId = nextAssetId;
      step.maskId = nextAssetId;
      applyTimelinePanelChanges();
    });
    body.appendChild(createStepField("type", typeSelect));

    const holdInput = document.createElement("input");
    holdInput.type = "number";
    holdInput.min = "0";
    holdInput.max = "5000";
    holdInput.step = "25";
    holdInput.value = String(step.holdMs ?? 1200);
    holdInput.addEventListener("change", () => {
      step.holdMs = Math.max(0, Number(holdInput.value) || 0);
      applyTimelinePanelChanges(false);
    });
    body.appendChild(createStepField("holdMs", holdInput));

    const modeSelect = document.createElement("select");
    for (const optionValue of ["morph", "fade", "dissolve"]) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      modeSelect.appendChild(option);
    }
    modeSelect.value = step.transition?.mode ?? "morph";
    modeSelect.addEventListener("change", () => {
      if (!step.transition) {
        step.transition = { mode: "morph", durationMs: 900, seed: 1337 + stepIndex * 97 };
      }
      step.transition.mode = modeSelect.value as "morph" | "fade" | "dissolve";
      applyTimelinePanelChanges(false);
    });
    body.appendChild(createStepField("transition mode", modeSelect));

    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.min = "100";
    durationInput.max = "2500";
    durationInput.step = "25";
    durationInput.value = String(step.transition?.durationMs ?? 900);
    durationInput.addEventListener("change", () => {
      if (!step.transition) {
        step.transition = { mode: "morph", durationMs: 900, seed: 1337 + stepIndex * 97 };
      }
      step.transition.durationMs = Math.max(1, Number(durationInput.value) || 900);
      applyTimelinePanelChanges(false);
    });
    body.appendChild(createStepField("transition durationMs", durationInput));

    if (stepType === "text") {
      const currentSlot = getTextSlotFromAssetId(step.assetId ?? step.maskId);

      const textSlotSelect = document.createElement("select");
      const textSlotOptions = [
        { slot: 1 as const, label: `Text 1 (${sanitizeMaskId(state.timelineAssets.text1Id, "text-1")})` },
        { slot: 2 as const, label: `Text 2 (${sanitizeMaskId(state.timelineAssets.text2Id, "text-2")})` }
      ];
      for (const optionMeta of textSlotOptions) {
        const option = document.createElement("option");
        option.value = String(optionMeta.slot);
        option.textContent = optionMeta.label;
        textSlotSelect.appendChild(option);
      }
      textSlotSelect.value = String(currentSlot);
      textSlotSelect.addEventListener("change", () => {
        const slot = Number(textSlotSelect.value) === 2 ? 2 : 1;
        const nextAssetId = getAssetIdFromSlot("text", slot);
        step.assetId = nextAssetId;
        step.maskId = nextAssetId;
        applyTimelinePanelChanges();
      });
      body.appendChild(createStepField("text asset", textSlotSelect));

      const selectedSlot = Number(textSlotSelect.value) === 2 ? 2 : 1;
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.value = selectedSlot === 1 ? state.timelineAssets.text1 : state.timelineAssets.text2;
      textInput.addEventListener("change", () => {
        if (selectedSlot === 1) {
          state.timelineAssets.text1 = textInput.value;
        } else {
          state.timelineAssets.text2 = textInput.value;
        }
        applyTimelinePanelChanges();
      });
      body.appendChild(createStepField("text", textInput));

      const fontFamilyInput = document.createElement("input");
      fontFamilyInput.type = "text";
      fontFamilyInput.value =
        selectedSlot === 1
          ? state.timelineAssets.text1FontFamily
          : state.timelineAssets.text2FontFamily;
      fontFamilyInput.addEventListener("change", () => {
        if (selectedSlot === 1) {
          state.timelineAssets.text1FontFamily = fontFamilyInput.value.trim() || "Arial";
        } else {
          state.timelineAssets.text2FontFamily = fontFamilyInput.value.trim() || "Arial";
        }
        applyTimelinePanelChanges();
      });
      body.appendChild(createStepField("font family", fontFamilyInput));

      const fontSizeInput = document.createElement("input");
      fontSizeInput.type = "number";
      fontSizeInput.min = "8";
      fontSizeInput.max = "260";
      fontSizeInput.step = "1";
      fontSizeInput.value = String(
        selectedSlot === 1 ? state.timelineAssets.text1FontSize : state.timelineAssets.text2FontSize
      );
      fontSizeInput.addEventListener("change", () => {
        const size = Math.max(8, Number(fontSizeInput.value) || 120);
        if (selectedSlot === 1) {
          state.timelineAssets.text1FontSize = size;
        } else {
          state.timelineAssets.text2FontSize = size;
        }
        applyTimelinePanelChanges();
      });
      body.appendChild(createStepField("font size", fontSizeInput));
    } else {
      const currentSlot = getImageSlotFromAssetId(step.assetId ?? step.maskId);

      const imageSlotSelect = document.createElement("select");
      const imageSlotOptions = [
        { slot: 1 as const, label: `Image 1 (${sanitizeMaskId(state.timelineAssets.image1Id, "image-1")})` },
        { slot: 2 as const, label: `Image 2 (${sanitizeMaskId(state.timelineAssets.image2Id, "image-2")})` }
      ];
      for (const optionMeta of imageSlotOptions) {
        const option = document.createElement("option");
        option.value = String(optionMeta.slot);
        option.textContent = optionMeta.label;
        imageSlotSelect.appendChild(option);
      }
      imageSlotSelect.value = String(currentSlot);
      imageSlotSelect.addEventListener("change", () => {
        const slot = Number(imageSlotSelect.value) === 2 ? 2 : 1;
        const nextAssetId = getAssetIdFromSlot("image", slot);
        step.assetId = nextAssetId;
        step.maskId = nextAssetId;
        applyTimelinePanelChanges();
      });
      body.appendChild(createStepField("image asset", imageSlotSelect));

      const selectedSlot = Number(imageSlotSelect.value) === 2 ? 2 : 1;

      const srcInput = document.createElement("input");
      srcInput.type = "text";
      srcInput.placeholder = "/assets/your-image.png";
      srcInput.value = selectedSlot === 1 ? state.timelineAssets.image1 : state.timelineAssets.image2;
      srcInput.addEventListener("change", () => {
        if (selectedSlot === 1) {
          state.timelineAssets.image1 = srcInput.value.trim();
        } else {
          state.timelineAssets.image2 = srcInput.value.trim();
        }
        applyTimelinePanelChanges();
      });
      body.appendChild(createStepField("image src", srcInput));

      const uploadInput = document.createElement("input");
      uploadInput.type = "file";
      uploadInput.accept = "image/*";
      uploadInput.style.color = "#e2e8f0";
      uploadInput.addEventListener("change", () => {
        const file = uploadInput.files?.[0];
        if (!file) return;
        replaceTimelineImage(selectedSlot, file);
        renderTimelineStepEditors();
      });
      body.appendChild(createStepField("upload image", uploadInput));

      const scaleInput = document.createElement("input");
      scaleInput.type = "number";
      scaleInput.min = "0.2";
      scaleInput.max = "5";
      scaleInput.step = "0.1";
      scaleInput.value = String(
        selectedSlot === 1 ? state.timelineAssets.image1Scale : state.timelineAssets.image2Scale
      );
      scaleInput.addEventListener("change", () => {
        const scale = Math.max(0.2, Number(scaleInput.value) || 1);
        if (selectedSlot === 1) {
          state.timelineAssets.image1Scale = scale;
        } else {
          state.timelineAssets.image2Scale = scale;
        }
        applyTimelinePanelChanges();
      });
      body.appendChild(createStepField("image scale", scaleInput));

      const modeSelect = document.createElement("select");
      for (const optionValue of ["threshold", "luminance", "alpha", "invert"]) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        modeSelect.appendChild(option);
      }
      modeSelect.value = selectedSlot === 1
        ? state.timelineAssets.image1SampleMode
        : state.timelineAssets.image2SampleMode;
      modeSelect.addEventListener("change", () => {
        const mode = modeSelect.value as "threshold" | "luminance" | "alpha" | "invert";
        if (selectedSlot === 1) {
          state.timelineAssets.image1SampleMode = mode;
        } else {
          state.timelineAssets.image2SampleMode = mode;
        }
        applyTimelinePanelChanges();
      });
      body.appendChild(createStepField("sample mode", modeSelect));
    }

    card.appendChild(body);
    timelineStepsContainer.appendChild(card);
  }
}

addCheckboxControl(
  timelineSection,
  "enabled",
  () => !!state.config.maskTimeline?.enabled,
  (value) => {
    const timeline = ensureTimelineConfig();
    timeline.enabled = value;
  }
);

addCheckboxControl(
  timelineSection,
  "autoplay",
  () => ensureTimelineConfig().autoplay ?? true,
  (value) => {
    const timeline = ensureTimelineConfig();
    timeline.autoplay = value;
  }
);

addCheckboxControl(
  timelineSection,
  "loop",
  () => ensureTimelineConfig().loop ?? true,
  (value) => {
    const timeline = ensureTimelineConfig();
    timeline.loop = value;
  }
);

addRangeControl(
  timelineSection,
  "initialStep",
  0,
  3,
  1,
  () => ensureTimelineConfig().initialStep ?? 0,
  (value) => {
    const timeline = ensureTimelineConfig();
    timeline.initialStep = Math.min(3, Math.max(0, value));
  }
);

timelineSection.appendChild(timelineStepsContainer);
renderTimelineStepEditors();

const timelineRuntimeButtons = document.createElement("div");
timelineRuntimeButtons.style.display = "flex";
timelineRuntimeButtons.style.gap = "8px";

timelineRuntimeButtons.appendChild(
  createButton("Play", () => {
    effect.playMaskTimeline();
    updateTimelinePreview();
    updateRuntimeStats();
  })
);

timelineRuntimeButtons.appendChild(
  createButton("Pause", () => {
    effect.pauseMaskTimeline();
    updateTimelinePreview();
    updateRuntimeStats();
  })
);

timelineRuntimeButtons.appendChild(
  createButton("Reset", () => {
    effect.resetMaskTimeline();
    updateTimelinePreview();
    updateRuntimeStats();
  })
);

timelineRuntimeButtons.appendChild(
  createButton("Apply v2 demo", () => {
    applyTimelineV2Demo();
  })
);

timelineSection.appendChild(timelineRuntimeButtons);

const timelinePreview = document.createElement("pre");
timelinePreview.style.margin = "0";
timelinePreview.style.padding = "8px";
timelinePreview.style.borderRadius = "6px";
timelinePreview.style.background = "rgba(2, 6, 23, 0.7)";
timelinePreview.style.whiteSpace = "pre-wrap";
timelinePreview.style.color = "#cbd5e1";
timelinePreview.style.fontSize = "11px";
timelineSection.appendChild(timelinePreview);
controlsPanel.appendChild(timelineSection);

function updateTimelinePreview(): void {
  const timeline = state.config.maskTimeline;
  const timelineState = effect.getMaskTimelineState();

  if (!timeline?.enabled) {
    timelinePreview.textContent = [
      "maskTimeline disabled",
      `runtime: ${timelineState.playing ? "playing" : "paused"} step=${timelineState.stepIndex}`
    ].join("\n");
    return;
  }

  const steps = timeline.steps ?? [];
  if (steps.length === 0) {
    timelinePreview.textContent = "maskTimeline has no steps";
    return;
  }

  let cursor = 0;
  const lines: string[] = [
    `runtime: ${timelineState.playing ? "playing" : "paused"} step=${timelineState.stepIndex}`,
    `enabled=${timeline.enabled} autoplay=${timeline.autoplay ?? true} loop=${timeline.loop ?? true}`,
    `items=${timeline.items?.length ?? 0}`,
    `steps=${steps.length}`
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as TimelineStep;
    const holdMs = step.holdMs ?? 0;
    const mode = step.transition?.mode ?? timeline.defaultTransition?.mode ?? "morph";
    const durationMs = step.transition?.durationMs ?? timeline.defaultTransition?.durationMs ?? 900;
    const nextStep = i + 1 < steps.length ? i + 1 : (timeline.loop ? 0 : -1);
    const stepMaskType = step.maskType ?? step.mask ?? "text";
    const stepMaskId = step.assetId ?? step.maskId ?? getDefaultAssetIdForStep(stepMaskType, i);

    lines.push(`${cursor}ms -> step${i} [${stepMaskType}:${stepMaskId}] hold (${holdMs}ms)`);
    cursor += holdMs;

    if (nextStep >= 0) {
      lines.push(`${cursor}ms -> transition ${mode} step${i}->step${nextStep} (${durationMs}ms)`);
      cursor += durationMs;
    }
  }

  lines.push(`cycle ≈ ${cursor}ms`);
  timelinePreview.textContent = lines.join("\n");
}

const runtimeSection = createSection("Runtime");
const runtimeStats = document.createElement("pre");
runtimeStats.style.margin = "0";
runtimeStats.style.padding = "8px";
runtimeStats.style.borderRadius = "6px";
runtimeStats.style.background = "rgba(2, 6, 23, 0.7)";
runtimeStats.style.whiteSpace = "pre-wrap";
runtimeStats.style.color = "#cbd5e1";
runtimeStats.style.fontSize = "11px";
runtimeSection.appendChild(runtimeStats);
leftPanel.appendChild(runtimeSection);

function updateRuntimeStats(): void {
  const snapshot = effect.getDebugSnapshot();
  const timelineState = effect.getMaskTimelineState();
  const loopTuning = engine.getLoopTuning();
  runtimeStats.textContent = [
    `fps: ${engine.getFPS().toFixed(1)}`,
    `quality: ${engine.getQuality()}`,
    `loop: step=${loopTuning.fixedTimeStep.toFixed(2)} maxDelta=${loopTuning.maxDelta} maxUpdates=${loopTuning.maxUpdatesPerFrame}`,
    `active cells: ${snapshot.activeCells}/${snapshot.totalCells}`,
    `active ripples: ${snapshot.activeRipples}`,
    `effects: palette=${state.config.effects?.paletteCycle?.enabled ? "on" : "off"} dissolve=${state.config.effects?.dissolve?.enabled ? "on" : "off"} shockwave=${state.config.effects?.shockwaveBurst?.enabled ? "on" : "off"}`,
    `timeline: ${timelineState.playing ? "playing" : "paused"} step=${timelineState.stepIndex}`,
    `web: scroll=${state.webUtilities.scrollReactive.enabled ? "on" : "off"} transition=${state.webUtilities.sectionTransition.enabled ? "on" : "off"} theme=${state.webUtilities.themeSync.enabled ? state.webUtilities.themeSync.mode : "off"} state=${state.webUtilities.statePreset.enabled ? state.webUtilities.statePreset.value : "off"}`,
    `preset: ${state.preset}`
  ].join("\n");
  updateDebugHud();
}

const ioSection = createSection("Config IO");
const textArea = document.createElement("textarea");
textArea.rows = 8;
textArea.style.width = "100%";
textArea.style.boxSizing = "border-box";
textArea.style.background = "#0f172a";
textArea.style.color = "#e2e8f0";
textArea.style.border = "1px solid rgba(148, 163, 184, 0.4)";
textArea.style.borderRadius = "6px";
textArea.style.padding = "8px";
textArea.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
textArea.placeholder = "Exported config JSON";
ioSection.appendChild(textArea);

const buttonsRow = document.createElement("div");
buttonsRow.style.display = "flex";
buttonsRow.style.gap = "8px";

function createButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.flex = "1";
  button.style.background = "#1d4ed8";
  button.style.color = "#ffffff";
  button.style.border = "none";
  button.style.borderRadius = "6px";
  button.style.padding = "6px 8px";
  button.style.cursor = "pointer";
  button.addEventListener("click", onClick);
  return button;
}

buttonsRow.appendChild(
  createButton("Export", () => {
    textArea.value = JSON.stringify(
      {
        preset: state.preset,
        pageColor: state.pageColor,
        config: state.config,
        influenceOptions: state.influenceOptions,
        webUtilities: state.webUtilities,
        timelineAssets: {
          text1Id: state.timelineAssets.text1Id,
          text2Id: state.timelineAssets.text2Id,
          image1Id: state.timelineAssets.image1Id,
          image2Id: state.timelineAssets.image2Id,
          text1: state.timelineAssets.text1,
          text2: state.timelineAssets.text2,
          text1FontFamily: state.timelineAssets.text1FontFamily,
          text2FontFamily: state.timelineAssets.text2FontFamily,
          text1FontSize: state.timelineAssets.text1FontSize,
          text2FontSize: state.timelineAssets.text2FontSize,
          image1: state.timelineAssets.image1,
          image2: state.timelineAssets.image2,
          image1Scale: state.timelineAssets.image1Scale,
          image2Scale: state.timelineAssets.image2Scale,
          image1SampleMode: state.timelineAssets.image1SampleMode,
          image2SampleMode: state.timelineAssets.image2SampleMode
        }
      },
      null,
      2
    );
  })
);

buttonsRow.appendChild(
  createButton("Apply", () => {
    try {
      const parsed = JSON.parse(textArea.value) as {
        preset?: PlaygroundPreset;
        pageColor?: string;
        config?: Partial<PixelGridConfig>;
        influenceOptions?: PixelGridInfluenceOptions;
        webUtilities?: Partial<PlaygroundState["webUtilities"]>;
        timelineAssets?: {
          text1Id?: string;
          text2Id?: string;
          image1Id?: string;
          image2Id?: string;
          text1?: string;
          text2?: string;
          text1FontFamily?: string;
          text2FontFamily?: string;
          text1FontSize?: number;
          text2FontSize?: number;
          image1?: string;
          image2?: string;
          image1Scale?: number;
          image2Scale?: number;
          image1SampleMode?: "alpha" | "luminance" | "threshold" | "invert";
          image2SampleMode?: "alpha" | "luminance" | "threshold" | "invert";
        };
      };

      if (parsed.preset) {
        state.preset = parsed.preset;
      }

      if (parsed.pageColor) {
        state.pageColor = parsed.pageColor;
        document.body.style.backgroundColor = state.pageColor;
      }

      if (parsed.config) {
        const presetBase = createPresetConfig(state.preset);
        state.config = {
          ...presetBase,
          ...parsed.config,
          hoverEffects: {
            ...presetBase.hoverEffects,
            ...parsed.config.hoverEffects,
            magnetic: {
              ...presetBase.hoverEffects?.magnetic,
              ...parsed.config.hoverEffects?.magnetic
            }
          },
          rippleEffects: {
            ...presetBase.rippleEffects,
            ...parsed.config.rippleEffects
          },
          breathing: {
            ...presetBase.breathing,
            ...parsed.config.breathing
          },
          effects: {
            ...presetBase.effects,
            ...parsed.config.effects,
            paletteCycle: {
              ...presetBase.effects?.paletteCycle,
              ...parsed.config.effects?.paletteCycle
            },
            dissolve: {
              ...presetBase.effects?.dissolve,
              ...parsed.config.effects?.dissolve
            },
            shockwaveBurst: {
              ...presetBase.effects?.shockwaveBurst,
              ...parsed.config.effects?.shockwaveBurst
            }
          },
          performance: {
            ...presetBase.performance,
            ...parsed.config.performance
          },
          autoMorph: {
            ...presetBase.autoMorph,
            ...parsed.config.autoMorph
          },
          maskTimeline: {
            ...presetBase.maskTimeline,
            ...parsed.config.maskTimeline,
            defaultTransition: {
              ...presetBase.maskTimeline?.defaultTransition,
              ...parsed.config.maskTimeline?.defaultTransition
            },
            steps: parsed.config.maskTimeline?.steps
              ? parsed.config.maskTimeline.steps.map((step, index) => ({
                ...(presetBase.maskTimeline?.steps?.[index] ?? {}),
                ...step,
                transition: {
                  ...(presetBase.maskTimeline?.steps?.[index]?.transition ??
                    presetBase.maskTimeline?.defaultTransition),
                  ...step.transition
                }
              }))
              : presetBase.maskTimeline?.steps
          }
        };
      }

      if (parsed.influenceOptions) {
        state.influenceOptions = {
          ...state.influenceOptions,
          ...parsed.influenceOptions
        };
      }

      if (parsed.webUtilities) {
        state.webUtilities = {
          ...state.webUtilities,
          ...parsed.webUtilities,
          scrollReactive: {
            ...state.webUtilities.scrollReactive,
            ...parsed.webUtilities.scrollReactive
          },
          sectionTransition: {
            ...state.webUtilities.sectionTransition,
            ...parsed.webUtilities.sectionTransition
          },
          themeSync: {
            ...state.webUtilities.themeSync,
            ...parsed.webUtilities.themeSync
          },
          statePreset: {
            ...state.webUtilities.statePreset,
            ...parsed.webUtilities.statePreset
          },
          debugHud: {
            ...state.webUtilities.debugHud,
            ...parsed.webUtilities.debugHud
          }
        };
      }

      if (parsed.timelineAssets) {
        state.timelineAssets = {
          ...state.timelineAssets,
          ...parsed.timelineAssets
        };
      }

      renderAllControls();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Invalid JSON: ${message}`);
    }
  })
);

buttonsRow.appendChild(
  createButton("Copy", async () => {
    if (!textArea.value) return;
    try {
      await navigator.clipboard.writeText(textArea.value);
    } catch {
      textArea.select();
      document.execCommand("copy");
    }
  })
);

ioSection.appendChild(buttonsRow);
leftPanel.appendChild(ioSection);

function renderAllControls(): void {
  for (const refresh of refreshers) {
    refresh();
  }
  renderTimelineStepEditors();
  rebuildEffect();
  updateTimelinePreview();
  refreshDebugHudTimer();
  updateRuntimeStats();
  layoutLeftPanels();
}

document.body.appendChild(controlsPanel);
document.body.appendChild(leftPanel);
layoutLeftPanels();

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  effect.triggerRipple(
    event.clientX - rect.left,
    event.clientY - rect.top
  );
});

window.setInterval(updateRuntimeStats, 250);
updateTimelinePreview();
refreshDebugHudTimer();
updateRuntimeStats();

window.addEventListener("beforeunload", () => {
  hideDebugHud();
  if (state.timelineAssets.image1ObjectUrl) {
    URL.revokeObjectURL(state.timelineAssets.image1ObjectUrl);
  }
  if (state.timelineAssets.image2ObjectUrl) {
    URL.revokeObjectURL(state.timelineAssets.image2ObjectUrl);
  }
});

engine.start();
