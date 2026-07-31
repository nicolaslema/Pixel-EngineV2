import { CSSProperties, forwardRef, useEffect, useImperativeHandle } from "react";
import { usePixelEngine } from "./usePixelEngine";
import { PixelCanvasHandle, PixelCanvasProps } from "./types";
import { warnIfResponsiveCanvasStyleMismatch } from "./canvas-responsive-warning";

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

  useEffect(() => {
    warnIfResponsiveCanvasStyleMismatch(style, engineOptions.fitMode);
    // Deliberately depends on style.width/height (not the `style` object) so this doesn't
    // re-fire -- and re-console.warn -- on every render when a consumer passes an inline
    // style={{...}} literal (a fresh object identity each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style?.width, style?.height, engineOptions.fitMode]);

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
