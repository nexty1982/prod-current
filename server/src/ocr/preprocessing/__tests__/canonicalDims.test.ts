#!/usr/bin/env npx tsx
/**
 * Unit tests for canonicalDims.ts (OMD-877)
 *
 * Covers all 8 exports + HEADER_KEYWORDS:
 *   getCanonicalDims (sharp-generated fixture), overrideVisionDims,
 *   normalizeBox, denormalizeBox, clampBox, validateBox,
 *   detectContamination, extractTokensInYBand
 *
 * Run: npx tsx server/src/ocr/preprocessing/__tests__/canonicalDims.test.ts
 *
 * Exits non-zero on any failure.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';

import {
  getCanonicalDims,
  overrideVisionDims,
  normalizeBox,
  denormalizeBox,
  clampBox,
  validateBox,
  detectContamination,
  extractTokensInYBand,
  HEADER_KEYWORDS,
  CanonicalDims,
  PixelBox,
  NormBox,
} from '../canonicalDims';

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

async function runAsyncTests() {

// ============================================================================
// getCanonicalDims (with sharp-generated fixture image)
// ============================================================================
console.log('\n── getCanonicalDims ──────────────────────────────────────');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omd877-'));
const imgPath = path.join(tmpDir, 'fixture.png');
await sharp({
  create: { width: 137, height: 89, channels: 3, background: { r: 255, g: 255, b: 255 } },
}).png().toFile(imgPath);

const dims = await getCanonicalDims(imgPath);
assertEq(dims, { width: 137, height: 89 }, 'reads dimensions from PNG file');

// Cleanup happens at end after async block

// Missing file → throws
let threw = false;
try {
  await getCanonicalDims(path.join(tmpDir, 'does-not-exist.png'));
} catch {
  threw = true;
}
assert(threw, 'missing file throws');

// Cleanup the tmp dir
fs.rmSync(tmpDir, { recursive: true, force: true });

// ============================================================================
// overrideVisionDims
// ============================================================================
console.log('\n── overrideVisionDims ────────────────────────────────────');

// Mismatched → override + true
const v1 = { pages: [{ width: 100, height: 200 }, { width: 100, height: 200 }] };
const ret1 = overrideVisionDims(v1, { width: 137, height: 89 });
assertEq(ret1, true, 'returns true when dims differ');
assertEq(v1.pages[0], { width: 137, height: 89 }, 'page 0 overridden');
assertEq(v1.pages[1], { width: 137, height: 89 }, 'page 1 overridden');

// Already-equal → no override + false
const v2 = { pages: [{ width: 137, height: 89 }] };
const ret2 = overrideVisionDims(v2, { width: 137, height: 89 });
assertEq(ret2, false, 'returns false when dims match');

// No pages → false
assertEq(overrideVisionDims({}, { width: 100, height: 100 }), false, 'no pages → false');
assertEq(overrideVisionDims({ pages: [] }, { width: 100, height: 100 }), false, 'empty pages → false');
assertEq(overrideVisionDims(null, { width: 100, height: 100 }), false, 'null vision → false');

// Mixed: only one of multiple pages differs
const v3 = { pages: [{ width: 100, height: 100 }, { width: 200, height: 200 }] };
const ret3 = overrideVisionDims(v3, { width: 200, height: 200 });
assertEq(ret3, true, 'mixed-mismatch → true');
assertEq(v3.pages[0], { width: 200, height: 200 }, 'mismatched page overridden');
assertEq(v3.pages[1], { width: 200, height: 200 }, 'matched page unchanged (still equal)');

// ============================================================================
// normalizeBox
// ============================================================================
console.log('\n── normalizeBox ──────────────────────────────────────────');

const can: CanonicalDims = { width: 1000, height: 500 };

assertEq(
  normalizeBox({ x0: 100, y0: 50, x1: 500, y1: 250 }, can),
  { x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.5 },
  'basic normalization'
);

assertEq(
  normalizeBox({ x0: 0, y0: 0, x1: 1000, y1: 500 }, can),
  { x0: 0, y0: 0, x1: 1, y1: 1 },
  'full image → 0..1'
);

// Out-of-bounds normalization is allowed (no clamping in normalizeBox)
assertEq(
  normalizeBox({ x0: -10, y0: 0, x1: 2000, y1: 500 }, can),
  { x0: -0.01, y0: 0, x1: 2, y1: 1 },
  'normalizeBox does NOT clamp (out-of-bounds preserved)'
);

// ============================================================================
// denormalizeBox
// ============================================================================
console.log('\n── denormalizeBox ────────────────────────────────────────');

assertEq(
  denormalizeBox({ x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.5 }, can),
  { x0: 100, y0: 50, x1: 500, y1: 250 },
  'basic denormalization'
);

assertEq(
  denormalizeBox({ x0: 0, y0: 0, x1: 1, y1: 1 }, can),
  { x0: 0, y0: 0, x1: 1000, y1: 500 },
  '0..1 → full image'
);

// Rounding: 0.1234 * 1000 = 123.4 → 123
assertEq(
  denormalizeBox({ x0: 0.1234, y0: 0.5678, x1: 0.5, y1: 0.5 }, can),
  { x0: 123, y0: 284, x1: 500, y1: 250 },
  'rounds to nearest integer'
);

// Round-trip: normalize then denormalize → original
const original: PixelBox = { x0: 100, y0: 50, x1: 500, y1: 250 };
const roundTrip = denormalizeBox(normalizeBox(original, can), can);
assertEq(roundTrip, original, 'normalize→denormalize round-trip preserves integer pixels');

// ============================================================================
// clampBox
// ============================================================================
console.log('\n── clampBox ──────────────────────────────────────────────');

// Within bounds
assertEq(
  clampBox({ x0: 10, y0: 20, x1: 100, y1: 200 }, 1000, 500),
  { x0: 10, y0: 20, x1: 100, y1: 200 },
  'in-bounds box passes through'
);

// Negative coordinates clamped to 0
assertEq(
  clampBox({ x0: -50, y0: -100, x1: 100, y1: 200 }, 1000, 500),
  { x0: 0, y0: 0, x1: 100, y1: 200 },
  'negative coords clamped to 0'
);

// Coordinates beyond image clamped to maxW/maxH
assertEq(
  clampBox({ x0: 0, y0: 0, x1: 2000, y1: 1000 }, 1000, 500),
  { x0: 0, y0: 0, x1: 1000, y1: 500 },
  'over-bounds clamped to max'
);

// All four corners out of bounds
assertEq(
  clampBox({ x0: -100, y0: -50, x1: 2000, y1: 1000 }, 1000, 500),
  { x0: 0, y0: 0, x1: 1000, y1: 500 },
  'all four corners clamped'
);

// ============================================================================
// validateBox
// ============================================================================
console.log('\n── validateBox ───────────────────────────────────────────');

// Valid box
const v = validateBox({ x0: 10, y0: 20, x1: 100, y1: 200 }, can);
assertEq(v.valid, true, 'in-bounds box is valid');
assertEq(v.errors, [], 'in-bounds box has no errors');

// Negative coordinates
const neg = validateBox({ x0: -1, y0: 0, x1: 100, y1: 100 }, can);
assertEq(neg.valid, false, 'negative x0 → invalid');
assert(neg.errors.includes('Negative coordinates'), 'reports negative coords');

// Zero width
const zw = validateBox({ x0: 100, y0: 0, x1: 100, y1: 100 }, can);
assertEq(zw.valid, false, 'zero width → invalid');
assert(zw.errors.some(e => e.includes('width')), 'reports zero width');

// Inverted (negative width)
const inv = validateBox({ x0: 100, y0: 0, x1: 50, y1: 100 }, can);
assertEq(inv.valid, false, 'inverted x → invalid');

// Zero height
const zh = validateBox({ x0: 0, y0: 100, x1: 100, y1: 100 }, can);
assertEq(zh.valid, false, 'zero height → invalid');
assert(zh.errors.some(e => e.includes('height')), 'reports zero height');

// Exceeds width
const ow = validateBox({ x0: 0, y0: 0, x1: 1500, y1: 100 }, can);
assertEq(ow.valid, false, 'x1 > canonical.width → invalid');
assert(ow.errors.some(e => e.includes('width')), 'reports exceeds width');

// Exceeds height
const oh = validateBox({ x0: 0, y0: 0, x1: 100, y1: 600 }, can);
assertEq(oh.valid, false, 'y1 > canonical.height → invalid');
assert(oh.errors.some(e => e.includes('height')), 'reports exceeds height');

// Multiple errors at once
const multi = validateBox({ x0: -1, y0: -1, x1: 2000, y1: 1000 }, can);
assertEq(multi.valid, false, 'multi-error box invalid');
assert(multi.errors.length >= 3, 'multi-error box reports ≥3 errors');

// Edge case: x1 == canonical.width (boundary, allowed)
const edge = validateBox({ x0: 0, y0: 0, x1: 1000, y1: 500 }, can);
assertEq(edge.valid, true, 'box exactly at canonical bounds is valid');

// ============================================================================
// detectContamination
// ============================================================================
console.log('\n── detectContamination ───────────────────────────────────');

// Real ledger data: no header keywords
const clean = detectContamination('John Doe born 1985-05-12 in Boston');
assertEq(clean.contaminated, false, 'real data → not contaminated');
assertEq(clean.matches, [], 'real data → no matches');

// Heavy header contamination
const dirty = detectContamination('NAME OF CHILD DATE OF BIRTH SPONSORS PARENTS');
assertEq(dirty.contaminated, true, 'header text → contaminated');
assert(dirty.matches.length >= 4, 'matches ≥4 keywords');

// Single keyword + threshold default 2 → not contaminated
const single = detectContamination('John was born in Boston, GROOM');
assertEq(single.contaminated, false, '1 match below default threshold (2)');
assertEq(single.matches, ['GROOM'], 'reports the single match');

// Custom threshold of 1
const threshold1 = detectContamination('John was born in Boston, GROOM', 1);
assertEq(threshold1.contaminated, true, 'custom threshold=1 catches single match');

// Case insensitive
const lower = detectContamination('name of child sponsors witnesses');
assertEq(lower.contaminated, true, 'lowercase header text → contaminated');
assert(lower.matches.length >= 3, 'lowercase matches found via uppercase comparison');

// Empty string
assertEq(detectContamination('').contaminated, false, 'empty string → not contaminated');

// HEADER_KEYWORDS sanity
assert(HEADER_KEYWORDS.length > 20, 'HEADER_KEYWORDS has reasonable size');
assert(HEADER_KEYWORDS.includes('CHURCH'), 'HEADER_KEYWORDS contains CHURCH');
assert(HEADER_KEYWORDS.includes('SPONSORS'), 'HEADER_KEYWORDS contains SPONSORS');

// ============================================================================
// extractTokensInYBand
// ============================================================================
console.log('\n── extractTokensInYBand ──────────────────────────────────');

// Build a synthetic vision JSON with words at known Y positions
function buildWord(text: string, y: number, yHeight: number = 20): any {
  return {
    text,
    confidence: 0.9,
    boundingBox: {
      vertices: [
        { x: 100, y },
        { x: 200, y },
        { x: 200, y: y + yHeight },
        { x: 100, y: y + yHeight },
      ],
    },
  };
}

const vision = {
  pages: [{
    width: 1000,
    height: 1000,
    blocks: [{
      paragraphs: [{
        words: [
          buildWord('top', 50),       // y center 60 → 0.06
          buildWord('middle', 500),   // y center 510 → 0.51
          buildWord('bottom', 900),   // y center 910 → 0.91
        ],
      }],
    }],
  }],
};

// Y-band 0.4..0.6 → only "middle"
const band1 = extractTokensInYBand(vision, 0.4, 0.6);
assertEq(band1.length, 1, 'narrow band → 1 token');
assertEq(band1[0].text, 'middle', 'band selects middle token');

// Y-band 0..1 → all 3
const all = extractTokensInYBand(vision, 0, 1);
assertEq(all.length, 3, 'full-page band → all tokens');

// Y-band 0.95..1.0 → none (bottom token center is 0.91)
const none = extractTokensInYBand(vision, 0.95, 1.0);
assertEq(none.length, 0, 'narrow band missing all → 0 tokens');

// Token shape
assert('text' in band1[0], 'token has text field');
assert('confidence' in band1[0], 'token has confidence field');
assert(Array.isArray(band1[0].bbox) && band1[0].bbox.length === 4, 'token bbox is 4-element array');
assert('cx' in band1[0] && 'cy' in band1[0], 'token has cx/cy fields');

// Page index out of range → empty
assertEq(extractTokensInYBand(vision, 0, 1, 99), [], 'unknown page index → []');

// Null vision → empty
assertEq(extractTokensInYBand(null, 0, 1), [], 'null vision → []');

// Word with no bounding box → skipped (no crash)
const noBboxVision = {
  pages: [{
    width: 1000,
    height: 1000,
    blocks: [{
      paragraphs: [{
        words: [{ text: 'no bbox', confidence: 0.9 }, buildWord('valid', 500)],
      }],
    }],
  }],
};
const filtered = extractTokensInYBand(noBboxVision, 0, 1);
assertEq(filtered.length, 1, 'words without bbox skipped, valid words returned');
assertEq(filtered[0].text, 'valid', 'remaining token is the valid one');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end runAsyncTests

runAsyncTests().catch((err) => {
  console.error('UNCAUGHT ERROR in async tests:', err);
  process.exit(1);
});
