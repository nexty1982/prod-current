/**
 * Parish clergy import parsers — CSV, Excel, JSON, and pasted text helpers.
 */

import * as XLSX from 'xlsx';

export interface ClergyImportRow {
  canonical_value: string;
  role: string | null;
  active_from: string | null;
  active_to: string | null;
  variants_json: string[];
  source_notes: string | null;
  warnings?: string[];
  selected?: boolean;
}

const HEADER_ALIASES: Record<string, string[]> = {
  canonical_value: ['canonical_value', 'canonical name', 'name', 'clergy', 'priest', 'full name', 'clergy name'],
  role: ['role', 'title', 'position'],
  active_from: ['active_from', 'start', 'start date', 'from', 'active from', 'service start'],
  active_to: ['active_to', 'end', 'end date', 'to', 'active to', 'service end'],
  variants_json: ['variants', 'variants_json', 'spelling variants', 'ocr variants', 'aliases'],
  source_notes: ['source_notes', 'notes', 'source', 'comments', 'remarks'],
};

function normalizeHeader(h: string): string | null {
  const key = h.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key)) return field;
  }
  return null;
}

function parseVariants(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
      } catch {
        /* fall through */
      }
    }
    return trimmed.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeDateValue(val: unknown): string | null {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return s;
}

export function normalizeClergyRow(raw: Record<string, unknown>, defaultRole = 'Rector'): ClergyImportRow | null {
  const canonical = String(raw.canonical_value || raw.name || raw.clergy || raw.priest || '').trim();
  if (!canonical) return null;

  return {
    canonical_value: canonical,
    role: String(raw.role || defaultRole).trim() || defaultRole,
    active_from: normalizeDateValue(raw.active_from ?? raw.start ?? raw.from),
    active_to: normalizeDateValue(raw.active_to ?? raw.end ?? raw.to),
    variants_json: parseVariants(raw.variants_json ?? raw.variants),
    source_notes: raw.source_notes != null ? String(raw.source_notes).trim() || null : null,
    selected: true,
  };
}

function mapRowCells(headers: string[], cells: string[], defaultRole: string): ClergyImportRow | null {
  const mapped: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    const field = normalizeHeader(h);
    if (field) mapped[field] = cells[i] ?? '';
  });
  return normalizeClergyRow(mapped, defaultRole);
}

function parseDelimitedText(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((l) => l.trim());
  if (!lines.length) return [];

  const sample = lines.slice(0, Math.min(5, lines.length)).join('\n');
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';
  else if (semicolonCount > commaCount) delimiter = ';';

  const rows: string[][] = [];
  for (const line of lines) {
    const parsedRow: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        parsedRow.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parsedRow.push(current.trim());
    rows.push(parsedRow);
  }
  return rows;
}

export function parseClergyCsvText(text: string, firstRowIsHeader = true, defaultRole = 'Rector'): ClergyImportRow[] {
  const grid = parseDelimitedText(text);
  if (!grid.length) return [];

  const headers = firstRowIsHeader ? grid[0] : [];
  const dataRows = firstRowIsHeader ? grid.slice(1) : grid;
  const result: ClergyImportRow[] = [];
  const seen = new Set<string>();

  for (const cells of dataRows) {
    const row = firstRowIsHeader
      ? mapRowCells(headers, cells, defaultRole)
      : normalizeClergyRow({
          canonical_value: cells[0],
          role: cells[1],
          active_from: cells[2],
          active_to: cells[3],
          variants_json: cells[4],
          source_notes: cells[5],
        }, defaultRole);
    if (!row) continue;
    const key = row.canonical_value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

export function parseClergyJsonText(text: string, defaultRole = 'Rector'): ClergyImportRow[] {
  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed) ? parsed : parsed?.entities || parsed?.clergy || parsed?.rows;
  if (!Array.isArray(items)) {
    throw new Error('JSON must be an array of clergy objects or { entities: [...] }');
  }

  const result: ClergyImportRow[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const row = normalizeClergyRow(item as Record<string, unknown>, defaultRole);
    if (!row) continue;
    const key = row.canonical_value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

export function parseClergyExcelBuffer(buffer: ArrayBuffer, firstRowIsHeader = true, defaultRole = 'Rector'): ClergyImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];
  if (!grid.length) return [];

  const headers = firstRowIsHeader ? grid[0].map(String) : [];
  const dataRows = firstRowIsHeader ? grid.slice(1) : grid;
  const result: ClergyImportRow[] = [];
  const seen = new Set<string>();

  for (const cells of dataRows) {
    const strCells = cells.map(String);
    const row = firstRowIsHeader
      ? mapRowCells(headers, strCells, defaultRole)
      : normalizeClergyRow({
          canonical_value: strCells[0],
          role: strCells[1],
          active_from: strCells[2],
          active_to: strCells[3],
          variants_json: strCells[4],
          source_notes: strCells[5],
        }, defaultRole);
    if (!row) continue;
    const key = row.canonical_value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

export function detectClergyFileFormat(filename: string): 'csv' | 'excel' | 'json' | 'unknown' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) return 'csv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'excel';
  if (lower.endsWith('.json')) return 'json';
  return 'unknown';
}

export async function parseClergyFile(file: File, firstRowIsHeader = true, defaultRole = 'Rector'): Promise<ClergyImportRow[]> {
  const format = detectClergyFileFormat(file.name);
  if (format === 'json') {
    const text = await file.text();
    return parseClergyJsonText(text, defaultRole);
  }
  if (format === 'excel') {
    const buffer = await file.arrayBuffer();
    return parseClergyExcelBuffer(buffer, firstRowIsHeader, defaultRole);
  }
  if (format === 'csv') {
    const text = await file.text();
    return parseClergyCsvText(text, firstRowIsHeader, defaultRole);
  }
  throw new Error('Unsupported file type. Use CSV, Excel (.xlsx), or JSON.');
}

export const CLERGY_CSV_TEMPLATE = `canonical_value,role,active_from,active_to,variants,source_notes
Fr. James Parsells,Rector,1978-10-01,1985-09-30,"Fr. Parsells, James Parsells",Parish anniversary book
Fr. Eugene Tarris,Rector,1973-03-01,1978-09-30,,Parish registry
`;

export const CLERGY_JSON_TEMPLATE = JSON.stringify([
  {
    canonical_value: 'Fr. James Parsells',
    role: 'Rector',
    active_from: '1978-10-01',
    active_to: null,
    variants: ['Fr. Parsells'],
    source_notes: 'Parish anniversary book',
  },
], null, 2);
