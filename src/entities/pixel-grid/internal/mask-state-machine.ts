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

  const setActiveStaticMask = (mask: RuntimeMaskRegistryEntry | null) => {
    for (const entry of registry.getAll()) {
      influenceManager.remove(entry.influence);
    }

    if (mask) {
      influenceManager.add(mask.influence);
    }

    setActiveTypeMasks(mask);
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
    return registry.resolve(step.maskRef, step.mask);
  };

  const finalizeTransition = () => {
    if (morphMask) {
      influenceManager.remove(morphMask);
      releaseMorphResources(morphMask);
    }
    morphMask = null;

    currentMask = transitionTargetMask;
    currentStepIndex = transitionTargetStepIndex;
    setActiveStaticMask(currentMask);
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

    const nextMask = resolveMaskForStep(nextStepIndex);
    if (!nextMask) {
      currentStepIndex = nextStepIndex;
      stateTimer = 0;
      currentMask = null;
      setActiveStaticMask(null);
      return;
    }

    if (currentMask === null) {
      currentMask = nextMask;
      currentStepIndex = nextStepIndex;
      setActiveStaticMask(currentMask);
      stateTimer = 0;
      return;
    }

    if (nextMask.id === currentMask.id) {
      currentMask = nextMask;
      currentStepIndex = nextStepIndex;
      setActiveStaticMask(currentMask);
      stateTimer = 0;
      return;
    }

    const fromMask = currentMask.influence;
    const toMask = nextMask.influence;
    const transition = getCurrentStepTransition();

    if (!fromMask || !toMask || !transition) {
      currentMask = nextMask;
      currentStepIndex = nextStepIndex;
      setActiveStaticMask(currentMask);
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
      currentMask = resolveMaskForStep(currentStepIndex);
      if (!currentMask) {
        currentMask = registry.resolve(null, params.initialMask);
      }
      setActiveStaticMask(currentMask);
      playing = params.maskTimeline.autoplay;
      return;
    }

    currentMask = registry.resolve(null, params.initialMask);
    setActiveStaticMask(currentMask);
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
