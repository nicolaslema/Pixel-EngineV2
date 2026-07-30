import { InfluenceManager } from "../../../influences/InfluenceManager";
import { MaskInfluence } from "../../../influences/Masks/MaskInfluence";
import { InitialMask, ResolvedPixelGridConfig } from "../types";
import { createMaskRegistry, RuntimeMaskRegistryEntry } from "./mask-registry";
import { TimelineTransitionMaskInfluence } from "./timeline-transition-mask";
type TimelinePhase = "hold" | "transition";

export interface MaskStateMachine {
  imageMask: MaskInfluence | null;
  textMask: MaskInfluence | null;
  morphMask: MaskInfluence | null;
  update(delta: number): void;
  play(): void;
  pause(): void;
  reset(): void;
  isPlaying(): boolean;
  getCurrentStepIndex(): number;
}

interface CreateMaskStateMachineParams {
  influenceManager: InfluenceManager;
  maskTimeline: ResolvedPixelGridConfig["maskTimeline"];
  initialMask: InitialMask;
  imageMasks: RuntimeMaskRegistryEntry[];
  textMasks: RuntimeMaskRegistryEntry[];
}

export function createMaskStateMachine(
  params: CreateMaskStateMachineParams
): MaskStateMachine {
  const { influenceManager } = params;
  const registry = createMaskRegistry({
    imageMasks: params.imageMasks,
    textMasks: params.textMasks
  });

  let imageMask: MaskInfluence | null = null;
  let textMask: MaskInfluence | null = null;
  let morphMask: MaskInfluence | null = null;
  let phase: TimelinePhase = "hold";
  let currentMask: RuntimeMaskRegistryEntry | null = null;
  let transitionTargetMask: RuntimeMaskRegistryEntry | null = null;
  let transitionTargetStepIndex = -1;
  let currentStepIndex = -1;
  let stateTimer = 0;
  let playing = false;

  const setActiveTypeMasks = (...entries: Array<RuntimeMaskRegistryEntry | null>) => {
    imageMask = null;
    textMask = null;

    for (const entry of entries) {
      if (!entry) continue;
      if (entry.type === "image" && imageMask === null) {
        imageMask = entry.influence;
      } else if (entry.type === "text" && textMask === null) {
        textMask = entry.influence;
      }
    }
  };

  const removeAllMaskInfluences = () => {
    for (const entry of registry.getAll()) {
      influenceManager.remove(entry.influence);
    }
    if (morphMask) {
      influenceManager.remove(morphMask);
      releaseMorphResources(morphMask);
    }
    setActiveTypeMasks();
  };

  const setActiveMasks = (masks: RuntimeMaskRegistryEntry[]) => {
    for (const entry of registry.getAll()) {
      influenceManager.remove(entry.influence);
    }

    for (const mask of masks) {
      influenceManager.add(mask.influence);
      resetMaskRevealIfSupported(mask.influence);
    }

    setActiveTypeMasks(...masks);
  };

  const getCurrentStepTransition = () => {
    if (currentStepIndex < 0) return null;
    return params.maskTimeline.steps[currentStepIndex]?.transition ?? null;
  };

  const getNextStepIndex = (): number | null => {
    if (params.maskTimeline.steps.length === 0) return null;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < params.maskTimeline.steps.length) {
      return nextIndex;
    }
    if (!params.maskTimeline.loop) return null;
    return 0;
  };

  const resolveMaskForStep = (stepIndex: number): RuntimeMaskRegistryEntry | null => {
    const step = params.maskTimeline.steps[stepIndex];
    if (!step) return null;
    const entry = registry.resolve(step.maskRef, step.mask);
    // Per-mask blendMode override only applies within a combo step's masks[]; a singular
    // step always resets to "max" so an earlier combo activation's override never leaks in.
    if (entry) entry.influence.blendMode = "max";
    return entry;
  };

  const isComboStep = (stepIndex: number): boolean =>
    (params.maskTimeline.steps[stepIndex]?.maskRefs?.length ?? 0) > 0;

  /**
   * Resolves every mask active for a step: a normal step resolves to at most one entry
   * (via resolveMaskForStep); a combo step (`maskRefs` non-empty, see
   * MaskTimelineStepOptions.masks) resolves to up to one image + one text entry
   * simultaneously.
   */
  const resolveMasksForStep = (stepIndex: number): RuntimeMaskRegistryEntry[] => {
    const step = params.maskTimeline.steps[stepIndex];
    if (!step) return [];

    if (step.maskRefs && step.maskRefs.length > 0) {
      const resolved: RuntimeMaskRegistryEntry[] = [];
      for (const ref of step.maskRefs) {
        const entry = registry.resolve(ref, ref.type);
        if (entry) {
          entry.influence.blendMode = ref.blendMode ?? "max";
          resolved.push(entry);
        }
      }
      return resolved;
    }

    const single = resolveMaskForStep(stepIndex);
    return single ? [single] : [];
  };

  const finalizeTransition = () => {
    if (morphMask) {
      influenceManager.remove(morphMask);
      releaseMorphResources(morphMask);
    }
    morphMask = null;

    currentMask = transitionTargetMask;
    currentStepIndex = transitionTargetStepIndex;
    setActiveMasks(currentMask ? [currentMask] : []);
    phase = "hold";
    transitionTargetMask = null;
    transitionTargetStepIndex = -1;
    stateTimer = 0;
  };

  const startTransitionToStep = (nextStepIndex: number) => {
    const nextStep = params.maskTimeline.steps[nextStepIndex];
    if (!nextStep) {
      playing = false;
      return;
    }

    const resolvedMasks = resolveMasksForStep(nextStepIndex);

    // Combo steps (either the one we're leaving or the one we're entering) always
    // hard-cut -- no morph/fade/dissolve support for simultaneous multi-mask activation.
    // This must be checked first, before the currentMask===null/same-id/no-transition
    // fallbacks below, since those compare against currentMask (only ever the *primary*
    // of a possibly-2-mask combo) and could otherwise spuriously match and silently drop
    // the secondary mask without any fade.
    const leavingCombo = currentStepIndex >= 0 && isComboStep(currentStepIndex);
    if (isComboStep(nextStepIndex) || leavingCombo || resolvedMasks.length !== 1) {
      currentStepIndex = nextStepIndex;
      stateTimer = 0;
      currentMask = resolvedMasks[0] ?? null;
      setActiveMasks(resolvedMasks);
      return;
    }

    const nextMask = resolvedMasks[0];

    if (currentMask === null) {
      currentMask = nextMask;
      currentStepIndex = nextStepIndex;
      setActiveMasks([currentMask]);
      stateTimer = 0;
      return;
    }

    if (nextMask.id === currentMask.id) {
      currentMask = nextMask;
      currentStepIndex = nextStepIndex;
      setActiveMasks([currentMask]);
      stateTimer = 0;
      return;
    }

    const fromMask = currentMask.influence;
    const toMask = nextMask.influence;
    const transition = getCurrentStepTransition();

    if (!fromMask || !toMask || !transition) {
      currentMask = nextMask;
      currentStepIndex = nextStepIndex;
      setActiveMasks([currentMask]);
      stateTimer = 0;
      return;
    }

    for (const entry of registry.getAll()) {
      influenceManager.remove(entry.influence);
    }

    morphMask = new TimelineTransitionMaskInfluence(
      fromMask,
      toMask,
      transition.durationMs,
      transition.mode,
      transition.seed
    );
    influenceManager.add(morphMask);
    phase = "transition";
    transitionTargetMask = nextMask;
    transitionTargetStepIndex = nextStepIndex;
    setActiveTypeMasks(currentMask, nextMask);
    stateTimer = 0;
  };

  const reset = () => {
    removeAllMaskInfluences();

    phase = "hold";
    transitionTargetMask = null;
    transitionTargetStepIndex = -1;
    stateTimer = 0;
    currentStepIndex = -1;
    currentMask = null;
    morphMask = null;

    if (params.maskTimeline.enabled && params.maskTimeline.steps.length > 0) {
      currentStepIndex = params.maskTimeline.initialStep;
      let initialMasks = resolveMasksForStep(currentStepIndex);
      if (initialMasks.length === 0) {
        const fallback = registry.resolve(null, params.initialMask);
        if (fallback) fallback.influence.blendMode = "max";
        initialMasks = fallback ? [fallback] : [];
      }
      currentMask = initialMasks[0] ?? null;
      setActiveMasks(initialMasks);
      playing = params.maskTimeline.autoplay;
      return;
    }

    const fallback = registry.resolve(null, params.initialMask);
    if (fallback) fallback.influence.blendMode = "max";
    currentMask = fallback;
    setActiveMasks(fallback ? [fallback] : []);
    playing = false;
  };

  const play = () => {
    if (!params.maskTimeline.enabled) return;
    if (params.maskTimeline.steps.length === 0) return;
    playing = true;
  };

  const pause = () => {
    playing = false;
  };

  const update = (delta: number) => {
    if (!params.maskTimeline.enabled) return;
    if (!playing) return;
    if (params.maskTimeline.steps.length === 0) return;

    if (phase === "transition") {
      if (morphMask && !morphMask.isAlive()) {
        finalizeTransition();
      }
      return;
    }

    stateTimer += delta;
    const holdMs = params.maskTimeline.steps[currentStepIndex]?.holdMs ?? 0;
    if (stateTimer < holdMs) return;

    const nextStepIndex = getNextStepIndex();
    if (nextStepIndex === null) {
      playing = false;
      return;
    }

    startTransitionToStep(nextStepIndex);
  };

  reset();

  return {
    get imageMask() {
      return imageMask;
    },
    get textMask() {
      return textMask;
    },
    get morphMask() {
      return morphMask;
    },
    update,
    play,
    pause,
    reset,
    isPlaying() {
      return playing;
    },
    getCurrentStepIndex() {
      return currentStepIndex;
    }
  };
}

function releaseMorphResources(mask: MaskInfluence): void {
  if ("releaseResources" in mask) {
    const releasable = mask as unknown as { releaseResources?: () => void };
    releasable.releaseResources?.();
  }
}

function resetMaskRevealIfSupported(mask: MaskInfluence): void {
  if ("resetReveal" in mask) {
    const resettable = mask as unknown as { resetReveal?: () => void };
    resettable.resetReveal?.();
  }
}
