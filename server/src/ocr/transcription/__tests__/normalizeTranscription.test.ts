#!/usr/bin/env npx tsx
/**
 * Unit tests for normalizeTranscription.ts (OMD-876)
 *
 * Covers:
 *   - Pure helpers (via __test__):
 *       detectScript, isOcrGarbage, shouldDropToken, normalizeTokenText,
 *       getTokenYCenter, getTokenHeight, getTokenX, reconstructLines,
 *       joinHyphenatedLines, reconstructParagraphs
 *   - Public normalizeTranscription with various input shapes
 *
 * Run: npx tsx server/src/ocr/transcription/__tests__/normalizeTranscription.test.ts
 *
 * Exits non-zero on any failure.
 */

import {
  __test__,
  normalizeTranscription,
  OcrToken,
} from '../normalizeTranscription';
import { OcrLine } from '../extractTokensFromVision';
import { Token } from '../../layoutExtractor';

const {
  detectScript,
  isOcrGarbage,
  shouldDropToken,
  normalizeTokenText,
  getTokenYCenter,
  getTokenHeight,
  getTokenX,
  reconstructLines,
  joinHyphenatedLines,
  reconstructParagraphs,
} = __test__;

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// Helper: build a normalized OcrToken
function tok(text: string, opts?: { confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }): OcrToken {
  return {
    text,
    confidence: opts?.confidence,
    bbox: opts?.bbox,
  };
}

// Helper: build an OcrLine
function ocrLine(text: string, tokens: any[], confidence: number = 0.8): OcrLine {
  return {
    text,
    tokens,
    bboxNorm: { x0: 0, y0: 0, x1: 1, y1: 0.05 },
    confidence,
  };
}

// ============================================================================
// detectScript
// ============================================================================
console.log('\n── detectScript ──────────────────────────────────────────');

assertEq(detectScript('Hello'), 'latin', 'plain Latin → latin');
assertEq(detectScript('Привет'), 'cyrillic', 'plain Cyrillic → cyrillic');
assertEq(detectScript('Hello мир'), 'cyrillic', 'mixed → cyrillic (Cyrillic check first)');
assertEq(detectScript(''), 'unknown', 'empty string → unknown');
assertEq(detectScript('1234'), 'unknown', 'digits only → unknown');
assertEq(detectScript('!@#$'), 'unknown', 'symbols only → unknown');
assertEq(detectScript('Ё'), 'cyrillic', 'single Cyrillic Yo letter → cyrillic');
assertEq(detectScript('Z'), 'latin', 'single Latin letter → latin');

// ============================================================================
// isOcrGarbage
// ============================================================================
console.log('\n── isOcrGarbage ──────────────────────────────────────────');

assertEq(isOcrGarbage('zxcvbnm'), true, 'consonant string with no vowels → garbage');
assertEq(isOcrGarbage('qwrtpf'), false, 'short consonant string (length ≤ 6) → NOT garbage');
assertEq(isOcrGarbage('hello'), false, 'real word with vowels → not garbage');
assertEq(isOcrGarbage(''), false, 'empty → not garbage (early return)');
assertEq(isOcrGarbage('ab'), false, '2 chars → not garbage (early return)');
assertEq(isOcrGarbage('abc'), false, '3 chars → not garbage (length > 2 but no consonant pattern)');
assertEq(isOcrGarbage('JOHN'), false, 'real all-caps name with vowel → not garbage');
assertEq(isOcrGarbage('1234567'), false, 'digits → not garbage');
assertEq(isOcrGarbage('zzzzzzz'), true, 'repeated z → garbage (no vowels)');

// ============================================================================
// shouldDropToken
// ============================================================================
console.log('\n── shouldDropToken ───────────────────────────────────────');

