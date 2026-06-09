/**
 * Parse parish clergy roster text (OCR output, pasted lists, etc.)
 * into normalized configuration entity rows.
 */

export interface ClergyImportRow {
  canonical_value: string;
  role: string | null;
  active_from: string | null;
  active_to: string | null;
  variants_json: string[];
  source_notes: string | null;
  warnings?: string[];
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

const MONTH_PATTERN = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

const RANGE_PATTERN = new RegExp(
  `(${MONTH_PATTERN}\\.?\\s+(?:\\d{1,2},?\\s+)?\\d{4})\\s*[—–\\-]\\s*(${MONTH_PATTERN}\\.?\\s+(?:\\d{1,2},?\\s+)?\\d{4})`,
  'i',
);
const DEATH_PATTERN = /\(\+\)\s*(.+)$/i;

function parseMonthDateToken(token: string): string | null {
  const m = token.trim().match(new RegExp(`(${MONTH_PATTERN})\\.?\\s*(?:(\\d{1,2}),?\\s+)?(\\d{4})`, 'i'));
  if (!m) return null;
  const monthKey = m[1].toLowerCase().replace(/\./g, '');
  const month = MONTH_MAP[monthKey] || MONTH_MAP[monthKey.slice(0, 3)];
  if (!month) return null;
  const day = m[2] ? String(Math.min(31, Math.max(1, parseInt(m[2], 10)))).padStart(2, '0') : '01';
  const year = m[3];
  if (!year || !/^\d{4}$/.test(year)) return null;
  return `${year}-${month}-${day}`;
}

function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

function parseClergyLine(line: string, defaultRole = 'Rector'): ClergyImportRow | null {
  const trimmed = line.replace(/\s+/g, ' ').trim();
  if (!trimmed || trimmed.length < 3) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('our parish') ||
    lower.includes('parish rector') ||
    lower.includes('parish president') ||
    lower.startsWith('st. paul') ||
    lower === 'rector' ||
    lower === 'rectors'
  ) {
    return null;
  }

  let body = trimmed.replace(/^\d+\.\s*/, '');
  const warnings: string[] = [];

  let deathNote: string | null = null;
  const deathMatch = body.match(DEATH_PATTERN);
  if (deathMatch) {
    deathNote = deathMatch[1].trim();
    body = body.replace(DEATH_PATTERN, '').trim();
  }

  const rangeMatch = body.match(RANGE_PATTERN);
  if (rangeMatch) {
    const name = normalizeName(body.slice(0, rangeMatch.index).trim());
    if (!name || name.length < 2) return null;
    const active_from = parseMonthDateToken(rangeMatch[1]);
    const active_to = parseMonthDateToken(rangeMatch[2]);
    if (!active_from) warnings.push('Could not parse start date');
    if (!active_to) warnings.push('Could not parse end date');
    return {
      canonical_value: name,
      role: defaultRole,
      active_from,
      active_to,
      variants_json: [],
      source_notes: deathNote ? `Deceased: ${deathNote}` : null,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  const singleDateMatch = body.match(new RegExp(`^(.+?)\\s+(${MONTH_PATTERN}\\.?\\s+(?:\\d{1,2},?\\s+)?\\d{4})\\s*$`, 'i'));
  if (singleDateMatch) {
    const name = normalizeName(singleDateMatch[1]);
    const active_from = parseMonthDateToken(singleDateMatch[2]);
    if (!name) return null;
    return {
      canonical_value: name,
      role: defaultRole,
      active_from,
      active_to: null,
      variants_json: [],
      source_notes: deathNote ? `Deceased: ${deathNote}` : null,
      warnings: active_from ? undefined : ['Could not parse start date'],
    };
  }

  const nameOnly = normalizeName(body);
  if (nameOnly.length >= 2 && /[a-z]/i.test(nameOnly)) {
    return {
      canonical_value: nameOnly,
      role: defaultRole,
      active_from: null,
      active_to: null,
      variants_json: [],
      source_notes: deathNote ? `Deceased: ${deathNote}` : null,
      warnings: ['No service dates detected'],
    };
  }

  return null;
}

function isSkippedHeaderLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  return (
    lower.includes('our parish') ||
    lower.includes('parish rector') ||
    lower.includes('parish president') ||
    lower.startsWith('st. paul') ||
    lower === 'rector' ||
    lower === 'rectors' ||
    lower === '-' ||
    lower === '(+)'
  );
}

function isNameSectionLine(line: string): boolean {
  if (isSkippedHeaderLine(line)) return false;
  if (/\d{4}/.test(line) && new RegExp(MONTH_PATTERN, 'i').test(line)) return false;
  if (/^\d*\.?\s*(?:Fr\.|r\.)\s/i.test(line)) return true;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][().a-z]+)+$/.test(line)) return true;
  if (/^[A-Z][a-z]{2,}$/.test(line)) return true;
  return false;
}

