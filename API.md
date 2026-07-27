# Pixel Engine API

This document focuses on the stable public API and React integration patterns for the current v1 baseline plus v1.1 runtime hardening.

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

## React Public API

### Hooks

- `usePixelEngine(options)`
- `usePixelGridEffect(options)`
- `useScrollReactiveGrid(params)`
- `useSectionTransitionPreset(params)`
- `useDebugHudOverlay(params)`

### Components

- `PixelCanvas`
- `PixelGridCanvas`
- `PixelSurface`
- `PixelCard`

### Helper functions

- `createPixelPreset(name, overrides?)`
- `mergePixelOptions(base, override)`
- `createMaskConfig(mask)`
- `listPixelPresets()`
- `getPixelPresetDefinition(name)`
- `validatePixelConfigDocument(input)`
- `loadPixelConfigFromJson(json, fallback?)`

## React Quick Start

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function App() {
  return <PixelGridCanvas width={900} height={520} preset="minimal" />;
}
```

## React Options Reference

### `usePixelEngine` / `PixelCanvas` options

| Option | Type | Description |
|---|---|---|
| `width` | `number` | Canvas width. |
| `height` | `number` | Canvas height. |
| `autoStart` | `boolean` | Start engine automatically on mount. |
| `quality` | `"low" \| "medium" \| "high"` | Runtime quality profile. |
| `loop` | `{ fixedTimeStep?, maxDelta?, maxUpdatesPerFrame? }` | Explicit fixed-step tuning. |
| `clearColor` | `string \| null` | Canvas clear color (`null` = transparent). |
| `devicePixelRatio` | `number` | DPR override. |
| `resizeMode` | `"observer" \| "window" \| "none"` | Resize strategy (for `fitMode="client"`). |
| `fitMode` | `"none" \| "client"` | Fixed dimensions vs client-resized canvas. |
| `onReady` | `(engine) => void` | Engine initialized callback. |
| `onDestroy` | `(engine) => void` | Engine cleanup callback. |
| `onHoverStart` | `(payload) => void` | Pointer enter callback. |
| `onHoverEnd` | `(payload) => void` | Pointer leave callback. |
| `createEngine` | `(options) => PixelEngine` | Custom engine factory (tests/custom runtime). |
| `className` (`PixelCanvas`) | `string` | Canvas class name. |
| `style` (`PixelCanvas`) | `CSSProperties` | Canvas style override. |

### `usePixelGridEffect` / `PixelGridCanvas` core options

| Option | Type | Description |
|---|---|---|
| `preset` | `"minimal" \| "card-soft" \| "card-ripple" \| "hero-image"` | Declarative base config. |
| `gridConfig` | `Partial<PixelGridConfig>` | Manual config overrides. |
| `mask` | `PixelGridMaskInput` | Declarative text/image/hybrid mask input. |
| `influenceOptions` | `PixelGridInfluenceOptions` | Enable/disable influence groups. |
| `effectKey` | `string \| number` | Additional explicit remount key. |
| `gridWidth` | `number` | Effect width override. |
| `gridHeight` | `number` | Effect height override. |
| `autoAttach` | `boolean` | Auto add/remove effect in scene lifecycle. |
| `rippleTrigger` | `"click" \| "pointerdown" \| "none"` | Built-in ripple trigger source. |
| `onGridReady` | `(effect, engine) => void` | Effect ready callback. |
| `onRipple` | `(payload) => void` | Ripple callback. |
| `createGridEffect` | `(engine, w, h, config, influenceOptions?) => PixelGridEffect` | Custom effect factory. |
| `className` (`PixelGridCanvas`) | `string` | Canvas class name. |
| `style` (`PixelGridCanvas`) | `CSSProperties` | Canvas style override (composed with transition/placeholder styles). |

### `PixelGridCanvas` web utility options

| Option | Type | Fields |
|---|---|---|
| `scrollReactive` | object | `enabled`, `intensity`, `direction`, `edge`, `source`, `cooldownMs`, `maxBurstRipples`, `respectReducedMotion` |
| `sectionTransition` | object | `enabled`, `preset`, `amount`, `threshold`, `once`, `rippleOnEnter`, `playTimelineOnEnter`, `pauseTimelineOnExit`, `respectReducedMotion` |
| `themeSync` | object | `enabled`, `mode`, `followSystem`, `brandColors`, `brandCanvasBackground`, `brandHoverTintPalette`, `brandRippleTintPalette` |
| `statePreset` | string or object | `"idle" \| "hover" \| "active" \| "success" \| "error" \| "loading"` or `{ enabled, value }` |
| `debugHud` | object | `enabled`, `position`, `updateIntervalMs`, `offsetX`, `offsetY`, `showFps`, `showQuality`, `showLoop`, `showCells`, `showRipples`, `showTimeline` |
| `ssrPlaceholder` | preset or object | `"minimal" \| "card-soft" \| "hero-image"` or `{ enabled, preset, hideOnReady, style }` |

### `PixelSurface` / `PixelCard` overlay options

| Option | Type | Description |
|---|---|---|
| `overlayPointerEvents` | `"none" \| "auto" \| "hybrid"` | Overlay/canvas interaction mode. |
| `containerClassName` | `string` | Root wrapper class. |
| `containerStyle` | `CSSProperties` | Root wrapper style. |
| `overlayClassName` | `string` | Overlay wrapper class. |
| `overlayStyle` | `CSSProperties` | Overlay wrapper style. |
| `radius` (`PixelCard`) | `number` | Card border radius. |
| `padding` (`PixelCard`) | `number` | Overlay content padding. |

Notes:
- `gridConfig` is optional when `preset` is provided.
- The React grid effect is recreated automatically when resolved `gridConfig` or `influenceOptions` changes.
- Use `effectKey` when you need an additional explicit full remount/reset boundary.
- With `fitMode="client"`, wrappers keep engine canvas size and grid effect size synchronized.
- For `mask.type="hybrid"`, you can provide:
  - `autoMorph`
  - `texts[]` / `images[]`
  - `items[]` + `steps[]` (`assetId` mapping)
  - `maskTimeline` controls (`enabled`, `autoplay`, `loop`, `initialStep`, `defaultTransition`)

## `PixelGridConfig` essentials

Required:
- `colors: string[]`
- `gap: number`
- `expandEase: number`
- `breathSpeed: number`

Optional groups:
- `hoverEffects`
- `rippleEffects`
- `breathing`
- `effects` (`paletteCycle`, `dissolve`, `shockwaveBurst`)
- `performance` (`detail`, `viewportCulling`, `cullingPadding`, `minRenderableSize`)
- `imageMask`, `textMask`, `autoMorph`, `initialMask`
- `canvasBackground`

Hover model notes:
- `hoverEffects.radius`: single circular radius (no `radiusY`).
- `hoverEffects.magnetic`:
  - `enabled`
  - `mode: "attract" | "repel"`
  - `strength`
  - `radius`

Example runtime tuning:

```ts
gridConfig: {
  performance: {
    detail: "low",
    viewportCulling: true,
    cullingPadding: 16,
    minRenderableSize: 1
  },
  effects: {
    paletteCycle: {
      enabled: true,
      speed: 0.45,
      scope: "activeOnly",
      palette: ["#334155", "#38bdf8", "#f59e0b"]
    },
    dissolve: {
      enabled: true,
      speed: 0.9,
      amount: 0.3,
      scope: "activeOnly"
    },
    shockwaveBurst: {
      enabled: true,
      speed: 0.85,
      strength: 0.45,
      thickness: 28,
      maxBursts: 16,
      triggerMode: "pointerDown"
    }
  }
}
```

## React examples by scenario

### 1) Simple usage

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function Simple() {
  return <PixelGridCanvas width={900} height={520} preset="minimal" />;
}
```

