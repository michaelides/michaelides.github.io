# Site Redesign — "Sumi & Washi" Zen Editorial

Date: 2026-08-21
Status: Approved (in conversation)

## Goal

Complete visual redesign of the George Michaelides academic site. Fresh identity:
calm, warm, zen Japanese-art aesthetic that conveys sophistication and quietly
connects to advanced psychometrics. Content, data pipeline, RSS, sitemap and
JSON-LD are unchanged.

## Direction

- **Approach A "Sumi & Washi"** — quiet editorial zen with one signature
  interactive piece.
- Light **and** dark mode, both first-class ("day studio" / "night studio").
- Moderate motion: scroll reveals, ensū interaction, theme cross-fade.
- Scope: redesign + page restructure; information architecture unchanged.

## Visual language

### Palette — light ("day studio")
| Token | Value | Use |
|---|---|---|
| paper | `#F6F1E8` | background |
| paper-deep | `#EFE8DB` | panels |
| ink | `#26221C` | text |
| ink-muted | `#6B6357` | secondary |
| ink-faint | `#9A9184` | meta |
| accent (shu) | `#B3432B` | vermilion: links, ensū, active |
| accent-2 (matcha) | `#7A8B6F` | tags/themes |
| rule | `#DDD3C2` | hairlines |

### Palette — dark ("night studio")
| Token | Value |
|---|---|
| paper | `#191D24` |
| paper-deep | `#20252E` |
| ink | `#EDE7DA` |
| ink-muted | `#A79E8F` |
| ink-faint | `#6E6759` |
| accent | `#E06A4A` |
| accent-2 | `#8FA07E` |
| rule | `#333945` |

Theme toggle persists in `localStorage`, defaults to `prefers-color-scheme`,
cross-fades via CSS transition on colour tokens.

### Typography
- Display: **Newsreader** (Google Fonts), light weights, optical sizing.
- Body: **Inter** (unchanged).
- Mono: **JetBrains Mono** for eyebrows, dates, DOIs, stats.

### Motifs
- Ensū circle rendered as a kernel-density curve — signature interactive hero
  piece (draws on load, breathes near cursor).
- Hairline statistical line-art (normal curves, scatter clouds) as section
  dividers / low-opacity backdrops. Inline SVG only.
- Vertical-text Japanese labels beside section headings (decorative,
  `aria-hidden`).
- Ink-wash gradient in footer.

## Pages

- **Home**: hero (name, role, warm portrait print + ensū piece), currently
  board, selected publications cards, scatter-cloud backdrop.
- **Research**: theme study-cards grid, hairline curve dividers.
- **Publications**: year-grouped list kept; minimal ink-outline filter pills;
  mono stats strip; client-side search box.
- **PhD supervision**: editorial prose + numbered topic list.
- **News**: vertical brush-stroke timeline, sparse entries, mono dates.
- **Contact**: spacious, brushstroke-underline email link, quiet office card.
- **Nav/Footer**: slim top bar with mono labels; footer ink-wash + ensū echo.

## Technical

- No new frameworks. One small vanilla JS module: theme toggle, ensū canvas/
  SVG interaction, IntersectionObserver reveals, publication search.
- All motion gated behind `prefers-reduced-motion`.
- WCAG AA contrast both modes; visible focus rings; semantic HTML preserved.
- Files touched: `tokens.css`, `global.css`, `BaseLayout.astro`, `Nav.astro`,
  `Footer.astro`, all pages. Data/YAML/RSS untouched.
