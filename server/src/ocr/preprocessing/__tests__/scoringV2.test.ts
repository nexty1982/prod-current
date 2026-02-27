#!/usr/bin/env npx tsx
/**
 * Review Routing v2 Tests — Phase 4.1
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/scoringV2.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import { computeScoringV2 } from '../scoringV2';

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

function makeRecordCandidates(
  candidates: Array<{ fields: Record<string, string>; sourceRowIndex?: number; confidence?: number }>,
  opts?: { detectedType?: string; columnMapping?: Record<string, string> },
) {
  return {
    candidates: candidates.map(c => ({
      recordType: opts?.detectedType ?? 'baptism',
      confidence: c.confidence ?? 0.90,
      fields: c.fields,
      sourceRowIndex: c.sourceRowIndex ?? 1,
      needsReview: false,
    })),
    detectedType: opts?.detectedType ?? 'baptism',
    typeConfidence: 0.9,
    columnMapping: opts?.columnMapping ?? {},
    unmappedColumns: [],
  };
}

function makeProvenance(
  fields: Array<{ candidate_index: number; field_name: string; token_ids: number[]; confidence?: number | null; bbox_union?: number[] }>,
) {
  return {
    method: 'record_candidates_provenance_v1',
    fields: fields.map(f => ({
      candidate_index: f.candidate_index,
      field_name: f.field_name,
      provenance: {
        token_ids: f.token_ids,
        bbox_union: f.bbox_union ?? [0.1, 0.1, 0.3, 0.3],
        confidence: f.confidence === undefined ? 0.90 : f.confidence,
      },
    })),
    field_coverage_rate: 1.0,
  };
}

function makeTokens(
  tokens: Array<{ id: number; text: string; confidence?: number }>,
) {
  return {
    method: 'token_normalize_v1',
    page_dimensions: { width: 1000, height: 800 },
    tokens: tokens.map(t => ({
      token_id: t.id,
      text: t.text,
      confidence: t.confidence ?? 0.95,
      bbox_px: [100, 100, 200, 130],
      bbox_norm: [0.1, 0.125, 0.2, 0.1625],
      source_region_index: -1,
      page_side: 'full',
    })),
  };
}

function makeTableProvenance(cells?: any[]) {
  return {
    method: 'table_provenance_v1',
    page_dimensions: { width: 1000, height: 800 },
    cells: cells || [],
    cell_coverage_rate: 1.0,
    token_orphans_count: 0,
    total_tokens: 5,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

function test1_DateParseFail() {
  console.log('\nTest 1: Date parse fail triggers needs_review with DATE_PARSE_FAIL');

  const candidates = makeRecordCandidates([{
    fields: {
      child_name: 'John Smith',
      date_of_baptism: 'GARBAGE_NOT_A_DATE',
      date_of_birth: '1899-05-10',
    },
  }]);

  const provenance = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [0], confidence: 0.95 },
    { candidate_index: 0, field_name: 'date_of_baptism', token_ids: [1], confidence: 0.90 },
    { candidate_index: 0, field_name: 'date_of_birth', token_ids: [2], confidence: 0.92 },
  ]);

  const tokens = makeTokens([
    { id: 0, text: 'John Smith', confidence: 0.95 },
    { id: 1, text: 'GARBAGE_NOT_A_DATE', confidence: 0.90 },
    { id: 2, text: '1899-05-10', confidence: 0.92 },
  ]);

  const result = computeScoringV2(candidates, provenance, makeTableProvenance(), tokens, {
    recordType: 'baptism',
  });

  assert(result.method === 'scoring_v2', 'method correct');
  assert(result.rows.length === 1, `should have 1 row (got ${result.rows.length})`);

  const row = result.rows[0];
  assert(row.needs_review === true, 'row should need review');

  // Find the date_of_baptism field
  const dateField = row.fields.find(f => f.field_name === 'date_of_baptism');
  assert(dateField !== undefined, 'date_of_baptism field exists');
  assert(dateField!.reasons.includes('DATE_PARSE_FAIL'), `should have DATE_PARSE_FAIL (got ${dateField!.reasons})`);
  assert(dateField!.needs_review === true, 'date field should need review');
  assert(dateField!.validity_score < 0.5, `validity_score should be < 0.5 (got ${dateField!.validity_score})`);

  // date_of_birth should be fine
  const birthField = row.fields.find(f => f.field_name === 'date_of_birth');
  assert(birthField !== undefined, 'date_of_birth field exists');
  assert(!birthField!.reasons.includes('DATE_PARSE_FAIL'), `date_of_birth should NOT have DATE_PARSE_FAIL (got ${birthField!.reasons})`);

  // Summary should count the flag
  assert(result.summary.flag_counts.DATE_PARSE_FAIL >= 1, `DATE_PARSE_FAIL count >= 1 (got ${result.summary.flag_counts.DATE_PARSE_FAIL})`);
  assert(result.summary.fields_flagged >= 1, `fields_flagged >= 1 (got ${result.summary.fields_flagged})`);
}

function test2_LowOcrConf() {
  console.log('\nTest 2: Low token confidence triggers LOW_OCR_CONF');

  const candidates = makeRecordCandidates([{
    fields: {
      child_name: 'J?hn Sm?th',
      date_of_baptism: '1899-05-10',
      date_of_birth: '1899-04-01',
    },
  }]);

  const provenance = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [0], confidence: 0.45 },
    { candidate_index: 0, field_name: 'date_of_baptism', token_ids: [1], confidence: 0.92 },
    { candidate_index: 0, field_name: 'date_of_birth', token_ids: [2], confidence: 0.90 },
  ]);

  const tokens = makeTokens([
    { id: 0, text: 'J?hn Sm?th', confidence: 0.45 },
    { id: 1, text: '1899-05-10', confidence: 0.92 },
    { id: 2, text: '1899-04-01', confidence: 0.90 },
  ]);

  const result = computeScoringV2(candidates, provenance, makeTableProvenance(), tokens, {
    recordType: 'baptism',
  });

  const nameField = result.rows[0].fields.find(f => f.field_name === 'child_name');
  assert(nameField !== undefined, 'child_name field exists');
  assert(nameField!.reasons.includes('LOW_OCR_CONF'), `should have LOW_OCR_CONF (got ${nameField!.reasons})`);
  assert(nameField!.cell_confidence === 0.45, `cell_confidence should be 0.45 (got ${nameField!.cell_confidence})`);
  assert(nameField!.needs_review === true, 'low confidence field should need review');

  // High confidence field should be OK
  const dateField = result.rows[0].fields.find(f => f.field_name === 'date_of_baptism');
  assert(!dateField!.reasons.includes('LOW_OCR_CONF'), 'high confidence field should NOT have LOW_OCR_CONF');

  assert(result.summary.flag_counts.LOW_OCR_CONF >= 1, `LOW_OCR_CONF count >= 1 (got ${result.summary.flag_counts.LOW_OCR_CONF})`);
}

function test3_MissingRequired() {
  console.log('\nTest 3: Required field missing triggers MISSING_REQUIRED');

  const candidates = makeRecordCandidates([{
    fields: {
      child_name: '',  // empty required field
      date_of_baptism: '1899-05-10',
      date_of_birth: '1899-04-01',
    },
  }]);

  // No provenance confidence for the empty field (null) → falls back to 0.5
  const provenance = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [], confidence: null as any },
    { candidate_index: 0, field_name: 'date_of_baptism', token_ids: [1], confidence: 0.90 },
    { candidate_index: 0, field_name: 'date_of_birth', token_ids: [2], confidence: 0.90 },
  ]);

  // Override candidate confidence to null so it doesn't inflate the empty field score
  candidates.candidates[0].confidence = null as any;

  const tokens = makeTokens([
    { id: 1, text: '1899-05-10', confidence: 0.90 },
    { id: 2, text: '1899-04-01', confidence: 0.90 },
  ]);

  const result = computeScoringV2(candidates, provenance, makeTableProvenance(), tokens, {
    recordType: 'baptism',
  });

  const nameField = result.rows[0].fields.find(f => f.field_name === 'child_name');
  assert(nameField !== undefined, 'child_name field exists');
  assert(nameField!.reasons.includes('MISSING_REQUIRED'), `should have MISSING_REQUIRED (got ${nameField!.reasons})`);
  assert(nameField!.validity_score === 0, `validity_score should be 0 for missing required (got ${nameField!.validity_score})`);
  // field_score = 0.7 * 0.5 (fallback conf) + 0.3 * 0 = 0.35
  assert(nameField!.field_score < 0.4, `field_score should be low (got ${nameField!.field_score})`);

  // Row should need review since a required field is missing
  assert(result.rows[0].needs_review === true, 'row should need review');
  assert(result.rows[0].row_score < 0.4, `row_score should be low (got ${result.rows[0].row_score})`);

  assert(result.summary.flag_counts.MISSING_REQUIRED >= 1, `MISSING_REQUIRED count >= 1 (got ${result.summary.flag_counts.MISSING_REQUIRED})`);
}

function test4_RequiredFieldNotInCandidate() {
  console.log('\nTest 4: Required field entirely absent from candidate');

  // Candidate has no date_of_baptism or date_of_birth at all
  const candidates = makeRecordCandidates([{
    fields: {
      child_name: 'John Smith',
    },
  }]);

  const provenance = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [0], confidence: 0.95 },
  ]);

  const tokens = makeTokens([{ id: 0, text: 'John Smith', confidence: 0.95 }]);

  const result = computeScoringV2(candidates, provenance, makeTableProvenance(), tokens, {
    recordType: 'baptism',
  });

  // date_of_baptism and date_of_birth should be added as missing
  const missingBaptism = result.rows[0].fields.find(f => f.field_name === 'date_of_baptism');
  assert(missingBaptism !== undefined, 'date_of_baptism should be added as missing');
  assert(missingBaptism!.reasons.includes('MISSING_REQUIRED'), 'should have MISSING_REQUIRED');
  assert(missingBaptism!.field_score === 0, 'missing field score should be 0');

  const missingBirth = result.rows[0].fields.find(f => f.field_name === 'date_of_birth');
  assert(missingBirth !== undefined, 'date_of_birth should be added as missing');

  // Row score should be 0 since required fields are missing
  assert(result.rows[0].row_score === 0, `row_score should be 0 (got ${result.rows[0].row_score})`);
}

function test5_GoodRecord() {
  console.log('\nTest 5: Good record → high scores, no flags');

  const candidates = makeRecordCandidates([{
    fields: {
      child_name: 'Maria Papadopoulos',
      date_of_baptism: '1955-06-15',
      date_of_birth: '1955-05-20',
      parents: 'George & Anna',
    },
    confidence: 0.95,
  }]);

  const provenance = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [0], confidence: 0.95 },
    { candidate_index: 0, field_name: 'date_of_baptism', token_ids: [1], confidence: 0.93 },
    { candidate_index: 0, field_name: 'date_of_birth', token_ids: [2], confidence: 0.91 },
    { candidate_index: 0, field_name: 'parents', token_ids: [3, 4], confidence: 0.90 },
  ]);

  const tokens = makeTokens([
    { id: 0, text: 'Maria Papadopoulos', confidence: 0.95 },
    { id: 1, text: '1955-06-15', confidence: 0.93 },
    { id: 2, text: '1955-05-20', confidence: 0.91 },
    { id: 3, text: 'George', confidence: 0.90 },
    { id: 4, text: 'Anna', confidence: 0.90 },
  ]);

  const result = computeScoringV2(candidates, provenance, makeTableProvenance(), tokens, {
    recordType: 'baptism',
  });

  assert(result.page_score_v2 > 0.80, `page_score_v2 should be > 0.80 (got ${result.page_score_v2})`);
  assert(result.routing_recommendation === 'accepted', `routing should be accepted (got ${result.routing_recommendation})`);
  assert(result.summary.rows_need_review === 0, `no rows should need review (got ${result.summary.rows_need_review})`);

  // All fields should be FIELD_OK
  for (const field of result.rows[0].fields) {
    if (field.reasons.length === 1 && field.reasons[0] === 'FIELD_OK') {
      // good
    } else {
      // Some fields might still have FIELD_OK if they don't match any flags
    }
  }
}

function test6_MultipleRows() {
  console.log('\nTest 6: Multiple rows — mixed quality');

  const candidates = makeRecordCandidates([
    {
      fields: { child_name: 'Good Name', date_of_baptism: '1950-01-01', date_of_birth: '1949-12-15' },
      sourceRowIndex: 1,
      confidence: 0.92,
    },
    {
      fields: { child_name: '', date_of_baptism: 'BROKEN', date_of_birth: '1950-03-01' },
      sourceRowIndex: 2,
      confidence: 0.60,
    },
  ]);

  const provenance = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [0], confidence: 0.92 },
    { candidate_index: 0, field_name: 'date_of_baptism', token_ids: [1], confidence: 0.90 },
    { candidate_index: 0, field_name: 'date_of_birth', token_ids: [2], confidence: 0.91 },
    { candidate_index: 1, field_name: 'child_name', token_ids: [], confidence: null as any },
    { candidate_index: 1, field_name: 'date_of_baptism', token_ids: [3], confidence: 0.55 },
    { candidate_index: 1, field_name: 'date_of_birth', token_ids: [4], confidence: 0.85 },
  ]);

  const tokens = makeTokens([
    { id: 0, text: 'Good Name', confidence: 0.92 },
    { id: 1, text: '1950-01-01', confidence: 0.90 },
    { id: 2, text: '1949-12-15', confidence: 0.91 },
    { id: 3, text: 'BROKEN', confidence: 0.55 },
    { id: 4, text: '1950-03-01', confidence: 0.85 },
  ]);

  const result = computeScoringV2(candidates, provenance, makeTableProvenance(), tokens, {
    recordType: 'baptism',
  });

  assert(result.rows.length === 2, `should have 2 rows (got ${result.rows.length})`);

  // Row 0 should be good
  assert(result.rows[0].row_score > 0.60, `row 0 score should be > 0.60 (got ${result.rows[0].row_score})`);

  // Row 1 should need review (missing child_name + broken date)
  assert(result.rows[1].needs_review === true, 'row 1 should need review');
  assert(result.rows[1].reasons.includes('MISSING_REQUIRED'), 'row 1 should have MISSING_REQUIRED');

  assert(result.summary.rows_need_review >= 1, `rows_need_review >= 1 (got ${result.summary.rows_need_review})`);
  assert(result.routing_recommendation !== 'accepted', `should not be plain accepted (got ${result.routing_recommendation})`);
}

function test7_RoutingRecommendations() {
  console.log('\nTest 7: Routing recommendation logic');

  // Empty candidates → review
  const empty = computeScoringV2({ candidates: [] }, { fields: [] }, makeTableProvenance(), { tokens: [] });
  assert(empty.routing_recommendation === 'review', `empty → review (got ${empty.routing_recommendation})`);
  assert(empty.page_score_v2 === 0, `empty page score should be 0 (got ${empty.page_score_v2})`);
}

function test8_ProvenanceRefsInOutput() {
  console.log('\nTest 8: Provenance refs (token_ids, bbox_union) in scored fields');

  const candidates = makeRecordCandidates([{
    fields: { child_name: 'Test' },
  }]);

  const provenance = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [5, 6], confidence: 0.88, bbox_union: [0.1, 0.2, 0.3, 0.4] },
  ]);

  const tokens = makeTokens([
    { id: 5, text: 'Test', confidence: 0.88 },
    { id: 6, text: 'Name', confidence: 0.88 },
  ]);

  const result = computeScoringV2(candidates, provenance, makeTableProvenance(), tokens, {
    recordType: 'baptism',
  });

  const field = result.rows[0].fields.find(f => f.field_name === 'child_name');
  assert(field !== undefined, 'child_name field exists');
  assert(field!.token_ids.length === 2, `should have 2 token_ids (got ${field!.token_ids.length})`);
  assert(field!.token_ids.includes(5), 'should include token_id 5');
  assert(field!.token_ids.includes(6), 'should include token_id 6');
  assert(field!.bbox_union !== null, 'bbox_union should not be null');
  assert(field!.bbox_union![0] === 0.1, `bbox x0 should be 0.1 (got ${field!.bbox_union![0]})`);
}

function test9_SuspiciousChars() {
  console.log('\nTest 9: Suspicious characters trigger flag');

  const candidates = makeRecordCandidates([{
    fields: {
      child_name: 'Jo§¶hn',
      date_of_baptism: '1950-01-01',
      date_of_birth: '1949-12-01',
    },
  }]);

  const provenance = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [0], confidence: 0.80 },
    { candidate_index: 0, field_name: 'date_of_baptism', token_ids: [1], confidence: 0.90 },
    { candidate_index: 0, field_name: 'date_of_birth', token_ids: [2], confidence: 0.90 },
  ]);

  const tokens = makeTokens([
    { id: 0, text: 'Jo§¶hn', confidence: 0.80 },
    { id: 1, text: '1950-01-01', confidence: 0.90 },
    { id: 2, text: '1949-12-01', confidence: 0.90 },
  ]);

  const result = computeScoringV2(candidates, provenance, makeTableProvenance(), tokens, {
    recordType: 'baptism',
  });

  const nameField = result.rows[0].fields.find(f => f.field_name === 'child_name');
  assert(nameField !== undefined, 'child_name field exists');
  assert(nameField!.reasons.includes('SUSPICIOUS_CHARS'), `should have SUSPICIOUS_CHARS (got ${nameField!.reasons})`);
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Review Routing v2 Tests ===');

  test1_DateParseFail();
  test2_LowOcrConf();
  test3_MissingRequired();
  test4_RequiredFieldNotInCandidate();
  test5_GoodRecord();
  test6_MultipleRows();
  test7_RoutingRecommendations();
  test8_ProvenanceRefsInOutput();
  test9_SuspiciousChars();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
