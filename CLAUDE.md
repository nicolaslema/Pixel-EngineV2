# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pixel Engine: a 2D canvas pixel-grid simulation/effects engine, split into three publishable npm packages plus an aggregate compatibility package.

- `@pixel-engine/core` (`packages/core`): engine lifecycle, fixed-step loop, scheduler, scene graph, renderer abstraction, input.
- `@pixel-engine/effects` (`packages/effects`): `PixelGridEffect` — the actual product: an interactive grid of pixels driven by hover/ripple/mask/breathing/post-effect systems.
- `@pixel-engine/react` (`packages/react`): hooks and components (`PixelGridCanvas`, `PixelCard`, `PixelSurface`, `usePixelEngine`, `usePixelGridEffect`) for declarative React usage.
- `pixel-engine` (root package, built from root `src/index.ts`): aggregate compatibility package. It has no implementation of its own — it's a pure re-export (`export * from "@pixel-engine/core"; export * from "@pixel-engine/effects";`), bundled by tsup with those packages left as external (unbundled) imports, resolved by consumers via the aggregate's own npm `dependencies`. Because of this, building the aggregate does **not** require `packages/*` to be built first — but `npm run build:all` builds packages first anyway to match publish order.

There is also `playground/` (Vite apps used as the manual dev/QA harness, not published): `playground/main.ts` (vanilla, entry `index.html`) exercises `@pixel-engine/core`/`@pixel-engine/effects` directly; `playground/react/` (entry `react.html`, `npm run dev:react`) exercises `@pixel-engine/react` with two tabs — a **Configurator** (`Configurator.tsx`, full control panel of sliders/selects/color/file inputs around a central `PixelGridCanvas`, covering colors/gap/hover mode+magnetic/ripple/breathing/mask text-or-image) and a **Card in a website** demo (`CardDemo.tsx`, a mock landing page using `PixelCard` as a decorative background behind real overlay content, including `overlayPointerEvents="hybrid"`) — both resolve `@pixel-engine/*` against package source via the same Vite alias as tests, not a packed build, so they're for interactive/visual QA, not a packaging-correctness check (that's `npm run smoke:consumer`, which installs the actual `npm pack` tarballs but only checks imports resolve, not visual/interactive behavior). Root `tsconfig.json` sets `"jsx": "react-jsx"` specifically so Vite/esbuild picks the automatic JSX runtime for `playground/react/**` (the only `.tsx` outside `packages/react`, which sets its own `jsx` option) — without it, JSX under `playground/` fails at runtime with `React is not defined` and renders a blank page, since nothing there imports `React` explicitly.

`packages/core/src` and `packages/effects/src` are the single source of truth for their respective packages — there is no mirrored/duplicated copy elsewhere. (This repo used to hand-maintain a duplicate under root `src/`, verified by a parity-check script; that was removed — root `src/` now only contains `index.ts` and playground assets.)

Vitest and `tsconfig.json` alias `@pixel-engine/core`/`@pixel-engine/effects`/`@pixel-engine/react` to `packages/*/src/index.ts` (not `dist`), so tests and typechecking always run against source, never stale builds.

## Commands

Run from repo root (npm workspaces; `packages/*` are workspaces).

```bash
npm run dev                    # Vite playground at index.html / playground/main.ts (vanilla, @pixel-engine/core+effects)
npm run dev:react              # Vite playground at react.html / playground/react/ (@pixel-engine/react, manual test surface)
npm run test                   # vitest (watch)
npm run test:ci                # vitest run (single pass, used in CI)
npx vitest run <path>          # run a single test file
npm run test:visual            # visual baseline snapshot test only (see note below)
npm run lint                   # ESLint (flat config, eslint.config.mjs)
npm run format                 # Prettier --write
npm run typecheck              # tsc --noEmit (root, aliases into packages/*/src)
npm run build                  # tsup build of aggregate `pixel-engine` (src/index.ts -> dist)
npm run build:packages         # builds @pixel-engine/{core,effects,react} independently
npm run build:all              # build:packages then build (aggregate)
npm run verify                 # lint + test + build:all + typecheck — run this before considering work done
npm run bench:pixelgrid        # perf benchmark suite (builds packages first, packs tarballs, runs synthetic scenarios)
npm run bench:transition       # mask-transition perf benchmark suite
npm run release:check          # full pre-publish gate: verify + docs check + pack dry-run + tarball verify + consumer smoke test
```

