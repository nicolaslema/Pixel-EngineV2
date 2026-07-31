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

## React Public API

### Hooks

- `usePixelEngine(options)`
- `usePixelGridEffect(options)`
- `useScrollReactiveGrid(params)`
- `useSectionTransitionPreset(params)`
- `useDebugHudOverlay(params)` — returns `ReactNode | null`: a `createPortal`-based debug HUD (fps/quality/cells/ripples/timeline, `role="status" aria-live="polite"`) mounted to `document.body` when `debugHud.enabled`, or `null` otherwise. Render the returned value in your tree (`PixelGridCanvas` already does this for you). Returning `void` here was breaking; see `MIGRATION.md`.
- `usePrefersReducedMotion()` — reactively tracks `prefers-reduced-motion: reduce`, updating live if the OS/browser preference changes (no reload needed). Used internally by `useScrollReactiveGrid`/`useSectionTransitionPreset`; exported for consumers building their own reduced-motion-aware UI.

### Components

- `PixelCanvas`
- `PixelGridCanvas`
- `PixelSurface`
- `PixelCard`

### Imperative handles (`ref`)

All 4 components are `forwardRef`-wrapped and expose an imperative handle via `ref`:

| Component | Handle type | Methods |
|---|---|---|
| `PixelCanvas` | `PixelCanvasHandle` | `getEngine()` |
| `PixelGridCanvas` | `PixelGridCanvasHandle` | `getEngine()`, `getGrid()`, `triggerRipple(x, y)`, `playMaskTimeline()`, `pauseMaskTimeline()`, `resetMaskTimeline()` |
| `PixelSurface` | `PixelCanvasHandle` (aliased `PixelSurfaceHandle`) | Same as `PixelCanvas` — forwarded straight to the inner canvas. |
| `PixelCard` | `PixelGridCanvasHandle` (aliased `PixelCardHandle`) | Same shape regardless of `mode` — in `mode="plain"`, `getGrid()` returns `null` and the other grid-specific methods are no-ops. |

```tsx
const cardRef = useRef<PixelCardHandle>(null);
// ...
cardRef.current?.triggerRipple(100, 60);
```

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

**Next.js App Router**: `@pixel-engine/react`'s published bundle carries a `"use client"` directive (every export uses hooks/refs/canvas, so it's inherently client-only). Import it directly into a Server Component tree — no manual `"use client"` wrapper file needed on your end.

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
| `fitMode` | `"none" \| "client"` | Default `"none"` — fixed pixel size from `width`/`height`, applied once at mount. `"client"` measures the canvas's own `clientWidth`/`clientHeight` instead, kept in sync via `resizeMode`. **Required for a responsive canvas**: with `"none"` (the default), `Canvas2DRenderer` sets `canvas.style.width`/`height` to a fixed `px` value imperatively on every resize (including at mount) — a `style` with a `%`/`vw`/`vh`/etc. width or height gets silently overwritten and never takes effect. A dev-only `console.warn` fires if it detects this mismatch (`style` looks responsive but `fitMode` isn't `"client"`). |
| `onReady` | `(engine) => void` | Engine initialized callback. |
| `onDestroy` | `(engine) => void` | Engine cleanup callback. |
| `onHoverStart` | `(payload) => void` | Pointer enter callback. |
| `onHoverEnd` | `(payload) => void` | Pointer leave callback. |
| `onEngineError` | `(error: unknown) => void` | Called if `PixelEngine` construction throws (e.g. `canvas.getContext("2d")` returns `null` — old browser, privacy extension blocking canvas). The error is caught internally so it never crashes past the component (`isReady` stays `false`, `onReady`/`autoStart` are skipped); this callback is your only signal that construction failed. It does **not** cover errors thrown from your own `onReady`/`onDestroy`/render code — wrap the component tree in a React error boundary for those. |
| `createEngine` | `(options) => PixelEngine` | Custom engine factory (tests/custom runtime). |
| `className` (`PixelCanvas`) | `string` | Canvas class name. |
| `style` (`PixelCanvas`) | `CSSProperties` | Canvas style override. |
| `decorative` | `boolean` | Default `true` — renders `aria-hidden="true"` on the canvas (correct for the common case: a purely visual background/effect). Set `false` when the canvas itself is meaningful content, and pair it with `aria-label`/`aria-labelledby`. |
| `role` | `React.AriaRole` | Forwarded to the canvas element. |
| `aria-label` / `aria-labelledby` / `aria-describedby` | `string` | Forwarded to the canvas element — required for a real accessible name/description when `decorative={false}`. |

