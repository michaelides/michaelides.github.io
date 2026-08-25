# George Michaelides — personal site

A small, hand-built academic website for Dr George Michaelides (Professor of Work
Psychology, UEA). Lives at `https://michaelides.github.io/`. Built with
[Astro](https://astro.build), deployed via GitHub Pages.

The site is intentionally simple: a few static pages, a YAML-driven publications
list, a Markdown-driven news log, RSS, JSON-LD, a sitemap, and a `mailto:` for
contact. No tracking, no dark mode, no search, no comments.

---

## Local development

Requires Node 20+.

```sh
npm install
npm run dev          # start dev server on http://localhost:4321
```

Build the static site into `dist/`:

```sh
npm run build        # astro build
```

Preview the production build:

```sh
npm run preview
```

Other one-shot scripts:

```sh
npm run fetch-publications   # re-pull publications from OpenAlex (using ORCID iD)
npm run curate-publications  # re-apply theme / award tags from the lookup table
```

---

## Deployment

The repo is set up to deploy via GitHub Pages using
`actions/deploy-pages@v4`. Push to `main` on the `michaelides.github.io` repo
and the workflow in `.github/workflows/deploy.yml` will:

1. Install Node 20
2. Run `npm ci`
3. Run `npm run build`
4. Upload `dist/` as a Pages artifact and deploy it

### First-time setup on a fresh GitHub repo

1. Create a repo called `michaelides.github.io` (this exact name — it must
   match the user/org name for the user site to work).
2. Push this directory to it: `git remote add origin git@github.com:michaelides/michaelides.github.io.git`
   then `git push -u origin main`.
3. In the repo settings → **Pages**, set Source to **GitHub Actions**. The
   workflow will handle the rest.
4. Wait ~60 seconds. The site should be live at
   `https://michaelides.github.io/`.

### Subsequent updates

```sh
git add -A
git commit -m "what changed"
git push
```

That's it. The GitHub Action rebuilds and redeploys.

---

## Maintenance — the things you will actually do

### 1. Add a new publication

The publications list is driven by `src/data/publications.yaml`. Each entry
looks like this:

```yaml
- id: openalex:W1234567890
  type: article          # article | chapter | conference | book | other
  title: The title of the paper
  authors:
    - Surname, A. B.
    - Surname, C. D.
  year: 2025
  venue: Journal Name
  doi: 10.1234/abc.def
  url:                    # optional, used when there's no DOI
  themes:                 # zero or more of: work-nonwork | assessment | wellbeing | remote | teams | personality
    - work-nonwork
  award: Best Paper 2025  # optional
  notes:                 # optional
  openalex: W1234567890
  curated: true
```

To **re-pull from OpenAlex** (which already dedupes, filters to English /
journal articles, and writes the YAML in this shape):

```sh
npm run fetch-publications
npm run curate-publications
```

That second command reads from `scripts/curate-publications.mjs`, which has
a hand-maintained lookup table of themes keyed by OpenAlex
ID. If a new paper doesn't yet have a theme tag, edit
`scripts/curate-publications.mjs` to add it, then re-run.

If a paper has no OpenAlex record (rare, e.g. a forthcoming chapter), you
can add it by hand to the YAML with a custom `id: manual:slug-here`.

### 2. Promote a paper to the "Selected" shortlist on the About page

Edit `src/pages/index.astro`, find the `const selected = [...]` block, and
add (or replace) an entry. Each selected paper has the same shape as a YAML
entry plus a `gloss` field with a one-sentence plain-English summary.

The current shortlist (July 2026): Petrou 2026, Jackson 2016,
Jackson 2020, Michaelides 2024, Fitzhugh 2024 (Best Paper
Award).

### 3. Add a News post

Drop a Markdown file in `src/content/news/` named `YYYY-MM-DD-slug.md` with
this frontmatter:

```yaml
---
title: A short, honest title
date: 2026-06-12
type: note           # talk | podcast | press | reflection | award | note
summary: One-line preview that shows on the index page.
---

The body of the post in plain Markdown. Keep it light, first-person,
specific. Two to four paragraphs is usually right.
```

Save the file. The next `npm run build` picks it up automatically. The
post will appear on `/news/`, in the RSS feed, and in the sitemap.

### 4. Update the "Currently" board on the About page

Edit `src/pages/index.astro` and find the `<ul class="currently">` block.
Each `<li>` has a label and a status: a `<span class="dot dot--on">` for
on, or `<span class="dot">` for off. The "PhD applications" item is the
only one that flips seasonally.

### 5. Swap the portrait

Replace `public/images/portrait.jpg`. Aim for ~933×1248 (3:4), JPEG, and
neutral lighting. The CSS already converts it to greyscale, but starting
from a colour original gives you the freedom to remove that filter later.

### 6. Change colours, type, or spacing

All design tokens are in `src/styles/tokens.css`. Edit the CSS custom
properties at the top of the file — every page will pick up the change.
Type families are declared in `src/styles/global.css`.

---

## Project structure

```
.
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   ├── og-default.png       # 1200×630 social card
│   ├── robots.txt
│   ├── images/portrait.jpg
├── scripts/
│   ├── fetch-publications.mjs   # OpenAlex pull
│   └── curate-publications.mjs  # apply theme tags
├── .github/workflows/deploy.yml # GitHub Pages deploy
└── src/
    ├── content.config.ts
    ├── content/news/*.md        # News posts
    ├── data/
    │   ├── site.yaml            # identity, links, "last updated" date
    │   └── publications.yaml    # the publication list
    ├── layouts/BaseLayout.astro
    ├── components/
    │   ├── Nav.astro
    │   ├── Footer.astro
    │   └── JsonLd.astro
    ├── lib/
    │   ├── data.ts              # YAML loaders
    │   └── format.ts            # date / slug helpers
    ├── pages/
    │   ├── index.astro          # /          (Home + About, merged)
    │   ├── research.astro       # /research/
    │   ├── publications.astro   # /publications/
    │   ├── phd-supervision.astro# /phd-supervision/
    │   ├── news/
    │   │   ├── index.astro      # /news/
    │   │   └── [...slug].astro  # /news/<slug>/
    │   ├── contact.astro        # /contact/
    │   ├── rss.xml.ts           # /rss.xml
    │   └── 404.astro
    └── styles/
        ├── tokens.css
        └── global.css
```

---

## Design notes (for the curious)

- **Type stack:** Fraunces (display, optical-size 144, weight 400/600),
  Inter (body, weight 400/500/600), JetBrains Mono (eyebrows, code).
  All served from Google Fonts.
- **Colour:** one accent — deep teal `#0F4C4C` — on paper-white `#FAF8F5`
  with `#1A1A1A` text. The teal also renders as the favicon monogram.
- **Motion:** a single `fade-in` animation on first paint, 600ms,
  no other JS-driven motion. Everything else is CSS hover / focus.
- **No dark mode, no analytics, no search, no comments.** Those are
  choices, not oversights.

---

## Licences & credits

The site code is MIT. Typefaces are OFL (Fraunces, JetBrains Mono) and
OFL (Inter). Portrait image is © UEA, used with permission. Publication
metadata is sourced from [OpenAlex](https://openalex.org) (CC0 public
domain dedication).
