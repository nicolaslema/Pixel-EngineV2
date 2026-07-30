import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { attachHybridPointerBridge } from "./pointer-bridge";

function firePointerEvent(
  target: EventTarget,
  type: string,
  init: PointerEventInit = {}
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 42,
      clientY: 24,
      pointerId: 7,
      pointerType: "mouse",
      isPrimary: true,
      ...init
    })
  );
}

describe("attachHybridPointerBridge", () => {
  let overlay: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    overlay = document.createElement("div");
    canvas = document.createElement("canvas");
    document.body.appendChild(overlay);
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    overlay.remove();
    canvas.remove();
  });

  it("forwards pointermove on the overlay as a real pointermove on the canvas (not a MouseEvent)", () => {
    const bridge = attachHybridPointerBridge(overlay, canvas);
    const received: PointerEvent[] = [];
    canvas.addEventListener("pointermove", (event) => received.push(event as PointerEvent));

    firePointerEvent(overlay, "pointermove", { clientX: 10, clientY: 20, pointerId: 3 });

    expect(received).toHaveLength(1);
    expect(received[0]).toBeInstanceOf(PointerEvent);
    expect(received[0].clientX).toBe(10);
    expect(received[0].clientY).toBe(20);
    expect(received[0].pointerId).toBe(3);
    bridge.detach();
  });

  it("forwards pointerenter as both pointerenter and pointermove on the canvas", () => {
    const bridge = attachHybridPointerBridge(overlay, canvas);
    const receivedTypes: string[] = [];
    canvas.addEventListener("pointerenter", (event) => receivedTypes.push(event.type));
    canvas.addEventListener("pointermove", (event) => receivedTypes.push(event.type));

    firePointerEvent(overlay, "pointerenter");

    expect(receivedTypes).toEqual(["pointerenter", "pointermove"]);
    bridge.detach();
  });

  it("forwards pointerleave, pointerdown, and pointerup as their pointer-event counterparts", () => {
    const bridge = attachHybridPointerBridge(overlay, canvas);
    const receivedTypes: string[] = [];
    for (const type of ["pointerleave", "pointerdown", "pointerup"]) {
      canvas.addEventListener(type, (event) => receivedTypes.push(event.type));
    }

    firePointerEvent(overlay, "pointerleave");
    firePointerEvent(overlay, "pointerdown");
    firePointerEvent(overlay, "pointerup");

    expect(receivedTypes).toEqual(["pointerleave", "pointerdown", "pointerup"]);
    bridge.detach();
  });

  it("forwards click as a MouseEvent, unchanged", () => {
    const bridge = attachHybridPointerBridge(overlay, canvas);
    const received: Event[] = [];
    canvas.addEventListener("click", (event) => received.push(event));

    overlay.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, clientX: 5, clientY: 6 })
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toBeInstanceOf(MouseEvent);
    expect(received[0]).not.toBeInstanceOf(PointerEvent);
    expect((received[0] as MouseEvent).clientX).toBe(5);
    bridge.detach();
  });

  it("stops forwarding events after detach()", () => {
    const bridge = attachHybridPointerBridge(overlay, canvas);
    const received: Event[] = [];
    canvas.addEventListener("pointermove", (event) => received.push(event));

    bridge.detach();
    firePointerEvent(overlay, "pointermove");

    expect(received).toHaveLength(0);
  });
});
