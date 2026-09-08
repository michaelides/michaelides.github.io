# George Michaelides — personal site

Personal academic website for George Michaelides (Professor of Work Psychology,
Norwich Business School, UEA). Lives at `https://michaelides.github.io/`. Built
with [Astro](https://astro.build), deployed via GitHub Pages.

Static, self-contained, and dependency-light: a handful of pages, a YAML-driven
publications list, a Markdown-driven news log, RSS, JSON-LD, a sitemap, and a
`mailto:` for contact. No analytics, no tracking, no third-party requests at
runtime — fonts are self-hosted at build time.

---

## Local development

Requires Node 20+ (CI uses 22).

```sh
npm install
npm run dev          # dev server on http://localhost:4321
npm run check        # type-check pages + validate the YAML data files
npm run build        # static build into dist/
npm run preview      # serve the production build
```

`npm run build` needs network access on a cold cache: Astro downloads the web
fonts once and caches them under `node_modules/.astro`.

---

## Deployment

Push to `main`. `.github/workflows/deploy.yml` runs `npm ci`, `npm run check`,
`npm run build`, then publishes `dist/` with `actions/deploy-pages@v4`.

`npm run check` is a gate, not a formality: it type-checks every page and
validates `site.yaml` and `publications.yaml` against the Zod schemas in
`src/lib/data.ts`. A malformed data edit fails the build with the offending
field path rather than rendering as `undefined` on the live site.

---

## Maintenance — the things you will actually do

### 1. Add or correct a publication

`src/data/publications.yaml` is the source of truth (74 entries, 2002–2026).
Each entry:

```yaml
- id: 2024-michaelides-a-dual-process-model-of-the-effects-of-boundary
  authors:                 # as published, in order
    - George Michaelides
    - Karen Niven
  year: 2024               # integer
  title: A dual-process model of the effects of boundary segmentation…
  venue: Journal of Occupational and Organizational Psychology   # journal/book name ONLY
  biblio: 97(4), 1502-1525 # volume/issue/pages — kept separate so it is not italicised
  type: article            # article | chapter | report | conference | preprint
  doi: 10.1111/joop.12526  # bare DOI, no https:// prefix
  url: https://doi.org/10.1111/joop.12526
  pdf: null                # path under public/, if a copy is permitted
  award: null              # e.g. "Best Paper Award 2024"
  role: first              # first | middle | last
```

Keep `venue` free of volume and page numbers — the page italicises `venue` and
prints `biblio` upright after it. `type` is a closed set; anything else fails
validation.

### 2. Re-pull from OpenAlex

```sh
npm run fetch-publications   # pull works for the ORCID iD, merge with existing
npm run curate-publications  # drop namesakes, dedupe, re-apply awards
```

`fetch-publications.mjs` preserves hand-corrected `venue`, `biblio`, `award`,
`pdf` and `notes` on re-import, so curation survives a refresh.

**OpenAlex attributes works by other people with this name and ORCID.** Anything
that is not his belongs in the `EXCLUDE` list in `curate-publications.mjs`
(which already covers a topologist, a psychiatrist and a clinical immunologist).
Always read the diff after a re-pull.

### 3. Add a news post

Drop a Markdown file in `src/content/news/` named `YYYY-MM-DD-slug.md`:

```yaml
---
title: A short, honest title
date: 2026-06-12
type: note           # talk | podcast | press | reflection | award | publication | note
summary: One-line preview shown on the index page.
venue: Human Relations           # optional
external: https://doi.org/…      # optional; adds an "Original source" link
---

Two to four paragraphs of plain Markdown.
```

The post appears on `/news/`, in `/rss.xml` and in the sitemap on the next
build. Posts with an `external` link still get their own page — the title links
internally and the external link sits below the summary.

### 4. Update the PhD recruitment status

All of it lives in `src/data/site.yaml`:

```yaml
phdStatus: open                     # open | closed | seasonal
phdStatusLabel: Open for 2026/27 entry
phdStatusNote: I am currently welcoming applications for …
```

`phdStatus` drives the indicator dot on the home page and the styling of the
status box on `/phd-supervision/`; `closed` renders both in a neutral tone.

### 5. Update the "Selected" shortlist on the home page

Edit the `const selected = [...]` block in `src/pages/index.astro`. Each entry
carries the citation fields plus a `gloss` — one plain-English sentence. Five
entries is the intended length.

### 6. Swap the portrait

Replace `src/assets/portrait.jpg` (~810px wide, 3:4, JPEG). It is processed by
`astro:assets` into AVIF/WebP/JPEG at 270/540/810w.

**Strip the metadata first.** The previous portrait shipped with GPS
coordinates and the phone model in its EXIF:

```sh
npx sharp-cli -i original.jpg -o src/assets/portrait.jpg resize 810 -- jpeg --quality 82
# or: sharp(input).rotate().resize({width:810}).jpeg({quality:82}).toFile(output)
```

`.rotate()` bakes in the EXIF orientation before the metadata is dropped.

### 7. Change colours, type, or spacing

All design tokens are in `src/styles/tokens.css`. Both themes are defined there;
`[data-theme='dark']` overrides the same custom properties.

Two gotchas when editing component styles:

- **Theme selectors must use `:global`.** Inside a scoped `<style>`, write
  `:global([data-theme='dark']) .thing { … }`. A bare `[data-theme='dark'] .thing`
  gets the component's scope attribute added to *both* compounds, including the
  `<html>` selector, and silently never matches.
- **Text colours must clear 4.5:1.** The token comments record the ratio of each
  ink tone against paper. `--colour-ink-faint` is the floor at ~5:1.

---

## Project structure

```
.
├── astro.config.mjs              # site URL, sitemap, mdx, self-hosted fonts
├── .github/workflows/deploy.yml  # check → build → GitHub Pages
├── public/                       # copied verbatim: favicon, OG card, robots.txt
├── scripts/
│   ├── fetch-publications.mjs    # OpenAlex pull, preserves curated fields
│   └── curate-publications.mjs   # exclude namesakes, dedupe, apply awards
└── src/
    ├── assets/portrait.jpg       # processed by astro:assets
    ├── content.config.ts         # news collection schema
    ├── content/news/*.md
    ├── data/
    │   ├── site.yaml             # identity, links, office, PhD status
    │   └── publications.yaml
    ├── layouts/BaseLayout.astro  # head, meta, JSON-LD, fonts, scroll reveals
    ├── components/               # Nav, Footer, Logo, JsonLd
    ├── lib/
    │   ├── data.ts               # Zod-validated YAML loaders
    │   └── format.ts             # date + search-normalisation helpers
    ├── pages/
    │   ├── index.astro           # /            (About + selected work)
    │   ├── research.astro        # /research/
    │   ├── publications.astro    # /publications/   (filter + search)
    │   ├── software.astro        # /software/
    │   ├── phd-supervision.astro # /phd-supervision/
    │   ├── news/{index,[...slug]}.astro
    │   ├── contact.astro         # /contact/
    │   ├── rss.xml.ts            # /rss.xml
    │   └── 404.astro
    └── styles/{tokens,global}.css
```

---

## Design notes

- **Type:** Newsreader (display), Inter (body), JetBrains Mono (eyebrows and
  meta). Declared in `astro.config.mjs` and **self-hosted** — the build
  downloads them, so the site makes no request to Google Fonts. Metric-matched
  fallbacks are generated automatically to avoid layout shift.
- **Colour:** vermilion `#B3432B` on washi `#F6F1E8` with sumi ink `#26221C`.
  Dark mode is first-class ("night studio"), toggled in the nav and persisted to
  `localStorage`, with the choice applied before first paint to avoid a flash.
- **Motion:** a page-load fade, scroll-triggered reveals, self-drawing SVG
  line-art, and one interactive piece — the ensō framing a Gaussian mixture that
  follows the cursor. All of it respects `prefers-reduced-motion`; the ensō loop
  pauses when off-screen or in a background tab.
- **Progressive enhancement:** the scroll-reveal styles are gated behind a `.js`
  class set in the head, so with JavaScript disabled the content is simply never
  hidden. Printing forces the light palette and reveals everything.
- **Accessibility:** WCAG 2.1 AA. Skip link, visible focus rings, a focus-trapped
  mobile menu, live-region announcements on the publications filters, and
  "(opens in a new tab)" on every external link. Verified clean with axe-core in
  both themes.

---

## Licences & credits

Site code is MIT. Newsreader, Inter and JetBrains Mono are OFL. Publication
metadata comes from [OpenAlex](https://openalex.org) (CC0).
