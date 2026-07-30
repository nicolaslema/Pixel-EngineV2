import { CSSProperties, useMemo, useRef, useState } from "react";
import { PixelGridCanvas } from "@pixel-engine/react";
import type { PixelGridPresetName, PixelGridMaskInput } from "@pixel-engine/react";
import type { PixelGridEffect } from "@pixel-engine/effects";
import type {
  PixelGridConfig,
  PixelGridInfluenceOptions,
  HoverMode,
  MagneticHoverMode,
  ReactiveHoverScope,
  PixelGridDetailLevel,
  SampleMode,
  OrganicNoisePattern,
  OrganicNoisePosition,
  OrganicNoiseFalloff,
  WaveWobbleDirection,
  ScanLineDirection,
  ShockwaveTriggerMode
} from "@pixel-engine/effects";
import { Button, ColorControl, FileControl, Section, SelectControl, SliderControl, TextControl, ToggleControl, panelStyle } from "./controls";

const PRESETS: PixelGridPresetName[] = ["minimal", "card-soft", "card-ripple", "hero-image"];
const HOVER_MODES: HoverMode[] = ["classic", "reactive"];
const HOVER_SCOPES: ReactiveHoverScope[] = ["all", "activeOnly", "imageMask"];
const MAGNETIC_MODES: MagneticHoverMode[] = ["attract", "repel"];
const SAMPLE_MODES: SampleMode[] = ["alpha", "luminance", "threshold", "invert"];
const DETAIL_LEVELS: PixelGridDetailLevel[] = ["low", "medium", "high"];
const ORGANIC_NOISE_PATTERNS: OrganicNoisePattern[] = ["waves", "perlin", "cells", "turbulence"];
const ORGANIC_NOISE_POSITIONS: OrganicNoisePosition[] = ["center", "follow-mouse"];
const ORGANIC_NOISE_FALLOFFS: OrganicNoiseFalloff[] = ["radial", "none"];
const WAVE_WOBBLE_DIRECTIONS: WaveWobbleDirection[] = ["horizontal", "vertical", "both"];
const SCAN_LINE_DIRECTIONS: ScanLineDirection[] = ["horizontal", "vertical"];
const SHOCKWAVE_TRIGGER_MODES: ShockwaveTriggerMode[] = ["pointerDown", "hoverEnter", "both"];
const MASK_KINDS = ["none", "text", "image"] as const;
type MaskKind = (typeof MASK_KINDS)[number];

const pageStyle: CSSProperties = {
  display: "flex",
  gap: 20,
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "20px 24px 60px",
  flexWrap: "wrap"
};

const stageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12
};

const canvasFrameStyle: CSSProperties = {
  display: "block",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)"
};

const hintStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  maxWidth: 560,
  textAlign: "center"
};

const WIDTH = 760;
const HEIGHT = 480;

