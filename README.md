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

### Responsive canvas

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

### Framework setup

Same package, same props, in the 3 most common React setups.

**Next.js (App Router)**

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

**Vite**

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

**Create React App**

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

In every case, remember to import image assets as bundler URLs (`import catUrl from "./cat.png"`), not `"/src/..."` runtime paths -- see the Asset path note in `API.md`.

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

## React Usage by Complexity

### Easy

```tsx
<PixelGridCanvas width={900} height={520} preset="card-soft" />
```

### Medium

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

### Advanced

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

For complete prop/hook option tables, go to `API.md`.

## React Surface Components

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

## Package Split

- `@pixel-engine/core`: engine lifecycle, loop, scene, renderers, input.
- `@pixel-engine/effects`: `PixelGridEffect`, masks, influences, timeline runtime.
- `@pixel-engine/react`: hooks/components/helpers for declarative integration.

## Documentation Map

- Public API and examples: `API.md`
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
