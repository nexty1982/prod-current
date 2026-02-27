/**
 * Grid-Preserving Denoise — Step 1B.2
 *
 * Removes salt-and-pepper noise and small speckle artefacts from scanned
 * ledger pages while preserving the horizontal and vertical ruling lines
 * that define the table grid.
 *
 * Algorithm: grid_preserve_denoise_v1
 *   1. Convert to greyscale → adaptive binary threshold
 *   2. Extract grid mask via morphological opening with long H/V kernels
 *   3. Denoise non-grid pixels with a 3×3 median filter
 *   4. Recompose: keep original pixels at grid mask locations
 *   5. Gate on measured improvement (speckle reduction, grid preservation,
 *      content preservation)
 *
 * Pure function: no DB access, no side effects.
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface DenoiseOptions {
  /** Minimum confidence to apply denoise. Default 0.70. */
  minConfidence?: number;
  /** Grid kernel length as fraction of width/height. Default 0.05 (5%). */
  gridKernelFrac?: number;
  /** Max area (in pixels) for a connected component to count as speckle. Default 25. */
  speckleMaxArea?: number;
  /** Minimum speckle count reduction ratio to apply. Default 0.20 (20%). */
  minSpeckleImprovement?: number;
  /** Max allowed content pixel drop ratio. Default 0.10 (10%). */
  maxContentDrop?: number;
  /** Max allowed grid coverage change (absolute). Default 0.05 (5%). */
  maxGridCoverageChange?: number;
}

export interface DenoiseMetrics {
  speckleCount: number;     // count of small connected components (area <= speckleMaxArea)
  gridCoverage: number;     // fraction of pixels in grid mask
  contentPixels: number;    // foreground pixels in large components (area > speckleMaxArea)
}

export interface DenoiseResult {
  applied: boolean;
  denoisedBuffer: Buffer | null;
  confidence: number;
  reasons: string[];
  metricsBefore: DenoiseMetrics;
  metricsAfter: DenoiseMetrics;
  inputDimensions: { w: number; h: number };
  outputDimensions: { w: number; h: number };
  thresholds: {
    minConfidence: number;
    gridKernelFrac: number;
    speckleMaxArea: number;
    minSpeckleImprovement: number;
    maxContentDrop: number;
    maxGridCoverageChange: number;
  };
  method: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const METHOD = 'grid_preserve_denoise_v1';
const DEFAULT_MIN_CONFIDENCE = 0.70;
const DEFAULT_GRID_KERNEL_FRAC = 0.05;
const DEFAULT_SPECKLE_MAX_AREA = 25;
const DEFAULT_MIN_SPECKLE_IMPROVEMENT = 0.20;
const DEFAULT_MAX_CONTENT_DROP = 0.10;
const DEFAULT_MAX_GRID_CHANGE = 0.05;
const ADAPTIVE_BLOCK = 31;  // adaptive threshold block size (must be odd)
const ADAPTIVE_C = 15;      // constant subtracted from mean in adaptive threshold

// ── Morphological helpers (pure, on binary Uint8Array 0|255) ─────────────────

/**
 * Erode binary image with a 1D horizontal structuring element of given length.
 * A pixel is kept (255) only if ALL pixels in the window are 255.
 */
function erodeH(binary: Uint8Array, w: number, h: number, kernelLen: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const half = Math.floor(kernelLen / 2);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let allSet = true;
      for (let dx = -half; dx <= half; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w || binary[row + nx] === 0) { allSet = false; break; }
      }
      out[row + x] = allSet ? 255 : 0;
    }
  }
  return out;
}

/**
 * Dilate binary image with a 1D horizontal structuring element.
 */
function dilateH(binary: Uint8Array, w: number, h: number, kernelLen: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const half = Math.floor(kernelLen / 2);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let anySet = false;
      for (let dx = -half; dx <= half; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < w && binary[row + nx] === 255) { anySet = true; break; }
      }
      out[row + x] = anySet ? 255 : 0;
    }
  }
  return out;
}

/**
 * Erode binary image with a 1D vertical structuring element.
 */
function erodeV(binary: Uint8Array, w: number, h: number, kernelLen: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const half = Math.floor(kernelLen / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let allSet = true;
      for (let dy = -half; dy <= half; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h || binary[ny * w + x] === 0) { allSet = false; break; }
      }
      out[y * w + x] = allSet ? 255 : 0;
    }
  }
  return out;
}

