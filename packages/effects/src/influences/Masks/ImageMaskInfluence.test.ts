import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageMaskInfluence } from "./ImageMaskInfluence";

/**
 * No Image/onload mocking precedent exists elsewhere in this repo (other tests only
 * mock getContext and never trigger onload, so ImageMaskInfluence.generateMask() never
 * actually runs in them). Built from scratch here: a fake Image whose natural size is
 * controlled per-test via `mockImageNaturalSize`, firing onload asynchronously via
 * queueMicrotask (matching real browser timing -- the real constructor assigns
 * `image.src` before `image.onload`, so a synchronous mock would no-op).
 */
let mockImageNaturalSize = { width: 20, height: 20 };
let mockImageShouldFail = false;

class MockImage {
  width: number;
  height: number;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    this.width = mockImageNaturalSize.width;
    this.height = mockImageNaturalSize.height;
  }

  set src(_value: string) {
    queueMicrotask(() => {
      if (mockImageShouldFail) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

/** Alpha value (0-255) for a synthesized image sample at buffer coords (px, py) within a
 * getImageData request of size (sw, sh). Overridden per test for specific patterns. */
let pixelAlphaAt: (px: number, py: number, sw: number, sh: number) => number = (px) =>
  px % 256;

let drawImageSpy: ReturnType<typeof vi.fn>;
let getImageDataSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockImageNaturalSize = { width: 20, height: 20 };
  mockImageShouldFail = false;
  pixelAlphaAt = (px) => px % 256;

  drawImageSpy = vi.fn();
  getImageDataSpy = vi.fn((sx: number, sy: number, sw: number, sh: number) => {
    const data = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = pixelAlphaAt(x, y, sw, sh);
      }
    }
    return { data };
  });

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: () => {},
    drawImage: drawImageSpy,
    getImageData: getImageDataSpy
  } as unknown as CanvasRenderingContext2D);

  vi.stubGlobal("Image", MockImage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function flushLoad(): Promise<void> {
  await Promise.resolve();
}

describe("ImageMaskInfluence", () => {
  it("update() does not regenerate the mask after the initial load", async () => {
    const mask = new ImageMaskInfluence("mock.png", 100, 100, { sampleMode: "alpha" });
    await flushLoad();

    expect(drawImageSpy).toHaveBeenCalledTimes(1);
    expect(getImageDataSpy).toHaveBeenCalledTimes(1);

    mask.update(16);
    mask.update(16);
    mask.update(16);

    expect(drawImageSpy).toHaveBeenCalledTimes(1);
    expect(getImageDataSpy).toHaveBeenCalledTimes(1);
  });

  it("without gap, reproduces exact nearest-neighbor sampling (backward compatible)", async () => {
    mockImageNaturalSize = { width: 20, height: 20 };
    pixelAlphaAt = (px, py) => (px * 7 + py * 3) % 256;

    const centerX = 100;
    const centerY = 100;
    const mask = new ImageMaskInfluence("mock.png", centerX, centerY, {
      sampleMode: "alpha",
      scale: 1
    });
    await flushLoad();

    expect(mask.getBufferWidth()).toBe(mask.getWidth());
    expect(mask.getBufferHeight()).toBe(mask.getHeight());

    const originX = centerX - mask.getWidth() * 0.5;
    const originY = centerY - mask.getHeight() * 0.5;

    const samplePoints = [
      { dx: 0.2, dy: 0.9 },
      { dx: 5.7, dy: 12.4 },
      { dx: 19.9, dy: 19.9 }
    ];

    for (const { dx, dy } of samplePoints) {
      const x = originX + dx;
      const y = originY + dy;
      const expectedIndex = Math.floor(dy) * mask.getWidth() + Math.floor(dx);
      const expected = mask.getBuffer()[expectedIndex];
      expect(mask.getInfluence(x, y, 1)).toBeCloseTo(expected, 6);
    }

    // out of bounds on every side -> 0
    expect(mask.getInfluence(originX - 1, originY, 1)).toBe(0);
    expect(mask.getInfluence(originX, originY - 1, 1)).toBe(0);
    expect(mask.getInfluence(originX + mask.getWidth(), originY, 1)).toBe(0);
  });

  it("with gap, box-averages a block instead of reading a single pixel", async () => {
    mockImageNaturalSize = { width: 40, height: 40 };
    // Sharp half-block discontinuity along x: left half 0, right half fully on (255).
    pixelAlphaAt = (px) => (px < 20 ? 0 : 255);

    const centerX = 200;
    const centerY = 200;
    const mask = new ImageMaskInfluence("mock.png", centerX, centerY, {
      sampleMode: "alpha",
      scale: 0.5, // footprint = 20x20, native/buffer = 40x40 -> 2x buffer:footprint ratio
      gap: 10
    });
    await flushLoad();

    expect(mask.getWidth()).toBe(20);
    expect(mask.getBufferWidth()).toBe(40);

    const originX = centerX - mask.getWidth() * 0.5;
    const originY = centerY - mask.getHeight() * 0.5;

    // footprint-space x=10 -> buffer-space x=20, exactly on the discontinuity.
    const queryX = originX + 10;
    const queryY = originY + 10;

    const boxAveraged = mask.getInfluence(queryX, queryY, 1);
    const nearestNeighborOnly = mask.getBuffer()[10 * 40 + 20]; // buffer[y=10][x=20] = 1 (right half)

    expect(boxAveraged).toBeCloseTo(0.5, 1);
    expect(boxAveraged).not.toBeCloseTo(nearestNeighborOnly, 1);
  });

  it("caps buffer resolution at MAX_MASK_BUFFER_DIMENSION, preserving aspect ratio", async () => {
    mockImageNaturalSize = { width: 5000, height: 100 };

    const mask = new ImageMaskInfluence("mock.png", 0, 0, {
      sampleMode: "alpha",
      gap: 5
    });
    await flushLoad();

    expect(mask.getBufferWidth()).toBeLessThanOrEqual(1024);
    expect(mask.getBufferHeight()).toBeGreaterThanOrEqual(1);
    // Width and height are rounded independently, so the aspect ratio only holds
    // approximately (not exactly) -- assert it stays within a few percent, not exact.
    const aspect = mask.getBufferWidth() / mask.getBufferHeight();
    expect(Math.abs(aspect - 5000 / 100)).toBeLessThan(3);
  });

  it("applyBlur operates over buffer resolution, not footprint size", async () => {
    mockImageNaturalSize = { width: 40, height: 40 };
    pixelAlphaAt = () => 128;

    const mask = new ImageMaskInfluence("mock.png", 0, 0, {
      sampleMode: "alpha",
      scale: 0.5,
      gap: 10,
      blurRadius: 2
    });
    await flushLoad();

    expect(mask.getBuffer().length).toBe(mask.getBufferWidth() * mask.getBufferHeight());
    for (const value of mask.getBuffer()) {
      expect(Number.isNaN(value)).toBe(false);
    }
  });

  it("clamps the sample block size for a pathologically large gap", async () => {
    mockImageNaturalSize = { width: 40, height: 40 };

    const mask = new ImageMaskInfluence("mock.png", 100, 100, {
      sampleMode: "alpha",
      scale: 0.5,
      gap: 1000
    });
    await flushLoad();

    const value = mask.getInfluence(100, 100, 1);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  it("calls onError when the image fails to load (item 1.6)", async () => {
    mockImageShouldFail = true;
    const onError = vi.fn();

    const mask = new ImageMaskInfluence("mock.png", 0, 0, {
      sampleMode: "alpha",
      onError
    });
    await flushLoad();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("image failed to load");
    expect(mask.isAlive()).toBe(false);
  });

  it("calls onError when drawImage fails during generateMask (item 1.6)", async () => {
    drawImageSpy.mockImplementation(() => {
      throw new Error("boom");
    });
    const onError = vi.fn();

    new ImageMaskInfluence("mock.png", 0, 0, { sampleMode: "alpha", onError });
    await flushLoad();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("drawImage failed");
  });

  it("calls onError when getImageData fails during generateMask (item 1.6)", async () => {
    getImageDataSpy.mockImplementation(() => {
      throw new Error("boom");
    });
    const onError = vi.fn();

    new ImageMaskInfluence("mock.png", 0, 0, { sampleMode: "alpha", onError });
    await flushLoad();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("getImageData failed");
  });

  it("does not require onError to be provided (backward compatible)", async () => {
    mockImageShouldFail = true;
    expect(() => new ImageMaskInfluence("mock.png", 0, 0, { sampleMode: "alpha" })).not.toThrow();
    await flushLoad();
  });
});
