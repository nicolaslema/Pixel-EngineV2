# @pixel-engine/react

Declarative React integration for Pixel Engine — hooks and components (`PixelGridCanvas`, `PixelCard`, `PixelSurface`, `PixelCanvas`, `usePixelEngine`, `usePixelGridEffect`) on top of `@pixel-engine/core`/`@pixel-engine/effects`.

This is the complete, React-only guide. For the multi-package overview (vanilla `core`/`effects` usage, install, package split, local pre-publish usage), see the [repository root README](../../README.md).

## Install

```bash
npm install @pixel-engine/core @pixel-engine/effects @pixel-engine/react
```

Peer dependencies: `react`/`react-dom` `^18.0.0 || ^19.0.0` (not bundled, no risk of a duplicate React instance).

**Not yet published to npm.** See [Local Usage (Before Publishing)](../../README.md#local-usage-before-publishing) in the root README for how to consume this package from source today (`npm pack` + tarball install).

## Quick Start

```tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export function App() {
  return <PixelGridCanvas width={900} height={520} preset="minimal" />;
}
```

`@pixel-engine/react`'s published bundle carries a `"use client"` directive — every export uses hooks/refs/canvas, so it's inherently client-only. Import it directly into a Next.js App Router Server Component tree; no manual `"use client"` wrapper file needed on your end.

Same package, same props, in the 3 most common React setups:

### Next.js (App Router)

```bash
npm install @pixel-engine/core @pixel-engine/effects @pixel-engine/react
```

```tsx
// app/page.tsx -- a Server Component. No "use client" wrapper needed: the
// package's bundle already ships the directive (see the note above).
import { PixelGridCanvas } from "@pixel-engine/react";

export default function Page() {
  return <PixelGridCanvas width={900} height={520} preset="card-soft" />;
}
```

### Vite

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @pixel-engine/core @pixel-engine/effects @pixel-engine/react
```

```tsx
// src/App.tsx -- no extra Vite config needed, this is a standard ESM package.
import { PixelGridCanvas } from "@pixel-engine/react";

export default function App() {
  return <PixelGridCanvas width={900} height={520} preset="card-soft" />;
}
```

### Create React App

```bash
npx create-react-app my-app --template typescript
cd my-app
npm install @pixel-engine/core @pixel-engine/effects @pixel-engine/react
```

```tsx
// src/App.tsx
import { PixelGridCanvas } from "@pixel-engine/react";

export default function App() {
  return <PixelGridCanvas width={900} height={520} preset="card-soft" />;
}
```

In every case, remember to import image assets as bundler URLs (`import catUrl from "./cat.png"`), not `"/src/..."` runtime paths — see [Asset paths](#asset-paths) in Troubleshooting.

## Concepts

### The mental model: `preset` → `gridConfig` → `mask` → `influenceOptions`

`usePixelGridEffect`/`PixelGridCanvas` resolve their config in a fixed layering order, each layer answering a different question:

1. **`preset`** — *"give me a reasonable baseline."* A named bundle of `gridConfig` values (`"minimal"`, `"card-soft"`, `"card-ripple"`, `"hero-image"`) tuned for a common scenario. Zero config knowledge required.
2. **`gridConfig`** — *"override specific fields."* A `Partial<PixelGridConfig>` deep-merged on top of the preset (or used alone, with no preset). This is where you tune gap, colors, hover/ripple/breathing/post-effect fields individually.
3. **`mask`** — *"what shape does the grid take?"* Declarative text/image/hybrid mask input, merged in after `preset`/`gridConfig`. Independent axis from the two above — a mask describes the *shape* of the grid, not its interactive *behavior*.
4. **`influenceOptions`** — *"which whole interaction systems are switched on?"* A small, flat, top-level object (`{ ripple?, hover?, organic? }`) passed **separately** from `gridConfig` — not merged into it. These are master on/off switches for entire systems, a different axis from the per-effect `enabled` fields living inside `gridConfig` (e.g. `gridConfig.rippleEffects.enabled` only gates *automatic* reactive ripples; `influenceOptions.ripple` is the switch that also controls whether manual `triggerRipple()` calls do anything at all). See [`influenceOptions` reference](#influenceoptions-reference) below for the exact rules per flag.

In practice:

- **`preset` only** — fastest path, the [Quick Start](#quick-start) example above.
- **`gridConfig` only** — full manual control, when no preset fits your design.
- **`preset` + `gridConfig`** — the most common real-world shape: a baseline plus a handful of targeted overrides.
- **`mask`** — layer it on top of either of the above whenever the grid should render a text/image/hybrid shape instead of (or in addition to) reacting to pointer input.
- **`influenceOptions`** — reach for it only when you need to disable/enable a whole interaction system wholesale (e.g. a purely decorative background with `influenceOptions={{ ripple: false, hover: false }}`); leave it at its default (`{ ripple: true, hover: true, organic: false }`) otherwise.

The effect instance is recreated automatically whenever the *resolved* `gridConfig` or `influenceOptions` changes in content (not identity) — see `stableSerialize` in [Compatibility Notes](#compatibility-notes). Use `effectKey` only when you need an additional, explicit forced remount boundary.

### Complexity ladder

**Easy**

```tsx
<PixelGridCanvas width={900} height={520} preset="card-soft" />
```

**Medium**

```tsx
<PixelGridCanvas
  width={900}
  height={520}
  preset="card-ripple"
  gridConfig={{ gap: 6, hoverEffects: { radius: 120 } }}
  scrollReactive={{ enabled: true, intensity: 1.1, direction: "both" }}
  sectionTransition={{ enabled: true, preset: "lift", amount: 28 }}
  statePreset={{ enabled: true, value: "active" }}
/>
```

**Advanced**

```tsx
import catPngUrl from "./assets/cat.png";

<PixelGridCanvas
  width={960}
  height={540}
  preset="hero-image"
  mask={{
    type: "hybrid",
    initialMask: "image",
    items: [
      { type: "text", id: "title", text: "PIXEL", centerX: 480, centerY: 280, fontSize: 132, fontFamily: "Arial", fontWeight: 700 },
      { type: "image", id: "imgA", src: catPngUrl, centerX: 480, centerY: 260, scale: 2.05, sampleMode: "threshold" }
    ],
    steps: [
      { mask: "text", assetId: "title", holdMs: 1100, mode: "morph", durationMs: 700 },
      { mask: "image", assetId: "imgA", holdMs: 1000, mode: "fade", durationMs: 450 }
    ],
    maskTimeline: { enabled: true, autoplay: true, loop: true, initialStep: 0 }
  }}
  themeSync={{ enabled: true, mode: "brand", brandColors: ["#0f766e", "#14b8a6", "#2dd4bf"] }}
  debugHud={{ enabled: true, position: "top-right", updateIntervalMs: 180 }}
  ssrPlaceholder={{ enabled: true, preset: "hero-image", hideOnReady: true }}
/>
```

### Presets

- `minimal`: neutral baseline, low visual noise.
- `card-soft`: softer hover + breathing for UI cards.
- `card-ripple`: stronger click/ripple feedback surfaces.
- `hero-image`: mask-oriented hero visual treatment (image mask recommended).

| Preset | Best for | Mask support | Notes |
|---|---|---|---|
| `minimal` | low-noise backgrounds | optional | simplest baseline |
| `card-soft` | cards/panels | optional | softer reactive hover |
| `card-ripple` | clickable surfaces | optional | stronger ripple feedback |
| `hero-image` | hero/showcase sections | recommended | designed for image/text mask flows |

## API Reference

### Hooks

- `usePixelEngine(options)`
- `usePixelGridEffect(options)`
- `useScrollReactiveGrid(params)`
- `useSectionTransitionPreset(params)`
- `useDebugHudOverlay(params)` — returns `ReactNode | null`: a `createPortal`-based debug HUD (fps/quality/cells/ripples/timeline, `role="status" aria-live="polite"`) mounted to `document.body` when `debugHud.enabled`, or `null` otherwise. Render the returned value in your tree (`PixelGridCanvas` already does this for you).
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
| `fitMode` | `"none" \| "client"` | Default `"none"` — fixed pixel size from `width`/`height`, applied once at mount. `"client"` measures the canvas's own `clientWidth`/`clientHeight` instead, kept in sync via `resizeMode`. See [Canvas isn't responsive](#canvas-isnt-responsive--stuck-at-a-fixed-pixel-size) in Troubleshooting before reaching for a `%`/`vw`/`vh` `style`. |
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
| `influenceOptions` | `PixelGridInfluenceOptions` | Enable/disable influence groups (`ripple`/`hover`/`organic`) — see [`influenceOptions` reference](#influenceoptions-reference) below for exactly what each one controls and how it relates to the per-effect `enabled` fields in `gridConfig`. |
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
- **`organic`**: OR'd together with `gridConfig.organicNoise.enabled` — either one being `true` enables organic noise; this is intentional, not a duplicate to clean up — it lets `organicNoise.enabled` be set purely from `gridConfig` without also touching `influenceOptions`.

### `PixelGridCanvas` web utility options

Common UX features first; accessibility/SSR/debug utilities — reached for less often, and easy to mistake for each other at a glance in a flat table — are broken out below.

#### Common

| Option | Type | Fields |
|---|---|---|
| `scrollReactive` | object | `enabled`, `intensity`, `direction`, `edge`, `source`, `cooldownMs`, `maxBurstRipples`, `respectReducedMotion` |
| `sectionTransition` | object | `enabled`, `preset`, `amount`, `threshold`, `once`, `rippleOnEnter`, `playTimelineOnEnter`, `pauseTimelineOnExit`, `respectReducedMotion` |
| `themeSync` | object | `enabled`, `mode`, `followSystem`, `brandColors`, `brandCanvasBackground`, `brandHoverTintPalette`, `brandRippleTintPalette` |
| `statePreset` | string or object | `"idle" \| "hover" \| "active" \| "success" \| "error" \| "loading"` or `{ enabled, value }` |

#### Advanced (accessibility, SSR, debugging)

| Option | Type | Fields |
|---|---|---|
| `respectReducedMotion` | `boolean` | Convenience default applied to the 3 independent `respectReducedMotion` switches above — `gridConfig.respectReducedMotion` (breathing/ripple/magnetic/jitter), `scrollReactive.respectReducedMotion`, and `sectionTransition.respectReducedMotion` — each of which already defaults to `true` on its own. Set this once instead of all 3, e.g. `respectReducedMotion={false}` to ignore the OS preference across the whole component for a controlled demo. Any of the 3 nested options can still set its own `respectReducedMotion` explicitly to override this fallback on just that surface. |
| `ssrPlaceholder` | preset or object | `"minimal" \| "card-soft" \| "hero-image"` or `{ enabled, preset, hideOnReady, style }` — a static background shown before the engine is ready (SSR/hydration/initial mount). Most apps don't need this; reach for it if you see a layout flash before mount. |
| `debugHud` | object | `enabled`, `position`, `updateIntervalMs`, `offsetX`, `offsetY`, `showFps`, `showQuality`, `showLoop`, `showCells`, `showRipples`, `showTimeline` — a dev-only fps/quality/cells/ripples/timeline overlay. Not something you ship enabled in production. |

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

### React Surface Components

| Component | Primary use |
|---|---|
| `PixelCanvas` | Low-level engine canvas |
| `PixelGridCanvas` | Fastest declarative PixelGrid integration |
| `PixelSurface` | Canvas + overlay content layout |
| `PixelCard` | Reusable interactive card primitive |

Overlay behavior:
- `overlayPointerEvents="none"`: overlay does not block canvas interactions.
- `overlayPointerEvents="auto"`: overlay handles pointer input.
- `overlayPointerEvents="hybrid"`: overlay stays interactive and pointer bridge forwards interactions to canvas effects.

### `PixelGridConfig` essentials

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
- `organicNoise.enabled` is a *second*, independent way to enable organic noise, OR'd together with the `influenceOptions.organic` boolean — either one being `true` turns it on. Useful for enabling it purely from `gridConfig` without also passing a separate `influenceOptions` object.
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

Post-effect notes:
- `scope: "all" | "activeOnly"` (default `"activeOnly"`) is available on `paletteCycle`, `dissolve`, `shockwaveBurst`, `waveWobble`, `chromaticBreathing`, `magneticTrail`, and `glitchRgbSplit` — `"activeOnly"` skips cells at/under `activationThreshold`, `"all"` applies to every cell regardless. `cursorSpotlight` and `scanLineReveal` have no `scope`/`activationThreshold` (position/sweep-gated, not activity-gated). `gravityFallApart` and `constellationConnect` use `activationThreshold` only (to detect/gate "active" cells), with no separate `scope` toggle.
- `activationThreshold`'s default is `0.025` for every effect that has one.
- Processing order is fixed and intentional: `dissolve(10) → scanLineReveal(12) → shockwaveBurst(20) → paletteCycle(30) → waveWobble(35) → magneticTrail(37) → chromaticBreathing(40) → glitchRgbSplit(42) → gravityFallApart(45) → constellationConnect(48) → cursorSpotlight(50)`. Each runs after the previous ones' mutations, so downstream effects observe upstream results within the same frame. The order isn't configurable. Full per-effect field lists and behavior notes for the `effects` group (`paletteCycle`, `dissolve`, `shockwaveBurst`, `waveWobble`, `cursorSpotlight`, `chromaticBreathing`, `scanLineReveal`, `magneticTrail`, `glitchRgbSplit`, `gravityFallApart`, `constellationConnect`) are documented via JSDoc on each `*EffectOptions` type in `packages/effects/src/entities/pixel-grid/types.ts`.

### React Component Capability Matrix

| Component | Owns engine lifecycle | Supports preset/mask | Overlay content | Typical role |
|---|---|---|---|---|
| `PixelCanvas` | yes | no | no | low-level engine control |
| `PixelGridCanvas` | yes | yes | no | declarative effect canvas |
| `PixelSurface` | yes | via `onReady` flow | yes | canvas + layered content |
| `PixelCard` | yes | yes | yes | reusable interactive card primitive |

### Compatibility Notes

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
  - React layer emits dev warnings for invalid timeline refs: unknown `assetId`/`maskId`, empty ids, conflicting `assetId` vs `maskId`, duplicate ids within same declaration group
- Mask id resolution order: both the singular (`imageMask`/`textMask`) and plural (`imageMasks`/`textMasks`) props are supported at the same time — plural array entries are registered first, in array order, then the singular prop (if present) is appended last. Ids are generated (`image-1`, `text-1`, ...) for any mask that doesn't provide its own `id`. This resolution happens once, in `@pixel-engine/effects`; it's the same regardless of whether masks arrive via the `mask` prop or directly via `gridConfig`.

### Text mask model notes

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

## Cookbook

Task-oriented recipes for the most common use cases. See the [Complexity ladder](#complexity-ladder) above if you just want to see how far a single `<PixelGridCanvas>` scales.

### Hero background

Mask-oriented full-bleed hero section, driven by a declarative mask timeline:

```tsx
import catPngUrl from "./assets/cat.png";
import { PixelGridCanvas } from "@pixel-engine/react";

export function Hero() {
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
      effectKey="hero-v2"
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

### Decorative card

`PixelCard` as an interactive background behind real overlay content:

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

`overlayPointerEvents="none"` by default (canvas interactions pass through). Set `"auto"` for clickable overlay UI, or `"hybrid"` for clickable overlay UI while preserving canvas hover/ripple behavior — the overlay's pointer events are redispatched onto the canvas as real `PointerEvent`s, so reactive/magnetic hover, tint, and `breathing.affectHover` keep working while the pointer is over interactive overlay content, not just clicks.

### Text reveal

Progressive, typewriter-style text mask (see [Text mask model notes](#text-mask-model-notes) above for the full field reference):

```ts
textMask: {
  text: "PIXEL ENGINE",
  font: "bold 160px Arial",
  reveal: { mode: "typewriter", charsPerSecond: 12 }
}
```

### Scroll response

Combine `scrollReactive` (continuous scroll-driven ripples) with `sectionTransition` (enter/exit animation as the section crosses the viewport):

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

### Light/dark theme

`themeSync` drives colors from a brand palette or the OS/browser color scheme, and `statePreset` layers a semantic interaction state (`"idle" | "hover" | "active" | "success" | "error" | "loading"`) on top:

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

### CMS-driven config

Validate and load a `PixelGridCanvas` config from an untrusted JSON source (e.g. a CMS document):

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

`loadPixelConfigFromJson` rejects unsupported schema versions, validates known top-level keys (warning for unknown ones), validates preset/mask shape/state preset values, and supports a fallback merge for resilient CMS defaults.

### Reusable config with helper functions

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

Useful for a design system that wants a shared, reusable base config instead of repeating `preset`/`gridConfig`/`mask` props at every call site.

### Debug HUD + SSR-safe placeholder

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

`debugHud` is a dev-only fps/quality/cells/ripples/timeline overlay — don't ship it enabled in production. `ssrPlaceholder` renders a static background matching the given preset until the engine is ready, avoiding a layout flash on SSR/hydration.

## Troubleshooting

### Canvas isn't responsive / stuck at a fixed pixel size

By default (`fitMode="none"`), the canvas has a fixed pixel size — `width`/`height` are applied once and never change. If you pass a `style` with a percentage/viewport-unit width or height (`"100%"`, `"50vh"`, etc.) without also setting `fitMode="client"`, it'll silently get overwritten: the underlying `Canvas2DRenderer` sets `canvas.style.width`/`height` to a fixed `px` value imperatively on every resize (including at mount), so that responsive value never actually takes effect. In dev, doing this logs a `console.warn` pointing at the fix. Make the canvas track its container's size instead:

```tsx
<div style={{ width: "100%", height: 400 }}>
  <PixelGridCanvas
    width={900}
    height={520}
    fitMode="client"
    resizeMode="observer"
    style={{ width: "100%", height: "100%" }}
    preset="minimal"
  />
</div>
```

`fitMode="client"` measures the canvas's own `clientWidth`/`clientHeight` instead of using the `width`/`height` props directly, and `resizeMode` (default `"observer"`) keeps it in sync via `ResizeObserver` as the container resizes.

### Component mounts/creates the engine twice in development

This is expected under `React.StrictMode`, not a bug. In dev, StrictMode intentionally double-invokes the mount effect: it creates a "phantom" engine, immediately destroys it, then creates the real engine that survives — `createEngine`/`onReady` fire twice, but only the phantom instance gets destroyed before the component settles. `usePixelGridEffect`'s grid-creation effect (gated on a stable, non-null engine) only creates the `PixelGridEffect` once per real mount, not once per StrictMode phantom pass. Both hooks have dedicated test coverage asserting this exact lifecycle (mount → phantom destroy → live mount → unmount → remount) — see `usePixelEngine.test.tsx`/`usePixelGridEffect.test.tsx` in the package source. This behavior does not occur in production builds (StrictMode's double-invoke is dev-only).

### Layout flash before the canvas is ready (SSR/hydration)

The engine only initializes client-side, after mount — safe by default for SSR, but if you see a visible flash of empty space before the canvas renders, use `ssrPlaceholder` to show a static background matching your preset until the real engine is ready (see [Debug HUD + SSR-safe placeholder](#debug-hud--ssr-safe-placeholder) above).

### Config warnings in the console

`usePixelGridEffect`/`PixelGridCanvas` never throw on invalid config — instead they fall back to a safe default and log an actionable `console.warn` naming the exact field and the fallback taken (e.g. `"gridConfig.gap must be > 0. Falling back to preset gap."`). Subscribe to `onConfigWarning` if you want to surface these in your own UI/telemetry instead of relying on the console. Common causes: an out-of-range numeric field, an unknown `assetId`/`maskId` referenced in `maskTimeline.steps[]`, or duplicate mask ids within the same declaration group.

### Asset paths

In app projects (React/Vite/Next), always use bundler URLs:

```ts
import imageUrl from "./assets/cat.png";
```

Avoid `"/src/..."` runtime paths — they only resolve in dev, not in a production build.

## Related docs

- [Repository root README](../../README.md) — multi-package overview, install, vanilla `core`/`effects` quick start, package split, local usage before publishing.
- [`API.md`](../../API.md) — `core`/`effects` (vanilla) reference: engine construction, scheduler, loop/quality tuning, `MorphMaskInfluence`.
- [`CHANGELOG.md`](../../CHANGELOG.md) — release notes.
- [`MIGRATION.md`](../../MIGRATION.md) — versioned history of breaking/behavioral changes.
