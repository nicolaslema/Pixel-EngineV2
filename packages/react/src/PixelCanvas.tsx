import { CSSProperties, forwardRef, useImperativeHandle } from "react";
import { usePixelEngine } from "./usePixelEngine";
import { PixelCanvasHandle, PixelCanvasProps } from "./types";

const baseStyle: CSSProperties = {
  display: "block"
};

/**
 * Declarative wrapper around `usePixelEngine`: renders the `<canvas>` and owns the engine's
 * lifecycle. `ref` exposes a `PixelCanvasHandle` (`getEngine()`).
 */
export const PixelCanvas = forwardRef<PixelCanvasHandle, PixelCanvasProps>(function PixelCanvas(
  props,
  ref
) {
  const {
    className,
    style,
    decorative = true,
    role,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    ...engineOptions
  } = props;
  const { canvasRef, engine } = usePixelEngine(engineOptions);

  useImperativeHandle(ref, () => ({ getEngine: () => engine }), [engine]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ ...baseStyle, ...style }}
      aria-hidden={decorative ? "true" : undefined}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    />
  );
});
