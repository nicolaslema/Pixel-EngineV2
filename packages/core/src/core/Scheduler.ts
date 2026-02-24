export type SchedulerPhase =
  | "preUpdate"
  | "update"
  | "postUpdate"
  | "preRender"
  | "render"
  | "postRender";

export type SchedulerTask = (delta: number, alpha: number) => void;

export interface SchedulerTaskOptions {
  phase?: SchedulerPhase;
  priority?: number;
}

interface ScheduledTaskEntry {
  name: string;
  task: SchedulerTask;
  priority: number;
  order: number;
}

const DEFAULT_PHASE: SchedulerPhase = "update";
const DEFAULT_PRIORITY = 0;
const PHASES: SchedulerPhase[] = [
  "preUpdate",
  "update",
  "postUpdate",
  "preRender",
  "render",
  "postRender"
];

export class Scheduler {
  private phaseTasks: Record<SchedulerPhase, Map<string, ScheduledTaskEntry>> = {
    preUpdate: new Map(),
    update: new Map(),
    postUpdate: new Map(),
    preRender: new Map(),
    render: new Map(),
    postRender: new Map()
  };

  private nextOrder = 0;

  add(name: string, task: SchedulerTask, options?: SchedulerTaskOptions): void {
    const phase = options?.phase ?? DEFAULT_PHASE;
    const priority = options?.priority ?? DEFAULT_PRIORITY;
    const phaseMap = this.phaseTasks[phase];
    const existing = phaseMap.get(name);

    if (existing) {
      phaseMap.set(name, {
        ...existing,
        task,
        priority
      });
      return;
    }

    phaseMap.set(name, {
      name,
      task,
      priority,
      order: this.nextOrder++
    });
  }

  remove(name: string, phase?: SchedulerPhase): void {
    if (phase) {
      this.phaseTasks[phase].delete(name);
      return;
    }

    for (const currentPhase of PHASES) {
      this.phaseTasks[currentPhase].delete(name);
    }
  }

  run(delta: number): void {
    this.runPhase("update", delta, 1);
  }

  runPhase(phase: SchedulerPhase, delta: number, alpha = 1): void {
    const entries = [...this.phaseTasks[phase].values()];
    entries.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.order - b.order;
    });

    for (const entry of entries) {
      entry.task(delta, alpha);
    }
  }

  clear(phase?: SchedulerPhase): void {
    if (phase) {
      this.phaseTasks[phase].clear();
      return;
    }

    for (const currentPhase of PHASES) {
      this.phaseTasks[currentPhase].clear();
    }
  }
}
