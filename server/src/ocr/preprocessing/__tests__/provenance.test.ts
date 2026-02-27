#!/usr/bin/env npx tsx
/**
 * Provenance & Alignment Tests — Phase 3.2
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/provenance.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import {
  normalizeTokens,
  buildTableProvenance,
  buildRecordCandidatesProvenance,
  aggregateConfidence,
  bboxUnion,
  buildBundle,
} from '../provenance';
import type { NormalizedToken } from '../provenance';

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

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeVisionJson(
  tokens: Array<{ text: string; x0: number; y0: number; x1: number; y1: number; confidence?: number }>,
  pageW: number = 1000,
  pageH: number = 800,
) {
  return {
    pages: [{
      width: pageW,
      height: pageH,
      blocks: [{
        paragraphs: [{
          words: tokens.map(t => ({
            text: t.text,
            confidence: t.confidence ?? 0.95,
            boundingBox: {
              vertices: [
                { x: t.x0, y: t.y0 },
                { x: t.x1, y: t.y0 },
                { x: t.x1, y: t.y1 },
                { x: t.x0, y: t.y1 },
              ],
            },
          })),
        }],
      }],
    }],
  };
}

function makeTableExtraction(
  cells: Array<{ row_index: number; column_key: string; content: string; bbox?: number[] }>,
  columnBands: Record<string, [number, number]>,
) {
  // Group cells by row
  const rowMap = new Map<number, any[]>();
  for (const cell of cells) {
    if (!rowMap.has(cell.row_index)) rowMap.set(cell.row_index, []);
    rowMap.get(cell.row_index)!.push(cell);
  }

  const rows = [...rowMap.entries()].sort((a, b) => a[0] - b[0]).map(([rowIdx, rowCells]) => ({
    row_index: rowIdx,
    type: rowIdx === 0 ? 'header' as const : 'row' as const,
    cells: rowCells.map((c, ci) => ({
      row_index: rowIdx,
      column_index: ci,
      column_key: c.column_key,
      content: c.content,
      ...(c.bbox ? { bbox: c.bbox } : {}),
    })),
  }));

  return {
    layout_id: 'test_layout',
    page_number: 1,
    page_dimensions: { width: 1000, height: 800 },
    tables: [{
      row_count: rows.length,
      column_count: Object.keys(columnBands).length,
      table_number: 1,
      has_header_row: true,
      rows,
    }],
    column_bands: columnBands,
    header_y_threshold: 0.10,
    total_tokens: 10,
    data_tokens: 8,
    data_rows: rows.filter(r => r.type === 'row').length,
    extracted_at: new Date().toISOString(),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

function test1_TokenNormalization() {
  console.log('\nTest 1: Token normalization assigns stable IDs and correct coords');

  const visionJson = makeVisionJson([
    { text: 'Hello', x0: 100, y0: 100, x1: 200, y1: 130, confidence: 0.95 },
    { text: 'World', x0: 250, y0: 100, x1: 350, y1: 130, confidence: 0.90 },
    { text: 'Foo', x0: 100, y0: 200, x1: 180, y1: 230, confidence: 0.85 },
  ], 1000, 800);

  const result = normalizeTokens(visionJson);

  assert(result.method === 'token_normalize_v1', 'method correct');
  assert(result.tokens.length === 3, `should have 3 tokens (got ${result.tokens.length})`);
  assert(result.page_dimensions.width === 1000, 'page width correct');
  assert(result.page_dimensions.height === 800, 'page height correct');

  // Check stable IDs
  assert(result.tokens[0].token_id === 0, 'first token_id should be 0');
  assert(result.tokens[1].token_id === 1, 'second token_id should be 1');
  assert(result.tokens[2].token_id === 2, 'third token_id should be 2');

  // Check pixel coords
  assert(result.tokens[0].bbox_px[0] === 100, 'bbox_px x_min correct');
  assert(result.tokens[0].bbox_px[1] === 100, 'bbox_px y_min correct');
  assert(result.tokens[0].bbox_px[2] === 200, 'bbox_px x_max correct');
  assert(result.tokens[0].bbox_px[3] === 130, 'bbox_px y_max correct');

  // Check normalized coords
  assert(result.tokens[0].bbox_norm[0] === 0.1, `bbox_norm x_min should be 0.1 (got ${result.tokens[0].bbox_norm[0]})`);
  assert(result.tokens[0].bbox_norm[1] === 0.125, `bbox_norm y_min should be 0.125 (got ${result.tokens[0].bbox_norm[1]})`);

  // Check text and confidence
  assert(result.tokens[0].text === 'Hello', 'text correct');
  assert(result.tokens[0].confidence === 0.95, 'confidence correct');
  assert(result.tokens[0].page_side === 'full', 'page_side default to full');
  assert(result.tokens[0].source_region_index === -1, 'source_region_index default to -1');
}

function test2_TableProvenanceAssignment() {
  console.log('\nTest 2: Table provenance assigns correct token_ids to cells');

  // Create normalized tokens
  const tokens: NormalizedToken[] = [
    // Row 1 tokens
    { token_id: 0, text: '1', confidence: 0.95, bbox_px: [30, 120, 60, 150], bbox_norm: [0.03, 0.15, 0.06, 0.1875], source_region_index: -1, page_side: 'full' },
    { token_id: 1, text: '1899', confidence: 0.90, bbox_px: [110, 120, 200, 150], bbox_norm: [0.11, 0.15, 0.20, 0.1875], source_region_index: -1, page_side: 'full' },
    { token_id: 2, text: 'John', confidence: 0.85, bbox_px: [280, 120, 400, 150], bbox_norm: [0.28, 0.15, 0.40, 0.1875], source_region_index: -1, page_side: 'full' },
    // Row 2 tokens
    { token_id: 3, text: '2', confidence: 0.95, bbox_px: [30, 200, 60, 230], bbox_norm: [0.03, 0.25, 0.06, 0.2875], source_region_index: -1, page_side: 'full' },
    { token_id: 4, text: '1900', confidence: 0.88, bbox_px: [110, 200, 200, 230], bbox_norm: [0.11, 0.25, 0.20, 0.2875], source_region_index: -1, page_side: 'full' },
    { token_id: 5, text: 'Maria', confidence: 0.92, bbox_px: [280, 200, 420, 230], bbox_norm: [0.28, 0.25, 0.42, 0.2875], source_region_index: -1, page_side: 'full' },
  ];

  const columnBands: Record<string, [number, number]> = {
    number: [0.00, 0.10],
    date: [0.10, 0.25],
    name: [0.25, 0.60],
  };

  const tableExtraction = makeTableExtraction([
    // Header
    { row_index: 0, column_key: 'number', content: 'No' },
    { row_index: 0, column_key: 'date', content: 'Date' },
    { row_index: 0, column_key: 'name', content: 'Name' },
    // Data row 1 - tokens 0,1,2 should match these cells by bbox
    { row_index: 1, column_key: 'number', content: '1', bbox: [0.02, 0.14, 0.08, 0.20] },
    { row_index: 1, column_key: 'date', content: '1899', bbox: [0.10, 0.14, 0.22, 0.20] },
    { row_index: 1, column_key: 'name', content: 'John', bbox: [0.26, 0.14, 0.42, 0.20] },
    // Data row 2 - tokens 3,4,5 should match these cells
    { row_index: 2, column_key: 'number', content: '2', bbox: [0.02, 0.24, 0.08, 0.30] },
    { row_index: 2, column_key: 'date', content: '1900', bbox: [0.10, 0.24, 0.22, 0.30] },
    { row_index: 2, column_key: 'name', content: 'Maria', bbox: [0.26, 0.24, 0.44, 0.30] },
  ], columnBands);

  const result = buildTableProvenance(tokens, tableExtraction);

  assert(result.method === 'table_provenance_v1', 'method correct');
  assert(result.total_tokens === 6, `total_tokens should be 6 (got ${result.total_tokens})`);

  // Find cell for row 1, number column
  const r1Number = result.cells.find(c => c.row_index === 1 && c.column_key === 'number');
  assert(r1Number !== undefined, 'row 1 number cell exists');
  assert(r1Number!.provenance.token_ids.includes(0), 'row 1 number contains token_id 0');
  assert(!r1Number!.provenance.token_ids.includes(1), 'row 1 number does NOT contain token_id 1');

  // Find cell for row 1, date
  const r1Date = result.cells.find(c => c.row_index === 1 && c.column_key === 'date');
  assert(r1Date !== undefined, 'row 1 date cell exists');
  assert(r1Date!.provenance.token_ids.includes(1), 'row 1 date contains token_id 1');

  // Find cell for row 1, name
  const r1Name = result.cells.find(c => c.row_index === 1 && c.column_key === 'name');
  assert(r1Name !== undefined, 'row 1 name cell exists');
  assert(r1Name!.provenance.token_ids.includes(2), 'row 1 name contains token_id 2');

  // Find cell for row 2, name
  const r2Name = result.cells.find(c => c.row_index === 2 && c.column_key === 'name');
  assert(r2Name !== undefined, 'row 2 name cell exists');
  assert(r2Name!.provenance.token_ids.includes(5), 'row 2 name contains token_id 5 (Maria)');

  // Coverage: 6 data cells with tokens, 3 header cells without → 6/9
  assert(result.cell_coverage_rate > 0, `cell_coverage_rate should be > 0 (got ${result.cell_coverage_rate})`);

  // All 6 tokens should be assigned → 0 orphans
  assert(result.token_orphans_count === 0, `token_orphans should be 0 (got ${result.token_orphans_count})`);
}

function test3_RecordCandidateProvenance() {
  console.log('\nTest 3: Record candidate mapping preserves provenance');

  // Simple tokens
  const tokens: NormalizedToken[] = [
    { token_id: 0, text: '1', confidence: 0.95, bbox_px: [30, 120, 60, 150], bbox_norm: [0.03, 0.15, 0.06, 0.1875], source_region_index: -1, page_side: 'full' },
    { token_id: 1, text: '1899', confidence: 0.90, bbox_px: [110, 120, 200, 150], bbox_norm: [0.11, 0.15, 0.20, 0.1875], source_region_index: -1, page_side: 'full' },
    { token_id: 2, text: 'John', confidence: 0.85, bbox_px: [280, 120, 400, 150], bbox_norm: [0.28, 0.15, 0.40, 0.1875], source_region_index: -1, page_side: 'full' },
  ];

  const columnBands: Record<string, [number, number]> = {
    number: [0.00, 0.10],
    date: [0.10, 0.25],
    name: [0.25, 0.60],
  };

  const tableExtraction = makeTableExtraction([
    { row_index: 0, column_key: 'number', content: 'No' },
    { row_index: 0, column_key: 'date', content: 'Date' },
    { row_index: 0, column_key: 'name', content: 'Name' },
    { row_index: 1, column_key: 'number', content: '1', bbox: [0.02, 0.14, 0.08, 0.20] },
    { row_index: 1, column_key: 'date', content: '1899', bbox: [0.10, 0.14, 0.22, 0.20] },
    { row_index: 1, column_key: 'name', content: 'John', bbox: [0.26, 0.14, 0.42, 0.20] },
  ], columnBands);

  const tableProvenance = buildTableProvenance(tokens, tableExtraction);

  const recordCandidates = {
    candidates: [{
      recordType: 'baptism',
      confidence: 0.90,
      fields: {
        child_name: 'John',
        date_of_birth: '1899',
      },
      sourceRowIndex: 1,
      needsReview: false,
    }],
    detectedType: 'baptism',
    typeConfidence: 0.9,
    columnMapping: {
      name: 'child_name',
      date: 'date_of_birth',
    },
    unmappedColumns: ['number'],
  };

  const result = buildRecordCandidatesProvenance(tableProvenance, recordCandidates);

  assert(result.method === 'record_candidates_provenance_v1', 'method correct');

  // child_name should map through columnMapping (name → child_name) and get token_id 2
  const childField = result.fields.find(f => f.candidate_index === 0 && f.field_name === 'child_name');
  assert(childField !== undefined, 'child_name field provenance exists');
  assert(childField!.provenance.token_ids.includes(2), `child_name should reference token_id 2 (John) (got ${childField!.provenance.token_ids})`);

  // date_of_birth should get token_id 1
  const dateField = result.fields.find(f => f.candidate_index === 0 && f.field_name === 'date_of_birth');
  assert(dateField !== undefined, 'date_of_birth field provenance exists');
  assert(dateField!.provenance.token_ids.includes(1), `date_of_birth should reference token_id 1 (1899) (got ${dateField!.provenance.token_ids})`);

  // Field coverage: 2 fields, both have tokens → 1.0
  assert(result.field_coverage_rate === 1.0, `field_coverage_rate should be 1.0 (got ${result.field_coverage_rate})`);
}

function test4_BboxUnionCorrect() {
  console.log('\nTest 4: Bbox union computation is correct');

  const tokens: NormalizedToken[] = [
    { token_id: 0, text: 'A', confidence: 0.9, bbox_px: [10, 20, 50, 40], bbox_norm: [0.01, 0.025, 0.05, 0.05], source_region_index: -1, page_side: 'full' },
    { token_id: 1, text: 'B', confidence: 0.8, bbox_px: [60, 10, 100, 50], bbox_norm: [0.06, 0.0125, 0.10, 0.0625], source_region_index: -1, page_side: 'full' },
  ];

  const union = bboxUnion(tokens);
  assert(union !== null, 'union should not be null');
  assert(union![0] === 0.01, `x_min should be 0.01 (got ${union![0]})`);
  assert(union![1] === 0.0125, `y_min should be 0.0125 (got ${union![1]})`);
  assert(union![2] === 0.10, `x_max should be 0.10 (got ${union![2]})`);
  assert(union![3] === 0.0625, `y_max should be 0.0625 (got ${union![3]})`);

  // Empty tokens → null
  const emptyUnion = bboxUnion([]);
  assert(emptyUnion === null, 'empty tokens → null bbox');
}

function test5_ConfidenceAggregation() {
  console.log('\nTest 5: Confidence aggregation (area-weighted)');

  // Two tokens: one large (area 0.01), one small (area 0.001)
  const tokens: NormalizedToken[] = [
    { token_id: 0, text: 'Big', confidence: 0.90, bbox_px: [0, 0, 100, 100], bbox_norm: [0.0, 0.0, 0.1, 0.1], source_region_index: -1, page_side: 'full' },
    { token_id: 1, text: 'Small', confidence: 0.50, bbox_px: [200, 200, 210, 210], bbox_norm: [0.20, 0.20, 0.21, 0.21], source_region_index: -1, page_side: 'full' },
  ];

  const conf = aggregateConfidence(tokens);
  assert(conf !== null, 'confidence should not be null');
  // Area of Big: 0.1*0.1=0.01, Small: 0.01*0.01=0.0001
  // Weighted: (0.90*0.01 + 0.50*0.0001) / (0.01+0.0001) = 0.00905/0.0101 ≈ 0.896
  assert(conf! > 0.85 && conf! < 0.95, `weighted confidence should be ~0.896 (got ${conf})`);

  // All null confidences → null
  const nullTokens: NormalizedToken[] = [
    { token_id: 0, text: 'X', confidence: null, bbox_px: [0, 0, 10, 10], bbox_norm: [0, 0, 0.01, 0.01], source_region_index: -1, page_side: 'full' },
  ];
  assert(aggregateConfidence(nullTokens) === null, 'all null confidence → null');
}

function test6_OrphanTokens() {
  console.log('\nTest 6: Tokens outside any cell bbox are counted as orphans');

  const tokens: NormalizedToken[] = [
    // Inside cell bbox
    { token_id: 0, text: 'Inside', confidence: 0.9, bbox_px: [30, 120, 60, 150], bbox_norm: [0.03, 0.15, 0.06, 0.1875], source_region_index: -1, page_side: 'full' },
    // Outside any cell bbox (far right)
    { token_id: 1, text: 'Orphan', confidence: 0.8, bbox_px: [900, 500, 950, 530], bbox_norm: [0.90, 0.625, 0.95, 0.6625], source_region_index: -1, page_side: 'full' },
  ];

  const tableExtraction = makeTableExtraction([
    { row_index: 0, column_key: 'col_a', content: 'Header' },
    { row_index: 1, column_key: 'col_a', content: 'Inside', bbox: [0.02, 0.14, 0.08, 0.20] },
  ], { col_a: [0.00, 0.10] });

  const result = buildTableProvenance(tokens, tableExtraction);

  assert(result.token_orphans_count === 1, `should have 1 orphan (got ${result.token_orphans_count})`);
}

function test7_EmptyInputs() {
  console.log('\nTest 7: Empty/null inputs handled gracefully');

  // Empty vision JSON
  const emptyResult = normalizeTokens({ pages: [{ width: 100, height: 100, blocks: [] }] });
  assert(emptyResult.tokens.length === 0, 'empty vision → 0 tokens');

  // Empty table provenance
  const emptyProv = buildTableProvenance([], {
    page_dimensions: { width: 100, height: 100 },
    tables: [],
    column_bands: {},
  });
  assert(emptyProv.cells.length === 0, 'empty table → 0 cells');
  assert(emptyProv.cell_coverage_rate === 0, 'empty → 0 coverage');

  // Empty record candidates provenance
  const emptyCandProv = buildRecordCandidatesProvenance(emptyProv, {
    candidates: [],
    columnMapping: {},
  });
  assert(emptyCandProv.fields.length === 0, 'empty candidates → 0 fields');
  assert(emptyCandProv.field_coverage_rate === 0, 'empty → 0 field coverage');
}

function test8_ProvenanceBundleIntegrity() {
  console.log('\nTest 8: Provenance bundles only reference existing token_ids');

  const tokens: NormalizedToken[] = [
    { token_id: 0, text: 'A', confidence: 0.9, bbox_px: [30, 120, 60, 150], bbox_norm: [0.03, 0.15, 0.06, 0.1875], source_region_index: -1, page_side: 'full' },
    { token_id: 1, text: 'B', confidence: 0.8, bbox_px: [110, 120, 200, 150], bbox_norm: [0.11, 0.15, 0.20, 0.1875], source_region_index: -1, page_side: 'full' },
  ];
  const tokenIdSet = new Set(tokens.map(t => t.token_id));

  const tableExtraction = makeTableExtraction([
    { row_index: 0, column_key: 'col_a', content: 'H1' },
    { row_index: 0, column_key: 'col_b', content: 'H2' },
    { row_index: 1, column_key: 'col_a', content: 'A', bbox: [0.02, 0.14, 0.08, 0.20] },
    { row_index: 1, column_key: 'col_b', content: 'B', bbox: [0.10, 0.14, 0.22, 0.20] },
  ], { col_a: [0.00, 0.10], col_b: [0.10, 0.25] });

  const result = buildTableProvenance(tokens, tableExtraction);

  // Every token_id in provenance bundles must exist in the token set
  let allValid = true;
  for (const cell of result.cells) {
    for (const tid of cell.provenance.token_ids) {
      if (!tokenIdSet.has(tid)) {
        allValid = false;
        console.error(`    Invalid token_id ${tid} in cell ${cell.row_index}:${cell.column_key}`);
      }
    }
  }
  assert(allValid, 'all token_ids in provenance bundles exist in normalized tokens');

  // Bbox unions should be clamped within [0..1]
  for (const cell of result.cells) {
    if (cell.provenance.bbox_union) {
      const [x0, y0, x1, y1] = cell.provenance.bbox_union;
      assert(x0 >= 0 && x0 <= 1, `bbox x0 in bounds (got ${x0})`);
      assert(y0 >= 0 && y0 <= 1, `bbox y0 in bounds (got ${y0})`);
      assert(x1 >= 0 && x1 <= 1, `bbox x1 in bounds (got ${x1})`);
      assert(y1 >= 0 && y1 <= 1, `bbox y1 in bounds (got ${y1})`);
    }
  }
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Provenance & Alignment Tests ===');

  test1_TokenNormalization();
  test2_TableProvenanceAssignment();
  test3_RecordCandidateProvenance();
  test4_BboxUnionCorrect();
  test5_ConfidenceAggregation();
  test6_OrphanTokens();
  test7_EmptyInputs();
  test8_ProvenanceBundleIntegrity();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
