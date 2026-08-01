<p align="center">
  <img src="./PixelEngine-Thumbnail2.png" alt="Pixel Engine Thumbnail" width="980" />
</p>

# Pixel Engine

High-performance 2D pixel simulation engine for browser apps and modern UI frameworks.

Pixel Engine gives you a production-ready runtime (`@pixel-engine/core`), a powerful effect layer (`@pixel-engine/effects`), and a React integration package (`@pixel-engine/react`) to build interactive pixel surfaces fast.

## Why Pixel Engine

- Fast interactive pixel rendering with fixed-step runtime semantics.
- Flexible masks (text/image/hybrid) with timeline sequencing.
- Rich interactions: hover, ripple, magnetic hover, breathing, dissolve, shockwave, palette cycle.
- React-first DX with declarative components and hooks.
- Package split ready for scalable library use.

## Install

Recommended split packages:

```bash
npm install @pixel-engine/core @pixel-engine/effects @pixel-engine/react
```

Compatibility aggregate package:

```bash
npm install pixel-engine
```

**Not yet published to npm.** These packages aren't on the public npm registry yet — the commands above describe the intended install once they are. Until then, see "Local Usage (Before Publishing)" below for how to consume this repo from another project today.

## Local Usage (Before Publishing)

The fastest way to use this in another project right now is `npm pack` + installing the generated tarballs directly — no publishing, no registry required.

### 1. Build and pack

From this repo's root:

```bash
npm run build:packages
npm pack --pack-destination ./dist-packs -w @pixel-engine/core
npm pack --pack-destination ./dist-packs -w @pixel-engine/effects
npm pack --pack-destination ./dist-packs -w @pixel-engine/react
```

This produces `./dist-packs/pixel-engine-core-1.0.0.tgz`, `pixel-engine-effects-1.0.0.tgz`, and `pixel-engine-react-1.0.0.tgz` (version number matches whatever `package.json` currently has).

### 2. Install all three tarballs together, in one command

In the consumer project:

```bash
npm install react react-dom \
  /path/to/pixel-engine-core-1.0.0.tgz \
  /path/to/pixel-engine-effects-1.0.0.tgz \
  /path/to/pixel-engine-react-1.0.0.tgz
```

**Install all three in a single `npm install` command, not one at a time.** `@pixel-engine/react`'s `package.json` declares `@pixel-engine/core`/`@pixel-engine/effects` as regular `dependencies` — if you install only the React tarball by itself, npm falls back to resolving those two from the public npm registry instead of using your local build. That fallback isn't just a dead end either: `@pixel-engine/core` (and the unscoped `pixel-engine` name) are already registered on npm by unrelated third parties, so npm would silently install the wrong package instead of erroring. Listing all the tarballs explicitly in one `npm install` call avoids this — npm resolves the internal `@pixel-engine/*` dependency links from what you gave it, not the registry.

Only using the vanilla `@pixel-engine/core`/`@pixel-engine/effects` API (no React)? Drop the `react react-dom` and the React tarball from the command above.

### 3. Re-sync after making changes

This is a snapshot, not a live link — after changing source in this repo, repeat steps 1-2 (rebuild, repack, reinstall) to pick up the changes in the consumer project. For faster iteration on a single machine, `npm link` or a `file:` dependency in the consumer's `package.json` are lower-friction alternatives worth considering, at the cost of being a less exact match for what a real npm install would look like.

## Quick Start (React)

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

`@pixel-engine/react` ships a `"use client"` directive on its bundle — every component/hook in it is client-only (canvas, refs, effects), so it's safe to import directly in a Next.js App Router Server Component tree without wrapping it yourself.

For framework setup (Next.js/Vite/CRA), the responsive-canvas footgun, the full prop/hook reference, a cookbook of common use cases, and troubleshooting, see the dedicated **[`@pixel-engine/react` guide](packages/react/README.md)**.

## Quick Start (Vanilla)

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

For the full React usage ladder (easy/medium/advanced), the complete component/hook reference, and overlay behavior notes, see the **[`@pixel-engine/react` guide](packages/react/README.md)**.

## Package Split

- `@pixel-engine/core`: engine lifecycle, loop, scene, renderers, input.
- `@pixel-engine/effects`: `PixelGridEffect`, masks, influences, timeline runtime.
- `@pixel-engine/react`: hooks/components/helpers for declarative integration.

## Documentation Map

- Full `@pixel-engine/react` guide (setup, concepts, reference, cookbook, troubleshooting): `packages/react/README.md`
- Vanilla `core`/`effects` API and examples: `API.md`
- Migration notes: `MIGRATION.md`
- Release notes: `CHANGELOG.md`
- Benchmarks: `BENCHMARKS.md`
- Release workflow: `RELEASE.md`
- Release checklist: `RELEASE_CHECKLIST.md`

## Architecture

- `core`: engine lifecycle, loop, timing.
- `scene`: entity update/render traversal.
- `renderers`: abstraction + Canvas2D implementation.
- `influences`: reusable influence primitives.
- `entities`: high-level effects (`PixelGridEffect`).
- `entities/pixel-grid/internal`: private runtime modules (not public API).

## Development Scripts

- `npm run dev`: run the vanilla playground (`@pixel-engine/core`/`effects`) with Vite.
- `npm run dev:react`: run the React playground (`@pixel-engine/react` components/hooks) with Vite — manual QA surface for `PixelGridCanvas`/`PixelCard`/presets/hover/ripple/breathing.
- `npm run test`: run Vitest.
- `npm run test:coverage`: run Vitest with coverage (`@vitest/coverage-v8`, report in `coverage/`).
- `npm run lint`: ESLint checks.
- `npm run format`: apply Prettier formatting.
- `npm run typecheck`: TypeScript checks (`tsc --noEmit`).
- `npm run build`: build aggregate package.
- `npm run build:packages`: build `@pixel-engine/core`, `@pixel-engine/effects`, `@pixel-engine/react`.
- `npm run build:all`: build packages + aggregate.
- `npm run verify`: lint + tests + build + typecheck.
- `npm run bench:pixelgrid`: PixelGrid benchmark suite.
- `npm run release:check`: full pre-release verification.

## Runtime Notes

- Fixed timestep loop with tunable runtime profile.
- `PixelGridEffect` supports `resize(width, height)`.
- React wrappers recreate effect instances automatically when resolved `gridConfig` or `influenceOptions` changes.
- Use `effectKey` only when you need an explicit remount/reset boundary.

## Project Status

- Stable API baseline for core runtime + `PixelGridEffect`.
- v1.1 Phase 1 to Phase 10 completed.
- Current focus: v1.2 planning backlog and next feature set.

## License

MIT
