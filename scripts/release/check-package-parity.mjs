import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const PARITY_GROUPS = [
  {
    name: "core:core",
    sourceDir: "packages/core/src/core",
    mirrorDir: "src/core"
  },
  {
    name: "core:input",
    sourceDir: "packages/core/src/input",
    mirrorDir: "src/input"
  },
  {
    name: "core:scene",
    sourceDir: "packages/core/src/scene",
    mirrorDir: "src/scene"
  },
  {
    name: "core:renderers",
    sourceDir: "packages/core/src/renderers",
    mirrorDir: "src/renderers"
  },
  {
    name: "core:grid",
    sourceDir: "packages/core/src/grid",
    mirrorDir: "src/grid"
  },
  {
    name: "core:utils",
    sourceDir: "packages/core/src/utils",
    mirrorDir: "src/utils"
  },
  {
    name: "effects:entities",
    sourceDir: "packages/effects/src/entities",
    mirrorDir: "src/entities"
  },
  {
    name: "effects:influences",
    sourceDir: "packages/effects/src/influences",
    mirrorDir: "src/influences"
  }
];

const SOURCE_FILE_REGEX = /\.ts$/;
const EXCLUDED_FILE_REGEX = /(\.test\.ts|\.spec\.ts|__snapshots__|\.snap$)/;

function normalizeForParity(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/^\s*import[\s\S]*?;\s*$/gm, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function listSourceFiles(rootDir) {
  const absoluteRoot = path.resolve(repoRoot, rootDir);
  const files = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__snapshots__") continue;
        await walk(fullPath);
        continue;
      }
      const relFromRoot = path.relative(absoluteRoot, fullPath).replace(/\\/g, "/");
      if (!SOURCE_FILE_REGEX.test(relFromRoot)) continue;
      if (EXCLUDED_FILE_REGEX.test(relFromRoot)) continue;
      files.push(relFromRoot);
    }
  }

  await walk(absoluteRoot);
  return files.sort();
}

async function runGroupCheck(group) {
  const issues = [];
  const sourceFiles = await listSourceFiles(group.sourceDir);
  const mirrorFiles = await listSourceFiles(group.mirrorDir);
  const sourceFileSet = new Set(sourceFiles);
  const mirrorFileSet = new Set(mirrorFiles);
  const sourceRoot = path.resolve(repoRoot, group.sourceDir);
  const mirrorRoot = path.resolve(repoRoot, group.mirrorDir);

  for (const relFile of sourceFiles) {
    if (!mirrorFileSet.has(relFile)) {
      issues.push(`[${group.name}] Missing mirror file: ${path.posix.join(group.mirrorDir.replace(/\\/g, "/"), relFile)}`);
    }
  }

  for (const relFile of mirrorFiles) {
    if (!sourceFileSet.has(relFile)) {
      issues.push(`[${group.name}] Unexpected mirror file (missing source): ${path.posix.join(group.mirrorDir.replace(/\\/g, "/"), relFile)}`);
    }
  }

  const comparableFiles = sourceFiles.filter((relFile) => mirrorFileSet.has(relFile));
  for (const relFile of comparableFiles) {
    const sourceFile = path.join(sourceRoot, relFile);
    const mirrorFile = path.join(mirrorRoot, relFile);

    const [sourceContent, mirrorContent] = await Promise.all([
      fs.readFile(sourceFile, "utf8"),
      fs.readFile(mirrorFile, "utf8")
    ]);

    const normalizedSource = normalizeForParity(sourceContent);
    const normalizedMirror = normalizeForParity(mirrorContent);

    if (normalizedSource !== normalizedMirror) {
      issues.push(`[${group.name}] Content drift: ${path.posix.join(group.sourceDir.replace(/\\/g, "/"), relFile)} <> ${path.posix.join(group.mirrorDir.replace(/\\/g, "/"), relFile)}`);
    }
  }

  return issues;
}

async function main() {
  const allIssues = [];
  for (const group of PARITY_GROUPS) {
    // eslint-disable-next-line no-await-in-loop
    const issues = await runGroupCheck(group);
    allIssues.push(...issues);
  }

  if (allIssues.length > 0) {
    console.error("package-parity-check: FAILED");
    for (const issue of allIssues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log("package-parity-check: OK");
}

main().catch((error) => {
  console.error("package-parity-check: FAILED with exception");
  console.error(error);
  process.exit(1);
});
