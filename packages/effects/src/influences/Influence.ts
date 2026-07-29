export type BlendMode =
  | "max"
  | "add"
  | "multiply"
  | "override";

export interface Influence {
  priority: number;
  blendMode: BlendMode;

  update(delta: number): void;   // ← IMPORTANTE
  isAlive(): boolean;

  getBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };

  getInfluence(
    x: number,
    y: number,
    maxSize: number
  ): number;

  /**
   * Optional per-row narrowing hook for influences whose getInfluence() is nonzero only
   * across a small fraction of their getBounds() bounding box (e.g. RippleInfluence's thin
   * ring, whose square AABB grows to the full canvas while the actual ring stays thin).
   * Callers that would otherwise scan the full bbox column range for every row can call
   * this once per row instead, to learn the actual x-interval(s) worth scanning.
   *
   * Contract:
   * - `y` is a world-space row coordinate (same space as getInfluence's `y` parameter and
   *   getBounds()'s minY/maxY).
   * - Writes up to two [minX, maxX] pairs into `out` (first pair: out[0]/out[1], second
   *   pair if any: out[2]/out[3]) and returns the number of pairs written: 0, 1, or 2.
   *   `out` must have length >= 4.
   * - MUST be a safe superset: every x where getInfluence(x, y, maxSize) > 0 must fall
   *   inside one of the returned intervals for that y. It's fine for an interval to be
   *   slightly wider than the true nonzero region; it must never be narrower.
   * - Returning 0 means "this row has no nonzero influence anywhere" -- safe to skip.
   * - The two intervals (when 2 are returned) must not overlap.
   */
  getRowRange?(y: number, out: Float64Array): number;
}
