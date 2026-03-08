#!/usr/bin/env npx tsx
/**
 * Split Spread Tests — Step 1A.4
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/splitSpread.test.ts
 * Or with a real image:  npx tsx server/src/ocr/preprocessing/__tests__/splitSpread.test.ts /path/to/image.jpg
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import sharp from 'sharp';
import { detectAndSplitSpread } from '../splitSpread';

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
 * Create a landscape image with two dark content blocks separated by a
 * bright center gutter. Simulates an open book spread scan.
 */
async function makeTwoBlockSpread(
  imgW: number,
  imgH: number,
  gutterWidthPx: number,
  contentDarkness: number // 0–255, lower = darker content
): Promise<Buffer> {
  const raw = Buffer.alloc(imgW * imgH * 3, 255); // white background

  const gutterStart = Math.round(imgW / 2 - gutterWidthPx / 2);
  const gutterEnd = gutterStart + gutterWidthPx;

  // LCG PRNG for deterministic noise
  let seed = 99;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const off = (y * imgW + x) * 3;

      if (x >= gutterStart && x < gutterEnd) {
        // Gutter: bright white
        raw[off] = 250; raw[off + 1] = 250; raw[off + 2] = 250;
      } else {
        // Content: dark pixels with noise (~40% ink density)
        if (rand() < 0.40) {
          raw[off] = contentDarkness;
          raw[off + 1] = contentDarkness;
          raw[off + 2] = contentDarkness;
        } else {
          raw[off] = 240; raw[off + 1] = 240; raw[off + 2] = 240;
        }
      }
    }
  }

  return sharp(raw, { raw: { width: imgW, height: imgH, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Create a uniform content image with no gutter (single page).
 */
async function makeUniformPage(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3);

  let seed = 42;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3;
      // Uniform ~20% ink density everywhere — no valley
      const v = rand() < 0.20 ? 40 : 230;
      raw[off] = v; raw[off + 1] = v; raw[off + 2] = v;
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Create a spread with an extreme off-center gutter (at 30% of width).
 */
async function makeOffCenterSpread(
  imgW: number,
  imgH: number,
  gutterFrac: number,
  gutterWidthPx: number
): Promise<Buffer> {
  const raw = Buffer.alloc(imgW * imgH * 3, 255);

  const gutterCenter = Math.round(imgW * gutterFrac);
  const gutterStart = gutterCenter - Math.round(gutterWidthPx / 2);
  const gutterEnd = gutterCenter + Math.round(gutterWidthPx / 2);

  let seed = 77;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const off = (y * imgW + x) * 3;
      if (x >= gutterStart && x < gutterEnd) {
        raw[off] = 250; raw[off + 1] = 250; raw[off + 2] = 250;
      } else {
        if (rand() < 0.35) {
          raw[off] = 30; raw[off + 1] = 30; raw[off + 2] = 30;
        } else {
          raw[off] = 235; raw[off + 1] = 235; raw[off + 2] = 235;
        }
      }
    }
  }

  return sharp(raw, { raw: { width: imgW, height: imgH, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function test1_ClearGutter() {
  console.log('\nTest 1: Two-block spread with clear center gutter (should split)');
  // 1600x1000 landscape image with 40px bright gutter in center
  const img = await makeTwoBlockSpread(1600, 1000, 40, 30);
  const result = await detectAndSplitSpread(img);

  assert(result.method === 'vertical_density_seam_v1', `method should be vertical_density_seam_v1 (got ${result.method})`);
  assert(result.applied === true, `applied should be true (got ${result.applied}, reasons=${result.reasons})`);
  assert(result.reasons.includes('SPLIT_APPLIED'), `reasons should include SPLIT_APPLIED (got ${result.reasons})`);
  assert(result.leftBuffer !== null, 'leftBuffer should not be null');
  assert(result.rightBuffer !== null, 'rightBuffer should not be null');
  assert(result.confidence >= 0.70, `confidence should be >= 0.70 (got ${result.confidence})`);

  // Split should be near center (40–60% of width)
  const splitFrac = result.splitXPx / 1600;
  assert(splitFrac >= 0.40 && splitFrac <= 0.60, `split at ${(splitFrac * 100).toFixed(1)}% should be 40–60%`);

  // Check output dimensions
  if (result.leftBuffer && result.rightBuffer) {
    const leftMeta = await sharp(result.leftBuffer).metadata();
    const rightMeta = await sharp(result.rightBuffer).metadata();
    assert(leftMeta.width! >= 512, `left width >= 512 (got ${leftMeta.width})`);
    assert(rightMeta.width! >= 512, `right width >= 512 (got ${rightMeta.width})`);
    assert(leftMeta.height === 1000, `left height should be 1000 (got ${leftMeta.height})`);
  }
}

async function test2_NoGutter() {
  console.log('\nTest 2: Uniform content, no gutter (should not split)');
  // 1600x1000 landscape with uniform ink density — no valley
  const img = await makeUniformPage(1600, 1000);
  const result = await detectAndSplitSpread(img);

  assert(result.applied === false, `applied should be false (got ${result.applied})`);
  assert(
    result.reasons.includes('NO_SEAM_FOUND') || result.reasons.includes('SPLIT_UNCERTAIN'),
    `reasons should indicate no-op (got ${result.reasons})`
  );
  assert(result.leftBuffer === null, 'leftBuffer should be null');
  assert(result.rightBuffer === null, 'rightBuffer should be null');
}

async function test3_OffCenterGutter() {
  console.log('\nTest 3: Off-center gutter at 30% (outside search range, should not split or clamp)');
  // Gutter at 30% — outside the default 40–60% search range
  const img = await makeOffCenterSpread(1600, 1000, 0.30, 40);
  const result = await detectAndSplitSpread(img);

  // The gutter is at 30%, which is outside the 40–60% search window.
  // The algorithm should either not find it or find a weaker signal in the center.
  if (result.applied) {
    // If somehow applied, the safety clamp should ensure each side >= 40% width
    assert(result.leftBox.w >= 1600 * 0.38, `left width should be >= ~40% (got ${result.leftBox.w})`);
    assert(result.rightBox.w >= 1600 * 0.38, `right width should be >= ~40% (got ${result.rightBox.w})`);
  } else {
    assert(true, 'not applied is the expected behavior for off-center gutter');
    assert(true, '(placeholder)');
  }
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
  const result = await detectAndSplitSpread(buf);

  console.log(`  applied:      ${result.applied}`);
  console.log(`  method:       ${result.method}`);
  console.log(`  confidence:   ${result.confidence.toFixed(3)}`);
  console.log(`  reasons:      ${JSON.stringify(result.reasons)}`);
  console.log(`  splitXPx:     ${result.splitXPx}`);
  console.log(`  splitXNorm:   ${result.splitXNorm.toFixed(3)}`);
  console.log(`  inputDims:    ${result.inputDimensions.w}x${result.inputDimensions.h}`);
  console.log(`  leftBox:      ${JSON.stringify(result.leftBox)}`);
  console.log(`  rightBox:     ${JSON.stringify(result.rightBox)}`);

  if (result.leftBuffer) {
    const lm = await sharp(result.leftBuffer).metadata();
    console.log(`  leftDims:     ${lm.width}x${lm.height}`);
  }
  if (result.rightBuffer) {
    const rm = await sharp(result.rightBuffer).metadata();
    console.log(`  rightDims:    ${rm.width}x${rm.height}`);
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
    console.log('=== Split Spread Tests ===');

    await test1_ClearGutter();
    await test2_NoGutter();
    await test3_OffCenterGutter();

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
