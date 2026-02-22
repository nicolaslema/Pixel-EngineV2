import { PixelEngine } from "../src/core/PixelEngine";
import { PixelGridEffect } from "../src/entities/PixelGridEffect";
import type { PixelGridConfig, PixelGridInfluenceOptions } from "../src/entities/pixel-grid/types";

type PlaygroundPreset = "minimal" | "card-soft" | "card-ripple" | "hero-image";

interface PlaygroundState {
  preset: PlaygroundPreset;
  config: PixelGridConfig;
  influenceOptions: PixelGridInfluenceOptions;
  pageColor: string;
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
        enabled: true,
        holdImageMs: 1400,
        holdTextMs: 1400,
        morphDurationMs: 900,
        intervalMs: 140
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
  pageColor: "#0b1020"
};

document.body.style.backgroundColor = state.pageColor;

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
}

const panel = document.createElement("div");
panel.style.position = "fixed";
panel.style.top = "12px";
panel.style.right = "12px";
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
header.textContent = "Pixel Playground";
header.style.fontWeight = "700";
header.style.fontSize = "13px";
panel.appendChild(header);

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
  const sync = () => {
    const value = getValue();
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

const setupSection = createSection("Setup");

addSelectControl(
  setupSection,
  "preset",
  ["minimal", "card-soft", "card-ripple", "hero-image"],
  () => state.preset,
  (value) => {
    state.preset = value as PlaygroundPreset;
    state.config = createPresetConfig(state.preset);
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

panel.appendChild(setupSection);

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
panel.appendChild(interactionSection);

const timelineSection = createSection("Mask Timeline");
addCheckboxControl(
  timelineSection,
  "autoMorph",
  () => !!state.config.autoMorph?.enabled,
  (value) => {
    state.config.autoMorph = {
      ...state.config.autoMorph,
      enabled: value
    };
  }
);

addRangeControl(
  timelineSection,
  "holdImageMs",
  100,
  5000,
  50,
  () => state.config.autoMorph?.holdImageMs ?? 1200,
  (value) => {
    state.config.autoMorph = {
      ...state.config.autoMorph,
      holdImageMs: value
    };
  }
);

addRangeControl(
  timelineSection,
  "morphDurationMs",
  100,
  2500,
  50,
  () => state.config.autoMorph?.morphDurationMs ?? 900,
  (value) => {
    state.config.autoMorph = {
      ...state.config.autoMorph,
      morphDurationMs: value
    };
  }
);

addRangeControl(
  timelineSection,
  "holdTextMs",
  100,
  5000,
  50,
  () => state.config.autoMorph?.holdTextMs ?? 1200,
  (value) => {
    state.config.autoMorph = {
      ...state.config.autoMorph,
      holdTextMs: value
    };
  }
);

addRangeControl(
  timelineSection,
  "intervalMs",
  0,
  2000,
  25,
  () => state.config.autoMorph?.intervalMs ?? 120,
  (value) => {
    state.config.autoMorph = {
      ...state.config.autoMorph,
      intervalMs: value
    };
  }
);

const timelinePreview = document.createElement("pre");
timelinePreview.style.margin = "0";
timelinePreview.style.padding = "8px";
timelinePreview.style.borderRadius = "6px";
timelinePreview.style.background = "rgba(2, 6, 23, 0.7)";
timelinePreview.style.whiteSpace = "pre-wrap";
timelinePreview.style.color = "#cbd5e1";
timelinePreview.style.fontSize = "11px";
timelineSection.appendChild(timelinePreview);
panel.appendChild(timelineSection);

function updateTimelinePreview(): void {
  const autoMorph = state.config.autoMorph;
  if (!autoMorph?.enabled) {
    timelinePreview.textContent = "autoMorph disabled";
    return;
  }

  const holdImage = (autoMorph.holdImageMs ?? 1200) + (autoMorph.intervalMs ?? 0);
  const morph = autoMorph.morphDurationMs ?? 900;
  const holdText = (autoMorph.holdTextMs ?? 1200) + (autoMorph.intervalMs ?? 0);
  const cycle = holdImage + morph + holdText + morph;

  timelinePreview.textContent = [
    "Loop preview:",
    `0ms -> image hold (${holdImage}ms)`,
    `${holdImage}ms -> morph image->text (${morph}ms)`,
    `${holdImage + morph}ms -> text hold (${holdText}ms)`,
    `${holdImage + morph + holdText}ms -> morph text->image (${morph}ms)`,
    `cycle = ${cycle}ms`
  ].join("\n");
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
panel.appendChild(runtimeSection);

function updateRuntimeStats(): void {
  const debugState = effect as unknown as EffectDebugState;
  const activeCells = debugState.cells
    ? debugState.cells.reduce((count, cell) => count + (cell.targetSize > 0.01 ? 1 : 0), 0)
    : 0;
  const totalCells = debugState.cells?.length ?? 0;
  const activeRipples = debugState.runtime?.activeRipples?.length ?? 0;
  runtimeStats.textContent = [
    `fps: ${engine.getFPS().toFixed(1)}`,
    `active cells: ${activeCells}/${totalCells}`,
    `active ripples: ${activeRipples}`,
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
        influenceOptions: state.influenceOptions
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
          autoMorph: {
            ...presetBase.autoMorph,
            ...parsed.config.autoMorph
          }
        };
      }

      if (parsed.influenceOptions) {
        state.influenceOptions = {
          ...state.influenceOptions,
          ...parsed.influenceOptions
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
panel.appendChild(ioSection);

function renderAllControls(): void {
  for (const refresh of refreshers) {
    refresh();
  }
  rebuildEffect();
  updateTimelinePreview();
  updateRuntimeStats();
}

document.body.appendChild(panel);

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
engine.start();