`npm install` has not been run in this checkout (`node_modules` absent) — install before running any of the above.

ESLint's `react-hooks` rules are intentionally scoped to just `rules-of-hooks` (error) + `exhaustive-deps` (warn) for `packages/react/src` — see the comment in `eslint.config.mjs`. The plugin's v7 "recommended" preset also bundles newer React Compiler-readiness rules (`refs`, `set-state-in-effect`, `purity`, ...) that flag several existing, working, tested patterns in this package; adopting those is a deliberate future decision, not something silently enforced by the lint baseline. Prettier is configured but the existing codebase has **not** been reformatted with it yet (`npm run format` would touch ~119 files) — treat that as a separate, deliberate, isolated change if/when it happens, not something to mix into unrelated diffs.

### Updating the visual baseline snapshot

`packages/effects/src/entities/pixel-grid/visual-baseline.test.ts` has a deterministic snapshot of PixelGrid runtime output. Only regenerate intentionally:

```bash
npx vitest run packages/effects/src/entities/pixel-grid/visual-baseline.test.ts -u
```

## Architecture

### Core runtime (`packages/core/src`)

`PixelEngine` (`core/PixelEngine.ts`) owns a `GameLoop`, `Scene`, `InputSystem`, `Time`, `Scheduler`, and `Camera2D`, and wires them together:

- `GameLoop` is a fixed-timestep accumulator loop (`requestAnimationFrame` driven): it calls `frame(fixedTimeStep)` zero or more times per rAF tick (capped by `maxUpdatesPerFrame`, delta clamped by `maxDelta` to avoid the spiral of death), then calls `onRender(alpha, renderDelta)` once with an interpolation `alpha` for the leftover accumulator fraction.
- `quality` (`"low" | "medium" | "high"` on `PixelEngineOptions`) selects loop-tuning defaults (`fixedTimeStep`/`maxDelta`/`maxUpdatesPerFrame`); explicit `loop` options always override quality defaults. Inspect via `engine.getQuality()` / `engine.getLoopTuning()`.
- `Scheduler` runs registered tasks in six ordered phases per frame: `preUpdate → update → postUpdate → preRender → render → postRender`, each phase sorted by `priority` then registration order. `PixelEngine.update()`/`render()` interleave `Scene.update/render` between the scheduler phases.
- `Scene`/`Entity` is a flat entity list with `update(delta)` / `render(renderer, alpha)` / `onDestroy()` lifecycle — no hierarchy/transform tree beyond `Transform.ts`.
- `IRenderer`/`Renderer`/`Canvas2DRenderer` abstract the draw target; only a Canvas2D implementation exists today (`rendererFactory` in `PixelEngineOptions` allows swapping it).

### Effects layer (`packages/effects/src`)

`PixelGridEffect` (`entities/PixelGridEffect.ts`) is an `Entity` that is almost entirely a thin facade: construction resolves config (`normalizeConfig.ts` → `resolvePixelGridConfig`, which fills defaults, validates masks/timeline references, and collects non-fatal `warnings` logged via `console.warn`) and delegates everything to `createPixelGridRuntimeController` (`entities/pixel-grid/internal/runtime-controller.ts`), which composes the real systems:

