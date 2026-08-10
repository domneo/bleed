/**
 * # Build orchestrator
 * - Style Dictionary for tokens, plus dependency-free concatenation for shipped bundles.
 * - Ships three dist files: base.css, components.css, themes.css — each loads once,
 *   unconditionally; theming picks a theme via [data-theme] on the root.
 * - themes.css copies straight into dist/ unmodified.
 * - base.css is src/foundations/base.css plus every file in BASE_EXTRAS concatenated
 *   on (see assembleBase).
 * - components.css is assembled the same way, concatenating every component group.
 * - src/icons/ is emitted separately as dist/icons.svg, also spliced into index.html
 *   so the demo works off disk.
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
];

// foundation files appended after base.css into dist/base.css
const BASE_EXTRAS = ["src/foundations/icons.css", "src/foundations/typography.css"];

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

// lists every icon name in src/icons/, alphabetically
function iconNames() {
  const dir = join(ROOT, "src/icons");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .sort()
    .map((f) => f.replace(/\.svg$/, ""));
}

/* Turns a source icon into a sprite <symbol>. Every file in src/icons/ has the same
 * shape — a root <svg> carrying all the paint attributes over attribute-free geometry —
 * so the conversion is just hoisting the root's attributes onto the <symbol>, where they
 * inherit into each <use> instance. xmlns/version/width/height are dropped: the sprite
 * root carries the namespace, and an icon is sized by CSS, not by the symbol. */
function svgToSymbol(name, svg) {
  const match = svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/);
  if (!match) throw new Error(`src/icons/${name}.svg: no root <svg> element`);

  const [, attrs, body] = match;
  const keep = attrs.replace(/\s(?:xmlns(?::\w+)?|version|width|height)="[^"]*"/g, "").trimEnd();
  return `<symbol id="icon-${name}"${keep}>${body.replace(/\s+/g, " ").trim()}</symbol>`;
}

/* Builds the sprite: one <svg> holding every icon as a <symbol>, referenced anywhere in
 * the document as <svg class="icon"><use href="#icon-<name>"/></svg>. A <use> instance
 * inherits colour from its host, so the stroke="currentColor" on each symbol resolves
 * live and an icon re-themes exactly like text does. */
function buildSprite() {
  const dir = join(ROOT, "src/icons");
  const symbols = iconNames().map((n) => svgToSymbol(n, readFileSync(join(dir, `${n}.svg`), "utf8")));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n` +
    symbols.map((s) => `  ${s}\n`).join("") +
    `</svg>`
  );
}

/* Builds the demo page's icon gallery: one tile per icon, each rendering the sprite
 * reference it is labelled with, so the gallery can never drift from src/icons/. */
function buildIconGallery() {
  const tiles = iconNames().map(
    (n) =>
      `<div class="col"><svg class="icon" aria-hidden="true"><use href="#icon-${n}"/></svg><code>${n}</code></div>`,
  );
  return `<div class="icon-grid grid" style="--grid-min:14rem;--grid-row-gap:var(--space-6);--grid-col-gap:var(--space-4)">\n` + tiles.map((t) => `  ${t}\n`).join("") + `</div>`;
}

/* Splices a generated block into index.html between its marker comments. The demo page is
 * opened straight off disk, and browsers refuse a cross-origin <use href="icons.svg#…">
 * on file://, so the sprite has to be in the document rather than fetched; the gallery is
 * generated for the same reason the sprite is — both are derived from src/icons/. Written
 * only when it actually changed — the build re-runs on every src/ change under `pnpm dev`. */
const MARKERS = {
  sprite: {
    open: "<!-- GENERATED sprite from src/icons/ by scripts/build.js — do not edit. -->",
    close: "<!-- /GENERATED sprite -->",
    indent: "  ",
  },
  gallery: {
    open: "<!-- GENERATED icon gallery from src/icons/ by scripts/build.js — do not edit. -->",
    close: "<!-- /GENERATED icon gallery -->",
    indent: "        ",
  },
};

function spliceInto(name, content) {
  const { open, close, indent } = MARKERS[name];
  const rel = "index.html";
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return;

  const html = readFileSync(abs, "utf8");
  const start = html.indexOf(open);
  const end = html.indexOf(close);
  if (start < 0 || end < 0) {
    console.warn(`! ${rel}: ${name} markers not found, skipping`);
    return;
  }

  const block =
    open + "\n" + content.split("\n").map((l) => indent + l).join("\n") + "\n" + indent + close;
  const next = html.slice(0, start) + block + html.slice(end + close.length);
  if (next === html) return;

  writeFileSync(abs, next);
  console.log(`› spliced ${name} into ${rel}`);
}

function assembleComponents() {
  let out = "";
  for (const group of GROUPS) {
    for (const file of cssFiles(group.dir)) {
      out += read(file);
    }
  }
  return out;
}

// base.css first (layer order, @property, reset), then every foundation extra —
// concatenated into one dist/base.css so the shipped stylesheet count stays fixed.
function assembleBase() {
  let out = read("src/foundations/base.css");
  for (const file of BASE_EXTRAS) {
    if (existsSync(join(ROOT, file))) out += read(file);
  }
  return out;
}

// --- main ----------------------------------------------------------------------

// build css files into dist
if (!existsSync(join(ROOT, "dist"))) mkdirSync(join(ROOT, "dist"), { recursive: true });

// build tokens (writes dist/themes.css directly)
console.log("› building tokens...");
await buildTokens();
console.log(`› wrote dist/themes.css (${THEMES.length} themes)`);

const base = assembleBase();
writeFileSync(join(ROOT, "dist/base.css"), base);
console.log(`› wrote dist/base.css (${(base.length / 1024).toFixed(1)} kB)`);

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

// build the icon sprite, then mirror it and its gallery into the demo page
const sprite = buildSprite();
writeFileSync(join(ROOT, "dist/icons.svg"), sprite + "\n");
console.log(`› wrote dist/icons.svg (${iconNames().length} icons)`);
spliceInto("sprite", sprite);
spliceInto("gallery", buildIconGallery());

// copy js file into dist
if (existsSync(join(ROOT, "src/runtime.js"))) {
  copyFileSync(join(ROOT, "src/runtime.js"), join(ROOT, "dist/runtime.js"));
  console.log("› copied dist/runtime.js");
}

console.log("done.");
