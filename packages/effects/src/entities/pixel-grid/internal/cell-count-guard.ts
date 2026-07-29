export interface GuardedGridDimensions {
  gap: number;
  columns: number;
  rows: number;
  clamped: boolean;
  warnings: string[];
}

/**
 * Item 1.1 safety net: nothing upstream (normalizeConfig.ts can't -- it never sees
 * width/height) limits columns*rows. This is the single place width, height, and the
 * already-sanitized gap are jointly known, so it's the only place this check can live.
 * If the estimated cell count for the requested gap exceeds maxCells, the *effective* gap
 * (not the caller's config.gap -- callers must never write this back onto shared config
 * objects) is increased just enough to bring the actual (ceil-rounded) cell count back
 * under the cap, and a warning is returned for the caller to surface. Pure function --
 * never mutates its inputs, so repeated calls (e.g. across resize()) always re-derive
 * fresh from the original requested gap and current width/height, never compounding.
 */
export function resolveGuardedGridDimensions(
  width: number,
  height: number,
  gap: number,
  maxCells: number
): GuardedGridDimensions {
  const initialColumns = Math.ceil(width / gap);
  const initialRows = Math.ceil(height / gap);
  const estimatedCells = initialColumns * initialRows;

  if (estimatedCells <= maxCells) {
    return { gap, columns: initialColumns, rows: initialRows, clamped: false, warnings: [] };
  }

  // Scale gap by sqrt(estimatedCells / maxCells) so the *continuous* cell density
  // (width*height / gap^2) drops to maxCells. ceil() rounding on columns/rows means the
  // actual discrete cell count can still land a hair over maxCells for extreme aspect
  // ratios, so re-check and nudge up by small fixed steps (bounded iterations -- this runs
  // once per construct/resize, never per frame) rather than solving the discrete ceil()
  // equation exactly, which isn't worth the complexity for a safety-net clamp.
  let adjustedGap = gap * Math.sqrt(estimatedCells / maxCells);
  let columns = Math.ceil(width / adjustedGap);
  let rows = Math.ceil(height / adjustedGap);

  for (let i = 0; i < 8 && columns * rows > maxCells; i++) {
    adjustedGap *= 1.05;
    columns = Math.ceil(width / adjustedGap);
    rows = Math.ceil(height / adjustedGap);
  }

  return {
    gap: adjustedGap,
    columns,
    rows,
    clamped: true,
    warnings: [
      `Estimated cell count (${estimatedCells} = ${initialColumns}x${initialRows} at gap=${gap}) exceeds the ` +
      `performance safety cap of ${maxCells} cells for the current performance.detail tier. Increasing the ` +
      `effective gap to ${adjustedGap.toFixed(2)} (${columns}x${rows} = ${columns * rows} cells) to avoid ` +
      `excessive per-frame update cost. Pass a larger "gap" explicitly, reduce the canvas size, or raise ` +
      `performance.detail if you need a denser grid than this tier allows.`
    ]
  };
}