function looksLikeSurnameContinuation(line: string, current: string): boolean {
  if (!current) return false;
  if (/^(?:Fr\.|r\.)\s+\S+\s+\S+/i.test(current)) return false;
  return /^[A-Z][a-z]{2,}$/.test(line);
}

function isDateSectionLine(line: string): boolean {
  if (isSkippedHeaderLine(line)) return false;
  if (/^\(\+\)/.test(line)) return true;
  if (new RegExp(`^${MONTH_PATTERN}`, 'i').test(line) && /\d{4}/.test(line)) return true;
  if (new RegExp(`${MONTH_PATTERN}.*${MONTH_PATTERN}`, 'i').test(line) && /\d{4}/.test(line)) return true;
  return false;
}

function extractColumnarNames(lines: string[]): string[] {
  const names: string[] = [];
  let current = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (isDateSectionLine(line)) break;
    if (!isNameSectionLine(line)) continue;

    const numbered = line.replace(/^\d*\.?\s*/, '').trim();

    if (looksLikeSurnameContinuation(numbered, current)) {
      current += ` ${numbered}`;
      continue;
    }

    if (/^(?:Fr\.|r\.)\s/i.test(numbered)) {
      if (current) names.push(normalizeName(current.replace(/^r\./i, 'Fr.')));
      current = numbered.replace(/^r\./i, 'Fr.');
      continue;
    }

    if (/^[A-Z][a-z]+(?:\s+[A-Z][().a-z]+)+$/.test(numbered)) {
      if (current) names.push(normalizeName(current.replace(/^r\./i, 'Fr.')));
      current = numbered;
    }
  }

  if (current) names.push(normalizeName(current.replace(/^r\./i, 'Fr.')));
  return names.filter((n) => n.length >= 2);
}

function parseDateSectionLine(line: string): { active_from: string | null; active_to: string | null; death: string | null } {
  let working = line.trim();
  let death: string | null = null;
  const deathMatch = working.match(/\(\+\)\s*([^,]*)/i);
  if (deathMatch) {
    death = deathMatch[1]?.trim() || '(+)';
    working = working.replace(/\(\+\)\s*[^,]*/, ' ').trim();
  }

  const tokenRe = new RegExp(`${MONTH_PATTERN}\\.?\\s*(?:\\d{1,2},?\\s+)?\\d{4}`, 'gi');
  const tokens = [...working.matchAll(tokenRe)].map((m) => m[0]);
  if (tokens.length >= 2) {
    return {
      active_from: parseMonthDateToken(tokens[0]),
      active_to: parseMonthDateToken(tokens[1]),
      death,
    };
  }
  if (tokens.length === 1) {
    return {
      active_from: parseMonthDateToken(tokens[0]),
      active_to: null,
      death,
    };
  }
  return { active_from: null, active_to: null, death };
}

function extractColumnarDates(lines: string[]): Array<{ active_from: string | null; active_to: string | null; death: string | null }> {
  const dates: Array<{ active_from: string | null; active_to: string | null; death: string | null }> = [];
  let inDates = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!inDates) {
      if (isDateSectionLine(line)) inDates = true;
      else continue;
    }
    if (isSkippedHeaderLine(line) && line !== '-' && line !== '(+)') continue;
    if (!isDateSectionLine(line) && line !== '-' && line !== '(+)') continue;

    const parsed = parseDateSectionLine(line);
    if (parsed.active_from || parsed.active_to) {
      dates.push(parsed);
    } else if (parsed.death && dates.length > 0) {
      const prev = dates[dates.length - 1];
      prev.death = prev.death ? `${prev.death}; ${parsed.death}` : parsed.death;
    }
  }

  return dates;
}

