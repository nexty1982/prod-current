import type { GlobalCliFlags, OutputFormat } from '../types/index.js';

export function resolveOutputFormat(flags: GlobalCliFlags): OutputFormat {
  if (flags.ndjson) return 'ndjson';
  if (flags.json) return 'json';
  return 'table';
}

export function writeJson(data: unknown, flags: GlobalCliFlags): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function writeNdjson(rows: unknown[], _flags: GlobalCliFlags): void {
  for (const row of rows) {
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }
}

export function writeError(message: string, flags: GlobalCliFlags): void {
  if (!flags.quiet) {
    process.stderr.write(`error: ${message}\n`);
  }
}

export function writeVerbose(message: string, flags: GlobalCliFlags): void {
  if (flags.verbose) {
    process.stderr.write(`${message}\n`);
  }
}

export function pad(str: string, len: number): string {
  const s = str ?? '';
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

export function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const line = widths.map((w) => '-'.repeat(w)).join('  ');
  const head = headers.map((h, i) => pad(h, widths[i])).join('  ');
  const body = rows.map((r) => r.map((c, i) => pad(c ?? '', widths[i])).join('  ')).join('\n');
  return `${head}\n${line}\n${body}`;
}

export function parseSince(since: string): Date | null {
  const m = since.match(/^(\d+)(h|d|m)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const ms = unit === 'h' ? n * 3600_000 : unit === 'd' ? n * 86400_000 : n * 60_000;
  return new Date(Date.now() - ms);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function layoutFromJob(job: { layout_classification_json?: unknown; record_type?: string | null }): string {
  const lc = job.layout_classification_json as { layout?: string; type?: string } | null | undefined;
  return lc?.layout || lc?.type || '—';
}

export function statusLabel(job: { review_status?: string; status?: string }): string {
  return job.review_status || job.status || 'unknown';
}
