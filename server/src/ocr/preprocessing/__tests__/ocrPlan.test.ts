#!/usr/bin/env npx tsx
/**
 * OCR Plan Generator Tests — Phase 2.1
 *
 * Run:  npx tsx server/src/ocr/preprocessing/__tests__/ocrPlan.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import sharp from 'sharp';
import { generateOcrPlan } from '../ocrPlan';

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

// ── Mask generators ──────────────────────────────────────────────────────────

/**
 * Mask with big blank (black) margins and a white center content region.
 * This simulates a redaction mask where borders are redacted (black)
 * and the content area is kept (white).
 */
async function makeMaskWithRedactedMargins(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h, 0); // all black (redacted)

  // White content in center 70%
  const marginX = Math.round(w * 0.15);
  const marginY = Math.round(h * 0.15);

  for (let y = marginY; y < h - marginY; y++) {
    for (let x = marginX; x < w - marginX; x++) {
      raw[y * w + x] = 255;
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
}

/**
 * Fully white mask (no redaction at all) — content everywhere.
 */
async function makeFullWhiteMask(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h, 255);
  return sharp(raw, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
}

/**
 * Mask with two separate content regions: left column and right column,
 * separated by a redacted (black) vertical strip in the middle.
 */
async function makeTwoColumnMask(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h, 0); // all black

  const col1Start = Math.round(w * 0.05);
  const col1End = Math.round(w * 0.42);
  const col2Start = Math.round(w * 0.58);
  const col2End = Math.round(w * 0.95);
  const topPad = Math.round(h * 0.05);
  const bottomPad = Math.round(h * 0.95);

  // Left column
  for (let y = topPad; y < bottomPad; y++) {
    for (let x = col1Start; x < col1End; x++) {
      raw[y * w + x] = 255;
    }
  }

  // Right column
  for (let y = topPad; y < bottomPad; y++) {
    for (let x = col2Start; x < col2End; x++) {
      raw[y * w + x] = 255;
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
}

/**
 * Mask with very little content (< 30%) — should trigger LOW_CONTENT fallback.
 */
async function makeSparseContentMask(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h, 0); // all black

  // Small white patch (15% of image)
  const patchW = Math.round(w * 0.3);
  const patchH = Math.round(h * 0.15);
  const startX = Math.round(w * 0.35);
  const startY = Math.round(h * 0.4);

  for (let y = startY; y < startY + patchH && y < h; y++) {
    for (let x = startX; x < startX + patchW && x < w; x++) {
      raw[y * w + x] = 255;
    }
  }

  return sharp(raw, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function test1_RedactedMargins() {
  console.log('\nTest 1: Redacted margins — single content region');
  const mask = await makeMaskWithRedactedMargins(800, 600);
  const result = await generateOcrPlan(mask, 800, 600);

  assert(result.method === 'mask_connected_regions_v1', `method should be mask_connected_regions_v1 (got ${result.method})`);
  assert(result.useRegions === true, `useRegions should be true (got ${result.useRegions})`);
  assert(result.regions.length === 1, `should have 1 region (got ${result.regions.length})`);
  assert(result.reasons.includes('OCR_PLAN_REGIONS'), `reasons should include OCR_PLAN_REGIONS (got ${result.reasons})`);
  assert(result.contentFrac > 0.40 && result.contentFrac < 0.80, `contentFrac should be 40-80% (got ${(result.contentFrac * 100).toFixed(1)}%)`);

  // Region should cover roughly the center 70%
  if (result.regions.length > 0) {
    const r = result.regions[0];
    assert(r.box.x > 50, `region x should be offset from left (got ${r.box.x})`);
    assert(r.box.y > 30, `region y should be offset from top (got ${r.box.y})`);
    assert(r.box.w < 700, `region w should be less than full width (got ${r.box.w})`);
    assert(r.box.h < 500, `region h should be less than full height (got ${r.box.h})`);
    assert(r.areaFrac > 0.30, `region area frac should be > 30% (got ${(r.areaFrac * 100).toFixed(1)}%)`);
    assert(r.boxNorm.x > 0.05, `boxNorm.x should be > 0.05 (got ${r.boxNorm.x.toFixed(3)})`);
  }
}

async function test2_FullContent() {
  console.log('\nTest 2: Fully white mask — should fallback (no benefit)');
  const mask = await makeFullWhiteMask(800, 600);
  const result = await generateOcrPlan(mask, 800, 600);

  assert(result.useRegions === false, `useRegions should be false (got ${result.useRegions})`);
  assert(result.regions.length === 0, `should have 0 regions (got ${result.regions.length})`);
  assert(result.reasons.includes('OCR_PLAN_FULL_CONTENT'), `reasons should include OCR_PLAN_FULL_CONTENT (got ${result.reasons})`);
  assert(result.contentFrac > 0.95, `contentFrac should be > 95% (got ${(result.contentFrac * 100).toFixed(1)}%)`);
}

async function test3_TwoColumns() {
  console.log('\nTest 3: Two-column mask — should produce 2 regions');
  const mask = await makeTwoColumnMask(800, 600);
  const result = await generateOcrPlan(mask, 800, 600);

  assert(result.useRegions === true, `useRegions should be true (got ${result.useRegions})`);
  assert(result.regions.length === 2, `should have 2 regions (got ${result.regions.length})`);
  assert(result.reasons.includes('OCR_PLAN_REGIONS'), `reasons should include OCR_PLAN_REGIONS (got ${result.reasons})`);

  if (result.regions.length === 2) {
    // Regions sorted by reading order (Y then X)
    const r0 = result.regions[0];
    const r1 = result.regions[1];
    // Left column should be before right column
    assert(r0.box.x < r1.box.x, `region 0 x (${r0.box.x}) should be < region 1 x (${r1.box.x})`);
    // Each column should cover roughly 37% width
    assert(r0.box.w > 200 && r0.box.w < 500, `region 0 width should be 200-500px (got ${r0.box.w})`);
    assert(r1.box.w > 200 && r1.box.w < 500, `region 1 width should be 200-500px (got ${r1.box.w})`);
  }
}

async function test4_SparseContent() {
  console.log('\nTest 4: Sparse content (< 30%) — should fallback');
  const mask = await makeSparseContentMask(800, 600);
  const result = await generateOcrPlan(mask, 800, 600);

  assert(result.useRegions === false, `useRegions should be false (got ${result.useRegions})`);
  assert(result.reasons.some(r => r.includes('LOW_CONTENT')), `reasons should include LOW_CONTENT (got ${result.reasons})`);
  assert(result.contentFrac < 0.30, `contentFrac should be < 30% (got ${(result.contentFrac * 100).toFixed(1)}%)`);
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== OCR Plan Generator Tests ===');

  await test1_RedactedMargins();
  await test2_FullContent();
  await test3_TwoColumns();
  await test4_SparseContent();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
