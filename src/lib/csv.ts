import 'server-only';

type Cell = string | number | boolean | null | undefined | Date;

function escape(cell: Cell): string {
  if (cell === null || cell === undefined) return '';
  const v = cell instanceof Date ? cell.toISOString() : String(cell);
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header.map(escape).join(',')];
  for (const r of rows) lines.push(r.map(escape).join(','));
  return lines.join('\r\n') + '\r\n';
}
