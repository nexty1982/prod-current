/**
 * Split Spread Detection — Step 1A.4
 *
 * Detects a vertical center seam in book-scan spreads (two ledger pages
 * side-by-side) and splits into left/right page images.
 *
 * Algorithm: vertical_density_seam_v1
 *   1. Downscale → greyscale
 *   2. Compute vertical ink-density profile (column-wise mean intensity)
 *   3. Search for best split x within 0.40..0.60 of width
 *   4. The split point is the column with the LOWEST ink density (brightest
 *      vertical strip = gutter/binding gap)
 *   5. Confidence from valley depth relative to page average
 *
 * Pure function: no DB access, no side effects.
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface SplitSpreadOptions {
  /** Minimum confidence to apply split. Default 0.70. */
  minConfidence?: number;
  /** Left boundary of search range as fraction of width. Default 0.40. */
  searchMinFrac?: number;
  /** Right boundary of search range as fraction of width. Default 0.60. */
  searchMaxFrac?: number;
  /** Smoothing window half-width in analysis pixels. Default 5. */
  smoothingWindow?: number;
  /** Valley must be this many intensity units brighter than page mean to qualify. Default 30. */
  minValleyDepth?: number;
}

export interface SplitBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SplitSpreadResult {
  applied: boolean;
  leftBuffer: Buffer | null;
  rightBuffer: Buffer | null;
  splitXPx: number;
  splitXNorm: number;
  confidence: number;
  reasons: string[];
  thresholds: {
    minConfidence: number;
    searchMinFrac: number;
    searchMaxFrac: number;
    smoothingWindow: number;
    minValleyDepth: number;
  };
  inputDimensions: { w: number; h: number };
  leftBox: SplitBox;
  rightBox: SplitBox;
  method: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const METHOD = 'vertical_density_seam_v1';
const ANALYSIS_MAX_WIDTH = 800;
const DEFAULT_MIN_CONFIDENCE = 0.70;
const DEFAULT_SEARCH_MIN = 0.40;
const DEFAULT_SEARCH_MAX = 0.60;
const DEFAULT_SMOOTHING = 5;
const DEFAULT_MIN_VALLEY_DEPTH = 30;
const MIN_OUTPUT_DIM = 512;

// ── Main export ──────────────────────────────────────────────────────────────

export async function detectAndSplitSpread(
  input: Buffer,
  opts?: SplitSpreadOptions
): Promise<SplitSpreadResult> {
  const minConf = opts?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const searchMin = opts?.searchMinFrac ?? DEFAULT_SEARCH_MIN;
  const searchMax = opts?.searchMaxFrac ?? DEFAULT_SEARCH_MAX;
  const smoothHalf = opts?.smoothingWindow ?? DEFAULT_SMOOTHING;
  const minValleyDepth = opts?.minValleyDepth ?? DEFAULT_MIN_VALLEY_DEPTH;

  const thresholds = {
    minConfidence: minConf,
    searchMinFrac: searchMin,
    searchMaxFrac: searchMax,
    smoothingWindow: smoothHalf,
    minValleyDepth,
  };

  const meta = await sharp(input).metadata();
  const inputW = meta.width!;
  const inputH = meta.height!;

  const noOp = (reasons: string[], conf = 0, splitX = 0): SplitSpreadResult => ({
    applied: false,
    leftBuffer: null,
    rightBuffer: null,
    splitXPx: splitX,
    splitXNorm: inputW > 0 ? splitX / inputW : 0,
    confidence: conf,
    reasons,
    thresholds,
    inputDimensions: { w: inputW, h: inputH },
    leftBox: { x: 0, y: 0, w: inputW, h: inputH },
    rightBox: { x: 0, y: 0, w: 0, h: 0 },
    method: METHOD,
  });

  // Aspect ratio check: spreads are typically wider than tall (landscape-ish).
  // A portrait page (h >> w) is unlikely to be a spread.
  if (inputW < inputH * 1.2) {
    console.debug(`[SplitSpread] Aspect ratio ${(inputW / inputH).toFixed(2)} too portrait, skipping`);
    return noOp(['NO_SEAM_FOUND']);
  }

  // Downscale for analysis
  const analysisWidth = Math.min(inputW, ANALYSIS_MAX_WIDTH);
  const scale = inputW / analysisWidth;
  const analysisHeight = Math.round(inputH / scale);

  const { data: pixels, info } = await sharp(input)
    .resize(analysisWidth, analysisHeight, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // ── Compute column-wise mean intensity ─────────────────────────────────
  // Higher value = brighter = less ink. The gutter/seam is the brightest column.
  const colMean = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < h; y++) {
      sum += pixels[y * w + x];
    }
    colMean[x] = sum / h;
  }

