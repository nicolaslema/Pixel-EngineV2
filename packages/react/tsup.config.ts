import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  external: ["react", "react-dom"],
  // Required for Next.js App Router: every export in this package uses hooks/refs/canvas,
  // so it's client-only. `splitting: false` means one output file per format, so this
  // banner is the single source of truth (don't also add the directive to src/index.ts --
  // esbuild hoists it as its own duplicate directive above this one, which is harmless but
  // sloppy). Verified by `scripts/check-use-client-directive.mjs` (`npm run check:use-client`).
  banner: { js: '"use client";' }
});