export function Configurator() {
  const gridRef = useRef<PixelGridEffect | null>(null);

  const [preset, setPreset] = useState<PixelGridPresetName>("card-soft");
  const [influenceOptions, setInfluenceOptions] = useState<PixelGridInfluenceOptions>({
    hover: true,
    ripple: true,
    organic: false
  });

  const [colors, setColors] = useState(["#334155", "#475569", "#64748b"]);
  const [canvasBackground, setCanvasBackground] = useState("#0b1020");
  const [gap, setGap] = useState(6);
  const [expandEase, setExpandEase] = useState(0.08);
  const [breathSpeed, setBreathSpeed] = useState(0.9);
  const [detail, setDetail] = useState<PixelGridDetailLevel>("medium");

  const [hoverMode, setHoverMode] = useState<HoverMode>("reactive");
  const [hoverScope, setHoverScope] = useState<ReactiveHoverScope>("all");
  const [hoverRadius, setHoverRadius] = useState(100);
  const [hoverStrength, setHoverStrength] = useState(1);
  const [hoverDeactivate, setHoverDeactivate] = useState(0.85);
  const [hoverDisplace, setHoverDisplace] = useState(4);
  const [hoverJitter, setHoverJitter] = useState(1.2);
  const [magneticEnabled, setMagneticEnabled] = useState(false);
  const [magneticMode, setMagneticMode] = useState<MagneticHoverMode>("attract");
  const [magneticStrength, setMagneticStrength] = useState(2.2);
  const [magneticRadius, setMagneticRadius] = useState(100);

  const [rippleEnabled, setRippleEnabled] = useState(true);
  const [rippleSpeed, setRippleSpeed] = useState(0.5);
  const [rippleThickness, setRippleThickness] = useState(50);
  const [rippleStrength, setRippleStrength] = useState(30);
  const [rippleMax, setRippleMax] = useState(50);

  const [breathingEnabled, setBreathingEnabled] = useState(true);
  const [breathingSpeed, setBreathingSpeed] = useState(1.9);
  const [breathingRadius, setBreathingRadius] = useState(140);
  const [breathingStrength, setBreathingStrength] = useState(0.6);
  const [breathingMinOpacity, setBreathingMinOpacity] = useState(0.45);
  const [breathingMaxOpacity, setBreathingMaxOpacity] = useState(1);

  const [organicNoiseEnabled, setOrganicNoiseEnabled] = useState(false);
  const [organicNoisePattern, setOrganicNoisePattern] = useState<OrganicNoisePattern>("waves");
  const [organicNoiseRadius, setOrganicNoiseRadius] = useState(150);
  const [organicNoiseStrength, setOrganicNoiseStrength] = useState(0.4);
  const [organicNoiseSpeed, setOrganicNoiseSpeed] = useState(0.002);
  const [organicNoiseScale, setOrganicNoiseScale] = useState(1);
  const [organicNoisePosition, setOrganicNoisePosition] = useState<OrganicNoisePosition>("center");
  const [organicNoiseFalloff, setOrganicNoiseFalloff] = useState<OrganicNoiseFalloff>("radial");
  // Playground default kept small/readable -- the library's real DEFAULT_NOISE_SEED is an
  // internal implementation constant (0x9e3779b9), not a friendly UI default.
  const [organicNoiseSeed, setOrganicNoiseSeed] = useState(1);

  const [waveWobbleEnabled, setWaveWobbleEnabled] = useState(false);
  const [waveWobbleAmplitude, setWaveWobbleAmplitude] = useState(6);
  const [waveWobbleFrequency, setWaveWobbleFrequency] = useState(0.02);
  const [waveWobbleSpeed, setWaveWobbleSpeed] = useState(1);
  const [waveWobbleDirection, setWaveWobbleDirection] = useState<WaveWobbleDirection>("both");

  const [cursorSpotlightEnabled, setCursorSpotlightEnabled] = useState(false);
  const [cursorSpotlightRadius, setCursorSpotlightRadius] = useState(180);
  const [cursorSpotlightFalloff, setCursorSpotlightFalloff] = useState(140);
  const [cursorSpotlightMinOpacity, setCursorSpotlightMinOpacity] = useState(0.12);

  const [chromaticBreathingEnabled, setChromaticBreathingEnabled] = useState(false);
  const [chromaticBreathingSpeed, setChromaticBreathingSpeed] = useState(1);

  const [scanLineRevealEnabled, setScanLineRevealEnabled] = useState(false);
  const [scanLineDirection, setScanLineDirection] = useState<ScanLineDirection>("horizontal");
  const [scanLineSpeed, setScanLineSpeed] = useState(80);
  const [scanLineBandWidth, setScanLineBandWidth] = useState(60);
  const [scanLineLoop, setScanLineLoop] = useState(true);

  const [magneticTrailEnabled, setMagneticTrailEnabled] = useState(false);
  const [magneticTrailRadius, setMagneticTrailRadius] = useState(90);
  const [magneticTrailStrength, setMagneticTrailStrength] = useState(1.2);
  const [magneticTrailLifetimeMs, setMagneticTrailLifetimeMs] = useState(500);
  const [magneticTrailMaxPoints, setMagneticTrailMaxPoints] = useState(24);

  const [glitchEnabled, setGlitchEnabled] = useState(false);
  const [glitchRadius, setGlitchRadius] = useState(70);
  const [glitchJitterAmount, setGlitchJitterAmount] = useState(4);
  const [glitchDurationMs, setGlitchDurationMs] = useState(220);
  const [glitchTriggerMode, setGlitchTriggerMode] = useState<ShockwaveTriggerMode>("pointerDown");

  const [gravityEnabled, setGravityEnabled] = useState(false);
  const [gravityStrength, setGravityStrength] = useState(0.0009);
  const [gravityFallDurationMs, setGravityFallDurationMs] = useState(650);

  const [constellationEnabled, setConstellationEnabled] = useState(false);
  const [constellationRadius, setConstellationRadius] = useState(140);
  const [constellationLinkDistance, setConstellationLinkDistance] = useState(45);
  const [constellationStrength, setConstellationStrength] = useState(1);

  const [maskKind, setMaskKind] = useState<MaskKind>("text");
  const [maskText, setMaskText] = useState("PIXEL");
  const [maskFontSize, setMaskFontSize] = useState(140);
  const [maskImageSrc, setMaskImageSrc] = useState<string | null>(null);
  const [maskSampleMode, setMaskSampleMode] = useState<SampleMode>("threshold");
  const [maskScale, setMaskScale] = useState(2);
  const imageObjectUrlRef = useRef<string | null>(null);

  function handleMaskImageFile(file: File) {
    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    imageObjectUrlRef.current = objectUrl;
    setMaskImageSrc(objectUrl);
  }

  const gridConfig: Partial<PixelGridConfig> = useMemo(
    () => ({
      colors,
      gap,
      expandEase,
      breathSpeed,
      canvasBackground,
      performance: { detail },
      hoverEffects: {
        mode: hoverMode,
        interactionScope: hoverScope,
        radius: hoverRadius,
        strength: hoverStrength,
        deactivate: hoverDeactivate,
        displace: hoverDisplace,
        jitter: hoverJitter,
        magnetic: {
          enabled: magneticEnabled,
          mode: magneticMode,
          strength: magneticStrength,
          radius: magneticRadius
        }
      },
      rippleEffects: {
        enabled: rippleEnabled,
        speed: rippleSpeed,
        thickness: rippleThickness,
        strength: rippleStrength,
        maxRipples: rippleMax
      },
      breathing: {
        enabled: breathingEnabled,
        speed: breathingSpeed,
        radius: breathingRadius,
        strength: breathingStrength,
        minOpacity: breathingMinOpacity,
        maxOpacity: breathingMaxOpacity
      },
      organicNoise: {
        enabled: organicNoiseEnabled,
        pattern: organicNoisePattern,
        radius: organicNoiseRadius,
        strength: organicNoiseStrength,
        speed: organicNoiseSpeed,
        scale: organicNoiseScale,
        position: organicNoisePosition,
        falloff: organicNoiseFalloff,
        seed: organicNoiseSeed
      },
      effects: {
        waveWobble: {
          enabled: waveWobbleEnabled,
          amplitude: waveWobbleAmplitude,
          frequency: waveWobbleFrequency,
          speed: waveWobbleSpeed,
          direction: waveWobbleDirection
        },
        cursorSpotlight: {
          enabled: cursorSpotlightEnabled,
          radius: cursorSpotlightRadius,
          falloff: cursorSpotlightFalloff,
          minOpacity: cursorSpotlightMinOpacity
        },
        chromaticBreathing: {
          enabled: chromaticBreathingEnabled,
          speed: chromaticBreathingSpeed
        },
        scanLineReveal: {
          enabled: scanLineRevealEnabled,
          direction: scanLineDirection,
          speed: scanLineSpeed,
          bandWidth: scanLineBandWidth,
          loop: scanLineLoop
        },
        magneticTrail: {
          enabled: magneticTrailEnabled,
          radius: magneticTrailRadius,
          strength: magneticTrailStrength,
          lifetimeMs: magneticTrailLifetimeMs,
          maxPoints: magneticTrailMaxPoints
        },
        glitchRgbSplit: {
          enabled: glitchEnabled,
          radius: glitchRadius,
          jitterAmount: glitchJitterAmount,
          durationMs: glitchDurationMs,
          triggerMode: glitchTriggerMode
        },
        gravityFallApart: {
          enabled: gravityEnabled,
          gravity: gravityStrength,
          fallDurationMs: gravityFallDurationMs
        },
        constellationConnect: {
          enabled: constellationEnabled,
          radius: constellationRadius,
          linkDistance: constellationLinkDistance,
          strength: constellationStrength
        }
      }
    }),
    [
      colors,
      gap,
      expandEase,
      breathSpeed,
      canvasBackground,
      detail,
      hoverMode,
      hoverScope,
      hoverRadius,
      hoverStrength,
      hoverDeactivate,
      hoverDisplace,
      hoverJitter,
      magneticEnabled,
      magneticMode,
      magneticStrength,
      magneticRadius,
      rippleEnabled,
      rippleSpeed,
      rippleThickness,
      rippleStrength,
      rippleMax,
      breathingEnabled,
      breathingSpeed,
      breathingRadius,
      breathingStrength,
      breathingMinOpacity,
      breathingMaxOpacity,
      organicNoiseEnabled,
      organicNoisePattern,
      organicNoiseRadius,
      organicNoiseStrength,
      organicNoiseSpeed,
      organicNoiseScale,
      organicNoisePosition,
      organicNoiseFalloff,
      organicNoiseSeed,
      waveWobbleEnabled,
      waveWobbleAmplitude,
      waveWobbleFrequency,
      waveWobbleSpeed,
      waveWobbleDirection,
      cursorSpotlightEnabled,
      cursorSpotlightRadius,
      cursorSpotlightFalloff,
      cursorSpotlightMinOpacity,
      chromaticBreathingEnabled,
      chromaticBreathingSpeed,
      scanLineRevealEnabled,
      scanLineDirection,
      scanLineSpeed,
      scanLineBandWidth,
      scanLineLoop,
      magneticTrailEnabled,
      magneticTrailRadius,
      magneticTrailStrength,
      magneticTrailLifetimeMs,
      magneticTrailMaxPoints,
      glitchEnabled,
      glitchRadius,
      glitchJitterAmount,
      glitchDurationMs,
      glitchTriggerMode,
      gravityEnabled,
      gravityStrength,
      gravityFallDurationMs,
      constellationEnabled,
      constellationRadius,
      constellationLinkDistance,
      constellationStrength
    ]
  );

  const mask: PixelGridMaskInput | undefined = useMemo(() => {
    if (maskKind === "text") {
      return { type: "text", text: maskText || "PIXEL", fontSize: maskFontSize };
    }
    if (maskKind === "image" && maskImageSrc) {
      return { type: "image", src: maskImageSrc, scale: maskScale, sampleMode: maskSampleMode };
    }
    return undefined;
  }, [maskKind, maskText, maskFontSize, maskImageSrc, maskScale, maskSampleMode]);

  function setColorAt(index: number, value: string) {
    setColors((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  return (
    <div style={pageStyle}>
      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Grid config</div>

        <Section title="Preset">
          <SelectControl label="preset" value={preset} options={PRESETS} onChange={setPreset} />
          <div style={{ fontSize: 11, color: "#64748b" }}>
            gridConfig below overrides the preset (same merge order a real consumer gets:
            preset → gridConfig → mask).
          </div>
        </Section>

        <Section title="Base">
          <ColorControl label="color 1" value={colors[0]} onChange={(v) => setColorAt(0, v)} />
          <ColorControl label="color 2" value={colors[1]} onChange={(v) => setColorAt(1, v)} />
          <ColorControl label="color 3" value={colors[2]} onChange={(v) => setColorAt(2, v)} />
          <ColorControl label="canvas background" value={canvasBackground} onChange={setCanvasBackground} />
          <SliderControl label="gap" min={2} max={20} step={1} value={gap} onChange={setGap} />
          <SliderControl
            label="expandEase"
            min={0.02}
            max={0.3}
            step={0.01}
            value={expandEase}
            onChange={setExpandEase}
          />
          <SliderControl
            label="breathSpeed"
            min={0.1}
            max={3}
            step={0.05}
            value={breathSpeed}
            onChange={setBreathSpeed}
          />
          <SelectControl label="performance.detail" value={detail} options={DETAIL_LEVELS} onChange={setDetail} />
        </Section>

        <Section title="Influences">
          <ToggleControl
            label="hover enabled"
            checked={!!influenceOptions.hover}
            onChange={(v) => setInfluenceOptions((prev) => ({ ...prev, hover: v }))}
          />
          <ToggleControl
            label="ripple enabled"
            checked={!!influenceOptions.ripple}
            onChange={(v) => setInfluenceOptions((prev) => ({ ...prev, ripple: v }))}
          />
          <ToggleControl
            label="organic noise enabled"
            checked={!!influenceOptions.organic}
            onChange={(v) => setInfluenceOptions((prev) => ({ ...prev, organic: v }))}
          />
        </Section>

        <Section title="Hover (mouse interaction)">
          <SelectControl label="mode" value={hoverMode} options={HOVER_MODES} onChange={setHoverMode} />
          <SelectControl label="interactionScope" value={hoverScope} options={HOVER_SCOPES} onChange={setHoverScope} />
          <SliderControl label="radius" min={20} max={260} step={5} value={hoverRadius} onChange={setHoverRadius} />
          <SliderControl
            label="strength"
            min={0}
            max={2}
            step={0.05}
            value={hoverStrength}
            onChange={setHoverStrength}
          />
          <SliderControl
            label="deactivate"
            min={0}
            max={1}
            step={0.01}
            value={hoverDeactivate}
            onChange={setHoverDeactivate}
          />
          <SliderControl
            label="displace (reactive)"
            min={0}
            max={12}
            step={0.5}
            value={hoverDisplace}
            onChange={setHoverDisplace}
          />
          <SliderControl
            label="jitter (reactive)"
            min={0}
            max={4}
            step={0.1}
            value={hoverJitter}
            onChange={setHoverJitter}
          />
          <ToggleControl label="magnetic enabled" checked={magneticEnabled} onChange={setMagneticEnabled} />
          <SelectControl label="magnetic mode" value={magneticMode} options={MAGNETIC_MODES} onChange={setMagneticMode} />
          <SliderControl
            label="magnetic strength"
            min={0}
            max={6}
            step={0.1}
            value={magneticStrength}
            onChange={setMagneticStrength}
          />
          <SliderControl
            label="magnetic radius"
            min={20}
            max={260}
            step={5}
            value={magneticRadius}
            onChange={setMagneticRadius}
          />
          {magneticEnabled && hoverMode === "reactive" && (hoverDisplace > 0 || hoverJitter > 0) && (
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Tip: with mode = reactive, `displace`/`jitter` also move cells (pushing them away
              from the cursor) at the same time as magnetic — the two can fight each other. Set
              mode = classic, or displace/jitter to 0, to see magnetic on its own.
            </div>
          )}
        </Section>

        <Section title="Ripple">
          <ToggleControl label="enabled" checked={rippleEnabled} onChange={setRippleEnabled} />
          <SliderControl label="speed" min={0.1} max={1.5} step={0.02} value={rippleSpeed} onChange={setRippleSpeed} />
          <SliderControl
            label="thickness"
            min={10}
            max={100}
            step={2}
            value={rippleThickness}
            onChange={setRippleThickness}
          />
          <SliderControl
            label="strength"
            min={5}
            max={60}
            step={1}
            value={rippleStrength}
            onChange={setRippleStrength}
          />
          <SliderControl label="maxRipples" min={4} max={80} step={2} value={rippleMax} onChange={setRippleMax} />
          <Button onClick={() => gridRef.current?.triggerRipple(WIDTH / 2, HEIGHT / 2)}>
            Trigger ripple (center)
          </Button>
        </Section>

        <Section title="Breathing">
          <ToggleControl label="enabled" checked={breathingEnabled} onChange={setBreathingEnabled} />
          <SliderControl
            label="speed"
            min={0.1}
            max={4}
            step={0.1}
            value={breathingSpeed}
            onChange={setBreathingSpeed}
          />
          <SliderControl
            label="radius"
            min={20}
            max={300}
            step={5}
            value={breathingRadius}
            onChange={setBreathingRadius}
          />
          <SliderControl
            label="strength"
            min={0}
            max={1}
            step={0.02}
            value={breathingStrength}
            onChange={setBreathingStrength}
          />
          <SliderControl
            label="minOpacity"
            min={0}
            max={1}
            step={0.02}
            value={breathingMinOpacity}
            onChange={setBreathingMinOpacity}
          />
          <SliderControl
            label="maxOpacity"
            min={0}
            max={1}
            step={0.02}
            value={breathingMaxOpacity}
            onChange={setBreathingMaxOpacity}
          />
        </Section>

        <Section title="Organic noise">
          <ToggleControl
            label="enabled (organicNoise.enabled)"
            checked={organicNoiseEnabled}
            onChange={setOrganicNoiseEnabled}
          />
          <div style={{ fontSize: 11, color: "#64748b" }}>
            OR&apos;d with the &quot;organic noise enabled&quot; toggle in Influences above --
            either one turns it on.
          </div>
          <SelectControl
            label="pattern"
            value={organicNoisePattern}
            options={ORGANIC_NOISE_PATTERNS}
            onChange={setOrganicNoisePattern}
          />
          <SliderControl
            label="radius"
            min={20}
            max={400}
            step={10}
            value={organicNoiseRadius}
            onChange={setOrganicNoiseRadius}
          />
          <SliderControl
            label="strength"
            min={0}
            max={2}
            step={0.05}
            value={organicNoiseStrength}
            onChange={setOrganicNoiseStrength}
          />
          <SliderControl
            label="speed"
            min={0}
            max={0.02}
            step={0.001}
            value={organicNoiseSpeed}
            onChange={setOrganicNoiseSpeed}
          />
          <SliderControl
            label="scale"
            min={0.2}
            max={4}
            step={0.1}
            value={organicNoiseScale}
            onChange={setOrganicNoiseScale}
          />
          <SelectControl
            label="position"
            value={organicNoisePosition}
            options={ORGANIC_NOISE_POSITIONS}
            onChange={setOrganicNoisePosition}
          />
          <SelectControl
            label="falloff"
            value={organicNoiseFalloff}
            options={ORGANIC_NOISE_FALLOFFS}
            onChange={setOrganicNoiseFalloff}
          />
          <SliderControl
            label="seed"
            min={0}
            max={9999}
            step={1}
            value={organicNoiseSeed}
            onChange={setOrganicNoiseSeed}
          />
        </Section>

        <Section title="Post-effects">
          <div style={{ fontWeight: 600, fontSize: 12 }}>Wave / wobble</div>
          <ToggleControl
            label="enabled (effects.waveWobble.enabled)"
            checked={waveWobbleEnabled}
            onChange={setWaveWobbleEnabled}
          />
          <SliderControl
            label="amplitude"
            min={0}
            max={20}
            step={1}
            value={waveWobbleAmplitude}
            onChange={setWaveWobbleAmplitude}
          />
          <SliderControl
            label="frequency"
            min={0}
            max={0.05}
            step={0.002}
            value={waveWobbleFrequency}
            onChange={setWaveWobbleFrequency}
          />
          <SliderControl
            label="speed"
            min={0}
            max={3}
            step={0.1}
            value={waveWobbleSpeed}
            onChange={setWaveWobbleSpeed}
          />
          <SelectControl
            label="direction"
            value={waveWobbleDirection}
            options={WAVE_WOBBLE_DIRECTIONS}
            onChange={setWaveWobbleDirection}
          />

          <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8 }}>
            Cursor spotlight (inverso)
          </div>
          <ToggleControl
            label="enabled (effects.cursorSpotlight.enabled)"
            checked={cursorSpotlightEnabled}
            onChange={setCursorSpotlightEnabled}
          />
          <SliderControl
            label="radius"
            min={40}
            max={400}
            step={10}
            value={cursorSpotlightRadius}
            onChange={setCursorSpotlightRadius}
          />
          <SliderControl
            label="falloff"
            min={0}
            max={300}
            step={10}
            value={cursorSpotlightFalloff}
            onChange={setCursorSpotlightFalloff}
          />
          <SliderControl
            label="minOpacity"
            min={0}
            max={1}
            step={0.05}
            value={cursorSpotlightMinOpacity}
            onChange={setCursorSpotlightMinOpacity}
          />

          <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8 }}>Chromatic breathing</div>
          <ToggleControl
            label="enabled (effects.chromaticBreathing.enabled)"
            checked={chromaticBreathingEnabled}
            onChange={setChromaticBreathingEnabled}
          />
          <SliderControl
            label="speed"
            min={0}
            max={3}
            step={0.1}
            value={chromaticBreathingSpeed}
            onChange={setChromaticBreathingSpeed}
          />
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Uses the grid&apos;s colors as its palette (no dedicated palette override control
            here yet, same as `organicNoises[]` above).
          </div>

          <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8 }}>Scan line / reveal</div>
          <ToggleControl
            label="enabled (effects.scanLineReveal.enabled)"
            checked={scanLineRevealEnabled}
            onChange={setScanLineRevealEnabled}
          />
          <SelectControl
            label="direction"
            value={scanLineDirection}
            options={SCAN_LINE_DIRECTIONS}
            onChange={setScanLineDirection}
          />
          <SliderControl
            label="speed"
            min={0}
            max={300}
            step={10}
            value={scanLineSpeed}
            onChange={setScanLineSpeed}
          />
          <SliderControl
            label="bandWidth"
            min={1}
            max={200}
            step={5}
            value={scanLineBandWidth}
            onChange={setScanLineBandWidth}
          />
          <ToggleControl label="loop" checked={scanLineLoop} onChange={setScanLineLoop} />

          <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8 }}>Magnetic trail</div>
          <ToggleControl
            label="enabled (effects.magneticTrail.enabled)"
            checked={magneticTrailEnabled}
            onChange={setMagneticTrailEnabled}
          />
          <SliderControl
            label="radius"
            min={20}
            max={300}
            step={10}
            value={magneticTrailRadius}
            onChange={setMagneticTrailRadius}
          />
          <SliderControl
            label="strength"
            min={0}
            max={3}
            step={0.1}
            value={magneticTrailStrength}
            onChange={setMagneticTrailStrength}
          />
          <SliderControl
            label="lifetimeMs"
            min={50}
            max={2000}
            step={50}
            value={magneticTrailLifetimeMs}
            onChange={setMagneticTrailLifetimeMs}
          />
          <SliderControl
            label="maxPoints"
            min={1}
            max={64}
            step={1}
            value={magneticTrailMaxPoints}
            onChange={setMagneticTrailMaxPoints}
          />

          <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8 }}>Glitch / RGB split</div>
          <ToggleControl
            label="enabled (effects.glitchRgbSplit.enabled)"
            checked={glitchEnabled}
            onChange={setGlitchEnabled}
          />
          <SliderControl
            label="radius"
            min={10}
            max={300}
            step={10}
            value={glitchRadius}
            onChange={setGlitchRadius}
          />
          <SliderControl
            label="jitterAmount"
            min={0}
            max={20}
            step={1}
            value={glitchJitterAmount}
            onChange={setGlitchJitterAmount}
          />
          <SliderControl
            label="durationMs"
            min={50}
            max={1000}
            step={10}
            value={glitchDurationMs}
            onChange={setGlitchDurationMs}
          />
          <SelectControl
            label="triggerMode"
            value={glitchTriggerMode}
            options={SHOCKWAVE_TRIGGER_MODES}
            onChange={setGlitchTriggerMode}
          />

          <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8 }}>Gravity / fall apart</div>
          <ToggleControl
            label="enabled (effects.gravityFallApart.enabled)"
            checked={gravityEnabled}
            onChange={setGravityEnabled}
          />
          <SliderControl
            label="gravity"
            min={0.0001}
            max={0.01}
            step={0.0001}
            value={gravityStrength}
            onChange={setGravityStrength}
          />
          <SliderControl
            label="fallDurationMs"
            min={100}
            max={3000}
            step={50}
            value={gravityFallDurationMs}
            onChange={setGravityFallDurationMs}
          />
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Triggers when a cell crosses from active to inactive (e.g. toggling hover
            `deactivate`, or a mask/timeline step turning a region off).
          </div>

          <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8 }}>Constellation / connect</div>
          <ToggleControl
            label="enabled (effects.constellationConnect.enabled)"
            checked={constellationEnabled}
            onChange={setConstellationEnabled}
          />
          <SliderControl
            label="radius"
            min={20}
            max={400}
            step={10}
            value={constellationRadius}
            onChange={setConstellationRadius}
          />
          <SliderControl
            label="linkDistance"
            min={5}
            max={150}
            step={5}
            value={constellationLinkDistance}
            onChange={setConstellationLinkDistance}
          />
          <SliderControl
            label="strength"
            min={0}
            max={2}
            step={0.1}
            value={constellationStrength}
            onChange={setConstellationStrength}
          />
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Opacity-only glow -- most visible on cells already below full opacity (e.g. combined
            with breathing or cursor spotlight).
          </div>
        </Section>
      </div>

      <div style={stageStyle}>
        <PixelGridCanvas
          key={preset}
          preset={preset}
          gridConfig={gridConfig}
          mask={mask}
          influenceOptions={influenceOptions}
          width={WIDTH}
          height={HEIGHT}
          style={{ ...canvasFrameStyle, width: WIDTH, height: HEIGHT }}
          onGridReady={(effect) => {
            gridRef.current = effect;
          }}
        />
        <p style={hintStyle}>
          Hover/click the canvas to test mouse interaction. Changing a control updates
          `gridConfig`/`mask`/`influenceOptions` and the effect rebuilds on the next render
          (same lifecycle a real `PixelGridCanvas` consumer gets).
        </p>
      </div>

      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Mask</div>
        <Section title="Source">
          <SelectControl label="kind" value={maskKind} options={MASK_KINDS} onChange={setMaskKind} />
          {maskKind === "text" && (
            <>
              <TextControl label="text" value={maskText} onChange={setMaskText} placeholder="PIXEL" />
              <SliderControl
                label="fontSize"
                min={40}
                max={220}
                step={5}
                value={maskFontSize}
                onChange={setMaskFontSize}
              />
            </>
          )}
          {maskKind === "image" && (
            <>
              <FileControl label="upload image" onFile={handleMaskImageFile} />
              {maskImageSrc && (
                <img
                  src={maskImageSrc}
                  alt="mask preview"
                  style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)" }}
                />
              )}
              <SelectControl
                label="sampleMode"
                value={maskSampleMode}
                options={SAMPLE_MODES}
                onChange={setMaskSampleMode}
              />
              <SliderControl label="scale" min={0.1} max={4} step={0.1} value={maskScale} onChange={setMaskScale} />
            </>
          )}
          {maskKind === "none" && (
            <div style={{ fontSize: 11, color: "#64748b" }}>No mask — the grid stays fully expanded/idle.</div>
          )}
        </Section>
      </div>
    </div>
  );
}