### 2) Simple config

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function SimpleConfig() {
  return (
    <PixelGridCanvas
      width={900}
      height={520}
      preset="card-soft"
      gridConfig={{ gap: 6, hoverEffects: { radius: 120 } }}
    />
  );
}
```

### 3) Advanced config (timeline items + assetId)

```tsx
import catPngUrl from "./assets/cat.png";
import { PixelGridCanvas } from "@pixel-engine/react";

export function Advanced() {
  return (
    <PixelGridCanvas
      width={900}
      height={520}
      preset="hero-image"
      onRipple={(e) => console.log(e.x, e.y)}
      mask={{
        type: "hybrid",
        initialMask: "image",
        items: [
          { type: "text", id: "headline", text: "PIXEL", centerX: 450, centerY: 275, fontSize: 132, fontFamily: "Arial", fontWeight: 700 },
          { type: "image", id: "catA", src: catPngUrl, centerX: 450, centerY: 250, scale: 2.05, sampleMode: "threshold" },
          { type: "text", id: "subline", text: "ENGINE", centerX: 450, centerY: 275, fontSize: 112, fontFamily: "Arial", fontWeight: 700 },
          { type: "image", id: "catB", src: catPngUrl, centerX: 450, centerY: 250, scale: 1.65, sampleMode: "luminance" }
        ],
        steps: [
          { mask: "text", assetId: "headline", holdMs: 1100, mode: "morph", durationMs: 700 },
          { mask: "image", assetId: "catA", holdMs: 1000, mode: "fade", durationMs: 450 },
          { mask: "text", assetId: "subline", holdMs: 1100, mode: "dissolve", durationMs: 620 },
          { mask: "image", assetId: "catB", holdMs: 1000, mode: "fade", durationMs: 450 }
        ],
        maskTimeline: {
          enabled: true,
          autoplay: true,
          loop: true,
          initialStep: 0,
          defaultTransition: { mode: "morph", durationMs: 700, seed: 1337 }
        }
      }}
      effectKey="advanced-v2"
    />
  );
}
```

Timeline authoring rules:
- `items[]`: declare named assets (`id`) of type `text` or `image`.
- `steps[].assetId`: choose which asset is active in each step.
- `steps[].mode` and `steps[].durationMs`: aliases for transition setup.
- `steps[].transition`: optional explicit override (includes `seed`).
- If `steps[]` is omitted and `items[]` exists, steps are generated in item order.

### 4) Custom config with helpers

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
  rippleEffects: { maxRipples: 40 }
});
const mask = createMaskConfig({
  type: "image",
  src: catPngUrl,
  centerX: 450,
  centerY: 260,
  scale: 2
});

export function Custom() {
  return <PixelGridCanvas width={900} height={520} gridConfig={{ ...tuned, ...mask }} />;
}
```

