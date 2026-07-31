import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const EXPECTED = '"use client";';
const files = [
  resolve(root, "packages/react/dist/index.js"),
  resolve(root, "packages/react/dist/index.mjs")
];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const firstLine = content.split("\n")[0].trim();
  if (firstLine !== EXPECTED) {
    throw new Error(
      `${file}: expected first line to be ${EXPECTED}, got ${JSON.stringify(firstLine)}. ` +
        `@pixel-engine/react is client-only (hooks/refs/canvas throughout) -- without this ` +
        `directive as the literal first line of the bundle, Next.js App Router consumers get ` +
        `a build error importing any component. Check packages/react/tsup.config.ts's "banner" option.`
    );
  }
}

console.log("check-use-client-directive: OK (dist/index.js, dist/index.mjs)");
