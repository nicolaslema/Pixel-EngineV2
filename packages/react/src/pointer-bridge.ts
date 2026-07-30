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

function toPointerEventInit(event: PointerEvent): PointerEventInit {
  return {
    ...toMouseEventInit(event),
    pointerId: event.pointerId,
    width: event.width,
    height: event.height,
    pressure: event.pressure,
    tangentialPressure: event.tangentialPressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    twist: event.twist,
    pointerType: event.pointerType,
    isPrimary: event.isPrimary
  };
}

function redispatchMouseEvent(
  canvas: HTMLCanvasElement,
  type: "click",
  event: PointerEvent | MouseEvent
): void {
  canvas.dispatchEvent(new MouseEvent(type, toMouseEventInit(event)));
}

// `InputSystem` (@pixel-engine/core) listens for these exact PointerEvent types on the
// canvas -- redispatching MouseEvents here would never reach it (different event types,
// no relation), silently breaking hover/magnetic/tint through the overlay in any browser
// with PointerEvent support (i.e. virtually all of them).
function redispatchPointerEvent(
  canvas: HTMLCanvasElement,
  type: "pointermove" | "pointerenter" | "pointerleave" | "pointerdown" | "pointerup",
  event: PointerEvent
): void {
  canvas.dispatchEvent(new PointerEvent(type, toPointerEventInit(event)));
}

export function attachHybridPointerBridge(
  overlay: HTMLElement,
  canvas: HTMLCanvasElement
): HybridPointerBridge {
  const handlePointerMove = (event: PointerEvent) => {
    redispatchPointerEvent(canvas, "pointermove", event);
  };
  const handlePointerEnter = (event: PointerEvent) => {
    redispatchPointerEvent(canvas, "pointerenter", event);
    redispatchPointerEvent(canvas, "pointermove", event);
  };
  const handlePointerLeave = (event: PointerEvent) => {
    redispatchPointerEvent(canvas, "pointerleave", event);
  };
  const handlePointerDown = (event: PointerEvent) => {
    redispatchPointerEvent(canvas, "pointerdown", event);
  };
  const handlePointerUp = (event: PointerEvent) => {
    redispatchPointerEvent(canvas, "pointerup", event);
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
