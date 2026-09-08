#!/usr/bin/env node
/**
 * fetch-publications.mjs
 * ---------------------
 * One-time (or occasional) tool to populate src/data/publications.yaml from
 * the OpenAlex API, filtered to works authored under the given ORCID iD.
 *
 * Usage:
 *   node scripts/fetch-publications.mjs
 *   npm run fetch-publications
 *
 * What it does:
 *   1. Paginates through OpenAlex works where the ORCID is an author
 *   2. Maps each work to the publications.yaml schema
 *   3. Merges with existing entries to PRESERVE any curated fields
 *      (award, pdf, notes, biblio, and a hand-corrected venue)
 *   4. Writes the result to src/data/publications.yaml
 *
 * After running, review and add:
 *   - award: any prize information
 *   - pdf: path to a permitted PDF copy (if any)
 *   - notes: rare editorial notes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const YAML_PATH = path.join(ROOT, 'src/data/publications.yaml');

const ORCID = '0000-0002-4224-7728';
const MAILTO = 'g.michaelides@uea.ac.uk';
const BASE = 'https://api.openalex.org/works';
const PER_PAGE = 200;

/* ------------------------------------------------------------------------- */
/* OpenAlex fetch                                                            */
/* ------------------------------------------------------------------------- */

async function fetchAllWorks() {
  const all = [];
  let cursor = '*';
  let page = 0;

  while (cursor) {
    const url = new URL(BASE);
    url.searchParams.set('filter', `authorships.author.orcid:${ORCID}`);
    url.searchParams.set('per-page', String(PER_PAGE));
    url.searchParams.set('mailto', MAILTO);

    if (cursor !== '*') url.searchParams.set('cursor', cursor);

    const res = await fetch(url, {
      headers: { 'User-Agent': `michaelides-academic-site/1.0 (mailto:${MAILTO})` },
    });

    if (!res.ok) {
      throw new Error(`OpenAlex ${res.status} ${res.statusText} on page ${page + 1}`);
    }

    const data = await res.json();
    all.push(...data.results);
    cursor = data.meta?.next_cursor || null;
    page += 1;
    console.log(`  page ${page}: ${data.results.length} results${cursor ? ' (more)' : ' (done)'}`);

    // Be polite
    await new Promise((r) => setTimeout(r, 200));
  }

  return all;
}

/* ------------------------------------------------------------------------- */
/* Mapping                                                                   */
/* ------------------------------------------------------------------------- */

function mapType(openalexType) {
  const m = {
    article: 'article',
    'book-chapter': 'chapter',
    report: 'report',
    preprint: 'preprint',
    paratext: 'article',
    dataset: 'report',
    review: 'article',
    editorial: 'article',
    letter: 'article',
    erratum: 'article',
    book: 'report',
    monograph: 'report',
    'reference-entry': 'chapter',
  };
  return m[openalexType] || 'article';
}

function stripDoi(doi) {
  if (!doi) return null;
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 70);
}

function mapWork(work) {
  const authors = work.authorships
    .map((a) => a.raw_author_name || a.author?.display_name || '')
    .filter(Boolean);

  const george = work.authorships.find(
    (a) => a.author?.orcid === `https://orcid.org/${ORCID}`,
  );

  const venue =
    work.primary_location?.source?.display_name ||
    work.host_venue?.display_name ||
    work.biblio?.venue?.name ||
    null;

  const doi = stripDoi(work.doi);

  const year = work.publication_year || null;
  const title = (work.title || work.display_name || '').trim();

  const firstAuthor = authors[0]?.split(',')[0]?.toLowerCase() || 'work';
  const id = slugify(`${year ?? 'nd'}-${firstAuthor}-${title}`);

  return {
    id,
    authors,
    year,
    title,
    venue,
    biblio: null,
    type: mapType(work.type),
    doi,
    url: doi ? `https://doi.org/${doi}` : work.primary_location?.landing_page_url || null,
    pdf: null,
    award: null,
    role: george?.author_position || null,
  };
}

/* ------------------------------------------------------------------------- */
/* Merge with existing                                                       */
/* ------------------------------------------------------------------------- */

