# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pixel Engine: a 2D canvas pixel-grid simulation/effects engine, split into three publishable npm packages plus an aggregate compatibility package.

- `@pixel-engine/core` (`packages/core`): engine lifecycle, fixed-step loop, scheduler, scene graph, renderer abstraction, input.
- `@pixel-engine/effects` (`packages/effects`): `PixelGridEffect` — the actual product: an interactive grid of pixels driven by hover/ripple/mask/breathing/post-effect systems.
- `@pixel-engine/react` (`packages/react`): hooks and components (`PixelGridCanvas`, `PixelCard`, `PixelSurface`, `usePixelEngine`, `usePixelGridEffect`) for declarative React usage.
- `pixel-engine` (root package, built from root `src/index.ts`): aggregate compatibility package. It has no implementation of its own — it's a pure re-export (`export * from "@pixel-engine/core"; export * from "@pixel-engine/effects";`), bundled by tsup with those packages left as external (unbundled) imports, resolved by consumers via the aggregate's own npm `dependencies`. Because of this, building the aggregate does **not** require `packages/*` to be built first — but `npm run build:all` builds packages first anyway to match publish order.

There is also `playground/` (a Vite app used as the manual dev/QA harness, not published).

`packages/core/src` and `packages/effects/src` are the single source of truth for their respective packages — there is no mirrored/duplicated copy elsewhere. (This repo used to hand-maintain a duplicate under root `src/`, verified by a parity-check script; that was removed — root `src/` now only contains `index.ts` and playground assets.)

Vitest and `tsconfig.json` alias `@pixel-engine/core`/`@pixel-engine/effects`/`@pixel-engine/react` to `packages/*/src/index.ts` (not `dist`), so tests and typechecking always run against source, never stale builds.

## Commands

Run from repo root (npm workspaces; `packages/*` are workspaces).

