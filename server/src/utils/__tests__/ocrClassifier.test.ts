#!/usr/bin/env npx tsx
/**
 * OCR Record Type Classifier Tests
 *
 * Run:  npx tsx server/src/utils/__tests__/ocrClassifier.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import { classifyRecordType } from '../ocrClassifier';

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
    console.error(`  FAIL: ${message}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

function testEmptyInput(): void {
  console.log('\n[empty input]');

  const a = classifyRecordType('');
  assertEq(a.suggested_type, 'unknown', 'empty string → unknown');
  assertEq(a.confidence, 0, 'empty string → confidence 0');

  const b = classifyRecordType('   \n\t  ');
  assertEq(b.suggested_type, 'unknown', 'whitespace-only → unknown');
  assertEq(b.confidence, 0, 'whitespace-only → confidence 0');
}

function testNoMatches(): void {
  console.log('\n[no keyword matches]');

  const r = classifyRecordType('the quick brown fox jumps over the lazy dog');
  assertEq(r.suggested_type, 'unknown', 'unrelated text → unknown');
  assertEq(r.confidence, 0, 'unrelated text → confidence 0');
}

function testBaptismEnglish(): void {
  console.log('\n[baptism — English]');

  const r = classifyRecordType(
    'Certificate of Baptism. Child name: John Smith. Date of birth: 1923-05-12. Godfather: Peter. Godmother: Maria. Place of birth: Athens.'
  );
  assertEq(r.suggested_type, 'baptism', 'classifies as baptism');
  assert(r.confidence >= 0.5, `confidence >= 0.5 (got ${r.confidence})`);
  assert(r.keyword_hits.baptism.length > 0, 'baptism keyword hits recorded');
}

function testMarriageEnglish(): void {
  console.log('\n[marriage — English]');

  const r = classifyRecordType(
    'Marriage record. Bride: Anna. Groom: Nicholas. Date of marriage: 1945-08-20. Witness: Theodore. Best man: George. Crowning by Father Demetrios.'
  );
  assertEq(r.suggested_type, 'marriage', 'classifies as marriage');
  assert(r.confidence >= 0.5, `confidence >= 0.5 (got ${r.confidence})`);
  assert(r.keyword_hits.marriage.length > 0, 'marriage keyword hits recorded');
}

function testFuneralEnglish(): void {
  console.log('\n[funeral — English]');

  const r = classifyRecordType(
    'Funeral register. Deceased: Constantine. Date of death: 1956-11-04. Burial: 1956-11-07. Cause of death: heart failure. Age at death: 78. Interment at St. George cemetery.'
  );
  assertEq(r.suggested_type, 'funeral', 'classifies as funeral');
  assert(r.confidence >= 0.5, `confidence >= 0.5 (got ${r.confidence})`);
  assert(r.keyword_hits.funeral.length > 0, 'funeral keyword hits recorded');
}

function testGreekKeywords(): void {
  console.log('\n[Greek keywords]');

  const baptism = classifyRecordType('Πιστοποιητικό βάπτισης. Νονός: Παύλος. Νονά: Ελένη.');
  assertEq(baptism.suggested_type, 'baptism', 'Greek baptism keywords classify as baptism');

  const marriage = classifyRecordType('Στεφάνωση και γάμος. Νυμφίος και νύφη.');
  assertEq(marriage.suggested_type, 'marriage', 'Greek marriage keywords classify as marriage');

  const funeral = classifyRecordType('Κηδεία και ταφή. Θάνατος.');
  assertEq(funeral.suggested_type, 'funeral', 'Greek funeral keywords classify as funeral');
}

function testRussianKeywords(): void {
  console.log('\n[Russian keywords]');

  const baptism = classifyRecordType('Свидетельство о крещении. Крёстный.');
  assertEq(baptism.suggested_type, 'baptism', 'Russian baptism keywords classify as baptism');

  const marriage = classifyRecordType('Бракосочетание и венчание.');
  assertEq(marriage.suggested_type, 'marriage', 'Russian marriage keywords classify as marriage');

  const funeral = classifyRecordType('Отпевание и похороны. Смерть.');
  assertEq(funeral.suggested_type, 'funeral', 'Russian funeral keywords classify as funeral');
}

function testCaseInsensitive(): void {
  console.log('\n[case insensitivity]');

  const upper = classifyRecordType('BAPTISM CERTIFICATE GODFATHER GODMOTHER');
  assertEq(upper.suggested_type, 'baptism', 'uppercase classifies as baptism');

  const mixed = classifyRecordType('Marriage Bride Groom Wedding');
  assertEq(mixed.suggested_type, 'marriage', 'mixed case classifies as marriage');
}

function testStrongestSignalWins(): void {
  console.log('\n[strongest signal wins]');

  // Mostly funeral with one stray marriage keyword
  const r = classifyRecordType(
    'Funeral. Burial. Death. Deceased. Cause of death. Age at death. Witness present.'
  );
  assertEq(r.suggested_type, 'funeral', 'mixed but funeral-dominated → funeral');
}

function testBelowThreshold(): void {
  console.log('\n[below threshold]');

  // Each category gets exactly 1 hit out of 3 — normalized to 1/3 ≈ 0.333.
  // The threshold is 0.3, so this still classifies (not below threshold).
  // To force below-threshold we need a tie that splits evenly across all 3
  // categories AND drops below 0.3 — not possible with 3 categories.
  // Instead, verify that a barely-tied result still picks one of the three.
  const r = classifyRecordType('baptism marriage funeral');
  assert(
    ['baptism', 'marriage', 'funeral'].includes(r.suggested_type),
    `even tie picks one of the three categories (got ${r.suggested_type})`
  );
}

function testConfidenceRange(): void {
  console.log('\n[confidence range and rounding]');

  const r = classifyRecordType('baptism baptism baptism godparent godmother godfather');
  assert(r.confidence >= 0 && r.confidence <= 1, `confidence in [0,1] (got ${r.confidence})`);

  // Check it's rounded to 3 decimal places
  const decimalStr = r.confidence.toString().split('.')[1] || '';
  assert(decimalStr.length <= 3, `confidence rounded to 3 decimals (got ${r.confidence})`);
}

function testKeywordHitsStructure(): void {
  console.log('\n[keyword_hits structure]');

  const r = classifyRecordType('marriage bride groom witness');
  assert('baptism' in r.keyword_hits, 'keyword_hits has baptism key');
  assert('marriage' in r.keyword_hits, 'keyword_hits has marriage key');
  assert('funeral' in r.keyword_hits, 'keyword_hits has funeral key');
  assert(r.keyword_hits.marriage.length >= 3, 'marriage hits >= 3');
  assert(r.keyword_hits.baptism.length === 0, 'baptism hits empty');
  assert(r.keyword_hits.funeral.length === 0, 'funeral hits empty');
}

function testMultipleHitsCount(): void {
  console.log('\n[multiple hits boost score]');

  // Multiple repetitions of the same keyword should drive confidence up
  const single = classifyRecordType('baptism. random text. more random text. wedding.');
  const multi = classifyRecordType('baptism baptism baptism baptism. wedding.');

  assert(
    multi.confidence > single.confidence,
    `multi-hit confidence (${multi.confidence}) > single-hit (${single.confidence})`
  );
  assertEq(multi.suggested_type, 'baptism', 'multi-hit baptism wins');
}

// ── Main runner ──────────────────────────────────────────────────────────────

function main(): void {
  console.log('=== ocrClassifier tests ===');

  testEmptyInput();
  testNoMatches();
  testBaptismEnglish();
  testMarriageEnglish();
  testFuneralEnglish();
  testGreekKeywords();
  testRussianKeywords();
  testCaseInsensitive();
  testStrongestSignalWins();
  testBelowThreshold();
  testConfidenceRange();
  testKeywordHitsStructure();
  testMultipleHitsCount();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