- `runtime-state.ts` — mutable per-instance state (active/recycled ripple pools, mask weight caches, reactive time); also owns `resetCell`/`resetCells`, the per-frame state reset.
- `PixelCellBuffer` (`internal/cell-buffer.ts`) — structure-of-arrays cell storage: one `Float32Array` per numeric field (`x`, `y`, `size`, `previousSize`, `targetSize`, `offsetX`/`previousOffsetX`, `offsetY`/`previousOffsetY`, `opacity`/`previousOpacity`, `breathPhase`, `breathOffset`), plus `color`/`baseColor: string[]`, plus scalar `count`/`gap`/`maxSize` (there is no per-cell `PixelCell` object — this replaced an array-of-structs design in a later performance pass). `createCellBuffer(columns, rows, gap, colors)` builds it in one fused `x`-outer/`y`-inner loop (`index = x * rows + y`, matching `getCellIndex` everywhere else) — the exact `Math.random()` call order/count per cell (color, then breathPhase, then breathOffset) is load-bearing for `visual-baseline.test.ts`'s seeded snapshot, so don't split it into per-field passes. Per-cell operations are free functions taking `(buffer, index, ...)` — `getBreathFactor`, `updateCell`, `snapshotPreviousState`, `resetVisualState`, `getInterpolatedSize/OffsetX/OffsetY/Opacity` — matching the rest of `internal/`'s function-over-class convention, not methods on a class.
- `InfluenceManager` (`influences/InfluenceManager.ts`) — holds `Influence` instances (`HoverInfluence`, `RippleInfluence`, `OrganicNoiseInfluence`, mask influences), each with spatial bounds + a blend mode (`max`/`add`/`multiply`/`override`). Each frame it splats every influence's contribution onto `buffer.targetSize[i]` for cells inside its bounds, tracks whether anything was actually written (`touchedAny`), and only if so runs `compressField` (soft saturation curve) and, when `enableSmoothing` (the default), a neighborhood smoothing pass — both skipped as a no-op-preserving optimization on frames where no influence touched the grid.
- `influences/Masks/*` — `TextMaskInfluence`, `ImageMaskInfluence` (rasterize text/image to a weight field), `MorphMaskInfluence` (interpolates between two mask weight fields), `MaskInfluence` (shared base). `MaskInfluence.getInfluence()` box-averages a block of the mask's buffer per query rather than reading one pixel — `bufferWidth`/`bufferHeight` (buffer sampling resolution) are decoupled from `width`/`height` (world-space footprint, still what `getBounds()`/`scale` control). `ImageMaskInfluence` opts into this when constructed with a `gap` (the grid's `runtime-controller.ts` always passes one), generating its buffer at up to the source image's native resolution instead of tied 1:1 to the on-grid footprint — fixes fine detail being lost to nearest-neighbor decimation on high-resolution images. Omitting `gap` reproduces the old single-pixel-read behavior exactly.
- `internal/mask-state-machine.ts` + `internal/timeline-transition-mask.ts` — drive the declarative mask timeline (sequenced steps with hold/transition durations, `morph`/`fade`/`dissolve` transition modes), independent of React.
- `internal/mask-weight-cache.ts`, `interaction-coordinator.ts` (hover/magnetic-hover/ripple passes), `breathing-system.ts`, `effects/pipeline.ts` (post-effects: `paletteCycle`, `dissolve`, `shockwaveBurst`) — each is a standalone pure-ish function module composed by `update-pipeline.ts`'s `runPixelGridUpdatePipeline`. `runtime-controller.ts` fuses the hover and breathing passes into one full-grid loop (`applyHoverAndBreathingPass`) whenever no ripples are active — the moment a ripple is triggered it falls back to the unfused hover → ripple → breathing sequence, since a ripple can change a cell's `targetSize` in a way that must be visible to breathing's gate before breathing runs.
- `render-pass.ts` — the actual draw loop: iterates the `PixelCellBuffer` arrays in parallel by index, applies render-alpha interpolation inline, does viewport culling and a naive same-color/opacity dedup before `fillRect`. This is the render hot path (see Performance notes).

Everything under `entities/pixel-grid/internal/` is explicitly private runtime detail, not public API (per README's Architecture section) — don't add new public exports there without updating `PixelGridEffect`'s facade surface instead.

### React layer (`packages/react/src`)

`usePixelEngine` owns `PixelEngine` construction/teardown (SSR-safe, guards on `window`). `usePixelGridEffect` builds on it to own a `PixelGridEffect` instance, and **recreates the effect whenever resolved `gridConfig` or `influenceOptions` change** (see `MIGRATION.md` v1.0.21) — `effectKey` is only needed for an explicit forced remount. `PixelGridCanvas`/`PixelCard`/`PixelSurface` are progressively higher-level wrappers; `presets.ts`/`grid-config.ts`/`theme-state-presets.ts` provide declarative preset/mask/theme-driven config resolution, and `pointer-bridge.ts` forwards pointer events from an interactive DOM overlay to canvas-space influences when `overlayPointerEvents="hybrid"`.

### Config resolution pattern

Nearly everything follows the same shape: a `*Options` (all-optional, user-facing) type is normalized by a `resolve*`/`normalize*` function into a `Resolved*` (all-required, internal) type, collecting `warnings: string[]` for anything invalid/ignored rather than throwing. When adding a new config option, follow this pattern rather than reading raw `config.foo` deep in runtime code.

`normalizeConfig.ts` (`resolvePixelGridConfig`, in `@pixel-engine/effects`) is the **single authority** for `PixelGridConfig` defaults, clamping, and validation (including mask id generation — `normalizeMaskCollections` is the only place ids are invented, `image-1`/`text-1`-style; plural array entries register before the singular prop, which is appended last). `PixelGridEffect`'s constructor always calls it, so this applies uniformly whether a consumer goes through React or constructs `PixelGridEffect` directly.

`@pixel-engine/react`'s `grid-config.ts` (`resolveGridConfigInput`) sits one layer above and does **not** re-derive those defaults — it only: merges `preset` → `gridConfig` → `mask` (via `presets.ts`'s `mergePixelOptions`, the package's one deep-merge implementation — `theme-state-presets.ts`'s `mergeGridConfigPartials` is a thin fold over it), guards the *required* scalars (`colors`/`gap`/`expandEase`/`breathSpeed`) against the *preset's* value (a fallback `normalizeConfig.ts` has no way to know about), and emits preset/mask-shape-specific warnings (e.g. `hero-image` without a mask). Its output is an unresolved `PixelGridConfig`, not a `Resolved*` — don't expect it to have applied clamps.

