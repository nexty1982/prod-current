#!/usr/bin/env npx tsx
/**
 * layoutExtractor Tests
 *
 * Run:  npx tsx server/src/ocr/__tests__/layoutExtractor.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import {
  extractLayoutFields,
  __test__,
  type LayoutExtractorConfig,
  type Token,
  type VisionResponse,
  type NormalizedBBox,
} from '../layoutExtractor';

const {
  verticesToPixelBBox,
  pixelToNormalized,
  normalizedToPixel,
  bboxOverlap,
  normalizeText,
  clusterTokensIntoLines,
  matchPhraseInLine,
  computeSearchZone,
  joinTokensInReadingOrder,
  computeUnionBBox,
} = __test__;

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
    console.error(
      `  FAIL: ${message}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`
    );
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function assertClose(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) > tol) {
    console.error(
      `  FAIL: ${message}\n    expected: ${expected} (±${tol})\n    actual:   ${actual}`
    );
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

// ── verticesToPixelBBox ──────────────────────────────────────────────────────

function testVerticesToPixelBBox(): void {
  console.log('\n[verticesToPixelBBox]');

  const v = verticesToPixelBBox([
    { x: 10, y: 20 },
    { x: 100, y: 20 },
    { x: 100, y: 50 },
    { x: 10, y: 50 },
  ]);
  assert(v !== null, 'returns non-null for valid 4-vertex polygon');
  assertEq(v!.x0, 10, 'x0 is min x');
  assertEq(v!.y0, 20, 'y0 is min y');
  assertEq(v!.x1, 100, 'x1 is max x');
  assertEq(v!.y1, 50, 'y1 is max y');

  assertEq(verticesToPixelBBox(undefined), null, 'undefined returns null');
  assertEq(verticesToPixelBBox([]), null, 'empty array returns null');
  assertEq(
    verticesToPixelBBox([{ x: 1, y: 1 }, { x: 2, y: 2 }]),
    null,
    'less than 4 vertices returns null'
  );

  // Missing x/y should default to 0
  const v2 = verticesToPixelBBox([
    { x: 10, y: 20 } as any,
    { y: 20 } as any,
    { x: 100 } as any,
    {} as any,
  ]);
  assert(v2 !== null, 'handles missing coordinates with 0 defaults');
  assertEq(v2!.x0, 0, 'min x defaults to 0 when fields missing');
}

// ── pixelToNormalized & normalizedToPixel ─────────────────────────────────────

function testPixelToNormalizedRoundtrip(): void {
  console.log('\n[pixelToNormalized / normalizedToPixel]');

  const px = { x0: 250, y0: 100, x1: 750, y1: 400 };
  const norm = pixelToNormalized(px, 1000, 800);
  assertClose(norm.x0, 0.25, 1e-9, 'x0 / width');
  assertClose(norm.y0, 0.125, 1e-9, 'y0 / height');
  assertClose(norm.x1, 0.75, 1e-9, 'x1 / width');
  assertClose(norm.y1, 0.5, 1e-9, 'y1 / height');

  const back = normalizedToPixel(norm, 1000, 800);
  assertClose(back.x, 250, 1e-9, 'roundtrip x');
  assertClose(back.y, 100, 1e-9, 'roundtrip y');
  assertClose(back.w, 500, 1e-9, 'roundtrip width');
  assertClose(back.h, 300, 1e-9, 'roundtrip height');
}

// ── bboxOverlap ───────────────────────────────────────────────────────────────

function testBboxOverlap(): void {
  console.log('\n[bboxOverlap]');

  const a: NormalizedBBox = { x0: 0, y0: 0, x1: 1, y1: 1 };
  const b: NormalizedBBox = { x0: 0, y0: 0, x1: 1, y1: 1 };
  assertEq(bboxOverlap(a, b), 1, 'identical boxes → 1.0');

  const half: NormalizedBBox = { x0: 0, y0: 0, x1: 0.5, y1: 1 };
  assertClose(bboxOverlap(a, half), 0.5, 1e-9, 'b covers half of a');

  const disjoint: NormalizedBBox = { x0: 2, y0: 2, x1: 3, y1: 3 };
  assertEq(bboxOverlap(a, disjoint), 0, 'disjoint → 0');

  // Zero-area a → 0
  const zero: NormalizedBBox = { x0: 0.1, y0: 0.1, x1: 0.1, y1: 0.1 };
  assertEq(bboxOverlap(zero, a), 0, 'zero-area a → 0');

  // a entirely inside b → 1
  const inner: NormalizedBBox = { x0: 0.2, y0: 0.2, x1: 0.4, y1: 0.4 };
  assertClose(bboxOverlap(inner, a), 1.0, 1e-9, 'inner inside outer → 1.0');
}

// ── normalizeText ─────────────────────────────────────────────────────────────

function testNormalizeText(): void {
  console.log('\n[normalizeText]');

  assertEq(normalizeText('Hello, world!'), 'HELLO WORLD', 'punctuation stripped, uppercased');
  assertEq(normalizeText('  Date of Birth  '), 'DATE OF BIRTH', 'whitespace trimmed');
  assertEq(normalizeText("priest's"), 'PRIESTS', 'apostrophe stripped');
  assertEq(normalizeText(''), '', 'empty string');
}

// ── clusterTokensIntoLines ────────────────────────────────────────────────────

function makeToken(text: string, x0: number, y0: number, x1: number, y1: number, conf = 1): Token {
  return {
    text,
    confidence: conf,
    langCodes: ['en'],
    bboxPx: { x0: x0 * 1000, y0: y0 * 800, x1: x1 * 1000, y1: y1 * 800 },
    bboxNorm: { nx0: x0, ny0: y0, nx1: x1, ny1: y1 },
    pageIndex: 0,
    isRu: false,
    tokenId: `t_${Math.random()}`,
  };
}

function testClusterTokensIntoLines(): void {
  console.log('\n[clusterTokensIntoLines]');

  // Three tokens on line 1, two tokens on line 2
  const tokens = [
    makeToken('A', 0.1, 0.1, 0.15, 0.12),
    makeToken('B', 0.2, 0.1, 0.25, 0.12),
    makeToken('C', 0.3, 0.1, 0.35, 0.12),
    makeToken('D', 0.1, 0.2, 0.15, 0.22),
    makeToken('E', 0.2, 0.2, 0.25, 0.22),
  ];

  const lines = clusterTokensIntoLines(tokens);
  assertEq(lines.length, 2, 'two lines detected');
  assertEq(lines[0].tokens.length, 3, 'first line has 3 tokens');
  assertEq(lines[1].tokens.length, 2, 'second line has 2 tokens');
  // Within a line, tokens should be sorted left to right
  assertEq(lines[0].tokens[0].text, 'A', 'first line: A first');
  assertEq(lines[0].tokens[2].text, 'C', 'first line: C last');

  assertEq(clusterTokensIntoLines([]).length, 0, 'empty input → empty lines');
}

// ── matchPhraseInLine ─────────────────────────────────────────────────────────

function testMatchPhraseInLine(): void {
  console.log('\n[matchPhraseInLine]');

  const tokens = [
    makeToken('DATE', 0.1, 0.1, 0.15, 0.12),
    makeToken('OF', 0.16, 0.1, 0.18, 0.12),
    makeToken('BIRTH', 0.19, 0.1, 0.25, 0.12),
  ];
  const line = clusterTokensIntoLines(tokens)[0];

  const m = matchPhraseInLine(line, 'date of birth');
  assert(m !== null, 'matches "date of birth" case-insensitively');
  assertEq(m!.length, 3, 'returns all 3 matched tokens');

  const m2 = matchPhraseInLine(line, 'date of death');
  assertEq(m2, null, 'does not match "date of death"');

  // Phrase longer than line
  const m3 = matchPhraseInLine(line, 'date of birth in the year');
  assertEq(m3, null, 'phrase longer than line → null');

  // Empty phrase
  assertEq(matchPhraseInLine(line, ''), null, 'empty phrase → null');
  assertEq(matchPhraseInLine(line, '   '), null, 'whitespace phrase → null');
}

// ── computeSearchZone ─────────────────────────────────────────────────────────

function testComputeSearchZoneBelow(): void {
  console.log('\n[computeSearchZone — below]');

  const anchorBBox: NormalizedBBox = { x0: 0.2, y0: 0.1, x1: 0.4, y1: 0.12 };
  const zone = computeSearchZone(
    anchorBBox,
    {
      phrases: ['anchor'],
      direction: 'below',
      zonePadding: { left: 0.01, right: 0.01, top: 0.005, bottom: 0 },
      zoneExtent: { width: 0.3, height: 0.05 },
    },
    1000,
    800
  );

  // Below: y0 = anchorBBox.y1 + top padding
  assertClose(zone.y0, 0.125, 1e-9, 'y0 starts below anchor');
  // x0 = anchorBBox.x0 - left padding
  assertClose(zone.x0, 0.19, 1e-9, 'x0 padded left from anchor');
  // x1 = x0 + zoneExtent.width
  assertClose(zone.x1, 0.49, 1e-9, 'x1 is x0 + zoneExtent.width');
}

function testComputeSearchZoneRight(): void {
  console.log('\n[computeSearchZone — right]');

  const anchorBBox: NormalizedBBox = { x0: 0.2, y0: 0.1, x1: 0.4, y1: 0.12 };
  const zone = computeSearchZone(
    anchorBBox,
    {
      phrases: ['anchor'],
      direction: 'right',
      zonePadding: { left: 0.01, right: 0, top: 0.005, bottom: 0.005 },
      zoneExtent: 'toPageEdge',
    },
    1000,
    800
  );

  // Right + toPageEdge: x1 should be 1.0
  assertEq(zone.x1, 1.0, 'x1 extends to page edge');
  // x0 = anchorBBox.x1 + left padding
  assertClose(zone.x0, 0.41, 1e-9, 'x0 starts right of anchor');
}

function testComputeSearchZoneClamped(): void {
  console.log('\n[computeSearchZone — clamped to [0,1]]');

  // Anchor at far right, large width should clamp to 1.0
  const anchorBBox: NormalizedBBox = { x0: 0.95, y0: 0.95, x1: 0.99, y1: 0.97 };
  const zone = computeSearchZone(
    anchorBBox,
    {
      phrases: ['x'],
      direction: 'right',
      zonePadding: { left: 0, right: 0, top: 0, bottom: 0 },
      zoneExtent: { width: 0.5, height: 0.1 },
    },
    1000,
    800
  );
  assert(zone.x1 <= 1.0, 'x1 clamped to <= 1.0');
  assert(zone.x0 >= 0 && zone.x0 <= 1, 'x0 in [0,1]');
  assert(zone.y0 >= 0 && zone.y0 <= 1, 'y0 in [0,1]');
  assert(zone.y1 >= 0 && zone.y1 <= 1, 'y1 in [0,1]');
}

// ── joinTokensInReadingOrder ──────────────────────────────────────────────────

function testJoinTokensInReadingOrder(): void {
  console.log('\n[joinTokensInReadingOrder]');

  // Out of order — should be joined left-to-right top-to-bottom
  const tokens = [
    makeToken('world', 0.2, 0.1, 0.3, 0.12),
    makeToken('Hello', 0.1, 0.1, 0.18, 0.12),
  ];
  assertEq(joinTokensInReadingOrder(tokens), 'Hello world', 'sorted left-to-right');

  // Two lines
  const twoLineTokens = [
    makeToken('line1', 0.1, 0.1, 0.2, 0.12),
    makeToken('line2', 0.1, 0.2, 0.2, 0.22),
  ];
  const result = joinTokensInReadingOrder(twoLineTokens);
  assert(result.includes('line1'), 'contains line1');
  assert(result.includes('line2'), 'contains line2');
  assert(result.includes('\n'), 'inserts newline between separate lines');

  assertEq(joinTokensInReadingOrder([]), '', 'empty array → empty string');
}

// ── computeUnionBBox ──────────────────────────────────────────────────────────

function testComputeUnionBBox(): void {
  console.log('\n[computeUnionBBox]');

  const tokens = [
    makeToken('a', 0.1, 0.1, 0.2, 0.12),
    makeToken('b', 0.3, 0.15, 0.4, 0.18),
  ];
  const u = computeUnionBBox(tokens, 1000, 800);
  assert(u !== null, 'non-null result');
  assertClose(u!.norm.x0, 0.1, 1e-9, 'norm x0 = min');
  assertClose(u!.norm.y0, 0.1, 1e-9, 'norm y0 = min');
  assertClose(u!.norm.x1, 0.4, 1e-9, 'norm x1 = max');
  assertClose(u!.norm.y1, 0.18, 1e-9, 'norm y1 = max');
  assertClose(u!.px.x, 100, 1e-9, 'px x rescaled');
  assertClose(u!.px.w, 300, 1e-9, 'px w rescaled');

  assertEq(computeUnionBBox([], 1000, 800), null, 'empty tokens → null');
}

// ── extractLayoutFields end-to-end ────────────────────────────────────────────

/**
 * Build a synthetic VisionResponse where each "word" corresponds to a single
 * symbol with a bounding box. Tokens are listed in {text, x0, y0, x1, y1, conf}
 * tuples for compactness.
 */
