const { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { execSync } = require("node:child_process");

const repoRoot = resolve(process.cwd());
const benchRoot = mkdtempSync(join(tmpdir(), "pixel-engine-transition-bench-"));
const packsDir = join(benchRoot, "packs");
const appDir = join(benchRoot, "bench-app");
const benchOptions = parseOptions(process.argv.slice(2));

mkdirSync(packsDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

function run(command, cwd = repoRoot) {
  execSync(command, {
    cwd,
    stdio: "inherit"
  });
}

function findPack(prefix) {
  const files = readdirSync(packsDir);
  const match = files.find((file) => file.startsWith(prefix) && file.endsWith(".tgz"));
  if (!match) {
    throw new Error(`Missing tarball for ${prefix}`);
  }
  return join(packsDir, match);
}

function parseOptions(args) {
  const entries = new Map();
  for (const rawArg of args) {
    if (!rawArg.startsWith("--")) continue;
    const eqIndex = rawArg.indexOf("=");
    if (eqIndex === -1) {
      entries.set(rawArg.slice(2), "true");
      continue;
    }
    entries.set(rawArg.slice(2, eqIndex), rawArg.slice(eqIndex + 1));
  }

  const mode = entries.get("mode") ?? "all";
  if (!["all", "morph", "fade", "dissolve"].includes(mode)) {
    throw new Error(`Invalid --mode value "${mode}". Expected all|morph|fade|dissolve.`);
  }
  const scenario = entries.get("scenario") ?? "all";
  if (!["all", "text-image", "multi-mask"].includes(scenario)) {
    throw new Error(
      `Invalid --scenario value "${scenario}". Expected all|text-image|multi-mask.`
    );
  }

  const runs = Math.max(1, Number.parseInt(entries.get("runs") ?? "5", 10) || 5);
  const frames = Math.max(60, Number.parseInt(entries.get("frames") ?? "240", 10) || 240);
  const warmupFrames = Math.max(20, Number.parseInt(entries.get("warmup") ?? "60", 10) || 60);

  return { mode, scenario, runs, frames, warmupFrames };
}

const runnerCode = `
const { performance } = require("node:perf_hooks");
const { PixelGridEffect } = require("@pixel-engine/effects");
const benchmarkOptions = ${JSON.stringify(benchOptions)};

function createFakeCanvasContext(canvas) {
  return {
    canvas,
    fillStyle: "#ffffff",
    globalAlpha: 1,
    font: "bold 140px Arial",
    clearRect() {},
    drawImage() {},
    fillText() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    setTransform() {},
    measureText(text) {
      const width = Math.max(1, text.length * 42);
      return {
        width,
        actualBoundingBoxAscent: 64,
        actualBoundingBoxDescent: 20
      };
    },
    getImageData(x, y, w, h) {
      const width = Math.max(1, w | 0);
      const height = Math.max(1, h | 0);
      const data = new Uint8ClampedArray(width * height * 4);
      for (let iy = 0; iy < height; iy++) {
        for (let ix = 0; ix < width; ix++) {
          const index = (iy * width + ix) * 4;
          const base = (ix * 17 + iy * 31) & 255;
          data[index] = base;
          data[index + 1] = (base * 5) & 255;
          data[index + 2] = (base * 13) & 255;
          data[index + 3] = ((ix + iy) % 6 === 0) ? 210 : 255;
        }
      }
      return { data };
    }
  };
}

function createFakeCanvas() {
  const canvas = {
    width: 1,
    height: 1
  };
  const ctx = createFakeCanvasContext(canvas);
  canvas.getContext = (kind) => (kind === "2d" ? ctx : null);
  return canvas;
}

class FakeImage {
  constructor() {
    this.width = 420;
    this.height = 280;
    this._src = "";
    this._loaded = false;
    this._onload = null;
    this.onerror = null;
  }

  get src() {
    return this._src;
  }

  set src(value) {
    this._src = value;
    this._loaded = true;
    if (this._onload) this._onload();
  }

  get onload() {
    return this._onload;
  }

  set onload(handler) {
    this._onload = handler;
    if (this._loaded && handler) {
      handler();
    }
  }
}

global.window = {};
global.document = {
  createElement(tag) {
    if (tag === "canvas") return createFakeCanvas();
    return {};
  }
};
global.Image = FakeImage;

function average(values) {
  if (!values.length) return 0;
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  return total / values.length;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length * 0.5);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) * 0.5;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[position];
}

function createFakeRenderer() {
  const ctx = {
    fillStyle: "#000000",
    globalAlpha: 1,
    fillRect() {}
  };
  return {
    getContext() {
      return ctx;
    }
  };
}

function createScenarioConfig(scenarioKey, mode, width, height) {
  if (scenarioKey === "multi-mask") {
    return {
      key: "multi-mask",
      label: "multi-mask-4step",
      config: {
        colors: ["#334155", "#475569", "#64748b"],
        gap: 6,
        expandEase: 0.08,
        breathSpeed: 1,
        hoverEffects: {
          mode: "classic",
          radius: 110,
          radiusY: 110,
          shape: "circle",
          strength: 1,
          interactionScope: "all",
          deactivate: 0.8,
          displace: 0,
          jitter: 0,
          tintPalette: []
        },
        rippleEffects: {
          enabled: false,
          speed: 0.5,
          thickness: 44,
          strength: 24,
          maxRipples: 8,
          deactivateMultiplier: 1,
          displaceMultiplier: 1,
          jitterMultiplier: 1,
          tintPalette: []
        },
        breathing: {
          enabled: false,
          speed: 1,
          radius: 120,
          radiusY: 120,
          shape: "circle",
          strength: 0.5,
          minOpacity: 0.5,
          maxOpacity: 1,
          affectHover: false,
          affectImage: false,
          affectText: false
        },
        performance: {
          quality: "medium",
          viewportCulling: false
        },
        initialMask: "text",
        textMasks: [
          {
            id: "title",
            text: "PIXEL",
            centerX: width * 0.5,
            centerY: height * 0.48,
            font: "bold 140px Arial",
            strength: 1
          },
          {
            id: "subtitle",
            text: "ENGINE",
            centerX: width * 0.5,
            centerY: height * 0.58,
            font: "bold 112px Arial",
            strength: 1
          }
        ],
        imageMasks: [
          {
            id: "img-a",
            src: "/fake/mask-a.png",
            centerX: width * 0.5,
            centerY: height * 0.5,
            scale: 1,
            sampleMode: "threshold",
            strength: 1
          },
          {
            id: "img-b",
            src: "/fake/mask-b.png",
            centerX: width * 0.5,
            centerY: height * 0.5,
            scale: 0.85,
            sampleMode: "luminance",
            strength: 1
          }
        ],
        maskTimeline: {
          enabled: true,
          autoplay: true,
          loop: true,
          initialStep: 0,
          defaultTransition: {
            mode,
            durationMs: 360,
            seed: 1337
          },
          steps: [
            {
              mask: "text",
              assetId: "title",
              holdMs: 120,
              transition: {
                mode,
                durationMs: 360,
                seed: 1401
              }
            },
            {
              mask: "image",
              assetId: "img-a",
              holdMs: 120,
              transition: {
                mode,
                durationMs: 360,
                seed: 2401
              }
            },
            {
              mask: "text",
              assetId: "subtitle",
              holdMs: 120,
              transition: {
                mode,
                durationMs: 360,
                seed: 3401
              }
            },
            {
              mask: "image",
              assetId: "img-b",
              holdMs: 120,
              transition: {
                mode,
                durationMs: 360,
                seed: 4401
              }
            }
          ]
        }
      }
    };
  }

  return {
    key: "text-image",
    label: "text-image-2step",
    config: {
      colors: ["#334155", "#475569", "#64748b"],
      gap: 6,
      expandEase: 0.08,
      breathSpeed: 1,
      hoverEffects: {
        mode: "classic",
        radius: 110,
        radiusY: 110,
        shape: "circle",
        strength: 1,
        interactionScope: "all",
        deactivate: 0.8,
        displace: 0,
        jitter: 0,
        tintPalette: []
      },
      rippleEffects: {
        enabled: false,
        speed: 0.5,
        thickness: 44,
        strength: 24,
        maxRipples: 8,
        deactivateMultiplier: 1,
        displaceMultiplier: 1,
        jitterMultiplier: 1,
        tintPalette: []
      },
      breathing: {
        enabled: false,
        speed: 1,
        radius: 120,
        radiusY: 120,
        shape: "circle",
        strength: 0.5,
        minOpacity: 0.5,
        maxOpacity: 1,
        affectHover: false,
        affectImage: false,
        affectText: false
      },
      performance: {
        quality: "medium",
        viewportCulling: false
      },
      initialMask: "text",
      textMask: {
        text: "PIXEL",
        centerX: width * 0.5,
        centerY: height * 0.5,
        font: "bold 140px Arial",
        strength: 1
      },
      imageMask: {
        src: "/fake/mask.png",
        centerX: width * 0.5,
        centerY: height * 0.5,
        scale: 1,
        sampleMode: "threshold",
        strength: 1
      },
      maskTimeline: {
        enabled: true,
        autoplay: true,
        loop: true,
        initialStep: 0,
        defaultTransition: {
          mode,
          durationMs: 380,
          seed: 1337
        },
        steps: [
          {
            mask: "text",
            holdMs: 140,
            transition: {
              mode,
              durationMs: 380,
              seed: 1401
            }
          },
          {
            mask: "image",
            holdMs: 140,
            transition: {
              mode,
              durationMs: 380,
              seed: 2401
            }
          }
        ]
      }
    }
  };
}

function runSinglePass(mode, scenarioKey) {
  const width = 1000;
  const height = 700;
  const scenario = createScenarioConfig(scenarioKey, mode, width, height);
  const gap = scenario.config.gap;
  const frames = benchmarkOptions.frames;
  const warmupFrames = benchmarkOptions.warmupFrames;

  const enginePointer = {
    mouse: { x: width * 0.5, y: height * 0.5, inside: true, down: false },
    setClearColor() {},
    getSize() {
      return { width, height };
    }
  };

  const effect = new PixelGridEffect(
    enginePointer,
    width,
    height,
    scenario.config,
    { ripple: false, hover: false, organic: false }
  );

  const renderer = createFakeRenderer();
  const estimatedCells = Math.ceil(width / gap) * Math.ceil(height / gap);

  let transitions = 0;
  let previousStep = effect.getMaskTimelineState().stepIndex;

  for (let i = 0; i < warmupFrames; i++) {
    effect.update(16.67);
    effect.render(renderer);
    const currentStep = effect.getMaskTimelineState().stepIndex;
    if (currentStep !== previousStep) {
      transitions++;
      previousStep = currentStep;
    }
  }

  let updateTotalMs = 0;
  let renderTotalMs = 0;
  const heapStart = process.memoryUsage().heapUsed;

  for (let i = 0; i < frames; i++) {
    const updateStart = performance.now();
    effect.update(16.67);
    updateTotalMs += performance.now() - updateStart;

    const renderStart = performance.now();
    effect.render(renderer);
    renderTotalMs += performance.now() - renderStart;

    const currentStep = effect.getMaskTimelineState().stepIndex;
    if (currentStep !== previousStep) {
      transitions++;
      previousStep = currentStep;
    }
  }

  const heapEnd = process.memoryUsage().heapUsed;
  const avgUpdate = updateTotalMs / frames;
  const avgRender = renderTotalMs / frames;
  const avgFrame = avgUpdate + avgRender;
  const fps = 1000 / avgFrame;
  const heapDeltaMb = (heapEnd - heapStart) / (1024 * 1024);

  return {
    scenarioLabel: scenario.label,
    estimatedCells,
    avgUpdate,
    avgRender,
    avgFrame,
    fps,
    heapDeltaMb,
    transitions
  };
}

function getModes() {
  if (benchmarkOptions.mode === "all") {
    return ["morph", "fade", "dissolve"];
  }
  return [benchmarkOptions.mode];
}

function getScenarios() {
  if (benchmarkOptions.scenario === "all") {
    return ["text-image", "multi-mask"];
  }
  return [benchmarkOptions.scenario];
}

console.log("PixelGrid timeline transition benchmark");
console.log("- mode: " + benchmarkOptions.mode);
console.log("- scenario: " + benchmarkOptions.scenario);
console.log("- runs: " + benchmarkOptions.runs);
console.log("- frames: " + benchmarkOptions.frames + " (warmup " + benchmarkOptions.warmupFrames + ")");
console.log("");

for (const scenarioKey of getScenarios()) {
  for (const mode of getModes()) {
    const passResults = [];
    for (let runIndex = 0; runIndex < benchmarkOptions.runs; runIndex++) {
      passResults.push(runSinglePass(mode, scenarioKey));
    }

    const frameSeries = passResults.map((r) => r.avgFrame);
    const fpsSeries = passResults.map((r) => r.fps);
    const updateSeries = passResults.map((r) => r.avgUpdate);
    const renderSeries = passResults.map((r) => r.avgRender);
    const heapSeries = passResults.map((r) => r.heapDeltaMb);
    const transitionSeries = passResults.map((r) => r.transitions);
    const estimatedCells = passResults[0]?.estimatedCells ?? 0;
    const scenarioLabel = passResults[0]?.scenarioLabel ?? scenarioKey;

    console.log("Scenario: " + scenarioLabel + " | Transition mode: " + mode);
    console.log("- Cells (estimated): " + estimatedCells);
    console.log("- Avg update ms (mean): " + average(updateSeries).toFixed(3));
    console.log("- Avg render ms (mean): " + average(renderSeries).toFixed(3));
    console.log("- Avg frame ms (median): " + median(frameSeries).toFixed(3));
    console.log("- Avg frame ms (mean): " + average(frameSeries).toFixed(3));
    console.log("- Frame p95 ms: " + percentile(frameSeries, 0.95).toFixed(3));
    console.log("- Est. FPS (median): " + median(fpsSeries).toFixed(1));
    console.log("- Est. FPS (mean): " + average(fpsSeries).toFixed(1));
    console.log("- Heap delta MB (mean): " + average(heapSeries).toFixed(3));
    console.log("- Timeline transitions sampled (mean): " + average(transitionSeries).toFixed(1));
    console.log("");
  }
}
`;

try {
  run(`npm pack --pack-destination "${packsDir}" -w @pixel-engine/core`);
  run(`npm pack --pack-destination "${packsDir}" -w @pixel-engine/effects`);

  const coreTgz = findPack("pixel-engine-core-");
  const effectsTgz = findPack("pixel-engine-effects-");

  writeFileSync(
    join(appDir, "package.json"),
    JSON.stringify(
      {
        name: "pixel-engine-transition-bench-runner",
        private: true
      },
      null,
      2
    )
  );

  writeFileSync(join(appDir, "runner.cjs"), runnerCode);

  run(
    `npm install --no-package-lock --ignore-scripts "${coreTgz}" "${effectsTgz}"`,
    appDir
  );

  run("node runner.cjs", appDir);
} finally {
  rmSync(benchRoot, { recursive: true, force: true });
}
