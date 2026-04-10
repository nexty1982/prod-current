#!/usr/bin/env npx tsx
/**
 * Unit tests for generic_table.js layout engine (OMD-145)
 *
 * Run: npx tsx server/src/ocr/layouts/__tests__/generic_table.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const gt = require('../generic_table');

const {
  LAYOUT_ID,
  extractWordTokens,
  autoDetectHeaderY,
  clusterIntoRows,
  mergeLedgerRows,
  detectColumns,
  extractCell,
  extractGenericTable,
  tableToStructuredText,
} = gt;

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

// ── Synthetic Vision JSON builders (flattened shape used by generic_table) ──

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
    pages: [
      {
        width,
        height,
        blocks: [
          {
            paragraphs: [
              {
                words,
              },
            ],
          },
        ],
      },
    ],
  };
}

// ============================================================================
// LAYOUT_ID
// ============================================================================
console.log('\n── LAYOUT_ID ─────────────────────────────────────────────');
assertEq(LAYOUT_ID, 'generic_table_v1', 'LAYOUT_ID constant');

// ============================================================================
// extractWordTokens
// ============================================================================
console.log('\n── extractWordTokens ─────────────────────────────────────');

{
  // Empty / null cases
  assertEq(extractWordTokens(null).length, 0, 'null vision → empty');
  assertEq(extractWordTokens(undefined).length, 0, 'undefined vision → empty');
  assertEq(extractWordTokens({}).length, 0, 'empty object → empty');
  assertEq(extractWordTokens({ pages: [] }).length, 0, 'empty pages → empty');
  assertEq(extractWordTokens({ pages: [null] }).length, 0, 'null page → empty');
  assertEq(extractWordTokens({ pages: [{ width: 100, height: 100 }] }).length, 0, 'page without blocks → empty');
}

{
  // Single word extraction
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
  assertClose(t.width, 0.2, 1e-9, 'width');
  assertClose(t.height, 0.025, 1e-9, 'height');
}

{
  // Whitespace-only text skipped
  const v = buildVision(100, 100, [
    word('Real', 10, 10, 50, 30, 0.9),
    word('   ', 60, 10, 90, 30, 0.9),
    word('', 70, 10, 80, 30, 0.9),
  ]);
  const tokens = extractWordTokens(v);
  assertEq(tokens.length, 1, 'whitespace and empty text skipped');
  assertEq(tokens[0].text, 'Real', 'only Real kept');
}

{
  // Word without bounding box vertices skipped
  const v: any = {
    pages: [
      {
        width: 100,
        height: 100,
        blocks: [
          {
            paragraphs: [
              {
                words: [
                  { text: 'NoBox' },
                  { text: 'PartialBox', boundingBox: { vertices: [{ x: 1, y: 1 }, { x: 2, y: 2 }] } },
                  word('Good', 10, 10, 50, 30, 0.9),
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const tokens = extractWordTokens(v);
  assertEq(tokens.length, 1, 'invalid bounding boxes skipped');
  assertEq(tokens[0].text, 'Good', 'only Good kept');
}

{
  // Confidence default null
  const v: any = {
    pages: [
      {
        width: 100,
        height: 100,
        blocks: [
          {
            paragraphs: [
              {
                words: [
                  {
                    text: 'NoConf',
                    boundingBox: {
                      vertices: [
                        { x: 10, y: 10 },
                        { x: 50, y: 10 },
                        { x: 50, y: 30 },
                        { x: 10, y: 30 },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const tokens = extractWordTokens(v);
  assertEq(tokens.length, 1, 'word without confidence still kept');
  assertEq(tokens[0].confidence, null, 'missing confidence → null');
}

// ============================================================================
// clusterIntoRows
// ============================================================================
console.log('\n── clusterIntoRows ───────────────────────────────────────');

{
  assertEq(clusterIntoRows([]).length, 0, 'empty tokens → no rows');
}

{
  // Three tokens on the same Y → one row
  const tokens = [
    { text: 'A', x_center: 0.1, y_center: 0.1, height: 0.02, x_min: 0.05, x_max: 0.15, y_min: 0.09, y_max: 0.11 },
    { text: 'B', x_center: 0.3, y_center: 0.105, height: 0.02, x_min: 0.25, x_max: 0.35, y_min: 0.095, y_max: 0.115 },
    { text: 'C', x_center: 0.5, y_center: 0.1, height: 0.02, x_min: 0.45, x_max: 0.55, y_min: 0.09, y_max: 0.11 },
  ];
  const rows = clusterIntoRows(tokens);
  assertEq(rows.length, 1, 'tokens on same Y → 1 row');
  assertEq(rows[0].length, 3, 'row has 3 tokens');
}

{
  // Two well-separated rows
  const tokens = [
    { text: 'A', x_center: 0.1, y_center: 0.1, height: 0.02 },
    { text: 'B', x_center: 0.3, y_center: 0.1, height: 0.02 },
    { text: 'C', x_center: 0.1, y_center: 0.5, height: 0.02 },
    { text: 'D', x_center: 0.3, y_center: 0.5, height: 0.02 },
  ];
  const rows = clusterIntoRows(tokens);
  assertEq(rows.length, 2, '2 separated lines → 2 rows');
  assertEq(rows[0].length, 2, 'row 0 has 2 tokens');
  assertEq(rows[1].length, 2, 'row 1 has 2 tokens');
}

{
  // Sort by Y center first
  const tokens = [
    { text: 'D2', x_center: 0.3, y_center: 0.5, height: 0.02 },
    { text: 'A1', x_center: 0.1, y_center: 0.1, height: 0.02 },
    { text: 'C2', x_center: 0.1, y_center: 0.5, height: 0.02 },
    { text: 'B1', x_center: 0.3, y_center: 0.1, height: 0.02 },
  ];
  const rows = clusterIntoRows(tokens);
  assertEq(rows.length, 2, 'unsorted input still clusters into 2 rows');
  assertClose(rows[0][0].y_center, 0.1, 1e-9, 'first row is the upper one');
  assertClose(rows[1][0].y_center, 0.5, 1e-9, 'second row is the lower one');
}

{
  // Override merge threshold
  const tokens = [
    { text: 'A', x_center: 0.1, y_center: 0.10, height: 0.02 },
    { text: 'B', x_center: 0.1, y_center: 0.13, height: 0.02 }, // 0.03 gap
    { text: 'C', x_center: 0.1, y_center: 0.16, height: 0.02 },
  ];
  // Default threshold = 0.02 * 1.2 = 0.024 → would create 3 rows
  const defaultRows = clusterIntoRows(tokens);
  assertEq(defaultRows.length, 3, 'default threshold → 3 separate rows');

  // Larger override → all merged
  const mergedRows = clusterIntoRows(tokens, 0.05);
  assertEq(mergedRows.length, 1, 'override threshold 0.05 → all merged');
}

// ============================================================================
// autoDetectHeaderY
// ============================================================================
console.log('\n── autoDetectHeaderY ─────────────────────────────────────');

{
  // No rows → null
  assertEq(autoDetectHeaderY([]), null, 'empty rows → null');
}

{
  // No header keywords → null
  const rows = [
    [{ text: 'John', y_max: 0.1 }, { text: 'Smith', y_max: 0.1 }],
    [{ text: 'Jane', y_max: 0.2 }, { text: 'Doe', y_max: 0.2 }],
  ];
  assertEq(autoDetectHeaderY(rows), null, 'no header keywords → null');
}

{
  // Header row detected
  const rows = [
    [{ text: 'NUMBER', y_max: 0.05 }, { text: 'NAME', y_max: 0.05 }, { text: 'DATE', y_max: 0.05 }],
    [{ text: 'John', y_max: 0.15 }, { text: 'Smith', y_max: 0.15 }],
  ];
  const r = autoDetectHeaderY(rows);
  assert(r !== null, 'header row detected → non-null');
  assertClose(r as number, 0.055, 1e-9, 'headerY = max y + 0.005 margin');
}

{
  // Row with header keywords AND data pattern is NOT a header
  const rows = [
    [{ text: 'NUMBER', y_max: 0.05 }, { text: '1-03', y_max: 0.05 }],
    [{ text: 'John', y_max: 0.15 }],
  ];
  assertEq(autoDetectHeaderY(rows), null, 'header keywords with data pattern → not header');
}

{
  // Only checks first 8 rows
  const rows = [];
  for (let i = 0; i < 5; i++) {
    rows.push([{ text: `name${i}`, y_max: 0.01 * (i + 1) }]);
  }
  // Header at row 10 - should be ignored
  for (let i = 5; i < 10; i++) {
    rows.push([{ text: `data${i}`, y_max: 0.01 * (i + 1) }]);
  }
  rows.push([{ text: 'NUMBER', y_max: 0.5 }, { text: 'NAME', y_max: 0.5 }]);
  assertEq(autoDetectHeaderY(rows), null, 'header beyond first 8 rows ignored');
}

// ============================================================================
// detectColumns
// ============================================================================
console.log('\n── detectColumns ─────────────────────────────────────────');

{
  assertEq(detectColumns([]).length, 0, 'empty rows → no columns');
}

{
  // Three clearly-separated bands at x∈{0.05-0.15, 0.40-0.50, 0.75-0.85}.
  // The leading whitespace (0..0.05) and gaps between bands are ALL treated
  // as separators, so we get 4 columns (leading-whitespace col + 3 data cols).
  const rows = [];
  for (let r = 0; r < 5; r++) {
    rows.push([
      { x_min: 0.05, x_max: 0.15 },
      { x_min: 0.40, x_max: 0.50 },
      { x_min: 0.75, x_max: 0.85 },
    ]);
  }
  const cols = detectColumns(rows);
  assertEq(cols.length, 4, '3 data bands + leading whitespace → 4 columns');
  // First col should start near 0
  assertClose(cols[0].band[0], 0.0, 1e-9, 'col 0 starts at 0');
  // Last col should end at 1.0
  assertClose(cols[cols.length - 1].band[1], 1.0, 1e-9, 'last col ends at 1');
  // Column keys
  assertEq(cols[0].key, 'col_1', 'first key');
  assertEq(cols[3].key, 'col_4', 'fourth key');
}

{
  // No gaps → single full-width column
  const rows = [];
  for (let r = 0; r < 5; r++) {
    rows.push([{ x_min: 0.0, x_max: 1.0 }]);
  }
  const cols = detectColumns(rows);
  assertEq(cols.length, 1, 'no gaps → 1 column');
  assertEq(cols[0].key, 'col_1', 'single col key');
  assertEq(cols[0].band[0], 0.0, 'band starts at 0');
  assertEq(cols[0].band[1], 1.0, 'band ends at 1');
}

{
  // Gap below minGapWidth is ignored: tokens at [0.05-0.45] and [0.46-0.95]
  // have a tiny middle gap of ~0.01 (1 bin) which fails the 0.05 (=10 bin)
  // minimum, so the two bands collapse together. The leading whitespace
  // (0..0.05 = 10 bins, exactly minGapBins) IS still detected, so we end
  // up with 2 columns: leading-whitespace + everything-else.
  const rows = [];
  for (let r = 0; r < 5; r++) {
    rows.push([
      { x_min: 0.05, x_max: 0.45 },
      { x_min: 0.46, x_max: 0.95 },
    ]);
  }
  const cols = detectColumns(rows, 0.05);
  assertEq(cols.length, 2, 'gap below minGapWidth ignored → leading + merged data band');
}

// ============================================================================
// extractCell
// ============================================================================
console.log('\n── extractCell ───────────────────────────────────────────');

{
  // Empty band → empty cell
  const c = extractCell([], 0.0, 0.5);
  assertEq(c.text, '', 'no tokens → empty text');
  assertEq(c.confidence, null, 'no tokens → null confidence');
  assertEq(c.token_count, 0, 'no tokens → token_count 0');
  assertEq(c.bbox, null, 'no tokens → null bbox');
}

{
  // Tokens within band joined
  const tokens = [
    { text: 'John', x_center: 0.1, y_center: 0.1, height: 0.02, x_min: 0.05, x_max: 0.15, y_min: 0.09, y_max: 0.11, confidence: 0.9 },
    { text: 'Smith', x_center: 0.2, y_center: 0.1, height: 0.02, x_min: 0.16, x_max: 0.25, y_min: 0.09, y_max: 0.11, confidence: 0.8 },
  ];
  const c = extractCell(tokens, 0.0, 0.5);
  assertEq(c.text, 'John Smith', 'tokens joined with space');
  assertEq(c.token_count, 2, 'token_count = 2');
  assertClose(c.confidence as number, 0.85, 0.001, 'avg confidence rounded');
  assert(c.bbox !== null, 'bbox set');
  assertClose((c.bbox as number[])[0], 0.05, 1e-9, 'bbox x0');
  assertClose((c.bbox as number[])[2], 0.25, 1e-9, 'bbox x1');
}

{
  // Tokens outside band excluded
  const tokens = [
    { text: 'In', x_center: 0.1, y_center: 0.1, height: 0.02, x_min: 0.05, x_max: 0.15, y_min: 0.09, y_max: 0.11, confidence: 0.9 },
    { text: 'Out', x_center: 0.6, y_center: 0.1, height: 0.02, x_min: 0.55, x_max: 0.65, y_min: 0.09, y_max: 0.11, confidence: 0.9 },
  ];
  const c = extractCell(tokens, 0.0, 0.5);
  assertEq(c.text, 'In', 'only In-band tokens');
  assertEq(c.token_count, 1, 'token_count = 1');
}

{
  // Sort: y_diff > height → sort by Y
  const tokens = [
    { text: 'B', x_center: 0.1, y_center: 0.2, height: 0.02, x_min: 0.05, x_max: 0.15, y_min: 0.19, y_max: 0.21, confidence: 0.9 },
    { text: 'A', x_center: 0.1, y_center: 0.1, height: 0.02, x_min: 0.05, x_max: 0.15, y_min: 0.09, y_max: 0.11, confidence: 0.9 },
  ];
  const c = extractCell(tokens, 0.0, 0.5);
  assertEq(c.text, 'A B', 'sorted by Y when y_diff > height');
}

{
  // Mixed null + numeric confidences
  const tokens = [
    { text: 'A', x_center: 0.1, y_center: 0.1, height: 0.02, x_min: 0.05, x_max: 0.15, y_min: 0.09, y_max: 0.11, confidence: null },
    { text: 'B', x_center: 0.2, y_center: 0.1, height: 0.02, x_min: 0.16, x_max: 0.25, y_min: 0.09, y_max: 0.11, confidence: 0.8 },
  ];
  const c = extractCell(tokens, 0.0, 0.5);
  assertEq(c.confidence, 0.8, 'null confidences excluded from average');
}

{
  // All null confidences
  const tokens = [
    { text: 'A', x_center: 0.1, y_center: 0.1, height: 0.02, x_min: 0.05, x_max: 0.15, y_min: 0.09, y_max: 0.11, confidence: null },
  ];
  const c = extractCell(tokens, 0.0, 0.5);
  assertEq(c.confidence, null, 'all-null confidences → null average');
}

// ============================================================================
// mergeLedgerRows
// ============================================================================
console.log('\n── mergeLedgerRows ───────────────────────────────────────');

{
  // Single row passes through
  const rows = [[{ x_center: 0.1, y_center: 0.1 }]];
  const m = mergeLedgerRows(rows);
  assertEq(m.length, 1, 'single row → unchanged');
}

{
  // Empty input
  assertEq(mergeLedgerRows([]).length, 0, 'empty rows → empty');
}

{
  // Continuation merge: row with no left content joins previous
  const rows = [
    // Row 0: has left content (real entry)
    [{ x_center: 0.1, y_center: 0.10 }, { x_center: 0.5, y_center: 0.10 }],
    // Row 1: NO left content (continuation)
    [{ x_center: 0.5, y_center: 0.13 }],
    // Row 2: has left content (next entry)
    [{ x_center: 0.1, y_center: 0.20 }, { x_center: 0.5, y_center: 0.20 }],
    // Row 3: continuation of row 2
    [{ x_center: 0.5, y_center: 0.23 }],
    // Row 4: real entry
    [{ x_center: 0.1, y_center: 0.30 }, { x_center: 0.5, y_center: 0.30 }],
  ];
  const m = mergeLedgerRows(rows, 0.005); // tight gap so y-merge doesn't fire
  // Continuation merge requires final length >= 3 to apply
  assertEq(m.length, 3, 'continuation rows merged into entries');
}

// ============================================================================
// extractGenericTable — end-to-end
// ============================================================================
console.log('\n── extractGenericTable: empty paths ──────────────────────');

{
  const r = extractGenericTable(null);
  assertEq(r.layout_id, 'generic_table_v1', 'null vision still emits layout_id');
  assertEq(r.tables.length, 0, 'null vision → no tables');
  assertEq(r.total_tokens, 0, 'null vision → 0 tokens');
}

{
  const r = extractGenericTable({ pages: [{ width: 100, height: 100, blocks: [] }] });
  assertEq(r.tables.length, 0, 'no tokens → no tables');
}

console.log('\n── extractGenericTable: simple 3-column table ────────────');

{
  // Build a clean 3-column, 3-row table
  const words: any[] = [];
  // Header row at y ~0.05 (above default headerY 0.15)
  words.push(word('NUMBER', 50, 50, 150, 80));
  words.push(word('NAME', 400, 50, 500, 80));
  words.push(word('DATE', 750, 50, 850, 80));
  // Data rows below 0.15 (page height 1000, so >150)
  for (let i = 0; i < 3; i++) {
    const yTop = 200 + i * 80;
    const yBot = yTop + 30;
    words.push(word(String(i + 1), 50, yTop, 100, yBot));
    words.push(word(`Name${i}`, 400, yTop, 550, yBot));
    words.push(word(`2020-0${i + 1}-01`, 750, yTop, 900, yBot));
  }
  const v = buildVision(1000, 1000, words);
  const r = extractGenericTable(v);

  assertEq(r.layout_id, 'generic_table_v1', 'layout id');
  assertEq(r.page_number, 1, 'page_number = pageIndex + 1');
  assertEq(r.tables.length, 1, '1 table emitted');
  const table = r.tables[0];
  assert(table.column_count >= 2, 'detected at least 2 columns');
  assert(table.has_header_row === true, 'header row detected');
  // mergeLedgerRows can collapse rows with uniform Y gaps, so we only
  // verify a header row + at least one data row are present.
  assert(table.row_count >= 2, 'at least header + 1 data row');
  assert(r.data_rows >= 1, 'at least 1 data row');
  assert(r.column_bands !== undefined, 'column_bands map present');
  assert(typeof r.extracted_at === 'string', 'extracted_at ISO string');
}

console.log('\n── extractGenericTable: custom columnBands ───────────────');

{
  const words: any[] = [];
  for (let i = 0; i < 3; i++) {
    const yTop = 200 + i * 100;
    const yBot = yTop + 30;
    words.push(word('A', 100, yTop, 200, yBot));
    words.push(word('B', 500, yTop, 600, yBot));
    words.push(word('C', 800, yTop, 900, yBot));
  }
  const v = buildVision(1000, 1000, words);
  const r = extractGenericTable(v, {
    columnBands: [[0.0, 0.33], [0.33, 0.66], [0.66, 1.0]],
  });

  assertEq(r.columns_detected, 3, 'custom bands → 3 columns');
  assertEq(r.tables[0].column_count, 3, 'table column_count = 3');
  // Check column keys
  const bands = r.column_bands;
  assertEq(bands.col_1[0], 0.0, 'col_1 start');
  assertEq(bands.col_3[1], 1.0, 'col_3 end');
}

console.log('\n── extractGenericTable: pageIndex selection ──────────────');

{
  // Two pages, different content
  const v: any = {
    pages: [
      {
        width: 1000,
        height: 1000,
        blocks: [{ paragraphs: [{ words: [word('PageZero', 100, 200, 300, 230)] }] }],
      },
      {
        width: 1000,
        height: 1000,
        blocks: [{ paragraphs: [{ words: [word('PageOne', 100, 200, 300, 230)] }] }],
      },
    ],
  };
  const r0 = extractGenericTable(v, { pageIndex: 0 });
  const r1 = extractGenericTable(v, { pageIndex: 1 });
  assertEq(r0.page_number, 1, 'pageIndex 0 → page_number 1');
  assertEq(r1.page_number, 2, 'pageIndex 1 → page_number 2');
  assert(r0.total_tokens === 1 && r1.total_tokens === 1, 'each page has 1 token');
}

// ============================================================================
// tableToStructuredText
// ============================================================================
console.log('\n── tableToStructuredText ─────────────────────────────────');

{
  assertEq(tableToStructuredText(null), null, 'null input → null');
  assertEq(tableToStructuredText({}), null, 'empty object → null');
  assertEq(tableToStructuredText({ tables: [] }), null, 'no tables → null');
}

{
  const result = {
    layout_id: 'generic_table_v1',
    columns_detected: 2,
    data_rows: 1,
    tables: [
      {
        table_number: 1,
        column_count: 2,
        row_count: 2,
        rows: [
          { type: 'header', cells: [{ content: 'Name' }, { content: 'Date' }] },
          { type: 'row', cells: [{ content: 'John' }, { content: '2020-01-01' }] },
        ],
      },
    ],
  };
  const text = tableToStructuredText(result);
  assert(text !== null, 'returns string');
  assert((text as string).includes('Structured Table Extraction'), 'includes header');
  assert((text as string).includes('Name | Date'), 'includes joined header row');
  assert((text as string).includes('John | 2020-01-01'), 'includes joined data row');
  // Header underline (matches length of header line)
  assert((text as string).includes('-----------'), 'includes underline');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
