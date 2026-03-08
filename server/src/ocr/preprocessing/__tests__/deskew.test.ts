#!/usr/bin/env npx tsx
/**
 * Deskew Tests — Step 1A.2
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/deskew.test.ts
 * Or with a real image:  npx tsx server/src/ocr/preprocessing/__tests__/deskew.test.ts /path/to/image.jpg
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import sharp from 'sharp';
import { detectAndCorrectSkew } from '../deskew';

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

// ── Synthetic image generators ──────────────────────────────────────────────

/**
 * Create a white image with N horizontal black lines, then rotate by angleDeg.
 * The lines simulate ledger/grid lines in a metrical book.
 */
async function makeImageWithRotatedLines(
  w: number,
  h: number,
  lineCount: number,
  lineThickness: number,
  angleDeg: number
): Promise<Buffer> {
  // Draw horizontal lines on a raw buffer
  const raw = Buffer.alloc(w * h * 3, 255); // white

  const spacing = Math.floor(h / (lineCount + 1));
  for (let i = 1; i <= lineCount; i++) {
    const y0 = i * spacing;
    for (let dy = 0; dy < lineThickness && y0 + dy < h; dy++) {
      const rowOffset = (y0 + dy) * w * 3;
      for (let x = 0; x < w; x++) {
        const offset = rowOffset + x * 3;
        raw[offset] = 0;     // R
        raw[offset + 1] = 0; // G
        raw[offset + 2] = 0; // B
      }
    }
  }

  // Encode, then rotate by the specified angle (simulating a skewed scan)
  let pipeline = sharp(raw, { raw: { width: w, height: h, channels: 3 } });

  if (angleDeg !== 0) {
    pipeline = pipeline.rotate(angleDeg, {
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });
  }

  return pipeline.jpeg({ quality: 95 }).toBuffer();
}

/**
 * Create a plain white image (no lines).
 */
async function makeWhiteImage(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).jpeg().toBuffer();
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function test1_SkewedLines() {
  console.log('\nTest 1: Horizontal lines rotated by +3° (should detect and correct)');
  const img = await makeImageWithRotatedLines(800, 600, 8, 3, 3);
  const result = await detectAndCorrectSkew(img);

  assert(result.method === 'hough_line_deskew_v1', 'method should be hough_line_deskew_v1');
  assert(result.applied === true, `applied should be true (got ${result.applied}, reasons=${result.reasons})`);
  assert(result.reasons.includes('DESKEW_APPLIED'), `reasons should include DESKEW_APPLIED (got ${result.reasons})`);
  assert(result.deskewedBuffer !== null, 'deskewedBuffer should not be null');
  assert(result.lineCount > 0, `lineCount should be > 0 (got ${result.lineCount})`);
  assert(result.confidence >= 0.70, `confidence should be >= 0.70 (got ${result.confidence})`);
  // Detected angle should be roughly +3° (within ±1.5° tolerance given JPEG compression)
  assert(
    Math.abs(result.angleDeg - 3) < 1.5,
    `angle should be near 3° (got ${result.angleDeg.toFixed(3)}°)`
  );
}

async function test2_NoSkew() {
  console.log('\nTest 2: Horizontal lines at 0° (should not apply correction)');
  const img = await makeImageWithRotatedLines(800, 600, 8, 3, 0);
  const result = await detectAndCorrectSkew(img);

  assert(result.applied === false, `applied should be false (got ${result.applied})`);
  // Should either be DESKEW_SMALL_ANGLE (angle ≈ 0) or NO_LINES_FOUND
  const validReasons = ['DESKEW_SMALL_ANGLE', 'NO_LINES_FOUND', 'DESKEW_UNCERTAIN'];
  const hasValid = result.reasons.some(r => validReasons.includes(r));
  assert(hasValid, `reasons should include a no-op reason (got ${result.reasons})`);
  assert(result.deskewedBuffer === null, 'deskewedBuffer should be null');
  assert(Math.abs(result.angleDeg) < 0.35, `angle should be near 0° (got ${result.angleDeg.toFixed(3)}°)`);
}

async function test3_NoLines() {
  console.log('\nTest 3: Plain white image, no lines (should be no-op)');
  const img = await makeWhiteImage(800, 600);
  const result = await detectAndCorrectSkew(img);

  assert(result.applied === false, `applied should be false (got ${result.applied})`);
  assert(
    result.reasons.includes('NO_LINES_FOUND') || result.reasons.includes('DESKEW_UNCERTAIN') || result.reasons.includes('DESKEW_SMALL_ANGLE'),
    `reasons should indicate no-op (got ${result.reasons})`
  );
  assert(result.deskewedBuffer === null, 'deskewedBuffer should be null');
  assert(result.lineCount === 0 || result.confidence < 0.70, `should have 0 lines or low confidence (lines=${result.lineCount}, conf=${result.confidence})`);
}

// ── Manual fixture runner ───────────────────────────────────────────────────

async function testManualFixture(filePath: string) {
  console.log(`\nManual fixture: ${filePath}`);
  const fs = await import('fs');
  if (!fs.existsSync(filePath)) {
    console.error(`  File not found: ${filePath}`);
    failed++;
    return;
  }
  const buf = fs.readFileSync(filePath);
  const result = await detectAndCorrectSkew(buf);

  console.log(`  applied:      ${result.applied}`);
  console.log(`  angle:        ${result.angleDeg.toFixed(3)}°`);
  console.log(`  confidence:   ${result.confidence.toFixed(3)}`);
  console.log(`  reasons:      ${JSON.stringify(result.reasons)}`);
  console.log(`  lineCount:    ${result.lineCount}`);
  console.log(`  angleVar:     ${result.angleVariance.toFixed(4)}`);
  console.log(`  inputDims:    ${result.inputDimensions.w}x${result.inputDimensions.h}`);
  console.log(`  outputDims:   ${result.outputDimensions.w}x${result.outputDimensions.h}`);

  if (result.deskewedBuffer) {
    const meta = await sharp(result.deskewedBuffer).metadata();
    console.log(`  resultDims:   ${meta.width}x${meta.height}`);
  }
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    for (const arg of args) {
      await testManualFixture(arg);
    }
  } else {
    console.log('=== Deskew Tests ===');

    await test1_SkewedLines();
    await test2_NoSkew();
    await test3_NoLines();

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
