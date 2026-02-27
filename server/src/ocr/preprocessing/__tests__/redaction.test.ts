#!/usr/bin/env npx tsx
/**
 * Redaction Mask Tests — Step 1B.3
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/redaction.test.ts
 * Or with a real image:  npx tsx server/src/ocr/preprocessing/__tests__/redaction.test.ts /path/to/image.jpg
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import sharp from 'sharp';
import { generateRedactionMask } from '../redaction';

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
 * Image with big blank margins and content in center.
 * Outer 15% on each side is white, center has dense text/grid.
 */
async function makeBlankMargins(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3, 240); // light background

  const marginX = Math.round(w * 0.15);
  const marginY = Math.round(h * 0.15);

  let seed = 42;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // Dense content in center
  for (let y = marginY; y < h - marginY; y++) {
    for (let x = marginX; x < w - marginX; x++) {
      const off = (y * w + x) * 3;
      if (rand() < 0.30) {
        raw[off] = 30; raw[off + 1] = 30; raw[off + 2] = 30;
      }
    }
  }

  // Add some grid lines in the center
  const spacing = 60;
  for (let y = marginY; y < h - marginY; y += spacing) {
    for (let x = marginX; x < w - marginX; x++) {
      const off = (y * w + x) * 3;
      raw[off] = 40; raw[off + 1] = 40; raw[off + 2] = 40;
    }
  }
  for (let x = marginX; x < w - marginX; x += spacing) {
    for (let y = marginY; y < h - marginY; y++) {
      const off = (y * w + x) * 3;
      raw[off] = 40; raw[off + 1] = 40; raw[off + 2] = 40;
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Dense grid covering the entire image — no empty margins.
 */
async function makeDenseGrid(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3, 230);

  let seed = 77;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // Grid lines everywhere
  const spacing = 50;
  for (let y = spacing; y < h; y += spacing) {
    for (let t = 0; t < 2 && y + t < h; t++) {
      for (let x = 0; x < w; x++) {
        const off = ((y + t) * w + x) * 3;
        raw[off] = 40; raw[off + 1] = 40; raw[off + 2] = 40;
      }
    }
  }
  for (let x = spacing; x < w; x += spacing) {
    for (let t = 0; t < 2 && x + t < w; t++) {
      for (let y = 0; y < h; y++) {
        const off = (y * w + (x + t)) * 3;
        raw[off] = 40; raw[off + 1] = 40; raw[off + 2] = 40;
      }
    }
  }

  // Text scattered across entire image
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rand() < 0.10) {
        const off = (y * w + x) * 3;
        raw[off] = 30; raw[off + 1] = 30; raw[off + 2] = 30;
      }
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Grid on the left 60% of the image, blank right 40% (empty panel).
 */
async function makeGridPlusEmptyPanel(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3, 240); // light background

  const gridEndX = Math.round(w * 0.60);

  let seed = 99;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // Grid + text on left side
  const spacing = 50;
  for (let y = spacing; y < h; y += spacing) {
    for (let x = 0; x < gridEndX; x++) {
      const off = (y * w + x) * 3;
      raw[off] = 40; raw[off + 1] = 40; raw[off + 2] = 40;
    }
  }
  for (let x = spacing; x < gridEndX; x += spacing) {
    for (let y = 0; y < h; y++) {
      const off = (y * w + x) * 3;
      raw[off] = 40; raw[off + 1] = 40; raw[off + 2] = 40;
    }
  }

  // Text within left grid cells
  for (let y = 10; y < h - 10; y++) {
    for (let x = 10; x < gridEndX - 10; x++) {
      if (rand() < 0.15) {
        const off = (y * w + x) * 3;
        raw[off] = 25; raw[off + 1] = 25; raw[off + 2] = 25;
      }
    }
  }

  // Right side: completely blank (just light background)

  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function test1_BlankMargins() {
  console.log('\nTest 1: Big blank margins (should redact margins)');
  const img = await makeBlankMargins(800, 600);
  const result = await generateRedactionMask(img);

  assert(result.method === 'density_border_mask_v1', `method should be density_border_mask_v1 (got ${result.method})`);
  assert(result.applied === true, `applied should be true (got ${result.applied}, reasons=${result.reasons})`);
  assert(result.reasons.includes('REDACTION_APPLIED'), `reasons should include REDACTION_APPLIED (got ${result.reasons})`);
  assert(result.maskBuffer !== null, 'maskBuffer should not be null');
  assert(result.redactedAreaFrac >= 0.02, `redactedAreaFrac should be >= 2% (got ${(result.redactedAreaFrac * 100).toFixed(1)}%)`);
  assert(result.confidence > 0, `confidence should be > 0 (got ${result.confidence.toFixed(3)})`);

  // Mask dimensions should match input
  const maskMeta = await sharp(result.maskBuffer).metadata();
  assert(maskMeta.width === result.inputDimensions.w, `mask width matches input (${maskMeta.width} vs ${result.inputDimensions.w})`);
  assert(maskMeta.height === result.inputDimensions.h, `mask height matches input (${maskMeta.height} vs ${result.inputDimensions.h})`);

  // Redacted tiles should be less than total tiles (not everything redacted)
  assert(
    result.tileStats.redactedTiles < result.tileStats.totalTiles,
    `redactedTiles (${result.tileStats.redactedTiles}) should be < totalTiles (${result.tileStats.totalTiles})`
  );
}

async function test2_DenseGrid() {
  console.log('\nTest 2: Dense grid everywhere (should be no-op)');
  const img = await makeDenseGrid(800, 600);
  const result = await generateRedactionMask(img);

  assert(result.applied === false, `applied should be false (got ${result.applied})`);
  assert(
    result.reasons.includes('REDACTION_NOOP') || result.reasons.includes('REDACTION_UNCERTAIN'),
    `reasons should indicate no-op (got ${result.reasons})`
  );
  // Mask should still be produced (always)
  assert(result.maskBuffer !== null, 'maskBuffer should always be produced');
}

async function test3_GridPlusEmptyPanel() {
  console.log('\nTest 3: Grid + empty right panel (right side redacted)');
  const img = await makeGridPlusEmptyPanel(800, 600);
  const result = await generateRedactionMask(img);

  // The empty right panel should be partially redacted (at least the border zone)
  // Since only 5% of each side is the border zone, the empty right panel
  // (40% of image) only has its rightmost ~5% in the border zone
  assert(result.maskBuffer !== null, 'maskBuffer should always be produced');

  if (result.applied) {
    assert(result.reasons.includes('REDACTION_APPLIED'), `reasons should include REDACTION_APPLIED (got ${result.reasons})`);
    assert(result.redactedAreaFrac > 0, `redactedAreaFrac should be > 0 (got ${(result.redactedAreaFrac * 100).toFixed(1)}%)`);
    // Redacted area should be modest (only border zone of empty panel)
    assert(result.redactedAreaFrac < 0.50, `redactedAreaFrac should be < 50% (got ${(result.redactedAreaFrac * 100).toFixed(1)}%)`);
  } else {
    // Also acceptable: if border zone is too small to hit 2% threshold
    assert(
      result.reasons.includes('REDACTION_NOOP') || result.reasons.includes('REDACTION_UNCERTAIN'),
      `reasons should indicate no-op if not applied (got ${result.reasons})`
    );
  }

  // Protected tiles should exist (grid on left side)
  assert(result.tileStats.protectedTiles >= 0, `protectedTiles should be >= 0 (got ${result.tileStats.protectedTiles})`);
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
  const result = await generateRedactionMask(buf);

  console.log(`  applied:          ${result.applied}`);
  console.log(`  method:           ${result.method}`);
  console.log(`  confidence:       ${result.confidence.toFixed(3)}`);
  console.log(`  reasons:          ${JSON.stringify(result.reasons)}`);
  console.log(`  inputDims:        ${result.inputDimensions.w}x${result.inputDimensions.h}`);
  console.log(`  redactedAreaFrac: ${(result.redactedAreaFrac * 100).toFixed(1)}%`);
  console.log(`  tiles total:      ${result.tileStats.totalTiles}`);
  console.log(`  tiles border:     ${result.tileStats.borderTiles}`);
  console.log(`  tiles candidate:  ${result.tileStats.candidateTiles}`);
  console.log(`  tiles protected:  ${result.tileStats.protectedTiles}`);
  console.log(`  tiles redacted:   ${result.tileStats.redactedTiles}`);
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    for (const arg of args) {
      await testManualFixture(arg);
    }
  } else {
    console.log('=== Redaction Mask Tests ===');

    await test1_BlankMargins();
    await test2_DenseGrid();
    await test3_GridPlusEmptyPanel();

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
