/**
 * Server-side data loaders.
 * Uses Vite's ?raw import so the YAML is inlined at build time, then parses it.
 */
import yaml from 'js-yaml';
import siteYaml from '~/data/site.yaml?raw';
import pubsYaml from '~/data/publications.yaml?raw';

export interface SiteData {
  name: string;
  shortName: string;
  role: string;
  affiliation: string;
  tagline: string;
  description: string;
  email: string;
  orcid: string;
  scholar: string;
  linkedin: string;
  github: string;
  researchgate: string;
  uea_profile: string;
  portrait: string;
  lastUpdated: string;
  phdStatus: 'open' | 'closed' | 'seasonal';
  phdStatusNote: string;
  defaultNewsType: string;
}

export interface Publication {
  id: string;
  authors: string[];
  year: number;
  title: string;
  venue: string | null;
  type: 'article' | 'chapter' | 'report' | 'conference' | 'preprint' | string;
  doi?: string | null;
  url?: string | null;
  pdf?: string | null;
  theme?: string[];
  award?: string | null;
  role?: 'first' | 'middle' | 'last' | null;
  notes?: string | null;
  [key: string]: unknown;
}

export const site = yaml.load(siteYaml) as SiteData;
export const publications = (yaml.load(pubsYaml) as Publication[]) || [];