function looksColumnarLayout(text: string, inlineRows: ClergyImportRow[]): boolean {
  const frCount = (text.match(/\bFr\./gi) || []).length;
  const datedRows = inlineRows.filter((r) => r.active_from || r.active_to).length;
  return frCount >= 4 && datedRows < Math.max(2, Math.floor(frCount / 2));
}

function parseColumnarClergyRoster(text: string, defaultRole = 'Rector'): ClergyImportRow[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  const names = extractColumnarNames(lines);
  const dates = extractColumnarDates(lines);
  if (names.length < 2) return [];

  const rows: ClergyImportRow[] = [];
  const pairCount = Math.min(names.length, dates.length || names.length);

  for (let i = 0; i < pairCount; i++) {
    const name = names[i];
    const dateInfo = dates[i] || { active_from: null, active_to: null, death: null };
    const warnings: string[] = [];
    if (!dateInfo.active_from && !dateInfo.active_to) warnings.push('No service dates detected');
    if (names.length !== dates.length && i === pairCount - 1 && names.length > dates.length) {
      warnings.push('Date column count mismatch — verify service dates');
    }

    rows.push({
      canonical_value: name,
      role: defaultRole,
      active_from: dateInfo.active_from,
      active_to: dateInfo.active_to,
      variants_json: [],
      source_notes: dateInfo.death ? `Deceased: ${dateInfo.death}` : null,
      warnings: warnings.length ? warnings : undefined,
    });
  }

  return rows;
}

export function parseClergyListText(text: string, defaultRole = 'Rector'): ClergyImportRow[] {
  if (!text || !text.trim()) return [];

  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ClergyImportRow[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parsed = parseClergyLine(line, defaultRole);
    if (!parsed) continue;
    const key = parsed.canonical_value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(parsed);
  }

  if (looksColumnarLayout(text, rows)) {
    const columnar = parseColumnarClergyRoster(text, defaultRole);
    if (columnar.length > rows.filter((r) => r.active_from || r.active_to).length) {
      return columnar;
    }
  }

  return rows;
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
  const parsed = parseMonthDateToken(s);
  if (parsed) return parsed;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return null;
}

export function normalizeClergyImportRow(raw: Record<string, unknown>, defaultRole = 'Rector'): ClergyImportRow | null {
  const canonical =
    String(raw.canonical_value || raw.name || raw.clergy || raw.priest || '').trim();
  if (!canonical) return null;

  const warnings: string[] = [];
  const active_from = normalizeDateValue(raw.active_from ?? raw.start ?? raw.from);
  const active_to = normalizeDateValue(raw.active_to ?? raw.end ?? raw.to);
  if ((raw.active_from || raw.start || raw.from) && !active_from) warnings.push('Could not parse start date');
  if ((raw.active_to || raw.end || raw.to) && !active_to) warnings.push('Could not parse end date');

  return {
    canonical_value: canonical,
    role: String(raw.role || defaultRole).trim() || defaultRole,
    active_from,
    active_to,
    variants_json: parseVariants(raw.variants_json ?? raw.variants),
    source_notes: raw.source_notes != null ? String(raw.source_notes).trim() || null : null,
    warnings: warnings.length ? warnings : undefined,
  };
}

export function parseClergyStructuredRows(
  rows: Array<Record<string, unknown>>,
  headers?: string[],
  defaultRole = 'Rector',
): ClergyImportRow[] {
  const result: ClergyImportRow[] = [];
  const seen = new Set<string>();

  if (headers && headers.length > 0) {
    const fieldIndexes: Record<string, number> = {};
    headers.forEach((h, i) => {
      const field = normalizeHeader(h);
      if (field) fieldIndexes[field] = i;
    });

    for (const row of rows) {
      const cells = Array.isArray(row) ? row : Object.values(row);
      const mapped: Record<string, unknown> = {};
      for (const [field, idx] of Object.entries(fieldIndexes)) {
        mapped[field] = (cells as unknown[])[idx];
      }
      const normalized = normalizeClergyImportRow(mapped, defaultRole);
      if (!normalized) continue;
      const key = normalized.canonical_value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(normalized);
    }
    return result;
  }

  for (const row of rows) {
    const normalized = normalizeClergyImportRow(
      typeof row === 'object' && row !== null ? row as Record<string, unknown> : {},
      defaultRole,
    );
    if (!normalized) continue;
    const key = normalized.canonical_value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}
