#!/usr/bin/env node
/**
 * curate-publications.mjs
 * -----------------------
 * One-time curation pass on src/data/publications.yaml:
 *   1. Removes obvious duplicates (UEA repository deposits when a published
 *      version with a real DOI exists for the same year + title).
 *   2. Tags items with themes and awards, based on a hand-curated lookup
 *      table derived from the CV.
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
/* Hand-curated lookup                                                       */
/*                                                                           */
/* Keys are DOI substrings or title substrings (case-insensitive).           */
/* Only used to set theme / award; everything else stays as-is.              */
/* ------------------------------------------------------------------------- */

const CURATION = [
  { match: /Petrou.*leisure.*crafting|s0018726725|0018726726/i, theme: ['work-nonwork', 'wellbeing', 'intervention'] },
  { match: /unconfounding multisource/i, theme: ['assessment-centres', 'methods', 'performance'] },
  { match: /everything that you have ever been told about assessment center ratings is confounded/i, theme: ['assessment-centres', 'methods'] },
  { match: /challenge and hindrance stressors and wellbeing-based/i, theme: ['work-nonwork', 'wellbeing', 'portfolios'] },

  { match: /daily workplace embitterment/i, theme: ['work-nonwork', 'wellbeing', 'illegitimate-tasks'] },
  { match: /dual-process model of the effects of boundary segmentation/i, theme: ['work-nonwork', 'wellbeing', 'boundary'] },
  { match: /pandemic-informed framework for predicting well-being/i, theme: ['remote-work', 'wellbeing', 'covid'] },
  { match: /satisfaction with one's job and working at home in the covid/i, theme: ['remote-work', 'wellbeing', 'covid'] },
  { match: /uncertainty and well-being amongst homeworkers/i, theme: ['remote-work', 'wellbeing', 'covid'] },
  { match: /clarifying the scope of generalizability theory/i, theme: ['assessment-centres', 'methods'] },
  { match: /homeworking, well-being and the covid-19 pandemic: a diary/i, theme: ['remote-work', 'wellbeing', 'diary', 'covid'] },
  { match: /curvilinear relationships between age and job performance/i, theme: ['age', 'performance'] },
  { match: /reliability in assessment centres depends on general/i, theme: ['assessment-centres', 'methods'] },
  { match: /crossover of work engagement/i, theme: ['engagement', 'personality'] },
  { match: /testing the homogeneity hypothesis of personality/i, theme: ['personality', 'cross-cultural'] },
  { match: /recessionary actions and absence/i, theme: ['absence', 'recession', 'workplace'] },
  { match: /psychologically empowered/i, theme: ['leadership', 'empowerment'] },
  { match: /job demands, job control, psychological climate/i, theme: ['job-demands', 'satisfaction'] },
  { match: /workplace design/i, theme: ['workplace', 'motivation'] },
  { match: /expert assessor perspective on assessment center/i, theme: ['assessment-centres'] },
  { match: /on states and traits in work-family/i, theme: ['work-nonwork', 'methods'] },
  { match: /effects of individual and team resilience/i, theme: ['team-resilience', 'wellbeing'] },
  { match: /social support as protective factor/i, theme: ['part-time', 'wellbeing', 'social-support'] },
  { match: /goal proximity of employee green behavior/i, theme: ['green-behaviour', 'sustainability'] },
  { match: /microfoundations of environmental strategy/i, theme: ['green-behaviour', 'sustainability'] },
  { match: /impose and i'll pose/i, theme: ['positivity', 'resources'] },
  { match: /expanding the risk assessment methodology/i, theme: ['risk-assessment', 'methods'] },
  { match: /rater variance and small dimension effects/i, theme: ['assessment-centres', 'methods'] },
  { match: /uncertainty about rater variance/i, theme: ['assessment-centres', 'methods'] },

  /* Award-winning */
  { match: /mindfulness for performance and wellbeing in the police/i, theme: ['mindfulness', 'police', 'wellbeing', 'applied'], award: 'Best Paper Award 2024' },

  /* Conferred chapters & reports */
  { match: /paediatric renal transplant/i, theme: ['clinical', 'paediatric'] },
  { match: /clinical risk stratification/i, theme: ['clinical', 'paediatric'] },
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
        return {
          ...e,
          theme: rule.theme ?? e.theme ?? [],
          award: rule.award ?? e.award ?? null,
        };
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
    `# ${curated.length} entries (deduplicated and tagged)`,
    '#',
    '# Tags: theme (slugs), award (string).',
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
