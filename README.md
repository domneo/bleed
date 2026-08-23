# bleed

A themable component library built from plain HTML, CSS, and 116 lines of JS. You write normal markup, add a class, and swap the entire look with one attribute on `<html>`.

No framework. No build step in your app. Four stylesheets and you're done.

## Quick Start

```bash
pnpm install
pnpm build      # writes dist/
open index.html # kitchen sink demo + live theme switcher
```

`pnpm dev` reruns the build on every change under `src/`.

To use it in an app, copy `dist/` in and link it:

```html
<!-- themes: bleed | blip | boring -->
<html data-theme="bleed">
  <head>
    <link rel="stylesheet" href="dist/fonts.css" />
    <link rel="stylesheet" href="dist/themes.css" />
    <link rel="stylesheet" href="dist/base.css" />
    <link rel="stylesheet" href="dist/components.css" />
  </head>
  <body>
    <!-- inline dist/icons.svg here if you use icons, see Icons below -->
    <script src="dist/runtime.js"></script>
  </body>
</html>
```

## How It Works

Three stages, each one a cascade layer:

```
src/tokens/*.json     ->  dist/themes.css      @layer bleed.tokens
src/foundations/*.css ->  dist/base.css        @layer bleed.base
src/components/**.css ->  dist/components.css  @layer bleed.components
src/icons/*.svg       ->  dist/icons.svg       one <symbol> per file
src/runtime.js        ->  dist/runtime.js      copied as is
```

Layer order is declared once at the top of `base.css`:

```css
@layer bleed.tokens, bleed.base, bleed.components;
```

Everything ships inside those layers, so your own unlayered CSS always wins. You never need `!important` to override a component.

### Themes

A theme is a set of primitive overrides, nothing more. All three themes live in one `dist/themes.css`, each scoped to a `[data-theme]` block, so switching is one attribute write:

```js
document.documentElement.dataset.theme = "blip";
```

Set it on any subtree to theme just that part of the page. Each block also sets `color-scheme`, so native controls follow along.

| theme  | status | look                                                            |
| ------ | ------ | --------------------------------------------------------------- |
| bleed  | done   | blue/white/black, brutalist fonts, hard edges                   |
| blip   | WIP    | inspired by the "Lumon Terminal Pro" interface from "Severance" |
| boring | WIP    | AI-generated, rounded, inoffensive                              |

### Tokens

Primitives are the raw material, one complete set per theme:

```
--ink --paper --accent
--border-w --border-style
--shadow --shadow-hover --shadow-active
--hover-shift-x --hover-shift-y --radius
--transition (--transition-duration + --transition-ease)
--font-display --font-body --font-weight-{normal,bold}
--font-size-1..7 --font-size-display-1..7
--line-height-{tight,snug,normal}
--letter-spacing-{tight,normal,wide,wider}
--space-1..9
```

Semantic tokens sit alongside them as three-step ramps: `--positive`, `--negative`, `--warning`, `--neutral`, each with a `-subtle` and `-strong` variant. You author the base step. The other two derive from it with relative `oklch(from ...)`, so retuning a tone is a one-value edit.

Component tokens are private `--_vars` with a public override. Set one to restyle a single instance:

```html
<button class="btn" style="--btn-bg: var(--warning)">Careful</button>
<div class="grid" style="--grid-min: 16rem">...</div>
```

Key colour and length tokens are registered with `@property` in `base.css`, so a theme switch interpolates instead of snapping.

### Interaction

The shadow is the signal. If an element casts one, you can operate it: button, input, select, checkbox, radio, range, tab, segmented control, interactive card. Everything else (plain card, alert, modal, menu, tooltip, toast, tab panel) is flat bordered paper.

Every pressable element presses the same way, entirely through tokens:

| state                       | motion                           | shadow            |
| --------------------------- | -------------------------------- | ----------------- |
| rest                        | none                             | `--shadow`        |
| `:hover` / `:focus-visible` | `translate` by `--hover-shift-*` | `--shadow-hover`  |
| `:active`                   | `translate` x2                   | `--shadow-active` |
| `:disabled`                 | none                             | `--shadow-active` |

