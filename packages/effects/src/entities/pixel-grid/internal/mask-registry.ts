import { MaskInfluence } from "../../../influences/Masks/MaskInfluence";
import { InitialMask, ResolvedMaskRef } from "../types";

export interface RuntimeMaskRegistryEntry {
  id: string;
  type: InitialMask;
  influence: MaskInfluence;
}

export interface CreateMaskRegistryParams {
  imageMasks: RuntimeMaskRegistryEntry[];
  textMasks: RuntimeMaskRegistryEntry[];
}

export interface MaskRegistry {
  getById(id: string): RuntimeMaskRegistryEntry | null;
  getFirstByType(type: InitialMask): RuntimeMaskRegistryEntry | null;
  resolve(ref: ResolvedMaskRef | null, fallbackType?: InitialMask): RuntimeMaskRegistryEntry | null;
  getAll(): RuntimeMaskRegistryEntry[];
  hasAny(): boolean;
}

export function createMaskRegistry(params: CreateMaskRegistryParams): MaskRegistry {
  const all = [...params.imageMasks, ...params.textMasks];
  const byId = new Map<string, RuntimeMaskRegistryEntry>();
  const byType: Record<InitialMask, RuntimeMaskRegistryEntry[]> = {
    image: [],
    text: []
  };

  for (const entry of all) {
    if (byId.has(entry.id)) {
      continue;
    }
    byId.set(entry.id, entry);
    byType[entry.type].push(entry);
  }

  const getById = (id: string): RuntimeMaskRegistryEntry | null => byId.get(id) ?? null;

  const getFirstByType = (type: InitialMask): RuntimeMaskRegistryEntry | null =>
    byType[type][0] ?? null;

  const resolve = (
    ref: ResolvedMaskRef | null,
    fallbackType?: InitialMask
  ): RuntimeMaskRegistryEntry | null => {
    if (ref) {
      const byRef = getById(ref.id);
      if (byRef) return byRef;
    }

    if (fallbackType === "image") {
      return getFirstByType("image") ?? getFirstByType("text");
    }

    if (fallbackType === "text") {
      return getFirstByType("text") ?? getFirstByType("image");
    }

    return getFirstByType("image") ?? getFirstByType("text");
  };

  return {
    getById,
    getFirstByType,
    resolve,
    getAll: () => all,
    hasAny: () => all.length > 0
  };
}
