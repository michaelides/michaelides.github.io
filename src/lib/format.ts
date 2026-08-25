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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
