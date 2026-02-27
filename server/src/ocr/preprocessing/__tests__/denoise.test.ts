#!/usr/bin/env npx tsx
/**
 * Grid-Preserving Denoise Tests — Step 1B.2
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/denoise.test.ts
 * Or with a real image:  npx tsx server/src/ocr/preprocessing/__tests__/denoise.test.ts /path/to/image.jpg
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import sharp from 'sharp';
import { gridPreserveDenoise } from '../denoise';

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
 * Create a ledger-like image with horizontal+vertical grid lines and
 * salt-and-pepper noise scattered over the page.
 */
async function makeGridWithNoise(
  w: number, h: number,
  gridSpacing: number,
  lineThickness: number,
  noiseDensity: number
): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3, 230); // light grey background

  // Draw horizontal grid lines (dark)
  for (let y = gridSpacing; y < h; y += gridSpacing) {
    for (let t = 0; t < lineThickness && y + t < h; t++) {
      for (let x = 0; x < w; x++) {
        const off = ((y + t) * w + x) * 3;
        raw[off] = 40; raw[off + 1] = 40; raw[off + 2] = 40;
      }
    }
  }

  // Draw vertical grid lines (dark)
  for (let x = gridSpacing; x < w; x += gridSpacing) {
    for (let t = 0; t < lineThickness && x + t < w; t++) {
      for (let y = 0; y < h; y++) {
        const off = (y * w + (x + t)) * 3;
        raw[off] = 40; raw[off + 1] = 40; raw[off + 2] = 40;
      }
    }
  }

  // Add salt-and-pepper noise
  let seed = 42;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3;
      if (rand() < noiseDensity) {
        // Salt or pepper: 50/50
        const v = rand() < 0.5 ? 0 : 255;
        raw[off] = v; raw[off + 1] = v; raw[off + 2] = v;
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Create a noisy image with no grid lines.
 */
async function makeNoGridNoise(w: number, h: number, noiseDensity: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3, 220);

  let seed = 77;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // Some scattered "text" blocks
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3;
      // Text-like content in a band
      if (y > 100 && y < 150 && x > 50 && x < 700) {
        if (rand() < 0.5) {
          raw[off] = 30; raw[off + 1] = 30; raw[off + 2] = 30;
        }
      }
      // Noise everywhere
      if (rand() < noiseDensity) {
        const v = rand() < 0.5 ? 10 : 245;
        raw[off] = v; raw[off + 1] = v; raw[off + 2] = v;
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Create a clean image with grid lines and solid text blocks (no noise).
 * Text is rendered as contiguous horizontal bars simulating written text.
 */
async function makeCleanGrid(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3, 230);

  // Draw grid
  const spacing = 80;
  for (let y = spacing; y < h; y += spacing) {
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3;
      raw[off] = 50; raw[off + 1] = 50; raw[off + 2] = 50;
    }
  }
  for (let x = spacing; x < w; x += spacing) {
    for (let y = 0; y < h; y++) {
      const off = (y * w + x) * 3;
      raw[off] = 50; raw[off + 1] = 50; raw[off + 2] = 50;
    }
  }

  // Solid text bars (contiguous, no random scatter)
  // Simulates handwritten text lines within grid cells
  const textBars = [
    { y0: 100, y1: 108, x0: 120, x1: 500 },
    { y0: 115, y1: 123, x0: 130, x1: 480 },
    { y0: 200, y1: 208, x0: 120, x1: 550 },
    { y0: 215, y1: 223, x0: 140, x1: 460 },
    { y0: 300, y1: 308, x0: 110, x1: 520 },
    { y0: 400, y1: 408, x0: 120, x1: 490 },
  ];
  for (const bar of textBars) {
    for (let y = bar.y0; y < bar.y1 && y < h; y++) {
      for (let x = bar.x0; x < bar.x1 && x < w; x++) {
        const off = (y * w + x) * 3;
        raw[off] = 30; raw[off + 1] = 30; raw[off + 2] = 30;
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function test1_GridWithNoise() {
  console.log('\nTest 1: Grid + salt/pepper noise (should denoise, preserving grid)');
  const img = await makeGridWithNoise(800, 600, 60, 2, 0.05);
  const result = await gridPreserveDenoise(img);

  assert(result.method === 'grid_preserve_denoise_v1', `method should be grid_preserve_denoise_v1 (got ${result.method})`);
  assert(result.applied === true, `applied should be true (got ${result.applied}, reasons=${result.reasons})`);
  assert(result.reasons.includes('DENOISE_APPLIED'), `reasons should include DENOISE_APPLIED (got ${result.reasons})`);
  assert(result.denoisedBuffer !== null, 'denoisedBuffer should not be null');
  assert(result.confidence >= 0.70, `confidence should be >= 0.70 (got ${result.confidence.toFixed(3)})`);

  // Speckle count should decrease
  assert(
    result.metricsAfter.speckleCount < result.metricsBefore.speckleCount,
    `speckleCount should decrease (${result.metricsBefore.speckleCount} → ${result.metricsAfter.speckleCount})`
  );

  // Grid coverage should be stable (within 5%)
  const gridDelta = Math.abs(result.metricsAfter.gridCoverage - result.metricsBefore.gridCoverage);
  assert(
    gridDelta <= 0.05,
    `gridCoverage change should be <= 5% (Δ${(gridDelta * 100).toFixed(2)}%)`
  );

  // Output dimensions match
  if (result.denoisedBuffer) {
    const outMeta = await sharp(result.denoisedBuffer).metadata();
    assert(outMeta.width === result.inputDimensions.w, `output width matches (${outMeta.width} vs ${result.inputDimensions.w})`);
    assert(outMeta.height === result.inputDimensions.h, `output height matches (${outMeta.height} vs ${result.inputDimensions.h})`);
  }
}

async function test2_NoGrid() {
  console.log('\nTest 2: No grid + noise (should not over-process)');
  const img = await makeNoGridNoise(800, 600, 0.03);
  const result = await gridPreserveDenoise(img);

  // Should either not apply or apply with appropriate reason
  // The key is it should not damage the image
  assert(
    !result.applied ||
    (result.applied && result.reasons.includes('DENOISE_APPLIED')),
    `should be no-op or mild denoise (applied=${result.applied}, reasons=${result.reasons})`
  );

  // If applied, content pixels should not drop more than 10%
  if (result.applied && result.metricsBefore.contentPixels > 0) {
    const contentDrop = (result.metricsBefore.contentPixels - result.metricsAfter.contentPixels)
      / result.metricsBefore.contentPixels;
    assert(
      contentDrop <= 0.10,
      `content pixel drop should be <= 10% (${(contentDrop * 100).toFixed(1)}%)`
    );
  } else {
    assert(true, 'no content preservation concern (not applied or zero baseline)');
  }
}

async function test3_CleanImage() {
  console.log('\nTest 3: Clean grid, no noise (should be no-op)');
  const img = await makeCleanGrid(800, 600);
  const result = await gridPreserveDenoise(img);

  assert(result.applied === false, `applied should be false (got ${result.applied})`);
  assert(
    result.reasons.includes('DENOISE_NO_IMPROVEMENT') ||
    result.reasons.includes('DENOISE_UNCERTAIN'),
    `reasons should indicate no-op (got ${result.reasons})`
  );
  assert(result.denoisedBuffer === null, 'denoisedBuffer should be null');
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
  const result = await gridPreserveDenoise(buf);

  console.log(`  applied:          ${result.applied}`);
  console.log(`  method:           ${result.method}`);
  console.log(`  confidence:       ${result.confidence.toFixed(3)}`);
  console.log(`  reasons:          ${JSON.stringify(result.reasons)}`);
  console.log(`  inputDims:        ${result.inputDimensions.w}x${result.inputDimensions.h}`);
  console.log(`  before.speckle:   ${result.metricsBefore.speckleCount}`);
  console.log(`  before.gridCov:   ${(result.metricsBefore.gridCoverage * 100).toFixed(2)}%`);
  console.log(`  before.content:   ${result.metricsBefore.contentPixels}`);
  console.log(`  after.speckle:    ${result.metricsAfter.speckleCount}`);
  console.log(`  after.gridCov:    ${(result.metricsAfter.gridCoverage * 100).toFixed(2)}%`);
  console.log(`  after.content:    ${result.metricsAfter.contentPixels}`);

  if (result.denoisedBuffer) {
    const outMeta = await sharp(result.denoisedBuffer).metadata();
    console.log(`  outputDims:       ${outMeta.width}x${outMeta.height}`);
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
    console.log('=== Grid-Preserving Denoise Tests ===');

    await test1_GridWithNoise();
    await test2_NoGrid();
    await test3_CleanImage();

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
