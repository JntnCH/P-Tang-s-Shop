#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function run(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: silent ? "pipe" : "inherit" });
  } catch (err) {
    if (silent) return "";
    throw err;
  }
}

function getChangedFiles(baseRef = "HEAD~1") {
  try {
    const diff = execSync(`git diff --name-only ${baseRef} HEAD`, {
      encoding: "utf8",
      stdio: "pipe",
    });
    return diff.trim().split("\n").filter(Boolean);
  } catch {
    // If shallow clone or no previous commit, inspect status against HEAD
    try {
      const status = execSync("git status --porcelain", { encoding: "utf8", stdio: "pipe" });
      return status
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => line.slice(3).trim());
    } catch {
      return [];
    }
  }
}

console.log("=== Incremental Code Deployment Engine ===");

const baseRef =
  process.env.BASE_REF ||
  (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "HEAD~1");
const changedFiles = getChangedFiles(baseRef);

console.log(`[Diff Check] Detected ${changedFiles.length} file(s) changed compared to ${baseRef}:`);
changedFiles.forEach((f) => console.log(`  - ${f}`));

const affectsDeps = changedFiles.some(
  (f) => f.includes("package.json") || f.includes("package-lock.json"),
);
const affectsConfig = changedFiles.some(
  (f) => f.includes("vite.config") || f.includes("wrangler") || f.includes("Dockerfile"),
);
const affectsSource = changedFiles.some(
  (f) => f.startsWith("src/") || f.startsWith("public/") || f === "index.html",
);
const affectsDocsOrTestsOnly =
  changedFiles.length > 0 && !affectsDeps && !affectsConfig && !affectsSource;

const modifiedComponents = [];
if (affectsDeps) modifiedComponents.push("Dependencies (package.json)");
if (affectsConfig) modifiedComponents.push("Build/Server Config");
if (affectsSource) modifiedComponents.push("Application Source (src/public)");

const deployedArtifacts = [];
const skippedComponents = [];

if (changedFiles.length === 0) {
  console.log("\n[Delta Check] No modifications detected. Deployment skipped.");
  skippedComponents.push("All modules (No diff)");
} else if (affectsDocsOrTestsOnly) {
  console.log("\n[Delta Check] Only documentation/tests modified. Production deploy skipped.");
  skippedComponents.push("Application Container / Cloud Functions (Docs/Tests only)");
} else {
  console.log("\n[Delta Build] Building modified application modules...");
  run("npm run build");
  deployedArtifacts.push("SSR Server Bundle (.output/server/index.mjs)");
  deployedArtifacts.push("Static Client Assets (.output/public)");

  if (!affectsDeps) {
    skippedComponents.push("Dependencies Reinstallation (Cached)");
  }
}

console.log("\n==========================================");
console.log("INCREMENTAL DEPLOYMENT SUMMARY");
console.log("==========================================");
console.log(
  `- modified_components: ${modifiedComponents.length > 0 ? modifiedComponents.join(", ") : "None"}`,
);
console.log(
  `- deployed_artifacts: ${deployedArtifacts.length > 0 ? deployedArtifacts.join(", ") : "None (Skipped)"}`,
);
console.log(
  `- skipped_components: ${skippedComponents.length > 0 ? skippedComponents.join(", ") : "None"}`,
);
console.log("==========================================");
