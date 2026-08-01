# Pixel Engine API

This document focuses on the stable, vanilla `@pixel-engine/core`/`@pixel-engine/effects` public API (framework-agnostic) for the current v1 baseline plus v1.1 runtime hardening. For `@pixel-engine/react`, see [`packages/react/README.md`](packages/react/README.md).

## Packages

- `@pixel-engine/core`: engine lifecycle, scene, renderer, input
- `@pixel-engine/effects`: `PixelGridEffect` + influences/masks
- `@pixel-engine/react`: React hooks/components + presets/declarative helpers

## Package Boundary Rules

- Source-of-truth implementation lives in `packages/*/src` (`@pixel-engine/core`, `@pixel-engine/effects`, `@pixel-engine/react`).
- Root `src/index.ts` is a thin re-export used to build the aggregate `pixel-engine` compatibility package; it has no implementation of its own.

## Core + Effects (manual)

```ts
import { PixelEngine } from "@pixel-engine/core";
import { PixelGridEffect } from "@pixel-engine/effects";

const engine = new PixelEngine({ canvas, width: 1000, height: 700 });
const grid = new PixelGridEffect(engine, 1000, 700, {
  colors: ["#334155", "#475569", "#64748b"],
  gap: 6,
  expandEase: 0.08,
  breathSpeed: 1
});
engine.addEntity(grid);
engine.start();
```

Resize without remount:

```ts
grid.resize(1200, 760);
```

Runtime diagnostics snapshot:

```ts
const debug = grid.getDebugSnapshot();
// { totalCells, activeCells, activeRipples, timeline: { playing, stepIndex } }
```

### `MorphMaskInfluence` (manual/advanced)

`@pixel-engine/effects` exports `MorphMaskInfluence`, a standalone `Influence` that continuously interpolates between two other mask sources over a fixed duration:

```ts
import { MorphMaskInfluence, TextMaskInfluence, ImageMaskInfluence } from "@pixel-engine/effects";

const morph = new MorphMaskInfluence(maskA, maskB, /* durationMs */ 1200);
// morph.isAlive() is true until the interpolation finishes (t reaches 1)
```

This is independent of the declarative `maskTimeline` system (`PixelGridConfig.maskTimeline`, driven through React presets/`gridConfig` or direct config) — that system uses `TimelineTransitionMaskInfluence` internally, not `MorphMaskInfluence`. `MorphMaskInfluence` is for consumers building a scene manually against `@pixel-engine/core`/`@pixel-engine/effects` who want a one-off continuous blend between two mask sources without going through the timeline config.

## Core Loop and Scheduler Semantics

- Simulation runs on fixed timestep updates.
- `timeScale` is applied at loop accumulation/scheduling level (not by scaling per-step simulation delta).
- `Time` exposes separate domains:
  - `time.simulationDelta` (fixed-step simulation delta)
  - `time.renderDelta` (raw frame render delta)
  - `time.elapsed` (simulated elapsed time)
- `PixelEngine` exposes `getScheduler()` for deterministic phased tasks.
- Engine runtime tuning is explicit:
  - `quality` defines scheduling defaults (`low` | `medium` | `high`)
  - `loop` overrides expose fixed-step tuning (`fixedTimeStep`, `maxDelta`, `maxUpdatesPerFrame`)

Scheduler phases:
- `preUpdate`
- `update`
- `postUpdate`
- `preRender`
- `render`
- `postRender`

Example:

```ts
const scheduler = engine.getScheduler();

scheduler.add("metrics-pre", (delta) => {
  // fixed simulation delta
}, { phase: "preUpdate", priority: 0 });

scheduler.add("ui-render-hook", (renderDelta, alpha) => {
  // render-domain callback
}, { phase: "postRender", priority: 10 });

engine.getTime().timeScale = 0.5; // slow-motion by reducing update scheduling rate
```

Engine runtime tuning example:

```ts
const engine = new PixelEngine({
  canvas,
  width: 1000,
  height: 700,
  quality: "high",
  loop: {
    fixedTimeStep: 12,
    maxDelta: 180,
    maxUpdatesPerFrame: 64
  }
});

console.log(engine.getQuality()); // "high"
console.log(engine.getLoopTuning()); // resolved runtime loop profile
```

## React

The full `@pixel-engine/react` reference (hooks, components, prop tables, `influenceOptions`, `PixelGridConfig`, examples, compatibility notes) has moved to a dedicated guide: **[`packages/react/README.md`](packages/react/README.md)**. This document covers `core`/`effects` (vanilla, framework-agnostic usage) only, above.
