# Migration Guide (v1.0.0)

This guide covers migration to the formal v1 stable baseline and the new package split.

## Update: v1.0.21 React Effect Recreation Semantics (2026-02-24)

- `usePixelGridEffect` / `PixelGridCanvas` now recreate the effect when resolved `gridConfig` or `influenceOptions` changes.
- `effectKey` remains supported as an additional explicit remount/reset boundary.

What changes in practice:

```tsx
// before (common workaround)
<PixelGridCanvas
  preset="minimal"
  statePreset={{ enabled: true, value: uiState }}
  effectKey={`state-${uiState}`}
/>

// now
<PixelGridCanvas
  preset="minimal"
  statePreset={{ enabled: true, value: uiState }}
/>
```

When to still use `effectKey`:
- force a full reset intentionally
- separate visual sessions/scenes with explicit remount boundaries

## Update: v1.0.20 Hover API Simplification + Magnetic Mode (2026-02-24)

- `hoverEffects.radiusY` removed.
- `hoverEffects.shape` removed from hover configuration (hover is circle-only for now).
- Added `hoverEffects.magnetic`:
  - `enabled`
  - `mode: "attract" | "repel"`
  - `strength`
  - `radius`

Migration:

```ts
// before
hoverEffects: {
  mode: "reactive",
  radius: 120,
  radiusY: 90,
  shape: "vignette"
}

// after
hoverEffects: {
  mode: "reactive",
  radius: 120,
  magnetic: { enabled: true, mode: "attract", strength: 2.4, radius: 120 }
}
```

## Update: v1.0.19 Phase 9 PR-9B Effects Expansion (2026-02-24)

- Added new `effects` options:
  - `effects.dissolve`
  - `effects.shockwaveBurst`
- `effects.paletteCycle` remains available.

Example:

```ts
effects: {
  paletteCycle: { enabled: true, speed: 0.45, scope: "activeOnly" },
  dissolve: { enabled: true, speed: 0.9, amount: 0.3 },
  shockwaveBurst: {
    enabled: true,
    speed: 0.85,
    strength: 0.45,
    thickness: 28,
    maxBursts: 16,
    triggerMode: "pointerDown"
  }
}
```

## Update: v1.0.18 Effects API Simplification (2026-02-24)

- `effects.trail` was removed from `PixelGridConfig` and `PixelGridEffect` runtime.
- `effects` now only supports `paletteCycle`.
- Playground `Effects` panel was simplified to only expose `paletteCycle` controls.

Migration:

```ts
// before
effects: {
  trail: { enabled: true, decay: 0.88, strength: 1 },
  paletteCycle: { enabled: true, speed: 0.45, scope: "activeOnly" }
}

// after
effects: {
  paletteCycle: { enabled: true, speed: 0.45, scope: "activeOnly" }
}
```

## Update: v1.0.16 Phase 4 Multi-Mask Timeline Hardening (2026-02-23)

- React hybrid mask (`mask.type="hybrid"`) now has production-hardened validation for multi-mask timelines:
  - actionable warnings for unknown `assetId`/`maskId`
  - warnings for empty ids and conflicting `assetId` vs `maskId`
  - warnings for duplicate ids in the same declaration scope
- Multi-mask declarative pass-through is covered end-to-end in React wrappers:
  - `usePixelGridEffect`
  - `PixelGridCanvas`
  - `PixelCard`
- Runtime timeline hardening expanded with long-loop stability tests and invalid-ref fallback coverage.
- Transition benchmark runner now supports scenario dimension:
  - `text-image` (legacy 2-step)
  - `multi-mask` (native 4-step id-based timeline)

New benchmark commands:

```bash
npm run bench:transition:legacy
npm run bench:transition:multi
```

Maintainer note:
- Use `bench:transition:legacy` to compare against pre-multi-mask behavior.
- Use `bench:transition:multi` as the default tracking target for Phase 4+ timeline regressions.

## Update: v1.0.17 Phase 8C Runtime Tuning Contracts (2026-02-24)

- `PixelEngineOptions` now supports explicit loop tuning:
  - `loop.fixedTimeStep`
  - `loop.maxDelta`
  - `loop.maxUpdatesPerFrame`