assertEq(shouldDropToken(tok(''), 0.35), true, 'empty token → drop');
assertEq(shouldDropToken(tok('   '), 0.35), true, 'whitespace-only token → drop');
assertEq(shouldDropToken(tok('a'), 0.35), false, 'single alpha char → keep');
assertEq(shouldDropToken(tok('1'), 0.35), false, 'single digit → keep');
assertEq(shouldDropToken(tok(','), 0.35), true, 'single punctuation → drop');
assertEq(shouldDropToken(tok('!'), 0.35), true, 'single exclamation → drop');
assertEq(shouldDropToken(tok('hi', { confidence: 0.2 }), 0.35), true, 'short low-confidence token → drop');
assertEq(shouldDropToken(tok('hi', { confidence: 0.9 }), 0.35), false, 'short high-confidence token → keep');
assertEq(shouldDropToken(tok('hello', { confidence: 0.2 }), 0.35), false, 'longer low-confidence token → keep (>2 chars)');
assertEq(shouldDropToken(tok('zxcvbnm'), 0.35), true, 'OCR garbage → drop');
assertEq(shouldDropToken(tok('JOHN'), 0.35), false, 'real name → keep');

// ============================================================================
// normalizeTokenText
// ============================================================================
console.log('\n── normalizeTokenText ────────────────────────────────────');

assertEq(normalizeTokenText('  hello  '), 'hello', 'trims leading/trailing whitespace');
assertEq(normalizeTokenText('hello   world'), 'hello world', 'collapses internal whitespace');
assertEq(normalizeTokenText('a\tb\nc'), 'a b c', 'normalizes tab and newline to single space');
assertEq(normalizeTokenText(''), '', 'empty string passes through');
assertEq(normalizeTokenText('   '), '', 'whitespace-only collapses to empty');

// ============================================================================
// getTokenYCenter / getTokenHeight / getTokenX
// ============================================================================
console.log('\n── getToken{YCenter,Height,X} ────────────────────────────');

// OcrToken with bbox
const ocrTokenWithBbox = tok('hello', { bbox: { x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.4 } });
assertEq(getTokenYCenter(ocrTokenWithBbox), 0.30000000000000004, 'OcrToken Y center');
assert(Math.abs(getTokenHeight(ocrTokenWithBbox) - 0.2) < 1e-9, 'OcrToken height');
assertEq(getTokenX(ocrTokenWithBbox), 0.1, 'OcrToken X');

// OcrToken without bbox → defaults
const bareToken = tok('x');
assertEq(getTokenYCenter(bareToken), 0.5, 'no bbox → Y center default 0.5');
assertEq(getTokenHeight(bareToken), 0.02, 'no bbox → height default 0.02');
assertEq(getTokenX(bareToken), 0.5, 'no bbox → X default 0.5');

// Token (layoutExtractor shape) with bboxNorm
const layoutToken = {
  text: 'foo',
  bboxNorm: { nx0: 0.1, ny0: 0.2, nx1: 0.3, ny1: 0.4 },
  confidence: 0.9,
} as any;
assert(Math.abs(getTokenYCenter(layoutToken) - 0.3) < 1e-9, 'Token (bboxNorm) Y center');
assert(Math.abs(getTokenHeight(layoutToken) - 0.2) < 1e-9, 'Token (bboxNorm) height');
assertEq(getTokenX(layoutToken), 0.1, 'Token (bboxNorm) X');

// ============================================================================
// reconstructLines
// ============================================================================
console.log('\n── reconstructLines ──────────────────────────────────────');

assertEq(reconstructLines([]), [], 'empty input → empty lines');

// 3 tokens on same Y → 1 line
const sameRow = [
  tok('A', { bbox: { x0: 0.5, y0: 0.10, x1: 0.55, y1: 0.12 } }),
  tok('B', { bbox: { x0: 0.10, y0: 0.10, x1: 0.15, y1: 0.12 } }),
  tok('C', { bbox: { x0: 0.30, y0: 0.10, x1: 0.35, y1: 0.12 } }),
];
const linesSame = reconstructLines(sameRow);
assertEq(linesSame.length, 1, '3 tokens same Y → 1 line');
// Tokens sorted by X within line: B (0.10), C (0.30), A (0.50)
assertEq(linesSame[0].text, 'B C A', 'tokens within line sorted by X position');

// 2 lines clearly separated
const twoRows = [
  tok('foo', { bbox: { x0: 0.1, y0: 0.10, x1: 0.2, y1: 0.12 } }),
  tok('bar', { bbox: { x0: 0.1, y0: 0.30, x1: 0.2, y1: 0.32 } }),
];
const linesTwo = reconstructLines(twoRows);
assertEq(linesTwo.length, 2, '2 tokens far apart Y → 2 lines');
assertEq(linesTwo[0].text, 'foo', 'first line is the higher one (sorted by Y)');
assertEq(linesTwo[1].text, 'bar', 'second line is the lower one');