function loadExisting() {
  if (!fs.existsSync(YAML_PATH)) return [];
  const raw = fs.readFileSync(YAML_PATH, 'utf8');
  try {
    const parsed = yaml.load(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('  (could not parse existing YAML, starting fresh)');
    return [];
  }
}

function preserveCuratedFields(incoming, existing) {
  // Build lookup of existing entries by id, doi, and (year+title) for resilience
  const byId = new Map();
  const byDoi = new Map();
  const byYearTitle = new Map();

  for (const e of existing) {
    if (e.id) byId.set(e.id, e);
    if (e.doi) byDoi.set(e.doi, e);
    if (e.year && e.title) byYearTitle.set(`${e.year}::${e.title.toLowerCase()}`, e);
  }

  return incoming.map((entry) => {
    const prior =
      byId.get(entry.id) ||
      (entry.doi && byDoi.get(entry.doi)) ||
      byYearTitle.get(`${entry.year}::${entry.title.toLowerCase()}`);

    if (!prior) return entry;

    // Preserve curated fields if they exist.
    // `venue` and `biblio` are hand-corrected (OpenAlex often reports a repository
    // or a venue string with volume/pages baked in), so a prior value always wins.
    return {
      ...entry,
      venue: prior.venue ?? entry.venue,
      biblio: prior.biblio ?? null,
      award: prior.award ?? entry.award,
      pdf: prior.pdf ?? entry.pdf,
      notes: prior.notes ?? entry.notes,
    };
  });
}

/* ------------------------------------------------------------------------- */
/* YAML emit                                                                 */
/* ------------------------------------------------------------------------- */

function emitHeader(count) {
  return [
    '# Publications — single source of truth.',
    `# Last import: ${new Date().toISOString().slice(0, 10)}`,
    '# Source: OpenAlex (https://api.openalex.org)',
    `# ${count} works fetched for ORCID ${ORCID}`,
    '# Run curate-publications.mjs after this to dedupe and re-apply awards.',
    '',
    '# Schema (all fields optional except id, year, title, venue, type):',
    '#   id:        unique slug',
    '#   authors:   list of names as published (Surname, F.)',
    '#   year:      integer',
    '#   title:     paper title',
    '#   venue:     journal or book title (no volume/issue/pages)',
    '#   biblio:    volume/issue/pages, e.g. "97(4), 1502-1525"',
    '#   type:      article | chapter | report | conference | preprint',
    '#   doi:       DOI string, no URL prefix',
    '#   url:       canonical URL (publisher preferred)',
    '#   pdf:       path to a permitted PDF copy, relative to /public',
    '#   award:     string, e.g. "Best Paper Award 2024"',
    '#   role:      first | middle | last',
    '#   notes:     free-text editorial note (rare)',
    '',
    '# Newest first within each year. Edit freely; the site rebuilds on push.',
    '',
  ].join('\n');
}

/* ------------------------------------------------------------------------- */
/* Main                                                                      */
/* ------------------------------------------------------------------------- */

async function main() {
  console.log(`Fetching works for ORCID ${ORCID} from OpenAlex...`);
  const works = await fetchAllWorks();
  console.log(`Total works returned: ${works.length}`);

  const mapped = works.map(mapWork).filter((w) => w.year);

  // Sort newest first; tiebreak on title
  mapped.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (a.title || '').localeCompare(b.title || '');
  });

  const existing = loadExisting();
  console.log(`Existing entries in publications.yaml: ${existing.length}`);

  const merged = preserveCuratedFields(mapped, existing);

  const header = emitHeader(merged.length);
  const body = yaml.dump(merged, { lineWidth: 100, noRefs: true, sortKeys: false });

  // Backup the existing file if it has content
  if (existing.length > 0) {
    const backupPath = YAML_PATH.replace(/\.yaml$/, `.backup.${Date.now()}.yaml`);
    fs.copyFileSync(YAML_PATH, backupPath);
    console.log(`Backed up existing file to ${path.basename(backupPath)}`);
  }

  fs.writeFileSync(YAML_PATH, header + body);
  console.log(`Wrote ${merged.length} publications to ${path.relative(ROOT, YAML_PATH)}`);
  console.log('\nNext steps:');
  console.log('  1. Review the YAML, correct any obvious mapping issues');
  console.log('  2. Run `npm run curate-publications` to dedupe and re-apply awards');
  console.log('  3. git add src/data/publications.yaml && git commit');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
