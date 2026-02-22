import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { PixelSurface } from "./PixelSurface";

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
});