```bash
npm run dev                    # Vite playground at index.html / playground/main.ts
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
- `grid/PixelBuffer.ts`, `GridBuilder.ts`, `BufferUtils.ts` define a typed-array (SoA) grid data structure. **This is currently dead code** — it is not used by `PixelGridEffect` or any other runtime path, only exercised by its own unit tests. Don't assume the engine is typed-array-driven end to end because of this file or the `pixel-engine` package description; see Performance notes below.

### Effects layer (`packages/effects/src`)

`PixelGridEffect` (`entities/PixelGridEffect.ts`) is an `Entity` that is almost entirely a thin facade: construction resolves config (`normalizeConfig.ts` → `resolvePixelGridConfig`, which fills defaults, validates masks/timeline references, and collects non-fatal `warnings` logged via `console.warn`) and delegates everything to `createPixelGridRuntimeController` (`entities/pixel-grid/internal/runtime-controller.ts`), which composes the real systems:

- `runtime-state.ts` — mutable per-instance state (active/recycled ripple pools, mask weight caches, reactive time).
- `PixelCell` (`entities/PixelCell.ts`) — one plain class instance per grid cell (array-of-structs, not the typed-array buffer above), holding current/previous/target size, offset, opacity for render-alpha interpolation.
- `InfluenceManager` (`influences/InfluenceManager.ts`) — holds `Influence` instances (`HoverInfluence`, `RippleInfluence`, `OrganicNoiseInfluence`, mask influences), each with spatial bounds + a blend mode (`max`/`add`/`multiply`/`override`). Each frame it splats every influence's contribution onto `cell.targetSize` for cells inside its bounds, then runs a `compressField` (soft saturation curve) and optional neighborhood smoothing pass.
- `influences/Masks/*` — `TextMaskInfluence`, `ImageMaskInfluence` (rasterize text/image to a weight field), `MorphMaskInfluence` (interpolates between two mask weight fields), `MaskInfluence` (shared base).
- `internal/mask-state-machine.ts` + `internal/timeline-transition-mask.ts` — drive the declarative mask timeline (sequenced steps with hold/transition durations, `morph`/`fade`/`dissolve` transition modes), independent of React.
- `internal/mask-weight-cache.ts`, `interaction-coordinator.ts` (hover/magnetic-hover/ripple passes), `breathing-system.ts`, `effects/pipeline.ts` (post-effects: `paletteCycle`, `dissolve`, `shockwaveBurst`) — each is a standalone pure-ish function module composed by `update-pipeline.ts`'s `runPixelGridUpdatePipeline`.
- `render-pass.ts` — the actual draw loop: iterates all `PixelCell`s, applies render-alpha interpolation, does viewport culling and a naive same-color/opacity dedup before `fillRect`. This is the render hot path (see Performance notes).

Everything under `entities/pixel-grid/internal/` is explicitly private runtime detail, not public API (per README's Architecture section) — don't add new public exports there without updating `PixelGridEffect`'s facade surface instead.

### React layer (`packages/react/src`)

`usePixelEngine` owns `PixelEngine` construction/teardown (SSR-safe, guards on `window`). `usePixelGridEffect` builds on it to own a `PixelGridEffect` instance, and **recreates the effect whenever resolved `gridConfig` or `influenceOptions` change** (see `MIGRATION.md` v1.0.21) — `effectKey` is only needed for an explicit forced remount. `PixelGridCanvas`/`PixelCard`/`PixelSurface` are progressively higher-level wrappers; `presets.ts`/`grid-config.ts`/`theme-state-presets.ts` provide declarative preset/mask/theme-driven config resolution, and `pointer-bridge.ts` forwards pointer events from an interactive DOM overlay to canvas-space influences when `overlayPointerEvents="hybrid"`.

### Config resolution pattern

Nearly everything follows the same shape: a `*Options` (all-optional, user-facing) type is normalized by a `resolve*`/`normalize*` function into a `Resolved*` (all-required, internal) type, collecting `warnings: string[]` for anything invalid/ignored rather than throwing. When adding a new config option, follow this pattern rather than reading raw `config.foo` deep in runtime code.

`normalizeConfig.ts` (`resolvePixelGridConfig`, in `@pixel-engine/effects`) is the **single authority** for `PixelGridConfig` defaults, clamping, and validation (including mask id generation — `normalizeMaskCollections` is the only place ids are invented, `image-1`/`text-1`-style; plural array entries register before the singular prop, which is appended last). `PixelGridEffect`'s constructor always calls it, so this applies uniformly whether a consumer goes through React or constructs `PixelGridEffect` directly.

`@pixel-engine/react`'s `grid-config.ts` (`resolveGridConfigInput`) sits one layer above and does **not** re-derive those defaults — it only: merges `preset` → `gridConfig` → `mask` (via `presets.ts`'s `mergePixelOptions`, the package's one deep-merge implementation — `theme-state-presets.ts`'s `mergeGridConfigPartials` is a thin fold over it), guards the *required* scalars (`colors`/`gap`/`expandEase`/`breathSpeed`) against the *preset's* value (a fallback `normalizeConfig.ts` has no way to know about), and emits preset/mask-shape-specific warnings (e.g. `hero-image` without a mask). Its output is an unresolved `PixelGridConfig`, not a `Resolved*` — don't expect it to have applied clamps.

## Performance notes (relevant before optimizing)

- The render hot path is fully object-oriented (`PixelCell[]`, one heap object per grid cell, method calls per cell per frame) — not the typed-array buffer defined in `grid/PixelBuffer.ts`. Any performance refactor targeting allocation/cache behavior should look at `PixelCell`/`render-pass.ts`/`runtime-controller.ts`'s `cells` array, not the unused `PixelBuffer`.
- `InfluenceManager.apply` iterates influences and, per influence, iterates its full bounding-box of cells — cost scales with influence count × affected area, not total grid size, but there is no spatial index beyond the axis-aligned bounding box → column/row clamp.
- `render-pass.ts` dedups `fillStyle`/`globalAlpha` canvas state changes only between *consecutive* cells in array order; cells aren't sorted/batched by color, so in practice this rarely dedups more than a few neighbors.
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
- CI (`.github/workflows/ci.yml`) runs, in order: `Lint` → `test:ci` → `build:packages` → aggregate `build` → `typecheck` → `release:docs:check` → `release:pack:verify` → `smoke:consumer` → `test:visual`. Reproduce locally with `npm run verify` (covers the first five) plus `npm run test:visual` for the visual gate.
