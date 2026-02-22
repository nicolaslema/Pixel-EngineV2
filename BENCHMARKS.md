# Benchmarks

This file tracks reproducible baseline benchmarks for runtime-critical paths.

## PixelGrid benchmark suites

Run:

```bash
npm run bench:pixelgrid
```

Additional commands:

```bash
npm run bench:pixelgrid:classic
npm run bench:pixelgrid:stress
npm run bench:pixelgrid:all
```

What benchmark runner does:
- builds aggregate + split packages
- packs and installs local `@pixel-engine/core` + `@pixel-engine/effects` tarballs in a temporary benchmark app
- runs synthetic PixelGrid scenarios from installed packages
- reports:
  - update/render time means
  - frame-time median + mean + p95
  - estimated FPS median + mean
  - heap delta mean

## Suites

### `classic` (comparable baseline)

- Viewport: `1000x700`
- Effect area: `1000x700`
- Gap: `6`
- Quality modes: `medium`
- Goal: track regressions against historical baseline values.

### `stress` (realistic heavy workload)

- Viewport: `1000x700`
- Effect area: `1600x1100` (overdraw/offscreen cells)
- Gap: `6`
- Quality modes: `low`, `medium`, `high`
- Goal: validate behavior under larger-than-viewport effect surfaces.

## Reading results correctly

- Compare only same suite + same quality + same runs/frames settings.
- Use `median frame ms` and `median FPS` as primary signal.
- Use `p95 frame ms` to detect spikes/jitter.
- Use `mean update ms` to track simulation cost and `mean render ms` for draw cost.

Notes:
- This is a comparative baseline, not an absolute cross-machine performance score.
- CPU scheduling and garbage collection can move single-run results noticeably.
- Prefer at least 5 runs for release-level comparisons.

## Official baseline snapshot (2026-02-22)

Measurement command set:

```bash
node scripts/bench/pixelgrid-bench.cjs --suite=classic --runs=5 --frames=240 --warmup=60
node scripts/bench/pixelgrid-bench.cjs --suite=stress --runs=5 --frames=240 --warmup=60
```

### Classic (`classic-comparable`)

Scenario:
- Viewport: `1000x700`
- Effect area: `1000x700`
- Gap: `6`
- Runs: `5`
- Frames: `240` (warmup `60`)
- Quality: `medium`

Result:
- Cells (estimated): `19539`
- Avg update ms (mean): `5.211`
- Avg render ms (mean): `0.193`
- Avg frame ms (median): `5.478`
- Avg frame ms (mean): `5.403`
- Frame p95 ms: `6.397`
- Est. FPS (median): `182.6`
- Est. FPS (mean): `188.2`
- Heap delta MB (mean): `1.223`

### Stress (`stress-overdraw`)

Scenario:
- Viewport: `1000x700`
- Effect area: `1600x1100`
- Gap: `6`
- Runs: `5`
- Frames: `240` (warmup `60`)
- Qualities: `low`, `medium`, `high`

Results:

- `low`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `17.528`
  - Avg render ms (mean): `0.504`
  - Avg frame ms (median): `18.165`
  - Avg frame ms (mean): `18.032`
  - Frame p95 ms: `21.315`
  - Est. FPS (median): `55.1`
  - Est. FPS (mean): `57.4`
  - Heap delta MB (mean): `-1.322`

- `medium`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `21.039`
  - Avg render ms (mean): `0.631`
  - Avg frame ms (median): `21.466`
  - Avg frame ms (mean): `21.670`
  - Frame p95 ms: `23.095`
  - Est. FPS (median): `46.6`
  - Est. FPS (mean): `46.2`
  - Heap delta MB (mean): `-1.569`

- `high`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `21.055`
  - Avg render ms (mean): `0.619`
  - Avg frame ms (median): `22.197`
  - Avg frame ms (mean): `21.674`
  - Frame p95 ms: `23.101`
  - Est. FPS (median): `45.1`
  - Est. FPS (mean): `46.3`
  - Heap delta MB (mean): `-1.662`

## Snapshot template (copy/paste)

Use this structure for future updates:

```text
## Official baseline snapshot (YYYY-MM-DD)

Measurement command set:
- node scripts/bench/pixelgrid-bench.cjs --suite=classic --runs=5 --frames=240 --warmup=60
- node scripts/bench/pixelgrid-bench.cjs --suite=stress --runs=5 --frames=240 --warmup=60

### Classic (`classic-comparable`)
Scenario:
- Viewport: `...`
- Effect area: `...`
- Gap: `...`
- Runs: `...`
- Frames: `...` (warmup `...`)
- Quality: `medium`

Result:
- Cells (estimated): `...`
- Avg update ms (mean): `...`
- Avg render ms (mean): `...`
- Avg frame ms (median): `...`
- Avg frame ms (mean): `...`
- Frame p95 ms: `...`
- Est. FPS (median): `...`
- Est. FPS (mean): `...`
- Heap delta MB (mean): `...`

### Stress (`stress-overdraw`)
Scenario:
- Viewport: `...`
- Effect area: `...`
- Gap: `...`
- Runs: `...`
- Frames: `...` (warmup `...`)
- Qualities: `low`, `medium`, `high`

Results:
- `low`: ...
- `medium`: ...
- `high`: ...
```

## Historical snapshots (legacy)

Legacy values kept for reference. These are not directly comparable across different suites.

## Baseline Snapshot (2026-02-21)

Scenario:
- Grid: `1000x700`
- Gap: `6`
- Estimated cells: `19539`
- Sampled frames: `240` (plus warmup)

Result:
- Avg update ms: `4.301`
- Avg render ms: `0.122`
- Avg frame ms: `4.422`
- Estimated FPS: `226.1`
- Heap delta MB: `1.304`

## Snapshot After PR-C3 (2026-02-21)

Result:
- Avg update ms: `4.258`
- Avg render ms: `0.121`
- Avg frame ms: `4.380`
- Estimated FPS: `228.3`
- Heap delta MB: `1.667`

Comparison vs baseline:
- Update: `-0.043 ms`
- Render: `-0.001 ms`
- Frame: `-0.042 ms`
- FPS: `+2.2`

## Snapshot After PR-2B (2026-02-22)

Scenario update:
- Effect area: `1600x1100` (off-viewport cells included)
- Viewport: `1000x700`
- Gap: `6`
- Estimated cells: `49128`
- Sampled frames: `240` (plus warmup)
- Culling + quality-tier runtime enabled

Result by quality tier:

- `low`
  - Avg update ms: `13.461`
  - Avg render ms: `0.417`
  - Avg frame ms: `13.878`
  - Estimated FPS: `72.1`
  - Heap delta MB: `-1.209`

- `medium`
  - Avg update ms: `20.034`
  - Avg render ms: `0.568`
  - Avg frame ms: `20.603`
  - Estimated FPS: `48.5`
  - Heap delta MB: `-1.577`

- `high`
  - Avg update ms: `17.958`
  - Avg render ms: `0.522`
  - Avg frame ms: `18.480`
  - Estimated FPS: `54.1`
  - Heap delta MB: `-1.611`

Notes:
- This snapshot is intended to compare quality-tier behavior under heavy overdraw conditions.
- `low` tier is expected to trade visual detail for throughput.
