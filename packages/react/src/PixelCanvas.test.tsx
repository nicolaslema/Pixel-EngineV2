import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";
import { PixelCanvas } from "./PixelCanvas";
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

describe("PixelCanvas", () => {
  it("renders a canvas and merges styles", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCanvas
          width={300}
          height={200}
          className="pixel-test"
          style={{ opacity: 0.5 }}
          createEngine={createEngine}
        />
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.className).toBe("pixel-test");
    expect(canvas?.style.opacity).toBe("0.5");

    cleanupHost(container, root);
  });

  it("renders aria-hidden='true' by default (decorative canvas, item 5.7)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(<PixelCanvas width={300} height={200} createEngine={createEngine} />);
    });

    const canvas = container.querySelector("canvas");
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");

    cleanupHost(container, root);
  });

  it("omits aria-hidden and forwards aria-label/role when decorative={false}", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCanvas
          width={300}
          height={200}
          createEngine={createEngine}
          decorative={false}
          role="img"
          aria-label="Interactive pixel art"
        />
      );
    });

    const canvas = container.querySelector("canvas");
    expect(canvas?.hasAttribute("aria-hidden")).toBe(false);
    expect(canvas?.getAttribute("role")).toBe("img");
    expect(canvas?.getAttribute("aria-label")).toBe("Interactive pixel art");

    cleanupHost(container, root);
  });

  it("exposes getEngine via ref (item 5.15)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const engineInstance = { start: vi.fn(), destroy: vi.fn(), resize: vi.fn() };
    const createEngine = vi.fn(() => engineInstance) as never;
    const ref = React.createRef<PixelCanvasHandle>();

    const { container, root } = createHost();
    act(() => {
      root.render(<PixelCanvas ref={ref} width={300} height={200} createEngine={createEngine} />);
    });

    expect(ref.current?.getEngine()).toBe(engineInstance);

    cleanupHost(container, root);
  });

  it("warns in dev when style looks responsive without fitMode=client (item 1.6)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCanvas
          width={300}
          height={200}
          style={{ width: "100%" }}
          createEngine={createEngine}
        />
      );
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("fitMode"));

    cleanupHost(container, root);
    warnSpy.mockRestore();
  });

  it("does not warn when fitMode=client is set", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const createEngine = vi.fn(() => ({
      start: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn()
    })) as never;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container, root } = createHost();
    act(() => {
      root.render(
        <PixelCanvas
          width={300}
          height={200}
          fitMode="client"
          style={{ width: "100%" }}
          createEngine={createEngine}
        />
      );
    });

    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("fitMode"));

    cleanupHost(container, root);
    warnSpy.mockRestore();
  });
});
