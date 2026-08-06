# bleed component library

Themable component library implemented with HTML, CSS, and minimal JS.
Themes are achieved via design tokens using Style Dictionary.

## Usage

```html
<!--
  Switch themes with [data-theme]
  Theme options: bleed | blip | boring
-->
<html data-theme="bleed">
  <head>
    <!-- Stylesheets upfront in the head -->
    <link rel="stylesheet" href="dist/fonts.css" />
    <link rel="stylesheet" href="dist/themes.css" />
    <link rel="stylesheet" href="dist/base.css" />
    <link rel="stylesheet" href="dist/components.css" />
  </head>
  <body>
    <!-- Inline dist/icons.svg here if you use icons — see Icons below -->

    <!-- Runtime scripts near the end of body -->
    <script src="dist/runtime.js"></script>
  </body>
</html>
```

---

## Architecture

```
bleed/
├── sd.config.js               Style Dictionary: custom css/layered format, outputReferences:true
│                              builds one instance per theme, merges them into dist/themes.css
├── src/
│   ├── tokens/{bleed,blip,boring}.json
│   │                          DTCG JSON – single source of truth, complete primitive set per theme
│   ├── fonts/                 font files (.ttf)
│   ├── icons/                 16×16 stroke-only .svg — one file per icon
│   ├── foundations/
│   │   ├── fonts.css          @font-face declarations
│   │   ├── icons.css          the .icon utility (sizing for an <svg><use></svg>)
│   │   └── base.css           layer order/reset/typography/focus/@property
│   ├── components/
│   │   ├── core/              common/base components — one .css per component
│   │   └── finance/           components for financial use cases
│   └── runtime.js             JS scripts for additional functionality that native HTML elements don't already provide
├── scripts/
│   └── build.js               Style Dictionary build, concat + copy src/ to dist/, generate icon sprite
├── dist/                      output files for applications to consume from
│                              base.css, fonts.css, fonts/, themes.css, components.css,
│                              icons.svg, runtime.js
└── index.html                 kitchen sink + live theme switcher (sprite + icon gallery spliced in by the build)
```

Everything is wrapped in `@layer bleed.tokens, bleed.base, bleed.components` so that styles are all encapsulated. The layer order is declared at the top of `base.css`.

### Build

```bash
pnpm install
pnpm build  # generate token CSS, then concat and copy to dist/
pnpm dev    # same build, re-run on every change under src/
```

- `dist/themes.css` is generated straight out of `src/tokens/`
- `base.css` and `fonts.css` are copied verbatim
- `components.css` is the concatenation of every component group

---

## Theming

Themes are primitive overrides controlling colour and geometry/effects. All themes ship in one `dist/themes.css`. Themes are set by the `data-theme` attribute on `<html>` (or any subtree). Each theme block also sets `color-scheme`, so native UA surfaces follow the theme.

Available themes:

- **bleed** — Default. Semi-monotone blue/white/black scheme featuring brutalist fonts and hard edges.
- **[WIP] blip** – Terminal-style UI
- **[WIP] boring** – AI-generated theme

---

## Design Tokens

**Primitive tokens** (per theme) — the raw material: `--ink --paper --accent --border-w --border-style --shadow / --shadow-hover / --shadow-active --hover-shift-x/y --radius --transition (--transition-duration + --transition-ease) --font-display --font-body --font-size-1..7 --line-height-{tight,snug,normal} --letter-spacing-{tight,normal,wide,wider} --space-1..9`.

**Semantic tokens** are declared per-theme alongside the primitives, each as a three-step ramp: `--positive --negative --warning --neutral`, plus a `-subtle` and `-strong` variant of each (`--positive-subtle`, `--negative-strong`, …). The base step is authored; the subtle/strong steps are derived from it with relative `oklch(from …)`, so retuning a tone means editing one value. Direction is never carried by colour alone — `.delta` encodes it three ways: an arrow icon, font weight, and colour.

**Component tokens** are co-located in each component as `--_internal` vars with a public override, e.g. `--btn-bg`, `--card-shadow`, `--grid-min`. Set them to restyle one instance.

### Interaction

