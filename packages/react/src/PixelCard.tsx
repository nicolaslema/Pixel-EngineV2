import { CSSProperties, PropsWithChildren, useEffect, useRef } from "react";
import { PixelCanvas } from "./PixelCanvas";
import { PixelGridCanvas } from "./PixelGridCanvas";
import { OverlayPointerEventsMode, PixelCanvasProps, PixelGridCanvasProps } from "./types";
import { attachHybridPointerBridge } from "./pointer-bridge";

interface PixelCardBaseProps extends PropsWithChildren {
  containerClassName?: string;
  containerStyle?: CSSProperties;
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
  overlayPointerEvents?: OverlayPointerEventsMode;
  radius?: number;
  padding?: number;
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

export function PixelCard({
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
  ...canvasProps
}: PixelCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (overlayPointerEvents !== "hybrid") return;
    const container = containerRef.current;
    const overlay = overlayRef.current;
    const canvasElement = container?.querySelector("canvas");
    if (!overlay || !(canvasElement instanceof HTMLCanvasElement)) return;

    const bridge = attachHybridPointerBridge(overlay, canvasElement);
    return () => bridge.detach();
  }, [overlayPointerEvents]);

  const isGridCard =
    "gridConfig" in canvasProps ||
    "preset" in canvasProps ||
    "mask" in canvasProps ||
    "rippleTrigger" in canvasProps ||
    "onGridReady" in canvasProps ||
    "scrollReactive" in canvasProps ||
    "sectionTransition" in canvasProps ||
    "themeSync" in canvasProps ||
    "statePreset" in canvasProps ||
    "debugHud" in canvasProps ||
    "ssrPlaceholder" in canvasProps;

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
          {...(canvasProps as PixelGridCanvasProps)}
          className={className}
          style={mergedCanvasStyle}
        />
      ) : (
        <PixelCanvas
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
}
