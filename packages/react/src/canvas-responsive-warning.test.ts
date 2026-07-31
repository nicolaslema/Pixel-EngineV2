import { describe, expect, it } from "vitest";
import { getResponsiveCanvasStyleWarning } from "./canvas-responsive-warning";

describe("getResponsiveCanvasStyleWarning", () => {
  it("returns null when fitMode is client, regardless of style", () => {
    expect(getResponsiveCanvasStyleWarning({ width: "100%" }, "client")).toBeNull();
    expect(getResponsiveCanvasStyleWarning({ height: "100vh" }, "client")).toBeNull();
  });

  it("warns when style.width looks responsive and fitMode is not client", () => {
    expect(getResponsiveCanvasStyleWarning({ width: "50%" }, undefined)).toContain("fitMode");
    expect(getResponsiveCanvasStyleWarning({ width: "50%" }, "none")).toContain("fitMode");
  });

  it("warns when style.height looks responsive (vh/vw/auto/fit-content)", () => {
    expect(getResponsiveCanvasStyleWarning({ height: "100vh" }, "none")).not.toBeNull();
    expect(getResponsiveCanvasStyleWarning({ width: "50vw" }, "none")).not.toBeNull();
    expect(getResponsiveCanvasStyleWarning({ width: "auto" }, "none")).not.toBeNull();
    expect(getResponsiveCanvasStyleWarning({ width: "fit-content" }, "none")).not.toBeNull();
  });

  it("does not warn for a fixed px string or a plain number", () => {
    expect(getResponsiveCanvasStyleWarning({ width: "900px" }, "none")).toBeNull();
    expect(getResponsiveCanvasStyleWarning({ width: 900 }, "none")).toBeNull();
  });

  it("does not warn when style is undefined", () => {
    expect(getResponsiveCanvasStyleWarning(undefined, "none")).toBeNull();
  });
});
