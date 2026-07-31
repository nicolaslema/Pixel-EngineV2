import React, { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import type { PixelGridEffect } from "@pixel-engine/effects";
import { useScrollReactiveGrid } from "./useScrollReactiveGrid";

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

interface MockMediaQueryList {
  matches: boolean;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
  setMatches: (next: boolean) => void;
}

function createMockMediaQueryList(initialMatches: boolean): MockMediaQueryList {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  return {
    get matches() {
      return matches;
    },
    addEventListener: (_type, cb) => {
      listeners.add(cb);
    },
    removeEventListener: (_type, cb) => {
      listeners.delete(cb);
    },
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb());
    }
  };
}

function TestComponent() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<PixelGridEffect | null>(null);
  useScrollReactiveGrid({
    canvasRef,
    gridRef,
    options: { enabled: true, source: "window", respectReducedMotion: true }
  });
  return <canvas ref={canvasRef} />;
}

describe("useScrollReactiveGrid", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("detaches wheel/scroll listeners when prefers-reduced-motion changes live (item 5.8)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const mql = createMockMediaQueryList(false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    expect(addSpy).toHaveBeenCalledWith("wheel", expect.any(Function), expect.anything());
    addSpy.mockClear();
    removeSpy.mockClear();

    // Live OS-level change, not a remount -- must tear down the active listeners and not
    // attach new ones, without needing to unmount the component.
    act(() => {
      mql.setMatches(true);
    });

    expect(removeSpy).toHaveBeenCalledWith("wheel", expect.any(Function));
    expect(addSpy).not.toHaveBeenCalledWith("wheel", expect.any(Function), expect.anything());

    cleanupHost(container, root);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
