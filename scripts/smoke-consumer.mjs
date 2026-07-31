import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = resolve(process.cwd());
const smokeRoot = mkdtempSync(join(tmpdir(), "pixel-engine-smoke-"));
const packsDir = join(smokeRoot, "packs");
const appDir = join(smokeRoot, "consumer-app");

mkdirSync(packsDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

function run(command, cwd = repoRoot) {
  execSync(command, {
    cwd,
    stdio: "inherit"
  });
}

function findPack(prefix) {
  const files = readdirSync(packsDir);
  const match = files.find((file) => file.startsWith(prefix) && file.endsWith(".tgz"));
  if (!match) {
    throw new Error(`Missing tarball for ${prefix}`);
  }
  return join(packsDir, match);
}

try {
  run(`npm pack --pack-destination "${packsDir}"`);
  run(`npm pack --pack-destination "${packsDir}" -w @pixel-engine/core`);
  run(`npm pack --pack-destination "${packsDir}" -w @pixel-engine/effects`);
  run(`npm pack --pack-destination "${packsDir}" -w @pixel-engine/react`);

  const aggregateTgz = findPack("pixel-engine-");
  const coreTgz = findPack("pixel-engine-core-");
  const effectsTgz = findPack("pixel-engine-effects-");
  const reactTgz = findPack("pixel-engine-react-");

  writeFileSync(
    join(appDir, "package.json"),
    JSON.stringify(
      {
        name: "pixel-engine-smoke-consumer",
        private: true,
        type: "module"
      },
      null,
      2
    )
  );

  writeFileSync(
    join(appDir, "smoke.mjs"),
    [
      'import { createRequire } from "node:module";',
      'import { PixelEngine as CoreEngine } from "@pixel-engine/core";',
      'import { PixelGridEffect as EffectsGrid } from "@pixel-engine/effects";',
      'import { PixelGridCanvas, PixelCanvas, PixelCard, usePixelGridEffect } from "@pixel-engine/react";',
      'import { PixelEngine as AggregateEngine, PixelGridEffect as AggregateGrid } from "pixel-engine";',
      "",
      "const require = createRequire(import.meta.url);",
      'const cjsCore = require("@pixel-engine/core");',
      'const cjsEffects = require("@pixel-engine/effects");',
      'const cjsAggregate = require("pixel-engine");',
      "",
      "if (typeof CoreEngine !== 'function') throw new Error('Missing CoreEngine export');",
      "if (typeof EffectsGrid !== 'function') throw new Error('Missing EffectsGrid export');",
      "if (typeof AggregateEngine !== 'function') throw new Error('Missing aggregate CoreEngine export');",
      "if (typeof AggregateGrid !== 'function') throw new Error('Missing aggregate EffectsGrid export');",
      "if (AggregateEngine !== CoreEngine) throw new Error('ESM boundary mismatch: pixel-engine PixelEngine differs from @pixel-engine/core');",
      "if (AggregateGrid !== EffectsGrid) throw new Error('ESM boundary mismatch: pixel-engine PixelGridEffect differs from @pixel-engine/effects');",
      "if (cjsAggregate.PixelEngine !== cjsCore.PixelEngine) throw new Error('CJS boundary mismatch: pixel-engine PixelEngine differs from @pixel-engine/core');",
      "if (cjsAggregate.PixelGridEffect !== cjsEffects.PixelGridEffect) throw new Error('CJS boundary mismatch: pixel-engine PixelGridEffect differs from @pixel-engine/effects');",
      // forwardRef-wrapped components (item 5.15) are objects (`$$typeof: Symbol(react.forward_ref)`),
      // not functions -- check for a rendered element type instead of `typeof === 'function'`.
      "if (PixelGridCanvas == null) throw new Error('Missing React PixelGridCanvas export');",
      "if (PixelCanvas == null) throw new Error('Missing React PixelCanvas export');",
      "if (PixelCard == null) throw new Error('Missing React PixelCard export');",
      "if (typeof usePixelGridEffect !== 'function') throw new Error('Missing React usePixelGridEffect export');",
      "console.log('Smoke consumer import + package-boundary check passed');"
    ].join("\n")
  );

  run(
    [
      "npm install --no-package-lock --ignore-scripts",
      "react react-dom",
      `"${coreTgz}"`,
      `"${effectsTgz}"`,
      `"${reactTgz}"`,
      `"${aggregateTgz}"`
    ].join(" "),
    appDir
  );

  run("node smoke.mjs", appDir);
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}
