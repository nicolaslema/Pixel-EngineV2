import { describe, it, expect } from "vitest";
import { RippleInfluence } from "./RippleInfluence";

describe("RippleInfluence", () => {
  it("ring factor is positive on ring and zero far away", () => {
    const ripple = new RippleInfluence(0, 0, 1, 10, 1, 100);
    ripple.update(50);

    const onRing = ripple.getRingFactorAt(50, 0);
    const far = ripple.getRingFactorAt(90, 0);

    expect(onRing).toBeGreaterThan(0);
    expect(far).toBe(0);
  });
});