/**
 * Dilate binary image with a 1D vertical structuring element.
 */
function dilateV(binary: Uint8Array, w: number, h: number, kernelLen: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const half = Math.floor(kernelLen / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let anySet = false;
      for (let dy = -half; dy <= half; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < h && binary[ny * w + x] === 255) { anySet = true; break; }
      }
      out[y * w + x] = anySet ? 255 : 0;
    }
  }
  return out;
}

/**
 * Morphological opening = erode then dilate.
 */
function openH(binary: Uint8Array, w: number, h: number, kernelLen: number): Uint8Array {
  return dilateH(erodeH(binary, w, h, kernelLen), w, h, kernelLen);
}

function openV(binary: Uint8Array, w: number, h: number, kernelLen: number): Uint8Array {
  return dilateV(erodeV(binary, w, h, kernelLen), w, h, kernelLen);
}

// ── Metrics helpers ──────────────────────────────────────────────────────────

/**
 * Adaptive threshold: for each pixel, compute mean of surrounding block,
 * then threshold as pixel < (mean - C).
 * Returns binary Uint8Array: 255 = foreground (dark ink), 0 = background.
 */
function adaptiveThreshold(
  grey: Uint8Array, w: number, h: number, blockSize: number, C: number
): Uint8Array {
  const half = Math.floor(blockSize / 2);
  const out = new Uint8Array(w * h);

  // Build integral image for fast block means
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += grey[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] =
        rowSum + integral[y * (w + 1) + (x + 1)];
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half);
      const y0 = Math.max(0, y - half);
      const x1 = Math.min(w - 1, x + half);
      const y1 = Math.min(h - 1, y + half);

      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (w + 1) + (x1 + 1)]
        - integral[y0 * (w + 1) + (x1 + 1)]
        - integral[(y1 + 1) * (w + 1) + x0]
        + integral[y0 * (w + 1) + x0];

      const localMean = sum / area;
      out[y * w + x] = grey[y * w + x] < (localMean - C) ? 255 : 0;
    }
  }

  return out;
}

/**
 * Count speckles (small connected components) and significant content pixels
 * (foreground pixels in large components). Uses flood-fill.
 */
function analyzeComponents(
  binary: Uint8Array, w: number, h: number, maxSpeckleArea: number
): { speckleCount: number; contentPixels: number } {
  const visited = new Uint8Array(w * h);
  let speckleCount = 0;
  let contentPixels = 0;

  const stack: number[] = [];
  const component: number[] = [];

  for (let i = 0; i < w * h; i++) {
    if (binary[i] === 0 || visited[i]) continue;

    stack.length = 0;
    component.length = 0;
    stack.push(i);
    visited[i] = 1;

    while (stack.length > 0) {
      const idx = stack.pop()!;
      component.push(idx);

      const x = idx % w;
      const y = Math.floor(idx / w);

      if (x > 0     && binary[idx - 1] === 255 && !visited[idx - 1]) { visited[idx - 1] = 1; stack.push(idx - 1); }
      if (x < w - 1 && binary[idx + 1] === 255 && !visited[idx + 1]) { visited[idx + 1] = 1; stack.push(idx + 1); }
      if (y > 0     && binary[idx - w] === 255 && !visited[idx - w]) { visited[idx - w] = 1; stack.push(idx - w); }
      if (y < h - 1 && binary[idx + w] === 255 && !visited[idx + w]) { visited[idx + w] = 1; stack.push(idx + w); }
    }

    if (component.length <= maxSpeckleArea) {
      speckleCount++;
    } else {
      contentPixels += component.length;
    }
  }

  return { speckleCount, contentPixels };
}

/**
 * 3×3 median filter on greyscale pixels.
 */
function medianFilter3x3(grey: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const buf = new Uint8Array(9);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        out[y * w + x] = grey[y * w + x];
        continue;
      }
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          buf[k++] = grey[(y + dy) * w + (x + dx)];
        }
      }
      buf.sort();
      out[y * w + x] = buf[4];
    }
  }

  return out;
}

