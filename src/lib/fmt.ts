// Deterministic date formatters — using a fixed locale prevents
// server/client hydration mismatches when their default locales differ.

const DATE_LOCALE = 'en-GB';
const DATE_OPTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
};

function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return Number.isFinite(date.getTime()) ? date : null;
}

export function fmtDate(d: string | Date | null | undefined): string {
  const date = toDate(d);
  return date ? date.toLocaleDateString(DATE_LOCALE, DATE_OPTS) : '';
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  const date = toDate(d);
  return date ? date.toLocaleString(DATE_LOCALE, DATETIME_OPTS) : '';
}
