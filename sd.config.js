// Style Dictionary v5 configuration

import { readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
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
export const THEMES = ["bleed", "blip", "boring"];

// color-scheme is a UA behavior (native form control chrome), not a themeable custom
// property — it's appended to each theme block directly rather than flowing through
// the token/format pipeline above.
const COLOR_SCHEME = { bleed: "light", blip: "dark", boring: "light" };

const NAME_ONLY = { transforms: [transforms.nameKebab] };

// Build one Style Dictionary instance per theme (separate instances keep each
// theme's reference graph self-contained), then merge all of them into a single
// dist/themes.css — every theme is data-theme-scoped, so they can all
// coexist in one stylesheet without conflicting.
export async function buildTokens() {
  const tmpDir = "dist/_themes-tmp";
  if (!existsSync("dist")) mkdirSync("dist", { recursive: true });

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
              options: { outputReferences: true, selector: `[data-theme="${theme}"]` },
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
    const colorScheme = `@layer bleed.tokens {\n  ${`[data-theme="${theme}"]`} {\n    color-scheme: ${COLOR_SCHEME[theme]};\n  }\n}\n`;
    merged += `\n/* ---- ${theme} ---- */\n${body}${colorScheme}`;
  }
  writeFileSync("dist/themes.css", merged);
  rmSync(tmpDir, { recursive: true, force: true });
}
