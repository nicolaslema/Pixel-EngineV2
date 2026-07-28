import { CSSProperties, PropsWithChildren } from "react";

export const panelStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 10,
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  fontSize: 12,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  color: "#e2e8f0",
  minWidth: 300,
  maxWidth: 340,
  maxHeight: "calc(100vh - 48px)",
  overflow: "auto"
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  paddingTop: 8,
  borderTop: "1px solid rgba(148, 163, 184, 0.2)"
};

const sectionTitleStyle: CSSProperties = {
  fontWeight: 700,
  color: "#93c5fd"
};

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 8
};

const valueStyle: CSSProperties = { color: "#cbd5e1" };

const selectStyle: CSSProperties = {
  gridColumn: "1 / -1",
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  borderRadius: 6,
  padding: "4px 6px"
};

const buttonStyle: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 6,
  border: "1px solid rgba(148, 163, 184, 0.4)",
  background: "#1e293b",
  color: "#e2e8f0",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12
};

const textInputStyle: CSSProperties = {
  gridColumn: "1 / -1",
  background: "#111827",
  color: "#e5e7eb",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  borderRadius: 6,
  padding: "5px 7px",
  fontFamily: "inherit"
};

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      {children}
    </div>
  );
}

export function SliderControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={rowStyle}>
        <span>{label}</span>
        <span style={valueStyle}>{format ? format(value) : value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function ToggleControl({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label style={{ ...rowStyle, gridTemplateColumns: "1fr auto" }}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label style={rowStyle}>
      <span>{label}</span>
      <select style={selectStyle} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ColorControl({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={rowStyle}>
      <span>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function TextControl({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span>{label}</span>
      <input
        style={textInputStyle}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function FileControl({
  label,
  onFile
}: {
  label: string;
  onFile: (file: File) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span>{label}</span>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function Button({ children, onClick }: PropsWithChildren<{ onClick: () => void }>) {
  return (
    <button style={buttonStyle} onClick={onClick}>
      {children}
    </button>
  );
}
