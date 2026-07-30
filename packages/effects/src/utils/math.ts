export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(
  edge0: number,
  edge1: number,
  x: number
) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// --- Deterministic 2D noise primitives ---
//
// No Math.random() anywhere here: the Perlin permutation table is built once, at module
// load, by a pure seeded PRNG (mulberry32) fed a fixed constant -- output is bit-identical
// across runs/installs/machines, same guarantee a hand-transcribed reference table would
// give, without the transcription-error risk of a 256-entry magic array. A future `seed`
// config option (roadmap item 3.4) can reuse this exact mechanism with a caller-provided
// seed instead of PERLIN_TABLE_SEED.

const PERLIN_TABLE_SEED = 0x9e3779b9;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPerlinPermutationTable(seed: number): Uint8Array {
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;

  const random = mulberry32(seed);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }

  // Doubled to 512 so lattice-corner lookups (up to index 255+1+255) never need a modulo.
  const table = new Uint8Array(512);
  for (let i = 0; i < 512; i++) table[i] = base[i & 255];
  return table;
}

const PERLIN_PERM = buildPerlinPermutationTable(PERLIN_TABLE_SEED);

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -2 * v : 2 * v);
}

/** Raw 2D Perlin gradient noise, unnormalized (~[-1, 1]). Not exported -- turbulenceNoise2D
 * sums several octaves of this before normalizing once, so each octave must stay raw. */
function perlinRawNoise2D(x: number, y: number): number {
  const flooredX = Math.floor(x);
  const flooredY = Math.floor(y);
  const X = flooredX & 255;
  const Y = flooredY & 255;
  const xf = x - flooredX;
  const yf = y - flooredY;

  const u = fade(xf);
  const v = fade(yf);

  const a = PERLIN_PERM[X] + Y;
  const aa = PERLIN_PERM[a];
  const ab = PERLIN_PERM[a + 1];
  const b = PERLIN_PERM[X + 1] + Y;
  const ba = PERLIN_PERM[b];
  const bb = PERLIN_PERM[b + 1];

  return lerp(
    v,
    lerp(u, grad(PERLIN_PERM[aa], xf, yf), grad(PERLIN_PERM[ba], xf - 1, yf)),
    lerp(u, grad(PERLIN_PERM[ab], xf, yf - 1), grad(PERLIN_PERM[bb], xf - 1, yf - 1))
  );
}

/** Classic 2D Perlin gradient noise, normalized to [0, 1]. */
export function perlinNoise2D(x: number, y: number): number {
  return 0.5 + 0.5 * clamp(perlinRawNoise2D(x, y), -1, 1);
}

function hash2D(ix: number, iy: number, offset: number): number {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + offset) * 43758.5453;
  return s - Math.floor(s);
}

/** Worley/cellular F1 noise, normalized to [0, 1] (distance to the nearest of 9 jittered
 * per-cell feature points, divided by the exact max possible F1 distance for unit jitter,
 * Math.SQRT2). Uses two decorrelated hash calls per feature point (different phase offsets)
 * -- reusing one hash for both x/y jitter would put every feature point on its cell's
 * diagonal, a classic Worley-noise porting bug. */
export function cellularNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);

  let minDistance = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cy = iy + dy;
      const fx = cx + hash2D(cx, cy, 0);
      const fy = cy + hash2D(cx, cy, 91.7);
      const ddx = fx - x;
      const ddy = fy - y;
      const distance = Math.sqrt(ddx * ddx + ddy * ddy);
      if (distance < minDistance) minDistance = distance;
    }
  }

  return clamp(minDistance / Math.SQRT2, 0, 1);
}

const TURBULENCE_OCTAVES = 4;

/** FBM (fractal Brownian motion) over perlinRawNoise2D: sums `octaves` layers at doubling
 * frequency / halving amplitude, normalized to [0, 1]. */
export function turbulenceNoise2D(
  x: number,
  y: number,
  octaves: number = TURBULENCE_OCTAVES
): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let amplitudeSum = 0;

  for (let i = 0; i < octaves; i++) {
    sum += amplitude * perlinRawNoise2D(x * frequency, y * frequency);
    amplitudeSum += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return 0.5 + 0.5 * clamp(sum / amplitudeSum, -1, 1);
}
