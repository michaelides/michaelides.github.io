#!/usr/bin/env node
/**
 * curate-publications.mjs
 * -----------------------
 * Curation pass on src/data/publications.yaml:
 *   1. Drops works by other authors who share the ORCID iD or the name.
 *   2. Removes obvious duplicates (repository deposits when a published
 *      version with a real DOI exists for the same year + title).
 *   3. Re-applies award tags from a hand-curated lookup table.
 *
 * Safe to re-run after `npm run fetch-publications`; everything it does is
 * derived from the table below, so hand edits to other fields survive.
 *
 * After running, review the file and adjust by hand.
 *
 * Usage:
 *   node scripts/curate-publications.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const YAML_PATH = path.join(ROOT, 'src/data/publications.yaml');

/* ------------------------------------------------------------------------- */
/* Hand-curated awards                                                       */
/*                                                                           */
/* Keys are title / DOI / URL substrings (case-insensitive).                 */
/* Only used to set `award`; everything else stays as-is.                    */
/* ------------------------------------------------------------------------- */

const CURATION = [
  {
    match: /mindfulness for performance and wellbeing in the police/i,
    award: 'Best Paper Award 2024',
  },
];

/* ------------------------------------------------------------------------- */
/* Exclusions                                                                */
/*                                                                           */
/* OpenAlex occasionally attributes works by other authors who share an ORCID */
/* or a similar name to this site's owner. These are dropped by the curate   */
/* pass. Match by DOI, title substring, or venue.                             */
/* ------------------------------------------------------------------------- */

const EXCLUDE = [
  /* Different "George Michaelides" (mathematician, topology / m-spaces) */
  /m-spaces|solenoid|quasilinear|adjunction spaces|topological m-spaces|means on adjunction/i,
  /* Different "George Michaelides" (psychiatry, clinical case report) */
  /rTMS and ketamine|saabneh|psychiatria danubina/i,
  /* Different "George Michaelides" (clinical immunology, G. J. Michaelides) */
  /blood histamine|food allergens as a diagnostic/i,
];

/* ------------------------------------------------------------------------- */
/* Deduplication                                                             */
/* ------------------------------------------------------------------------- */

function normaliseTitle(t) {
  return (t || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function pickCanonical(entries) {
  // Prefer published (non-UEA repository) over repository
  const sorted = entries.slice().sort((a, b) => {
    const aRepo = (a.venue || '').toLowerCase().includes('uea digital');
    const bRepo = (b.venue || '').toLowerCase().includes('uea digital');
    if (aRepo !== bRepo) return aRepo ? 1 : -1;
    // Prefer entries with a DOI
    if (Boolean(a.doi) !== Boolean(b.doi)) return a.doi ? -1 : 1;
    return 0;
  });
  return sorted[0];
}

function dedupe(entries) {
  const groups = new Map();
  for (const e of entries) {
    const key = `${e.year}::${normaliseTitle(e.title)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const out = [];
  for (const group of groups.values()) {
    out.push(pickCanonical(group));
  }
  return out;
}

/* ------------------------------------------------------------------------- */
/* Apply curation                                                            */
/* ------------------------------------------------------------------------- */

function curate(entries) {
  return entries.map((e) => {
    const haystack = `${e.title || ''} ${e.doi || ''} ${e.url || ''}`;
    for (const rule of CURATION) {
      if (rule.match.test(haystack)) {
        return { ...e, award: rule.award ?? e.award ?? null };
      }
    }
    return e;
  });
}

/* ------------------------------------------------------------------------- */
/* Main                                                                      */
/* ------------------------------------------------------------------------- */

function main() {
  if (!fs.existsSync(YAML_PATH)) {
    console.error('publications.yaml not found; run fetch-publications first');
    process.exit(1);
  }

  const raw = fs.readFileSync(YAML_PATH, 'utf8');
  const entries = yaml.load(raw) || [];
  console.log(`Loaded ${entries.length} entries`);

  // OpenAlex sometimes returns works by other authors who share the ORCID iD
  // range or a similar name. The subject of this site (work psychology) has
  // published nothing before 2000, so anything pre-2000 is a different person.
  const minYear = 2000;
  const yearFiltered = entries.filter((e) => (e.year || 0) >= minYear);
  const removedPre = entries.length - yearFiltered.length;
  if (removedPre > 0) {
    console.log(`Filtered to year >= ${minYear}: removed ${removedPre} entries by other authors.`);
  }

  // Hard exclusions: works by other authors who share the ORCID iD or name.
  const excluded = yearFiltered.filter((e) => {
    const haystack = `${e.title || ''} ${e.doi || ''} ${e.venue || ''}`;
    return EXCLUDE.some((re) => re.test(haystack));
  });
  const kept = yearFiltered.filter((e) => {
    const haystack = `${e.title || ''} ${e.doi || ''} ${e.venue || ''}`;
    return !EXCLUDE.some((re) => re.test(haystack));
  });
  if (excluded.length > 0) {
    console.log(`Excluded ${excluded.length} entr${excluded.length === 1 ? 'y' : 'ies'} by other authors:`);
    for (const e of excluded) {
      console.log(`  - ${e.year} ${(e.title || '').slice(0, 60)} (${e.id || e.doi || ''})`);
    }
  }

  const deduped = dedupe(kept);
  console.log(`After dedup: ${deduped.length} entries (removed ${kept.length - deduped.length})`);

  const curated = curate(deduped);

  // Re-sort newest first
  curated.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (a.title || '').localeCompare(b.title || '');
  });

  // Backup
  const backupPath = YAML_PATH.replace(/\.yaml$/, `.pre-curate.${Date.now()}.yaml`);
  fs.copyFileSync(YAML_PATH, backupPath);
  console.log(`Backed up to ${path.basename(backupPath)}`);

  const header = [
    '# Publications — single source of truth.',
    `# Last curated: ${new Date().toISOString().slice(0, 10)}`,
    `# ${curated.length} entries (deduplicated)`,
    '#',
    '# Hand-curated fields: award, biblio, pdf, notes.',
    '# Edit freely; the site rebuilds on push.',
    '',
  ].join('\n');

  const body = yaml.dump(curated, { lineWidth: 100, noRefs: true, sortKeys: false });
  fs.writeFileSync(YAML_PATH, header + body);

  const awards = curated.filter((e) => e.award).length;

  console.log(`\nCuration summary:`);
  console.log(`  Awards:  ${awards}`);
  console.log(`\nWrote ${curated.length} publications.`);
}

main();
