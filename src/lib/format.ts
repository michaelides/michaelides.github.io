/**
 * Utility helpers used across pages.
 */

export function formatDate(iso: string | Date, opts?: { style?: 'long' | 'short' | 'numeric' | 'iso' }): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return String(iso);
  const style = opts?.style ?? 'long';
  if (style === 'iso') return date.toISOString().slice(0, 10);
  if (style === 'numeric') {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Fold text for searching: lowercase, strip accents, unify the various dash
 * characters, collapse whitespace. Used to build the publication search index
 * at build time and to normalise the query at runtime, so both agree.
 */
export function normaliseSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}