Form controls run the same contract with `:focus` standing in for `:hover`. Inside `.segmented` and `.input-group` the press belongs to the group, so focusing one control moves the whole unit.

Validation is native. `:user-invalid` fires only after interaction, never on first paint, and it rebinds `--ink`, `--paper`, and `--shadow*` to the negative ramp. No error-specific component styles exist:

```html
<div class="field">
  <label for="amt">Amount</label>
  <input id="amt" class="input" type="number" required />
  <p class="field__error">Enter a valid amount</p>
</div>
```

### Layout

`.grid` is the only layout primitive:

```html
<div class="grid" style="--grid-min: 20rem">
  <article class="card">...</article>
  <article class="card" data-span="2">...</article>
  <article class="card" data-span="full">...</article>
</div>
```

It sizes from its own width, not the viewport (`container-type: inline-size`), so a grid nested in a narrow panel collapses the same way the page does. `data-span` is a ceiling: a tile starts full width and only narrows once that many tracks actually fit. Gaps come from `--grid-gap`, per axis with `--grid-row-gap` and `--grid-col-gap`.

### Tables

`.table` is a real `<table>` with a sticky header, tabular numerics, and zebra, hover, and selected row states driven by `:has()` instead of JS classes.

```html
<div class="table-scroll">
  <table class="table table--zebra table--rows table--sticky-foot">
    <thead>
      <tr>
        <th>Symbol</th>
        <th class="num">Last</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>AAPL</td>
        <td class="num">228.50</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <th scope="row">Total</th>
        <td class="num">2,350</td>
      </tr>
    </tfoot>
  </table>
</div>
```

- `.table-scroll` bounds the table and scrolls both axes. The head sticks going down, and columns run past the container going across, so a wide table scrolls inside its panel instead of widening the page.
- `--table-scroll-max-h` sets the vertical bound (default `70svh`). Set it to `none` to scroll across only.
- `class="num"` on a `<th>` or `<td>` right-aligns and aligns digits.
- `table--sticky-foot` pins the totals row the way `thead` pins the header.
- `class="solid"` on a cell or row fills it with `--ink`.

Borders use `border-collapse: separate` on purpose. A collapsed border belongs to the table rather than the cell, so the sticky header's rule scrolls away with the body.

### Icons

Drop a 16x16 stroke-only SVG into `src/icons/`. The build folds every file into one sprite at `dist/icons.svg` as `<symbol id="icon-<name>">`. There are 261 of them today.

```html
<svg class="icon" aria-hidden="true"><use href="#icon-info" /></svg>
```

The sprite has to be in the document for `#icon-...` to resolve, since browsers refuse a cross-origin `<use href="icons.svg#...">` on `file://`. `index.html` inlines it between generated markers, next to a generated gallery of every icon.

Icons inherit `currentColor` and size at `1em`, so they track `[data-theme]` and their slot's font-size like text. Mark them `aria-hidden` and let surrounding text or an `aria-label` carry the name.

One exception: an icon painted onto a pseudo-element can't host a `<use>`. Those need a data-URI mask token instead, hand-written in `src/foundations/icons.css`. There's exactly one today, `--icon-chevron-down`, used by `select.input::picker-icon` where Chromium's `appearance: base-select` is supported. Everywhere else the select draws its chevron with two linear-gradients, since a gradient is native CSS and keeps tracking `var(--ink)` when a `url()` wouldn't.

### Typography

HTML elements carry no visual type styling. `h1..h6` are structural only. Pick a role class instead:

```html
<h1 class="t-display-6">By Month</h1>
<p class="t-body-2">Lead paragraph.</p>
```

Each class bundles family, size, line-height, letter-spacing, and weight as one deliberate combination, so you don't compose those five properties by hand.

