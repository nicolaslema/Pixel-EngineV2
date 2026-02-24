<p align="center">
  <img src="./PixelEngine-Thumbnail2.png" alt="Pixel Engine Thumbnail" width="980" />
</p>

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
- v1.1 Phase 4 completed (PR-M1 + PR-M2 + PR-M3)
- v1.1 Phase 5 completed (PR-5A + PR-5B + PR-5C)
- v1.1 Phase 6 completed (PR-6A + PR-6B + PR-6C)
- v1.1 Phase 7 completed (PR-7A + PR-7B + PR-7C)
- v1.1 Phase 8 completed (PR-8A + PR-8B + PR-8C)
- v1.1 Phase 9 completed (PR-9A + PR-9B + PR-9C, PR-9D deferred)
- v1.1 Phase 10 completed (web product utilities)

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

### Easy

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function EasyExample() {
  return <PixelGridCanvas width={900} height={520} preset="card-soft" />;
}
```

### Medium

```tsx
import { useState } from "react";
import { PixelGridCanvas } from "@pixel-engine/react";

type UiState = "idle" | "active" | "success" | "error" | "loading";

export function MediumExample() {
  const [uiState, setUiState] = useState<UiState>("idle");

  return (
    <>
      <button onClick={() => setUiState("active")}>active</button>
      <PixelGridCanvas
        width={900}
        height={520}
        preset="card-ripple"
        gridConfig={{ gap: 6, hoverEffects: { radius: 120 } }}
        statePreset={{ enabled: true, value: uiState }}
        scrollReactive={{ enabled: true, intensity: 1.1, direction: "both" }}
        sectionTransition={{ enabled: true, preset: "lift", amount: 28 }}
      />
    </>
  );
}
```

### Advanced

```tsx
import catPngUrl from "./assets/cat.png";
import { PixelGridCanvas } from "@pixel-engine/react";

export function AdvancedExample() {
  return (
    <PixelGridCanvas
      width={960}
      height={540}
      preset="hero-image"
      onHoverStart={(e) => console.log("hover start", e.x, e.y)}
      onHoverEnd={(e) => console.log("hover end", e.x, e.y)}
      onRipple={(e) => console.log("ripple", e.x, e.y)}
      mask={{
        type: "hybrid",
        initialMask: "image",
        items: [
          { type: "text", id: "title", text: "PIXEL", centerX: 480, centerY: 280, fontSize: 132, fontFamily: "Arial", fontWeight: 700 },
          { type: "image", id: "imgA", src: catPngUrl, centerX: 480, centerY: 260, scale: 2.05, sampleMode: "threshold" },
          { type: "text", id: "subtitle", text: "ENGINE", centerX: 480, centerY: 280, fontSize: 112, fontFamily: "Arial", fontWeight: 700 },
          { type: "image", id: "imgB", src: catPngUrl, centerX: 480, centerY: 260, scale: 1.65, sampleMode: "luminance" }
        ],
        steps: [
          { mask: "text", assetId: "title", holdMs: 1100, mode: "morph", durationMs: 700 },
          { mask: "image", assetId: "imgA", holdMs: 1000, mode: "fade", durationMs: 450 },
          { mask: "text", assetId: "subtitle", holdMs: 1100, mode: "dissolve", durationMs: 620 },
          { mask: "image", assetId: "imgB", holdMs: 1000, mode: "fade", durationMs: 450 }
        ],
        maskTimeline: { enabled: true, autoplay: true, loop: true, initialStep: 0 }
      }}
      themeSync={{
        enabled: true,
        mode: "brand",
        brandColors: ["#0f766e", "#14b8a6", "#2dd4bf"],
        brandCanvasBackground: "#071414"
      }}
      debugHud={{ enabled: true, position: "top-right", updateIntervalMs: 180, showLoop: true }}
      ssrPlaceholder={{ enabled: true, preset: "hero-image", hideOnReady: true }}
    />
  );
}
```

## React Options Reference

### `usePixelEngine` and `PixelCanvas` options

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | required | Backing canvas width. |
| `height` | `number` | required | Backing canvas height. |
| `autoStart` | `boolean` | `true` | Start engine automatically on mount. |
| `quality` | `"low" \| "medium" \| "high"` | engine default | Runtime quality profile. |
| `loop` | `{ fixedTimeStep?, maxDelta?, maxUpdatesPerFrame? }` | engine default | Fixed-step runtime tuning. |
| `clearColor` | `string \| null` | engine default | Canvas clear color (`null` for transparent). |
| `devicePixelRatio` | `number` | runtime default | Override DPR. |
| `fitMode` | `"none" \| "client"` | `"none"` | Bind engine size to explicit width/height or canvas client size. |
| `resizeMode` | `"observer" \| "window" \| "none"` | `"observer"` | Resize strategy when `fitMode="client"`. |
| `onReady` | `(engine) => void` | none | Engine ready callback. |
| `onDestroy` | `(engine) => void` | none | Engine cleanup callback. |
| `onHoverStart` | `(payload) => void` | none | Pointer enters canvas. |
| `onHoverEnd` | `(payload) => void` | none | Pointer leaves canvas. |
| `createEngine` | `(options) => PixelEngine` | none | Dependency injection for tests/custom engines. |
| `className` (`PixelCanvas`) | `string` | none | Canvas class name. |
| `style` (`PixelCanvas`) | `CSSProperties` | none | Canvas inline style. |

### `usePixelGridEffect` and `PixelGridCanvas` core options

| Option | Type | Default | Description |
|---|---|---|---|
| `preset` | `"minimal" \| "card-soft" \| "card-ripple" \| "hero-image"` | none | Declarative baseline config. |
| `gridConfig` | `Partial<PixelGridConfig>` | none | Low-level effect overrides. |
| `mask` | `text \| image \| hybrid` | none | Declarative mask + timeline mapping. |
| `influenceOptions` | `PixelGridInfluenceOptions` | effect default | Enable/disable influence groups. |
| `effectKey` | `string \| number` | `"default"` | Extra remount key for intentional full reset. |
| `gridWidth` | `number` | none | Explicit effect width override. |
| `gridHeight` | `number` | none | Explicit effect height override. |
| `autoAttach` | `boolean` | `true` | Auto add/remove effect in scene. |
| `rippleTrigger` | `"click" \| "pointerdown" \| "none"` | `"click"` | Built-in ripple trigger event. |
| `onGridReady` | `(effect, engine) => void` | none | Effect ready callback. |
| `onRipple` | `(payload) => void` | none | Ripple trigger callback. |
| `createGridEffect` | `(engine, w, h, config, influenceOptions?) => PixelGridEffect` | none | Dependency injection for tests/custom effects. |
| `className` (`PixelGridCanvas`) | `string` | none | Canvas class name. |
| `style` (`PixelGridCanvas`) | `CSSProperties` | none | Canvas inline style (composed with transition/placeholder styles). |

### `PixelGridCanvas` web utility options

| Option | Type | Default | Description |
|---|---|---|---|
| `scrollReactive` | object | disabled | Converts scroll motion into ripple bursts. |
| `sectionTransition` | object | disabled | Viewport enter/exit visual preset (`fade`, `lift`, `zoom`). |
| `themeSync` | object | disabled | Light/dark/brand palette sync. |
| `statePreset` | string or object | disabled | Declarative visual states (`idle`, `hover`, `active`, `success`, `error`, `loading`). |
| `debugHud` | object | disabled | Live runtime overlay diagnostics. |
| `ssrPlaceholder` | preset or object | disabled | SSR-safe static placeholder style. |

### `PixelSurface` and `PixelCard` overlay options

| Option | Type | Default | Description |
|---|---|---|---|
| `overlayPointerEvents` | `"none" \| "auto" \| "hybrid"` | `"none"` | Overlay/canvas event routing mode. |
| `containerClassName` | `string` | none | Wrapper class. |
| `containerStyle` | `CSSProperties` | none | Wrapper style. |
| `overlayClassName` | `string` | none | Overlay class. |
| `overlayStyle` | `CSSProperties` | none | Overlay style. |
| `radius` (`PixelCard`) | `number` | `16` | Card corner radius. |
| `padding` (`PixelCard`) | `number` | `16` | Overlay content padding. |

Notes:
- `overlayPointerEvents="none"`: overlay does not block hover/ripple.
- `overlayPointerEvents="auto"`: overlay handles pointer events; canvas does not receive them through overlay.
- `overlayPointerEvents="hybrid"`: overlay remains interactive and pointer bridge forwards interactions to canvas effects.

### CMS-driven config example

```tsx
import { useMemo } from "react";
import { PixelGridCanvas, loadPixelConfigFromJson } from "@pixel-engine/react";

