#!/usr/bin/env npx tsx
/**
 * Correction Log Tests — Phase 6.1
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/correctionLog.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildCorrectionEvent,
  appendCorrection,
  loadCorrections,
  buildCorrectionsSummary,
  correctionLogStats,
} from '../correctionLog';
import type { CorrectionEvent } from '../correctionLog';

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

// ── Test helpers ────────────────────────────────────────────────────────────

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'corr-test-'));
let testCounter = 0;

function tmpLogPath(): string {
  testCounter++;
  return path.join(tmpDir, `test_${testCounter}.jsonl`);
}

function makeEvent(overrides: Partial<Parameters<typeof buildCorrectionEvent>[0]> = {}) {
  return buildCorrectionEvent({
    jobId: 42,
    pageId: 1,
    candidateIndex: 0,
    rowIndex: 0,
    recordType: 'baptism',
    templateId: 'tmpl-001',
    userId: 'admin@test.com',
    fieldName: 'child_name',
    beforeValue: 'Jon',
    afterValue: 'John',
    editSource: 'autosave',
    ...overrides,
  });
}

// ── Test 1: buildCorrectionEvent produces valid event ───────────────────────

console.log('\nTest 1: buildCorrectionEvent produces valid event');
{
  const event = makeEvent();

  assert(typeof event.edit_id === 'string' && event.edit_id.length > 0, 'edit_id should be non-empty UUID');
  assert(event.job_id === 42, 'job_id should be 42');
  assert(event.page_id === 1, 'page_id should be 1');
  assert(event.candidate_index === 0, 'candidate_index should be 0');
  assert(event.record_type === 'baptism', 'record_type should be baptism');
  assert(event.template_id === 'tmpl-001', 'template_id should be tmpl-001');
  assert(event.user_id === 'admin@test.com', 'user_id should match');
  assert(event.field_name === 'child_name', 'field_name should be child_name');
  assert(event.before_value === 'Jon', 'before_value should be Jon');
  assert(event.after_value === 'John', 'after_value should be John');
  assert(event.edit_source === 'autosave', 'edit_source should be autosave');
  assert(typeof event.timestamp === 'string', 'timestamp should be a string');
}

// ── Test 2: Provenance from scoring_v2 field ────────────────────────────────

console.log('\nTest 2: Provenance from scoring_v2 field');
{
  const event = makeEvent({
    scoringField: {
      field_score: 0.85,
      reasons: ['LOW_OCR_CONFIDENCE'],
      token_ids: [1, 2, 3],
      bbox_union: [0.1, 0.2, 0.3, 0.04],
    },
  });

  assert(event.provenance !== null, 'provenance should not be null');
  assert(event.provenance!.token_ids.length === 3, 'Should have 3 token_ids');
  assert(event.provenance!.confidence === 0.85, 'confidence should be 0.85');
  assert(event.provenance!.bbox_union_norm !== null, 'bbox_union_norm should not be null');
  assert(event.was_flagged === true, 'Should be flagged (LOW_OCR_CONFIDENCE)');
  assert(event.flag_reasons.includes('LOW_OCR_CONFIDENCE'), 'Should include LOW_OCR_CONFIDENCE');
}

// ── Test 3: Provenance from provenance field (fallback) ─────────────────────

console.log('\nTest 3: Provenance from provenance field (fallback)');
{
  const event = makeEvent({
    provenanceField: {
      token_ids: [5, 6],
      bbox_union: [0.2, 0.3, 0.1, 0.05],
      confidence: 0.90,
    },
  });

  assert(event.provenance !== null, 'provenance should not be null');
  assert(event.provenance!.token_ids.length === 2, 'Should have 2 token_ids');
  assert(event.provenance!.confidence === 0.90, 'confidence should be 0.90');
}

// ── Test 4: No provenance when no scoring/provenance data ───────────────────

console.log('\nTest 4: No provenance when no scoring/provenance data');
{
  const event = makeEvent({
    scoringField: null,
    provenanceField: null,
  });

  assert(event.provenance === null, 'provenance should be null');
  assert(event.was_flagged === false, 'Should not be flagged');
  assert(event.flag_reasons.length === 0, 'Should have no flag reasons');
}

// ── Test 5: FIELD_OK is not treated as a flag ───────────────────────────────

console.log('\nTest 5: FIELD_OK is not treated as a flag');
{
  const event = makeEvent({
    scoringField: {
      field_score: 0.95,
      reasons: ['FIELD_OK'],
      token_ids: [1],
      bbox_union: [0.1, 0.1, 0.3, 0.3],
    },
  });

  assert(event.was_flagged === false, 'FIELD_OK should not be flagged');
  assert(event.flag_reasons.length === 0, 'No flag reasons for FIELD_OK');
}

// ── Test 6: appendCorrection writes to JSONL ────────────────────────────────

console.log('\nTest 6: appendCorrection writes to JSONL');
{
  const logPath = tmpLogPath();
  const event = makeEvent();

  const written = appendCorrection(logPath, event);
  assert(written === true, 'Should return true for first write');
  assert(fs.existsSync(logPath), 'File should exist');

  const content = fs.readFileSync(logPath, 'utf8').trim();
  const parsed = JSON.parse(content);
  assert(parsed.edit_id === event.edit_id, 'Persisted edit_id should match');
  assert(parsed.field_name === 'child_name', 'Persisted field_name should match');
}

// ── Test 7: appendCorrection deduplicates same value ────────────────────────

console.log('\nTest 7: appendCorrection deduplicates same value');
{
  const logPath = tmpLogPath();
  const event1 = makeEvent({ afterValue: 'John' });
  const event2 = makeEvent({ afterValue: 'John' }); // same after_value

  appendCorrection(logPath, event1);
  const written2 = appendCorrection(logPath, event2);

  assert(written2 === false, 'Second write should be skipped (duplicate)');

  const events = loadCorrections(logPath);
  assert(events.length === 1, `Should have 1 event, got ${events.length}`);
}

// ── Test 8: appendCorrection logs when value changes again ──────────────────

console.log('\nTest 8: appendCorrection logs when value changes again');
{
  const logPath = tmpLogPath();
  const event1 = makeEvent({ afterValue: 'John' });
  const event2 = makeEvent({ afterValue: 'Johnny' }); // different value

  appendCorrection(logPath, event1);
  const written2 = appendCorrection(logPath, event2);

  assert(written2 === true, 'Different value should be logged');

  const events = loadCorrections(logPath);
  assert(events.length === 2, `Should have 2 events, got ${events.length}`);
  assert(events[0].after_value === 'John', 'First event should have John');
  assert(events[1].after_value === 'Johnny', 'Second event should have Johnny');
}

// ── Test 9: Dedup is per (candidate_index, field_name) ──────────────────────

console.log('\nTest 9: Dedup is per (candidate_index, field_name)');
{
  const logPath = tmpLogPath();
  const event1 = makeEvent({ candidateIndex: 0, fieldName: 'child_name', afterValue: 'John' });
  const event2 = makeEvent({ candidateIndex: 0, fieldName: 'father_name', afterValue: 'John' }); // different field
  const event3 = makeEvent({ candidateIndex: 1, fieldName: 'child_name', afterValue: 'John' }); // different candidate

  appendCorrection(logPath, event1);
  const w2 = appendCorrection(logPath, event2);
  const w3 = appendCorrection(logPath, event3);

  assert(w2 === true, 'Different field should be logged');
  assert(w3 === true, 'Different candidate should be logged');

  const events = loadCorrections(logPath);
  assert(events.length === 3, `Should have 3 events, got ${events.length}`);
}

// ── Test 10: loadCorrections from empty/missing file ────────────────────────

console.log('\nTest 10: loadCorrections from empty/missing file');
{
  const events1 = loadCorrections('/tmp/nonexistent_file.jsonl');
  assert(events1.length === 0, 'Missing file should return empty array');

  const emptyPath = tmpLogPath();
  fs.writeFileSync(emptyPath, '');
  const events2 = loadCorrections(emptyPath);
  assert(events2.length === 0, 'Empty file should return empty array');
}

// ── Test 11: loadCorrections skips malformed lines ──────────────────────────

console.log('\nTest 11: loadCorrections skips malformed lines');
{
  const logPath = tmpLogPath();
  const event = makeEvent();
  fs.writeFileSync(logPath, 'not-json\n' + JSON.stringify(event) + '\n{broken\n');

  const events = loadCorrections(logPath);
  assert(events.length === 1, `Should have 1 valid event, got ${events.length}`);
  assert(events[0].edit_id === event.edit_id, 'Valid event should be loaded');
}

// ── Test 12: buildCorrectionsSummary ────────────────────────────────────────

console.log('\nTest 12: buildCorrectionsSummary');
{
  const events: CorrectionEvent[] = [
    makeEvent({ candidateIndex: 0, fieldName: 'child_name', editSource: 'autosave' }),
    makeEvent({ candidateIndex: 0, fieldName: 'father_name', editSource: 'autosave' }),
    makeEvent({ candidateIndex: 1, fieldName: 'child_name', editSource: 'finalize' }),
    makeEvent({
      candidateIndex: 2,
      fieldName: 'date_of_baptism',
      editSource: 'autosave',
      scoringField: { field_score: 0.5, reasons: ['DATE_PARSE_FAIL'], token_ids: [1], bbox_union: [0, 0, 1, 1] },
    }),
  ];
  // Override timestamps for testing
  events[0].timestamp = '2026-02-27T10:00:00Z';
  events[3].timestamp = '2026-02-27T11:00:00Z';

  const summary = buildCorrectionsSummary(42, events);

  assert(summary.job_id === 42, 'job_id should be 42');
  assert(summary.total_events === 4, `total_events should be 4, got ${summary.total_events}`);
  assert(summary.unique_fields_edited === 3, `unique_fields_edited should be 3, got ${summary.unique_fields_edited}`);
  assert(summary.unique_candidates_edited === 3, `unique_candidates_edited should be 3, got ${summary.unique_candidates_edited}`);
  assert(summary.by_field['child_name'] === 2, 'child_name should have 2 events');
  assert(summary.by_source['autosave'] === 3, 'autosave should have 3 events');
  assert(summary.by_source['finalize'] === 1, 'finalize should have 1 event');
  assert(summary.flagged_corrections === 1, `flagged_corrections should be 1, got ${summary.flagged_corrections}`);
  assert(summary.first_event_at === '2026-02-27T10:00:00Z', 'first_event_at should match');
  assert(summary.last_event_at === '2026-02-27T11:00:00Z', 'last_event_at should match');
}

// ── Test 13: correctionLogStats ─────────────────────────────────────────────

console.log('\nTest 13: correctionLogStats');
{
  const logPath = tmpLogPath();
  const event = makeEvent();
  appendCorrection(logPath, event);

  const stats = correctionLogStats(logPath);
  assert(stats !== null, 'Stats should not be null');
  assert(typeof stats!.sha256 === 'string' && stats!.sha256.length === 64, 'sha256 should be 64 hex chars');
  assert(stats!.bytes > 0, 'bytes should be > 0');

  const missingStats = correctionLogStats('/tmp/nonexistent.jsonl');
  assert(missingStats === null, 'Missing file should return null');
}

// ── Test 14: Unique edit_id per event ───────────────────────────────────────

console.log('\nTest 14: Unique edit_id per event');
{
  const ids = new Set<string>();
  for (let i = 0; i < 50; i++) {
    ids.add(makeEvent().edit_id);
  }
  assert(ids.size === 50, `Should produce 50 unique edit_ids, got ${ids.size}`);
}

// ── Test 15: Empty summary for no events ────────────────────────────────────

console.log('\nTest 15: Empty summary for no events');
{
  const summary = buildCorrectionsSummary(99, []);
  assert(summary.total_events === 0, 'total_events should be 0');
  assert(summary.first_event_at === null, 'first_event_at should be null');
  assert(summary.last_event_at === null, 'last_event_at should be null');
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

try {
  fs.rmSync(tmpDir, { recursive: true });
} catch (_) {}

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
