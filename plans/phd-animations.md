# Plan (rev 3): PhD-page main figure — Mountain path (yamamichi)

## Context

Rev 1 implemented the status-box ensō (approved, staying untouched) and a karesansui rock-garden CFA figure. **User feedback:** the rock garden doesn't look good or obvious — replace the main figure with something that can be completely unrelated to CFA/supervision topics. **User chose: Mountain path** — a winding ink path ascending layered mountains to a vermilion summit, with optional milestone marks. Metaphor: the PhD as a long road walked together.

## Approach

Replace the rock-garden figure in `src/pages/phd-supervision.astro` with a sumi-e style mountain composition (viewBox 680×420, same figure slot):

- **Layered ridges** (back → near): 3 wobbly brush polylines in `var(--motif-stroke)` / `var(--colour-ink-faint)` for depth, drawn first.
- **The path**: one continuous cubic-Béziers line from bottom-left winding up to the summit (~492,96), `var(--colour-ink-muted)` stroke ~1.7 — drawn after ridges.
- **Milestones**: 4 small vermilion dots along the path with tiny mono labels — proposal, fieldwork, writing, viva (reuses `phd-cfa__box-label` styling conventions, `data-fade`).
- **Summit peak**: small brush peak outline in ink; a **tiny vermilion ensō ring** at the very top — drawn last, echoing the site brand mark and the status-box ensō.
- **Mist**: 2 short wavy ink lines at the base.
- Draw order via `data-draw-root data-stagger="90"`: ridges → mist → path → peak → milestone dots → summit ensō; labels `data-fade`.
- Caption (keeps existing caption style): "the long road, walked together".
- All colors via theme tokens (light/dark safe). No idle loop → reduced-motion users simply get the fully-drawn static composition (the draw-on-scroll system already guards reduced motion); keyframes only for nothing — no extra animation beyond the scroll draw. `phd-stone-breath` CSS and `GARDEN` helper removed.

## Files to modify

- `src/pages/phd-supervision.astro` only:
  - Frontmatter: delete `GARDEN` helper.
  - Markup: replace the rock-garden `<figure>` inner SVG with the mountain path composition (keep `<figure class="phd__cfa reveal">` wrapper and caption element).
  - Styles: delete `.phd-stone-breath` keyframes block; keep `.phd__cfa`, label, caption styles.

## Reuse

- Scroll-draw system (`data-draw-root`, `data-draw`, `data-stagger`, `data-fade`, `.reveal`) in `src/layouts/BaseLayout.astro` (~line 135) — no JS changes needed.
- Theme tokens from `src/styles/tokens.css`; label/caption classes already on the page.

## Steps

- [ ] Replace `GARDEN` frontmatter helper with nothing (hardcode the path/ridge `d` strings inline in markup; they're static).
- [ ] Replace figure markup with mountain-path SVG (ridges, mist, path, peak, milestone dots + labels, summit ensō ring; `data-draw-root data-stagger="90"`).
- [ ] Update caption text to "the long road, walked together".
- [ ] Remove `phd-stone-breath` keyframes block from styles.
- [ ] Rebuild `npm run build`; rasterize the built SVG to visually verify composition; check live page in both themes and with reduced-motion emulation.

## Verification

- `npm run build` succeeds (13 pages).
- Rasterized figure looks balanced (path winds clearly, summit reads, labels legible).
- Live check `http://localhost:4322/phd-supervision/`: sequential draw on scroll; light + dark themes; reduced-motion shows static completed figure; ensō status box unaffected.