### `usePixelGridEffect` / `PixelGridCanvas` core options

| Option | Type | Description |
|---|---|---|
| `preset` | `"minimal" \| "card-soft" \| "card-ripple" \| "hero-image"` | Declarative base config. |
| `gridConfig` | `Partial<PixelGridConfig>` | Manual config overrides. |
| `mask` | `PixelGridMaskInput` | Declarative text/image/hybrid mask input. |
| `influenceOptions` | `PixelGridInfluenceOptions` | Enable/disable influence groups (`ripple`/`hover`/`organic`) — see "`influenceOptions` reference" below for exactly what each one controls and how it relates to the per-effect `enabled` fields in `gridConfig`. |
| `effectKey` | `string \| number` | Additional explicit remount key. |
| `gridWidth` | `number` | Effect width override. |
| `gridHeight` | `number` | Effect height override. |
| `autoAttach` | `boolean` | Auto add/remove effect in scene lifecycle. |
| `rippleTrigger` | `"click" \| "pointerdown" \| "none"` | Built-in ripple trigger source. |
| `onGridReady` | `(effect, engine) => void` | Effect ready callback. |
| `onRipple` | `(payload) => void` | Ripple callback. |
| `onMaskError` | `(event) => void` | Mask load/render error callback. |
| `onConfigWarning` | `(warnings: string[]) => void` | Fired once per resolved-config recomputation that produced one or more dev warnings (the same messages `console.warn` would print) — e.g. an invalid `gridConfig.gap` falling back to the preset's value. Not called when the resolved config is warning-free. |
| `createGridEffect` | `(engine, w, h, config, influenceOptions?) => PixelGridEffect` | Custom effect factory. |
| `className` (`PixelGridCanvas`) | `string` | Canvas class name. |
| `style` (`PixelGridCanvas`) | `CSSProperties` | Canvas style override (composed with transition/placeholder styles). |
| `decorative` | `boolean` | Same as `PixelCanvas` — default `true` (`aria-hidden="true"`), set `false` + `aria-label`/`aria-labelledby` for meaningful canvas content. |
| `role` / `aria-label` / `aria-labelledby` / `aria-describedby` | — | Same as `PixelCanvas`, forwarded to the canvas element. |

### `influenceOptions` reference

`PixelGridInfluenceOptions` (`{ ripple?, hover?, organic? }`, default `{ ripple: true, hover: true, organic: false }`) is a flat set of top-level master switches, deliberately separate from `gridConfig`'s own per-effect config blocks — it's not just an alternate spelling of an `enabled` field that already exists elsewhere:

- **`hover`**: the *only* switch for hover interaction — `hoverEffects` has no `enabled` field of its own. Gates both the classic-mode hover `Influence` and the reactive-mode hover pass.
- **`ripple`**: the master switch for the entire ripple system — when `false`, it blocks the reactive-ripple-on-interaction pass *and* makes manual `triggerRipple()` calls a no-op. This is a different, broader scope than `gridConfig.rippleEffects.enabled`, which only gates the automatic reactive-ripple-on-interaction pass — `rippleEffects.enabled: false` with `influenceOptions.ripple: true` (the default combination) still lets `triggerRipple()` work, it just won't auto-trigger from hover/click.
- **`organic`**: OR'd together with `gridConfig.organicNoise.enabled` — either one being `true` enables organic noise (see the `organicNoise.enabled` note further down); this is intentional, not a duplicate to clean up — it lets `organicNoise.enabled` be set purely from `gridConfig` without also touching `influenceOptions`.

### `PixelGridCanvas` web utility options

