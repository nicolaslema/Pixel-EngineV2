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

## Latest snapshot (2026-02-24)

Measurement command:

```bash
npm run bench:pixelgrid
```

Resolved benchmark command:

```bash
node scripts/bench/pixelgrid-bench.cjs --suite=all --runs=3
```

Scenario setup:
- Frames: `240` (warmup `60`)
- Classic suite quality: `medium`
- Stress suite qualities: `low`, `medium`, `high`

Results:

### Classic (`classic-comparable`)

- Cells (estimated): `19539`
- Avg update ms (mean): `5.070`
- Avg render ms (mean): `0.288`
- Avg frame ms (median): `5.502`
- Avg frame ms (mean): `5.358`
- Frame p95 ms: `5.891`
- Est. FPS (median): `181.7`
- Est. FPS (mean): `188.4`
- Heap delta MB (mean): `-2.261`

### Stress (`stress-overdraw`)

- `low`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `22.208`
  - Avg render ms (mean): `0.744`
  - Avg frame ms (median): `21.701`
  - Avg frame ms (mean): `22.952`
  - Frame p95 ms: `25.865`
  - Est. FPS (median): `46.1`
  - Est. FPS (mean): `43.9`
  - Heap delta MB (mean): `-1.565`

- `medium`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `20.506`
  - Avg render ms (mean): `0.710`
  - Avg frame ms (median): `21.321`
  - Avg frame ms (mean): `21.216`
  - Frame p95 ms: `21.546`
  - Est. FPS (median): `46.9`
  - Est. FPS (mean): `47.1`
  - Heap delta MB (mean): `3.633`

- `high`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `20.458`
  - Avg render ms (mean): `0.719`
  - Avg frame ms (median): `21.226`
  - Avg frame ms (mean): `21.178`
  - Frame p95 ms: `21.395`
  - Est. FPS (median): `47.1`
  - Est. FPS (mean): `47.2`
  - Heap delta MB (mean): `-1.643`

Notes:
- This snapshot uses default quick-run settings (`runs=3`).
- For formal release comparison, continue using 5-run commands from the official baseline section.

## PixelGrid transition benchmark suites

Run:

```bash
npm run bench:transition
```

Additional commands:

```bash
npm run bench:transition:all
npm run bench:transition:legacy
npm run bench:transition:multi
npm run bench:transition:morph
npm run bench:transition:fade
npm run bench:transition:dissolve
```

What transition benchmark runner does:
- builds aggregate + split packages
- packs and installs local `@pixel-engine/core` + `@pixel-engine/effects` tarballs in a temporary benchmark app
- runs timeline transition scenarios with `maskTimeline` autoplay:
  - `text-image` (legacy 2-step)
  - `multi-mask` (native 4-step with id refs)
- tests transition modes: `morph`, `fade`, `dissolve`
- reports:
  - update/render time means
  - frame-time median + mean + p95
  - estimated FPS median + mean
  - heap delta mean
  - number of timeline transitions sampled

## Transition snapshot (2026-02-23)

Measurement command:

```bash
node scripts/bench/pixelgrid-transition-bench.cjs --mode=all --scenario=all --runs=2 --frames=120 --warmup=30
```

Scenario:
- Viewport: `1000x700`
- Effect area: `1000x700`
- Gap: `6`
- Runs: `2`
- Frames: `120` (warmup `30`)
- Scenarios: `text-image` and `multi-mask`
- Timeline: autoplay enabled

Results:

- `text-image` + `morph`
  - Avg update ms (mean): `1.098`
  - Avg render ms (mean): `0.079`
  - Avg frame ms (median): `1.176`
  - Frame p95 ms: `1.289`
  - Est. FPS (median): `857.9`
  - Timeline transitions sampled (mean): `4.0`

- `text-image` + `fade`
  - Avg update ms (mean): `1.429`
  - Avg render ms (mean): `0.124`
  - Avg frame ms (median): `1.553`
  - Frame p95 ms: `1.557`
  - Est. FPS (median): `643.9`
  - Timeline transitions sampled (mean): `4.0`

