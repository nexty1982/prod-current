#!/usr/bin/env npx tsx
/**
 * Unit tests for marriage_ledger_v1.js (OMD-146)
 *
 * Run: npx tsx server/src/ocr/layouts/__tests__/marriage_ledger_v1.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ml = require('../marriage_ledger_v1');

const {
  LAYOUT_ID,
  TABLE1_COLUMNS,
  TABLE2_COLUMNS,
  ALL_COLUMN_BANDS,
  TABLE1_KEYS,
  TABLE2_KEYS,
  ALL_COLUMN_KEYS,
  HEADER_Y_THRESHOLD,
  extractWordTokens,
  clusterIntoRows,
  mergeLedgerRows,
  extractCell,
  validateCell,
  buildTable,
  extractMarriageLedgerTable,
} = ml;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    console.error(`  FAIL: ${message}\n         expected: ${String(expected)}\n         actual:   ${String(actual)}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function assertClose(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) > tol) {
    console.error(`  FAIL: ${message}\n         expected: ${expected} (±${tol})\n         actual:   ${actual}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

// ── Vision JSON builder helpers ──────────────────────────────────────────────

function word(text: string, x0: number, y0: number, x1: number, y1: number, conf?: number) {
  return {
    text,
    confidence: conf,
    boundingBox: {
      vertices: [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ],
    },
  };
}

function buildVision(width: number, height: number, words: any[]): any {
  return {
    pages: [{ width, height, blocks: [{ paragraphs: [{ words }] }] }],
  };
}

// Build a token directly with normalized coordinates
function tok(text: string, x_center: number, y_center: number, height = 0.02, confidence: number | null = 0.9) {
  return {
    text,
    confidence,
    x_min: x_center - 0.005,
    x_max: x_center + 0.005,
    y_min: y_center - height / 2,
    y_max: y_center + height / 2,
    x_center,
    y_center,
    height,
  };
}

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(LAYOUT_ID, 'marriage_ledger_v1', 'LAYOUT_ID');
assertEq(HEADER_Y_THRESHOLD, 0.295, 'HEADER_Y_THRESHOLD');

// TABLE1 has 6 columns
assertEq(TABLE1_KEYS.length, 6, 'TABLE1 has 6 columns');
assertEq(TABLE1_KEYS[0], 'number', 'TABLE1[0] = number');
assertEq(TABLE1_KEYS[1], 'date', 'TABLE1[1] = date');
assertEq(TABLE1_KEYS[2], 'groom', 'TABLE1[2] = groom');
assertEq(TABLE1_KEYS[5], 'bride_parents', 'TABLE1[5] = bride_parents');

// TABLE2 has 3 columns
assertEq(TABLE2_KEYS.length, 3, 'TABLE2 has 3 columns');
assertEq(TABLE2_KEYS[0], 'priest', 'TABLE2[0] = priest');
assertEq(TABLE2_KEYS[1], 'witnesses', 'TABLE2[1] = witnesses');
assertEq(TABLE2_KEYS[2], 'license', 'TABLE2[2] = license');

// 9 columns total
assertEq(ALL_COLUMN_KEYS.length, 9, 'ALL_COLUMN_KEYS has 9 columns');

// Bands are sorted and contiguous (after the leading 0.020 left margin).
// The first band (number) starts at 0.020, not 0.000 — there's a small left
// margin. From there each band's start equals the previous band's end.
{
  let contiguous = true;
  let prevEnd = ALL_COLUMN_BANDS[ALL_COLUMN_KEYS[0]][0];
  for (const key of ALL_COLUMN_KEYS) {
    const [start, end] = ALL_COLUMN_BANDS[key];
    if (Math.abs(start - prevEnd) > 1e-9) {
      contiguous = false;
      break;
    }
    if (end <= start) {
      contiguous = false;
      break;
    }
    prevEnd = end;
  }
  assert(contiguous, 'all column bands are contiguous start-to-finish');
  assertClose(prevEnd, 1.0, 1e-9, 'last band ends at 1.0');
}

assertEq(TABLE1_COLUMNS.number[0], 0.020, 'number band start');
assertEq(TABLE1_COLUMNS.date[0], 0.060, 'date band start');
assertEq(TABLE2_COLUMNS.license[1], 1.000, 'license band end');

// ============================================================================
// extractWordTokens
// ============================================================================
console.log('\n── extractWordTokens ─────────────────────────────────────');

assertEq(extractWordTokens(null).length, 0, 'null vision → empty');
assertEq(extractWordTokens(undefined).length, 0, 'undefined vision → empty');
assertEq(extractWordTokens({}).length, 0, 'empty object → empty');
assertEq(extractWordTokens({ pages: [] }).length, 0, 'empty pages → empty');

{
  const v = buildVision(1000, 2000, [word('Hello', 100, 200, 300, 250, 0.9)]);
  const tokens = extractWordTokens(v);
  assertEq(tokens.length, 1, 'single word → 1 token');
  const t = tokens[0];
  assertEq(t.text, 'Hello', 'token.text');
  assertEq(t.confidence, 0.9, 'token.confidence');
  assertEq(t.page, 0, 'token.page');
  assertClose(t.x_min, 0.1, 1e-9, 'x_min normalized');
  assertClose(t.y_min, 0.1, 1e-9, 'y_min normalized');
  assertClose(t.x_max, 0.3, 1e-9, 'x_max normalized');
  assertClose(t.y_max, 0.125, 1e-9, 'y_max normalized');
  assertClose(t.x_center, 0.2, 1e-9, 'x_center');
  assertClose(t.y_center, 0.1125, 1e-9, 'y_center');
}

{
  // Whitespace-only and missing-bbox skipped
  const v: any = {
    pages: [{
      width: 100, height: 100, blocks: [{ paragraphs: [{ words: [
        word('Real', 10, 10, 50, 30, 0.9),
        { text: '   ', boundingBox: { vertices: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}] } },
        { text: 'NoBox' },
      ] }] }],
    }],
  };
  const tokens = extractWordTokens(v);
  assertEq(tokens.length, 1, 'whitespace and missing-bbox skipped');
  assertEq(tokens[0].text, 'Real', 'only Real kept');
}

{
  // pageIndex selection
  const v: any = {
    pages: [
      { width: 1000, height: 1000, blocks: [{ paragraphs: [{ words: [word('p0', 100, 100, 200, 130)] }] }] },
      { width: 1000, height: 1000, blocks: [{ paragraphs: [{ words: [word('p1', 100, 100, 200, 130)] }] }] },
    ],
  };
  assertEq(extractWordTokens(v, 0)[0].text, 'p0', 'pageIndex 0');
  assertEq(extractWordTokens(v, 1)[0].text, 'p1', 'pageIndex 1');
  assertEq(extractWordTokens(v, 5).length, 0, 'out-of-range pageIndex');
}

// ============================================================================
// clusterIntoRows
// ============================================================================
console.log('\n── clusterIntoRows ───────────────────────────────────────');

assertEq(clusterIntoRows([]).length, 0, 'empty → no rows');

{
  const tokens = [
    tok('A', 0.1, 0.1),
    tok('B', 0.3, 0.105),
    tok('C', 0.5, 0.1),
  ];
  const rows = clusterIntoRows(tokens);
  assertEq(rows.length, 1, 'same Y → 1 row');
  assertEq(rows[0].length, 3, '3 tokens in row');
}

{
  const tokens = [
    tok('A', 0.1, 0.1),
    tok('B', 0.3, 0.1),
    tok('C', 0.1, 0.5),
    tok('D', 0.3, 0.5),
  ];
  const rows = clusterIntoRows(tokens);
  assertEq(rows.length, 2, 'separated Y → 2 rows');
}

{
  // Sort: input out of order, output sorted
  const tokens = [
    tok('lower', 0.1, 0.5),
    tok('upper', 0.1, 0.1),
  ];
  const rows = clusterIntoRows(tokens);
  assertClose(rows[0][0].y_center, 0.1, 1e-9, 'first row is upper');
  assertClose(rows[1][0].y_center, 0.5, 1e-9, 'second row is lower');
}

// ============================================================================
// mergeLedgerRows
// ============================================================================
console.log('\n── mergeLedgerRows ───────────────────────────────────────');

{
  // Empty input
  assertEq(mergeLedgerRows([]).length, 0, 'empty rows → empty');
}

{
  // Single row
  const rows = [[tok('a', 0.1, 0.1)]];
  assertEq(mergeLedgerRows(rows).length, 1, 'single row → unchanged');
}

{
  // Date-token-driven boundary: with only 1 gap, threshold falls back to
  // fixedGapThreshold (0.025). A small Y gap with hasDate=true should still
  // create a boundary.
  const dateMid = (TABLE1_COLUMNS.date[0] + TABLE1_COLUMNS.date[1]) / 2;
  const rows = [
    [tok('John', 0.2, 0.40)],
    [tok('5/12/2020', dateMid, 0.405), tok('Jane', 0.2, 0.405)],
  ];
  const merged = mergeLedgerRows(rows);
  assertEq(merged.length, 2, 'date-token boundary creates 2 entries');
}

{
  // Continuation merge: small Y gap, no date in date column → row merges
  // into the previous entry.
  const rows = [
    [tok('John', 0.2, 0.40)],
    [tok('Boston', 0.2, 0.405)],
  ];
  const merged = mergeLedgerRows(rows);
  assertEq(merged.length, 1, 'small gap, no date → merge into previous');
  assertEq(merged[0].length, 2, 'merged entry has 2 tokens');
}

{
  // Date pattern variants: M/D and M/D/YYYY both work
  const dateMid = (TABLE1_COLUMNS.date[0] + TABLE1_COLUMNS.date[1]) / 2;
  const rows = [
    [tok('John', 0.2, 0.4)],
    [tok('5/12', dateMid, 0.44), tok('Jane', 0.2, 0.44)],
  ];
  const merged = mergeLedgerRows(rows);
  assertEq(merged.length, 2, 'partial date M/D triggers boundary');
}

{
  // Date NOT in date column → no boundary trigger from date
  const rows = [
    [tok('John', 0.2, 0.40)],
    [tok('5/12/2020', 0.5, 0.41), tok('Jane', 0.2, 0.41)], // date in groom area
  ];
  const merged = mergeLedgerRows(rows, 0.05); // big threshold so Y-merge doesn't fire
  assertEq(merged.length, 1, 'date outside date column → no boundary');
}

// ============================================================================
// extractCell
// ============================================================================
console.log('\n── extractCell ───────────────────────────────────────────');

{
  const c = extractCell([], 0.0, 0.5);
  assertEq(c.text, '', 'empty band → empty text');
  assertEq(c.confidence, null, 'empty band → null confidence');
  // The empty-cell branch in extractCell does not set confidence_min, so it
  // is undefined (not null).
  assertEq(c.confidence_min, undefined, 'empty band → undefined confidence_min');
  assertEq(c.token_count, 0, 'empty band → token_count 0');
  assertEq(c.bbox, null, 'empty band → null bbox');
}

{
  const tokens = [
    tok('John', 0.10, 0.4, 0.02, 0.9),
    tok('Smith', 0.15, 0.4, 0.02, 0.7),
  ];
  const c = extractCell(tokens, 0.05, 0.20);
  assertEq(c.text, 'John Smith', 'tokens joined with space');
  assertEq(c.token_count, 2, '2 tokens');
  assertClose(c.confidence as number, 0.8, 0.001, 'avg confidence');
  assertEq(c.confidence_min, 0.7, 'min confidence');
  assert(c.bbox !== null, 'bbox set');
}

{
  // Out-of-band tokens excluded
  const tokens = [
    tok('In', 0.1, 0.4),
    tok('Out', 0.6, 0.4),
  ];
  const c = extractCell(tokens, 0.0, 0.5);
  assertEq(c.text, 'In', 'only In-band kept');
  assertEq(c.token_count, 1, 'token_count 1');
}

{
  // All-null confidences
  const tokens = [
    tok('A', 0.1, 0.4, 0.02, null),
    tok('B', 0.15, 0.4, 0.02, null),
  ];
  const c = extractCell(tokens, 0.0, 0.5);
  assertEq(c.confidence, null, 'all-null avg → null');
  assertEq(c.confidence_min, null, 'all-null min → null');
}

// ============================================================================
// validateCell
// ============================================================================
console.log('\n── validateCell ──────────────────────────────────────────');

{
  // Empty cell → needs review
  const v = validateCell('number', { text: '', confidence: 0.9, confidence_min: 0.9, token_count: 0, bbox: null });
  assertEq(v.needs_review, true, 'empty cell → needs review');
  assertEq(v.reasons[0], 'empty', 'empty reason');
}

{
  // Whitespace cell → needs review
  const v = validateCell('number', { text: '   ', confidence: 0.9, confidence_min: 0.9 });
  assertEq(v.needs_review, true, 'whitespace cell → needs review');
}

{
  // Low confidence
  const v = validateCell('groom', { text: 'John Smith', confidence: 0.4, confidence_min: 0.3 });
  assert(v.needs_review === true, 'low confidence → needs review');
  assert(v.reasons.includes('low_confidence'), 'reason includes low_confidence');
}

{
  // Valid number
  const v = validateCell('number', { text: '42', confidence: 0.9, confidence_min: 0.9 });
  assertEq(v.needs_review, false, 'valid number → no review');
  assertEq(v.reasons, undefined, 'no reasons');
}

{
  // Number with non-digits → expected_integer
  const v = validateCell('number', { text: '42a', confidence: 0.9, confidence_min: 0.9 });
  assert(v.needs_review === true, 'non-integer number → review');
  assert(v.reasons.includes('expected_integer'), 'expected_integer reason');
}

{
  // Valid date M/D
  const v = validateCell('date', { text: '5/12', confidence: 0.9, confidence_min: 0.9 });
  assertEq(v.needs_review, false, 'valid M/D date → no review');
}

{
  // Date with year → fails M/D validator
  const v = validateCell('date', { text: '5/12/2020', confidence: 0.9, confidence_min: 0.9 });
  assert(v.needs_review === true, 'M/D/Y date fails M/D-only validator');
  assert(v.reasons.includes('expected_date_md'), 'expected_date_md reason');
}

{
  // Valid license with date
  const v = validateCell('license', { text: 'issued 5/12/2020', confidence: 0.9, confidence_min: 0.9 });
  assertEq(v.needs_review, false, 'license with date → ok');
}

{
  // Valid license with #
  const v = validateCell('license', { text: '#12345', confidence: 0.9, confidence_min: 0.9 });
  assertEq(v.needs_review, false, 'license with # → ok');
}

{
  // License with neither
  const v = validateCell('license', { text: 'unknown text', confidence: 0.9, confidence_min: 0.9 });
  assert(v.needs_review === true, 'license without date or # → review');
  assert(v.reasons.includes('expected_license_format'), 'expected_license_format reason');
}

{
  // Other column without specific validator
  const v = validateCell('groom', { text: 'John Smith', confidence: 0.9, confidence_min: 0.9 });
  assertEq(v.needs_review, false, 'groom with text → no review');
}

// ============================================================================
// buildTable
// ============================================================================
console.log('\n── buildTable ────────────────────────────────────────────');

{
  // Single ledger row builds correct rows[]
  const dateMid = (TABLE1_COLUMNS.date[0] + TABLE1_COLUMNS.date[1]) / 2;
  const numberMid = (TABLE1_COLUMNS.number[0] + TABLE1_COLUMNS.number[1]) / 2;
  const groomMid = (TABLE1_COLUMNS.groom[0] + TABLE1_COLUMNS.groom[1]) / 2;
  const ledgerRows = [
    [
      tok('1', numberMid, 0.4),
      tok('5/12', dateMid, 0.4),
      tok('John', groomMid, 0.4),
    ],
  ];
  const cyrillic = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
  const english = ['NUMBER', 'DATE', 'GROOM', 'GP', 'BRIDE', 'BP'];
  const t = buildTable(1, TABLE1_KEYS, TABLE1_COLUMNS, cyrillic, english, ledgerRows);
  assertEq(t.table_number, 1, 'table_number 1');
  assertEq(t.column_count, 6, 'column_count 6');
  assertEq(t.row_count, 3, 'row_count = 1 cyrillic + 1 english + 1 data');
  assertEq(t.has_header_row, true, 'has_header_row');
  assertEq(t.header_content, 'H1|H2|H3|H4|H5|H6', 'header_content joined');
  assertEq(t.rows[0].type, 'header', 'row 0 is header');
  assertEq(t.rows[0].cells[0].kind, 'columnHeader', 'header cell kind');
  assertEq(t.rows[0].cells[0].content, 'H1', 'header cell content');
  assertEq(t.rows[1].type, 'row', 'row 1 is row');
  assertEq(t.rows[1].cells[0].content, 'NUMBER', 'english header content');
  assertEq(t.rows[2].row_index, 2, 'data row index = 2');
  assertEq(t.rows[2].cells[0].content, '1', 'number cell');
  assertEq(t.rows[2].cells[1].content, '5/12', 'date cell');
  assertEq(t.rows[2].cells[2].content, 'John', 'groom cell');
  // The number "1" is integer-valid, date "5/12" is M/D-valid → no review
  assertEq(t.rows[2].cells[0].needs_review, false, 'valid number cell → no review');
  // Empty groom_parents cell → needs_review = true
  assertEq(t.rows[2].cells[3].needs_review, true, 'empty groom_parents → review');
}

{
  // Empty ledgerRows → header rows only
  const t = buildTable(2, TABLE2_KEYS, TABLE2_COLUMNS, ['A', 'B', 'C'], ['X', 'Y', 'Z'], []);
  assertEq(t.row_count, 2, 'no data rows → only 2 header rows');
  assertEq(t.column_count, 3, 'column_count 3 for table 2');
}

// ============================================================================
// extractMarriageLedgerTable — end-to-end
// ============================================================================
console.log('\n── extractMarriageLedgerTable: empty paths ───────────────');

{
  const r = extractMarriageLedgerTable(null);
  assertEq(r.layout_id, 'marriage_ledger_v1', 'null vision still emits layout_id');
  assertEq(r.tables.length, 2, 'always emits 2 tables (marriage contract)');
  assertEq(r.total_tokens, 0, 'null vision → 0 tokens');
  assertEq(r.data_tokens, 0, '0 data tokens');
  assertEq(r.data_rows, 0, '0 data rows');
  assertEq(r.page_dimensions, null, 'null page dimensions');
  // Both tables still get the 2 header rows
  assertEq(r.tables[0].row_count, 2, 'table 1 still has 2 header rows');
  assertEq(r.tables[1].row_count, 2, 'table 2 still has 2 header rows');
}

console.log('\n── extractMarriageLedgerTable: data row ──────────────────');

{
  // Build a synthetic page with header tokens above the threshold
  // and 1 data row below.
  const W = 1000;
  const H = 1000;
  const dateMid = (TABLE1_COLUMNS.date[0] + TABLE1_COLUMNS.date[1]) / 2;
  const numberMid = (TABLE1_COLUMNS.number[0] + TABLE1_COLUMNS.number[1]) / 2;
  const groomMid = (TABLE1_COLUMNS.groom[0] + TABLE1_COLUMNS.groom[1]) / 2;
  const priestMid = (TABLE2_COLUMNS.priest[0] + TABLE2_COLUMNS.priest[1]) / 2;
  const witnessesMid = (TABLE2_COLUMNS.witnesses[0] + TABLE2_COLUMNS.witnesses[1]) / 2;
  const licenseMid = (TABLE2_COLUMNS.license[0] + TABLE2_COLUMNS.license[1]) / 2;

  // Header at y = 0.1 (above 0.295)
  // Data at y = 0.5 (well below)
  const dataY = 0.5 * H;
  const dataYEnd = dataY + 20;

  const words = [
    // Header row (above threshold)
    word('NUMBER', 10, 90, 100, 110),
    word('DATE', 110, 90, 200, 110),
    // Data row
    word('1', numberMid * W - 5, dataY, numberMid * W + 5, dataYEnd, 0.95),
    word('5/12', dateMid * W - 20, dataY, dateMid * W + 20, dataYEnd, 0.92),
    word('John', groomMid * W - 30, dataY, groomMid * W + 30, dataYEnd, 0.88),
    word('Father', priestMid * W - 40, dataY, priestMid * W + 40, dataYEnd, 0.9),
    word('Witness1', witnessesMid * W - 60, dataY, witnessesMid * W + 60, dataYEnd, 0.85),
    word('5/12/2020', licenseMid * W - 60, dataY, licenseMid * W + 60, dataYEnd, 0.87),
  ];
  const v = buildVision(W, H, words);
  const r = extractMarriageLedgerTable(v);

  assertEq(r.layout_id, 'marriage_ledger_v1', 'layout_id');
  assertEq(r.page_number, 1, 'page_number');
  assertEq(r.tables.length, 2, '2 tables emitted');
  assert(r.total_tokens >= 8, 'total_tokens >= 8');
  assert(r.data_tokens >= 6, 'data_tokens >= 6 (header words filtered)');
  assertEq(r.data_rows, 1, '1 data row');
  assertEq(r.header_y_threshold, HEADER_Y_THRESHOLD, 'header_y_threshold default');
  assert(r.page_dimensions !== null, 'page_dimensions set');
  assertEq(r.page_dimensions.width, W, 'page width');
  assertEq(r.page_dimensions.height, H, 'page height');

  // Table 1 has cyrillic + english headers + 1 data row = 3 rows
  const t1 = r.tables[0];
  assertEq(t1.row_count, 3, 'table 1 row_count');
  const dataRow1 = t1.rows[2];
  assertEq(dataRow1.cells[0].content, '1', 'number cell');
  assertEq(dataRow1.cells[1].content, '5/12', 'date cell');
  assertEq(dataRow1.cells[2].content, 'John', 'groom cell');

  // Table 2 has cyrillic + english headers + 1 data row = 3 rows
  const t2 = r.tables[1];
  assertEq(t2.row_count, 3, 'table 2 row_count');
  const dataRow2 = t2.rows[2];
  assertEq(dataRow2.cells[0].content, 'Father', 'priest cell');
  assertEq(dataRow2.cells[1].content, 'Witness1', 'witnesses cell');
  assertEq(dataRow2.cells[2].content, '5/12/2020', 'license cell');
}

console.log('\n── extractMarriageLedgerTable: header-word filtering ─────');

{
  // Header words appearing JUST below the y-threshold should be filtered out.
  // The threshold is 0.295. Words with y_center between 0.295 and 0.315 that
  // match HEADER_WORDS get filtered.
  const W = 1000;
  const H = 1000;
  // y_center = 0.30 → in the [0.295, 0.315] zone → filtered
  // Use the date column band to get the same x_center
  const dateMid = (TABLE1_COLUMNS.date[0] + TABLE1_COLUMNS.date[1]) / 2;
  const dataY = 0.30 * H - 10;
  const dataYEnd = 0.30 * H + 10;
  const words = [
    word('DATE', dateMid * W - 30, dataY, dateMid * W + 30, dataYEnd, 0.9),
    word('1', 50, 500, 60, 520, 0.9), // real data
  ];
  const v = buildVision(W, H, words);
  const r = extractMarriageLedgerTable(v);
  // DATE should be filtered, only "1" remains
  assertEq(r.data_tokens, 1, 'header word filtered, only data token left');
  assertEq(r.data_rows, 1, '1 data row');
}

console.log('\n── extractMarriageLedgerTable: custom headerY ────────────');

{
  // Override headerY to 0.5 — only tokens below 0.5 are data
  const W = 1000;
  const H = 1000;
  const words = [
    word('A', 50, 200, 60, 220), // y_center 0.21 → above 0.5 → header
    word('B', 50, 600, 60, 620), // y_center 0.61 → below 0.5 → data
  ];
  const v = buildVision(W, H, words);
  const r = extractMarriageLedgerTable(v, { headerY: 0.5 });
  assertEq(r.header_y_threshold, 0.5, 'custom headerY echoed');
  assertEq(r.data_tokens, 1, 'only B is below 0.5');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
