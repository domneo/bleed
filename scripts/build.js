/**
 * # Build orchestrator
 * Style Dictionary for tokens, plus dependency-free concatenation for shipped bundles.
 * Ships as three dist files: base.css, components.css, themes.css — each loads once,
 * unconditionally; theming picks a theme via [data-theme] on the root. base.css and
 * themes.css copy straight into dist/ unmodified; components.css is assembled by
 * concatenating every component group. src/icons/ is emitted separately as
 * dist/sprite.svg, which is also spliced into index.html so the demo works off disk.
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

/* Inlines an SVG as a url() data URI. Only the characters that would terminate the
 * url() or the data URI are escaped, so the output stays greppable — double quotes
 * are swapped for single so the whole thing can sit inside a quoted url(). */
function svgToDataUri(svg) {
  const body = svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\{/g, "%7B")
    .replace(/\}/g, "%7D");
  return `url("data:image/svg+xml,${body}")`;
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

/* Icons whose host is a pseudo-element with no element to hang a <use> off. There is
 * exactly one: the select chevron. select.input::picker-icon is a UA pseudo-element and
 * can never take a child, and .select::after shares its chevron rather than forcing an
 * extra element into every wrapper. These stay data-URI masks; every other icon lives
 * in the sprite. */
const MASK_ICONS = ["chevron-down"];

// emits the --icon-<name> tokens for the mask exceptions above
function assembleIcons() {
  const dir = join(ROOT, "src/icons");
  if (!existsSync(dir)) return "";

  const tokens = MASK_ICONS.map(
    (n) => `    --icon-${n}: ${svgToDataUri(readFileSync(join(dir, `${n}.svg`), "utf8"))};`,
  ).join("\n");

  return (
    `/* GENERATED from src/icons/ by scripts/build.js — do not edit.\n` +
    ` * Only icons painted onto a pseudo-element land here; the rest ship in dist/sprite.svg. */\n` +
    `@layer bleed.tokens {\n  :root {\n${tokens}\n  }\n}\n\n`
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
 * opened straight off disk, and browsers refuse a cross-origin <use href="sprite.svg#…">
 * on file://, so the sprite has to be in the document rather than fetched; the gallery is
 * generated for the same reason the sprite is — both are derived from src/icons/. Written
 * only when it actually changed — the build re-runs on every src/ change under `pnpm dev`. */
const MARKERS = {
  sprite: {
    open: "<!-- GENERATED sprite from src/icons/ by scripts/build.js — do not edit. -->",
    close: "<!-- /GENERATED sprite -->",
    indent: "  ",
  },
  icons: {
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

// builds dist/components.css: the icon layer, the icon utility, then every component group.
function assembleComponents() {
  let out = assembleIcons();
  out += read("src/foundations/icons.css");
  for (const group of GROUPS) {
    for (const file of cssFiles(group.dir)) {
      out += read(file);
    }
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

copyFileSync(join(ROOT, "src/foundations/base.css"), join(ROOT, "dist/base.css"));
console.log("› copied dist/base.css");

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
writeFileSync(join(ROOT, "dist/sprite.svg"), sprite + "\n");
console.log(`› wrote dist/sprite.svg (${iconNames().length} icons)`);
spliceInto("sprite", sprite);
spliceInto("icons", buildIconGallery());

// copy js file into dist
if (existsSync(join(ROOT, "src/runtime.js"))) {
  copyFileSync(join(ROOT, "src/runtime.js"), join(ROOT, "dist/runtime.js"));
  console.log("› copied dist/runtime.js");
}

console.log("done.");