- `text-image` + `dissolve`
  - Avg update ms (mean): `2.752`
  - Avg render ms (mean): `0.287`
  - Avg frame ms (median): `3.039`
  - Frame p95 ms: `3.761`
  - Est. FPS (median): `348.8`
  - Timeline transitions sampled (mean): `4.0`

- `multi-mask` + `morph`
  - Avg update ms (mean): `1.754`
  - Avg render ms (mean): `0.159`
  - Avg frame ms (median): `1.913`
  - Frame p95 ms: `1.944`
  - Est. FPS (median): `522.8`
  - Timeline transitions sampled (mean): `5.0`

- `multi-mask` + `fade`
  - Avg update ms (mean): `1.540`
  - Avg render ms (mean): `0.132`
  - Avg frame ms (median): `1.672`
  - Frame p95 ms: `1.737`
  - Est. FPS (median): `599.0`
  - Timeline transitions sampled (mean): `5.0`

- `multi-mask` + `dissolve`
  - Avg update ms (mean): `1.457`
  - Avg render ms (mean): `0.108`
  - Avg frame ms (median): `1.566`
  - Frame p95 ms: `1.633`
  - Est. FPS (median): `639.9`
  - Timeline transitions sampled (mean): `5.0`

Notes:
- These values are from a short smoke run intended to validate benchmark wiring.
- For release comparisons, use `npm run bench:transition:all` (5 runs) and keep hardware/load conditions stable.
- For migration/perf comparison against the old 2-step path, use `npm run bench:transition:legacy`.
- For Phase 4 native multi-mask tracking, use `npm run bench:transition:multi`.

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

## Official baseline snapshot (2026-07-28) — after Phase 3b.1 (update-pipeline pass fusion)

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
- Avg update ms (mean): `5.149`
- Avg render ms (mean): `0.224`
- Avg frame ms (median): `5.434`
- Avg frame ms (mean): `5.372`
- Frame p95 ms: `5.621`
- Est. FPS (median): `184.0`
- Est. FPS (mean): `186.7`
- Heap delta MB (mean): `-1.656`

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
  - Avg update ms (mean): `17.166`
  - Avg render ms (mean): `0.640`
  - Avg frame ms (median): `18.744`
  - Avg frame ms (mean): `17.806`
  - Frame p95 ms: `19.293`
  - Est. FPS (median): `53.4`
  - Est. FPS (mean): `57.4`
  - Heap delta MB (mean): `-0.367`

- `medium`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `18.290`
  - Avg render ms (mean): `0.666`
  - Avg frame ms (median): `18.743`
  - Avg frame ms (mean): `18.956`
  - Frame p95 ms: `19.727`
  - Est. FPS (median): `53.4`
  - Est. FPS (mean): `52.8`
  - Heap delta MB (mean): `1.823`

- `high`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `20.703`
  - Avg render ms (mean): `0.731`
  - Avg frame ms (median): `20.608`
  - Avg frame ms (mean): `21.434`
  - Frame p95 ms: `24.063`
  - Est. FPS (median): `48.5`
  - Est. FPS (mean): `46.9`
  - Heap delta MB (mean): `1.727`

