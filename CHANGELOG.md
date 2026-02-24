# Changelog

All notable changes to this project are documented in this file.

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