- `quality` in `PixelEngineOptions` now has explicit runtime meaning:
  - it selects scheduling defaults for the fixed-step loop profile
  - explicit `loop` values always override quality defaults
- New runtime inspection helpers:
  - `engine.getQuality()`
  - `engine.getLoopTuning()`
- Removed dormant `PerformanceMonitor` module from core public surface.

Recommended migration:

```ts
const engine = new PixelEngine({
  canvas,
  width,
  height,
  quality: "medium",
  loop: {
    maxUpdatesPerFrame: 180
  }
});
```

## Update: v1.0.15 Phase 2 Runtime Tuning + Culling (2026-02-22)

- `PixelGridConfig` now supports `performance` tuning:
  - `quality`: `"low" | "medium" | "high"`
  - `viewportCulling`: `boolean`
  - `cullingPadding`: `number`
  - `minRenderableSize`: `number`
- `PixelGridEffect` render pass now supports viewport culling when engine size is available.
- Quality tier now influences internal runtime behavior (including ripple limits and render detail threshold).

Recommended:

```ts
const grid = new PixelGridEffect(engine, width, height, {
  // ...existing config
  performance: {
    quality: "medium",
    viewportCulling: true
  }
});
```

Maintainer note:
- Use `quality: "low"` for heavy scenes / large effect areas.
- Keep `viewportCulling` enabled when effect dimensions can exceed viewport dimensions.

## Update: Phase 1 v1.1 Foundation (PR-1A + PR-1B) - 2026-02-22

- `PixelGridEffect` internals were further decomposed to reduce coupling:
  - extracted mask cache coordinator
  - extracted reactive interaction coordinator
- React overlay interaction now supports:
  - `overlayPointerEvents="hybrid"` in `PixelSurface` and `PixelCard`
  - pointer bridge forwarding from overlay to canvas so overlay UI stays interactive while hover/ripple continue to work

Maintainer note:
- Existing modes remain unchanged:
  - `none`: full pass-through to canvas
  - `auto`: overlay captures interactions
  - `hybrid`: overlay interactive + bridged canvas interaction

## Update: Release v1.0.13 (2026-02-21)

- Release automation scripts added:
  - `npm run release:docs:prepare`
  - `npm run release:docs:check`
  - `npm run release:pack:verify`
- `npm run release:check` is now stricter and validates:
  - release docs coverage
  - generated tarballs for all publishable packages
  - existing test/build/type/smoke quality gates

Maintainer note:
- Before publishing, run `npm run release:docs:prepare` and replace placeholders if generated.
- Treat `RELEASE_CHECKLIST.md` as the source of truth for publish steps/order.

## Update: Phase F Consumer Smoke + Visual Baseline (v1.0.12)

- CI now includes:
  - `npm run smoke:consumer`
  - `npm run test:visual`
- `smoke:consumer` now validates tarball consumption for:
  - `pixel-engine`
  - `@pixel-engine/core`
  - `@pixel-engine/effects`
  - `@pixel-engine/react`
- Added deterministic visual baseline snapshots for PixelGrid runtime behavior.

Maintainer note:
- Update snapshots intentionally with:
  - `npx vitest run src/entities/pixel-grid/visual-baseline.test.ts -u`
- Keep this update only for deliberate visual/runtime changes, not incidental refactors.

## Update: Phase F CI Quality Gates Baseline (v1.0.11)

- Added CI workflow: `.github/workflows/ci.yml`
- New script:
  - `npm run test:ci`
- CI gates now validate:
  - tests
  - aggregate build
  - typecheck
  - package builds

Maintainer note:
- Keep local and CI execution aligned by using `npm run test:ci` for deterministic one-pass tests.
- In monorepo development, test resolution now maps `@pixel-engine/*` directly to package `src` entries via root Vite aliases, avoiding dependency on prebuilt `dist` artifacts during tests.

## Update: Phase E Documentation Matrix + Compatibility Notes (v1.0.10)

