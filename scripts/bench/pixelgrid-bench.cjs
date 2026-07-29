const { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { execSync } = require("node:child_process");

const repoRoot = resolve(process.cwd());
const benchRoot = mkdtempSync(join(tmpdir(), "pixel-engine-bench-"));
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

  const suite = entries.get("suite") ?? "all";
  if (!["all", "classic", "stress", "rippleStorm"].includes(suite)) {
    throw new Error(`Invalid --suite value "${suite}". Expected all|classic|stress|rippleStorm.`);
  }

  const runs = Math.max(1, Number.parseInt(entries.get("runs") ?? "5", 10) || 5);
  const frames = Math.max(60, Number.parseInt(entries.get("frames") ?? "240", 10) || 240);
  const warmupFrames = Math.max(20, Number.parseInt(entries.get("warmup") ?? "60", 10) || 60);

  return { suite, runs, frames, warmupFrames };
}

const runnerCode = `
const { performance } = require("node:perf_hooks");
const { PixelGridEffect } = require("@pixel-engine/effects");
const benchmarkOptions = ${JSON.stringify(benchOptions)};

function createFakeRenderer() {
  const ctx = { fillStyle: "#000000", globalAlpha: 1, fillRect() {} };
  return { getContext() { return ctx; } };
}

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

function createScenarios() {
  return {
    classic: {
      title: "classic-comparable",
      description: "Legacy-comparable scenario. Effect size equals viewport size.",
      viewportWidth: 1000,
      viewportHeight: 700,
      effectWidth: 1000,
      effectHeight: 700,
      gap: 6,
      qualityModes: ["medium"],
      performance: {
        quality: "medium",
        viewportCulling: false
      },
      rippleMax: 24
    },
    stress: {
      title: "stress-overdraw",
      description: "Realistic heavy workload. Effect area is larger than viewport.",
      viewportWidth: 1000,
      viewportHeight: 700,
      effectWidth: 1600,
      effectHeight: 1100,
      gap: 6,
      qualityModes: ["low", "medium", "high"],
      performance: {},
      rippleMax: 64
    },
    rippleStorm: {
      title: "ripple-storm-dense-gap",
      description: "Dense grid (gap=3) with several large-radius ripples active simultaneously -- the reported gap<=3 + rapid-click freeze scenario (items 1.1/1.2).",
      viewportWidth: 1000,
      viewportHeight: 700,
      effectWidth: 1500,
      effectHeight: 1000,
      gap: 3,
      // Deliberately excludes "low": low tier's maxCellsCap (120,000) is below this
      // scenario's ~166,944 cells and would get gap-clamped by item 1.1's safety net,
      // conflating the two fixes' effects in one measurement.
      qualityModes: ["medium", "high"],
      performance: {},
      rippleMax: 48,
      rippleTriggerInterval: 3
    }
  };
}

function runSinglePass(scenario, quality) {
  const {
    viewportWidth,
    viewportHeight,
    effectWidth,
    effectHeight,
    gap
  } = scenario;
  const frames = benchmarkOptions.frames;
  const warmupFrames = benchmarkOptions.warmupFrames;

  const enginePointer = {
    mouse: { x: viewportWidth * 0.5, y: viewportHeight * 0.5, inside: true, down: false },
    setClearColor() {},
    getSize() {
      return { width: viewportWidth, height: viewportHeight };
    }
  };

  const effect = new PixelGridEffect(
    enginePointer,
    effectWidth,
    effectHeight,
    {
      colors: ["#334155", "#475569", "#64748b"],
      gap,
      expandEase: 0.08,
      breathSpeed: 1,
      hoverEffects: {
        mode: "reactive",
        radius: 120,
        radiusY: 95,
        shape: "vignette",
        interactionScope: "all",
        deactivate: 0.8,
        displace: 3,
        jitter: 1.2,
        strength: 1
      },
      rippleEffects: {
        enabled: true,
        speed: 0.5,
        thickness: 48,
        strength: 28,
        maxRipples: scenario.rippleMax,
        deactivateMultiplier: 0.9,
        displaceMultiplier: 1.1,
        jitterMultiplier: 1.1
      },
      breathing: {
        enabled: true,
        speed: 1.2,
        strength: 0.5,
        affectHover: true,
        affectImage: false,
        affectText: false
      },
      performance: {
        ...scenario.performance,
        detail: quality
      }
    },
    { ripple: true, hover: true, organic: false }
  );

  const renderer = createFakeRenderer();
  const estimatedCells = Math.ceil(effectWidth / gap) * Math.ceil(effectHeight / gap);
  const rippleTriggerInterval = scenario.rippleTriggerInterval ?? 12;

  for (let i = 0; i < warmupFrames; i++) {
    enginePointer.mouse.x = (Math.sin(i * 0.07) * 0.4 + 0.5) * viewportWidth;
    enginePointer.mouse.y = (Math.cos(i * 0.09) * 0.4 + 0.5) * viewportHeight;
    if (i % rippleTriggerInterval === 0) {
      effect.triggerRipple(enginePointer.mouse.x, enginePointer.mouse.y);
    }
    effect.update(16.67);
    effect.render(renderer);
  }

  let updateTotalMs = 0;
  let renderTotalMs = 0;
  const heapStart = process.memoryUsage().heapUsed;

  for (let i = 0; i < frames; i++) {
    enginePointer.mouse.x = (Math.sin(i * 0.07) * 0.4 + 0.5) * viewportWidth;
    enginePointer.mouse.y = (Math.cos(i * 0.09) * 0.4 + 0.5) * viewportHeight;
    if (i % rippleTriggerInterval === 0) {
      effect.triggerRipple(enginePointer.mouse.x, enginePointer.mouse.y);
    }

    const updateStart = performance.now();
    effect.update(16.67);
    updateTotalMs += performance.now() - updateStart;

    const renderStart = performance.now();
    effect.render(renderer);
    renderTotalMs += performance.now() - renderStart;
  }

  const heapEnd = process.memoryUsage().heapUsed;
  const avgUpdate = updateTotalMs / frames;
  const avgRender = renderTotalMs / frames;
  const avgFrame = avgUpdate + avgRender;
  const fps = 1000 / avgFrame;
  const heapDeltaMb = (heapEnd - heapStart) / (1024 * 1024);

  return {
    estimatedCells,
    avgUpdate,
    avgRender,
    avgFrame,
    fps,
    heapDeltaMb
  };
}

function runScenario(scenarioKey, scenario) {
  console.log("Scenario: " + scenario.title + " (" + scenarioKey + ")");
  console.log("- Description: " + scenario.description);
  console.log("- Viewport: " + scenario.viewportWidth + "x" + scenario.viewportHeight);
  console.log("- Effect area: " + scenario.effectWidth + "x" + scenario.effectHeight);
  console.log("- Gap: " + scenario.gap);
  console.log("- Runs: " + benchmarkOptions.runs);
  console.log("- Frames: " + benchmarkOptions.frames + " (warmup " + benchmarkOptions.warmupFrames + ")");
  console.log("");

  for (const quality of scenario.qualityModes) {
    const passResults = [];
    for (let runIndex = 0; runIndex < benchmarkOptions.runs; runIndex++) {
      passResults.push(runSinglePass(scenario, quality));
    }

    const frameSeries = passResults.map((r) => r.avgFrame);
    const fpsSeries = passResults.map((r) => r.fps);
    const updateSeries = passResults.map((r) => r.avgUpdate);
    const renderSeries = passResults.map((r) => r.avgRender);
    const heapSeries = passResults.map((r) => r.heapDeltaMb);
    const estimatedCells = passResults[0]?.estimatedCells ?? 0;

    console.log("Quality: " + quality);
    console.log("- Cells (estimated): " + estimatedCells);
    console.log("- Avg update ms (mean): " + average(updateSeries).toFixed(3));
    console.log("- Avg render ms (mean): " + average(renderSeries).toFixed(3));
    console.log("- Avg frame ms (median): " + median(frameSeries).toFixed(3));
    console.log("- Avg frame ms (mean): " + average(frameSeries).toFixed(3));
    console.log("- Frame p95 ms: " + percentile(frameSeries, 0.95).toFixed(3));
    console.log("- Est. FPS (median): " + median(fpsSeries).toFixed(1));
    console.log("- Est. FPS (mean): " + average(fpsSeries).toFixed(1));
    console.log("- Heap delta MB (mean): " + average(heapSeries).toFixed(3));
    console.log("");
  }
}

function getScenarioKeys(suite) {
  if (suite === "classic") return ["classic"];
  if (suite === "stress") return ["stress"];
  if (suite === "rippleStorm") return ["rippleStorm"];
  return ["classic", "stress"];
}

const scenarios = createScenarios();
const selectedScenarios = getScenarioKeys(benchmarkOptions.suite);

console.log("PixelGrid benchmark suite");
console.log("- suite: " + benchmarkOptions.suite);
console.log("- runs: " + benchmarkOptions.runs);
console.log("");

for (const key of selectedScenarios) {
  runScenario(key, scenarios[key]);
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
        name: "pixel-engine-bench-runner",
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
