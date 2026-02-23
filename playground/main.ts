import { PixelEngine } from "../src/core/PixelEngine";
import { PixelGridEffect } from "../src/entities/PixelGridEffect";
import type { PixelGridConfig, PixelGridInfluenceOptions } from "../src/entities/pixel-grid/types";

type PlaygroundPreset = "minimal" | "card-soft" | "card-ripple" | "hero-image";

interface PlaygroundState {
  preset: PlaygroundPreset;
  config: PixelGridConfig;
  influenceOptions: PixelGridInfluenceOptions;
  pageColor: string;
  timelineAssets: {
    text1: string;
    text2: string;
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

interface EffectDebugState {
  cells: Array<{ targetSize: number }>;
  runtime: { activeRipples: unknown[] };
}

const canvas = document.getElementById("app") as HTMLCanvasElement;

const width = 800;
const height = 600;

const engine = new PixelEngine({
  canvas,
  width,
  height
});

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
        radiusY: 95,
        shape: "circle",
        strength: 1,
        interactionScope: "all",
        deactivate: 0.7,
        displace: 0,
        jitter: 0,
        tintPalette: []
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
        radiusY: 100,
        shape: "vignette",
        strength: 1,
        interactionScope: "all",
        deactivate: 0.82,
        displace: 3.5,
        jitter: 1.1,
        tintPalette: ["#94a3b8", "#cbd5e1"]
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
        shape: "vignette",
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
        radiusY: 95,
        shape: "vignette",
        strength: 1,
        interactionScope: "imageMask",
        deactivate: 0.85,
        displace: 4,
        jitter: 1.1,
        tintPalette: ["#e5e7eb", "#d1d5db", "#9ca3af"]
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
        shape: "vignette",
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
        steps: [
          {
            mask: "image",
            holdMs: 1400,
            transition: {
              mode: "morph",
              durationMs: 900,
              seed: 1401
            }
          },
          {
            mask: "text",
            holdMs: 1400,
            transition: {
              mode: "dissolve",
              durationMs: 900,
              seed: 4201
            }
          }
        ]
      },
      initialMask: "image",
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
      radiusY: 100,
      shape: "circle",
      strength: 1,
      interactionScope: "all",
      deactivate: 0.85,
      displace: 4,
      jitter: 1.2,
      tintPalette: []
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
      steps: [
        {
          mask: "image",
          holdMs: 1100,
          transition: {
            mode: "fade",
            durationMs: 850,
            seed: 1101
          }
        },
        {
          mask: "text",
          holdMs: 1100,
          transition: {
            mode: "dissolve",
            durationMs: 850,
            seed: 2201
          }
        }
      ]
    },
    initialMask: "image",
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
  timelineAssets: {
    text1: createPresetConfig("card-soft").textMask?.text ?? "TEXT 1",
    text2: "TEXT 2",
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

let effect = new PixelGridEffect(
  engine,
  width,
  height,
  cloneConfig(state.config),
  { ...state.influenceOptions }
);
engine.addEntity(effect);

function rebuildEffect(): void {
  engine.removeEntity(effect);
  effect = new PixelGridEffect(
    engine,
    width,
    height,
    cloneConfig(state.config),
    { ...state.influenceOptions }
  );
  engine.addEntity(effect);
  lastAppliedTimelineStep = -1;
  applyTimelineStepAssets(true);
}

type TimelineStep = {
  mask: "image" | "text";
  holdMs: number;
  transition: {
    mode: "morph" | "fade" | "dissolve";
    durationMs: number;
    seed: number;
  };
};

function createDefaultTimelineStep(mask: "image" | "text", seed: number): TimelineStep {
  return {
    mask,
    holdMs: 1200,
    transition: {
      mode: "morph",
      durationMs: 900,
      seed
    }
  };
}

function ensureTimelineConfig(): NonNullable<PixelGridConfig["maskTimeline"]> {
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
      steps: [
        createDefaultTimelineStep("text", 1401),
        createDefaultTimelineStep("image", 2401),
        createDefaultTimelineStep("text", 3401),
        createDefaultTimelineStep("image", 4401)
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

  if (!state.config.maskTimeline.steps || state.config.maskTimeline.steps.length === 0) {
    state.config.maskTimeline.steps = [
      createDefaultTimelineStep("text", 1401),
      createDefaultTimelineStep("image", 2401),
      createDefaultTimelineStep("text", 3401),
      createDefaultTimelineStep("image", 4401)
    ];
  }

  while (state.config.maskTimeline.steps.length < 4) {
    state.config.maskTimeline.steps.push(
      createDefaultTimelineStep(
        state.config.maskTimeline.steps.length % 2 === 0 ? "text" : "image",
        2401 + state.config.maskTimeline.steps.length * 97
      )
    );
  }
  if (state.config.maskTimeline.steps.length > 4) {
    state.config.maskTimeline.steps = state.config.maskTimeline.steps.slice(0, 4);
  }

  state.config.maskTimeline.steps[0].mask = "text";
  state.config.maskTimeline.steps[1].mask = "image";
  state.config.maskTimeline.steps[2].mask = "text";
  state.config.maskTimeline.steps[3].mask = "image";

  return state.config.maskTimeline;
}

let lastAppliedTimelineStep = -1;

function applyTimelineStepAssets(force = false): void {
  const timeline = ensureTimelineConfig();
  if (!timeline.enabled) return;
  const timelineState = effect.getMaskTimelineState();
  const stepIndex = timelineState.stepIndex;
  if (stepIndex < 0) return;
  if (!force && stepIndex === lastAppliedTimelineStep) return;

  const step = timeline.steps?.[stepIndex];
  if (!step) return;

  const internal = effect as unknown as {
    maskState?: {
      textMask?: { generateMask?: () => void; text?: string };
      imageMask?: { image?: HTMLImageElement };
    };
  };
  const maskState = internal.maskState;
  if (!maskState) return;

  if (step.mask === "text") {
    const nextText = stepIndex === 0 ? state.timelineAssets.text1 : state.timelineAssets.text2;
    const textMask = maskState.textMask;
    if (textMask && nextText && textMask.text !== nextText) {
      textMask.text = nextText;
      textMask.generateMask?.();
    }
    const currentTextMask = state.config.textMask;
    state.config.textMask = {
      ...(currentTextMask ?? {}),
      font: currentTextMask?.font ?? "bold 140px Arial",
      text: nextText
    };
  }

  if (step.mask === "image") {
    const useFirstImageSlot = stepIndex === 1;
    const nextImage = useFirstImageSlot ? state.timelineAssets.image1 : state.timelineAssets.image2;
    const nextScale = useFirstImageSlot ? state.timelineAssets.image1Scale : state.timelineAssets.image2Scale;
    const nextSampleMode = useFirstImageSlot
      ? state.timelineAssets.image1SampleMode
      : state.timelineAssets.image2SampleMode;

    const imageMaskInternal = maskState.imageMask as unknown as {
      image?: HTMLImageElement;
      generateMask?: () => void;
      scale?: number;
      sampleMode?: "alpha" | "luminance" | "threshold" | "invert";
    };

    imageMaskInternal.scale = nextScale;
    imageMaskInternal.sampleMode = nextSampleMode;

    if (imageMaskInternal.image && nextImage && imageMaskInternal.image.src !== nextImage) {
      imageMaskInternal.image.src = nextImage;
    } else {
      imageMaskInternal.generateMask?.();
    }

    state.config.imageMask = {
      ...(state.config.imageMask ?? {}),
      src: nextImage,
      scale: nextScale,
      sampleMode: nextSampleMode
    };
  }

  lastAppliedTimelineStep = stepIndex;
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

  applyTimelineStepAssets(true);
  updateTimelinePreview();
}

function createPanel(side: "left" | "right", title: string): HTMLDivElement {
  const panel = document.createElement("div");
  panel.style.position = "fixed";
  panel.style.top = "12px";
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

const controlsPanel = createPanel("right", "Controls");
const utilityPanel = createPanel("left", "Runtime / I/O");

const refreshers: Array<() => void> = [];

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

function addFileUploadControl(
  section: HTMLElement,
  label: string,
  onFile: (file: File) => void
): void {
  const row = createRow(label);
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.gridColumn = "1 / -1";
  input.style.color = "#cbd5e1";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    row.value.textContent = file.name;
    onFile(file);
  });
  row.row.appendChild(input);
  section.appendChild(row.row);
}

const setupSection = createSection("Setup");

addSelectControl(
  setupSection,
  "preset",
  ["minimal", "card-soft", "card-ripple", "hero-image"],
  () => state.preset,
  (value) => {
    state.preset = value as PlaygroundPreset;
    state.config = createPresetConfig(state.preset);
    if (state.config.textMask?.text) {
      state.timelineAssets.text1 = state.config.textMask.text;
    }
    state.timelineAssets.image1Scale = state.config.imageMask?.scale ?? state.timelineAssets.image1Scale;
    state.timelineAssets.image2Scale = state.config.imageMask?.scale ?? state.timelineAssets.image2Scale;
    state.timelineAssets.image1SampleMode =
      state.config.imageMask?.sampleMode ?? state.timelineAssets.image1SampleMode;
    state.timelineAssets.image2SampleMode =
      state.config.imageMask?.sampleMode ?? state.timelineAssets.image2SampleMode;
    if (!state.timelineAssets.image1ObjectUrl && state.config.imageMask?.src) {
      state.timelineAssets.image1 = state.config.imageMask.src;
    }
    if (!state.timelineAssets.image2ObjectUrl && state.config.imageMask?.src) {
      state.timelineAssets.image2 = state.config.imageMask.src;
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
      radiusY: state.config.hoverEffects?.radiusY ?? value
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
addCheckboxControl(
  timelineSection,
  "enabled",
  () => !!state.config.maskTimeline?.enabled,
  (value) => {
    const timeline = ensureTimelineConfig();
    timeline.enabled = value;
  }
);

addRangeControl(
  timelineSection,
  "hold (all steps)",
  0,
  5000,
  25,
  () => ensureTimelineConfig().steps?.[0]?.holdMs ?? 1200,
  (value) => {
    const timeline = ensureTimelineConfig();
    for (const step of timeline.steps ?? []) {
      step.holdMs = value;
    }
  }
);

addRangeControl(
  timelineSection,
  "duration (all transitions)",
  100,
  2500,
  50,
  () => ensureTimelineConfig().steps?.[0]?.transition?.durationMs ?? 900,
  (value) => {
    const timeline = ensureTimelineConfig();
    for (const step of timeline.steps ?? []) {
      if (!step.transition) {
        step.transition = {
          mode: "morph",
          durationMs: value,
          seed: 1337
        };
      } else {
        step.transition.durationMs = value;
      }
    }
  }
);

addSelectControl(
  timelineSection,
  "transition mode",
  ["morph", "fade", "dissolve"],
  () => ensureTimelineConfig().steps?.[0]?.transition?.mode ?? "morph",
  (value) => {
    const timeline = ensureTimelineConfig();
    for (const step of timeline.steps ?? []) {
      if (!step.transition) {
        step.transition = {
          mode: value as "morph" | "fade" | "dissolve",
          durationMs: 900,
          seed: 1337
        };
      } else {
        step.transition.mode = value as "morph" | "fade" | "dissolve";
      }
    }
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

const assetsSection = createSection("Timeline Assets");

addTextControl(
  assetsSection,
  "Text 1",
  () => state.timelineAssets.text1,
  (value) => {
    state.timelineAssets.text1 = value;
  },
  () => {
    applyTimelineStepAssets(true);
    updateTimelinePreview();
  }
);

addTextControl(
  assetsSection,
  "Text 2",
  () => state.timelineAssets.text2,
  (value) => {
    state.timelineAssets.text2 = value;
  },
  () => {
    applyTimelineStepAssets(true);
    updateTimelinePreview();
  }
);

addFileUploadControl(
  assetsSection,
  "Image 1 upload",
  (file) => replaceTimelineImage(1, file)
);

addFileUploadControl(
  assetsSection,
  "Image 2 upload",
  (file) => replaceTimelineImage(2, file)
);

addSelectControl(
  assetsSection,
  "Image 1 mode",
  ["threshold", "luminance", "alpha", "invert"],
  () => state.timelineAssets.image1SampleMode,
  (value) => {
    state.timelineAssets.image1SampleMode = value as "threshold" | "luminance" | "alpha" | "invert";
  }
);

addRangeControl(
  assetsSection,
  "Image 1 scale",
  0.2,
  5,
  0.1,
  () => state.timelineAssets.image1Scale,
  (value) => {
    state.timelineAssets.image1Scale = value;
  }
);

addSelectControl(
  assetsSection,
  "Image 2 mode",
  ["threshold", "luminance", "alpha", "invert"],
  () => state.timelineAssets.image2SampleMode,
  (value) => {
    state.timelineAssets.image2SampleMode = value as "threshold" | "luminance" | "alpha" | "invert";
  }
);

addRangeControl(
  assetsSection,
  "Image 2 scale",
  0.2,
  5,
  0.1,
  () => state.timelineAssets.image2Scale,
  (value) => {
    state.timelineAssets.image2Scale = value;
  }
);

const loopMap = document.createElement("pre");
loopMap.style.margin = "0";
loopMap.style.padding = "8px";
loopMap.style.borderRadius = "6px";
loopMap.style.background = "rgba(2, 6, 23, 0.7)";
loopMap.style.whiteSpace = "pre-wrap";
loopMap.style.color = "#cbd5e1";
loopMap.style.fontSize = "11px";
loopMap.textContent = [
  "Fixed 4-step loop:",
  "step0 -> Text 1",
  "step1 -> Image 1",
  "step2 -> Text 2",
  "step3 -> Image 2"
].join("\n");
assetsSection.appendChild(loopMap);

controlsPanel.appendChild(assetsSection);

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
    `steps=${steps.length}`
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const holdMs = step.holdMs ?? 0;
    const mode = step.transition?.mode ?? timeline.defaultTransition?.mode ?? "morph";
    const durationMs = step.transition?.durationMs ?? timeline.defaultTransition?.durationMs ?? 900;
    const nextStep = i + 1 < steps.length ? i + 1 : (timeline.loop ? 0 : -1);
    const sourceLabel =
      i === 0 ? "text1"
        : i === 1 ? "image1"
          : i === 2 ? "text2"
            : "image2";

    lines.push(`${cursor}ms -> step${i} [${step.mask}:${sourceLabel}] hold (${holdMs}ms)`);
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
utilityPanel.appendChild(runtimeSection);

function updateRuntimeStats(): void {
  applyTimelineStepAssets();
  const debugState = effect as unknown as EffectDebugState;
  const activeCells = debugState.cells
    ? debugState.cells.reduce((count, cell) => count + (cell.targetSize > 0.01 ? 1 : 0), 0)
    : 0;
  const totalCells = debugState.cells?.length ?? 0;
  const activeRipples = debugState.runtime?.activeRipples?.length ?? 0;
  const timelineState = effect.getMaskTimelineState();
  runtimeStats.textContent = [
    `fps: ${engine.getFPS().toFixed(1)}`,
    `active cells: ${activeCells}/${totalCells}`,
    `active ripples: ${activeRipples}`,
    `timeline: ${timelineState.playing ? "playing" : "paused"} step=${timelineState.stepIndex}`,
    `preset: ${state.preset}`
  ].join("\n");
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
        timelineAssets: {
          text1: state.timelineAssets.text1,
          text2: state.timelineAssets.text2,
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
        timelineAssets?: {
          text1?: string;
          text2?: string;
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
            ...parsed.config.hoverEffects
          },
          rippleEffects: {
            ...presetBase.rippleEffects,
            ...parsed.config.rippleEffects
          },
          breathing: {
            ...presetBase.breathing,
            ...parsed.config.breathing
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
utilityPanel.appendChild(ioSection);

function renderAllControls(): void {
  for (const refresh of refreshers) {
    refresh();
  }
  rebuildEffect();
  applyTimelineStepAssets(true);
  updateTimelinePreview();
  updateRuntimeStats();
}

document.body.appendChild(controlsPanel);
document.body.appendChild(utilityPanel);

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  effect.triggerRipple(
    event.clientX - rect.left,
    event.clientY - rect.top
  );
});

window.setInterval(updateRuntimeStats, 250);
updateTimelinePreview();
updateRuntimeStats();

window.addEventListener("beforeunload", () => {
  if (state.timelineAssets.image1ObjectUrl) {
    URL.revokeObjectURL(state.timelineAssets.image1ObjectUrl);
  }
  if (state.timelineAssets.image2ObjectUrl) {
    URL.revokeObjectURL(state.timelineAssets.image2ObjectUrl);
  }
});

engine.start();