- Added docs matrix for preset selection and component capabilities.
- Added React compatibility notes (SSR, assets, overlay events, `effectKey` strategy).
- Expanded guidance for choosing between:
  - `preset`
  - `gridConfig`
  - `preset + gridConfig`
  - helper-based reusable configs

## Update: Preset Tuning + Validation Hardening (v1.0.9)

- New preset metadata APIs:
  - `listPixelPresets()`
  - `getPixelPresetDefinition(name)`
- `resolveGridConfigInput` now applies stronger sanitization for nested numeric values.
- Added contextual warnings (example: using `hero-image` preset without image mask).

Recommended:
- use `listPixelPresets()` to drive preset selectors in your UI/playground.
- use `getPixelPresetDefinition(name)` to show preset guidance/tooltips in-app.

## Update: Phase E Foundation - Presets + Declarative Mask API (v1.0.8)

- `@pixel-engine/react` now supports:
  - `preset` (`minimal`, `card-soft`, `card-ripple`, `hero-image`)
  - declarative `mask` (`text`, `image`, `hybrid`)
- `gridConfig` is now optional when using presets.
- New helper exports:
  - `createPixelPreset(name, overrides?)`
  - `mergePixelOptions(base, override)`
  - `createMaskConfig(mask)`

Recommended pattern:
- build shared team presets with `createPixelPreset`
- tune per-screen overrides with `mergePixelOptions`
- map declarative masks with `createMaskConfig`

Example:

```tsx
<PixelGridCanvas
  width={900}
  height={520}
  preset="hero-image"
  mask={{
    type: "text",
    text: "PIXEL",
    centerX: 450,
    centerY: 260
  }}
/>
```

## Update: Overlay Pointer Events + External React Validation (v1.0.7)

- `PixelCard` and `PixelSurface` now use `overlayPointerEvents="none"` by default.
- This prevents overlay content from blocking canvas hover/click/ripple interactions.
- If you need clickable UI on top, set `overlayPointerEvents="auto"`.
- Integration was validated in an external React project (Vite + TS) with positive results.

## Update: React Product Layer Completion + PixelCard DX (v1.0.6)

- `Phase D` completed with `PR-D3`.
- `PixelCard` now supports declarative grid mode via `gridConfig`.
- Added React DX hardening:
  - `effectKey` for `usePixelGridEffect` / `PixelGridCanvas` to control intentional effect recreation.

Recommended `PixelCard` usage:

```tsx
<PixelCard
  width={420}
  height={240}
  gridConfig={{
    colors: ["#0f172a", "#1e293b"],
    gap: 7,
    expandEase: 0.08,
    breathSpeed: 1
  }}
/>
```

## Update: React Product Layer Callbacks + Declarative Grid (v1.0.5)

- `@pixel-engine/react` now includes:
  - `usePixelGridEffect`
  - `PixelGridCanvas`
- New high-level callbacks:
  - `onHoverStart`
  - `onHoverEnd`
  - `onRipple` (grid hook/component path)
- Declarative usage now supports ripple trigger wiring with `rippleTrigger` (`click`, `pointerdown`, `none`).

If you were wiring `PixelGridEffect` manually inside `useEffect`, you can migrate to:

```tsx
<PixelGridCanvas
  width={800}
  height={500}
  onRipple={(event) => console.log(event.x, event.y)}
  gridConfig={{
    colors: ["#334155", "#475569", "#64748b"],
    gap: 6,
    expandEase: 0.08,
    breathSpeed: 0.9
  }}
/>
```

## Update: React Product Layer Baseline (v1.0.4)

- New package: `@pixel-engine/react`.
- New exports:
  - `usePixelEngine`
  - `PixelCanvas`
  - `PixelSurface`
  - `PixelCard`
- The React package is SSR-safe (`window` guards) and handles engine lifecycle cleanup by default.

Install:

```bash
npm install @pixel-engine/react @pixel-engine/core @pixel-engine/effects
```

Maintainer note:
- In this phase baseline, `PixelCanvas` + `onReady` is the simplest integration path.
- This baseline was extended by v1.0.5 and v1.0.6 with declarative grid hooks/components and interaction callbacks.

## Update: API Contract Cleanup + Runtime Optimization (v1.0.3)