type Props = { cmsJson: string };

export function CmsDrivenSection({ cmsJson }: Props) {
  const parsed = useMemo(
    () => loadPixelConfigFromJson(cmsJson, { schemaVersion: "1.0", preset: "minimal" }),
    [cmsJson]
  );

  if (!parsed.ok || !parsed.value) return <div>Invalid CMS config</div>;

  return (
    <PixelGridCanvas
      width={960}
      height={520}
      preset={parsed.value.preset}
      gridConfig={parsed.value.gridConfig}
      mask={parsed.value.mask}
      scrollReactive={parsed.value.scrollReactive}
      sectionTransition={parsed.value.sectionTransition}
      themeSync={parsed.value.themeSync}
      statePreset={parsed.value.statePreset}
      debugHud={parsed.value.debugHud}
      ssrPlaceholder={parsed.value.ssrPlaceholder}
    />
  );
}
```

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
- Web utilities:
  - `scrollReactive` on `PixelGridCanvas` enables direction/intensity-based ripple response from page scroll.
  - `sectionTransition` on `PixelGridCanvas` enables declarative section entrance presets (`fade`, `lift`, `zoom`).
  - `themeSync` on `PixelGridCanvas`/`PixelCard` enables light/dark/brand visual synchronization.
  - `statePreset` enables declarative state styling (`idle`, `hover`, `active`, `success`, `error`, `loading`).
  - `debugHud` enables runtime diagnostics overlay for development/debug sessions.
  - `ssrPlaceholder` enables preset static fallback visuals before full client runtime is ready.
  - `loadPixelConfigFromJson` / `validatePixelConfigDocument` enable CMS-safe config ingestion.
- Effect lifecycle:
  - `usePixelGridEffect` / `PixelGridCanvas` recreates the effect when resolved `gridConfig` or `influenceOptions` changes.
  - Use `effectKey` when you want an additional intentional full remount/reset boundary.
  - `PixelGridEffect` supports `resize(width, height)` and React wrappers keep it synced during `fitMode="client"` resize flows.
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
- Phase 10 utilities validated in practice:
  - `scrollReactive`
  - `sectionTransition`
  - `themeSync`
  - `statePreset`
  - `debugHud`
  - `ssrPlaceholder`

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

Loop tuning controls:
- `fixedTimeStep`: simulation step size (ms) per fixed update.
- `maxDelta`: clamp for large frame gaps.
- `maxUpdatesPerFrame`: safety cap for catch-up updates.

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