function buildVisionResponse(
  tokens: Array<{ text: string; x0: number; y0: number; x1: number; y1: number; conf?: number; lang?: string }>
): VisionResponse {
  const langs = Array.from(new Set(tokens.map(t => t.lang || 'en')));
  return {
    fullTextAnnotation: {
      pages: [
        {
          blocks: [
            {
              detectedLanguages: langs.map(lc => ({ languageCode: lc, confidence: 1 })),
              paragraphs: [
                {
                  detectedLanguages: langs.map(lc => ({ languageCode: lc, confidence: 1 })),
                  words: tokens.map(t => ({
                    confidence: t.conf ?? 0.95,
                    symbols: [
                      {
                        text: t.text,
                        confidence: t.conf ?? 0.95,
                        boundingBox: {
                          vertices: [
                            { x: t.x0, y: t.y0 },
                            { x: t.x1, y: t.y0 },
                            { x: t.x1, y: t.y1 },
                            { x: t.x0, y: t.y1 },
                          ],
                        },
                      },
                    ],
                  })),
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function testExtractLayoutFieldsEndToEnd(): void {
  console.log('\n[extractLayoutFields — end to end with custom anchors]');

  // Anchor "DATE OF BIRTH" at (100,100)-(300,120). Value below it.
  // imageWidth=1000, imageHeight=800
  const vr = buildVisionResponse([
    { text: 'DATE', x0: 100, y0: 100, x1: 150, y1: 120 },
    { text: 'OF', x0: 160, y0: 100, x1: 180, y1: 120 },
    { text: 'BIRTH', x0: 190, y0: 100, x1: 280, y1: 120 },
    // Value tokens directly below the anchor
    { text: '1923-05-12', x0: 100, y0: 130, x1: 280, y1: 150 },
    // Decoy on a different row
    { text: 'unrelated', x0: 500, y0: 400, x1: 600, y1: 420 },
  ]);

  const config: LayoutExtractorConfig = {
    confidenceThreshold: 0.5,
    imageWidth: 1000,
    imageHeight: 800,
    recordType: 'baptism',
    entryAreas: [{ entryId: 'entry_1', bbox: { x: 0, y: 0, w: 1000, h: 800 } }],
  };

  const customAnchors = {
    date_of_birth: {
      phrases: ['date of birth'],
      direction: 'below' as const,
      zonePadding: { left: 0, right: 0.05, top: 0.005, bottom: 0 },
      zoneExtent: { width: 0.25, height: 0.05 },
    },
  };

  const result = extractLayoutFields(vr, config, customAnchors);

  // Anchor should have been detected
  const anchor = result.anchors.find(a => a.fieldKey === 'date_of_birth');
  assert(!!anchor, 'date_of_birth anchor detected');
  assertEq(anchor!.phrase, 'date of birth', 'anchor phrase recorded');

  // Field should be present (entryId-prefixed)
  const field = result.fields['entry_1_date_of_birth'];
  assert(!!field, 'extracted field is present under entry_1_date_of_birth');
  assert(
    !!field && field.extractedText.includes('1923-05-12'),
    `extracted text contains the date (got "${field?.extractedText}")`
  );
  assert(field.tokensUsedCount >= 1, 'at least one token contributed');
  assert(
    !field.extractedText.includes('unrelated'),
    'decoy outside the search zone was excluded'
  );
}

function testExtractLayoutFieldsNoMatch(): void {
  console.log('\n[extractLayoutFields — no anchor match]');

  const vr = buildVisionResponse([
    { text: 'random', x0: 100, y0: 100, x1: 200, y1: 120 },
    { text: 'data', x0: 210, y0: 100, x1: 280, y1: 120 },
  ]);

  const config: LayoutExtractorConfig = {
    confidenceThreshold: 0.5,
    imageWidth: 1000,
    imageHeight: 800,
    recordType: 'baptism',
    entryAreas: [{ entryId: 'entry_1', bbox: { x: 0, y: 0, w: 1000, h: 800 } }],
  };

  const customAnchors = {
    date_of_birth: {
      phrases: ['date of birth'],
      direction: 'below' as const,
      zonePadding: { left: 0, right: 0, top: 0, bottom: 0 },
      zoneExtent: { width: 0.25, height: 0.05 },
    },
  };

  const result = extractLayoutFields(vr, config, customAnchors);
  assertEq(
    Object.keys(result.fields).length,
    0,
    'no fields extracted when no anchor matches'
  );
  assertEq(result.anchors.length, 0, 'no anchors recorded');
}

function testExtractLayoutFieldsRussianFiltered(): void {
  console.log('\n[extractLayoutFields — Russian tokens filtered]');

  const vr: VisionResponse = {
    fullTextAnnotation: {
      pages: [
        {
          blocks: [
            {
              detectedLanguages: [{ languageCode: 'en', confidence: 1 }],
              paragraphs: [
                {
                  detectedLanguages: [{ languageCode: 'en', confidence: 1 }],
                  words: [
                    {
                      symbols: [
                        {
                          text: 'NAME',
                          confidence: 0.95,
                          boundingBox: {
                            vertices: [
                              { x: 100, y: 100 },
                              { x: 200, y: 100 },
                              { x: 200, y: 120 },
                              { x: 100, y: 120 },
                            ],
                          },
                        },
                      ],
                    },
                    {
                      symbols: [
                        {
                          text: 'John',
                          confidence: 0.95,
                          boundingBox: {
                            vertices: [
                              { x: 100, y: 130 },
                              { x: 200, y: 130 },
                              { x: 200, y: 150 },
                              { x: 100, y: 150 },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            // Separate Russian-only block — its tokens should be filtered out
            {
              detectedLanguages: [{ languageCode: 'ru', confidence: 1 }],
              paragraphs: [
                {
                  detectedLanguages: [{ languageCode: 'ru', confidence: 1 }],
                  words: [
                    {
                      symbols: [
                        {
                          text: 'Иван',
                          confidence: 0.95,
                          boundingBox: {
                            vertices: [
                              { x: 100, y: 135 },
                              { x: 200, y: 135 },
                              { x: 200, y: 145 },
                              { x: 100, y: 145 },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const config: LayoutExtractorConfig = {
    confidenceThreshold: 0.5,
    imageWidth: 1000,
    imageHeight: 800,
    recordType: 'baptism',
    entryAreas: [{ entryId: 'entry_1', bbox: { x: 0, y: 0, w: 1000, h: 800 } }],
  };

  const customAnchors = {
    child_name: {
      phrases: ['name'],
      direction: 'below' as const,
      zonePadding: { left: 0, right: 0.1, top: 0.005, bottom: 0 },
      zoneExtent: { width: 0.3, height: 0.05 },
    },
  };

  const result = extractLayoutFields(vr, config, customAnchors);
  const field = result.fields['entry_1_child_name'];
  assert(!!field, 'child_name extracted');
  assert(
    !!field && field.extractedText.includes('John'),
    'extracted text contains English value'
  );
  assert(
    !!field && !field.extractedText.includes('Иван'),
    'Russian token filtered out'
  );
}

// ── Main runner ──────────────────────────────────────────────────────────────

function main(): void {
  console.log('=== layoutExtractor tests ===');

  testVerticesToPixelBBox();
  testPixelToNormalizedRoundtrip();
  testBboxOverlap();
  testNormalizeText();
  testClusterTokensIntoLines();
  testMatchPhraseInLine();
  testComputeSearchZoneBelow();
  testComputeSearchZoneRight();
  testComputeSearchZoneClamped();
  testJoinTokensInReadingOrder();
  testComputeUnionBBox();
  testExtractLayoutFieldsEndToEnd();
  testExtractLayoutFieldsNoMatch();
  testExtractLayoutFieldsRussianFiltered();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