  // ── Smooth the profile ─────────────────────────────────────────────────
  const smoothed = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;
    for (let dx = -smoothHalf; dx <= smoothHalf; dx++) {
      const nx = x + dx;
      if (nx >= 0 && nx < w) {
        sum += colMean[nx];
        count++;
      }
    }
    smoothed[x] = sum / count;
  }

  // ── Search for the brightest column (gutter) in the center range ───────
  const searchMinX = Math.round(w * searchMin);
  const searchMaxX = Math.round(w * searchMax);

  let bestX = -1;
  let bestVal = -1;

  for (let x = searchMinX; x <= searchMaxX; x++) {
    if (smoothed[x] > bestVal) {
      bestVal = smoothed[x];
      bestX = x;
    }
  }

  if (bestX < 0) {
    return noOp(['NO_SEAM_FOUND']);
  }

  // ── Compute page-wide mean intensity (excluding the search zone) ───────
  // This gives us a baseline to compare the valley against.
  let pageMeanSum = 0;
  let pageMeanCount = 0;
  for (let x = 0; x < w; x++) {
    if (x >= searchMinX && x <= searchMaxX) continue;
    pageMeanSum += smoothed[x];
    pageMeanCount++;
  }
  const pageMean = pageMeanCount > 0 ? pageMeanSum / pageMeanCount : 128;

  // Valley depth: how much brighter the gutter is compared to the page content
  const valleyDepth = bestVal - pageMean;

  console.debug(
    `[SplitSpread] Best seam at x=${bestX}/${w} (${(bestX / w * 100).toFixed(1)}%), ` +
    `gutterBrightness=${bestVal.toFixed(1)}, pageMean=${pageMean.toFixed(1)}, ` +
    `valleyDepth=${valleyDepth.toFixed(1)}`
  );

  // ── Confidence computation ─────────────────────────────────────────────
  // Confidence is based on:
  // 1. Valley depth (brighter gutter = clearer seam)
  // 2. How centered the seam is (closer to 0.50 = more likely a real spread)

  if (valleyDepth < minValleyDepth) {
    console.debug(`[SplitSpread] Valley depth ${valleyDepth.toFixed(1)} < min ${minValleyDepth}, no seam`);
    return noOp(['NO_SEAM_FOUND'], 0, Math.round(bestX * scale));
  }

  // Depth score: ramps from 0.5 at minValleyDepth to 1.0 at 3× minValleyDepth
  const depthScore = Math.min(1.0, 0.5 + (valleyDepth - minValleyDepth) * (0.5 / (2 * minValleyDepth)));

  // Centering score: 1.0 at x=0.50, drops as we move away
  const centerFrac = bestX / w;
  const centerDeviation = Math.abs(centerFrac - 0.50);
  const centerScore = Math.max(0.3, 1.0 - centerDeviation * 5); // 0.50→1.0, 0.40/0.60→0.5

  const confidence = depthScore * 0.6 + centerScore * 0.4;

  // ── Decision gates ─────────────────────────────────────────────────────
  const splitXOrig = Math.round(bestX * scale);

  if (confidence < minConf) {
    return noOp(['SPLIT_UNCERTAIN'], confidence, splitXOrig);
  }

  // ── Safety clamps ─────────────────────────────────────────────────────
  let finalSplitX = splitXOrig;

  // Unless high confidence, enforce each side >= 40% of total width
  if (confidence < 0.90) {
    const minSideW = Math.round(inputW * 0.40);
    if (finalSplitX < minSideW) finalSplitX = minSideW;
    if (inputW - finalSplitX < minSideW) finalSplitX = inputW - minSideW;
  }

  // Minimum output dimensions
  const leftW = finalSplitX;
  const rightW = inputW - finalSplitX;

  if (leftW < MIN_OUTPUT_DIM || rightW < MIN_OUTPUT_DIM || inputH < MIN_OUTPUT_DIM) {
    console.debug(
      `[SplitSpread] Safety guard: split would produce ${leftW}x${inputH} + ${rightW}x${inputH}, ` +
      `forcing pass-through`
    );
    return noOp(['SPLIT_UNCERTAIN'], confidence, finalSplitX);
  }

  // ── Perform split ─────────────────────────────────────────────────────
  const leftBuffer = await sharp(input)
    .extract({ left: 0, top: 0, width: leftW, height: inputH })
    .jpeg({ quality: 90 })
    .toBuffer();

  const rightBuffer = await sharp(input)
    .extract({ left: finalSplitX, top: 0, width: rightW, height: inputH })
    .jpeg({ quality: 90 })
    .toBuffer();

  console.debug(
    `[SplitSpread] Applied split at x=${finalSplitX}: ` +
    `left=${leftW}x${inputH}, right=${rightW}x${inputH}, conf=${confidence.toFixed(3)}`
  );

  return {
    applied: true,
    leftBuffer,
    rightBuffer,
    splitXPx: finalSplitX,
    splitXNorm: finalSplitX / inputW,
    confidence,
    reasons: ['SPLIT_APPLIED'],
    thresholds,
    inputDimensions: { w: inputW, h: inputH },
    leftBox: { x: 0, y: 0, w: leftW, h: inputH },
    rightBox: { x: finalSplitX, y: 0, w: rightW, h: inputH },
    method: METHOD,
  };
}
