// Style Dictionary v5 configuration for the bleed design system.
//
// Two hard requirements from the design:
//   1. outputReferences: true — a semantic token that references a primitive must
//      emit `var(--primitive)`, NOT the resolved value. That preserved var() chain
//      is what makes runtime re-theming work: flip [data-theme] and every semantic
//      token re-resolves through the overridden primitive.
//   2. Values pass through VERBATIM. oklch(), color-mix(), var(), composite shadow
//      strings must survive untouched. The stock `css` transformGroup runs color
//      transforms that would rewrite oklch() — so we use ONLY name/kebab (name
//      transform, zero value transforms).
//
// All output is wrapped in `@layer bleed.tokens { <selector> { ... } }` by the
// custom `css/layered` format, so consumer unlayered CSS always wins the cascade.

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import StyleDictionary from "style-dictionary";
import { fileHeader, createPropertyFormatter, sortByReference } from "style-dictionary/utils";
import { transforms } from "style-dictionary/enums";

// --- custom format: css/layered ------------------------------------------------
// Like css/variables, but emits the block inside a named cascade layer and lets us
// pass an arbitrary selector (:root, [data-theme="bleed"], ...).
StyleDictionary.registerFormat({
  name: "css/layered",
  format: async ({ dictionary, file, options }) => {
    const { outputReferences = true, selector = ":root", layer = "bleed.tokens" } = options;

    const header = await fileHeader({ file });

    const format = createPropertyFormatter({
      outputReferences,
      dictionary,
      format: "css",
      usesDtcg: true, // read $value/$type (DTCG), not the legacy value/type
      // two levels of indentation because we nest selector inside @layer
      formatting: { indentation: "    " },
    });

    const tokens = outputReferences ? [...dictionary.allTokens].sort(sortByReference(dictionary)) : dictionary.allTokens;

    const body = tokens
      .map((t) => format(t))
      .filter(Boolean)
      .join("\n");

    return `${header}@layer ${layer} {\n  ${selector} {\n${body}\n  }\n}\n`;
  },
});

// --- theme catalogue -----------------------------------------------------------
// `bleed` is special: its selector is `:root, [data-theme="bleed"]` — the default
// AND the explicit switcher target, so re-selecting it fully resets state without
// needing a separate foundations/tokens.css. Every theme is a COMPLETE primitive
// set: data-theme is a single mutually exclusive attribute, so a theme must define
// everything it needs; anything it omits falls back to :root (bleed), which is
// only safe for the default itself.
export const THEMES = ["bleed", "newspaper", "dark", "soft"];

function selectorFor(theme) {
  return theme === "bleed" ? `:root, [data-theme="bleed"]` : `[data-theme="${theme}"]`;
}

// color-scheme is a UA behavior (native form control chrome), not a themeable custom
// property — it's appended to each theme block directly rather than flowing through
// the token/format pipeline above.
const COLOR_SCHEME = { bleed: "light", newspaper: "light", dark: "dark", soft: "light" };

const NAME_ONLY = { transforms: [transforms.nameKebab] };

// Build one Style Dictionary instance per theme (separate instances keep each
// theme's reference graph self-contained), then merge all of them into a single
// src/foundations/themes.css — every theme is data-theme-scoped, so they can all
// coexist in one stylesheet without conflicting.
export async function buildTokens() {
  const tmpDir = "src/foundations/_themes-tmp";

  for (const theme of THEMES) {
    const sd = new StyleDictionary({
      source: [`src/tokens/${theme}.json`],
      log: { verbosity: "silent" },
      platforms: {
        css: {
          ...NAME_ONLY,
          buildPath: `${tmpDir}/`,
          files: [
            {
              destination: `${theme}.css`,
              format: "css/layered",
              options: { outputReferences: true, selector: selectorFor(theme) },
            },
          ],
        },
      },
    });
    await sd.buildAllPlatforms();
  }

  let merged = `/**\n * Do not edit directly, this file was auto-generated.\n */\n`;
  for (const theme of THEMES) {
    const body = readFileSync(`${tmpDir}/${theme}.css`, "utf8").replace(/^\/\*\*[\s\S]*?\*\/\n\n?/, "");
    const colorScheme = `@layer bleed.tokens {\n  ${selectorFor(theme)} {\n    color-scheme: ${COLOR_SCHEME[theme]};\n  }\n}\n`;
    merged += `\n/* ---- ${theme} ---- */\n${body}${colorScheme}`;
  }
  writeFileSync("src/foundations/themes.css", merged);
  rmSync(tmpDir, { recursive: true, force: true });
}
