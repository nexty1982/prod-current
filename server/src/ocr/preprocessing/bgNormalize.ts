/**
 * Background Normalization — Step 1B.1
 *
 * Corrects uneven illumination across scanned book pages using flat-field
 * normalization. Typical issues: scanner edge shadows, yellowed paper
 * gradients, binding shadow falloff.
 *
 * Algorithm: illumination_flatfield_v1
 *   1. Convert to greyscale
 *   2. Estimate background via large-kernel Gaussian blur (3–5% of min dim)
 *   3. Normalize: output = (original / background) * mean(background)
 *   4. Gentle contrast stretch with 1% tail clipping
 *   5. Confidence from measured improvement in background uniformity
 *
 * Pure function: no DB access, no side effects.
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface BgNormalizeOptions {
  /** Minimum confidence to apply normalization. Default 0.70. */
  minConfidence?: number;
  /** Kernel size as fraction of min(width, height). Default 0.04 (4%). */
  kernelFrac?: number;
  /** Minimum improvement in bg_nonuniformity (ratio) to apply. Default 0.15 (15%). */
  minImprovementRatio?: number;
  /** Tail clip percentile for contrast stretch. Default 0.01 (1%). */
  tailClipPct?: number;
}

export interface BgNormalizeMetrics {
  contrast: number;         // std dev of pixel intensities
  bgNonuniformity: number;  // std dev of tile means (lower = more uniform)
  otsuDelta: number;        // |otsu_threshold - 128| — separation proxy
}