- Aggregate package (`pixel-engine`) now re-exports directly from:
  - `@pixel-engine/core`
  - `@pixel-engine/effects`
- Legacy unused files removed (`src/types/*`, empty placeholders) with no public API impact.
- Runtime internals for `PixelGridEffect` were modularized to improve maintainability.
- New reproducible benchmark command:

```bash
npm run bench:pixelgrid
```

Maintainer note:
- Use `BENCHMARKS.md` snapshots as before/after reference when changing runtime paths.
- Keep aggregate usage as compatibility path; split-package imports remain recommended.

## Update: Publish Hardening + Consumer Smoke Test (v1.0.2)

- Package boundaries are now physically decoupled in `packages/core` and `packages/effects`.
- `@pixel-engine/effects` now depends on `@pixel-engine/core` with semver (`^1.0.0`) for publish-safe npm installs.
- New release validation flow:

```bash
npm run release:check
```

This now includes:
- tests
- build + package builds
- typecheck
- pack dry-runs
- consumer smoke install/import test from local tarballs

Maintainer note:
- Run `npm run release:check` before every public publish.
- Follow publish order in `RELEASE.md` (`core` -> `effects` -> `react` -> aggregate).

## Update: Canvas Background via PixelGridEffect (v1.0.1)

Canvas clear color can now be controlled directly from `PixelGridEffect`:
- `canvasBackground?: string | null` in `PixelGridConfig`
- `grid.setCanvasBackground(color | null)` at runtime

Recommended for effect-driven setups:

```ts
const engine = new PixelEngine({ canvas, width, height });
const grid = new PixelGridEffect(engine, width, height, {
  colors: ["#334155", "#475569", "#64748b"],
  gap: 6,
  expandEase: 0.08,
  breathSpeed: 0.9,
  canvasBackground: "transparent"
});
```

If you previously set background only with `engine.setClearColor(...)`, it still works.
For `PixelGridEffect` scenes, move that value to `canvasBackground` to keep config centralized.

## 1. Package Strategy

### Before
- Single package usage:
  - `pixel-engine`

### After
- Recommended split by concern:
  - `@pixel-engine/core` for engine/runtime/renderer/scene primitives
  - `@pixel-engine/effects` for `PixelGridEffect` and influence systems
  - `@pixel-engine/react` for React lifecycle hook + ready-to-use canvas/surface/card components

You can still use `pixel-engine` as aggregate compatibility package.

## 2. Installation

```bash
npm install @pixel-engine/core @pixel-engine/effects @pixel-engine/react
```

Or keep compatibility aggregate:

```bash
npm install pixel-engine
```

## 3. Import Changes

### Recommended (split)
```ts
import { PixelEngine } from "@pixel-engine/core";
import { PixelGridEffect } from "@pixel-engine/effects";
```

### Compatibility (aggregate)
```ts
import { PixelEngine, PixelGridEffect } from "pixel-engine";
```

## 4. PixelGridConfig Changes

Use structured config blocks:
- `hoverEffects`
- `rippleEffects`
- `breathing`

Use optional masks:
- `imageMask` is optional
- `textMask` is optional

If both are omitted, the grid still works with hover/ripple/organic effects only.

## 5. Why split into `core` and `effects`?

- Better dependency boundaries:
  - app code that only needs runtime primitives does not pull effect code.
- Easier framework wrappers:
  - React/Vue wrappers can depend on `core` and opt into `effects`.
- Better long-term maintenance:
  - independent evolution of runtime vs effect modules.
- Cleaner publish strategy:
  - smaller packages, clearer ownership, less API ambiguity.

## 6. Build in this repository

```bash
npm run build
npm run build:packages
```

`build:packages` builds:
- `@pixel-engine/core`
- `@pixel-engine/effects`
- `@pixel-engine/react`

## 7. Verification checklist

- Update imports to split packages (recommended).
- Update `PixelGridConfig` usage to stable structured options.
- Ensure asset URLs are bundled URLs in app projects:
  - use `import img from "./asset.png"` instead of `"/src/..."`
- Run tests/build after migration.
