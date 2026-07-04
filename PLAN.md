# Design system PLAN

Aesthetic-agnostic HTML/CSS component library. Neo-brutalism = default THEME only, not architecture — component CSS carries zero aesthetic opinion; all personality lives in src/tokens/. Financial dashboard focus. Presentation-first: native HTML for behavior. JS budget ~30 lines total (optional `runtime.js`).

## Stack / constraints
- Modern browsers only (last ~1yr). OK: `popover`, anchor positioning, `@scope`, `:has()`, `:user-invalid`, `<dialog>`, container queries, nesting, `@property`, `light-dark()`, oklch, `color-mix()`, logical properties.
- Tokens: Style Dictionary v4+, DTCG JSON source → `tokens.css`. **`outputReferences: true` mandatory** (preserves var() chains = runtime re-theming).
- All CSS wrapped in `@layer bleed.tokens, bleed.base, bleed.components` → consumer unlayered CSS always wins.
- Selectors: flat block class public API (`.card`, `.btn`) + `@scope` internally instead of BEM `__element`. Donut scope (`@scope (.card) to (.card-body)`) so nested content (chart libs etc) untouched. Variants: `.btn--accent` or `data-variant`.
- No raw color/size values in component CSS. Everything via token. Enforce.

## Tokens (public API)
- Primitives: `--ink --paper --accent-1/2/3 --border-w --border-style --shadow (full composite) --hover-shift-x/y --radius --transition --font-display --font-body --space-1..6`. No baked defaults like radius:0 — that's the brutalist theme's value, not the token's identity. Token API keeps 3 accent slots even when a theme uses fewer (bleed aliases all 3 → same near-black); themes fill slots, API stays stable.
- Semantic: component-level, reference primitives only (`--btn-bg: var(--accent-1)`, `--card-shadow: var(--shadow)`).
- RULE: components make NO aesthetic assumptions. No hardcoded border widths, shadow shapes, radii, hover translates. Hover shift = `translate(var(--hover-shift-x), var(--hover-shift-y))` — soft theme sets these 0 + uses `--shadow` blur instead. If a theme can't remove an effect via tokens, it's a bug.
- Finance semantics: `--positive --negative --warning --neutral` (oklch). Delta/badge/table/sparkline use these, never green/red literals.
- `--density` token (comfortable/compact): scales spacing + border-w together. Needed — thick borders eat space in dense grids.
- Register key tokens w/ `@property` (typed, animatable). Hover/active via `color-mix(in oklch, var(--x), var(--ink) 15%)`, no shade tokens.
- Themes = primitive overrides under `[data-theme=...]`, controlling color AND geometry/effects (radius, shadows, borders, hover motion). Ship 4: bleed (default), newspaper (mono bleed), dark (`light-dark()` + `color-scheme`), soft (rounded, blurred shadows, thin borders — exists to PROVE brutalism is fully in the theme layer). Dark/soft = demos not maintained modes.

