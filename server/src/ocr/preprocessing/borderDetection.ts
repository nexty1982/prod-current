/**
 * Border Detection & Removal — Step 1A.1
 *
 * Detects near-black scanner borders on image edges and produces a cropped
 * version for downstream OCR.  Pure function: no DB access, no side effects
 * beyond returning buffers + geometry.
 *
 * Algorithm: edge_black_band_profile_v1
 *   1. Downscale → greyscale raw buffer
 *   2. For each edge, compute strip-wise mean + variance inward
 *   3. Contiguous low-mean / low-variance strips = border band
 *   4. Scale back to original coords, apply confidence gating + clamps
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface BorderDetectionOptions {
  /** Pixel intensity threshold for "black" (0–255). Default 40. */
  blackThreshold?: number;
  /** Max variance for a strip to be considered solid border. Default 600. */
  varianceThreshold?: number;
  /** Min band thickness at original scale (px) to count as border. Default 12. */
  minBandPx?: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TrimPx {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface BorderDetectionResult {
  applied: boolean;
  croppedBuffer: Buffer | null;
  cropBoxPx: Box;
  cropBoxNorm: Box;
  confidence: number;
  reasons: string[];
  thresholds: {
    blackThreshold: number;
    varianceThreshold: number;
    minBandPx: number;
    scanDepthPx: number;
  };
  trimPx: TrimPx;
  originalDimensions: { width: number; height: number };
  method: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const METHOD = 'edge_black_band_profile_v1';
const DEFAULT_BLACK_T = 40;
const DEFAULT_VARIANCE_T = 600;
const DEFAULT_MIN_BAND_PX = 12;
const ANALYSIS_MAX_WIDTH = 800;
const MIN_CROP_DIMENSION = 64; // safety guard: never produce < 64px result

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute mean and variance for a set of pixel values.
 */
function meanAndVariance(values: number[]): { mean: number; variance: number } {
  if (values.length === 0) return { mean: 255, variance: 9999 };
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  const mean = sum / values.length;
  let varSum = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - mean;
    varSum += d * d;
  }
  return { mean, variance: varSum / values.length };
}

/**
 * Detect the contiguous black band width from one edge inward.
 *
 * @param pixels   Greyscale raw buffer (1 byte per pixel)
 * @param w        Image width
 * @param h        Image height
 * @param edge     Which edge to scan
 * @param scanPx   How many strips inward to examine
 * @param blackT   Mean intensity threshold
 * @param varT     Variance threshold
 * @returns        Number of contiguous black-band strips detected
 */
function detectEdgeBand(
  pixels: Buffer,
  w: number,
  h: number,
  edge: 'left' | 'right' | 'top' | 'bottom',
  scanPx: number,
  blackT: number,
  varT: number
): number {
  let bandWidth = 0;

  for (let strip = 0; strip < scanPx; strip++) {
    const values: number[] = [];

    if (edge === 'left') {
      // Column strip at x = strip, scan all rows
      for (let y = 0; y < h; y++) values.push(pixels[y * w + strip]);
    } else if (edge === 'right') {
      const x = w - 1 - strip;
      for (let y = 0; y < h; y++) values.push(pixels[y * w + x]);
    } else if (edge === 'top') {
      // Row strip at y = strip, scan all columns
      const offset = strip * w;
      for (let x = 0; x < w; x++) values.push(pixels[offset + x]);
    } else {
      // bottom
      const y = h - 1 - strip;
      const offset = y * w;
      for (let x = 0; x < w; x++) values.push(pixels[offset + x]);
    }

    const { mean, variance } = meanAndVariance(values);

    if (mean < blackT && variance < varT) {
      bandWidth = strip + 1;
    } else {
      // First non-black strip breaks the contiguous run
      break;
    }
  }

  return bandWidth;
}

/**
 * Compute a confidence score based on detected band characteristics.
 *
 * Confidence reflects how certain we are that the detection IS a real border
 * (not how many edges have borders). A single thick, solid black band is
 * high confidence; a barely-visible thin strip is low.
 *
 * - No bands → 1.0 (confident there's nothing to crop)
 * - Thick bands (>= 1.5% of dimension) → 0.90 base
 * - Medium bands (>= 0.5%) → 0.75 base
 * - Very thin bands → 0.50 base
 * - Multiple edges boost confidence slightly
 */
function computeConfidence(
  trimPx: TrimPx,
  origW: number,
  origH: number
): number {
  const { left, right, top, bottom } = trimPx;
  const totalTrim = left + right + top + bottom;

  if (totalTrim === 0) return 1.0; // confident: no border

  // Score based on the strongest detected band
  const horizTrims = [
    { px: left, dim: origW },
    { px: right, dim: origW },
  ];
  const vertTrims = [
    { px: top, dim: origH },
    { px: bottom, dim: origH },
  ];
  const allTrims = [...horizTrims, ...vertTrims].filter(t => t.px > 0);

  // Best single-edge ratio determines base confidence
  let bestRatio = 0;
  for (const t of allTrims) {
    bestRatio = Math.max(bestRatio, t.px / t.dim);
  }

  let score: number;
  if (bestRatio >= 0.015) {
    score = 0.90;    // thick band — high confidence
  } else if (bestRatio >= 0.005) {
    score = 0.75;    // medium band
  } else {
    score = 0.50;    // very thin band
  }

  // Multiple detected edges boost confidence (corroborating evidence)
  const edgeCount = allTrims.length;
  if (edgeCount >= 3) score = Math.min(1.0, score + 0.10);
  else if (edgeCount >= 2) score = Math.min(1.0, score + 0.05);

  return Math.min(1.0, Math.max(0.0, score));
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function detectAndRemoveBorder(
  input: Buffer,
  opts?: BorderDetectionOptions
): Promise<BorderDetectionResult> {
  const blackT = opts?.blackThreshold ?? DEFAULT_BLACK_T;
  const varT = opts?.varianceThreshold ?? DEFAULT_VARIANCE_T;
  const minBandPx = opts?.minBandPx ?? DEFAULT_MIN_BAND_PX;

  // Read original dimensions
  const meta = await sharp(input).metadata();
  const origW = meta.width!;
  const origH = meta.height!;

  // Scan depth: min(200, round(0.18 * min(w, h)))
  const scanDepthOrig = Math.min(200, Math.round(0.18 * Math.min(origW, origH)));

  // Downscale for analysis
  const analysisWidth = Math.min(origW, ANALYSIS_MAX_WIDTH);
  const scale = origW / analysisWidth;
  const analysisHeight = Math.round(origH / scale);
  const scanPxAnalysis = Math.max(1, Math.round(scanDepthOrig / scale));

  const { data, info } = await sharp(input)
    .resize(analysisWidth, analysisHeight, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = data;
  const w = info.width;
  const h = info.height;

  // Detect bands on each edge (at analysis scale)
  const leftBandAnalysis = detectEdgeBand(pixels, w, h, 'left', scanPxAnalysis, blackT, varT);
  const rightBandAnalysis = detectEdgeBand(pixels, w, h, 'right', scanPxAnalysis, blackT, varT);
  const topBandAnalysis = detectEdgeBand(pixels, w, h, 'top', scanPxAnalysis, blackT, varT);
  const bottomBandAnalysis = detectEdgeBand(pixels, w, h, 'bottom', scanPxAnalysis, blackT, varT);

  // Scale back to original pixel coordinates
  let rawTrimPx: TrimPx = {
    left: Math.round(leftBandAnalysis * scale),
    right: Math.round(rightBandAnalysis * scale),
    top: Math.round(topBandAnalysis * scale),
    bottom: Math.round(bottomBandAnalysis * scale),
  };

  // Enforce minimum band thickness (12px at original scale)
  if (rawTrimPx.left > 0 && rawTrimPx.left < minBandPx) rawTrimPx.left = 0;
  if (rawTrimPx.right > 0 && rawTrimPx.right < minBandPx) rawTrimPx.right = 0;
  if (rawTrimPx.top > 0 && rawTrimPx.top < minBandPx) rawTrimPx.top = 0;
  if (rawTrimPx.bottom > 0 && rawTrimPx.bottom < minBandPx) rawTrimPx.bottom = 0;

  const hasBorderEvidence = rawTrimPx.left > 0 || rawTrimPx.right > 0 ||
                            rawTrimPx.top > 0 || rawTrimPx.bottom > 0;

  const confidence = computeConfidence(rawTrimPx, origW, origH);

  // Build no-crop defaults
  const noOpResult = (reasons: string[]): BorderDetectionResult => ({
    applied: false,
    croppedBuffer: null,
    cropBoxPx: { x: 0, y: 0, w: origW, h: origH },
    cropBoxNorm: { x: 0, y: 0, w: 1, h: 1 },
    confidence,
    reasons,
    thresholds: { blackThreshold: blackT, varianceThreshold: varT, minBandPx, scanDepthPx: scanDepthOrig },
    trimPx: rawTrimPx,
    originalDimensions: { width: origW, height: origH },
    method: METHOD,
  });

  // ── Reason invariants ────────────────────────────────────────────────────

  // No border detected at all
  if (!hasBorderEvidence) {
    return noOpResult(['NO_BORDER']);
  }

  // Low confidence with border-like evidence → uncertain, pass-through
  if (confidence < 0.70) {
    return noOpResult(['BORDER_UNCERTAIN']);
  }

  // ── Apply per-dimension clamping ──────────────────────────────────────────

  let trimLeft = rawTrimPx.left;
  let trimRight = rawTrimPx.right;
  let trimTop = rawTrimPx.top;
  let trimBottom = rawTrimPx.bottom;

  if (confidence >= 0.85) {
    // High confidence: allow up to 20% per side
    const maxHoriz = Math.floor(origW * 0.20);
    const maxVert = Math.floor(origH * 0.20);
    trimLeft = Math.min(trimLeft, maxHoriz);
    trimRight = Math.min(trimRight, maxHoriz);
    trimTop = Math.min(trimTop, maxVert);
    trimBottom = Math.min(trimBottom, maxVert);
  } else {
    // Medium confidence (0.70–0.85): 92% preservation per dimension
    const maxHoriz = Math.floor(origW * 0.08);
    const maxVert = Math.floor(origH * 0.08);
    // Total horizontal trim can't exceed 8% of width
    if (trimLeft + trimRight > maxHoriz) {
      const ratio = maxHoriz / (trimLeft + trimRight);
      trimLeft = Math.floor(trimLeft * ratio);
      trimRight = Math.floor(trimRight * ratio);
    }
    // Total vertical trim can't exceed 8% of height
    if (trimTop + trimBottom > maxVert) {
      const ratio = maxVert / (trimTop + trimBottom);
      trimTop = Math.floor(trimTop * ratio);
      trimBottom = Math.floor(trimBottom * ratio);
    }
  }

  // Compute final crop box
  const cropX = trimLeft;
  const cropY = trimTop;
  const cropW = origW - trimLeft - trimRight;
  const cropH = origH - trimTop - trimBottom;

  // ── Safety guard: never produce dimensions < 64px or <= 0 ─────────────
  if (cropW < MIN_CROP_DIMENSION || cropH < MIN_CROP_DIMENSION || cropW <= 0 || cropH <= 0) {
    console.debug(`[BorderDetect] Safety guard: crop would produce ${cropW}x${cropH}, forcing pass-through`);
    return noOpResult(['BORDER_UNCERTAIN']);
  }

  // ── Perform crop ──────────────────────────────────────────────────────────

  const croppedBuffer = await sharp(input)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .jpeg({ quality: 90 })
    .toBuffer();

  const finalTrimPx: TrimPx = {
    left: trimLeft,
    right: trimRight,
    top: trimTop,
    bottom: trimBottom,
  };

  console.debug(
    `[BorderDetect] Detected trims L=${trimLeft} R=${trimRight} T=${trimTop} B=${trimBottom}, ` +
    `confidence=${confidence.toFixed(3)}, crop=${cropW}x${cropH}`
  );

  return {
    applied: true,
    croppedBuffer,
    cropBoxPx: { x: cropX, y: cropY, w: cropW, h: cropH },
    cropBoxNorm: {
      x: cropX / origW,
      y: cropY / origH,
      w: cropW / origW,
      h: cropH / origH,
    },
    confidence,
    reasons: ['BORDER_BLACK'],
    thresholds: { blackThreshold: blackT, varianceThreshold: varT, minBandPx, scanDepthPx: scanDepthOrig },
    trimPx: finalTrimPx,
    originalDimensions: { width: origW, height: origH },
    method: METHOD,
  };
}
