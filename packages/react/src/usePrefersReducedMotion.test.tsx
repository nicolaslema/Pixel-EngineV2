import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

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

describe("usePrefersReducedMotion", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("reflects the initial matches value and updates on a live 'change' event (item 5.8)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const mql = createMockMediaQueryList(false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const values: boolean[] = [];
    function TestComponent() {
      const reduced = usePrefersReducedMotion();
      values.push(reduced);
      return null;
    }

    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent />);
    });
    expect(values.at(-1)).toBe(false);

    act(() => {
      mql.setMatches(true);
    });
    expect(values.at(-1)).toBe(true);

    act(() => {
      mql.setMatches(false);
    });
    expect(values.at(-1)).toBe(false);

    cleanupHost(container, root);
  });
});