| Option | Type | Fields |
|---|---|---|
| `respectReducedMotion` | `boolean` | Convenience default (item 5.14) applied to the 3 independent `respectReducedMotion` switches below — `gridConfig.respectReducedMotion` (breathing/ripple/magnetic/jitter), `scrollReactive.respectReducedMotion`, and `sectionTransition.respectReducedMotion` — each of which already defaults to `true` on its own. Set this once instead of all 3, e.g. `respectReducedMotion={false}` to ignore the OS preference across the whole component for a controlled demo. Any of the 3 nested options can still set its own `respectReducedMotion` explicitly to override this fallback on just that surface. |
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
| `mode` (`PixelCard`) | `"grid" \| "plain"` | Which inner canvas to render. Default **`"grid"`** (renders `PixelGridCanvas`, even with zero grid-specific props). Pass `mode="plain"` for a bare `PixelCanvas`. |

Notes:
- `PixelCard`'s `mode` default is `"grid"` and **replaces** the previous prop-shape inference (which rendered a `PixelGridCanvas` only if a grid-specific prop like `gridConfig`/`preset`/`mask` was present, otherwise falling back to a plain, non-interactive `PixelCanvas`). If you were relying on that implicit "no grid props → plain canvas" fallback, pass `mode="plain"` explicitly.
- Accessibility: all 4 canvas components render `aria-hidden="true"` by default (`decorative`, default `true`) since the canvas is almost always a purely visual effect. If you set `decorative={false}` because the canvas itself is meaningful content (not just a decorative background behind real `children`), you are responsible for providing an accessible name (`aria-label`/`aria-labelledby`) **and** a keyboard-accessible equivalent for any interaction you rely on — hover/ripple are pointer-only with no built-in keyboard fallback. For the common case (`PixelCard`/`PixelSurface` with real interactive `children` in the overlay), the default `decorative={true}` is correct and no further action is needed.
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
- `organicNoise` (`enabled`, `pattern`, `radius`, `strength`, `speed`, `scale`, `position`, `falloff`, `seed`), `organicNoises` (array of additional layers)
- `effects` (`paletteCycle`, `dissolve`, `shockwaveBurst`, `waveWobble`, `cursorSpotlight`, `chromaticBreathing`, `scanLineReveal`, `magneticTrail`, `glitchRgbSplit`, `gravityFallApart`, `constellationConnect`)
- `performance` (`detail`, `viewportCulling`, `cullingPadding`, `minRenderableSize`)
- `imageMask`, `textMask`, `autoMorph`, `initialMask`
- `canvasBackground`

Ripple model notes:
- `rippleEffects.maxRadius`: radius at which a ripple dies. Omit to derive it from canvas size at construction time (`max(width, height) * 1.2`, the historical default, meaning a ripple always eventually covers most of the canvas before dying). Set explicitly for a ripple that stays contained regardless of canvas size.

