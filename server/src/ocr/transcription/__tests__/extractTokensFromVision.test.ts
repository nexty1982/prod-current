#!/usr/bin/env npx tsx
/**
 * Unit tests for extractTokensFromVision adapter (OMD-144)
 *
 * Run:  npx tsx server/src/ocr/transcription/__tests__/extractTokensFromVision.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import { extractTokensFromVision, __test__ } from '../extractTokensFromVision';

const { normalizeBBox, extractBBox, detectScript, extractWordText } = __test__;

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
  const ok = actual === expected;
  if (!ok) {
    console.error(`  FAIL: ${message}\n         expected: ${String(expected)}\n         actual:   ${String(actual)}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function assertClose(actual: number, expected: number, tol: number, message: string): void {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) {
    console.error(`  FAIL: ${message}\n         expected: ${expected} (±${tol})\n         actual:   ${actual}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

// ── Synthetic Vision API builders ────────────────────────────────────────────

interface SymInit { text: string; break?: 'SPACE' | 'SURE_SPACE' | 'EOL_SURE_SPACE' | 'LINE_BREAK'; }

function buildWord(text: string, x0: number, y0: number, x1: number, y1: number, conf?: number) {
  // Build symbols: one per char + a SPACE break on the last symbol
  const symbols = text.split('').map((ch, i) => {
    const sym: any = { text: ch };
    if (i === text.length - 1) {
      sym.property = { detectedBreak: { type: 'SPACE' } };
    }
    return sym;
  });
  return {
    symbols,
    boundingBox: {
      vertices: [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ],
    },
    confidence: conf,
  };
}

function buildVisionResponse(
  pages: Array<{
    width: number;
    height: number;
    blocks: Array<{
      paragraphs: Array<{
        words: any[];
        confidence?: number;
      }>;
    }>;
  }>
): any {
  return {
    fullTextAnnotation: {
      pages: pages.map(p => ({
        width: p.width,
        height: p.height,
        blocks: p.blocks,
      })),
    },
  };
}

// ============================================================================
// normalizeBBox
// ============================================================================
console.log('\n── normalizeBBox ─────────────────────────────────────────');

{
  const r = normalizeBBox(0, 0, 100, 200, 1000, 2000);
  assertClose(r.x0, 0.0, 1e-9, 'normalizeBBox: x0=0 stays 0');
  assertClose(r.y0, 0.0, 1e-9, 'normalizeBBox: y0=0 stays 0');
  assertClose(r.x1, 0.1, 1e-9, 'normalizeBBox: x1 normalized correctly');
  assertClose(r.y1, 0.1, 1e-9, 'normalizeBBox: y1 normalized correctly');
}

{
  // Out-of-bounds clamping
  const r = normalizeBBox(-50, -100, 1500, 3000, 1000, 2000);
  assertClose(r.x0, 0.0, 1e-9, 'normalizeBBox: negative x0 clamps to 0');
  assertClose(r.y0, 0.0, 1e-9, 'normalizeBBox: negative y0 clamps to 0');
  assertClose(r.x1, 1.0, 1e-9, 'normalizeBBox: oversize x1 clamps to 1');
  assertClose(r.y1, 1.0, 1e-9, 'normalizeBBox: oversize y1 clamps to 1');
}

{
  // Zero page dimensions → all zeros
  const r = normalizeBBox(10, 20, 30, 40, 0, 0);
  assertEq(r.x0, 0, 'normalizeBBox: zero pageWidth → x0=0');
  assertEq(r.y0, 0, 'normalizeBBox: zero pageHeight → y0=0');
  assertEq(r.x1, 0, 'normalizeBBox: zero page dims → x1=0');
  assertEq(r.y1, 0, 'normalizeBBox: zero page dims → y1=0');
}

{
  // Zero width only
  const r = normalizeBBox(10, 20, 30, 40, 0, 100);
  assertEq(r.x0, 0, 'normalizeBBox: pageWidth=0 returns zero bbox');
  assertEq(r.y1, 0, 'normalizeBBox: pageWidth=0 returns zero bbox (y1)');
}

// ============================================================================
// extractBBox
// ============================================================================
console.log('\n── extractBBox ───────────────────────────────────────────');

{
  const r = extractBBox([
    { x: 10, y: 20 },
    { x: 100, y: 20 },
    { x: 100, y: 50 },
    { x: 10, y: 50 },
  ]);
  assertEq(r.x0, 10, 'extractBBox: x0 = min x');
  assertEq(r.y0, 20, 'extractBBox: y0 = min y');
  assertEq(r.x1, 100, 'extractBBox: x1 = max x');
  assertEq(r.y1, 50, 'extractBBox: y1 = max y');
}

{
  const r = extractBBox(undefined);
  assertEq(r.x0, 0, 'extractBBox: undefined → zero bbox x0');
  assertEq(r.x1, 0, 'extractBBox: undefined → zero bbox x1');
}

{
  const r = extractBBox([]);
  assertEq(r.x0, 0, 'extractBBox: empty array → zero bbox');
}

{
  // Single vertex (less than 2)
  const r = extractBBox([{ x: 10, y: 20 }]);
  assertEq(r.x0, 0, 'extractBBox: <2 vertices → zero bbox');
  assertEq(r.x1, 0, 'extractBBox: <2 vertices → zero bbox x1');
}

{
  // Vertices with missing coords default to 0
  const r = extractBBox([
    { x: 50, y: 50 },
    { x: 100 }, // missing y → 0
    { y: 100 }, // missing x → 0
  ]);
  assertEq(r.x0, 0, 'extractBBox: missing x defaults to 0');
  assertEq(r.y0, 0, 'extractBBox: missing y defaults to 0');
  assertEq(r.x1, 100, 'extractBBox: max x correct');
  assertEq(r.y1, 100, 'extractBBox: max y correct');
}

{
  // Rotated/skewed quad
  const r = extractBBox([
    { x: 12, y: 18 },
    { x: 95, y: 22 },
    { x: 98, y: 48 },
    { x: 14, y: 44 },
  ]);
  assertEq(r.x0, 12, 'extractBBox: rotated quad x0');
  assertEq(r.y0, 18, 'extractBBox: rotated quad y0');
  assertEq(r.x1, 98, 'extractBBox: rotated quad x1');
  assertEq(r.y1, 48, 'extractBBox: rotated quad y1');
}

// ============================================================================
// detectScript
// ============================================================================
console.log('\n── detectScript ──────────────────────────────────────────');

assertEq(detectScript('Hello'), 'latin', 'detectScript: ASCII Latin');
assertEq(detectScript('John'), 'latin', 'detectScript: name in Latin');
assertEq(detectScript('Иван'), 'cyrillic', 'detectScript: Russian Cyrillic');
assertEq(detectScript('крещение'), 'cyrillic', 'detectScript: Russian word');
assertEq(detectScript('Пётр'), 'cyrillic', 'detectScript: Russian with diacritic');
assertEq(detectScript(''), 'unknown', 'detectScript: empty string → unknown');
assertEq(detectScript('1234'), 'unknown', 'detectScript: digits only → unknown');
assertEq(detectScript('!@#$'), 'unknown', 'detectScript: punctuation only → unknown');
assertEq(detectScript('Иван Smith'), 'cyrillic', 'detectScript: mixed → Cyrillic wins');
assertEq(detectScript('123 ABC'), 'latin', 'detectScript: digits + Latin');

// ============================================================================
// extractWordText
// ============================================================================
console.log('\n── extractWordText ───────────────────────────────────────');

{
  const word = extractWordText([
    { text: 'H' },
    { text: 'i' },
  ]);
  assertEq(word, 'Hi', 'extractWordText: simple symbols joined');
}

{
  const word = extractWordText(undefined);
  assertEq(word, '', 'extractWordText: undefined → empty');
}

{
  const word = extractWordText([]);
  assertEq(word, '', 'extractWordText: empty array → empty');
}

{
  // Symbol with SPACE break — gets trimmed at end
  const word = extractWordText([
    { text: 'a' },
    { text: 'b', property: { detectedBreak: { type: 'SPACE' } } },
  ]);
  assertEq(word, 'ab', 'extractWordText: trailing SPACE break trimmed');
}

{
  // Mid-word SPACE break (rare but possible)
  const word = extractWordText([
    { text: 'a', property: { detectedBreak: { type: 'SPACE' } } },
    { text: 'b' },
  ]);
  assertEq(word, 'a b', 'extractWordText: mid-symbol SPACE break preserved');
}

{
  const word = extractWordText([
    { text: 'a', property: { detectedBreak: { type: 'SURE_SPACE' } } },
    { text: 'b' },
  ]);
  assertEq(word, 'a b', 'extractWordText: SURE_SPACE break preserved');
}

{
  // Non-space break type (LINE_BREAK) is not treated as space
  const word = extractWordText([
    { text: 'a', property: { detectedBreak: { type: 'LINE_BREAK' } } },
    { text: 'b' },
  ]);
  assertEq(word, 'ab', 'extractWordText: LINE_BREAK not treated as space');
}

{
  // Missing text fields default to empty
  const word = extractWordText([
    { text: 'a' },
    {},
    { text: 'b' },
  ]);
  assertEq(word, 'ab', 'extractWordText: symbol without text contributes nothing');
}

// ============================================================================
// extractTokensFromVision — null/undefined/empty paths
// ============================================================================
console.log('\n── extractTokensFromVision: empty paths ──────────────────');

{
  const r = extractTokensFromVision(null);
  assertEq(r.tokens.length, 0, 'null input → empty tokens');
  assertEq(r.lines.length, 0, 'null input → empty lines');
}

{
  const r = extractTokensFromVision(undefined);
  assertEq(r.tokens.length, 0, 'undefined input → empty tokens');
  assertEq(r.lines.length, 0, 'undefined input → empty lines');
}

{
  const r = extractTokensFromVision({});
  assertEq(r.tokens.length, 0, 'empty object → empty tokens');
  assertEq(r.lines.length, 0, 'empty object → empty lines');
}

{
  const r = extractTokensFromVision({ fullTextAnnotation: {} });
  assertEq(r.tokens.length, 0, 'fullTextAnnotation without pages → empty');
}

{
  const r = extractTokensFromVision({ fullTextAnnotation: { pages: [] } });
  assertEq(r.tokens.length, 0, 'empty pages array → empty');
}

{
  // Page index out of range
  const vr = buildVisionResponse([{ width: 1000, height: 2000, blocks: [{ paragraphs: [{ words: [buildWord('Hi', 0, 0, 50, 30)] }] }] }]);
  const r = extractTokensFromVision(vr, { pageIndex: 5 });
  assertEq(r.tokens.length, 0, 'pageIndex out of range → empty');
}

{
  // Zero page dimensions → empty + warning
  const vr = buildVisionResponse([{ width: 0, height: 0, blocks: [{ paragraphs: [{ words: [buildWord('Hi', 0, 0, 50, 30)] }] }] }]);
  const origWarn = console.warn;
  let warned = false;
  console.warn = () => { warned = true; };
  const r = extractTokensFromVision(vr);
  console.warn = origWarn;
  assertEq(r.tokens.length, 0, 'zero page dims → empty');
  assert(warned, 'zero page dims → console.warn called');
}

// ============================================================================
// extractTokensFromVision — single word
// ============================================================================
console.log('\n── extractTokensFromVision: single word ──────────────────');

{
  const vr = buildVisionResponse([
    {
      width: 1000,
      height: 2000,
      blocks: [
        { paragraphs: [{ words: [buildWord('Hello', 100, 200, 300, 250, 0.95)], confidence: 0.95 }] },
      ],
    },
  ]);
  const r = extractTokensFromVision(vr);
  assertEq(r.tokens.length, 1, 'single word → 1 token');
  assertEq(r.lines.length, 1, 'single word → 1 line');
  const t = r.tokens[0];
  assertEq(t.text, 'Hello', 'token.text');
  assertEq(t.confidence, 0.95, 'token.confidence');
  assertEq(t.isRu, false, 'token.isRu = false for Latin');
  assertEq(t.langCodes[0], 'en', 'token.langCodes en for Latin');
  assertEq(t.pageIndex, 0, 'token.pageIndex = 0');
  assertEq(t.tokenId, 'token_0_0', 'token.tokenId format');
  assertEq(t.bboxPx.x0, 100, 'token.bboxPx.x0');
  assertEq(t.bboxPx.y1, 250, 'token.bboxPx.y1');
  assertClose(t.bboxNorm.nx0, 0.1, 1e-9, 'token.bboxNorm.nx0');
  assertClose(t.bboxNorm.ny0, 0.1, 1e-9, 'token.bboxNorm.ny0');
  assertClose(t.bboxNorm.nx1, 0.3, 1e-9, 'token.bboxNorm.nx1');
  assertClose(t.bboxNorm.ny1, 0.125, 1e-9, 'token.bboxNorm.ny1');

  // Line check
  const line = r.lines[0];
  assertEq(line.text, 'Hello', 'line.text');
  assertEq(line.tokens.length, 1, 'line.tokens length');
  assertEq(line.confidence, 0.95, 'line.confidence');
}

// ============================================================================
// extractTokensFromVision — multi-word paragraph
// ============================================================================
console.log('\n── extractTokensFromVision: multi-word paragraph ─────────');

{
  const vr = buildVisionResponse([
    {
      width: 1000,
      height: 1000,
      blocks: [
        {
          paragraphs: [
            {
              words: [
                buildWord('John', 100, 100, 200, 130, 0.9),
                buildWord('Smith', 210, 100, 320, 130, 0.85),
              ],
              confidence: 0.88,
            },
          ],
        },
      ],
    },
  ]);
  const r = extractTokensFromVision(vr);
  assertEq(r.tokens.length, 2, '2 words → 2 tokens');
  assertEq(r.lines.length, 1, '2 words in 1 paragraph → 1 line');
  assertEq(r.tokens[0].tokenId, 'token_0_0', 'first token id');
  assertEq(r.tokens[1].tokenId, 'token_0_1', 'second token id');
  assertEq(r.lines[0].text, 'John Smith', 'line.text joins with space');
  assertEq(r.lines[0].tokens.length, 2, 'line has both tokens');

  // Union bbox
  assertClose(r.lines[0].bboxNorm.x0, 0.1, 1e-9, 'line union x0');
  assertClose(r.lines[0].bboxNorm.x1, 0.32, 1e-9, 'line union x1');
}

// ============================================================================
// extractTokensFromVision — Cyrillic detection
// ============================================================================
console.log('\n── extractTokensFromVision: Cyrillic detection ───────────');

{
  const vr = buildVisionResponse([
    {
      width: 1000,
      height: 1000,
      blocks: [
        { paragraphs: [{ words: [buildWord('Иван', 50, 50, 200, 80, 0.9)] }] },
      ],
    },
  ]);
  const r = extractTokensFromVision(vr);
  assertEq(r.tokens.length, 1, 'Cyrillic word → 1 token');
  assertEq(r.tokens[0].isRu, true, 'Cyrillic → isRu = true');
  assertEq(r.tokens[0].langCodes[0], 'ru', 'Cyrillic → langCodes ru');
}

// ============================================================================
// extractTokensFromVision — multiple paragraphs/blocks
// ============================================================================
console.log('\n── extractTokensFromVision: multiple paragraphs ──────────');

{
  const vr = buildVisionResponse([
    {
      width: 1000,
      height: 1000,
      blocks: [
        {
          paragraphs: [
            { words: [buildWord('Line1', 100, 100, 200, 130)] },
            { words: [buildWord('Line2', 100, 200, 200, 230)] },
          ],
        },
        {
          paragraphs: [
            { words: [buildWord('Block2', 100, 300, 250, 330)] },
          ],
        },
      ],
    },
  ]);
  const r = extractTokensFromVision(vr);
  assertEq(r.tokens.length, 3, '3 paragraphs across 2 blocks → 3 tokens');
  assertEq(r.lines.length, 3, '3 paragraphs → 3 lines');
  assertEq(r.lines[0].text, 'Line1', 'first line');
  assertEq(r.lines[1].text, 'Line2', 'second line');
  assertEq(r.lines[2].text, 'Block2', 'third line from second block');
  // Token IDs incremental
  assertEq(r.tokens[0].tokenId, 'token_0_0', 'token 0 id');
  assertEq(r.tokens[1].tokenId, 'token_0_1', 'token 1 id');
  assertEq(r.tokens[2].tokenId, 'token_0_2', 'token 2 id');
}

// ============================================================================
// extractTokensFromVision — empty word skipped
// ============================================================================
console.log('\n── extractTokensFromVision: empty word skipping ──────────');

{
  const vr = buildVisionResponse([
    {
      width: 1000,
      height: 1000,
      blocks: [
        {
          paragraphs: [
            {
              words: [
                buildWord('Real', 100, 100, 200, 130),
                { symbols: [], boundingBox: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 10 }] } },
                buildWord('Word', 210, 100, 310, 130),
              ],
            },
          ],
        },
      ],
    },
  ]);
  const r = extractTokensFromVision(vr);
  assertEq(r.tokens.length, 2, 'empty word skipped');
  assertEq(r.lines[0].text, 'Real Word', 'line skips empty word');
}

{
  // Paragraph with only empty words → no line emitted
  const vr = buildVisionResponse([
    {
      width: 1000,
      height: 1000,
      blocks: [
        {
          paragraphs: [
            { words: [{ symbols: [] }, { symbols: [] }] },
            { words: [buildWord('Real', 100, 100, 200, 130)] },
          ],
        },
      ],
    },
  ]);
  const r = extractTokensFromVision(vr);
  assertEq(r.tokens.length, 1, 'empty paragraph contributes 0 tokens');
  assertEq(r.lines.length, 1, 'empty paragraph emits no line');
  assertEq(r.lines[0].text, 'Real', 'remaining line correct');
}

// ============================================================================
// extractTokensFromVision — confidence default
// ============================================================================
console.log('\n── extractTokensFromVision: confidence defaults ──────────');

{
  // Word without confidence → defaults to 0
  const vr = buildVisionResponse([
    {
      width: 1000,
      height: 1000,
      blocks: [
        { paragraphs: [{ words: [buildWord('NoConf', 100, 100, 200, 130)] }] },
      ],
    },
  ]);
  const r = extractTokensFromVision(vr);
  assertEq(r.tokens[0].confidence, 0, 'missing word.confidence defaults to 0');
}

// ============================================================================
// extractTokensFromVision — multi-page, pageIndex selection
// ============================================================================
console.log('\n── extractTokensFromVision: multi-page ───────────────────');

{
  const vr = buildVisionResponse([
    {
      width: 1000,
      height: 1000,
      blocks: [{ paragraphs: [{ words: [buildWord('PageZero', 100, 100, 300, 130)] }] }],
    },
    {
      width: 800,
      height: 1000,
      blocks: [{ paragraphs: [{ words: [buildWord('PageOne', 50, 50, 200, 80)] }] }],
    },
  ]);
  const r0 = extractTokensFromVision(vr, { pageIndex: 0 });
  assertEq(r0.tokens.length, 1, 'page 0 has 1 token');
  assertEq(r0.tokens[0].text, 'PageZero', 'page 0 text');
  assertEq(r0.tokens[0].pageIndex, 0, 'pageIndex stamped on token');

  const r1 = extractTokensFromVision(vr, { pageIndex: 1 });
  assertEq(r1.tokens.length, 1, 'page 1 has 1 token');
  assertEq(r1.tokens[0].text, 'PageOne', 'page 1 text');
  assertEq(r1.tokens[0].pageIndex, 1, 'pageIndex 1 stamped');
  assertEq(r1.tokens[0].tokenId, 'token_1_0', 'token id includes pageIndex');
  // Normalization uses page 1 dimensions (800 wide)
  assertClose(r1.tokens[0].bboxNorm.nx0, 50 / 800, 1e-9, 'page 1 normalized x0 uses page 1 width');
}

// ============================================================================
// Summary
// ============================================================================

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
