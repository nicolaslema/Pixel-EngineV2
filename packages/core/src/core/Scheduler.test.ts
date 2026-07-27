import { describe, expect, it, vi } from "vitest";
import { Scheduler } from "./Scheduler";

describe("Scheduler", () => {
  it("runs tasks in deterministic order by priority and registration", () => {
    const scheduler = new Scheduler();
    const calls: string[] = [];

    scheduler.add("late", () => calls.push("late"), {
      phase: "update",
      priority: 10
    });
    scheduler.add("early", () => calls.push("early"), {
      phase: "update",
      priority: 0
    });
    scheduler.add("late-second", () => calls.push("late-second"), {
      phase: "update",
      priority: 10
    });

    scheduler.runPhase("update", 16, 1);

    expect(calls).toEqual(["early", "late", "late-second"]);
  });

  it("supports phase-specific execution and alpha forwarding", () => {
    const scheduler = new Scheduler();
    const preUpdate = vi.fn();
    const render = vi.fn();

    scheduler.add("pre", preUpdate, { phase: "preUpdate" });
    scheduler.add("render", render, { phase: "render" });

    scheduler.runPhase("preUpdate", 20, 1);
    scheduler.runPhase("render", 20, 0.4);

    expect(preUpdate).toHaveBeenCalledWith(20, 1);
    expect(render).toHaveBeenCalledWith(20, 0.4);
  });

  it("keeps backward compatibility for run(delta) on update phase", () => {
    const scheduler = new Scheduler();
    const update = vi.fn();

    scheduler.add("legacy", update);
    scheduler.run(33);

    expect(update).toHaveBeenCalledWith(33, 1);
  });
});
