import { afterEach, describe, expect, it } from "vitest";
import { InputSystem } from "./InputSystem";

function setGlobalPointerEvent(value: unknown): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "PointerEvent");
  Object.defineProperty(globalThis, "PointerEvent", {
    configurable: true,
    writable: true,
    value
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(globalThis, "PointerEvent", descriptor);
    } else {
      delete (globalThis as { PointerEvent?: unknown }).PointerEvent;
    }
  };
}

describe("InputSystem", () => {
  let restorePointerEvent: (() => void) | null = null;

  afterEach(() => {
    restorePointerEvent?.();
    restorePointerEvent = null;
  });

  it("tracks pointer events when PointerEvent is available", () => {
    class PointerEventPolyfill extends MouseEvent {}
    restorePointerEvent = setGlobalPointerEvent(PointerEventPolyfill);

    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20
      } as DOMRect);

    const input = new InputSystem(canvas);

    canvas.dispatchEvent(
      new PointerEventPolyfill("pointerenter", {
        clientX: 30,
        clientY: 50
      })
    );
    expect(input.getMouse()).toEqual({
      x: 20,
      y: 30,
      isDown: false,
      inside: true
    });

    canvas.dispatchEvent(
      new PointerEventPolyfill("pointerdown", {
        clientX: 33,
        clientY: 55
      })
    );
    expect(input.getMouse().isDown).toBe(true);

    window.dispatchEvent(
      new PointerEventPolyfill("pointerup", {
        clientX: 35,
        clientY: 60
      })
    );
    expect(input.getMouse().isDown).toBe(false);

    canvas.dispatchEvent(new PointerEventPolyfill("pointerleave"));
    expect(input.getMouse()).toEqual({
      x: -9999,
      y: -9999,
      isDown: false,
      inside: false
    });

    input.destroy();
    canvas.remove();
  });

  it("falls back to mouse events when PointerEvent is unavailable", () => {
    restorePointerEvent = setGlobalPointerEvent(undefined);

    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.getBoundingClientRect = () =>
      ({
        left: 4,
        top: 6
      } as DOMRect);

    const input = new InputSystem(canvas);

    canvas.dispatchEvent(new MouseEvent("mouseenter"));
    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: 14,
        clientY: 26
      })
    );
    canvas.dispatchEvent(new MouseEvent("mousedown"));
    expect(input.getMouse()).toEqual({
      x: 10,
      y: 20,
      isDown: true,
      inside: true
    });

    canvas.dispatchEvent(new MouseEvent("mouseup"));
    expect(input.getMouse().isDown).toBe(false);

    canvas.dispatchEvent(new MouseEvent("mouseleave"));
    expect(input.getMouse()).toEqual({
      x: -9999,
      y: -9999,
      isDown: false,
      inside: false
    });

    input.destroy();
    canvas.remove();
  });
});
