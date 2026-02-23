# Pixel Engine API

This document focuses on the stable public API and React integration patterns (including Phase E PR-E2 preset tuning updates).

## Packages

- `@pixel-engine/core`: engine lifecycle, scene, renderer, input
- `@pixel-engine/effects`: `PixelGridEffect` + influences/masks
- `@pixel-engine/react`: React hooks/components + presets/declarative helpers

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

## React Public API

### Hooks

- `usePixelEngine(options)`
- `usePixelGridEffect(options)`

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

## React Quick Start

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function App() {
  return <PixelGridCanvas width={900} height={520} preset="minimal" />;
}
```

## `usePixelGridEffect` options (React)

Key fields:
- `preset?: "minimal" | "card-soft" | "card-ripple" | "hero-image"`
- `gridConfig?: Partial<PixelGridConfig>`
- `mask?: { type: "text" | "image" | "hybrid", ... }`
- `effectKey?: string | number`
- `onRipple?`, `onHoverStart?`, `onHoverEnd?`, `onGridReady?`

Notes:
- `gridConfig` is optional when `preset` is provided.
- `effectKey` controls explicit effect recreation (prevents accidental remounts from inline objects).
- for `mask.type="hybrid"`, you can provide:
  - `autoMorph`
  - `maskTimeline` (full timeline schema: `enabled`, `autoplay`, `loop`, `initialStep`, `steps[]`)

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
- `performance` (`quality`, `viewportCulling`, `cullingPadding`, `minRenderableSize`)
- `imageMask`, `textMask`, `autoMorph`, `initialMask`
- `canvasBackground`

Example runtime tuning:

```ts
gridConfig: {
  performance: {
    quality: "low",
    viewportCulling: true,
    cullingPadding: 16,
    minRenderableSize: 1
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

### 3) Advanced config

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
        image: { src: catPngUrl, centerX: 450, centerY: 240, scale: 2 },
        text: { text: "PIXEL", centerX: 450, centerY: 280 },
        maskTimeline: {
          enabled: true,
          autoplay: true,
          loop: true,
          initialStep: 0,
          steps: [
            {
              mask: "image",
              holdMs: 1200,
              transition: { mode: "fade", durationMs: 400, seed: 11 }
            },
            {
              mask: "text",
              holdMs: 1400,
              transition: { mode: "dissolve", durationMs: 550, seed: 22 }
            }
          ]
        }
      }}
      effectKey="advanced-v1"
    />
  );
}
```

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
  - stable `effectKey` keeps the same effect instance
  - changing `effectKey` forces intentional recreation

## Asset path note

In app projects (React/Vite/Next), use bundler URLs:

```ts
import imageUrl from "./assets/cat.png";
```

Avoid `"/src/..."` runtime paths.