// Confidence aggregation: average of token confidences
const confTokens = [
  tok('A', { bbox: { x0: 0.1, y0: 0.10, x1: 0.15, y1: 0.12 }, confidence: 0.8 }),
  tok('B', { bbox: { x0: 0.2, y0: 0.10, x1: 0.25, y1: 0.12 }, confidence: 0.6 }),
];
const linesConf = reconstructLines(confTokens);
assert(Math.abs(linesConf[0].confidence! - 0.7) < 1e-9, 'line confidence is average of tokens');

// ============================================================================
// joinHyphenatedLines
// ============================================================================
console.log('\n── joinHyphenatedLines ───────────────────────────────────');

assertEq(joinHyphenatedLines([]).length, 0, 'empty → empty');
assertEq(joinHyphenatedLines([ocrLine('hello', [])]).length, 1, 'single line → unchanged');

// Hyphenated case: "smar-" + "ter" → "smarter"
const hyphLines = [
  ocrLine('he is smar-', []),
  ocrLine('ter than', []),
];
const joined = joinHyphenatedLines(hyphLines);
assertEq(joined.length, 1, 'hyphenated lines collapse to 1');
assertEq(joined[0].text, 'he is smarter than', 'hyphen joined word reconstructed');

// Hyphen but next line starts with non-letter → not joined
const hyphNonLetter = [
  ocrLine('foo-', []),
  ocrLine('123 bar', []),
];
const notJoined = joinHyphenatedLines(hyphNonLetter);
assertEq(notJoined.length, 2, 'hyphen + digit-start → NOT joined');

// Cyrillic hyphen join works
const cyrHyph = [
  ocrLine('пере-', []),
  ocrLine('вод', []),
];
const cyrJoined = joinHyphenatedLines(cyrHyph);
assertEq(cyrJoined.length, 1, 'Cyrillic hyphenated lines join');
assertEq(cyrJoined[0].text, 'перевод', 'Cyrillic hyphen-join reconstructs word');

// No trailing hyphen → no join
const plain = [ocrLine('foo', []), ocrLine('bar', [])];
assertEq(joinHyphenatedLines(plain).length, 2, 'plain lines stay separate');

// ============================================================================
// reconstructParagraphs
// ============================================================================
console.log('\n── reconstructParagraphs ─────────────────────────────────');

assertEq(reconstructParagraphs([]), [], 'empty → empty');

// Helper to build a token with bboxNorm at a Y position
function bnToken(text: string, ny0: number): Token {
  return {
    text,
    confidence: 0.8,
    langCodes: ['en'],
    bboxPx: { x0: 0, y0: 0, x1: 0, y1: 0 },
    bboxNorm: { nx0: 0, ny0, nx1: 0.1, ny1: ny0 + 0.02 },
    pageIndex: 0,
    isRu: false,
    tokenId: text,
  };
}

// 2 lines close → 1 paragraph.
// medianLineHeight = 0.02, so paragraphGapThreshold = 0.024.
// Place line 2 so the gap (line2.ny1 - line1.ny1) is below 0.024.
const closeLines: OcrLine[] = [
  ocrLine('Line one', [bnToken('Line', 0.10), bnToken('one', 0.10)]),
  ocrLine('Line two', [bnToken('Line', 0.115), bnToken('two', 0.115)]),
];
const paraClose = reconstructParagraphs(closeLines);
assertEq(paraClose.length, 1, '2 close lines → 1 paragraph');
assertEq(paraClose[0], ['Line one', 'Line two'], 'paragraph contains both lines');

// 2 lines far apart → 2 paragraphs
const farLines: OcrLine[] = [
  ocrLine('Para A', [bnToken('Para', 0.10), bnToken('A', 0.10)]),
  ocrLine('Para B', [bnToken('Para', 0.50), bnToken('B', 0.50)]),
];
const paraFar = reconstructParagraphs(farLines);
assertEq(paraFar.length, 2, '2 far-apart lines → 2 paragraphs');

// Empty-text lines skipped
const withEmpty: OcrLine[] = [
  ocrLine('hello', [bnToken('hello', 0.10)]),
  ocrLine('   ', [bnToken('   ', 0.13)]),
  ocrLine('world', [bnToken('world', 0.16)]),
];
const paraEmpty = reconstructParagraphs(withEmpty);
const flat = paraEmpty.flat();
assertEq(flat, ['hello', 'world'], 'empty-text lines filtered out');

