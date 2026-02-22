import { CSSProperties, PropsWithChildren, useEffect, useRef } from "react";
import { PixelCanvas } from "./PixelCanvas";
import { OverlayPointerEventsMode, PixelCanvasProps } from "./types";
import { attachHybridPointerBridge } from "./pointer-bridge";

export interface PixelSurfaceProps extends PixelCanvasProps, PropsWithChildren {
  containerClassName?: string;
  containerStyle?: CSSProperties;
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
  overlayPointerEvents?: OverlayPointerEventsMode;
}

const surfaceStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden"
};

const canvasStyle: CSSProperties = {
  position: "absolute",
  inset: 0
};

const overlayStyleBase: CSSProperties = {
  position: "relative",
  zIndex: 1
};

export function PixelSurface({
  children,
  containerClassName,
  containerStyle,
  overlayClassName,
  overlayStyle,
  overlayPointerEvents = "none",
  style,
  ...canvasProps
}: PixelSurfaceProps) {
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

  const mergedOverlayStyle: CSSProperties = {
    ...overlayStyleBase,
    pointerEvents: overlayPointerEvents === "hybrid" ? "auto" : overlayPointerEvents,
    ...overlayStyle
  };

  return (
    <div ref={containerRef} className={containerClassName} style={{ ...surfaceStyle, ...containerStyle }}>
      <PixelCanvas {...canvasProps} style={{ ...canvasStyle, ...style }} />
      <div ref={overlayRef} className={overlayClassName} style={mergedOverlayStyle}>
        {children}
      </div>
    </div>
  );
}