The shadow marks interactivity: it is carried by every element you can operate — button, input, select, checkbox, radio, range, tab, segmented control, interactive card — and by nothing else. Static surfaces (plain card, stat, alert, modal, menu, tooltip, toast, tab panel) are flat, bordered paper.

Pressable elements press the same way, entirely through tokens:

| state                      | motion                           | shadow            |
| -------------------------- | -------------------------------- | ----------------- |
| rest                       | —                                | `--shadow`        |
| `:hover` / `:focus-visible` | `translate` by `--hover-shift-*` | `--shadow-hover`  |
| `:active`                  | `translate` ×2                   | `--shadow-active` |
| `:disabled`                | —                                | `--shadow-active` |

Form controls (input, select, textarea, checkbox, radio, range) run the same contract, with `:focus` standing in for `:hover` — focus moves the control into its shadow, `:active` presses it the rest of the way. In `.segmented` and `.input-group`, the press belongs to the group, so focusing any control inside moves the entire group together rather than on its own.

Invalid fields (`:user-invalid`, after interaction — not on load) rebind `--ink`/`--paper`/`--shadow*` to the negative ramp, so the whole control re-tones without any component-specific error styling.

### Layout

`.grid` is the layout primitive: `repeat(auto-fit, minmax(min(var(--grid-min, 24rem), 100%), 1fr))` on a `container-type: inline-size` element, so it sizes from its own width rather than the viewport and a grid nested in a narrow panel collapses the same way the page does. Tiles opt into `data-span="2" | "3" | "full"`; a span is a ceiling — the tile starts full-width and only narrows once that many tracks actually fit. Gaps come from `--grid-gap`, overridable per axis with `--grid-row-gap` / `--grid-col-gap`.

### Icons

Drop a 16×16 stroke-only SVG into `src/icons/` and the build folds it into one sprite of `<symbol id="icon-<name>">` — `dist/icons.svg`.

```html
<svg class="icon" aria-hidden="true"><use href="#icon-info"/></svg>
```

The sprite must be in the document for `#icon-…` to resolve (browsers refuse a cross-origin `<use href="icons.svg#…">` on `file://`); `index.html` inlines it between generated markers, alongside a generated gallery of every icon.

`<use>` inherits colour, so each symbol's `stroke="currentColor"` keeps tracking `[data-theme]` like text. Sizing is `1em`, so icons follow their slot's font-size. Mark them `aria-hidden` — the accessible name should be provided by surrounding text or an `aria-label`.

One exception: icons painted onto a pseudo-element can't host a `<use>`, so the build also emits them as `--icon-<name>` data-URI mask tokens. There is exactly one today — `--icon-chevron-down`, shared by `select.input::picker-icon` and `.select::after`.

### `@property`

Key colour/length tokens are registered with `@property` (typed + animatable) in `base.css` — `--ink --paper --accent --positive --negative --warning --neutral --radius --hover-shift-x/y` — so theme switches interpolate rather than snap.

---

## Runtime JS

`dist/runtime.js` is the entire JS budget: dependency-free, progressive enhancement, everything degrades to working HTML without it. It covers the three things native HTML can't:

1. **Tabs / segmented** — `[role="tablist"]` gets roving tabindex + arrow/Home/End key nav, and toggles `[aria-controls]` panels. Auto-initialised on load.
2. **Modals** — `[data-open-modal="<id>"]` calls `showModal()`, `[data-close-modal]` closes; `closedby="any"` / `closedby="none"` are polyfilled where the attribute isn't supported.
3. **Toasts** — `bleed.toast(message, { title, icon, solid, timeout, region })` injects an `<output role="status">` into a toast region and auto-removes it. `icon` is an icon *name* (e.g. `'tick'`), resolved to a `#icon-<name>` sprite reference.

Public API: `window.bleed = { toast, initTablist }`.

---

## Typography

HTML elements carry no visual type styling; `h1..h6` are structural only. Size, weight, and space are applied to text with the `--font-size-* / --line-height-* / --letter-spacing-*` tokens, so the whole type scale re-themes per `[data-theme]`.

`--font-size-1..7` are **fluid**: each is a `clamp(min, preferred + vw, max)` that scales with the viewport (20rem → 80rem). The scale bottoms out at 14px (`--font-size-1`, `0.875rem`) and runs up to 64px (`--font-size-7`, `4rem`).
