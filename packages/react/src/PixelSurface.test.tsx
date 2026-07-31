import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { PixelSurface } from "./PixelSurface";
import { PixelCanvasHandle } from "./types";

function createHost(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  return { container, root };
}

function cleanupHost(container: HTMLDivElement, root: Root): void {
  act(() => root.unmount());
  container.remove();
}

describe("PixelSurface", () => {
  it("uses pointer-events auto for hybrid overlay mode", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelSurface
          width={320}
          height={180}
          createEngine={createEngine}
          overlayPointerEvents="hybrid"
        >
          <button type="button">Click</button>
        </PixelSurface>
      );
    });

    const overlay = container.querySelectorAll("div")[1];
    expect(overlay.style.pointerEvents).toBe("auto");

    cleanupHost(container, root);
  });

  it("forwards overlay hover as real PointerEvents on the canvas, not MouseEvents (item 5.1)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelSurface
          width={320}
          height={180}
          createEngine={createEngine}
          overlayPointerEvents="hybrid"
        >
          <button type="button">Click</button>
        </PixelSurface>
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();

    const receivedTypes: string[] = [];
    canvas?.addEventListener("pointermove", (event) => receivedTypes.push(event.type));
    canvas?.addEventListener("pointerenter", (event) => receivedTypes.push(event.type));
    canvas?.addEventListener("mousemove", () => receivedTypes.push("mousemove (BUG)"));

    const button = container.querySelector("button");
    act(() => {
      button?.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          cancelable: true,
          clientX: 12,
          clientY: 18,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true
        })
      );
    });

    expect(receivedTypes).toEqual(["pointerenter", "pointermove"]);

    cleanupHost(container, root);
  });

  it("exposes getEngine via ref, forwarded to the inner PixelCanvas (item 5.15)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const engineInstance = { start: vi.fn(), destroy: vi.fn(), resize: vi.fn() };
    const createEngine = vi.fn(() => engineInstance) as never;
    const ref = React.createRef<PixelCanvasHandle>();

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelSurface ref={ref} width={320} height={180} createEngine={createEngine}>
          <button type="button">Click</button>
        </PixelSurface>
      );
    });

    expect(ref.current?.getEngine()).toBe(engineInstance);

    cleanupHost(container, root);
  });
});
