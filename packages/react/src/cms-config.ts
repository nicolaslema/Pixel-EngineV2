import {
  CmsPixelConfigDocumentV1,
  CmsPixelConfigValidationResult,
  PixelGridMaskInput,
  PixelGridPresetName,
  StatePresetName
} from "./types";
import { deepMergeConfig } from "./internal/deep-merge-config";

const SUPPORTED_SCHEMA_VERSION = "1.0";
const PRESETS = new Set<PixelGridPresetName>(["minimal", "card-soft", "card-ripple", "hero-image"]);
const STATE_PRESETS = new Set<StatePresetName>([
  "idle",
  "hover",
  "active",
  "success",
  "error",
  "loading"
]);
const ROOT_KEYS = new Set<keyof CmsPixelConfigDocumentV1>([
  "schemaVersion",
  "preset",
  "gridConfig",
  "mask",
  "scrollReactive",
  "sectionTransition",
  "themeSync",
  "statePreset",
  "debugHud",
  "ssrPlaceholder"
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isMaskInput(value: unknown, errors: string[]): value is PixelGridMaskInput {
  if (!isPlainObject(value)) {
    errors.push("mask must be an object.");
    return false;
  }
  if (typeof value.type !== "string") {
    errors.push("mask.type must be a string.");
    return false;
  }
  if (value.type === "text") {
    if (typeof value.text !== "string") {
      errors.push("mask(type=text).text must be a string.");
      return false;
    }
    return true;
  }
  if (value.type === "image") {
    if (typeof value.src !== "string") {
      errors.push("mask(type=image).src must be a string.");
      return false;
    }
    return true;
  }
  if (value.type === "hybrid") {
    return true;
  }
  errors.push("mask.type must be one of: text, image, hybrid.");
  return false;
}

function deepMergeFallback(
  fallback: CmsPixelConfigDocumentV1 | undefined,
  value: CmsPixelConfigDocumentV1
): CmsPixelConfigDocumentV1 {
  if (!fallback) return value;
  return deepMergeConfig(
    fallback as unknown as Record<string, unknown>,
    value as unknown as Record<string, unknown>
  ) as unknown as CmsPixelConfigDocumentV1;
}

export function validatePixelConfigDocument(input: unknown): CmsPixelConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: ["Document must be a plain JSON object."],
      warnings
    };
  }

  for (const key of Object.keys(input)) {
    if (!ROOT_KEYS.has(key as keyof CmsPixelConfigDocumentV1)) {
      warnings.push(`Unknown root key "${key}" will be ignored.`);
    }
  }

  const value: CmsPixelConfigDocumentV1 = {};

  const schemaVersion = input.schemaVersion;
  if (typeof schemaVersion !== "undefined") {
    if (schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
      errors.push(
        `Unsupported schemaVersion "${String(schemaVersion)}". Supported: "${SUPPORTED_SCHEMA_VERSION}".`
      );
    } else {
      value.schemaVersion = schemaVersion;
    }
  } else {
    value.schemaVersion = SUPPORTED_SCHEMA_VERSION;
  }

  if (typeof input.preset !== "undefined") {
    if (typeof input.preset !== "string" || !PRESETS.has(input.preset as PixelGridPresetName)) {
      errors.push("preset must be one of: minimal, card-soft, card-ripple, hero-image.");
    } else {
      value.preset = input.preset as PixelGridPresetName;
    }
  }

  if (typeof input.gridConfig !== "undefined") {
    if (!isPlainObject(input.gridConfig)) {
      errors.push("gridConfig must be an object.");
    } else {
      value.gridConfig = input.gridConfig;
    }
  }

  if (typeof input.mask !== "undefined") {
    if (isMaskInput(input.mask, errors)) {
      value.mask = input.mask;
    }
  }

  const objectOnlyKeys: Array<keyof Omit<CmsPixelConfigDocumentV1, "schemaVersion" | "preset" | "mask" | "statePreset">> = [
    "scrollReactive",
    "sectionTransition",
    "themeSync",
    "debugHud"
  ];
  for (const key of objectOnlyKeys) {
    const candidate = input[key as string];
    if (typeof candidate === "undefined") continue;
    if (!isPlainObject(candidate)) {
      errors.push(`${key} must be an object.`);
      continue;
    }
    (value as Record<string, unknown>)[key] = candidate;
  }

  if (typeof input.statePreset !== "undefined") {
    const candidate = input.statePreset;
    if (typeof candidate === "string") {
      if (!STATE_PRESETS.has(candidate as StatePresetName)) {
        errors.push("statePreset string must be one of: idle, hover, active, success, error, loading.");
      } else {
        value.statePreset = candidate as StatePresetName;
      }
    } else if (isPlainObject(candidate)) {
      const next = { ...candidate };
      if (typeof next.value !== "undefined") {
        if (typeof next.value !== "string" || !STATE_PRESETS.has(next.value as StatePresetName)) {
          errors.push("statePreset.value must be one of: idle, hover, active, success, error, loading.");
        }
      }
      value.statePreset = next as CmsPixelConfigDocumentV1["statePreset"];
    } else {
      errors.push("statePreset must be a string or object.");
    }
  }

  if (typeof input.ssrPlaceholder !== "undefined") {
    const candidate = input.ssrPlaceholder;
    if (typeof candidate === "string") {
      if (!["minimal", "card-soft", "hero-image"].includes(candidate)) {
        errors.push("ssrPlaceholder preset must be one of: minimal, card-soft, hero-image.");
      } else {
        value.ssrPlaceholder = candidate as CmsPixelConfigDocumentV1["ssrPlaceholder"];
      }
    } else if (isPlainObject(candidate)) {
      value.ssrPlaceholder = candidate as CmsPixelConfigDocumentV1["ssrPlaceholder"];
    } else {
      errors.push("ssrPlaceholder must be a preset string or object.");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    value: errors.length === 0 ? value : undefined
  };
}

export function loadPixelConfigFromJson(
  json: string,
  fallback?: CmsPixelConfigDocumentV1
): CmsPixelConfigValidationResult {
  try {
    const parsed = JSON.parse(json) as unknown;
    const validated = validatePixelConfigDocument(parsed);
    if (!validated.ok || !validated.value) return validated;

    const merged = deepMergeFallback(fallback, validated.value);
    return validatePixelConfigDocument(merged);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [`Invalid JSON: ${message}`],
      warnings: []
    };
  }
}
