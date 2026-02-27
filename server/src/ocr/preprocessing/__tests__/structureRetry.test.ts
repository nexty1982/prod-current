#!/usr/bin/env npx tsx
/**
 * Structure-Aware OCR Retry Tests — Phase 2.3
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/structureRetry.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import {
  computeStructureScore,
  selectRetryStrategy,
  extractSignals,
  buildRetryPlan,
} from '../structureRetry';
import type { StructureSignals } from '../structureRetry';

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

// ── Mock data generators ─────────────────────────────────────────────────────

/** Good table extraction: 5 rows, 4 cols, mostly filled, dates present. */
function makeGoodTableExtraction() {
  return {
    layout_id: 'generic_table_v1',
    data_rows: 5,
    total_tokens: 400,
    data_tokens: 350,
    columns_detected: 4,
    tables: [{
      table_number: 1,
      column_count: 4,
      row_count: 6,
      rows: [
        {
          row_index: 0,
          type: 'header',
          cells: [
            { column_index: 0, column_key: 'col_1', content: 'Number' },
            { column_index: 1, column_key: 'col_2', content: 'Date' },
            { column_index: 2, column_key: 'col_3', content: 'Name' },
            { column_index: 3, column_key: 'col_4', content: 'Father' },
          ],
        },
        ...Array.from({ length: 5 }, (_, i) => ({
          row_index: i + 1,
          type: 'row',
          cells: [
            { column_index: 0, column_key: 'col_1', content: String(i + 1) },
            { column_index: 1, column_key: 'col_2', content: `1899-05-${10 + i}` },
            { column_index: 2, column_key: 'col_3', content: `Name ${i}` },
            { column_index: 3, column_key: 'col_4', content: `Father ${i}` },
          ],
        })),
      ],
    }],
  };
}

function makeGoodRecordCandidates() {
  return {
    candidates: Array.from({ length: 5 }, (_, i) => ({
      recordType: 'baptism',
      confidence: 0.85,
      fields: {
        child_name: `Name ${i}`,
        date_of_birth: `1899-05-${10 + i}`,
        father_name: `Father ${i}`,
      },
      sourceRowIndex: i + 1,
      needsReview: false,
    })),
    detectedType: 'baptism',
    typeConfidence: 0.9,
    columnMapping: { col_1: 'number', col_2: 'date_of_birth', col_3: 'child_name', col_4: 'father_name' },
    unmappedColumns: [],
  };
}

/** Bad table: 0 data rows, header only, all cells empty. */
function makeEmptyTableExtraction() {
  return {
    layout_id: 'generic_table_v1',
    data_rows: 0,
    total_tokens: 50,
    data_tokens: 0,
    columns_detected: 4,
    tables: [{
      table_number: 1,
      column_count: 4,
      row_count: 1,
      rows: [
        {
          row_index: 0,
          type: 'header',
          cells: [
            { column_index: 0, column_key: 'col_1', content: 'Number' },
            { column_index: 1, column_key: 'col_2', content: 'Date' },
            { column_index: 2, column_key: 'col_3', content: 'Name' },
            { column_index: 3, column_key: 'col_4', content: 'Father' },
          ],
        },
      ],
    }],
  };
}

/** Partial table: some rows but most cells empty, low density. */
function makePartialTableExtraction() {
  return {
    layout_id: 'generic_table_v1',
    data_rows: 3,
    total_tokens: 120,
    data_tokens: 30,
    columns_detected: 4,
    tables: [{
      table_number: 1,
      column_count: 4,
      row_count: 4,
      rows: [
        {
          row_index: 0,
          type: 'header',
          cells: [
            { column_index: 0, column_key: 'col_1', content: 'Number' },
            { column_index: 1, column_key: 'col_2', content: 'Date' },
            { column_index: 2, column_key: 'col_3', content: 'Name' },
            { column_index: 3, column_key: 'col_4', content: 'Father' },
          ],
        },
        {
          row_index: 1,
          type: 'row',
          cells: [
            { column_index: 0, column_key: 'col_1', content: '1' },
            { column_index: 1, column_key: 'col_2', content: '' },
            { column_index: 2, column_key: 'col_3', content: 'Jo' },
            { column_index: 3, column_key: 'col_4', content: '' },
          ],
        },
        {
          row_index: 2,
          type: 'row',
          cells: [
            { column_index: 0, column_key: 'col_1', content: '' },
            { column_index: 1, column_key: 'col_2', content: '' },
            { column_index: 2, column_key: 'col_3', content: '' },
            { column_index: 3, column_key: 'col_4', content: '' },
          ],
        },
        {
          row_index: 3,
          type: 'row',
          cells: [
            { column_index: 0, column_key: 'col_1', content: '3' },
            { column_index: 1, column_key: 'col_2', content: '' },
            { column_index: 2, column_key: 'col_3', content: '' },
            { column_index: 3, column_key: 'col_4', content: '' },
          ],
        },
      ],
    }],
  };
}