// ============================================================================
// normalizeTranscription (public)
// ============================================================================
console.log('\n── normalizeTranscription (public) ───────────────────────');

// Empty input → empty result
const empty = normalizeTranscription({});
assertEq(empty.text, '', 'empty input → empty text');
assertEq(empty.paragraphs, [], 'empty input → empty paragraphs');
assertEq(empty.diagnostics.lineCount, 0, 'empty input → 0 lines');
assertEq(empty.diagnostics.paragraphCount, 0, 'empty input → 0 paragraphs');

// Tokens-only path: drops garbage and reconstructs lines
const fromTokens = normalizeTranscription({
  tokens: [
    tok('Hello', { bbox: { x0: 0.1, y0: 0.10, x1: 0.2, y1: 0.12 }, confidence: 0.9 }),
    tok('world', { bbox: { x0: 0.25, y0: 0.10, x1: 0.35, y1: 0.12 }, confidence: 0.9 }),
    tok('zxcvbnm', { bbox: { x0: 0.4, y0: 0.10, x1: 0.55, y1: 0.12 }, confidence: 0.9 }), // garbage
    tok('', { bbox: { x0: 0.6, y0: 0.10, x1: 0.65, y1: 0.12 } }), // empty
  ],
});
assert(fromTokens.text.includes('Hello'), 'tokens path: real words preserved');
assert(fromTokens.text.includes('world'), 'tokens path: world preserved');
assert(!fromTokens.text.includes('zxcvbnm'), 'tokens path: garbage dropped');
assertEq(fromTokens.diagnostics.droppedTokenCount, 2, 'dropped garbage + empty (2 total)');

// Lines-only path: passes through, joins hyphens
const fromLines = normalizeTranscription({
  lines: [
    ocrLine('First line', [bnToken('First', 0.10), bnToken('line', 0.10)]),
    ocrLine('Second line', [bnToken('Second', 0.13), bnToken('line', 0.13)]),
  ],
});
assertEq(fromLines.diagnostics.lineCount, 2, 'lines path: 2 lines');
assert(fromLines.text.includes('First line'), 'lines path: text contains first line');
assert(fromLines.text.includes('Second line'), 'lines path: text contains second line');

// confidenceThreshold honored
const fromTokensStrict = normalizeTranscription({
  tokens: [
    tok('hi', { bbox: { x0: 0.1, y0: 0.10, x1: 0.15, y1: 0.12 }, confidence: 0.4 }),
    tok('OK', { bbox: { x0: 0.2, y0: 0.10, x1: 0.25, y1: 0.12 }, confidence: 0.95 }),
  ],
}, { confidenceThreshold: 0.6 });
// 'hi' is short (<=2 chars) AND below 0.6 threshold → dropped
// 'OK' is short but above threshold → kept
assertEq(fromTokensStrict.diagnostics.droppedTokenCount, 1, 'high threshold drops short low-conf token');
assert(fromTokensStrict.text.includes('OK'), 'high-conf short token kept');

// Mixed scripts diagnostic
const mixed = normalizeTranscription({
  lines: [
    ocrLine('English text', [bnToken('English', 0.10), bnToken('text', 0.10)]),
    ocrLine('Русский текст', [bnToken('Русский', 0.13), bnToken('текст', 0.13)]),
  ],
});
assertEq(
  mixed.diagnostics.scriptsPresent.sort(),
  ['cyrillic', 'latin'],
  'scriptsPresent contains both scripts'
);

// Low-confidence warning
const lowConf = normalizeTranscription({
  lines: [
    ocrLine('low conf line', [bnToken('low', 0.10), bnToken('conf', 0.10), bnToken('line', 0.10)], 0.3),
  ],
});
assert(
  lowConf.diagnostics.warnings.includes('low_confidence_overall'),
  'low avg confidence triggers warning'
);

// High-confidence: no warning
const highConf = normalizeTranscription({
  lines: [
    ocrLine('high conf', [bnToken('high', 0.10), bnToken('conf', 0.10)], 0.95),
  ],
});
assertEq(
  highConf.diagnostics.warnings.length,
  0,
  'high confidence → no warnings'
);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
