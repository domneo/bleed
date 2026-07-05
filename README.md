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
├── src/
│   ├── tokens/{bleed,blip,boring}.json
│   │                          DTCG JSON – single source of truth, complete primitive set per theme
│   ├── fonts/                 font files (.ttf)
│   ├── foundations/
│   │   ├── fonts.css          @font-face declarations
│   │   ├── themes.css         generated, one [data-theme] block per theme
│   │   └── base.css           reset/typography/focus/@property
│   ├── components/
│   │   ├── core/              common/base components — one .css per component
│   │   └── finance/           components for financial use cases
│   └── runtime.js             JS scripts for additional functionality that native HTML elements don't already provide
├── scripts/
│   └── build.js               Style Dictionary build, concat + copy src/ to dist/
├── dist/                      output files for applications to consume from
└── index.html                 kitchen sink + live theme switcher
```

Everything is wrapped in `@layer bleed.tokens, bleed.base, bleed.components` so that styles are all encapsulated.

### Build

```bash
pnpm install
pnpm build  # generate token CSS, then concat and copy to dist/
```

---

## Theming

Themes are primitive overrides controlling colour and geometry/effects. All themes ship in one `dist/themes.css`. Themes are set by the `data-theme` attribute on `<html>` (or any subtree).

Available themes:

- **bleed** — Default. Semi-monotone blue/white/black scheme featuring brutalist fonts and hard edges.
- **[WIP] blip** – Terminal-style UI
- **[WIP] boring** – AI-generated theme

---

## Design Tokens

**Primitive tokens** (per theme) — the raw material: `--ink --paper --accent --border-w --border-style --shadow / --shadow-hover / --shadow-active --hover-shift-x/y --radius --transition --font-display --font-body --font-size-1..7 --line-height-{tight,snug,normal} --letter-spacing-{tight,normal,wide,wider} --space-1..6`.

**Semantic tokens** are declared per-theme alongside the primitives: `--positive --negative --warning --neutral`. Direction is also carried by ▲/▼ glyph + weight in `.delta` — never colour alone.

**Component tokens** are co-located in each component as `--_internal` vars with a public override, e.g. `--btn-bg`, `--card-shadow`. Set them to restyle one instance.

### Interaction

Every pressable element (button, interactive card, tab, nav link) presses the same way, entirely through tokens:

| state     | motion                           | shadow            |
| --------- | -------------------------------- | ----------------- |
| rest      | —                                | `--shadow`        |
| `:hover`  | `translate` by `--hover-shift-*` | `--shadow-hover`  |
| `:active` | `translate` ×2                   | `--shadow-active` |

### `@property`

Key colour/length tokens are registered with `@property` (typed + animatable), so theme switches can interpolate rather than snap, and the skeleton shimmer animates a typed `<percentage>`.

---

## Typography

HTML elements carry no visual type styling; `h1..h6` are structural only. Size, weight, and space are applied to text with the `--font-size-* / --line-height-* / --letter-spacing-*` tokens, so the whole type scale re-themes per `[data-theme]`.

`--font-size-1..7` are **fluid**: each is a `clamp(min, preferred + vw, max)` that scales with the viewport (20rem → 80rem). The scale bottoms out at 14px (`--font-size-1`, `0.875rem`) and runs up to 64px (`--font-size-7`, `4rem`).