/** "Improved" retry result: more rows, better fill. */
function makeImprovedTableExtraction() {
  return {
    layout_id: 'generic_table_v1',
    data_rows: 4,
    total_tokens: 300,
    data_tokens: 250,
    columns_detected: 4,
    tables: [{
      table_number: 1,
      column_count: 4,
      row_count: 5,
      rows: [
        {
          row_index: 0,
          type: 'header',
          cells: [
            { column_index: 0, column_key: 'col_1', content: 'Number' },
            { column_index: 1, column_key: 'col_2', content: 'Date' },
            { column_index: 2, column_key: 'col_3', content: 'Name' },
            { column_index: 3, column_key: 'col_4', content: 'Father' },
          ],
        },
        ...Array.from({ length: 4 }, (_, i) => ({
          row_index: i + 1,
          type: 'row',
          cells: [
            { column_index: 0, column_key: 'col_1', content: String(i + 1) },
            { column_index: 1, column_key: 'col_2', content: `1899-06-${10 + i}` },
            { column_index: 2, column_key: 'col_3', content: `Person ${i}` },
            { column_index: 3, column_key: 'col_4', content: `Dad ${i}` },
          ],
        })),
      ],
    }],
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

function test1_GoodStructure() {
  console.log('\nTest 1: Good structure → high score, no retry');

  const signals = extractSignals(makeGoodTableExtraction(), makeGoodRecordCandidates());
  const assessment = computeStructureScore(signals);

  assert(assessment.structureScore >= 0.85, `score should be >= 0.85 (got ${assessment.structureScore})`);
  assert(assessment.reasons.includes('STRUCTURE_OK'), `reasons should include STRUCTURE_OK (got ${assessment.reasons})`);
  assert(signals.dataRowCount === 5, `dataRowCount should be 5 (got ${signals.dataRowCount})`);
  assert(signals.cellFillRate === 1.0, `cellFillRate should be 1.0 (got ${signals.cellFillRate})`);
  assert(signals.tokenDensity > 10, `tokenDensity should be > 10 (got ${signals.tokenDensity.toFixed(1)})`);

  const retry = selectRetryStrategy(assessment);
  assert(retry.shouldRetry === false, `shouldRetry should be false (got ${retry.shouldRetry})`);
  assert(retry.strategy === 'NONE', `strategy should be NONE (got ${retry.strategy})`);
}

function test2_EmptyCells_ShouldRetry() {
  console.log('\nTest 2: Empty cells / header only → should retry with DROP_HEADER_STRIP');

  const signals = extractSignals(makeEmptyTableExtraction(), null);
  const assessment = computeStructureScore(signals);

  assert(assessment.structureScore < 0.65, `score should be < 0.65 (got ${assessment.structureScore})`);
  assert(assessment.reasons.includes('NO_DATA_ROWS'), `reasons should include NO_DATA_ROWS (got ${assessment.reasons})`);

  const retry = selectRetryStrategy(assessment);
  assert(retry.shouldRetry === true, `shouldRetry should be true (got ${retry.shouldRetry})`);
  assert(
    retry.strategy === 'DROP_HEADER_STRIP' || retry.strategy === 'ALT_HINTS',
    `strategy should be DROP_HEADER_STRIP or ALT_HINTS (got ${retry.strategy})`
  );
}

function test3_PartialFill_LowScore() {
  console.log('\nTest 3: Partial fill, low density → low score, retry ALT_HINTS');

  const signals = extractSignals(makePartialTableExtraction(), null);
  const assessment = computeStructureScore(signals);

  assert(assessment.structureScore < 0.65, `score should be < 0.65 (got ${assessment.structureScore})`);
  assert(signals.cellFillRate < 0.30, `cellFillRate should be < 0.30 (got ${signals.cellFillRate.toFixed(2)})`);

  const retry = selectRetryStrategy(assessment);
  assert(retry.shouldRetry === true, `shouldRetry should be true`);
}

function test4_RetryImproves() {
  console.log('\nTest 4: Retry improves structure score → winner = retry');

  const initialPlan = buildRetryPlan(makePartialTableExtraction(), null);
  assert(initialPlan.initial.structureScore < 0.65, `initial score < 0.65 (got ${initialPlan.initial.structureScore})`);
  assert(initialPlan.retry.shouldRetry === true, `shouldRetry should be true`);
  assert(initialPlan.winner === 'initial', `winner starts as initial`);

  // Simulate retry: compute score on improved extraction
  const retrySignals = extractSignals(makeImprovedTableExtraction(), makeGoodRecordCandidates());
  const retryAssessment = computeStructureScore(retrySignals);

  assert(retryAssessment.structureScore > initialPlan.initial.structureScore,
    `retry score (${retryAssessment.structureScore}) should be > initial (${initialPlan.initial.structureScore})`);

  // Simulate winner selection
  const winner = retryAssessment.structureScore > initialPlan.initial.structureScore ? 'retry' : 'initial';
  assert(winner === 'retry', `winner should be retry (got ${winner})`);
}

function test5_AltHintsAlreadyUsed() {
  console.log('\nTest 5: ALT_HINTS already used → falls back to BINARIZED_INPUT or NONE');

  const signals = extractSignals(makePartialTableExtraction(), null);
  const assessment = computeStructureScore(signals);

  // altHintsAlreadyUsed=true, binarizedInputAvailable=false → NONE
  const retry1 = selectRetryStrategy(assessment, {
    altHintsAlreadyUsed: true,
    binarizedInputAvailable: false,
  });
  assert(retry1.strategy === 'NONE' || retry1.strategy === 'DROP_HEADER_STRIP',
    `strategy should be NONE or DROP_HEADER_STRIP when no options (got ${retry1.strategy})`);

  // altHintsAlreadyUsed=true, binarizedInputAvailable=true → BINARIZED_INPUT
  const retry2 = selectRetryStrategy(assessment, {
    altHintsAlreadyUsed: true,
    binarizedInputAvailable: true,
  });
  // Could be DROP_HEADER_STRIP (higher priority) or BINARIZED_INPUT
  assert(retry2.shouldRetry === true, `shouldRetry should be true with binarized available`);
}

function test6_NullInputs() {
  console.log('\nTest 6: Null/missing inputs → graceful handling');

  const signals = extractSignals(null, null);
  assert(signals.dataRowCount === 0, `dataRowCount should be 0 for null input`);
  assert(signals.cellFillRate === 0, `cellFillRate should be 0 for null input`);
  assert(signals.dateFieldRate === -1, `dateFieldRate should be -1 for null input`);

  const assessment = computeStructureScore(signals);
  assert(assessment.structureScore <= 0.30, `score should be <= 0.30 for null (got ${assessment.structureScore})`);
}

function test7_DateFieldDetection() {
  console.log('\nTest 7: Date field detection works');

  const table = makeGoodTableExtraction();
  const candidates = makeGoodRecordCandidates();
  const signals = extractSignals(table, candidates);

  assert(signals.dateFieldRate > 0, `dateFieldRate should be > 0 (got ${signals.dateFieldRate})`);
  assert(signals.dateFieldRate === 1.0, `dateFieldRate should be 1.0 (all dates valid) (got ${signals.dateFieldRate})`);
}

function test8_BuildRetryPlan() {
  console.log('\nTest 8: buildRetryPlan returns complete plan object');

  const plan = buildRetryPlan(makeGoodTableExtraction(), makeGoodRecordCandidates());

  assert(plan.method === 'structure_gate_retry_v1', `method correct (got ${plan.method})`);
  assert(plan.initial.structureScore >= 0.85, `initial score good (got ${plan.initial.structureScore})`);
  assert(plan.retry.shouldRetry === false, `no retry for good score`);
  assert(plan.winner === 'initial', `winner is initial`);
  assert(plan.final.structureScore === plan.initial.structureScore, `final = initial when no retry`);
}

function test9_HeaderDominance() {
  console.log('\nTest 9: Header-dominant table triggers DROP_HEADER_STRIP');

  const signals: StructureSignals = {
    dataRowCount: 1,
    columnCount: 4,
    cellFillRate: 0.10,
    dateFieldRate: -1,
    tokenDensity: 5,
    headerDominanceRatio: 0.80,
  };

  const assessment = computeStructureScore(signals);
  assert(assessment.reasons.includes('HEADER_DOMINANT'), `reasons should include HEADER_DOMINANT (got ${assessment.reasons})`);
  assert(assessment.structureScore < 0.65, `score should be < 0.65 (got ${assessment.structureScore})`);

  const retry = selectRetryStrategy(assessment);
  assert(retry.shouldRetry === true, `shouldRetry should be true`);
  assert(retry.strategy === 'DROP_HEADER_STRIP', `strategy should be DROP_HEADER_STRIP (got ${retry.strategy})`);
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Structure-Aware OCR Retry Tests ===');

  test1_GoodStructure();
  test2_EmptyCells_ShouldRetry();
  test3_PartialFill_LowScore();
  test4_RetryImproves();
  test5_AltHintsAlreadyUsed();
  test6_NullInputs();
  test7_DateFieldDetection();
  test8_BuildRetryPlan();
  test9_HeaderDominance();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