export interface BgNormalizeResult {
  applied: boolean;
  normalizedBuffer: Buffer | null;
  confidence: number;
  reasons: string[];
  metricsBefore: BgNormalizeMetrics;
  metricsAfter: BgNormalizeMetrics;
  inputDimensions: { w: number; h: number };
  outputDimensions: { w: number; h: number };
  thresholds: {
    minConfidence: number;
    kernelFrac: number;
    minImprovementRatio: number;
    tailClipPct: number;
  };
  method: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const METHOD = 'illumination_flatfield_v1';
const DEFAULT_MIN_CONFIDENCE = 0.70;
const DEFAULT_KERNEL_FRAC = 0.04;
const DEFAULT_MIN_IMPROVEMENT = 0.15;
const DEFAULT_TAIL_CLIP = 0.01;
const TILE_SIZE = 32;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute image quality metrics from greyscale raw pixels.
 */
function computeMetrics(pixels: Uint8Array, w: number, h: number): BgNormalizeMetrics {
  const total = w * h;

  // Global mean + std dev (contrast proxy)
  let sum = 0;
  for (let i = 0; i < total; i++) sum += pixels[i];
  const mean = sum / total;

  let varSum = 0;
  for (let i = 0; i < total; i++) {
    const d = pixels[i] - mean;
    varSum += d * d;
  }
  const contrast = Math.sqrt(varSum / total);

  // Background non-uniformity: std dev of tile means
  const tilesX = Math.max(1, Math.floor(w / TILE_SIZE));
  const tilesY = Math.max(1, Math.floor(h / TILE_SIZE));
  const tileMeans: number[] = [];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * TILE_SIZE;
      const y0 = ty * TILE_SIZE;
      const x1 = Math.min(x0 + TILE_SIZE, w);
      const y1 = Math.min(y0 + TILE_SIZE, h);
      let tileSum = 0;
      let tileCount = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          tileSum += pixels[y * w + x];
          tileCount++;
        }
      }
      tileMeans.push(tileSum / tileCount);
    }
  }

  let tmMean = 0;
  for (const tm of tileMeans) tmMean += tm;
  tmMean /= tileMeans.length;

  let tmVar = 0;
  for (const tm of tileMeans) {
    const d = tm - tmMean;
    tmVar += d * d;
  }
  const bgNonuniformity = Math.sqrt(tmVar / tileMeans.length);

  // Otsu threshold (simplified) — separation proxy
  const hist = new Uint32Array(256);
  for (let i = 0; i < total; i++) hist[pixels[i]]++;

  let bestThreshold = 128;
  let bestVariance = 0;
  let w0 = 0, sum0 = 0;
  let totalSum = 0;
  for (let t = 0; t < 256; t++) totalSum += t * hist[t];

  for (let t = 0; t < 256; t++) {
    w0 += hist[t];
    if (w0 === 0) continue;
    const w1 = total - w0;
    if (w1 === 0) break;
    sum0 += t * hist[t];
    const mean0 = sum0 / w0;
    const mean1 = (totalSum - sum0) / w1;
    const between = w0 * w1 * (mean0 - mean1) * (mean0 - mean1);
    if (between > bestVariance) {
      bestVariance = between;
      bestThreshold = t;
    }
  }

  const otsuDelta = Math.abs(bestThreshold - 128);

  return { contrast, bgNonuniformity, otsuDelta };
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function normalizeBackground(
  input: Buffer,
  opts?: BgNormalizeOptions
): Promise<BgNormalizeResult> {
  const minConf = opts?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const kernelFrac = opts?.kernelFrac ?? DEFAULT_KERNEL_FRAC;
  const minImprovementRatio = opts?.minImprovementRatio ?? DEFAULT_MIN_IMPROVEMENT;
  const tailClipPct = opts?.tailClipPct ?? DEFAULT_TAIL_CLIP;

  const thresholds = { minConfidence: minConf, kernelFrac, minImprovementRatio, tailClipPct };

  const meta = await sharp(input).metadata();
  const inputW = meta.width!;
  const inputH = meta.height!;

  const noOp = (reasons: string[], conf = 0, before?: BgNormalizeMetrics, after?: BgNormalizeMetrics): BgNormalizeResult => ({
    applied: false,
    normalizedBuffer: null,
    confidence: conf,
    reasons,
    metricsBefore: before ?? { contrast: 0, bgNonuniformity: 0, otsuDelta: 0 },
    metricsAfter: after ?? { contrast: 0, bgNonuniformity: 0, otsuDelta: 0 },
    inputDimensions: { w: inputW, h: inputH },
    outputDimensions: { w: inputW, h: inputH },
    thresholds,
    method: METHOD,
  });

  // ── Get greyscale raw pixels ─────────────────────────────────────────────
  const { data: greyPixels, info } = await sharp(input)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // ── Compute before metrics ───────────────────────────────────────────────
  const metricsBefore = computeMetrics(greyPixels, w, h);

  // If background is already very uniform, skip
  if (metricsBefore.bgNonuniformity < 5.0) {
    console.debug(`[BgNormalize] bgNonuniformity=${metricsBefore.bgNonuniformity.toFixed(2)} < 5.0, already uniform`);
    return noOp(['BG_NO_IMPROVEMENT'], 0, metricsBefore, metricsBefore);
  }

  // ── Estimate background via large Gaussian blur ──────────────────────────
  // Kernel must be odd. Target ~3–5% of min dimension.
  const minDim = Math.min(w, h);
  let kernelSize = Math.round(minDim * kernelFrac);
  if (kernelSize < 15) kernelSize = 15;
  if (kernelSize % 2 === 0) kernelSize += 1;

  // Use sharp's blur with sigma = kernelSize / 6 (covers ~3 sigma each side)
  const sigma = kernelSize / 6;
  const { data: bgPixels } = await sharp(input)
    .greyscale()
    .blur(sigma)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // ── Compute background mean ──────────────────────────────────────────────
  let bgSum = 0;
  const total = w * h;
  for (let i = 0; i < total; i++) bgSum += bgPixels[i];
  const bgMean = bgSum / total;

  // ── Flat-field normalization ─────────────────────────────────────────────
  // normalized = (original / background) * bgMean
  // Clamp to [0, 255]
  const normalized = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const bg = bgPixels[i];
    if (bg < 1) {
      // Avoid division by zero
      normalized[i] = greyPixels[i];
    } else {
      const val = (greyPixels[i] / bg) * bgMean;
      normalized[i] = Math.max(0, Math.min(255, Math.round(val)));
    }
  }

  // ── Contrast stretch with tail clipping ──────────────────────────────────
  const hist = new Uint32Array(256);
  for (let i = 0; i < total; i++) hist[normalized[i]]++;

  const clipCount = Math.round(total * tailClipPct);

  // Find low percentile
  let cumLow = 0;
  let low = 0;
  for (let t = 0; t < 256; t++) {
    cumLow += hist[t];
    if (cumLow >= clipCount) { low = t; break; }
  }

  // Find high percentile
  let cumHigh = 0;
  let high = 255;
  for (let t = 255; t >= 0; t--) {
    cumHigh += hist[t];
    if (cumHigh >= clipCount) { high = t; break; }
  }

  // Apply stretch
  const range = high - low;
  if (range > 10) {
    for (let i = 0; i < total; i++) {
      const v = normalized[i];
      const stretched = ((v - low) / range) * 255;
      normalized[i] = Math.max(0, Math.min(255, Math.round(stretched)));
    }
  }

  // ── Compute after metrics ────────────────────────────────────────────────
  const metricsAfter = computeMetrics(normalized, w, h);

  // ── Decide: apply or pass-through ────────────────────────────────────────
  // Improvement ratio: how much bgNonuniformity decreased
  const improvementRatio = metricsBefore.bgNonuniformity > 0
    ? (metricsBefore.bgNonuniformity - metricsAfter.bgNonuniformity) / metricsBefore.bgNonuniformity
    : 0;

  // Noise amplification guard: contrast should not increase more than 50%
  // Note: some increase is expected when correcting a gradient — dark-side text
  // becomes relatively darker after normalization, raising global std dev.
  const contrastIncrease = metricsBefore.contrast > 0
    ? (metricsAfter.contrast - metricsBefore.contrast) / metricsBefore.contrast
    : 0;

  console.debug(
    `[BgNormalize] before: nonunif=${metricsBefore.bgNonuniformity.toFixed(2)}, ` +
    `contrast=${metricsBefore.contrast.toFixed(2)}, otsuDelta=${metricsBefore.otsuDelta} | ` +
    `after: nonunif=${metricsAfter.bgNonuniformity.toFixed(2)}, ` +
    `contrast=${metricsAfter.contrast.toFixed(2)}, otsuDelta=${metricsAfter.otsuDelta} | ` +
    `improvement=${(improvementRatio * 100).toFixed(1)}%, contrastIncrease=${(contrastIncrease * 100).toFixed(1)}%`
  );

  // Noise amplification check
  if (contrastIncrease > 0.50) {
    console.debug(`[BgNormalize] Contrast increased ${(contrastIncrease * 100).toFixed(1)}% > 50%, uncertain`);
    return noOp(['BG_UNCERTAIN'], 0.3, metricsBefore, metricsAfter);
  }

  // Insufficient improvement
  if (improvementRatio < minImprovementRatio) {
    console.debug(`[BgNormalize] Improvement ${(improvementRatio * 100).toFixed(1)}% < ${(minImprovementRatio * 100).toFixed(0)}%, no improvement`);
    return noOp(['BG_NO_IMPROVEMENT'], improvementRatio, metricsBefore, metricsAfter);
  }

  // ── Confidence computation ───────────────────────────────────────────────
  // Based on: improvement ratio (60%), contrast preservation (20%), Otsu stability (20%)
  const improvScore = Math.min(1.0, improvementRatio / 0.50); // 50%+ improvement → 1.0

  const contrastScore = contrastIncrease <= 0
    ? 1.0  // contrast decreased or stayed same: great
    : Math.max(0, 1.0 - contrastIncrease / 0.50);  // ramps to 0 at 50% increase

  const otsuStability = metricsBefore.otsuDelta > 0
    ? Math.min(1.0, metricsAfter.otsuDelta / metricsBefore.otsuDelta)
    : 1.0;

  const confidence = improvScore * 0.60 + contrastScore * 0.20 + otsuStability * 0.20;

  if (confidence < minConf) {
    console.debug(`[BgNormalize] Confidence ${confidence.toFixed(3)} < ${minConf}, uncertain`);
    return noOp(['BG_UNCERTAIN'], confidence, metricsBefore, metricsAfter);
  }

  // ── Produce output buffer ────────────────────────────────────────────────
  const normalizedBuffer = await sharp(normalized, { raw: { width: w, height: h, channels: 1 } })
    .jpeg({ quality: 90 })
    .toBuffer();

  console.debug(
    `[BgNormalize] Applied: improvement=${(improvementRatio * 100).toFixed(1)}%, ` +
    `conf=${confidence.toFixed(3)}, nonunif ${metricsBefore.bgNonuniformity.toFixed(2)} → ${metricsAfter.bgNonuniformity.toFixed(2)}`
  );

  return {
    applied: true,
    normalizedBuffer,
    confidence,
    reasons: ['BG_NORMALIZED'],
    metricsBefore,
    metricsAfter,
    inputDimensions: { w: inputW, h: inputH },
    outputDimensions: { w, h },
    thresholds,
    method: METHOD,
  };
}
