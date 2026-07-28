# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Internal
- Removed the manually-mirrored root `src/{core,input,scene,renderers,grid,utils,entities,influences}` copy of `packages/core/src` / `packages/effects/src`. `packages/*/src` is now the only source location; root `src/` contains only the aggregate re-export (`src/index.ts`) and playground assets.
- All unit tests moved from root `src/**/*.test.ts` into their matching `packages/{core,effects}/src/**` locations (colocated with the source they test).
- Removed `scripts/release/check-package-parity.mjs` and the `parity:check` script/CI step, which existed solely to keep the now-removed mirror in sync.
- `npm run build:all` now builds workspace packages before the aggregate package (`build:packages && build`), matching publish order.
- Added ESLint (flat config) + Prettier tooling (`npm run lint`, `npm run format`) and a CI `Lint` step.
- Added a React manual-QA playground (`playground/react/`, entry `react.html`, `npm run dev:react`), alongside the existing vanilla playground: a **Configurator** tab (live control panel — sliders/selects/color pickers/file upload — driving `PixelGridCanvas`'s `gridConfig`/`mask`/`influenceOptions` around a central visualizer) and a **Card in a website** tab (a mock landing page using `PixelCard` as a decorative background behind real overlay content, to exercise that specific usage pattern, including `overlayPointerEvents="hybrid"`). Resolves `@pixel-engine/*` against package source via the same Vite alias as tests, not a packed build — for interactive/visual QA, not a packaging-correctness check (that remains `npm run smoke:consumer`).
- Set `compilerOptions.jsx: "react-jsx"` in the root `tsconfig.json`. Without it, Vite/esbuild fell back to the classic JSX transform for anything under `playground/` (the only `.tsx` consumers outside `packages/react`, which sets its own `jsx` option), which requires `React` in scope for every JSX-using file and silently produced a blank page (uncaught `ReferenceError: React is not defined` before the app tree could mount) — surfaced by trying the new React playground in a real browser.
- No public API changes; `@pixel-engine/core`, `@pixel-engine/effects`, `@pixel-engine/react`, and the aggregate `pixel-engine` package are unaffected. No consumer migration steps required.

### Changed
- **Breaking:** `PixelGridConfig.performance.quality` renamed to `performance.detail` (type `PixelGridQualityLevel` renamed to `PixelGridDetailLevel`), to remove the naming collision with the unrelated engine-level `PixelEngineOptions.quality`. See `MIGRATION.md`.
- `@pixel-engine/effects`' `resolvePixelGridConfig` (`normalizeConfig.ts`) is now the single authority for `PixelGridConfig` defaults/validation:
  - `@pixel-engine/react`'s `resolveGridConfigInput` no longer re-derives `hoverEffects`/`rippleEffects`/`breathing` defaults (previously duplicated, byte-for-byte, in both layers).
  - The `breathing.minOpacity > maxOpacity` swap-guard now applies unconditionally (previously only when going through the React layer; direct/vanilla `PixelGridEffect` construction had no protection).
  - Added a safety net for the required scalars (`colors`, `gap`, `expandEase`, `breathSpeed`): invalid values now fall back to safe defaults with a warning instead of silently producing a broken grid, for consumers constructing `PixelGridEffect` directly.
  - Removed the runtime-only legacy `hoverEffects.radiusY`/`hoverEffects.shape` detection warnings (dead since v1.0.20; see `MIGRATION.md`).
- Consolidated the two independent deep-merge implementations (`mergePixelOptions`, `mergeGridConfigPartials`) into one generic recursive merge, used by both (public signatures unchanged). Fixes a bug where `mergePixelOptions` only shallow-replaced (instead of merging) the `performance`/`effects` config blocks, and a latent risk of merge results sharing object/array references with preset singletons.
- Fixed a bug where a hybrid mask's auto-derived default timeline (`mask.texts`/`mask.images` without explicit `items`/`steps`) could silently end up fully disabled when more than one unlabeled mask of the same type was provided, due to the same mask being registered twice under the same id. Auto-derivation now references masks by id (`maskTimeline.steps`) instead of redeclaring them (`maskTimeline.items`).

### Performance
- Pixel-grid update pipeline: eliminated a per-cell allocation on the reactive-hover path; fused the reactive-hover and magnetic-hover passes into one full-grid loop (which now also skips entirely when the pointer is outside the canvas, instead of looping the full grid to no-op); stopped reallocating the update pipeline's callback closures every frame (was ~7 allocations/frame, now 0).
- Fused the per-frame cell reset and mask-weight-cache recompute into a single loop; fused the hover and breathing passes into one loop whenever no ripple is active (falls back to the previous unfused sequence while a ripple is active, since ripple can change state breathing's gate needs to see). `InfluenceManager` now skips its saturation/smoothing passes entirely on frames where no influence actually wrote anything, instead of running them unconditionally.
- Rewrote pixel-grid cell storage from an array of `PixelCell` objects (array-of-structs) to `PixelCellBuffer`, a structure-of-arrays layout (parallel typed arrays, no per-cell heap objects). Update time in the stress benchmark (~49k cells) improved 17-30% depending on quality tier; no measurable change in the classic benchmark (~19.5k cells) once run-to-run noise is accounted for. See `BENCHMARKS.md` for full numbers and methodology.

### Removed
- **Breaking:** `@pixel-engine/effects` no longer exports `PixelCell`. Replaced internally by `PixelCellBuffer` (not exported — internal runtime detail, same as everything else under `entities/pixel-grid/internal/`). `PixelCell` had zero known consumers outside the package itself. See `MIGRATION.md`.
- **Breaking:** `@pixel-engine/core` no longer exports `GridBuilder`, `PixelBuffer`, or `BufferUtils`. This was dead code: an alternate typed-array grid data structure that was never wired into `PixelGridEffect` or any other runtime path, exercised only by its own unit tests. See `MIGRATION.md`.

### Docs
- `API.md`: documented mask id resolution order (plural array first, singular appended last); updated for the `performance.detail` rename.
- `CLAUDE.md`: updated the effects-layer architecture and performance-notes sections to describe `PixelCellBuffer`/structure-of-arrays instead of the removed `PixelCell`/array-of-structs design and the removed dead `grid/` module.

## [1.0.21] - 2026-02-24

### Changed
- React grid lifecycle behavior in `@pixel-engine/react`:
  - `usePixelGridEffect` / `PixelGridCanvas` now recreate the effect when resolved `gridConfig` or `influenceOptions` changes.
  - `effectKey` remains available as an additional explicit remount/reset boundary.
- React scroll-reactive utility hardening:
  - `useScrollReactiveGrid` now listens to both `scroll` and `wheel`.
  - Added configurable `scrollReactive.source` support (`auto`, `window`, `HTMLElement`, `RefObject`).
  - Delta processing now uses queued `pendingDeltaY` + `requestAnimationFrame` flush to improve consecutive gesture handling.

### Docs
- React documentation was reorganized for readability and completeness:
  - `README.md` now includes `easy`, `medium`, and `advanced` React usage paths.
  - Added React options reference tables covering hook/component options and web utility options.
  - Updated lifecycle notes to reflect current `effectKey` semantics.
- Phase 10 docs were formally closed and synchronized:
  - `docs/Version.1.1/issues/phase-10-web-product-utilities.md`
  - `docs/Version.1.1/ROADMAP.md`
  - `docs/Version.1.1/INDEX.md`
  - closure includes manual validation in playground + external React project.

## [1.0.20] - 2026-02-24

### Added
- Phase 10 PR-10A web product utilities in `@pixel-engine/react`:
  - `scrollReactive` support in `PixelGridCanvas` (intensity + direction + edge + cooldown + burst cap).
  - `sectionTransition` support in `PixelGridCanvas` (`fade` / `lift` / `zoom` presets).
  - new hooks:
    - `useScrollReactiveGrid`
    - `useSectionTransitionPreset`
- Phase 10 PR-10B web product utilities in `@pixel-engine/react`:
  - `themeSync` support (`light` / `dark` / `brand` with optional system-follow mode).
  - `statePreset` support (`idle`, `hover`, `active`, `success`, `error`, `loading`).
  - new exports/helpers:
    - `useResolvedThemeMode`
    - `resolveThemeSyncGridOverride`
    - `resolveStatePresetGridOverride`
    - `mergeGridConfigPartials`
- Phase 10 PR-10C web product utilities in `@pixel-engine/react`:
  - `debugHud` support in `PixelGridCanvas` (runtime stats overlay for fps/quality/loop/cells/ripples/timeline).
  - `ssrPlaceholder` support in `PixelGridCanvas` (`minimal` / `card-soft` / `hero-image` fallback presets).
  - new exports/helpers:
    - `useDebugHudOverlay`
    - `resolveSsrPlaceholderCanvasStyle`
- Phase 10 PR-10D web product utilities in `@pixel-engine/react`:
  - CMS-friendly JSON loader/validator:
    - `validatePixelConfigDocument(input)`
    - `loadPixelConfigFromJson(json, fallback?)`
  - End-to-end docs/examples for CMS-driven website integration patterns.
- Added public debug runtime API in `PixelGridEffect`:
  - `getDebugSnapshot()`

### Updated
- `PixelGridCanvas` now composes section transition styles with user-provided `style`.
- `PixelCard` grid-mode detection now includes Phase 10 utility props (`scrollReactive`, `sectionTransition`, `themeSync`, `statePreset`).
- `PixelCard` grid-mode detection now also includes `debugHud` and `ssrPlaceholder`.
- Phase 10 issue/roadmap tracking updated with PR-10A, PR-10B, PR-10C, and PR-10D completion.

## [1.0.19] - 2026-02-24

### Changed
- Hover API simplified:
  - removed `hoverEffects.radiusY`
  - removed hover `shape` variants from public hover config (circle-only)
- Added `hoverEffects.magnetic` with:
  - `enabled`
  - `mode: "attract" | "repel"`
  - `strength`
  - `radius`
- Reactive/classic hover runtime now supports dedicated magnetic pass.

### Updated
- Playground hover controls now include magnetic parameters and use single hover radius.
- Playground left side now uses a single scrollable panel for `Effects / Runtime / I/O`.
- Magnetic hover strength playground control max increased from `8` to `24`.
- Phase 9 docs/issue tracking synchronized with hover simplification + magnetic mode.
- Phase 9 formally closed with PR-9D optional items deferred.

## [1.0.18] - 2026-02-24

### Added
- Phase 9 PR-9B effect pack additions:
  - `effects.dissolve`
  - `effects.shockwaveBurst`
- New internal effect modules (root + package mirrors):
  - `pixel-dissolve-effect`
  - `shockwave-burst-effect`
- Playground `Effects` panel controls for:
  - `dissolve` (enabled/speed/amount/scope/threshold)
  - `shockwaveBurst` (enabled/speed/strength/thickness/maxBursts/triggerMode/threshold)

### Changed
- `PixelGrid` effect pipeline now supports ordered stacking:
  - `dissolve` -> `shockwaveBurst` -> `paletteCycle`

## [1.0.17] - 2026-02-24

### Changed
- `PixelGrid` effects API simplified:
  - removed `effects.trail`
  - retained `effects.paletteCycle` as the only built-in post effect in v1.1 baseline
- Playground `Effects` panel now only exposes `paletteCycle` controls.

### Removed
- Removed trail runtime modules from root and package mirrors:
  - `src/entities/pixel-grid/internal/effects/trail-afterimage-effect.ts`
  - `packages/effects/src/entities/pixel-grid/internal/effects/trail-afterimage-effect.ts`

## [1.0.16] - 2026-02-24

### Added
- Completed v1.1 Phase 8 pre-effects robustness hardening:
  - PR-8A: native `PixelGridEffect.resize(width, height)` and React grid/effect resize sync.
  - PR-8B: pointer-first input path + entity lifecycle hooks (`onAdd`, `onRemove`, `onDestroy`).
  - PR-8C: explicit engine loop tuning via `PixelEngineOptions.loop`.
- New engine runtime inspection helpers:
  - `engine.getQuality()`
  - `engine.getLoopTuning()`
- New tests for:
  - loop update cap behavior (`maxUpdatesPerFrame`)
  - runtime tuning defaults/overrides
  - pointer/fallback input behavior
  - scene/entity lifecycle hooks

### Changed
- `PixelEngineOptions.quality` now has explicit scheduling semantics (runtime loop profile defaults).
- `GameLoop` now supports configurable `maxUpdatesPerFrame`.
- `PixelCanvas` and `PixelGridCanvas` no longer force `width/height: 100%` at base component level.

### Removed
- Dormant `PerformanceMonitor` module from core runtime surface (was not wired in engine path).

## [1.0.15] - 2026-02-22

### Added
- Started v1.1 Phase 2 runtime/performance work:
  - advanced playground runtime control panel (preset switcher, parameter inspector, timeline preview, config JSON IO, runtime stats)
- Added `PixelGrid` performance config support:
  - `performance.quality` (`low` | `medium` | `high`)
  - `performance.viewportCulling`
  - `performance.cullingPadding`
  - `performance.minRenderableSize`
- Added render-pass test coverage for:
  - minimum renderable size threshold
  - viewport culling behavior

### Changed
- `PixelGridEffect` now applies viewport culling at render-time when size context is available from engine.
- Ripple cap is now quality-aware via resolved performance tier limits.
- Hot-path improvements:
  - `InfluenceManager` now early-returns when no influences are active.
  - `PixelGridEffect` update pipeline callback references are now reused (reduced per-frame closure allocation).
- Benchmark runner now reports quality-tier snapshots under a larger-than-viewport scenario.
- Benchmark runner now supports realistic split suites and stable metrics:
  - `classic` (comparable baseline) and `stress` (heavy overdraw) modes
  - multi-run execution with median/mean/p95 frame metrics
  - dedicated scripts: `bench:pixelgrid:classic`, `bench:pixelgrid:stress`, `bench:pixelgrid:all`

## [1.0.14] - 2026-02-22

### Added
- Completed v1.1 Phase 1:
  - PR-1A: internal `PixelGridEffect` decoupling modules
  - PR-1B: React hybrid overlay interaction mode
- New React pointer bridge utility:
  - `packages/react/src/pointer-bridge.ts`
- New React tests for hybrid overlay mode:
  - `packages/react/src/PixelSurface.test.tsx`
  - extended `packages/react/src/PixelCard.test.tsx`

### Changed
- `PixelSurface` and `PixelCard` now support:
  - `overlayPointerEvents="hybrid"`
- `PixelGridEffect` update responsibilities are now cleaner via extracted coordinators:
  - `mask-weight-cache`
  - `interaction-coordinator`

## [1.0.13] - 2026-02-21

### Added
- Completed Phase F PR-F3 release automation baseline.
- Added release scripts:
  - `release:docs:prepare`
  - `release:docs:check`
  - `release:pack:verify`
- Added `RELEASE_CHECKLIST.md` as formal publish runbook.

### Changed
- `release:check` now enforces:
  - release docs validation
  - generated tarball verification
  - existing quality/build/smoke checks
- CI quality gates now include:
  - `npm run release:docs:check`
  - `npm run release:pack:verify`

## [1.0.12] - 2026-02-21

### Added
- Completed Phase F PR-F2:
  - CI consumer smoke validation step (`npm run smoke:consumer`).
  - deterministic visual baseline test (`npm run test:visual`).
- Added `PixelGrid` visual snapshot suite:
  - `src/entities/pixel-grid/visual-baseline.test.ts`
  - snapshot baseline file for regression comparisons.

### Changed
- `scripts/smoke-consumer.mjs` now validates `@pixel-engine/react` package consumption in addition to:
  - `pixel-engine`
  - `@pixel-engine/core`
  - `@pixel-engine/effects`
- CI workflow now executes:
  - consumer smoke test
  - visual baseline regression test

## [1.0.11] - 2026-02-21

### Added
- Started Phase F with PR-F1 quality-gates baseline.
- Added GitHub Actions CI workflow: `.github/workflows/ci.yml`.
- Added `test:ci` script (`vitest run`) for deterministic CI test execution.

### Changed
- CI now enforces mandatory checks on PRs/push:
  - `npm run test:ci`
  - `npm run build`
  - `npm run typecheck`
  - `npm run build:packages`
- Vitest monorepo package resolution hardened via root Vite aliases for:
  - `@pixel-engine/core`
  - `@pixel-engine/effects`
  - `@pixel-engine/react`

## [1.0.10] - 2026-02-21

### Added
- Completed PR-E3 for Phase E documentation matrix and compatibility guidance.
- Added preset matrix and component capability matrix in docs.
- Added React compatibility notes for:
  - SSR behavior
  - asset URL handling
  - overlay pointer-event layering
  - `effectKey` remount strategy

### Changed
- React documentation reorganized for progressive adoption:
  - simple usage
  - simple config
  - advanced config
  - custom config with helpers
- Phase E status now marked completed in docs.

## [1.0.9] - 2026-02-21

### Added
- Completed PR-E2 for Phase E preset tuning and validation hardening.
- New preset catalog helper APIs:
  - `listPixelPresets()`
  - `getPixelPresetDefinition(name)`
- Preset metadata (description, recommended use, mask support guidance).

### Changed
- `resolveGridConfigInput` now validates and sanitizes nested config values:
  - clamps invalid ranges (`deactivate`, opacities, etc.)
  - enforces positive/non-negative numeric constraints
  - normalizes ripple limits (`maxRipples >= 1`)
- Added context warnings for preset usage (e.g. `hero-image` without image mask).
- React docs updated with clearer preset catalog guidance.

### Tests
- Extended config-helper tests to cover:
  - preset metadata API
  - hero-image warning path
  - nested value sanitization/clamping behavior

## [1.0.8] - 2026-02-21

### Added
- Started Phase E with PR-E1 foundation for declarative authoring in `@pixel-engine/react`.
- Preset system:
  - `minimal`
  - `card-soft`
  - `card-ripple`
  - `hero-image`
- Declarative mask API:
  - `mask.type = "text" | "image" | "hybrid"`
  - helper export `createMaskConfig(mask)`
- New helper exports:
  - `createPixelPreset(name, overrides?)`
  - `mergePixelOptions(base, override)`
  - `resolveGridConfigInput(...)`

### Changed
- `usePixelGridEffect` now supports `preset` + `mask` and can run without explicit `gridConfig`.
- `PixelCard` grid-mode detection now supports preset-driven usage (no `gridConfig` required).
- Added development-time validation warnings with safe fallback defaults for invalid config values.

### Tests
- Added coverage for preset/mask normalization and fallback behavior.
- Added coverage for preset-only `usePixelGridEffect` and preset-driven `PixelCard` mode.

## [1.0.7] - 2026-02-21

### Added
- Documentation examples expanded for React integration:
  - `PixelCanvas`
  - `PixelGridCanvas`
  - `PixelSurface`
- External React consumer validation documented (Vite + TypeScript, local package install, positive result).

### Changed
- `PixelCard` and `PixelSurface` overlay behavior:
  - default `overlayPointerEvents` is now `none` to avoid blocking hover/ripple interactions on canvas.
  - can be overridden with `overlayPointerEvents=\"auto\"` when overlay UI must be interactive.

## [1.0.6] - 2026-02-21

### Added
- Completed PR-D3 for Phase D React product layer.
- `PixelCard` now supports declarative grid mode through `gridConfig` (5-15 line integration path).
- React DX hardening for declarative grid:
  - new `effectKey` option in `usePixelGridEffect` / `PixelGridCanvas`.
- New tests for:
  - `PixelCard` engine/grid modes
  - `usePixelGridEffect` recreation behavior controlled by `effectKey`

### Changed
- React docs/examples updated with final Phase D copy-paste usage (`PixelCard`, `PixelGridCanvas`, callbacks).
- Local roadmap/issue tracking updated to mark Phase D completed.

## [1.0.5] - 2026-02-21

### Added
- Completed PR-D2 for Phase D React product layer.
- New declarative React integration:
  - `usePixelGridEffect`
  - `PixelGridCanvas`
- New high-level callbacks in React layer:
  - `onHoverStart`
  - `onHoverEnd`
  - `onRipple`
- Initial React tests for declarative grid integration and interaction callbacks.

### Changed
- React docs and migration guidance updated to include PR-D2 APIs.
- Roadmap and local issue templates synchronized to mark PR-D2 completed and PR-D3 as next step.

## [1.0.4] - 2026-02-21

### Added
- Started Phase D (React product layer) with PR-D1.
- New workspace package `@pixel-engine/react` with:
  - `usePixelEngine` SSR-safe lifecycle hook (init, resize, cleanup).
  - `PixelCanvas`, `PixelSurface`, and `PixelCard` components.
  - Initial React unit tests for hook/components.

### Changed
- Root workspace scripts now include React package build/pack:
  - `build:packages` includes `@pixel-engine/react`
  - `pack:dry` includes `@pixel-engine/react`
- Release workflow updated to publish in order:
  - `@pixel-engine/core` -> `@pixel-engine/effects` -> `@pixel-engine/react` -> `pixel-engine`.
- Roadmap and phase issue tracking updated to mark PR-D1 as completed and Phase D as in progress.

## [1.0.3] - 2026-02-21

### Changed
- Completed Phase B API contract cleanup:
  - aggregate package (`pixel-engine`) now re-exports from `@pixel-engine/core` and `@pixel-engine/effects`.
  - removed legacy/unused type files under `src/types/*`.
  - removed empty placeholders:
    - `src/effects/PixelEffect.ts`
    - `src/grid/SpatialHash.ts`
    - `packages/core/src/grid/SpatialHash.ts`
- Completed Phase C runtime optimization and maintainability pass:
  - `InfluenceManager` smoothing now reuses a persistent buffer (no per-frame smoothing allocation).
  - `PixelGridEffect` mask cache recomputation is now conditional (only when needed by runtime features).
  - `PixelGridEffect` internals were further modularized with extracted update/render/influence setup runtime modules.
- Added reproducible benchmark flow:
  - `npm run bench:pixelgrid`
  - baseline + post-refactor snapshots documented in `BENCHMARKS.md`.

## [1.0.2] - 2026-02-21

### Added
- External consumer smoke test script (`scripts/smoke-consumer.mjs`) that:
  - packs local tarballs
  - installs them in a temporary app
  - validates real imports for `pixel-engine`, `@pixel-engine/core`, and `@pixel-engine/effects`
- Release workflow documentation in `RELEASE.md`.

### Changed
- Completed Phase A package decoupling:
  - `packages/core` and `packages/effects` now export from local package sources (no root `src` re-exports).
  - `@pixel-engine/effects` imports runtime contracts from `@pixel-engine/core`.
- Publish metadata hardened in root/core/effects package manifests.
- `release:check` now runs:
  - verify (test + build + typecheck)
  - pack dry-runs
  - external consumer smoke test
- `@pixel-engine/effects` dependency on `@pixel-engine/core` switched from workspace protocol to semver (`^1.0.0`) for publish-safe installs.

## [1.0.1] - 2026-02-20

### Added
- `canvasBackground?: string | null` in `PixelGridConfig` to control canvas clear color from `PixelGridEffect`.
- `PixelGridEffect#setCanvasBackground(color: string | null)` for runtime background updates.
- Transparent clear support (`null` or `"transparent"`) in Canvas2D renderer clear path.
- Tests for renderer clear behavior and `PixelEngine` clear-color runtime updates.

### Changed
- Playground background controls were simplified:
  - canvas background is now controlled only by `PixelGridEffect` config/runtime API
  - playground UI keeps only page background control for transparency testing
- Documentation updated (`README.md`, `API.md`, `MIGRATION.md`) to reflect effect-driven canvas background flow.

## [1.0.0] - 2026-02-20

### Added
- Formal v1 stable baseline for `PixelEngine` + `PixelGridEffect`.
- Strict `PixelGridConfig` API centered on:
  - `hoverEffects`
  - `rippleEffects`
  - `breathing`
  - `imageMask` / `textMask`
  - `autoMorph`
- Internal modularization of PixelGrid runtime:
  - `entities/pixel-grid/internal/runtime-state`
  - `entities/pixel-grid/internal/mask-state-machine`
  - `entities/pixel-grid/internal/reactive-effects`
  - `entities/pixel-grid/internal/breathing-system`
- Workspace package split:
  - `@pixel-engine/core`
  - `@pixel-engine/effects`
- Extended test coverage for internal systems and runtime paths.

### Changed
- `PixelGridEffect` now supports running with no masks (`imageMask` and `textMask` optional).
- Better fault tolerance in mask influences:
  - defensive guards around `getImageData`
  - safe handling for empty text masks
  - safe behavior for failed image loads
- Performance improvements:
  - fewer allocations in `InfluenceManager` removal paths
  - per-frame mask weight cache usage in reactive/breathing paths
  - in-place compaction for active ripples

### Removed
- Legacy/implicit config compatibility paths were removed from the stable surface:
  - old top-level hover/ripple fields
  - legacy reactive alias fields

### Notes
- `pixel-engine` package remains available as compatibility aggregate entrypoint.
- New scoped packages provide clearer boundaries for production integration.
