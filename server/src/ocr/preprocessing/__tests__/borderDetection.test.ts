#!/usr/bin/env npx tsx
/**
 * Border Detection Tests — Step 1A.1
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/borderDetection.test.ts
 * Or with a real image:  npx tsx server/src/ocr/preprocessing/__tests__/borderDetection.test.ts /path/to/image.jpg
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import sharp from 'sharp';
import { detectAndRemoveBorder } from '../borderDetection';

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

async function makeWhiteImage(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).jpeg().toBuffer();
}

async function makeImageWithBlackBand(
  w: number, h: number,
  band: { edge: 'left' | 'right' | 'top' | 'bottom'; thickness: number }
): Promise<Buffer> {
  // Start with white image as raw buffer, paint black band, encode as JPEG
  const raw = Buffer.alloc(w * h * 3, 255); // white RGB

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inBand = false;
      if (band.edge === 'left' && x < band.thickness) inBand = true;
      if (band.edge === 'right' && x >= w - band.thickness) inBand = true;
      if (band.edge === 'top' && y < band.thickness) inBand = true;
      if (band.edge === 'bottom' && y >= h - band.thickness) inBand = true;

      if (inBand) {
        const offset = (y * w + x) * 3;
        raw[offset] = 0;     // R
        raw[offset + 1] = 0; // G
        raw[offset + 2] = 0; // B
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer();
}

async function makeImageWithBlackBands(
  w: number, h: number,
  bands: Array<{ edge: 'left' | 'right' | 'top' | 'bottom'; thickness: number }>
): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3, 255);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inBand = false;
      for (const band of bands) {
        if (band.edge === 'left' && x < band.thickness) inBand = true;
        if (band.edge === 'right' && x >= w - band.thickness) inBand = true;
        if (band.edge === 'top' && y < band.thickness) inBand = true;
        if (band.edge === 'bottom' && y >= h - band.thickness) inBand = true;
      }
      if (inBand) {
        const offset = (y * w + x) * 3;
        raw[offset] = 0;
        raw[offset + 1] = 0;
        raw[offset + 2] = 0;
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer();
}

async function makeImageWithGradientShadow(w: number, h: number, shadowWidth: number): Promise<Buffer> {
  // Left-side dark gradient (not solid black — simulates shadow)
  const raw = Buffer.alloc(w * h * 3, 255);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < shadowWidth; x++) {
      // Gradient from dark (30) to white (255) across shadowWidth pixels
      const intensity = Math.round(30 + (225 * x) / shadowWidth);
      const offset = (y * w + x) * 3;
      raw[offset] = intensity;
      raw[offset + 1] = intensity;
      raw[offset + 2] = intensity;
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer();
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function test1_BlackBandLeft() {
  console.log('\nTest 1: Thick black band on left edge');
  const img = await makeImageWithBlackBand(800, 600, { edge: 'left', thickness: 50 });
  const result = await detectAndRemoveBorder(img);

  assert(result.applied === true, 'applied should be true');
  assert(result.reasons.includes('BORDER_BLACK'), 'reasons should include BORDER_BLACK');
  assert(result.confidence >= 0.70, `confidence should be >= 0.70 (got ${result.confidence})`);
  assert(result.trimPx.left > 0, `left trim should be > 0 (got ${result.trimPx.left})`);
  assert(result.croppedBuffer !== null, 'croppedBuffer should not be null');
  assert(result.method === 'edge_black_band_profile_v1', 'method should be edge_black_band_profile_v1');

  if (result.croppedBuffer) {
    const meta = await sharp(result.croppedBuffer).metadata();
    assert(meta.width! < 800, `cropped width should be < 800 (got ${meta.width})`);
    assert(meta.height! === 600 || Math.abs(meta.height! - 600) <= 2, `height should be ~600 (got ${meta.height})`);
  }
}

async function test2_BlackBandsAllEdges() {
  console.log('\nTest 2: Black bands on all 4 edges');
  const img = await makeImageWithBlackBands(800, 600, [
    { edge: 'left', thickness: 40 },
    { edge: 'right', thickness: 30 },
    { edge: 'top', thickness: 25 },
    { edge: 'bottom', thickness: 35 },
  ]);
  const result = await detectAndRemoveBorder(img);

  assert(result.applied === true, 'applied should be true');
  assert(result.reasons.includes('BORDER_BLACK'), 'reasons should include BORDER_BLACK');
  assert(result.trimPx.left > 0, `left trim > 0 (got ${result.trimPx.left})`);
  assert(result.trimPx.right > 0, `right trim > 0 (got ${result.trimPx.right})`);
  assert(result.trimPx.top > 0, `top trim > 0 (got ${result.trimPx.top})`);
  assert(result.trimPx.bottom > 0, `bottom trim > 0 (got ${result.trimPx.bottom})`);
  assert(result.croppedBuffer !== null, 'croppedBuffer should not be null');

  if (result.croppedBuffer) {
    const meta = await sharp(result.croppedBuffer).metadata();
    assert(meta.width! < 800, `cropped width < 800 (got ${meta.width})`);
    assert(meta.height! < 600, `cropped height < 600 (got ${meta.height})`);
  }
}

async function test3_GradientShadow() {
  console.log('\nTest 3: Dark gradient shadow on left (should NOT crop)');
  const img = await makeImageWithGradientShadow(800, 600, 60);
  const result = await detectAndRemoveBorder(img);

  // A gradient has high variance, so it should NOT be detected as a border
  // It may detect a very thin band at the darkest edge, but the gradient
  // pixels will have high row variance and should not pass the variance check
  assert(
    result.applied === false || result.trimPx.left < 20,
    `should not aggressively crop shadow (applied=${result.applied}, leftTrim=${result.trimPx.left})`
  );

  if (!result.applied) {
    const hasCorrectReason = result.reasons.includes('NO_BORDER') || result.reasons.includes('BORDER_UNCERTAIN');
    assert(hasCorrectReason, `reasons should be NO_BORDER or BORDER_UNCERTAIN (got ${result.reasons})`);
  }
}

async function test4_NoBorder() {
  console.log('\nTest 4: Clean white image, no border');
  const img = await makeWhiteImage(800, 600);
  const result = await detectAndRemoveBorder(img);

  assert(result.applied === false, 'applied should be false');
  assert(result.reasons.length === 1 && result.reasons[0] === 'NO_BORDER', `reasons should be exactly ["NO_BORDER"] (got ${JSON.stringify(result.reasons)})`);
  assert(result.croppedBuffer === null, 'croppedBuffer should be null');
  assert(result.cropBoxPx.w === 800, `cropBoxPx.w should be 800 (got ${result.cropBoxPx.w})`);
  assert(result.cropBoxPx.h === 600, `cropBoxPx.h should be 600 (got ${result.cropBoxPx.h})`);
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
  const result = await detectAndRemoveBorder(buf);

  console.log(`  applied:    ${result.applied}`);
  console.log(`  confidence: ${result.confidence.toFixed(3)}`);
  console.log(`  reasons:    ${JSON.stringify(result.reasons)}`);
  console.log(`  trimPx:     L=${result.trimPx.left} R=${result.trimPx.right} T=${result.trimPx.top} B=${result.trimPx.bottom}`);
  console.log(`  cropBoxPx:  ${JSON.stringify(result.cropBoxPx)}`);
  console.log(`  origDims:   ${result.originalDimensions.width}x${result.originalDimensions.height}`);

  if (result.croppedBuffer) {
    const meta = await sharp(result.croppedBuffer).metadata();
    console.log(`  resultDims: ${meta.width}x${meta.height}`);
  }
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Manual fixture mode
    for (const arg of args) {
      await testManualFixture(arg);
    }
  } else {
    // Run all synthetic tests
    console.log('=== Border Detection Tests ===');

    await test1_BlackBandLeft();
    await test2_BlackBandsAllEdges();
    await test3_GradientShadow();
    await test4_NoBorder();

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