### 5) Overlay usage

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

- `overlayPointerEvents="none"` by default (canvas interactions pass through)
- set `overlayPointerEvents="auto"` for clickable overlay UI
- set `overlayPointerEvents="hybrid"` for clickable overlay UI while preserving canvas hover/ripple behavior

### 6) Scroll reactive + section transition presets

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function ScrollSectionDemo() {
  return (
    <PixelGridCanvas
      width={900}
      height={520}
      preset="card-ripple"
      scrollReactive={{
        enabled: true,
        intensity: 1.2,
        direction: "both",
        edge: "leading",
        cooldownMs: 80,
        maxBurstRipples: 3
      }}
      sectionTransition={{
        enabled: true,
        preset: "lift",
        amount: 28,
        rippleOnEnter: true,
        playTimelineOnEnter: true
      }}
    />
  );
}
```

### 7) Theme sync + state presets

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function ThemeStateDemo() {
  return (
    <PixelGridCanvas
      width={900}
      height={520}
      preset="minimal"
      themeSync={{
        enabled: true,
        mode: "brand",
        brandColors: ["#0f766e", "#14b8a6", "#2dd4bf"],
        brandCanvasBackground: "#071414"
      }}
      statePreset="active"
    />
  );
}
```

### 8) Debug HUD + SSR-safe placeholder presets

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function DebugSsrDemo() {
  return (
    <PixelGridCanvas
      width={900}
      height={520}
      preset="hero-image"
      debugHud={{
        enabled: true,
        position: "top-right",
        updateIntervalMs: 180,
        showLoop: true
      }}
      ssrPlaceholder={{
        enabled: true,
        preset: "hero-image",
        hideOnReady: true
      }}
    />
  );
}
```

### 9) CMS JSON loader/validator

```tsx
import { PixelGridCanvas, loadPixelConfigFromJson } from "@pixel-engine/react";

