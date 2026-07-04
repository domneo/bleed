/**
 * # Build orchestrator
 * Style Dictionary for tokens, plus dependency-free concatenation for shipped bundles.
 * Ships as three dist files: base.css, components.css, themes.css — each loads once,
 * unconditionally; theming picks a theme via [data-theme] on the root. base.css and
 * themes.css copy straight into dist/ unmodified; components.css is assembled by
 * concatenating every component group.
 *
 * Usage:
 *  - node scripts/build.js   -> generate tokens, then concat into dist/
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { buildTokens, THEMES } from "../sd.config.js";

const ROOT = new URL("../", import.meta.url).pathname;

// component groups
const GROUPS = [
  { name: "CORE", dir: "src/components/core" },
  { name: "FINANCE", dir: "src/components/finance" },
];

// lists the .css files inside a given source directory, returning them as bundle-ready relative paths
function cssFiles(dir) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith(".css"))
    .sort()
    .map((f) => join(dir, f));
}

// returns file contents
function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8").trimEnd() + "\n";
}

// builds dist/components.css: every component group, concatenated.
function assembleComponents() {
  let out = "";
  for (const group of GROUPS) {
    for (const file of cssFiles(group.dir)) {
      out += read(file);
    }
  }
  return out;
}

// --- main ----------------------------------------------------------------------

// build tokens
console.log("› building tokens...");
await buildTokens();
console.log(`› wrote src/foundations/themes.css (${THEMES.length} themes)`);

// build css files into dist
if (!existsSync(join(ROOT, "dist"))) mkdirSync(join(ROOT, "dist"), { recursive: true });

copyFileSync(join(ROOT, "src/foundations/base.css"), join(ROOT, "dist/base.css"));
console.log("› copied dist/base.css");

copyFileSync(join(ROOT, "src/foundations/themes.css"), join(ROOT, "dist/themes.css"));
console.log("› copied dist/themes.css");

copyFileSync(join(ROOT, "src/foundations/fonts.css"), join(ROOT, "dist/fonts.css"));
console.log("› copied dist/fonts.css");

// copy font files into dist/fonts (fonts.css references them via a relative ../fonts/ path)
const fontsSrcDir = join(ROOT, "src/fonts");
const fontsDistDir = join(ROOT, "dist/fonts");
if (existsSync(fontsSrcDir)) {
  if (!existsSync(fontsDistDir)) mkdirSync(fontsDistDir, { recursive: true });
  for (const file of readdirSync(fontsSrcDir)) {
    copyFileSync(join(fontsSrcDir, file), join(fontsDistDir, file));
  }
  console.log(`› copied dist/fonts/ (${readdirSync(fontsSrcDir).length} files)`);
}

const components = assembleComponents();
writeFileSync(join(ROOT, "dist/components.css"), components);
console.log(`› wrote dist/components.css (${(components.length / 1024).toFixed(1)} kB)`);

// copy js file into dist
if (existsSync(join(ROOT, "src/runtime.js"))) {
  copyFileSync(join(ROOT, "src/runtime.js"), join(ROOT, "dist/runtime.js"));
  console.log("› copied dist/runtime.js");
}

console.log("done.");
