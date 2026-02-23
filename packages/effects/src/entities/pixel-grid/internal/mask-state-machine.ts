import { InfluenceManager } from "../../../influences/InfluenceManager";
import { ImageMaskInfluence } from "../../../influences/Masks/ImageMaskInfluence";
import { TextMaskInfluence } from "../../../influences/Masks/TextMaskInfluence";
import { MaskInfluence } from "../../../influences/Masks/MaskInfluence";
import { InitialMask, ResolvedPixelGridConfig } from "../types";
import { TimelineTransitionMaskInfluence } from "./timeline-transition-mask";
type TimelinePhase = "hold" | "transition";
type AvailableMask = InitialMask | null;

export interface MaskStateMachine {
  imageMask: ImageMaskInfluence | null;
  textMask: TextMaskInfluence | null;
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
  autoMorph: ResolvedPixelGridConfig["autoMorph"];
  maskTimeline: ResolvedPixelGridConfig["maskTimeline"];
  initialMask: InitialMask;
  imageMask: ImageMaskInfluence | null;
  textMask: TextMaskInfluence | null;
}

export function createMaskStateMachine(
  params: CreateMaskStateMachineParams
): MaskStateMachine {
  const { influenceManager } = params;

  let imageMask = params.imageMask;
  let textMask = params.textMask;
  let morphMask: MaskInfluence | null = null;
  let phase: TimelinePhase = "hold";
  let currentMaskType: AvailableMask = null;
  let transitionTargetMaskType: AvailableMask = null;
  let transitionTargetStepIndex = -1;
  let currentStepIndex = -1;
  let stateTimer = 0;
  let playing = false;

  const removeAllMaskInfluences = () => {
    if (imageMask) influenceManager.remove(imageMask);
    if (textMask) influenceManager.remove(textMask);
    if (morphMask) influenceManager.remove(morphMask);
  };

  const getMaskByType = (type: AvailableMask): MaskInfluence | null => {
    if (type === "image") return imageMask;
    if (type === "text") return textMask;
    return null;
  };

  const resolveAvailableType = (preferred: InitialMask): AvailableMask => {
    if (preferred === "image") {
      if (imageMask) return "image";
      if (textMask) return "text";
      return null;
    }

    if (textMask) return "text";
    if (imageMask) return "image";
    return null;
  };

  const setActiveStaticMask = (type: AvailableMask) => {
    if (imageMask) influenceManager.remove(imageMask);
    if (textMask) influenceManager.remove(textMask);
    const mask = getMaskByType(type);
    if (mask) influenceManager.add(mask);
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

  const finalizeTransition = () => {
    if (morphMask) {
      influenceManager.remove(morphMask);
    }
    morphMask = null;

    currentMaskType = transitionTargetMaskType;
    currentStepIndex = transitionTargetStepIndex;
    setActiveStaticMask(currentMaskType);
    phase = "hold";
    transitionTargetMaskType = null;
    transitionTargetStepIndex = -1;
    stateTimer = 0;
  };

  const startTransitionToStep = (nextStepIndex: number) => {
    const nextStep = params.maskTimeline.steps[nextStepIndex];
    if (!nextStep) {
      playing = false;
      return;
    }

    const nextMaskType = resolveAvailableType(nextStep.mask);
    if (!nextMaskType) {
      currentStepIndex = nextStepIndex;
      stateTimer = 0;
      return;
    }

    if (currentMaskType === null) {
      currentMaskType = nextMaskType;
      currentStepIndex = nextStepIndex;
      setActiveStaticMask(currentMaskType);
      stateTimer = 0;
      return;
    }

    if (nextMaskType === currentMaskType) {
      currentStepIndex = nextStepIndex;
      stateTimer = 0;
      return;
    }

    const fromMask = getMaskByType(currentMaskType);
    const toMask = getMaskByType(nextMaskType);
    const transition = getCurrentStepTransition();

    if (!fromMask || !toMask || !transition) {
      currentMaskType = nextMaskType;
      currentStepIndex = nextStepIndex;
      setActiveStaticMask(currentMaskType);
      stateTimer = 0;
      return;
    }

    if (imageMask) influenceManager.remove(imageMask);
    if (textMask) influenceManager.remove(textMask);

    morphMask = new TimelineTransitionMaskInfluence(
      fromMask,
      toMask,
      transition.durationMs,
      transition.mode,
      transition.seed
    );
    influenceManager.add(morphMask);
    phase = "transition";
    transitionTargetMaskType = nextMaskType;
    transitionTargetStepIndex = nextStepIndex;
    stateTimer = 0;
  };

  const reset = () => {
    removeAllMaskInfluences();

    phase = "hold";
    transitionTargetMaskType = null;
    transitionTargetStepIndex = -1;
    stateTimer = 0;
    currentStepIndex = -1;
    currentMaskType = null;
    morphMask = null;

    if (params.maskTimeline.enabled && params.maskTimeline.steps.length > 0) {
      currentStepIndex = params.maskTimeline.initialStep;
      const initialStep = params.maskTimeline.steps[currentStepIndex];
      const preferred = initialStep?.mask ?? params.initialMask;
      currentMaskType = resolveAvailableType(preferred);
      setActiveStaticMask(currentMaskType);
      playing = params.maskTimeline.autoplay;
      return;
    }

    currentMaskType = resolveAvailableType(params.initialMask);
    setActiveStaticMask(currentMaskType);
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
