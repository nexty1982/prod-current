#!/usr/bin/env npx tsx
/**
 * Rollback v1 Tests — Phase 5.2
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/rollback.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import {
  extractRollbackTargets,
  verifyTargets,
  buildRollbackResult,
} from '../rollback';

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

function makeAutocommitResults(rows: Array<{
  candidateIndex: number;
  outcome: 'committed' | 'skipped' | 'error';
  recordId: number | null;
  table: string | null;
  recordType: string | null;
}>) {
  return {
    method: 'autocommit_v1',
    batch_id: 'test-batch-001',
    job_id: 42,
    church_id: 46,
    rows: rows.map(r => ({
      candidateIndex: r.candidateIndex,
      sourceRowIndex: r.candidateIndex,
      outcome: r.outcome,
      recordId: r.recordId,
      recordType: r.recordType,
      table: r.table,
      error: null,
    })),
    committed_count: rows.filter(r => r.outcome === 'committed').length,
    skipped_count: rows.filter(r => r.outcome === 'skipped').length,
    error_count: rows.filter(r => r.outcome === 'error').length,
    created_at: '2026-02-27T12:00:00Z',
  };
}

// ── Test 1: Extract targets from committed rows only ────────────────────────

console.log('\nTest 1: Extract targets from committed rows only');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 1, outcome: 'skipped', recordId: null, table: null, recordType: null },
    { candidateIndex: 2, outcome: 'committed', recordId: 101, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 3, outcome: 'error', recordId: null, table: null, recordType: null },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-001');

  assert(plan.method === 'autocommit_rollback_v1', 'Method should be autocommit_rollback_v1');
  assert(plan.batch_id === 'test-batch-001', 'batch_id should match');
  assert(plan.total_targets === 2, `Should have 2 targets, got ${plan.total_targets}`);
  assert(plan.targets[0].recordId === 100, 'First target recordId should be 100');
  assert(plan.targets[1].recordId === 101, 'Second target recordId should be 101');
  assert(plan.by_table['baptism_records']?.length === 2, 'baptism_records should have 2 IDs');
}

// ── Test 2: Extract targets from multiple tables ────────────────────────────

console.log('\nTest 2: Extract targets from multiple tables');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 1, outcome: 'committed', recordId: 200, table: 'marriage_records', recordType: 'marriage' },
    { candidateIndex: 2, outcome: 'committed', recordId: 300, table: 'funeral_records', recordType: 'funeral' },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-002');

  assert(plan.total_targets === 3, `Should have 3 targets, got ${plan.total_targets}`);
  assert(Object.keys(plan.by_table).length === 3, 'Should have 3 tables');
  assert(plan.by_table['baptism_records']?.includes(100), 'baptism_records should have ID 100');
  assert(plan.by_table['marriage_records']?.includes(200), 'marriage_records should have ID 200');
  assert(plan.by_table['funeral_records']?.includes(300), 'funeral_records should have ID 300');
}

// ── Test 3: Empty results → no targets ──────────────────────────────────────

console.log('\nTest 3: Empty results yield no targets');
{
  const results = makeAutocommitResults([]);
  const plan = extractRollbackTargets(results, 'test-batch-003');

  assert(plan.total_targets === 0, 'Should have 0 targets');
  assert(Object.keys(plan.by_table).length === 0, 'by_table should be empty');
}

// ── Test 4: All skipped → no targets ────────────────────────────────────────

console.log('\nTest 4: All skipped rows yield no targets');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'skipped', recordId: null, table: null, recordType: null },
    { candidateIndex: 1, outcome: 'skipped', recordId: null, table: null, recordType: null },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-004');
  assert(plan.total_targets === 0, 'Should have 0 targets');
}

// ── Test 5: Dry run — all IDs exist ─────────────────────────────────────────

console.log('\nTest 5: Verify targets — all IDs exist (dry run simulation)');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 1, outcome: 'committed', recordId: 101, table: 'baptism_records', recordType: 'baptism' },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-005');
  const verification = verifyTargets(plan, {
    'baptism_records': [100, 101],
  });

  assert(verification.total_existing === 2, `Should find 2 existing, got ${verification.total_existing}`);
  assert(verification.total_missing === 0, `Should find 0 missing, got ${verification.total_missing}`);
  assert(verification.deleted_counts['baptism_records'] === 2, 'Should delete 2 from baptism_records');
  assert(verification.missing_counts['baptism_records'] === 0, 'Should have 0 missing from baptism_records');
}

// ── Test 6: Dry run — some IDs missing ──────────────────────────────────────

console.log('\nTest 6: Verify targets — some IDs already deleted (missing)');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 1, outcome: 'committed', recordId: 101, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 2, outcome: 'committed', recordId: 102, table: 'baptism_records', recordType: 'baptism' },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-006');
  // Only 100 and 102 still exist; 101 was manually deleted
  const verification = verifyTargets(plan, {
    'baptism_records': [100, 102],
  });

  assert(verification.total_existing === 2, `Should find 2 existing, got ${verification.total_existing}`);
  assert(verification.total_missing === 1, `Should find 1 missing, got ${verification.total_missing}`);
  assert(verification.existing['baptism_records']?.includes(100), '100 should be in existing');
  assert(verification.existing['baptism_records']?.includes(102), '102 should be in existing');
  assert(verification.missing['baptism_records']?.includes(101), '101 should be in missing');
}

// ── Test 7: Dry run — all IDs missing (already rolled back) ─────────────────

console.log('\nTest 7: Verify targets — all IDs missing (idempotent rollback)');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 1, outcome: 'committed', recordId: 101, table: 'baptism_records', recordType: 'baptism' },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-007');
  const verification = verifyTargets(plan, {
    'baptism_records': [], // all gone
  });

  assert(verification.total_existing === 0, 'Should find 0 existing');
  assert(verification.total_missing === 2, 'Should find 2 missing');
}

// ── Test 8: Multi-table verification ────────────────────────────────────────

console.log('\nTest 8: Verify targets across multiple tables');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 1, outcome: 'committed', recordId: 200, table: 'marriage_records', recordType: 'marriage' },
    { candidateIndex: 2, outcome: 'committed', recordId: 300, table: 'funeral_records', recordType: 'funeral' },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-008');
  const verification = verifyTargets(plan, {
    'baptism_records': [100],
    'marriage_records': [],  // missing
    'funeral_records': [300],
  });

  assert(verification.total_existing === 2, `Should find 2 existing, got ${verification.total_existing}`);
  assert(verification.total_missing === 1, `Should find 1 missing, got ${verification.total_missing}`);
  assert(verification.deleted_counts['marriage_records'] === 0, 'marriage_records should have 0 to delete');
  assert(verification.missing_counts['marriage_records'] === 1, 'marriage_records should have 1 missing');
}

// ── Test 9: Build rollback result artifact ──────────────────────────────────

console.log('\nTest 9: Build rollback result artifact');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 1, outcome: 'committed', recordId: 101, table: 'baptism_records', recordType: 'baptism' },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-009');
  const verification = verifyTargets(plan, { 'baptism_records': [100] });
  const result = buildRollbackResult(verification, 'test-batch-009', 42, 46, 'admin@test.com', false);

  assert(result.method === 'autocommit_rollback_v1', 'Method should match');
  assert(result.batch_id === 'test-batch-009', 'batch_id should match');
  assert(result.job_id === 42, 'job_id should be 42');
  assert(result.church_id === 46, 'church_id should be 46');
  assert(result.total_deleted === 1, `total_deleted should be 1, got ${result.total_deleted}`);
  assert(result.total_missing === 1, `total_missing should be 1, got ${result.total_missing}`);
  assert(result.rolled_back_by === 'admin@test.com', 'rolled_back_by should match');
  assert(result.force === false, 'force should be false');
  assert(typeof result.rolled_back_at === 'string', 'rolled_back_at should be a string');
}

// ── Test 10: Null/undefined input safety ────────────────────────────────────

console.log('\nTest 10: Null/undefined autocommit results handled safely');
{
  const plan1 = extractRollbackTargets(null, 'test-batch-010');
  assert(plan1.total_targets === 0, 'null input should yield 0 targets');

  const plan2 = extractRollbackTargets(undefined, 'test-batch-011');
  assert(plan2.total_targets === 0, 'undefined input should yield 0 targets');

  const plan3 = extractRollbackTargets({ rows: null }, 'test-batch-012');
  assert(plan3.total_targets === 0, 'rows=null should yield 0 targets');
}

// ── Test 11: Missing IDs are reported but not fatal ─────────────────────────

console.log('\nTest 11: Missing IDs are reported but verification completes');
{
  const results = makeAutocommitResults([
    { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
    { candidateIndex: 1, outcome: 'committed', recordId: 999, table: 'baptism_records', recordType: 'baptism' },
  ]);

  const plan = extractRollbackTargets(results, 'test-batch-013');
  // Simulate: 999 doesn't exist in DB (manually deleted, or never actually inserted due to edge case)
  const verification = verifyTargets(plan, { 'baptism_records': [100] });

  // Verification should complete without throwing
  assert(verification.total_existing === 1, 'Should report 1 existing');
  assert(verification.total_missing === 1, 'Should report 1 missing');
  assert(verification.missing['baptism_records']?.includes(999), 'Missing should include 999');

  // Building result from partial verification should work fine
  const result = buildRollbackResult(verification, 'test-batch-013', 42, 46, 'admin@test.com', false);
  assert(result.total_deleted === 1, 'Result should show 1 deleted');
  assert(result.total_missing === 1, 'Result should show 1 missing');
}

// ── Test 12: Committed rows with null recordId are excluded ─────────────────

console.log('\nTest 12: Committed rows with null recordId excluded from targets');
{
  const results = {
    method: 'autocommit_v1',
    batch_id: 'test-batch-014',
    rows: [
      { candidateIndex: 0, outcome: 'committed', recordId: 100, table: 'baptism_records', recordType: 'baptism' },
      { candidateIndex: 1, outcome: 'committed', recordId: null, table: 'baptism_records', recordType: 'baptism' },
      { candidateIndex: 2, outcome: 'committed', recordId: 102, table: null, recordType: 'baptism' },
    ],
  };

  const plan = extractRollbackTargets(results, 'test-batch-014');
  assert(plan.total_targets === 1, `Should have 1 valid target, got ${plan.total_targets}`);
  assert(plan.targets[0].recordId === 100, 'Only recordId 100 should be a target');
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
