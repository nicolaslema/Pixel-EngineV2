# Pixel Engine

High-performance 2D pixel simulation engine for browser apps and UI frameworks.

## Status

- Stable API baseline for core runtime + `PixelGridEffect`
- Phase A/B/C/D completed
- Phase E completed (PR-E1 + PR-E2 + PR-E3)
- Phase F completed (PR-F1 + PR-F2 + PR-F3)
- v1.1 Phase 1 completed (PR-1A + PR-1B)
- v1.1 Phase 2 completed (PR-2A + PR-2B)
- v1.1 Phase 3 completed (PR-3A + PR-3B)

## Install

Recommended split packages:

```bash
npm install @pixel-engine/core @pixel-engine/effects @pixel-engine/react
```

Compatibility aggregate package:

```bash
npm install pixel-engine
```

## Quick Start React (1 minute)

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export default function App() {
  return (
    <PixelGridCanvas
      width={900}
      height={520}
      preset="card-soft"
      onRipple={(e) => console.log("ripple", e.x, e.y)}
    />
  );
}
```

Install + run:

```bash
npm install @pixel-engine/core @pixel-engine/effects @pixel-engine/react
```

## Core Quick Usage (vanilla)

```ts
import { PixelEngine } from "@pixel-engine/core";
import { PixelGridEffect } from "@pixel-engine/effects";

const canvas = document.getElementById("app") as HTMLCanvasElement;
const width = 1000;
const height = 700;

const engine = new PixelEngine({ canvas, width, height });
const grid = new PixelGridEffect(engine, width, height, {
  colors: ["#334155", "#475569", "#64748b"],
  gap: 6,
  expandEase: 0.08,
  breathSpeed: 1
});

engine.addEntity(grid);
engine.start();
```

## React Usage Guide

### 1) Simple usage (fastest start)

Use a preset, no manual engine wiring:

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function SimplePreset() {
  return <PixelGridCanvas width={900} height={520} preset="card-soft" />;
}
```

### 2) Simple config (preset + small override)

Keep defaults but tune a few values:

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function PresetWithOverrides() {
  return (
    <PixelGridCanvas
      width={900}
      height={520}
      preset="card-ripple"
      gridConfig={{
        gap: 6,
        rippleEffects: { maxRipples: 36 },
        hoverEffects: { radius: 120 }
      }}
    />
  );
}
```

### 3) Advanced config (callbacks + timeline items)

Use interaction callbacks and declarative `mask`:

```tsx
import catPngUrl from "./assets/cat.png";
import { PixelGridCanvas } from "@pixel-engine/react";

export function AdvancedMask() {
  return (
    <PixelGridCanvas
      width={900}
      height={520}
      preset="hero-image"
      onHoverStart={(e) => console.log("hover start", e.x, e.y)}
      onHoverEnd={(e) => console.log("hover end", e.x, e.y)}
      onRipple={(e) => console.log("ripple", e.x, e.y)}
      mask={{
        type: "hybrid",
        initialMask: "image",
        texts: [
          { id: "title", text: "PIXEL", centerX: 450, centerY: 275, fontSize: 132, fontFamily: "Arial", fontWeight: 700 },
          { id: "subtitle", text: "ENGINE", centerX: 450, centerY: 275, fontSize: 112, fontFamily: "Arial", fontWeight: 700 }
        ],
        images: [
          { id: "catA", src: catPngUrl, centerX: 450, centerY: 250, scale: 2.1, sampleMode: "threshold" },
          { id: "catB", src: catPngUrl, centerX: 450, centerY: 250, scale: 1.6, sampleMode: "luminance" }
        ],
        items: [
          { type: "text", id: "title", text: "PIXEL", centerX: 450, centerY: 275, fontSize: 132, fontFamily: "Arial", fontWeight: 700 },
          { type: "image", id: "catA", src: catPngUrl, centerX: 450, centerY: 250, scale: 2.1, sampleMode: "threshold" },
          { type: "text", id: "subtitle", text: "ENGINE", centerX: 450, centerY: 275, fontSize: 112, fontFamily: "Arial", fontWeight: 700 },
          { type: "image", id: "catB", src: catPngUrl, centerX: 450, centerY: 250, scale: 1.6, sampleMode: "luminance" }
        ],
        steps: [
          { mask: "text", assetId: "title", holdMs: 1100, mode: "morph", durationMs: 700 },
          { mask: "image", assetId: "catA", holdMs: 1000, mode: "fade", durationMs: 450 },
          { mask: "text", assetId: "subtitle", holdMs: 1100, mode: "dissolve", durationMs: 620 },
          { mask: "image", assetId: "catB", holdMs: 1000, mode: "fade", durationMs: 450 }
        ],
        maskTimeline: {
          enabled: true,
          autoplay: true,
          loop: true,
          initialStep: 0
        }
      }}
      effectKey="hero-timeline-v2"
    />
  );
}
```

Timeline model notes:
- `maskTimeline.items`: declares timeline assets (text/image masks).
- `steps[].assetId`: points to an asset declared in `items`.
- `steps[].mode` and `steps[].durationMs`: transition aliases for fast authoring.
- `steps[].transition`: still supported for full control (`seed`, explicit fields).

### 4) Custom config (public helpers)

Build reusable team presets:

```tsx
import catPngUrl from "./assets/cat.png";
import {
  PixelGridCanvas,
  createPixelPreset,
  mergePixelOptions,
  createMaskConfig
} from "@pixel-engine/react";

