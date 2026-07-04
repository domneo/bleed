# bleed

An **aesthetic-agnostic** HTML/CSS component library for financial dashboards.
Neo-brutalism is the *default theme*, **not the architecture**: component CSS carries
zero aesthetic opinion — every border width, shadow, radius, colour, and hover motion
comes from a token. All personality lives in `src/tokens/`.

The proof is the **soft** theme. It restyles every component to be rounded, blurred,
hairline-bordered, with no hover-jump — **without a single edit to component CSS**.
If brutalism could be turned off entirely from the theme layer, it was never baked in.

```html
<link rel="stylesheet" href="dist/themes/bleed.css">
<script src="dist/runtime.js"></script>          <!-- optional: tabs, modal, toasts -->
<html data-theme="bleed">                       <!-- bleed | newspaper | dark | soft -->
```

Presentation-first: native HTML does the behaviour (`<dialog>`, `popover`, `<details>`,
`<progress>`/`<meter>`, `:user-invalid`). The **entire** JS budget is ~90 lines in one
optional file, and only three things need it: tab arrow-key nav, `dialog.showModal()`,
and toasts.

---

## Architecture

```
sd.config.js                  Style Dictionary: custom css/layered format, outputReferences:true
scripts/
  build.js                    SD build + dependency-free concat + a lint gate
src/
  tokens/{bleed,newspaper,dark,soft}.json    DTCG JSON — single source of truth,
                                              complete primitive + finance-semantic set per theme
  foundations/  tokens.css (generated) themes/*.css (generated) runtime.css base.css
  components/
    core/                      buttons, badges, cards, layout, inputs, feedback — one .css per component
    finance/                   stat/KPI, table, delta, sparkline, bar chart, progress, dl, num
  runtime.js
dist/                          themes/bleed.css · runtime.js
index.html                     kitchen sink + live theme/density switcher
```

Everything is wrapped in `@layer bleed.tokens, bleed.base, bleed.components` so
**consumer unlayered CSS always wins** — drop this into an existing app without fights.

> **Trade-off, stated honestly:** this started as a "no build step" library. We traded
> that for a JSON single source of truth (Style Dictionary). `npm run build` is the whole
> build; there is no framework, bundler, or PostCSS.

### Build

```bash
npm install
npm run build          # generate token CSS, then concat dist/
npm run build:tokens   # just the Style Dictionary pass
npm test               # build + lint (fails on any hardcoded aesthetic value)
```

`outputReferences: true` is **mandatory**: a semantic token that references a primitive
emits `var(--primitive)`, not the resolved value. That preserved `var()` chain is what
makes runtime re-theming work — flip `[data-theme]` and every semantic token re-resolves.
We use only the `name/kebab` transform (no value transforms) so `oklch()`, `color-mix()`,
and composite shadows pass through **verbatim**.

---

## Tokens

**Primitives** (per theme) — the raw material:
`--ink --paper --accent-1/2/3 --border-w --border-style --shadow / --shadow-hover /
--shadow-active --hover-shift-x/y --radius --transition --font-display --font-body
--space-1..6`.

**Finance semantics** (`:root`, reference primitives): `--positive --negative --warning
--neutral`. Bleed maps direction *within* its 3 base colours (`--positive: var(--ink)`,
`--negative: var(--accent-1)`), so direction is **also** carried by ▲/▼ glyph + weight in
`.delta` — never colour alone. A louder theme may remap these to literal green/red (soft
does, to demonstrate it).

**Component tokens** are co-located in each component as `--_internal` vars with a public
override, e.g. `--btn-bg`, `--card-shadow`. Set them to restyle one instance.

### The interaction contract

Every pressable element (button, interactive card, tab, nav link) presses the same way,
entirely through tokens:

| state    | motion                          | shadow            |
|----------|---------------------------------|-------------------|
| rest     | —                               | `--shadow`        |
| `:hover` | `translate` by `--hover-shift-*`| `--shadow-hover`  |
| `:active`| `translate` ×2                  | `--shadow-active` |

Bleed moves the element **into** its offset shadow (a hard press). Soft sets
`--hover-shift: 0` and swaps shadow *blur* instead (a lift). **If a theme can't remove an
effect through tokens, that's a bug.**

### Density

`data-density="compact"` scales spacing **and** border weight together (thick borders eat
space in dense grids). It's an axis orthogonal to theme: the consumed `--space-*` /
`--border-w` are the theme's `*-base` values times a density multiplier, re-derived on
`:root, [data-theme], [data-density]` so it works at the root **or** on any subtree.

### `@property`

Key colour/length tokens are registered with `@property` (typed + animatable), so theme
switches can interpolate rather than snap, and the skeleton shimmer animates a typed
`<percentage>`.

---

## Theming

Themes are primitive overrides under `[data-theme=…]` controlling colour **and**
geometry/effects. Four ship:

- **bleed** — default. Klein-blue ink on warm cream, one near-black accent, `--border-w:3px`,
  `6px 6px 0` shadow, no radius. 3 base colours total.
- **newspaper** — monochrome bleed, serif display. Milestone-1 exit: restyles by colour/font
  swap alone.
- **dark** — demo. `color-scheme: dark`, light-blue on deep blue-black.
- **soft** — the proof theme (rounded, blurred, hairline, no hover motion). Demo, not a
  maintained mode.

**The theme switcher is a regression test.** If any component looks wrong after switching
theme, it contains a hardcoded value — a bug. Open `index.html` and cycle the themes.

### `bleed-core.css`

A build with the `finance/` group excluded. Groups 3–5 (layout, inputs, feedback) never
depend on finance, which is what makes the smaller core bundle valid.

---

## Notes & gotchas

- **Support cliff (intentional).** Targets modern evergreen browsers (~last year):
  `@scope`, CSS anchor positioning, `@property`, `popover`, `:has()`, `light-dark()`,
  container queries, nesting. Anchor-positioned menus/tooltips degrade to UA-centered
  where unsupported — degraded, not broken. Great for personal/internal tools; not for
  broad public sites.
- **Bare elements inside scopes are styled on purpose.** A `<h3>`/`<hr>` inside `.card`
  chrome gets themed. The card uses a **donut** scope — `@scope (.card) to (.card-body)`
  — so a charting library dropped into `.card-body` keeps its own DOM untouched.
- **Inputs group is form-adjacent.** Tabs/segmented need `bleed.js`; everything else in
  the library is zero-JS.
- **Formatting is your job.** CSS guarantees alignment (`tabular-nums`) and tone; currency
  and locale formatting live in HTML/JS. Put the machine value in `<data value="1234.5">`
  and the formatted string as its text.

## Component groups

0. **Foundations** — tokens, base, themes
1. **Primitives** — button, badge, card (donut-scoped), skeleton, empty state
2. **Finance/Data** — stat/KPI, table, delta, sparkline, bar chart, progress/meter, dl, `.num`
3. **Layout** — dashboard grid, header, sidebar (`<details>` groups), toolbar
4. **Inputs** — fields (`:user-invalid`), controls (`accent-color`), tabs (the one JS component)
5. **Feedback** — modal (`<dialog>`), popover menu, tooltip, toast, alert
