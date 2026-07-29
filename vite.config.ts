import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@pixel-engine/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@pixel-engine/effects": resolve(__dirname, "packages/effects/src/index.ts"),
      "@pixel-engine/react": resolve(__dirname, "packages/react/src/index.ts")
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "PixelEngine",
      fileName: "pixel-engine"
    },
    rollupOptions: {
      external: []
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "packages/*/src/index.ts",
        "**/internal/test-utils/**"
      ]
    }
  }
});
