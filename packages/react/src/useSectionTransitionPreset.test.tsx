import React, { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import type { PixelGridEffect } from "@pixel-engine/effects";
import { useSectionTransitionPreset } from "./useSectionTransitionPreset";

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
  useSectionTransitionPreset({
    canvasRef,
    gridRef,
    options: { enabled: true, respectReducedMotion: true }
  });
  return <canvas ref={canvasRef} />;
}

describe("useSectionTransitionPreset", () => {
  const originalMatchMedia = window.matchMedia;
  const OriginalIntersectionObserver = globalThis.IntersectionObserver;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    globalThis.IntersectionObserver = OriginalIntersectionObserver;
  });

  it("recreates the IntersectionObserver when prefers-reduced-motion changes live (item 5.8)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const mql = createMockMediaQueryList(false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const observeSpy = vi.fn();
    const disconnectSpy = vi.fn();
    class MockIntersectionObserver {
      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
      observe = observeSpy;
      disconnect = disconnectSpy;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = "";
      thresholds: ReadonlyArray<number> = [];
    }
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });

    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).not.toHaveBeenCalled();

    // Live OS-level change -- the effect must tear down the old observer and create a new
    // one reflecting the updated reduce-motion preference, without an unmount/remount.
    act(() => {
      mql.setMatches(true);
    });

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledTimes(2);

    cleanupHost(container, root);
  });
});