function computeMetrics(
  grey: Uint8Array, w: number, h: number,
  gridMask: Uint8Array, speckleMaxArea: number
): DenoiseMetrics {
  const binary = adaptiveThreshold(grey, w, h, ADAPTIVE_BLOCK, ADAPTIVE_C);
  const { speckleCount, contentPixels } = analyzeComponents(binary, w, h, speckleMaxArea);

  // Grid coverage
  let gridPixels = 0;
  const total = w * h;
  for (let i = 0; i < total; i++) {
    if (gridMask[i] === 255) gridPixels++;
  }
  const gridCoverage = total > 0 ? gridPixels / total : 0;

  return { speckleCount, gridCoverage, contentPixels };
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function gridPreserveDenoise(
  input: Buffer,
  opts?: DenoiseOptions
): Promise<DenoiseResult> {
  const minConf = opts?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const gridKernelFrac = opts?.gridKernelFrac ?? DEFAULT_GRID_KERNEL_FRAC;
  const speckleMaxArea = opts?.speckleMaxArea ?? DEFAULT_SPECKLE_MAX_AREA;
  const minSpeckleImprovement = opts?.minSpeckleImprovement ?? DEFAULT_MIN_SPECKLE_IMPROVEMENT;
  const maxContentDrop = opts?.maxContentDrop ?? DEFAULT_MAX_CONTENT_DROP;
  const maxGridChange = opts?.maxGridCoverageChange ?? DEFAULT_MAX_GRID_CHANGE;

  const thresholds = {
    minConfidence: minConf,
    gridKernelFrac,
    speckleMaxArea,
    minSpeckleImprovement,
    maxContentDrop,
    maxGridCoverageChange: maxGridChange,
  };

  const meta = await sharp(input).metadata();
  const inputW = meta.width!;
  const inputH = meta.height!;

  const emptyMetrics: DenoiseMetrics = { speckleCount: 0, gridCoverage: 0, contentPixels: 0 };

  const noOp = (reasons: string[], conf = 0, before?: DenoiseMetrics, after?: DenoiseMetrics): DenoiseResult => ({
    applied: false,
    denoisedBuffer: null,
    confidence: conf,
    reasons,
    metricsBefore: before ?? emptyMetrics,
    metricsAfter: after ?? emptyMetrics,
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
  const grey = new Uint8Array(greyPixels.buffer, greyPixels.byteOffset, greyPixels.length);

  // ── Adaptive threshold to binary ─────────────────────────────────────────
  const binary = adaptiveThreshold(grey, w, h, ADAPTIVE_BLOCK, ADAPTIVE_C);

  // ── Extract grid mask ────────────────────────────────────────────────────
  const hKernelLen = Math.max(11, Math.round(w * gridKernelFrac));
  const vKernelLen = Math.max(11, Math.round(h * gridKernelFrac));

  const hLines = openH(binary, w, h, hKernelLen);
  const vLines = openV(binary, w, h, vKernelLen);

  // gridMask = hLines OR vLines
  const gridMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gridMask[i] = (hLines[i] === 255 || vLines[i] === 255) ? 255 : 0;
  }

  // Check grid coverage
  let gridPixelCount = 0;
  for (let i = 0; i < w * h; i++) {
    if (gridMask[i] === 255) gridPixelCount++;
  }
  const gridCoverage = gridPixelCount / (w * h);

  if (gridCoverage < 0.001) {
    console.debug(`[Denoise] Grid coverage ${(gridCoverage * 100).toFixed(3)}% < 0.1%, no grid detected`);
  }

  // ── Compute before-metrics ───────────────────────────────────────────────
  const metricsBefore = computeMetrics(grey, w, h, gridMask, speckleMaxArea);

  // Early exit: if very few speckles, nothing to do
  if (metricsBefore.speckleCount < 10) {
    console.debug(`[Denoise] Only ${metricsBefore.speckleCount} speckles detected, no denoise needed`);
    return noOp(['DENOISE_NO_IMPROVEMENT'], 0, metricsBefore, metricsBefore);
  }

  // ── Denoise non-grid pixels via 3×3 median ──────────────────────────────
  const filtered = medianFilter3x3(grey, w, h);

  // Recompose: grid pixels keep original, non-grid use filtered
  const output = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    output[i] = gridMask[i] === 255 ? grey[i] : filtered[i];
  }

  // ── Compute after-metrics ────────────────────────────────────────────────
  const metricsAfter = computeMetrics(output, w, h, gridMask, speckleMaxArea);

  // ── Decision gates ───────────────────────────────────────────────────────
  const speckleImprovement = metricsBefore.speckleCount > 0
    ? (metricsBefore.speckleCount - metricsAfter.speckleCount) / metricsBefore.speckleCount
    : 0;

  const gridCoverageChange = Math.abs(metricsAfter.gridCoverage - metricsBefore.gridCoverage);

  const contentDrop = metricsBefore.contentPixels > 0
    ? (metricsBefore.contentPixels - metricsAfter.contentPixels) / metricsBefore.contentPixels
    : 0;

  console.debug(
    `[Denoise] speckle: ${metricsBefore.speckleCount} → ${metricsAfter.speckleCount} ` +
    `(${(speckleImprovement * 100).toFixed(1)}% reduction), ` +
    `gridCov: ${(metricsBefore.gridCoverage * 100).toFixed(2)}% → ${(metricsAfter.gridCoverage * 100).toFixed(2)}% ` +
    `(Δ${(gridCoverageChange * 100).toFixed(2)}%), ` +
    `content: ${metricsBefore.contentPixels} → ${metricsAfter.contentPixels} ` +
    `(drop ${(contentDrop * 100).toFixed(1)}%)`
  );

  // Grid coverage shift too large
  if (gridCoverageChange > maxGridChange) {
    console.debug(`[Denoise] Grid coverage change ${(gridCoverageChange * 100).toFixed(2)}% > ${(maxGridChange * 100).toFixed(0)}%, uncertain`);
    return noOp(['DENOISE_UNCERTAIN'], 0.3, metricsBefore, metricsAfter);
  }

  // Content pixels dropped too much (text/grid being destroyed)
  if (contentDrop > maxContentDrop) {
    console.debug(`[Denoise] Content pixel drop ${(contentDrop * 100).toFixed(1)}% > ${(maxContentDrop * 100).toFixed(0)}%, uncertain`);
    return noOp(['DENOISE_UNCERTAIN'], 0.3, metricsBefore, metricsAfter);
  }

  // Insufficient speckle improvement
  if (speckleImprovement < minSpeckleImprovement) {
    console.debug(`[Denoise] Speckle improvement ${(speckleImprovement * 100).toFixed(1)}% < ${(minSpeckleImprovement * 100).toFixed(0)}%, no improvement`);
    return noOp(['DENOISE_NO_IMPROVEMENT'], speckleImprovement, metricsBefore, metricsAfter);
  }

  // ── Confidence computation ───────────────────────────────────────────────
  // Based on: speckle reduction (50%), content preservation (30%), grid stability (20%)
  const speckleScore = Math.min(1.0, speckleImprovement / 0.50); // 50%+ → 1.0
  const contentScore = contentDrop <= 0 ? 1.0 : Math.max(0, 1.0 - contentDrop / maxContentDrop);
  const gridScore = gridCoverageChange <= 0.001 ? 1.0 : Math.max(0, 1.0 - gridCoverageChange / maxGridChange);

  const confidence = speckleScore * 0.50 + contentScore * 0.30 + gridScore * 0.20;

  if (confidence < minConf) {
    console.debug(`[Denoise] Confidence ${confidence.toFixed(3)} < ${minConf}, uncertain`);
    return noOp(['DENOISE_UNCERTAIN'], confidence, metricsBefore, metricsAfter);
  }

  // ── Produce output buffer ────────────────────────────────────────────────
  const denoisedBuffer = await sharp(output, { raw: { width: w, height: h, channels: 1 } })
    .jpeg({ quality: 90 })
    .toBuffer();

  console.debug(
    `[Denoise] Applied: speckle ${metricsBefore.speckleCount} → ${metricsAfter.speckleCount}, ` +
    `conf=${confidence.toFixed(3)}, gridCov=${(metricsBefore.gridCoverage * 100).toFixed(2)}%`
  );

  return {
    applied: true,
    denoisedBuffer,
    confidence,
    reasons: ['DENOISE_APPLIED'],
    metricsBefore,
    metricsAfter,
    inputDimensions: { w: inputW, h: inputH },
    outputDimensions: { w, h },
    thresholds,
    method: METHOD,
  };
}
