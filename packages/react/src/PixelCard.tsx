import {
  CSSProperties,
  PropsWithChildren,
  Ref,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from "react";
import { PixelCanvas } from "./PixelCanvas";
import { PixelGridCanvas } from "./PixelGridCanvas";
import {
  OverlayPointerEventsMode,
  PixelCanvasHandle,
  PixelCanvasProps,
  PixelCardHandle,
  PixelGridCanvasHandle,
  PixelGridCanvasProps
} from "./types";
import { attachHybridPointerBridge } from "./pointer-bridge";

interface PixelCardBaseProps extends PropsWithChildren {
  containerClassName?: string;
  containerStyle?: CSSProperties;
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
  overlayPointerEvents?: OverlayPointerEventsMode;
  radius?: number;
  padding?: number;
  /**
   * Which inner canvas component to render: `"grid"` (the interactive `PixelGridCanvas`,
   * default) or `"plain"` (a bare `PixelCanvas`, e.g. for a purely visual, non-grid effect).
   * Replaces the previous prop-shape inference — pass `mode="plain"` explicitly for the old
   * "no grid props" fallback behavior.
   */
  mode?: "grid" | "plain";
}

export type PixelCardProps = PixelCardBaseProps & (PixelCanvasProps | PixelGridCanvasProps);

const surfaceStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden"
};

const canvasStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "block",
  width: "100%",
  height: "100%"
};

function asGridHandle(
  handle: PixelGridCanvasHandle | PixelCanvasHandle | null
): PixelGridCanvasHandle | null {
  return handle && "getGrid" in handle ? handle : null;
}

/**
 * A card-shaped `PixelCanvas`/`PixelGridCanvas` background with an interactive overlay for
 * real content on top. `mode` selects which inner canvas is rendered (default `"grid"`).
 * `ref` exposes a `PixelCardHandle` — in `mode="plain"`, grid-specific methods are no-ops and
 * `getGrid()` returns `null`.
 */
export const PixelCard = forwardRef<PixelCardHandle, PixelCardProps>(function PixelCard(
  {
    children,
    radius = 16,
    padding = 16,
    className,
    style,
    containerClassName,
    containerStyle,
    overlayClassName,
    overlayStyle,
    overlayPointerEvents = "none",
    mode = "grid",
    ...canvasProps
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<PixelGridCanvasHandle | PixelCanvasHandle | null>(null);

  useEffect(() => {
    if (overlayPointerEvents !== "hybrid") return;
    const container = containerRef.current;
    const overlay = overlayRef.current;
    const canvasElement = container?.querySelector("canvas");
    if (!overlay || !(canvasElement instanceof HTMLCanvasElement)) return;

    const bridge = attachHybridPointerBridge(overlay, canvasElement);
    return () => bridge.detach();
  }, [overlayPointerEvents]);

  useImperativeHandle(
    ref,
    () => ({
      getEngine: () => innerRef.current?.getEngine() ?? null,
      getGrid: () => asGridHandle(innerRef.current)?.getGrid() ?? null,
      triggerRipple: (x, y) => asGridHandle(innerRef.current)?.triggerRipple(x, y),
      playMaskTimeline: () => asGridHandle(innerRef.current)?.playMaskTimeline(),
      pauseMaskTimeline: () => asGridHandle(innerRef.current)?.pauseMaskTimeline(),
      resetMaskTimeline: () => asGridHandle(innerRef.current)?.resetMaskTimeline()
    }),
    []
  );

  const isGridCard = mode === "grid";

  const mergedContainerStyle: CSSProperties = {
    ...surfaceStyle,
    borderRadius: radius,
    ...containerStyle
  };
  const mergedOverlayStyle: CSSProperties = {
    position: "relative",
    zIndex: 1,
    pointerEvents: overlayPointerEvents === "hybrid" ? "auto" : overlayPointerEvents,
    borderRadius: radius,
    padding,
    ...overlayStyle
  };
  const mergedCanvasStyle: CSSProperties = {
    ...canvasStyle,
    ...style
  };

  return (
    <div ref={containerRef} className={containerClassName} style={mergedContainerStyle}>
      {isGridCard ? (
        <PixelGridCanvas
          // innerRef's union type can't be statically narrowed against a single branch's ref
          // type here (isGridCard is a runtime check, not a type guard on canvasProps).
          ref={innerRef as unknown as Ref<PixelGridCanvasHandle>}
          {...(canvasProps as PixelGridCanvasProps)}
          className={className}
          style={mergedCanvasStyle}
        />
      ) : (
        <PixelCanvas
          ref={innerRef as unknown as Ref<PixelCanvasHandle>}
          {...(canvasProps as PixelCanvasProps)}
          className={className}
          style={mergedCanvasStyle}
        />
      )}
      <div ref={overlayRef} className={overlayClassName} style={mergedOverlayStyle}>
        {children}
      </div>
    </div>
  );
});
