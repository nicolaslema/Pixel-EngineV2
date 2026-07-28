import { CSSProperties, useState } from "react";
import { Configurator } from "./Configurator";
import { CardDemo } from "./CardDemo";

const TABS = ["Configurator", "Card in a website"] as const;
type Tab = (typeof TABS)[number];

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  boxSizing: "border-box"
};

const headerStyle: CSSProperties = {
  padding: "20px 24px 0",
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const h1Style: CSSProperties = {
  fontSize: 20,
  margin: 0
};

const subtitleStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  margin: 0
};

const tabsStyle: CSSProperties = {
  display: "flex",
  gap: 4,
  borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
  paddingBottom: 0
};

function tabButtonStyle(active: boolean): CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: "8px 8px 0 0",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderBottom: active ? "1px solid #0b1020" : "1px solid rgba(148, 163, 184, 0.2)",
    background: active ? "#0b1020" : "transparent",
    color: active ? "#e2e8f0" : "#64748b",
    cursor: "pointer",
    fontSize: 13,
    marginBottom: -1
  };
}

export function App() {
  const [tab, setTab] = useState<Tab>("Configurator");

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <h1 style={h1Style}>Pixel Engine — React manual test</h1>
        <p style={subtitleStyle}>
          Exercises @pixel-engine/react against source (workspace alias) for interactive/visual
          QA. For a packaging-correctness check before a release, use{" "}
          <code>npm run smoke:consumer</code> instead.
        </p>
        <div style={tabsStyle}>
          {TABS.map((t) => (
            <button key={t} style={tabButtonStyle(t === tab)} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Configurator" ? <Configurator /> : <CardDemo />}
    </div>
  );
}
