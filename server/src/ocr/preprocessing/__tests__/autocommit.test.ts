#!/usr/bin/env npx tsx
/**
 * Auto-Commit v1 Tests — Phase 5.1
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/autocommit.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import {
  isRowAutoCommittable,
  buildAutocommitPlan,
  buildAutocommitResults,
  generateBatchId,
  DEFAULT_THRESHOLDS,
} from '../autocommit';

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

function makeScoringV2(
  rows: Array<{
    candidate_index: number;
    source_row_index?: number;
    row_score: number;
    fields?: Array<{ field_name: string; field_score: number; reasons: string[] }>;
  }>,
) {
  return {
    method: 'scoring_v2',
    rows: rows.map(r => ({
      candidate_index: r.candidate_index,
      source_row_index: r.source_row_index ?? r.candidate_index,
      row_score: r.row_score,
      fields: r.fields ?? [
        { field_name: 'child_name', field_score: 1.0, reasons: ['OK'] },
        { field_name: 'date_of_baptism', field_score: 1.0, reasons: ['OK'] },
        { field_name: 'date_of_birth', field_score: 1.0, reasons: ['OK'] },
      ],
    })),
  };
}

function makeProvenance(
  fields: Array<{ candidate_index: number; field_name: string; token_ids: number[] }>,
) {
  return {
    method: 'record_candidates_provenance_v1',
    fields: fields.map(f => ({
      candidate_index: f.candidate_index,
      field_name: f.field_name,
      provenance: {
        token_ids: f.token_ids,
        bbox_union: [0.1, 0.1, 0.3, 0.3],
        confidence: 0.90,
      },
    })),
  };
}

function makeFullProvenance(candidateIndex: number): ReturnType<typeof makeProvenance> {
  return makeProvenance([
    { candidate_index: candidateIndex, field_name: 'child_name', token_ids: [1, 2] },
    { candidate_index: candidateIndex, field_name: 'date_of_baptism', token_ids: [3] },
    { candidate_index: candidateIndex, field_name: 'date_of_birth', token_ids: [4] },
  ]);
}

// ── Test 1: Eligible row passes all checks ──────────────────────────────────

console.log('\nTest 1: Eligible row passes all checks');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.95 },
  ]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, 0.85, true);

  assert(result.eligible === true, 'Row should be eligible');
  assert(result.rowScore === 0.95, `Row score should be 0.95, got ${result.rowScore}`);
  assert(result.reasons.includes('ELIGIBLE'), 'Reasons should include ELIGIBLE');
  assert(result.candidateIndex === 0, 'candidateIndex should be 0');
}

// ── Test 2: Low row score → ineligible ──────────────────────────────────────

console.log('\nTest 2: Low row score → ineligible');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.80 },
  ]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, 0.85, true);

  assert(result.eligible === false, 'Row should be ineligible');
  assert(result.reasons.some(r => r.startsWith('ROW_SCORE_LOW')), 'Should have ROW_SCORE_LOW reason');
}

// ── Test 3: MISSING_REQUIRED flag → ineligible ──────────────────────────────

console.log('\nTest 3: MISSING_REQUIRED flag → ineligible');
{
  const scoring = makeScoringV2([
    {
      candidate_index: 0,
      row_score: 0.95,
      fields: [
        { field_name: 'child_name', field_score: 0, reasons: ['MISSING_REQUIRED'] },
        { field_name: 'date_of_baptism', field_score: 1.0, reasons: ['OK'] },
        { field_name: 'date_of_birth', field_score: 1.0, reasons: ['OK'] },
      ],
    },
  ]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, 0.85, true);

  assert(result.eligible === false, 'Row should be ineligible');
  assert(
    result.reasons.some(r => r.startsWith('MISSING_REQUIRED')),
    'Should have MISSING_REQUIRED reason',
  );
}

// ── Test 4: DATE_PARSE_FAIL flag → ineligible ───────────────────────────────

console.log('\nTest 4: DATE_PARSE_FAIL flag → ineligible');
{
  const scoring = makeScoringV2([
    {
      candidate_index: 0,
      row_score: 0.95,
      fields: [
        { field_name: 'child_name', field_score: 1.0, reasons: ['OK'] },
        { field_name: 'date_of_baptism', field_score: 0.5, reasons: ['DATE_PARSE_FAIL'] },
        { field_name: 'date_of_birth', field_score: 1.0, reasons: ['OK'] },
      ],
    },
  ]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, 0.85, true);

  assert(result.eligible === false, 'Row should be ineligible');
  assert(
    result.reasons.some(r => r.startsWith('DATE_PARSE_FAIL')),
    'Should have DATE_PARSE_FAIL reason',
  );
}

// ── Test 5: Low provenance coverage → ineligible ────────────────────────────

console.log('\nTest 5: Low provenance coverage → ineligible');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.95 },
  ]);
  // Only 1 of 3 fields has tokens
  const prov = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [1, 2] },
    { candidate_index: 0, field_name: 'date_of_baptism', token_ids: [] },
    { candidate_index: 0, field_name: 'date_of_birth', token_ids: [] },
  ]);
  const result = isRowAutoCommittable(0, scoring, prov, 0.85, true);

  assert(result.eligible === false, 'Row should be ineligible due to low provenance');
  assert(
    result.reasons.some(r => r.startsWith('PROVENANCE_LOW')),
    'Should have PROVENANCE_LOW reason',
  );
}

// ── Test 6: Low structure score → ineligible ────────────────────────────────

console.log('\nTest 6: Low structure score → ineligible');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.95 },
  ]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, 0.50, true);

  assert(result.eligible === false, 'Row should be ineligible due to low structure score');
  assert(
    result.reasons.some(r => r.startsWith('STRUCTURE_SCORE_LOW')),
    'Should have STRUCTURE_SCORE_LOW reason',
  );
}

// ── Test 7: No structure score, no template → ineligible ────────────────────

console.log('\nTest 7: No structure score, no template → ineligible');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.95 },
  ]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, null, false);

  assert(result.eligible === false, 'Row should be ineligible');
  assert(
    result.reasons.some(r => r === 'NO_STRUCTURE_SCORE'),
    'Should have NO_STRUCTURE_SCORE reason',
  );
}

// ── Test 8: No structure score, but template used → eligible ────────────────

console.log('\nTest 8: No structure score, but template used → eligible');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.95 },
  ]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, null, true);

  assert(result.eligible === true, 'Row should be eligible when template used and no structure score');
}

// ── Test 9: No scoring data → ineligible ────────────────────────────────────

console.log('\nTest 9: No scoring data → ineligible');
{
  const scoring = makeScoringV2([]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, 0.85, true);

  assert(result.eligible === false, 'Row should be ineligible');
  assert(result.reasons.includes('NO_SCORING_DATA'), 'Should have NO_SCORING_DATA reason');
  assert(result.sourceRowIndex === -1, 'sourceRowIndex should be -1');
}

// ── Test 10: Custom thresholds ──────────────────────────────────────────────

console.log('\nTest 10: Custom thresholds (lower row score threshold)');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.85 },
  ]);
  const prov = makeFullProvenance(0);
  // With default threshold (0.92), this would fail. With 0.80, it should pass.
  const result = isRowAutoCommittable(0, scoring, prov, 0.85, true, {
    autoCommitRowThreshold: 0.80,
  });

  assert(result.eligible === true, 'Row should be eligible with lowered threshold');
}

// ── Test 11: buildAutocommitPlan — mixed eligible/skipped ───────────────────

console.log('\nTest 11: buildAutocommitPlan with mixed eligible/skipped rows');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.95 },
    { candidate_index: 1, row_score: 0.80 },
    { candidate_index: 2, row_score: 0.96 },
  ]);
  const prov = makeProvenance([
    { candidate_index: 0, field_name: 'child_name', token_ids: [1] },
    { candidate_index: 0, field_name: 'date_of_baptism', token_ids: [2] },
    { candidate_index: 0, field_name: 'date_of_birth', token_ids: [3] },
    { candidate_index: 1, field_name: 'child_name', token_ids: [4] },
    { candidate_index: 1, field_name: 'date_of_baptism', token_ids: [5] },
    { candidate_index: 1, field_name: 'date_of_birth', token_ids: [6] },
    { candidate_index: 2, field_name: 'child_name', token_ids: [7] },
    { candidate_index: 2, field_name: 'date_of_baptism', token_ids: [8] },
    { candidate_index: 2, field_name: 'date_of_birth', token_ids: [9] },
  ]);

  const plan = buildAutocommitPlan(scoring, prov, 0.85, true, { 'scoring_v2.json': 'abc123' });

  assert(plan.method === 'autocommit_v1', 'Method should be autocommit_v1');
  assert(plan.batch_id.length > 0, 'batch_id should be non-empty');
  assert(plan.total_candidates === 3, `total_candidates should be 3, got ${plan.total_candidates}`);
  assert(plan.eligible_count === 2, `eligible_count should be 2, got ${plan.eligible_count}`);
  assert(plan.skipped_count === 1, `skipped_count should be 1, got ${plan.skipped_count}`);
  assert(plan.eligible_rows.length === 2, 'Should have 2 eligible rows');
  assert(plan.skipped_rows.length === 1, 'Should have 1 skipped row');
  assert(plan.skipped_rows[0].candidateIndex === 1, 'Skipped row should be candidate 1');
  assert(plan.template_used === true, 'template_used should be true');
  assert(plan.structure_score === 0.85, 'structure_score should be 0.85');
  assert(plan.thresholds.autoCommitRowThreshold === 0.92, 'Should use default threshold');
}

// ── Test 12: buildAutocommitResults ─────────────────────────────────────────

console.log('\nTest 12: buildAutocommitResults');
{
  const results = buildAutocommitResults('batch-123', 42, 46, [
    { candidateIndex: 0, sourceRowIndex: 0, outcome: 'committed', recordId: 100, recordType: 'baptism', table: 'baptism_records', error: null },
    { candidateIndex: 1, sourceRowIndex: 1, outcome: 'skipped', recordId: null, recordType: null, table: null, error: null },
    { candidateIndex: 2, sourceRowIndex: 2, outcome: 'committed', recordId: 101, recordType: 'baptism', table: 'baptism_records', error: null },
  ]);

  assert(results.method === 'autocommit_v1', 'Method should be autocommit_v1');
  assert(results.batch_id === 'batch-123', 'batch_id should match');
  assert(results.job_id === 42, 'job_id should be 42');
  assert(results.church_id === 46, 'church_id should be 46');
  assert(results.committed_count === 2, `committed_count should be 2, got ${results.committed_count}`);
  assert(results.skipped_count === 1, `skipped_count should be 1, got ${results.skipped_count}`);
  assert(results.error_count === 0, `error_count should be 0, got ${results.error_count}`);
}

// ── Test 13: generateBatchId uniqueness ─────────────────────────────────────

console.log('\nTest 13: generateBatchId produces unique UUIDs');
{
  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) {
    ids.add(generateBatchId());
  }
  assert(ids.size === 100, `Should produce 100 unique IDs, got ${ids.size}`);
}

// ── Test 14: Multiple failure reasons accumulate ────────────────────────────

console.log('\nTest 14: Multiple failure reasons accumulate');
{
  const scoring = makeScoringV2([
    {
      candidate_index: 0,
      row_score: 0.80, // below threshold
      fields: [
        { field_name: 'child_name', field_score: 0, reasons: ['MISSING_REQUIRED'] },
        { field_name: 'date_of_baptism', field_score: 0.5, reasons: ['DATE_PARSE_FAIL'] },
        { field_name: 'date_of_birth', field_score: 1.0, reasons: ['OK'] },
      ],
    },
  ]);
  const prov = makeFullProvenance(0);
  const result = isRowAutoCommittable(0, scoring, prov, 0.50, true);

  assert(result.eligible === false, 'Row should be ineligible');
  assert(result.reasons.length >= 3, `Should have at least 3 reasons, got ${result.reasons.length}: ${result.reasons.join(', ')}`);
  assert(result.reasons.some(r => r.startsWith('ROW_SCORE_LOW')), 'Should include ROW_SCORE_LOW');
  assert(result.reasons.some(r => r.startsWith('MISSING_REQUIRED')), 'Should include MISSING_REQUIRED');
  assert(result.reasons.some(r => r.startsWith('DATE_PARSE_FAIL')), 'Should include DATE_PARSE_FAIL');
}

// ── Test 15: No provenance data, no template → flagged ──────────────────────

console.log('\nTest 15: No provenance data, no template → flagged');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.95 },
  ]);
  const result = isRowAutoCommittable(0, scoring, null, 0.85, false);

  assert(result.eligible === false, 'Row should be ineligible');
  assert(result.reasons.some(r => r === 'NO_PROVENANCE_DATA'), 'Should have NO_PROVENANCE_DATA');
}

// ── Test 16: No provenance data, but template used → eligible ───────────────

console.log('\nTest 16: No provenance data, but template used → eligible');
{
  const scoring = makeScoringV2([
    { candidate_index: 0, row_score: 0.95 },
  ]);
  const result = isRowAutoCommittable(0, scoring, null, 0.85, true);

  assert(result.eligible === true, 'Row should be eligible when template used despite no provenance');
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);

if (failed > 0) {
  console.error('\nSome tests FAILED.');
  process.exit(1);
} else {
  console.log('\nAll tests PASSED.');
  process.exit(0);
}
