/**
 * Internal, non-exported deep-clone/deep-merge primitives shared by
 * presets.ts (mergePixelOptions) and theme-state-presets.ts
 * (mergeGridConfigPartials / static preset cloning). Not part of the
 * public API — do not re-export from index.ts.
 */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively clones plain objects/arrays so results never share
 * object/array references with the input (avoids mutating shared
 * singletons like preset/theme constants).
 */
export function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const cloned: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      cloned[key] = deepClone(value[key]);
    }
    return cloned as T;
  }
  return value;
}

/**
 * Generic recursive config merge: plain objects are merged key-by-key,
 * arrays/primitives in `override` replace `base` wholesale, `undefined`
 * override values are treated as "no override" (base wins). Always
 * returns a fresh, fully-cloned object.
 */
export function deepMergeConfig<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>
): T {
  const result: Record<string, unknown> = deepClone(base) as Record<string, unknown>;
  for (const key of Object.keys(override)) {
    const overrideValue = (override as Record<string, unknown>)[key];
    if (overrideValue === undefined) continue;

    const baseValue = result[key];
    result[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? deepMergeConfig(baseValue, overrideValue as Record<string, unknown>)
        : deepClone(overrideValue);
  }
  return result as T;
}