## Default theme: "bleed" (lives ENTIRELY in src/tokens/, never in component CSS)
Paper: slightly off-white warm `oklch(0.97 0.01 90)` (~#F7F4EC). Ink: vivid blue `oklch(0.45 0.31 264)` (~#1F2DE6, Klein-blue territory — deep enough for body-text contrast ~7:1 on paper; don't go brighter or small text fails contrast). Ink drives ALL borders + shadows → theme reads blue-on-cream. Accent: single near-black `oklch(0.2 0.01 264)` (~#17181F, hint of blue so it sits w/ ink, not dead #000). 3 base colors TOTAL for now: paper/ink/accent. Palette-constrained ripple: finance semantics map within the 3 — `--positive: var(--ink)`, `--negative: var(--accent)`, `--warning/--neutral` = mixes via `color-mix()`. Direction MUST also be carried by ▲/▼ glyphs/weight, never color alone (good a11y practice regardless; louder themes can remap to green/red later). `--border-w:3px`, `--shadow: 6px 6px 0 var(--ink)`, `--hover-shift: 3px 3px`, `--radius:0`, no gradients/transparency. Display font (Archivo Black-ish) + mono body. Focus = thick accent outline, always visible (focus visibility is base.css, not theme — a11y isn't themeable away).

## Components by group

### 0. Foundations
tokens.css, base.css (reset/type/focus/@layer/color-scheme), themes/

### 1. Primitives (generic)
- Button (`<button>`) + icon variant
- Badge/Tag (`<span>`)
- Card/Panel (`<article>`, donut-scoped)
- Skeleton loader (@property-animated)
- Empty state

### 2. Finance/Data (depends on 0-1 only; groups 3-5 must NOT depend on this → enables bleed-core.css build)
- Stat/KPI card: big number + label + delta; container query compact/full
- Data table: sticky thead, `text-align:end` + `font-variant-numeric: tabular-nums` numeric cols, zebra, `:has()` row states
- Delta indicator (`<data value>`): ▲/▼ + %, semantic colors
- Sparkline: inline SVG, CSS-styled, no JS
- CSS bar chart: `<table>` + `<td style="--value:73">` bars; stays real table for SR. Beyond bars → BYO chart lib into donut-scoped panel
- Progress/capacity: `<progress>`, `<meter>` (low/high/optimum = budget thresholds)
- Definition-list stats (`<dl>`)
- `.num` utility + `<data>` convention. Currency/locale formatting = HTML/JS-land, CSS only guarantees alignment

### 3. Layout
- Dashboard grid: auto-fit, `data-span="2"`
- Header bar (`<header>`, `<time>` last-updated)
- Sidebar nav (`<nav>` + `<details>` collapsible groups)
- Toolbar/filter bar (`<form>` + `<fieldset>`)

### 4. Inputs & Controls
- Form fields: `:user-invalid`, `.field:has(:user-invalid)` wrapper
- Select/checkbox/radio/range: `accent-color`
- Tabs / segmented control: THE one JS component (~15 lines, role=tablist, arrow-key nav). Primary use = period switcher (1D/1W/1M/YTD). No radio hack (breaks a11y)

### 5. Feedback & Overlays
- Modal (`<dialog>`, styled `::backdrop`, ~5 lines JS showModal)
- Popover/dropdown (popover attr + anchor positioning) — row "⋯" menus
- Tooltip (popover hint)
- Toast (`<output role="status">`, ~10 lines JS)
- Alert banner (`role="alert"`)

## Layout
```
sd.config.js     outputReferences:true, per-theme file entries
src/
  tokens/        *.json (DTCG), per-theme, finance semantics inline
  foundations/   tokens.css(generated) base.css themes/
  components/
    core/        primitives + layout + inputs + feedback
    finance/
  runtime.js
dist/            themes/bleed.css, runtime.js
index.html       kitchen sink + live theme switcher
build: npm run build (SD + concat). Note in README: was "no build step", traded for JSON single source of truth
```

## Milestones
1. Foundations + Primitives (button/card/badge). Exit: BOTH newspaper (color swap) AND soft (geometry/effect swap — rounded, blurred, no hover shift) restyle all w/ zero component-CSS edits. Soft theme passing = brutalism confirmed theme-layer only.
2. Finance tier (KPI card, table, delta, sparkline, bars, meter, dl). Proves the concept.
3. Layout + Inputs (incl tabs JS).
4. Feedback/overlays + kitchen-sink demo w/ theme switcher + a11y/contrast pass. Theme switcher = regression test: component wrong in newspaper theme = hardcoded value bug.

## README notes
- Support cliff warning: @scope + anchor positioning + @property = bleeding edge, fine for personal use
- Document bare-element styling inside scopes (h3 in .card gets styled — intentional, documented)
- Inputs group = "form-adjacent; tabs needs runtime.js"; everything else zero-JS
