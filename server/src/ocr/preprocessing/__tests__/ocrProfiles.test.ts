#!/usr/bin/env npx tsx
/**
 * OCR Profiles Tests — Phase 2.2
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/ocrProfiles.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import { selectRegionProfiles, getProfile, getProfileNames } from '../ocrProfiles';
import type { OcrRegion } from '../ocrPlan';

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

// ── Region generators ────────────────────────────────────────────────────────

function makeRegion(index: number, box: { x: number; y: number; w: number; h: number }, imageW = 800, imageH = 600): OcrRegion {
  const imageArea = imageW * imageH;
  return {
    index,
    box,
    boxNorm: {
      x: box.x / imageW,
      y: box.y / imageH,
      w: box.w / imageW,
      h: box.h / imageH,
    },
    areaFrac: (box.w * box.h) / imageArea,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

function test1_RecordTypeMapping() {
  console.log('\nTest 1: Known record type → ledger_table for all regions');

  // Two regions of different sizes, both should get ledger_table due to record type
  const regions: OcrRegion[] = [
    makeRegion(0, { x: 10, y: 10, w: 600, h: 400 }),  // large
    makeRegion(1, { x: 650, y: 10, w: 100, h: 50 }),   // small
  ];

  const result = selectRegionProfiles(regions, { recordType: 'baptism' });

  assert(result.method === 'region_profile_selector_v1', `method correct (got ${result.method})`);
  assert(result.regions.length === 2, `2 assignments (got ${result.regions.length})`);
  assert(result.regions[0].profile === 'ledger_table', `region 0 = ledger_table (got ${result.regions[0].profile})`);
  assert(result.regions[1].profile === 'ledger_table', `region 1 = ledger_table (got ${result.regions[1].profile})`);
  assert(result.regions[0].selectionReason.includes('record_type:baptism'), `reason includes record_type (got ${result.regions[0].selectionReason})`);
  assert(result.reasons.some(r => r.includes('RECORD_TYPE_MATCH:baptism')), `reasons include RECORD_TYPE_MATCH (got ${result.reasons})`);

  // Verify fallback is enabled for ledger_table
  assert(result.regions[0].fallback.enabled === true, `fallback enabled for ledger_table`);
  assert(result.regions[0].fallback.alternateHints.length > 0, `alternate hints present`);
}

function test2_LayoutTemplateMapping() {
  console.log('\nTest 2: Layout template ID → ledger_table');

  const regions: OcrRegion[] = [
    makeRegion(0, { x: 10, y: 10, w: 400, h: 300 }),
  ];

  const result = selectRegionProfiles(regions, { layoutTemplateId: 42 });

  assert(result.regions[0].profile === 'ledger_table', `region 0 = ledger_table (got ${result.regions[0].profile})`);
  assert(result.regions[0].selectionReason.includes('layout_template:42'), `reason includes layout_template (got ${result.regions[0].selectionReason})`);
  assert(result.reasons.some(r => r.includes('LAYOUT_TEMPLATE:42')), `reasons include LAYOUT_TEMPLATE`);
}

function test3_GeometryInference() {
  console.log('\nTest 3: Geometry-based inference (no record type, no template)');

  // Large wide region → ledger_table (areaFrac > 15%, aspect > 0.8)
  // Small region → narrative_block (areaFrac < 8%)
  // Medium region → unknown
  const regions: OcrRegion[] = [
    makeRegion(0, { x: 10, y: 10, w: 700, h: 400 }),   // 700*400 / 480000 = 58.3%, aspect=1.75 → ledger_table
    makeRegion(1, { x: 10, y: 450, w: 100, h: 30 }),    // 100*30  / 480000 = 0.6%  → narrative_block
    makeRegion(2, { x: 200, y: 450, w: 250, h: 120 }),   // 250*120 / 480000 = 6.25% → narrative_block (< 8%)
  ];

  const result = selectRegionProfiles(regions);

  assert(result.regions[0].profile === 'ledger_table', `large wide region = ledger_table (got ${result.regions[0].profile})`);
  assert(result.regions[0].selectionReason.includes('geometry:large_dense'), `reason = large_dense (got ${result.regions[0].selectionReason})`);
  assert(result.regions[1].profile === 'narrative_block', `small region = narrative_block (got ${result.regions[1].profile})`);
  assert(result.regions[1].selectionReason.includes('geometry:small_sparse'), `reason = small_sparse (got ${result.regions[1].selectionReason})`);
  assert(result.regions[2].profile === 'narrative_block', `medium small region = narrative_block (got ${result.regions[2].profile})`);
}

function test4_GeometryAmbiguous() {
  console.log('\nTest 4: Ambiguous geometry → unknown profile');

  // Region with 10% area, wide → between thresholds
  const regions: OcrRegion[] = [
    makeRegion(0, { x: 10, y: 10, w: 300, h: 150 }),   // 300*150 / 480000 = 9.4%, aspect=2.0 → unknown (between 8% and 15%)
  ];

  const result = selectRegionProfiles(regions);

  assert(result.regions[0].profile === 'unknown', `ambiguous region = unknown (got ${result.regions[0].profile})`);
  assert(result.regions[0].selectionReason.includes('geometry:ambiguous'), `reason = ambiguous (got ${result.regions[0].selectionReason})`);
  // Unknown has no retry
  assert(result.regions[0].fallback.enabled === false, `unknown profile has no fallback`);
}

function test5_FallbackDecision() {
  console.log('\nTest 5: Fallback/retry decision verification');

  // Verify that profiles with retry_policy='one_retry_with_alternate_hints' have fallback.enabled=true
  // and profiles with retry_policy='none' have fallback.enabled=false

  const ledger = getProfile('ledger_table');
  assert(ledger.retryPolicy === 'one_retry_with_alternate_hints', `ledger_table has retry policy`);
  assert(ledger.alternateHints.length > 0, `ledger_table has alternate hints`);

  const narrative = getProfile('narrative_block');
  assert(narrative.retryPolicy === 'one_retry_with_alternate_hints', `narrative_block has retry policy`);
  assert(narrative.alternateHints.length > 0, `narrative_block has alternate hints`);

  const unknown = getProfile('unknown');
  assert(unknown.retryPolicy === 'none', `unknown has no retry policy`);
  assert(unknown.alternateHints.length === 0, `unknown has no alternate hints`);

  // Non-existent profile falls back to unknown
  const nonexistent = getProfile('does_not_exist');
  assert(nonexistent.name === 'unknown', `nonexistent profile falls back to unknown`);
}

function test6_ProfileLanguageHints() {
  console.log('\nTest 6: Profile language hints differ by profile');

  const ledger = getProfile('ledger_table');
  const narrative = getProfile('narrative_block');

  // ledger_table: English-first (tabular data often has Latin numerals/headers)
  assert(ledger.languageHints[0] === 'en', `ledger_table starts with en (got ${ledger.languageHints[0]})`);
  // narrative_block: Greek-first (handwritten narrative text)
  assert(narrative.languageHints[0] === 'el', `narrative_block starts with el (got ${narrative.languageHints[0]})`);
  // Both use DOCUMENT_TEXT_DETECTION
  assert(ledger.visionFeature === 'DOCUMENT_TEXT_DETECTION', `ledger uses DOCUMENT_TEXT_DETECTION`);
  assert(narrative.visionFeature === 'DOCUMENT_TEXT_DETECTION', `narrative uses DOCUMENT_TEXT_DETECTION`);
}

function test7_ThresholdsInResult() {
  console.log('\nTest 7: Custom retry threshold in result');

  const regions: OcrRegion[] = [
    makeRegion(0, { x: 10, y: 10, w: 400, h: 300 }),
  ];

  const result = selectRegionProfiles(regions, { retryConfidenceThreshold: 0.55 });

  assert(result.thresholds.retryConfidenceThreshold === 0.55, `custom threshold preserved (got ${result.thresholds.retryConfidenceThreshold})`);
  assert(result.thresholds.denseLargeAreaFrac === 0.15, `default denseLargeAreaFrac preserved`);
}

function test8_AllProfilesExist() {
  console.log('\nTest 8: All expected profiles exist');

  const names = getProfileNames();
  assert(names.includes('ledger_table'), 'ledger_table exists');
  assert(names.includes('narrative_block'), 'narrative_block exists');
  assert(names.includes('unknown'), 'unknown exists');
  assert(names.length === 3, `exactly 3 profiles (got ${names.length})`);
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== OCR Profiles Tests ===');

  test1_RecordTypeMapping();
  test2_LayoutTemplateMapping();
  test3_GeometryInference();
  test4_GeometryAmbiguous();
  test5_FallbackDecision();
  test6_ProfileLanguageHints();
  test7_ThresholdsInResult();
  test8_AllProfilesExist();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