const base = createPixelPreset("card-ripple");
const tuned = mergePixelOptions(base, {
  gap: 6,
  hoverEffects: { shape: "vignette", radius: 125 },
  rippleEffects: { maxRipples: 40 }
});
const mask = createMaskConfig({
  type: "image",
  src: catPngUrl,
  centerX: 450,
  centerY: 260,
  scale: 2
});

export function CustomConfig() {
  return <PixelGridCanvas width={900} height={520} gridConfig={{ ...tuned, ...mask }} />;
}
```

### 5) Overlay content (`PixelCard` / `PixelSurface`)

By default, overlay content does not block canvas interactions:

```tsx
import { PixelCard } from "@pixel-engine/react";

export function Card() {
  return (
    <PixelCard width={420} height={240} preset="card-soft">
      <h3>Pixel Card</h3>
    </PixelCard>
  );
}
```

- Default: `overlayPointerEvents="none"` (hover/ripple pass through)
- Set `overlayPointerEvents="auto"` only when overlay UI must be clickable
- Set `overlayPointerEvents="hybrid"` to keep overlay clickable and still forward hover/ripple interactions to canvas

## When to use what

- Use `preset` for the fastest setup.
- Use `gridConfig` for low-level control.
- Use `preset + gridConfig` for baseline + focused overrides.
- Use helpers for reusable shared configs across multiple screens/components.

## Preset Catalog

- `minimal`: low-noise baseline for neutral backgrounds and subtle motion.
- `card-soft`: soft reactive hover + breathing for cards/panels.
- `card-ripple`: ripple-forward interactions for clickable UI surfaces.
- `hero-image`: high-presence interactive style for image/text hero sections.
  - Best with an image mask (`mask.image` or `gridConfig.imageMask`).

Preset matrix:

| Preset | Best for | Mask support | Interaction profile |
|---|---|---|---|
| `minimal` | neutral backgrounds | optional | subtle |
| `card-soft` | cards/panels | optional | soft reactive hover |
| `card-ripple` | clickable UI surfaces | optional | stronger ripple feedback |
| `hero-image` | hero sections/showcases | recommended | stronger reactive + mask-oriented |

## React Compatibility Notes

- Rendering:
  - SSR-safe initialization (`window` guards) is built in.
  - Engine/effect creation happens after mount.
- Assets:
  - Use bundler URLs (`import imageUrl from "./assets/file.png"`).
  - Avoid `"/src/..."` runtime paths.
- Overlay interactions:
  - `PixelSurface`/`PixelCard` default to `overlayPointerEvents="none"`.
  - Set `overlayPointerEvents="auto"` for clickable overlay UI.
  - Set `overlayPointerEvents="hybrid"` for clickable overlay UI while preserving canvas hover/ripple via pointer bridge forwarding.
- Effect lifecycle:
  - Use `effectKey` when you want an intentional effect remount.
  - Keep `effectKey` stable to avoid unnecessary remounts.
- Mask guidance:
  - `hero-image` should be paired with an image mask.
  - `mask.type = "hybrid"` is recommended for text+image morph flows.
  - `mask.type = "hybrid"` supports declarative timeline assets + sequencing:
    - `items[]` for asset definitions
    - `steps[].assetId` for step-to-asset mapping
    - `mode`/`durationMs` aliases or full `transition` per step
- Runtime quality:
  - `PixelGridEffect` supports `performance.quality` (`low` | `medium` | `high`).
  - `performance.viewportCulling` can reduce render cost when effect area is larger than viewport.

## External React Validation

Validated in an external React project (Vite + TypeScript) with local package installation:
- `PixelCanvas`
- `PixelGridCanvas`
- `PixelSurface`
- `PixelCard`

## Package Split

- `@pixel-engine/core`: runtime primitives
- `@pixel-engine/effects`: `PixelGridEffect`, influences, masks
- `@pixel-engine/react`: hooks/components + presets/declarative helpers

## Architecture

- `core`: engine lifecycle, loop, timing
- `scene`: entities + update/render traversal
- `renderers`: abstraction + Canvas2D implementation
- `influences`: reusable influence primitives
- `entities`: high-level effects (`PixelGridEffect`)
- `entities/pixel-grid/internal`: private runtime modules (not part of public API)

## Loop and Scheduler Semantics

- Simulation uses a fixed timestep update loop.
- Core runtime scheduling can be tuned from `PixelEngine`:
  - `quality`: scheduling profile defaults (`low` | `medium` | `high`)
  - `loop`: explicit overrides (`fixedTimeStep`, `maxDelta`, `maxUpdatesPerFrame`)
- `timeScale` now controls update scheduling at accumulator level.
  - `0` pauses simulation updates.
  - `0.5` halves simulation update frequency (slow-motion).
  - `2` doubles simulation update frequency (fast-forward).
- `Time` separates domains:
  - `simulationDelta`: fixed simulation step
  - `renderDelta`: render-frame delta
  - `elapsed`: simulated elapsed time
- `PixelEngine` exposes `getScheduler()` with deterministic phased execution and priority ordering.
- Runtime profile inspection:
  - `engine.getQuality()`
  - `engine.getLoopTuning()`

Runtime tuning example:

```ts
const engine = new PixelEngine({
  canvas,
  width,
  height,
  quality: "high",
  loop: {
    fixedTimeStep: 12,
    maxDelta: 180,
    maxUpdatesPerFrame: 64
  }
});
```

Scheduler phases:
- `preUpdate`
- `update`
- `postUpdate`
- `preRender`
- `render`
- `postRender`

## Scripts

- `npm run test`
- `npm run test:ci`
- `npm run test:visual`
- `npm run build`
- `npm run build:packages`
- `npm run build:all`
- `npm run bench:pixelgrid`
- `npm run bench:pixelgrid:classic`
- `npm run bench:pixelgrid:stress`
- `npm run bench:pixelgrid:all`
- `npm run bench:transition`
- `npm run bench:transition:all`
- `npm run bench:transition:legacy`
- `npm run bench:transition:multi`
- `npm run bench:transition:morph`
- `npm run bench:transition:fade`
- `npm run bench:transition:dissolve`
- `npm run typecheck`
- `npm run verify`
- `npm run release:check`
- `npm run release:docs:prepare`
- `npm run release:docs:check`
- `npm run release:pack:verify`

Detailed scripts:

- `npm run dev`: runs playground with Vite.
- `npm run test`: runs Vitest.
- `npm run test:ci`: runs Vitest once (CI mode).
- `npm run test:visual`: runs deterministic PixelGrid visual baseline snapshots.
- `npm run build`: builds distributable library with tsup (ESM/CJS/types).
- `npm run parity:check`: verifies drift-sensitive source parity between `packages/*` and mirrored `src/*`.
- `npm run typecheck`: TypeScript validation (`tsc --noEmit`).
- `npm run build:packages`: builds `@pixel-engine/core`, `@pixel-engine/effects`, and `@pixel-engine/react`.
- `npm run build:all`: builds aggregate + split packages.
- `npm run verify`: parity + test + build + typecheck.
- `npm run bench:pixelgrid`: runs `classic + stress` suites (3 runs each, faster default).
- `npm run bench:pixelgrid:classic`: comparable regression baseline (5 runs).
- `npm run bench:pixelgrid:stress`: heavy overdraw + quality tiers (5 runs).
- `npm run bench:pixelgrid:all`: full benchmark pack (classic + stress, 5 runs).
- `npm run bench:transition`: runs transition benchmark across both scenarios (`text-image` + `multi-mask`) and all modes (`morph + fade + dissolve`), 3 runs.
- `npm run bench:transition:all`: full transition benchmark pack across both scenarios and all modes, 5 runs.
- `npm run bench:transition:legacy`: transition benchmark only for legacy `text-image` scenario (all modes, 5 runs).
- `npm run bench:transition:multi`: transition benchmark only for `multi-mask` scenario (all modes, 5 runs).
- `npm run bench:transition:morph`: transition benchmark only for `morph` mode (all scenarios).
- `npm run bench:transition:fade`: transition benchmark only for `fade` mode (all scenarios).
- `npm run bench:transition:dissolve`: transition benchmark only for `dissolve` mode (all scenarios).
- `npm run smoke:consumer`: validates package consumption from local tarballs.
- `npm run release:check`: verify + pack dry-runs + consumer smoke test.
- `npm run release:docs:prepare`: scaffold release entries in `CHANGELOG.md` and `MIGRATION.md`.
- `npm run release:docs:check`: validate release docs version coverage.
- `npm run release:pack:verify`: generate and verify non-empty tarballs for all publishable packages.
- `npm run build:playground`: builds playground app with Vite.

CI quality gates:

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Required checks:
  - `npm run test:ci`
  - `npm run build`
  - `npm run typecheck`
  - `npm run build:packages`
  - `npm run smoke:consumer`
  - `npm run test:visual`

References:

- API reference and examples: `API.md`
- Release notes: `CHANGELOG.md`
- Migration guide: `MIGRATION.md`
- Release workflow: `RELEASE.md`
- Benchmark notes: `BENCHMARKS.md`
- Formal publish checklist: `RELEASE_CHECKLIST.md`

## Package Split (Detailed)

- `@pixel-engine/core`: runtime primitives (engine, loop, scene, renderers, input, base grid helpers).
- `@pixel-engine/effects`: high-level effects (`PixelGridEffect`), influences, masks.
- `@pixel-engine/react`: React hook/components (`usePixelEngine`, `usePixelGridEffect`, `PixelCanvas`, `PixelGridCanvas`, `PixelSurface`, `PixelCard`).

## Source of Truth Policy

- Authoritative implementation lives under `packages/*/src`.
- Root `src/*` exists as compatibility/testing mirror for aggregate workflows.
- Any runtime change in `packages/core/src/*` or `packages/effects/src/*` must keep mirrored `src/*` in sync.
- `npm run parity:check` is the guardrail that fails on drift for mirrored runtime files.

React component matrix:

| Component | Engine lifecycle | Declarative grid | Overlay layer | Best use case |
|---|---|---|---|---|
| `PixelCanvas` | yes | no | no | low-level custom engine wiring |
| `PixelGridCanvas` | yes | yes | no | fastest PixelGrid integration |
| `PixelSurface` | yes | via `onReady` | yes | canvas + content composition |
| `PixelCard` | yes | yes (`preset`/`gridConfig`) | yes | reusable UI cards with pixel effects |

## More docs

- API details: `API.md`
- Migration notes: `MIGRATION.md`
- Release workflow: `RELEASE.md`
- Changelog: `CHANGELOG.md`
