#!/usr/bin/env npx tsx
/**
 * Background Normalization Tests — Step 1B.1
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/bgNormalize.test.ts
 * Or with a real image:  npx tsx server/src/ocr/preprocessing/__tests__/bgNormalize.test.ts /path/to/image.jpg
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import sharp from 'sharp';
import { normalizeBackground } from '../bgNormalize';

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
 * Create an image with a gradient background (left=dark, right=bright)
 * plus scattered dark "text" pixels. Simulates uneven scanner illumination.
 */
async function makeGradientWithText(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3);

  let seed = 42;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3;

      // Gradient background: left side ~120, right side ~240
      const bg = 120 + Math.round((x / w) * 120);

      // ~25% chance of dark "text" pixels
      if (rand() < 0.25) {
        // Text darkness relative to local bg (always darker)
        const textVal = Math.max(10, bg - 100);
        raw[off] = textVal; raw[off + 1] = textVal; raw[off + 2] = textVal;
      } else {
        raw[off] = bg; raw[off + 1] = bg; raw[off + 2] = bg;
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Create a uniform background image with scattered text.
 * Background is consistent ~220 everywhere — no gradient.
 */
async function makeUniformWithText(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3);

  let seed = 77;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3;
      const bg = 218 + Math.round(rand() * 4); // 218–222

      if (rand() < 0.20) {
        raw[off] = 30; raw[off + 1] = 30; raw[off + 2] = 30;
      } else {
        raw[off] = bg; raw[off + 1] = bg; raw[off + 2] = bg;
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Create a harsh noise image — random pixel values with high variance.
 * Background normalization should not amplify this.
 */
async function makeNoisyImage(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3);

  let seed = 13;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3;
      // Wide random range: 20–235
      const v = 20 + Math.round(rand() * 215);
      raw[off] = v; raw[off + 1] = v; raw[off + 2] = v;
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function test1_GradientBackground() {
  console.log('\nTest 1: Gradient background with text (should normalize)');
  const img = await makeGradientWithText(800, 600);
  const result = await normalizeBackground(img);

  assert(result.method === 'illumination_flatfield_v1', `method should be illumination_flatfield_v1 (got ${result.method})`);
  assert(result.applied === true, `applied should be true (got ${result.applied}, reasons=${result.reasons})`);
  assert(result.reasons.includes('BG_NORMALIZED'), `reasons should include BG_NORMALIZED (got ${result.reasons})`);
  assert(result.normalizedBuffer !== null, 'normalizedBuffer should not be null');
  assert(result.confidence >= 0.70, `confidence should be >= 0.70 (got ${result.confidence.toFixed(3)})`);

  // After normalization, bg_nonuniformity should decrease
  assert(
    result.metricsAfter.bgNonuniformity < result.metricsBefore.bgNonuniformity,
    `bgNonuniformity should decrease (${result.metricsBefore.bgNonuniformity.toFixed(2)} → ${result.metricsAfter.bgNonuniformity.toFixed(2)})`
  );

  // Output dimensions should match input
  if (result.normalizedBuffer) {
    const outMeta = await sharp(result.normalizedBuffer).metadata();
    assert(outMeta.width === result.inputDimensions.w, `output width matches input (${outMeta.width} vs ${result.inputDimensions.w})`);
    assert(outMeta.height === result.inputDimensions.h, `output height matches input (${outMeta.height} vs ${result.inputDimensions.h})`);
  }
}

async function test2_UniformBackground() {
  console.log('\nTest 2: Uniform background (should not normalize)');
  const img = await makeUniformWithText(800, 600);
  const result = await normalizeBackground(img);

  assert(result.applied === false, `applied should be false (got ${result.applied})`);
  assert(
    result.reasons.includes('BG_NO_IMPROVEMENT'),
    `reasons should include BG_NO_IMPROVEMENT (got ${result.reasons})`
  );
  assert(result.normalizedBuffer === null, 'normalizedBuffer should be null');
}

async function test3_NoisyImage() {
  console.log('\nTest 3: Harsh noise (should not normalize or be uncertain)');
  const img = await makeNoisyImage(800, 600);
  const result = await normalizeBackground(img);

  assert(result.applied === false, `applied should be false (got ${result.applied})`);
  assert(
    result.reasons.includes('BG_UNCERTAIN') || result.reasons.includes('BG_NO_IMPROVEMENT'),
    `reasons should indicate no-op (got ${result.reasons})`
  );
  assert(result.normalizedBuffer === null, 'normalizedBuffer should be null');
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
  const result = await normalizeBackground(buf);

  console.log(`  applied:         ${result.applied}`);
  console.log(`  method:          ${result.method}`);
  console.log(`  confidence:      ${result.confidence.toFixed(3)}`);
  console.log(`  reasons:         ${JSON.stringify(result.reasons)}`);
  console.log(`  inputDims:       ${result.inputDimensions.w}x${result.inputDimensions.h}`);
  console.log(`  before.contrast: ${result.metricsBefore.contrast.toFixed(2)}`);
  console.log(`  before.nonunif:  ${result.metricsBefore.bgNonuniformity.toFixed(2)}`);
  console.log(`  before.otsu:     ${result.metricsBefore.otsuDelta}`);
  console.log(`  after.contrast:  ${result.metricsAfter.contrast.toFixed(2)}`);
  console.log(`  after.nonunif:   ${result.metricsAfter.bgNonuniformity.toFixed(2)}`);
  console.log(`  after.otsu:      ${result.metricsAfter.otsuDelta}`);

  if (result.normalizedBuffer) {
    const outMeta = await sharp(result.normalizedBuffer).metadata();
    console.log(`  outputDims:      ${outMeta.width}x${outMeta.height}`);
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
    console.log('=== Background Normalization Tests ===');

    await test1_GradientBackground();
    await test2_UniformBackground();
    await test3_NoisyImage();

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