Organic noise model notes:
- `organicNoise.enabled` is a *second*, independent way to enable organic noise, OR'd together with the `influenceOptions.organic` boolean passed to `PixelGridEffect`'s constructor (or `usePixelGridEffect`'s `influenceOptions` prop) — either one being `true` turns it on. Useful for enabling it purely from `gridConfig` without also passing a separate `influenceOptions` object.
- `organicNoise.radius`/`.strength`/`.speed` replace the deprecated top-level `organicRadius`/`organicStrength`/`organicSpeed` fields (still accepted, with a console warning — `organicNoise.X` wins if both are set for the same field). Defaults unchanged: `radius: 150`, `strength: 0.4`, `speed: 0.002`.
- `organicNoise.pattern`: `"waves"` (default, the original sin/cos blend) | `"perlin"` (classic 2D gradient noise, smoother/more "organic" than waves) | `"cells"` (Worley/cellular noise, differentiated blob/cell look) | `"turbulence"` (FBM — 4 octaves of Perlin noise summed at doubling frequency, more fine detail than a single octave). Invalid values warn and fall back to `"waves"`.
- `organicNoise.scale`: grain-size multiplier for the noise's spatial frequency, default `1`. Smaller than `1` = bigger blobs/waves, larger than `1` = finer/more granular noise. Floored at `0.01`.
- `organicNoise.position`: `"center"` (default) fixes the effect at the canvas center. `"follow-mouse"` recenters it on the pointer every frame, turning it into an ambient "aura" (read fresh, no caching — same pattern as `hoverEffects`). Moot when `falloff` is `"none"`.
- `organicNoise.falloff`: `"radial"` (default) — smoothstep falloff from the center out to `radius`, as before. `"none"` — unbounded, full-canvas coverage with no edge; `radius` is ignored for the falloff shape (still fine to leave set).
- `organicNoise.seed`: deterministic seed for the `perlin`/`cells`/`turbulence` patterns (`"waves"` has no seed concept, unaffected). Default reproduces the original fixed output exactly.
- `organicNoises?: OrganicNoiseOptions[]`: additional, independent organic-noise instances layered on top of the single `organicNoise` slot — same field shape, mirroring how `imageMask`/`imageMasks` and `textMask`/`textMasks` work. Each entry defaults `enabled: true` (explicit array membership already signals intent, unlike the legacy singular slot which defaults `enabled: false`). The deprecated loose `organicRadius`/`organicStrength`/`organicSpeed` fallback applies only to the singular `organicNoise` slot, never to `organicNoises[]` entries (there's no legacy array form to fall back from).

Hover model notes:
- `hoverEffects.radius`: single circular radius (no `radiusY`).
- `hoverEffects.magnetic`:
  - `enabled`
  - `mode: "attract" | "repel"`
  - `strength`
  - `radius`
  - `magnetic.strength`/`magnetic.radius` are fully independent of `hoverEffects.strength`/`hoverEffects.radius` — magnetic's pull magnitude and reach are driven solely by its own fields, the same way `rippleEffects` is independently tunable from `hoverEffects`. In particular, `magnetic.radius` may be set larger or smaller than `hoverEffects.radius` with no interaction between the two.
  - `magnetic` and `hoverEffects.mode: "reactive"` are independent effects that both write into the same per-cell offset, additively — they are not mutually exclusive, but they compose. In particular, `mode: "reactive"`'s own `displace` pushes cells *away* from the cursor (unrelated to `magnetic`), so enabling `magnetic: { mode: "attract" }` alongside a nonzero `displace`/`jitter` layers an inward pull on top of an outward push/jitter, which can visually cancel or muddy each other. For a "pure" magnetic-only look, use `mode: "classic"` (disables `deactivate`/`displace`/`jitter`/tint entirely) or set `displace`/`jitter` to `0`.

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
      triggerMode: "pointerDown",
      scope: "activeOnly"
    },
    waveWobble: {
      enabled: true,
      amplitude: 6,
      frequency: 0.02,
      speed: 1,
      direction: "both",
      scope: "activeOnly"
    },
    cursorSpotlight: {
      enabled: true,
      radius: 180,
      falloff: 140,
      minOpacity: 0.12
    },
    chromaticBreathing: {
      enabled: true,
      speed: 1,
      palette: ["#334155", "#38bdf8", "#f59e0b"]
    },
    scanLineReveal: {
      enabled: true,
      direction: "horizontal",
      speed: 80,
      bandWidth: 60,
      loop: true
    },
    magneticTrail: {
      enabled: true,
      radius: 90,
      strength: 1.2,
      lifetimeMs: 500,
      maxPoints: 24,
      sampleIntervalMs: 40
    },
    glitchRgbSplit: {
      enabled: true,
      radius: 70,
      jitterAmount: 4,
      durationMs: 220,
      maxBursts: 6,
      triggerMode: "pointerDown"
    },
    gravityFallApart: {
      enabled: true,
      gravity: 0.0009,
      fallDurationMs: 650
    },
    constellationConnect: {
      enabled: true,
      radius: 140,
      linkDistance: 45,
      maxCandidates: 120,
      strength: 1
    }
  }
}
```

Post-effect notes:
- `scope: "all" | "activeOnly"` (default `"activeOnly"`) is available on `paletteCycle`, `dissolve`, `shockwaveBurst`, `waveWobble`, `chromaticBreathing`, `magneticTrail`, and `glitchRgbSplit` — `"activeOnly"` skips cells at/under `activationThreshold`, `"all"` applies to every cell regardless. `cursorSpotlight` and `scanLineReveal` have no `scope`/`activationThreshold` (position/sweep-gated, not activity-gated — for `scanLineReveal` specifically, an `activeOnly` gate would defeat its own purpose of activating previously-inactive cells). `gravityFallApart` and `constellationConnect` use `activationThreshold` only (to detect/gate "active" cells), with no separate `scope` toggle.
- `activationThreshold`'s default is `0.025` for every effect that has one (not different per effect).
- `waveWobble`: sinusoidal traveling displacement written into `offsetX`/`offsetY` (additive, composes with hover/magnetic/ripple displacement rather than overwriting it). `amplitude` in px, `frequency` is spatial (higher = tighter waves), `speed` scales time, `direction: "horizontal" | "vertical" | "both"` (default `"both"`) restricts which axis is displaced.
- `cursorSpotlight`: the inverse of a normal hover glow — dims every cell's `opacity` (multiplicatively, so it composes with breathing/other opacity effects) outside `radius` of the pointer, smoothly down to `minOpacity` over the next `falloff` px. Cells within `radius` are left untouched. Fully inert (no dimming at all) while the pointer is outside the canvas — same "vanishes when `!pointer.inside`" convention as hover/magnetic/`shockwaveBurst`'s hover-triggered modes.
- `chromaticBreathing`: cycles each cell's `color` through `palette` (defaults to the grid's own `colors`) driven by the same per-cell breathing sine wave `breathing`'s opacity variant uses (`breathPhase`/`breathOffset`, randomized once per cell at grid creation) — so cells shimmer through colors *out of phase* with each other, unlike `paletteCycle`'s single globally-synchronized sweep. `speed` uses the same units as `breathing.speed`.
- `scanLineReveal`: a `targetSize` sweep travels along `direction` (`"horizontal"` or `"vertical"`) at `speed`, boosting cells behind it up to full size over a `bandWidth`-px soft leading edge (never shrinks a cell — always `Math.max`-composes with whatever the mask/hover/ripple systems already decided). `loop: true` (default) wraps back to the start once it clears the grid; `loop: false` sweeps once and stops.
- `magneticTrail`: samples the pointer's position every `sampleIntervalMs` while it's over the canvas into a capped, decaying trail (`maxPoints`, `lifetimeMs`) — each point pulls nearby cells toward it (same falloff math as `hoverEffects.magnetic`) with a `max`-style opacity boost, both fading out as the point ages.
- `glitchRgbSplit`: on trigger (`triggerMode`, same values as `shockwaveBurst.triggerMode`: `"pointerDown" | "hoverEnter" | "both"`), spawns a short-lived (`durationMs`) burst at the pointer; cells within `radius` get a brief random `offsetX` jitter (`jitterAmount`) and their `color` swapped to another cell's `baseColor` — a same-frame, index-based "neighbor" pick (not true 2D spatial adjacency) that reads as chaotic/glitchy by design.
- `gravityFallApart`: detects, per cell, the exact frame a cell's `targetSize` crosses from active to inactive (e.g. hover/mask/ripple turning it off) and makes that cell fall — `offsetY` accumulates under `gravity` (px/ms²) while `targetSize`/`opacity` are held and faded out over `fallDurationMs`, instead of the cell just instantly vanishing. A cell that reactivates mid-fall isn't re-triggered; it simply finishes its (short) fall.
- `constellationConnect`: while the pointer is over the canvas, active cells within `radius` glow (`opacity` boost only — no color tint yet, since there's no RGB-lighten utility in this codebase; add one as a follow-up if the opacity-only look isn't strong enough) proportionally to how many *other* nearby candidate cells are within `linkDistance` of them — an isolated cell still gets a small boost, a tightly clustered group glows more. Bounded cost via `maxCandidates` (never a full-grid pairwise scan). Because the boost tops out at `1.0`, it's only visible on cells whose opacity is already below full (e.g. combined with `breathing` or `cursorSpotlight`) — same characteristic `shockwaveBurst`'s own opacity boost already has.
- Processing order is fixed and intentional: `dissolve(10) → scanLineReveal(12) → shockwaveBurst(20) → paletteCycle(30) → waveWobble(35) → magneticTrail(37) → chromaticBreathing(40) → glitchRgbSplit(42) → gravityFallApart(45) → constellationConnect(48) → cursorSpotlight(50)`. Each runs after the previous ones' mutations, so downstream effects observe upstream results within the same frame — e.g. a cell revealed by `scanLineReveal` or a passing `shockwaveBurst` becomes eligible for `paletteCycle`'s `"activeOnly"` scope in that same pass. If both `paletteCycle` and `chromaticBreathing` are enabled, `chromaticBreathing` runs later and wins on `color` for any cell both touch (same for `chromaticBreathing` vs. `glitchRgbSplit`, which runs after it). `gravityFallApart` runs late so it sees every upstream system's final activity decision before deciding a cell "just deactivated". `cursorSpotlight` runs last so its dimming applies over any `opacity` boost written by an earlier effect (including `constellationConnect`, right before it). The order isn't configurable.

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
- `steps[].masks`: activates up to one image + one text mask *simultaneously* for that step (e.g. text superimposed over an image), instead of the step's single `assetId`/`mask`:
  ```ts
  steps: [
    {
      masks: [
        { assetId: "catA" },
        { assetId: "headline", blendMode: "multiply" }
      ],
      holdMs: 1200
    }
  ]
  ```
  Each mask defaults to `"max"` (union) blending, same as every mask uses outside a combo step. Set `blendMode` on an individual entry (`"max" | "add" | "multiply" | "override"`) to override just that mask — e.g. `"multiply"` gives an intersection look instead of a union. The override only applies while that mask is active as part of this combo; it always resets back to `"max"` the next time that mask is resolved for a different step with no override (never leaks across steps). At most one mask per type is honored — extra entries of the same type are dropped with a console warning. Transitions (`morph`/`fade`/`dissolve`) into or out of a step using `masks` always hard-cut (no animation); only single-mask-to-single-mask steps support an animated transition.

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
- set `overlayPointerEvents="hybrid"` for clickable overlay UI while preserving canvas hover/ripple behavior — the overlay's `pointermove`/`pointerenter`/`pointerleave`/`pointerdown`/`pointerup`/`click` are redispatched onto the canvas as real `PointerEvent`s (matching what `@pixel-engine/core`'s `InputSystem` actually listens for), so reactive/magnetic hover, tint, and `breathing.affectHover` keep working while the pointer is over interactive overlay content, not just clicks

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

Text mask model notes:
- `textMask.reveal` (also `textMasks[]`/`maskTimeline.items[]` text entries): reveals the text progressively, character by character, instead of the whole string appearing at once.
  ```ts
  textMask: { text: "PIXEL ENGINE", font: "bold 160px Arial", reveal: { mode: "typewriter", charsPerSecond: 12 } }
  ```
  - `mode: "instant" | "typewriter"` (default `"instant"` — the original, unchanged behavior; the whole string draws immediately, `reveal` can be omitted entirely with zero behavior change).
  - `charsPerSecond` (default `12`): reveal speed.
  - `loop` (default `false`): when `true`, the reveal restarts automatically after a brief pause once fully shown, instead of staying fully revealed forever.
  - `startDelayMs` (default `0`): delay before the first character appears.
  - The mask's world-space footprint (size/bounds) stays fixed to the *full* text the whole time — only the drawn glyphs change, so the mask never jumps around as characters appear.
  - When this text mask is used inside a `maskTimeline`, the reveal automatically restarts from the beginning every time the mask (re)becomes the active mask for a step (including a `loop: true` timeline cycling back to it) — it never silently resumes or stays finished from a previous activation.

## Asset path note

In app projects (React/Vite/Next), use bundler URLs:

```ts
import imageUrl from "./assets/cat.png";
```

Avoid `"/src/..."` runtime paths.
