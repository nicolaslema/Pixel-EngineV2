import React, { MutableRefObject, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { PixelEngine } from "@pixel-engine/core";
import { PixelGridEffect } from "@pixel-engine/effects";
import { useDebugHudOverlay } from "./useDebugHudOverlay";
import { DebugHudOptions } from "./types";

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

function TestComponent(props: { engine: PixelEngine | null; options?: DebugHudOptions }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<PixelGridEffect | null>(null) as MutableRefObject<PixelGridEffect | null>;
  const hud = useDebugHudOverlay({
    canvasRef,
    gridRef,
    engine: props.engine,
    options: props.options
  });
  return (
    <div>
      <canvas ref={canvasRef} />
      {hud}
    </div>
  );
}

describe("useDebugHudOverlay", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when disabled", () => {
    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent engine={null} />);
    });

    expect(document.querySelector("[data-pixel-engine-debug-hud]")).toBeNull();

    cleanupHost(container, root);
  });

  it("portals a status-role HUD node into document.body when enabled", () => {
    const engine = { getFPS: () => 60, getQuality: () => "high" } as unknown as PixelEngine;
    const { container, root } = createHost();
    act(() => {
      root.render(<TestComponent engine={engine} options={{ enabled: true }} />);
    });

    const hud = document.querySelector("[data-pixel-engine-debug-hud]") as HTMLElement | null;
    expect(hud).not.toBeNull();
    // Rendered via createPortal to document.body, not as a child of the local container.
    expect(container.contains(hud)).toBe(false);
    expect(document.body.contains(hud)).toBe(true);
    expect(hud?.getAttribute("role")).toBe("status");
    expect(hud?.getAttribute("aria-live")).toBe("polite");

    cleanupHost(container, root);
    expect(document.querySelector("[data-pixel-engine-debug-hud]")).toBeNull();
  });

  it("updates HUD content on the configured interval", () => {
    const getFPS = vi.fn(() => 42.5);
    const engine = { getFPS, getQuality: () => "low" } as unknown as PixelEngine;
    const { container, root } = createHost();
    act(() => {
      root.render(
        <TestComponent engine={engine} options={{ enabled: true, updateIntervalMs: 50 }} />
      );
    });

    const hud = document.querySelector("[data-pixel-engine-debug-hud]") as HTMLElement | null;
    expect(hud?.textContent).toContain("fps: 42.5");

    getFPS.mockReturnValue(10);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(hud?.textContent).toContain("fps: 10.0");

    cleanupHost(container, root);
  });
});
