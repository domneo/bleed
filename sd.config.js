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
// `bleed` is special: it is emitted twice.
//   - as :root defaults (WITH finance semantics) -> foundations/tokens.css
//   - as [data-theme="bleed"] overrides         -> foundations/themes/bleed.css
// so that explicitly selecting the default theme in the switcher fully resets state.
// Every theme file is a COMPLETE primitive set: data-theme is a single mutually
// exclusive attribute, so a theme must define everything it needs; anything it omits
// falls back to :root (bleed), which is only safe for the default itself.
export const THEMES = ["bleed", "newspaper", "dark", "soft"];

const NAME_ONLY = { transforms: [transforms.nameKebab] };

// Build one Style Dictionary instance per output file.
// Separate instances keep each theme's reference graph self-contained.
export async function buildTokens() {
  const jobs = [];

  // :root defaults = bleed primitives + finance semantics.
  jobs.push({
    source: ["src/tokens/bleed.json"],
    destination: "tokens.css",
    selector: ":root",
  });

  // [data-theme="x"] override blocks, one file per theme.
  for (const theme of THEMES) {
    jobs.push({
      source: [`src/tokens/${theme}.json`],
      destination: `themes/${theme}.css`,
      selector: `[data-theme="${theme}"]`,
    });
  }

  for (const job of jobs) {
    const sd = new StyleDictionary({
      source: job.source,
      log: { verbosity: "silent" },
      platforms: {
        css: {
          ...NAME_ONLY,
          buildPath: "src/foundations/",
          files: [
            {
              destination: job.destination,
              format: "css/layered",
              options: { outputReferences: true, selector: job.selector },
            },
          ],
        },
      },
    });
    await sd.buildAllPlatforms();
  }
}