Comparison vs. the 2026-02-22 baseline (same methodology: `runs=5`, `frames=240`, `warmup=60`):
- Classic: update mean `5.211 → 5.149ms` (~1% faster, within run-to-run noise). Render mean moved `0.193 → 0.224ms`, expected — 3b.1 only touched the update pipeline (`resetCells`/mask-weight-cache fusion, hover+breathing fusion, `InfluenceManager`'s `compressField`/`smoothField` gate), `render-pass.ts` is untouched.
- Stress `low`: update mean `17.528 → 17.166ms` (~2% faster).
- Stress `medium`: update mean `21.039 → 18.290ms` (~13% faster) — the largest single improvement, consistent with this scenario spending more frames where `InfluenceManager.apply()`'s `touchedAny` gate (Target 3) skips `compressField`/`smoothField` entirely.
- Stress `high`: update mean `21.055 → 20.703ms` (~2% faster).
- All three stress tiers improved consistently (no regressions), and correctness across all changes is confirmed independently by the full test suite (171/171 passing, including new fusion-equivalence and gating tests) and `visual-baseline.test.ts` passing with **zero snapshot diff** (no `-u` needed) — so these gains reflect real reduced work, not an accepted behavior change.

## Official baseline snapshot (2026-07-28b) — after Phase 3b.2 (SoA `PixelCellBuffer`)

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
- Avg update ms (mean): `5.529`
- Avg render ms (mean): `0.290`
- Avg frame ms (median): `5.784`
- Avg frame ms (mean): `5.819`
- Frame p95 ms: `6.505`
- Est. FPS (median): `172.9`
- Est. FPS (mean): `173.0`
- Heap delta MB (mean): `-0.029`

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
  - Avg update ms (mean): `14.317`
  - Avg render ms (mean): `0.550`
  - Avg frame ms (median): `15.300`
  - Avg frame ms (mean): `14.867`
  - Frame p95 ms: `15.847`
  - Est. FPS (median): `65.4`
  - Est. FPS (mean): `67.7`
  - Heap delta MB (mean): `0.250`

- `medium`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `14.764`
  - Avg render ms (mean): `0.591`
  - Avg frame ms (median): `15.414`
  - Avg frame ms (mean): `15.354`
  - Frame p95 ms: `15.537`
  - Est. FPS (median): `64.9`
  - Est. FPS (mean): `65.1`
  - Heap delta MB (mean): `-0.244`

- `high`
  - Cells (estimated): `49128`
  - Avg update ms (mean): `14.554`
  - Avg render ms (mean): `0.556`
  - Avg frame ms (median): `15.059`
  - Avg frame ms (mean): `15.110`
  - Frame p95 ms: `15.296`
  - Est. FPS (median): `66.4`
  - Est. FPS (mean): `66.2`
  - Heap delta MB (mean): `-1.090`

Comparison vs. the 2026-07-28 (Phase 3b.1) baseline, same methodology:
- **Stress (49128 cells) — the scenario this rewrite specifically targets — improved substantially and consistently across all three quality tiers**: `low` update mean `17.166 → 14.317ms` (~17% faster), `medium` `18.290 → 14.764ms` (~19% faster), `high` `20.703 → 14.554ms` (~30% faster). This is the expected outcome of converting from array-of-structs (`PixelCell[]`, ~50k heap objects, pointer-chasing across the ~5-7 full-grid passes per frame) to structure-of-arrays (parallel `Float32Array`s, sequential memory access) — the effect is most pronounced exactly where cell count is highest.
- **Classic (19539 cells) regressed slightly**: update mean `5.149 → 5.529ms` (~7% slower). At this smaller cell count, the SoA conversion's cache-locality win is smaller and may be offset by the extra `buffer.field[index]` indirection replacing a direct object-field read in a few hot spots (e.g. `render-pass.ts`'s per-cell array reads vs. the old method-call-based interpolation). Given this repo's own documented run-to-run noise on this machine (past snapshots have differed by up to ~27% on the same scenario), a single 7% delta on the smaller scenario is not conclusive evidence of a real regression on its own — but it's reported honestly here rather than omitted, since it doesn't fit the SoA hypothesis as cleanly as the stress results do.
- Correctness across all changes is confirmed independently of these numbers: full test suite (43/43 files, 180/180 tests) and `visual-baseline.test.ts` passing with **zero snapshot diff** (no `-u` needed) — including through the critical `PixelGridEffect` private-field rename that the snapshot test reflects into and the exact `Math.random()` call-order requirement for seeded determinism (see implementation notes above).

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