## Performance notes (relevant before optimizing)

- The update/render hot path is structure-of-arrays (`PixelCellBuffer`, parallel `Float32Array`s + a per-frame closure-based pipeline, no per-cell heap objects, no per-cell method calls) — see `internal/cell-buffer.ts`. This replaced an earlier array-of-structs `PixelCell[]` design; per-cell state lives in `buffer.field[index]`, and per-cell logic is free functions, not methods.
- The update pipeline (`update-pipeline.ts`) fuses/gates several full-grid passes rather than running each unconditionally: reset + mask-weight-cache recompute share one loop; hover + breathing share one loop whenever no ripple is active; `InfluenceManager`'s `compressField`/`smoothField` are skipped entirely on frames where no influence actually wrote anything (`touchedAny` gate). Keep this in mind before "optimizing" by adding another full-grid pass — check whether it can be folded into an existing one first.
- `InfluenceManager.apply` iterates influences and, per influence, iterates its full bounding-box of cells — cost scales with influence count × affected area, not total grid size, but there is no spatial index beyond the axis-aligned bounding box → column/row clamp.
- `render-pass.ts` dedups `fillStyle`/`globalAlpha` canvas state changes only between *consecutive* cells in array order; cells aren't sorted/batched by color, so in practice this rarely dedups more than a few neighbors. Render batching/draw-order work was evaluated and deliberately deferred (see `BENCHMARKS.md`): update dominates render by ~20-30x, so the ROI is too low to justify today — revisit only if a future benchmark shows render becoming material (e.g. much denser grids).
- Baseline numbers and how to reproduce them live in `BENCHMARKS.md`; use `npm run bench:pixelgrid` / `npm run bench:transition` (both build packages and benchmark from packed tarballs, not source) before/after perf work.

## Docs map (read before duplicating info into answers)

- `README.md` — install/usage/quick start, package split summary.
- `API.md` — full prop/option tables for React + core config.
- `MIGRATION.md` — versioned history of breaking/behavioral changes, newest first; check this before assuming an option still works as originally shipped.
- `CHANGELOG.md`, `RELEASE.md`, `RELEASE_CHECKLIST.md` — release notes and the exact publish order/workflow (`core` → `effects` → `react` → aggregate, enforced by dependency direction).
- `BENCHMARKS.md` — benchmark suites and how to read results.

## Testing conventions

- Tests are colocated (`Foo.ts` + `Foo.test.ts`) directly under `packages/{core,effects,react}/src`.
- `vitest` environment is `jsdom` with `globals: true` (see `vite.config.ts`), and resolves `@pixel-engine/*` to package `src`, so tests never depend on built `dist` output.
- CI (`.github/workflows/ci.yml`) runs, in order: `Lint` → `test:ci` → `build:packages` → `check:use-client` → aggregate `build` → `typecheck` → `release:docs:check` → `release:pack:verify` → `smoke:consumer` → `test:visual`. Reproduce locally with `npm run verify` (covers `Lint`/`test:ci`/`build:packages`/aggregate `build`/`typecheck`) plus `npm run check:use-client` (after any build that includes `packages/react`, asserts `packages/react/dist/index.js`/`index.mjs` start with `"use client";` — see `packages/react/tsup.config.ts`'s `banner` option; without it, Next.js App Router consumers get a build error importing any component) and `npm run test:visual` for the visual gate.