const parsed = loadPixelConfigFromJson(cmsJson, {
  schemaVersion: "1.0",
  preset: "minimal"
});

if (!parsed.ok || !parsed.value) {
  throw new Error(parsed.errors.join("; "));
}

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
/>;
```

Validation behavior:
- rejects unsupported schema versions
- validates known top-level keys and warns for unknown keys
- validates preset, mask shape, and state preset values
- supports fallback merge for resilient CMS defaults

## Choosing `preset` vs `gridConfig`

- `preset` only: fastest path
- `gridConfig` only: full manual control
- `preset + gridConfig`: baseline + targeted overrides
- helper functions: reusable design system configs

## Preset Catalog (summary)

- `minimal`: neutral baseline, low visual noise
- `card-soft`: softer hover + breathing for UI cards
- `card-ripple`: stronger click/ripple feedback surfaces
- `hero-image`: mask-oriented hero visual treatment (image mask recommended)

Preset matrix:

| Preset | Best for | Mask support | Notes |
|---|---|---|---|
| `minimal` | low-noise backgrounds | optional | simplest baseline |
| `card-soft` | cards/panels | optional | softer reactive hover |
| `card-ripple` | clickable surfaces | optional | stronger ripple feedback |
| `hero-image` | hero/showcase sections | recommended | designed for image/text mask flows |

## React Component Capability Matrix

| Component | Owns engine lifecycle | Supports preset/mask | Overlay content | Typical role |
|---|---|---|---|---|
| `PixelCanvas` | yes | no | no | low-level engine control |
| `PixelGridCanvas` | yes | yes | no | declarative effect canvas |
| `PixelSurface` | yes | via `onReady` flow | yes | canvas + layered content |
| `PixelCard` | yes | yes | yes | reusable interactive card primitive |

## Compatibility Notes

- SSR: safe by default (engine initializes after mount).
- Assets: always pass bundler URLs (`import imageUrl from "./asset.png"`).
- Overlay events:
  - default pass-through on `PixelSurface`/`PixelCard` (`overlayPointerEvents="none"`)
  - set `overlayPointerEvents="auto"` for clickable overlay controls
  - set `overlayPointerEvents="hybrid"` for simultaneous overlay interaction + canvas effect interaction
- Effect remount behavior:
  - resolved `gridConfig`/`influenceOptions` changes recreate the effect instance
  - changing `effectKey` forces an additional intentional recreation boundary
  - size changes do not require remount; active effect uses `resize(width, height)`
- Timeline compatibility:
  - `assetId` is the preferred field in `steps[]`
  - `maskId` remains accepted as legacy alias
  - React layer emits dev warnings for invalid timeline refs:
    - unknown `assetId`/`maskId`
    - empty ids
    - conflicting `assetId` vs `maskId`
    - duplicate ids within same declaration group
- Mask id resolution order: both the singular (`imageMask`/`textMask`) and plural
  (`imageMasks`/`textMasks`) props are supported at the same time — plural array entries are
  registered first, in array order, then the singular prop (if present) is appended last.
  Ids are generated (`image-1`, `text-1`, ...) for any mask that doesn't provide its own `id`.
  This resolution happens once, in `@pixel-engine/effects`; it's the same regardless of
  whether masks arrive via the `mask` prop or directly via `gridConfig`.

## Asset path note

In app projects (React/Vite/Next), use bundler URLs:

```ts
import imageUrl from "./assets/cat.png";
```

Avoid `"/src/..."` runtime paths.
