import { CSSProperties, useRef, useState } from "react";
import { PixelCard } from "@pixel-engine/react";
import type { PixelGridEffect, HoverMode } from "@pixel-engine/effects";
import { Button, FileControl, Section, SelectControl, ToggleControl, panelStyle } from "./controls";

const HOVER_MODES: HoverMode[] = ["classic", "reactive"];
const OVERLAY_MODES = ["none", "hybrid"] as const;
type OverlayMode = (typeof OVERLAY_MODES)[number];

const pageStyle: CSSProperties = {
  display: "flex",
  gap: 24,
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "20px 24px 60px",
  flexWrap: "wrap"
};

const siteMockStyle: CSSProperties = {
  width: 900,
  maxWidth: "90vw",
  background: "#0f172a",
  borderRadius: 16,
  padding: 32,
  border: "1px solid rgba(148, 163, 184, 0.15)"
};

const navStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 28,
  color: "#94a3b8",
  fontSize: 13
};

const heroGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: 24,
  alignItems: "center"
};

const heroTextStyle: CSSProperties = {
  color: "#e2e8f0"
};

const ctaStyle: CSSProperties = {
  marginTop: 16,
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: "#38bdf8",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer"
};

const cardOverlayContentStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  padding: 20,
  color: "#f8fafc"
};

export function CardDemo() {
  const gridRef = useRef<PixelGridEffect | null>(null);
  const [hoverMode, setHoverMode] = useState<HoverMode>("reactive");
  const [rippleOnClick, setRippleOnClick] = useState(true);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("hybrid");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imageObjectUrlRef = useRef<string | null>(null);

  function handleImageFile(file: File) {
    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    imageObjectUrlRef.current = objectUrl;
    setImageSrc(objectUrl);
  }

  return (
    <div style={pageStyle}>
      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Decorative card controls</div>
        <Section title="Interaction">
          <SelectControl label="hover mode" value={hoverMode} options={HOVER_MODES} onChange={setHoverMode} />
          <ToggleControl label="ripple on click" checked={rippleOnClick} onChange={setRippleOnClick} />
          <SelectControl
            label="overlay pointer events"
            value={overlayMode}
            options={OVERLAY_MODES}
            onChange={setOverlayMode}
          />
          <div style={{ fontSize: 11, color: "#64748b" }}>
            &quot;hybrid&quot; forwards pointer events from the DOM content on top of the canvas
            down to the engine, so hover/ripple keep working even though the card&apos;s text/button
            sit above it.
          </div>
        </Section>
        <Section title="Mask">
          <FileControl label="upload decorative image" onFile={handleImageFile} />
          {imageSrc && (
            <img
              src={imageSrc}
              alt="mask preview"
              style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)" }}
            />
          )}
        </Section>
        <Button onClick={() => gridRef.current?.triggerRipple(160, 100)}>Trigger ripple</Button>
      </div>

      <div style={siteMockStyle}>
        <div style={navStyle}>
          <strong style={{ color: "#e2e8f0" }}>acme.dev</strong>
          <span>Product · Pricing · Docs</span>
        </div>
        <div style={heroGridStyle}>
          <div style={heroTextStyle}>
            <h1 style={{ fontSize: 32, marginBottom: 8 }}>Ship interfaces that react.</h1>
            <p style={{ color: "#94a3b8" }}>
              This hero card uses <code>PixelCard</code> purely as a decorative background —
              the exact pattern for dropping the engine into an existing marketing page.
            </p>
            <button style={ctaStyle}>Get started</button>
          </div>

          <PixelCard
            preset="card-soft"
            width={320}
            height={220}
            mask={imageSrc ? { type: "image", src: imageSrc, scale: 2, sampleMode: "threshold" } : undefined}
            gridConfig={{ hoverEffects: { mode: hoverMode } }}
            influenceOptions={{ hover: true, ripple: rippleOnClick, organic: false }}
            rippleTrigger={rippleOnClick ? "click" : "none"}
            overlayPointerEvents={overlayMode}
            containerStyle={{ width: 320, height: 220, background: "#111827" }}
            onGridReady={(effect) => {
              gridRef.current = effect;
            }}
          >
            <div style={cardOverlayContentStyle}>
              <strong>Realtime canvas</strong>
              <span style={{ fontSize: 12, color: "#cbd5e1" }}>Hover / click to interact</span>
            </div>
          </PixelCard>
        </div>
      </div>
    </div>
  );
}