- `.t-body-1..7` is reading copy. `--font-body`, sized off `--font-size-1..7`, normal leading and tracking at every size.
- `.t-display-1..7` is the headline register. `--font-display`, its own `--font-size-display-1..7` scale, wide tracking, bold, `text-wrap: balance`, and line-height stepping tighter as size climbs.

### Runtime JS

`dist/runtime.js` is the whole JS budget. No dependencies, progressive enhancement, everything degrades to working HTML without it. It covers the three things HTML can't do alone:

1. **Tabs and segmented controls.** `[role="tablist"]` gets roving tabindex plus arrow, Home, and End key nav, and toggles `[aria-controls]` panels. Auto-initialised on load.
2. **Modals.** `[data-open-modal="<id>"]` calls `showModal()`, `[data-close-modal]` closes. `closedby="any"` and `closedby="none"` are polyfilled where the attribute isn't supported.
3. **Toasts.** `bleed.toast(message, opts)` injects an `<output role="status">` into a toast region and removes it on a timer.

```js
bleed.toast("Saved", { title: "Done", icon: "tick", timeout: 4000 });
```

`icon` is an icon name, not a glyph. It resolves to a `#icon-<name>` sprite reference, so the sprite has to be in the document.

Public API is `window.bleed = { toast, initTablist }`.

A tab strip used for page navigation needs none of this. Build it from links and key the selected state off `aria-current`:

```html
<nav class="tabs__list">
  <a class="tabs__tab" href="/spending" aria-current="page">Spending</a>
  <a class="tabs__tab" href="/income">Income</a>
</nav>
```

The runtime only looks for `[role="tablist"]`, so nothing initialises and each tab stays an ordinary link.

## Setup / Configuration

There are no environment variables. Requirements:

- **Node >= 22.** Style Dictionary v5 requires it, and `pnpm dev` uses `node --watch-path`.
- **pnpm.** npm works too, but the lockfile is pnpm's.
- **One devDependency**, `style-dictionary@^5`. Zero runtime dependencies.

Consuming apps need these files reachable from wherever you link them:

```
dist/fonts.css      @font-face declarations
dist/fonts/         .ttf files, referenced by fonts.css
dist/themes.css     all themes, [data-theme] scoped
dist/base.css       layer order, reset, focus, @property, .icon, type roles
dist/components.css every component
dist/icons.svg      sprite, inline it into the document
dist/runtime.js     load near the end of <body>
```

Build-time knobs, all in the repo:

- `sd.config.js` -> `THEMES` is the theme catalogue. Add a name here and a matching `src/tokens/<name>.json` to add a theme.
- `sd.config.js` -> `COLOR_SCHEME` maps each theme to `light` or `dark` for native controls.
- `scripts/build.js` -> `GROUPS` lists the component directories concatenated into `components.css`.
- `scripts/build.js` -> `BASE_EXTRAS` lists the foundation files appended to `base.css`.

Runtime knobs, all CSS custom properties:

- `data-theme` on `<html>` or any subtree picks the theme.
- Any primitive token, set on a scope, retints everything under it.
- Any component token (`--btn-bg`, `--card-shadow`, `--grid-min`, `--table-scroll-max-h`, and friends) restyles a single instance.

## Repo Layout

```
bleed/
├── sd.config.js               Style Dictionary config, one instance per theme, merged into themes.css
├── scripts/build.js           token build, concat, copy, sprite generation
├── src/
│   ├── tokens/                bleed.json, blip.json, boring.json (DTCG, the source of truth)
│   ├── fonts/                 .ttf files
│   ├── icons/                 261 16x16 stroke-only .svg, one per icon
│   ├── foundations/           fonts.css, base.css, icons.css, typography.css
│   ├── components/core/       17 components, one .css each
│   └── runtime.js             tabs, modals, toasts
├── dist/                      what apps consume, generated
├── index.html                 kitchen sink, sprite and icon gallery spliced in by the build
└── favicon.svg
```

The build writes `dist/` from scratch every run. Don't edit it.
