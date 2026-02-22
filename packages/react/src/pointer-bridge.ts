interface HybridPointerBridge {
  detach: () => void;
}

function toMouseEventInit(event: PointerEvent | MouseEvent): MouseEventInit {
  return {
    bubbles: true,
    cancelable: true,
    clientX: event.clientX,
    clientY: event.clientY,
    screenX: event.screenX,
    screenY: event.screenY,
    button: event.button,
    buttons: event.buttons,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey
  };
}

function redispatchMouseEvent(
  canvas: HTMLCanvasElement,
  type: "mousemove" | "mouseenter" | "mouseleave" | "mousedown" | "mouseup" | "click",
  event: PointerEvent | MouseEvent
): void {
  canvas.dispatchEvent(new MouseEvent(type, toMouseEventInit(event)));
}

export function attachHybridPointerBridge(
  overlay: HTMLElement,
  canvas: HTMLCanvasElement
): HybridPointerBridge {
  const handlePointerMove = (event: PointerEvent) => {
    redispatchMouseEvent(canvas, "mousemove", event);
  };
  const handlePointerEnter = (event: PointerEvent) => {
    redispatchMouseEvent(canvas, "mouseenter", event);
    redispatchMouseEvent(canvas, "mousemove", event);
  };
  const handlePointerLeave = (event: PointerEvent) => {
    redispatchMouseEvent(canvas, "mouseleave", event);
  };
  const handlePointerDown = (event: PointerEvent) => {
    redispatchMouseEvent(canvas, "mousedown", event);
  };
  const handlePointerUp = (event: PointerEvent) => {
    redispatchMouseEvent(canvas, "mouseup", event);
  };
  const handleClick = (event: MouseEvent) => {
    redispatchMouseEvent(canvas, "click", event);
  };

  overlay.addEventListener("pointermove", handlePointerMove, true);
  overlay.addEventListener("pointerenter", handlePointerEnter, true);
  overlay.addEventListener("pointerleave", handlePointerLeave, true);
  overlay.addEventListener("pointerdown", handlePointerDown, true);
  overlay.addEventListener("pointerup", handlePointerUp, true);
  overlay.addEventListener("click", handleClick, true);

  return {
    detach: () => {
      overlay.removeEventListener("pointermove", handlePointerMove, true);
      overlay.removeEventListener("pointerenter", handlePointerEnter, true);
      overlay.removeEventListener("pointerleave", handlePointerLeave, true);
      overlay.removeEventListener("pointerdown", handlePointerDown, true);
      overlay.removeEventListener("pointerup", handlePointerUp, true);
      overlay.removeEventListener("click", handleClick, true);
    }
  };
}
