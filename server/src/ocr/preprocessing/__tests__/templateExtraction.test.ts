#!/usr/bin/env npx tsx
/**
 * Template-Locked Table Extraction Tests — Phase 3.1
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/templateExtraction.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import {
  extractTokens,
  clusterRows,
  extractWithTemplate,
  selectTemplate,
  resolveTemplate,
  templateFromExtractorRow,
  getBuiltinTemplate,
  getBuiltinTemplates,
} from '../templateSpec';
import type { TemplateSpec, WordToken } from '../templateSpec';

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

/** Build a mock Vision JSON page with given tokens. */
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

/** Simple baptism template for testing. */
function makeTestTemplate(): TemplateSpec {
  return {
    templateId: 'test_template',
    name: 'Test Template',
    recordType: 'baptism',
    headerCutNorm: 0.10,
    columns: [
      { key: 'number', x0Norm: 0.00, x1Norm: 0.10, required: true },
      { key: 'date', x0Norm: 0.10, x1Norm: 0.25, required: true },
      { key: 'name', x0Norm: 0.25, x1Norm: 0.60, required: true },
      { key: 'notes', x0Norm: 0.60, x1Norm: 1.00, required: false },
    ],
    rowModel: { mergeGapFrac: 0.6, maxRows: 200 },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

function test1_CorrectColumnAssignment() {
  console.log('\nTest 1: Tokens in known column bands → correct assignment');

  const template = makeTestTemplate();

  // Tokens clearly within their column bands (pageW=1000)
  // Header row at y=40 (cy=0.05, below headerCutNorm=0.10... wait, 40/800=0.05 which is < 0.10, so header)
  // Data rows at y=120+
  const visionJson = makeVisionJson([
    // Header row (y < 0.10*800=80)
    { text: 'No', x0: 20, y0: 30, x1: 60, y1: 55 },
    { text: 'Date', x0: 120, y0: 30, x1: 200, y1: 55 },
    { text: 'Name', x0: 300, y0: 30, x1: 450, y1: 55 },
    { text: 'Notes', x0: 650, y0: 30, x1: 800, y1: 55 },

    // Data row 1 (y=120, cy=120+15=135/800=0.169)
    { text: '1', x0: 30, y0: 120, x1: 60, y1: 150 },
    { text: '1899-05-10', x0: 110, y0: 120, x1: 220, y1: 150 },
    { text: 'John', x0: 270, y0: 120, x1: 400, y1: 150 },
    { text: 'Baptized', x0: 650, y0: 120, x1: 800, y1: 150 },

    // Data row 2 (y=170)
    { text: '2', x0: 30, y0: 170, x1: 60, y1: 200 },
    { text: '1899-05-11', x0: 110, y0: 170, x1: 220, y1: 200 },
    { text: 'Maria', x0: 270, y0: 170, x1: 400, y1: 200 },
    { text: 'Notes here', x0: 650, y0: 170, x1: 850, y1: 200 },
  ], 1000, 800);

  const result = extractWithTemplate(visionJson, template);

  assert(result._template_locked === true, 'should be template locked');
  assert(result._template_id === 'test_template', `template_id should be test_template (got ${result._template_id})`);
  assert(result.data_rows === 2, `should have 2 data rows (got ${result.data_rows})`);
  assert(result.columns_detected === 4, `should detect 4 columns (got ${result.columns_detected})`);
  assert(result.tables.length === 1, `should have 1 table (got ${result.tables.length})`);

  const table = result.tables[0];
  assert(table.has_header_row === true, 'should have header row');
  assert(table.row_count === 3, `row_count should be 3 (header + 2 data) (got ${table.row_count})`);

  // Check header row
  const headerRow = table.rows[0];
  assert(headerRow.type === 'header', 'first row should be header');

  // Check data row 1
  const row1 = table.rows[1];
  assert(row1.type === 'row', 'second row should be data');
  const row1Number = row1.cells.find((c: any) => c.column_key === 'number');
  assert(row1Number?.content === '1', `number cell should be '1' (got '${row1Number?.content}')`);
  const row1Date = row1.cells.find((c: any) => c.column_key === 'date');
  assert(row1Date?.content === '1899-05-10', `date cell should be '1899-05-10' (got '${row1Date?.content}')`);
  const row1Name = row1.cells.find((c: any) => c.column_key === 'name');
  assert(row1Name?.content === 'John', `name cell should be 'John' (got '${row1Name?.content}')`);

  // Check data row 2
  const row2 = table.rows[2];
  const row2Name = row2.cells.find((c: any) => c.column_key === 'name');
  assert(row2Name?.content === 'Maria', `name cell should be 'Maria' (got '${row2Name?.content}')`);

  // column_bands should be present
  assert(result.column_bands['number'] !== undefined, 'column_bands should contain number');
  assert(result.column_bands['date'] !== undefined, 'column_bands should contain date');
}

function test2_AmbiguousTokenTracking() {
  console.log('\nTest 2: Token spanning two column bands → counted as ambiguous');

  const template = makeTestTemplate();

  // Token that straddles the boundary between 'date' (0.10–0.25) and 'name' (0.25–0.60)
  // Token bbox x: 0.20–0.40 (center=0.30, in 'name' band)
  // But max overlap is with 'name' (0.25–0.40=0.15 vs 0.20–0.25=0.05)
  // Center IS in name band, so actually NOT ambiguous by our definition
  // Let's make one where center disagrees with max overlap:
  // Token bbox x: 0.22–0.30 → center=0.26, in 'name' (0.25–0.60)
  //   overlap with date: 0.22–0.25=0.03
  //   overlap with name: 0.25–0.30=0.05
  // center in name, max overlap in name → not ambiguous
  // Need: token where center is NOT in the column with max overlap
  // Token bbox x: 0.08–0.12 → center=0.10, on the boundary
  //   overlap with number (0.00–0.10): 0.08–0.10=0.02
  //   overlap with date (0.10–0.25): 0.10–0.12=0.02
  // Equal overlap, center exactly at boundary... let's be clearer:
  // Token bbox x: 0.07–0.14 → center=0.105, in date band (0.10–0.25)
  //   overlap with number (0.00–0.10): 0.07–0.10=0.03
  //   overlap with date (0.10–0.25): 0.10–0.14=0.04
  // center in date, max overlap in date → not ambiguous
  // Need: center in col A, but more overlap in col B
  // Token bbox x: 0.06–0.14 → center=0.10 (exactly at boundary, let's say in date)
  //   overlap with number: 0.06–0.10=0.04
  //   overlap with date: 0.10–0.14=0.04
  // Actually let's make a clear case:
  // Token bbox x: 0.05–0.18 → center=0.115, in date band (0.10–0.25)
  //   overlap with number: 0.05–0.10=0.05
  //   overlap with date: 0.10–0.18=0.08
  // center in date, max overlap in date → not ambiguous

  // For a genuinely ambiguous case: center outside the best overlap column
  // Token bbox x: 0.02–0.16 → center=0.09, in number band (0.00–0.10)
  //   overlap with number: 0.02–0.10=0.08
  //   overlap with date: 0.10–0.16=0.06
  // center in number, max overlap in number → not ambiguous either

  // The ambiguity check: center NOT in the column that has max overlap
  // Token with center in col A but more surface area in col B:
  // Token bbox x: 0.08–0.22 → center=0.15, in date band
  //   overlap with number: 0.08–0.10=0.02
  //   overlap with date: 0.10–0.22=0.12
  // center in date, max in date → still not ambiguous

  // Let me think differently. The code says: if center is NOT in the bestCol → ambiguous
  // So: a narrow token whose center is outside all columns, but bbox overlaps one.
  // Or: center in col A, but max overlap in col B (which requires wide token crossing boundary
  // where more of its body is in col B but center stays in col A)
  // Token bbox x: 0.06–0.12 → center=0.09, in number (0.00-0.10)
  //   overlap with number: 0.06-0.10=0.04
  //   overlap with date: 0.10-0.12=0.02
  // bestColIdx = number (overlap 0.04 > 0.02), centerInBest? 0.09 is in [0.00, 0.10] → yes → NOT ambiguous

  // To trigger: best overlap in column X, but center NOT in column X
  // Token bbox x: 0.08-0.20 → center=0.14, in date band (0.10-0.25)
  //   overlap with number: 0.08-0.10=0.02
  //   overlap with date: 0.10-0.20=0.10
  // best=date, center in date → not ambiguous

  // The only way: best overlap col != col containing center
  // Token bbox x: 0.05-0.11 → center=0.08, in number
  //   overlap with number: 0.05-0.10=0.05
  //   overlap with date: 0.10-0.11=0.01
  // best=number, center in number → not ambiguous

  // Hmm - it's actually hard to get bestOverlap in a column where center is NOT.
  // Because overlap is proportional to how much of the token is in the column.
  // If center is in col A, typically more than half the token is in col A,
  // so overlap with A > overlap with B.
  // UNLESS: the column is very narrow (doesn't contain half the token).
  // E.g., number column is 0.00–0.10 (width 0.10)
  //   Token bbox: 0.03–0.25 → center=0.14, in date band
  //   overlap with number: 0.03-0.10=0.07
  //   overlap with date: 0.10-0.25=0.15
  //   best=date, center in date → not ambiguous

  // OK, I need: very asymmetric token placement where center barely falls outside the best-overlap column.
  // Token bbox: 0.09–0.11 → center=0.10, exactly at boundary
  //   The check is tokenCx >= x0Norm && tokenCx <= x1Norm
  //   number: 0.00-0.10 → 0.10 >= 0.00 && 0.10 <= 0.10 → YES (in number)
  //   date: 0.10-0.25 → 0.10 >= 0.10 && 0.10 <= 0.25 → YES (in date too!)
  //   overlap with number: 0.09-0.10=0.01
  //   overlap with date: 0.10-0.11=0.01
  //   bestColIdx depends on iteration order — first found wins (number at i=0)
  //   center in number: yes → not ambiguous

  // Let me just place a token completely between columns (in a gap).
  // But our template has no gaps (they're contiguous).
  // Let me use a template with a gap:
  const gappedTemplate: TemplateSpec = {
    templateId: 'gapped_test',
    name: 'Gapped Template',
    recordType: 'test',
    headerCutNorm: 0.05,
    columns: [
      { key: 'col_a', x0Norm: 0.00, x1Norm: 0.20 },
      { key: 'col_b', x0Norm: 0.40, x1Norm: 0.60 },
      { key: 'col_c', x0Norm: 0.80, x1Norm: 1.00 },
    ],
  };

  // Token in the gap between col_a and col_b:
  // bbox x: 0.18–0.45 → center=0.315 (NOT in any column band)
  //   overlap with col_a: 0.18-0.20=0.02
  //   overlap with col_b: 0.40-0.45=0.05
  //   bestCol=col_b, center NOT in col_b (0.315 not in 0.40-0.60) → AMBIGUOUS!

  const visionJson = makeVisionJson([
    // Data tokens (all below headerCutNorm=0.05 → y >= 0.05*800=40)
    // Normal token in col_a
    { text: 'Alpha', x0: 50, y0: 100, x1: 150, y1: 130 },
    // Ambiguous token spanning gap between col_a and col_b
    { text: 'Straddler', x0: 180, y0: 100, x1: 450, y1: 130 },
    // Normal token in col_c
    { text: 'Charlie', x0: 820, y0: 100, x1: 950, y1: 130 },
  ], 1000, 800);

  const result = extractWithTemplate(visionJson, gappedTemplate);

  assert(result._ambiguous_tokens !== undefined, '_ambiguous_tokens should be defined');
  assert(result._ambiguous_tokens! >= 1, `should have >= 1 ambiguous token (got ${result._ambiguous_tokens})`);
  assert(result._total_assigned_tokens! >= 3, `should have >= 3 assigned tokens (got ${result._total_assigned_tokens})`);

  // The ambiguous token should end up in col_b (best overlap)
  const dataRow = result.tables[0].rows.find((r: any) => r.type === 'row');
  assert(dataRow !== undefined, 'should have a data row');
  const colBCell = dataRow!.cells.find((c: any) => c.column_key === 'col_b');
  assert(colBCell?.content.includes('Straddler'), `col_b should contain Straddler (got '${colBCell?.content}')`);
}

function test3_NoTemplate_FallbackPath() {
  console.log('\nTest 3: No template match → fallback path selected');

  // Unknown record type with no DB extractor
  const match = selectTemplate('unknown_type', null);

  assert(match.selectedTemplateId === null, `selectedTemplateId should be null (got ${match.selectedTemplateId})`);
  assert(match.confidence === 0, `confidence should be 0 (got ${match.confidence})`);
  assert(match.reasons.includes('NO_TEMPLATE_MATCH'), `reasons should include NO_TEMPLATE_MATCH (got ${match.reasons})`);

  const resolved = resolveTemplate(match, null, 'unknown_type');
  assert(resolved === null, 'resolved template should be null for unknown type');
}

function test4_BuiltinTemplateSelection() {
  console.log('\nTest 4: Built-in template selection for known record types');

  // Baptism
  const baptismMatch = selectTemplate('baptism', null);
  assert(baptismMatch.selectedTemplateId === 'baptism_1950_v1', `baptism should select baptism_1950_v1 (got ${baptismMatch.selectedTemplateId})`);
  assert(baptismMatch.confidence === 0.85, `confidence should be 0.85 (got ${baptismMatch.confidence})`);

  // Marriage
  const marriageMatch = selectTemplate('marriage', null);
  assert(marriageMatch.selectedTemplateId === 'marriage_1950_v1', `marriage should select marriage_1950_v1 (got ${marriageMatch.selectedTemplateId})`);

  // Funeral
  const funeralMatch = selectTemplate('funeral', null);
  assert(funeralMatch.selectedTemplateId === 'funeral_1950_v1', `funeral should select funeral_1950_v1 (got ${funeralMatch.selectedTemplateId})`);

  // All built-ins exist
  const all = getBuiltinTemplates();
  assert(all.length === 3, `should have 3 built-in templates (got ${all.length})`);
}

function test5_DBTemplateOverride() {
  console.log('\nTest 5: DB extractor row overrides built-in template');

  const dbRow = {
    id: 42,
    name: 'Custom Baptism',
    record_type: 'baptism',
    column_bands: JSON.stringify({
      'num': [0.00, 0.08],
      'date': [0.08, 0.20],
      'child': [0.20, 0.50],
      'parent': [0.50, 1.00],
    }),
    header_y_threshold: 0.10,
  };

  const match = selectTemplate('baptism', dbRow);
  assert(match.selectedTemplateId === 42, `should select DB template id 42 (got ${match.selectedTemplateId})`);
  assert(match.confidence === 1.0, `DB template confidence should be 1.0 (got ${match.confidence})`);
  assert(match.reasons.some(r => r.startsWith('DB_TEMPLATE:')), `reasons should include DB_TEMPLATE (got ${match.reasons})`);

  const resolved = resolveTemplate(match, dbRow, 'baptism');
  assert(resolved !== null, 'resolved should not be null');
  assert(resolved!.columns.length === 4, `should have 4 columns from DB (got ${resolved!.columns.length})`);
  assert(resolved!.columns[0].key === 'num', `first column key should be 'num' (got '${resolved!.columns[0].key}')`);
}

function test6_TokenExtraction() {
  console.log('\nTest 6: Token extraction from Vision JSON');

  const visionJson = makeVisionJson([
    { text: 'Hello', x0: 100, y0: 100, x1: 200, y1: 130 },
    { text: 'World', x0: 250, y0: 100, x1: 350, y1: 130 },
    { text: '', x0: 400, y0: 100, x1: 450, y1: 130 }, // empty — should be skipped
  ], 1000, 800);

  const tokens = extractTokens(visionJson);
  assert(tokens.length === 2, `should extract 2 non-empty tokens (got ${tokens.length})`);
  assert(tokens[0].text === 'Hello', `first token text should be Hello (got '${tokens[0].text}')`);
  assert(tokens[0].cx > 0 && tokens[0].cx < 1, `cx should be normalized (got ${tokens[0].cx})`);
  assert(tokens[0].cy > 0 && tokens[0].cy < 1, `cy should be normalized (got ${tokens[0].cy})`);
}

function test7_RowClustering() {
  console.log('\nTest 7: Row clustering groups tokens by Y proximity');

  const tokens: WordToken[] = [
    { text: 'A', confidence: 0.9, bbox: [0.1, 0.10, 0.2, 0.14], cx: 0.15, cy: 0.12 },
    { text: 'B', confidence: 0.9, bbox: [0.3, 0.10, 0.4, 0.14], cx: 0.35, cy: 0.12 },
    { text: 'C', confidence: 0.9, bbox: [0.1, 0.30, 0.2, 0.34], cx: 0.15, cy: 0.32 },
    { text: 'D', confidence: 0.9, bbox: [0.3, 0.30, 0.4, 0.34], cx: 0.35, cy: 0.32 },
    { text: 'E', confidence: 0.9, bbox: [0.1, 0.50, 0.2, 0.54], cx: 0.15, cy: 0.52 },
  ];

  const rows = clusterRows(tokens, 0.6);
  assert(rows.length === 3, `should have 3 rows (got ${rows.length})`);
  assert(rows[0].length === 2, `row 1 should have 2 tokens (got ${rows[0].length})`);
  assert(rows[1].length === 2, `row 2 should have 2 tokens (got ${rows[1].length})`);
  assert(rows[2].length === 1, `row 3 should have 1 token (got ${rows[2].length})`);

  // Within each row, tokens should be sorted by X
  assert(rows[0][0].text === 'A', `row 1 first token should be A (got ${rows[0][0].text})`);
  assert(rows[0][1].text === 'B', `row 1 second token should be B (got ${rows[0][1].text})`);
}

function test8_ExtractorRowFormats() {
  console.log('\nTest 8: templateFromExtractorRow handles different band formats');

  // Array format
  const arrayRow = {
    id: 10,
    name: 'Array Format',
    record_type: 'baptism',
    column_bands: JSON.stringify([
      { key: 'a', start: 0.0, end: 0.3 },
      { key: 'b', start: 0.3, end: 0.7 },
      { key: 'c', start: 0.7, end: 1.0 },
    ]),
    header_y_threshold: 0.15,
  };

  const t1 = templateFromExtractorRow(arrayRow);
  assert(t1 !== null, 'should parse array format');
  assert(t1!.columns.length === 3, `should have 3 columns (got ${t1!.columns.length})`);
  assert(t1!.columns[0].key === 'a', `first column key should be 'a' (got '${t1!.columns[0].key}')`);
  assert(t1!.headerCutNorm === 0.15, `headerCutNorm should be 0.15 (got ${t1!.headerCutNorm})`);

  // Object format
  const objRow = {
    id: 11,
    record_type: 'marriage',
    column_bands: JSON.stringify({ num: [0, 0.1], name: [0.1, 0.5], notes: [0.5, 1.0] }),
  };

  const t2 = templateFromExtractorRow(objRow);
  assert(t2 !== null, 'should parse object format');
  assert(t2!.columns.length === 3, `should have 3 columns (got ${t2!.columns.length})`);

  // Null/invalid
  assert(templateFromExtractorRow(null) === null, 'null row → null');
  assert(templateFromExtractorRow({}) === null, 'no column_bands → null');
  assert(templateFromExtractorRow({ column_bands: 'invalid json{' }) === null, 'invalid JSON → null');
}

function test9_EmptyVisionJson() {
  console.log('\nTest 9: Empty Vision JSON → empty extraction');

  const template = makeTestTemplate();
  const result = extractWithTemplate({ pages: [{ width: 1000, height: 800, blocks: [] }] }, template);

  assert(result.data_rows === 0, `should have 0 data rows (got ${result.data_rows})`);
  assert(result.total_tokens === 0, `should have 0 total tokens (got ${result.total_tokens})`);
  assert(result._template_locked === true, 'should still be template locked');
  assert(result.tables[0].rows.length === 1, `should have 1 row (header only) (got ${result.tables[0].rows.length})`);
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Template-Locked Table Extraction Tests ===');

  test1_CorrectColumnAssignment();
  test2_AmbiguousTokenTracking();
  test3_NoTemplate_FallbackPath();
  test4_BuiltinTemplateSelection();
  test5_DBTemplateOverride();
  test6_TokenExtraction();
  test7_RowClustering();
  test8_ExtractorRowFormats();
  test9_EmptyVisionJson();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
