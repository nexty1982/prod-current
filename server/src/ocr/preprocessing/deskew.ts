/**
 * Deskew Detection & Correction — Step 1A.2
 *
 * Detects page skew from near-horizontal lines (grid/ledger lines in
 * metrical book scans) and produces a rotation-corrected image.
 *
 * Algorithm: hough_line_deskew_v1
 *   1. Downscale → greyscale
 *   2. Sobel vertical-gradient edge detection (highlights horizontal edges)
 *   3. Hough transform for near-horizontal lines (±10°)
 *   4. Non-maximum suppression to collapse nearby peaks
 *   5. Compute dominant angle from top-N lines (vote-weighted)
 *   6. Confidence from line count + angle variance
 *   7. Apply rotation with sharp (white fill)
 *
 * Pure function: no DB access, no side effects.
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface DeskewOptions {
  /** Minimum absolute angle (degrees) to apply correction. Default 0.35. */
  minAngleDeg?: number;
  /** Maximum absolute angle (degrees) allowed. Default 7. */
  maxAngleDeg?: number;
  /** Minimum confidence to apply correction. Default 0.70. */
  minConfidence?: number;
  /** Sobel edge threshold (0–255). Default 60. */
  edgeThreshold?: number;
  /** Angle search range around horizontal (degrees). Default 10. */
  angleSearchRange?: number;
}

export interface DeskewResult {
  applied: boolean;
  deskewedBuffer: Buffer | null;
  angleDeg: number;
  confidence: number;
  reasons: string[];
  thresholds: {
    minAngleDeg: number;
    maxAngleDeg: number;
    minConfidence: number;
    edgeThreshold: number;
    houghMinVotes: number;
    angleSearchRange: number;
  };
  inputDimensions: { w: number; h: number };
  outputDimensions: { w: number; h: number };
  method: string;
  lineCount: number;
  angleVariance: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const METHOD = 'hough_line_deskew_v1';
const ANALYSIS_MAX_WIDTH = 600;
const DEFAULT_MIN_ANGLE = 0.35;
const DEFAULT_MAX_ANGLE = 7.0;
const DEFAULT_MIN_CONFIDENCE = 0.70;
const DEFAULT_EDGE_THRESHOLD = 60;
const DEFAULT_ANGLE_SEARCH = 10; // degrees around horizontal

// ── Edge detection ───────────────────────────────────────────────────────────

/**
 * Vertical Sobel gradient → binary edge map (highlights horizontal lines).
 */
function detectHorizontalEdges(
  pixels: Buffer,
  w: number,
  h: number,
  threshold: number
): Uint8Array {
  const edges = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gy =
        -pixels[(y - 1) * w + (x - 1)] - 2 * pixels[(y - 1) * w + x] - pixels[(y - 1) * w + (x + 1)]
        + pixels[(y + 1) * w + (x - 1)] + 2 * pixels[(y + 1) * w + x] + pixels[(y + 1) * w + (x + 1)];

      if (Math.abs(gy) > threshold) {
        edges[y * w + x] = 1;
      }
    }
  }

  return edges;
}

// ── Hough transform ──────────────────────────────────────────────────────────

interface HoughLine {
  angleDeg: number;
  rho: number;
  votes: number;
}

/**
 * Hough transform restricted to near-horizontal angles.
 * Uses 0.25° resolution. minVotes is set as a fraction of image width
 * so that only lines spanning a meaningful portion of the page pass.
 *
 * Includes non-maximum suppression: for each accumulator peak, suppress
 * neighbors within ±1 angle bin and ±5 rho bins.
 */
function houghNearHorizontal(
  edges: Uint8Array,
  w: number,
  h: number,
  angleSearchRange: number,
  minVotes: number
): HoughLine[] {
  const ANGLE_STEP = 0.25;
  const angles: number[] = [];
  for (let a = -angleSearchRange; a <= angleSearchRange; a += ANGLE_STEP) {
    angles.push(a);
  }
  const numAngles = angles.length;

  const diagLen = Math.ceil(Math.sqrt(w * w + h * h));
  const rhoMax = diagLen;
  const rhoOffset = rhoMax;
  const accumW = 2 * rhoMax + 1;

  const accum = new Uint32Array(numAngles * accumW);

  // Pre-compute sin/cos (theta = 90° + skew_angle in standard Hough coords)
  const cosA = new Float64Array(numAngles);
  const sinA = new Float64Array(numAngles);
  for (let ai = 0; ai < numAngles; ai++) {
    const thetaRad = ((90 + angles[ai]) * Math.PI) / 180;
    cosA[ai] = Math.cos(thetaRad);
    sinA[ai] = Math.sin(thetaRad);
  }

  // Vote
  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      if (!edges[rowOff + x]) continue;
      for (let ai = 0; ai < numAngles; ai++) {
        const rho = Math.round(x * cosA[ai] + y * sinA[ai]) + rhoOffset;
        accum[ai * accumW + rho]++;
      }
    }
  }

  // Extract peaks with non-maximum suppression
  const NMS_ANGLE_RADIUS = 1; // ±1 angle bin = ±0.25°
  const NMS_RHO_RADIUS = 5;   // ±5 rho bins = ±5px
  const lines: HoughLine[] = [];

  for (let ai = 0; ai < numAngles; ai++) {
    const base = ai * accumW;
    for (let ri = 0; ri < accumW; ri++) {
      const votes = accum[base + ri];
      if (votes < minVotes) continue;

      // Check if this is a local maximum
      let isMax = true;
      for (let da = -NMS_ANGLE_RADIUS; da <= NMS_ANGLE_RADIUS && isMax; da++) {
        for (let dr = -NMS_RHO_RADIUS; dr <= NMS_RHO_RADIUS && isMax; dr++) {
          if (da === 0 && dr === 0) continue;
          const nai = ai + da;
          const nri = ri + dr;
          if (nai < 0 || nai >= numAngles || nri < 0 || nri >= accumW) continue;
          if (accum[nai * accumW + nri] > votes) {
            isMax = false;
          }
        }
      }

      if (isMax) {
        lines.push({ angleDeg: angles[ai], rho: ri - rhoOffset, votes });
      }
    }
  }

  // Sort by votes descending
  lines.sort((a, b) => b.votes - a.votes);

  return lines;
}

/**
 * Compute the dominant skew angle from the top detected Hough lines.
 * Uses vote-weighted mean of line angles (top 30 lines max).
 */
function computeDominantAngle(lines: HoughLine[]): {
  angle: number;
  variance: number;
  lineCount: number;
} {
  if (lines.length === 0) {
    return { angle: 0, variance: Infinity, lineCount: 0 };
  }

  // Use top N lines (strongest signals)
  const topN = lines.slice(0, 30);

  let totalVotes = 0;
  let weightedSum = 0;
  for (const line of topN) {
    weightedSum += line.angleDeg * line.votes;
    totalVotes += line.votes;
  }
  const meanAngle = weightedSum / totalVotes;

  let weightedVarSum = 0;
  for (const line of topN) {
    const d = line.angleDeg - meanAngle;
    weightedVarSum += d * d * line.votes;
  }
  const variance = weightedVarSum / totalVotes;

  return { angle: meanAngle, variance, lineCount: topN.length };
}

/**
 * Compute confidence from line count and angle clustering tightness.
 */
function computeConfidence(lineCount: number, variance: number): number {
  if (lineCount === 0) return 0;

  // Line count: ramp from 0.5 (1 line) to 1.0 (8+ lines)
  const lineScore = Math.min(1.0, 0.5 + (lineCount - 1) * (0.5 / 7));

  // Variance: tight clustering → high score
  let varScore: number;
  if (variance < 0.3) {
    varScore = 1.0;
  } else if (variance < 1.0) {
    varScore = 1.0 - (variance - 0.3) * (0.3 / 0.7); // 1.0 → 0.7
  } else if (variance < 3.0) {
    varScore = 0.7 - (variance - 1.0) * (0.4 / 2.0); // 0.7 → 0.3
  } else {
    varScore = 0.3;
  }

  return Math.min(1.0, Math.max(0, lineScore * 0.4 + varScore * 0.6));
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function detectAndCorrectSkew(
  input: Buffer,
  opts?: DeskewOptions
): Promise<DeskewResult> {
  const minAngle = opts?.minAngleDeg ?? DEFAULT_MIN_ANGLE;
  const maxAngle = opts?.maxAngleDeg ?? DEFAULT_MAX_ANGLE;
  const minConf = opts?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const edgeThreshold = opts?.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD;
  const angleSearch = opts?.angleSearchRange ?? DEFAULT_ANGLE_SEARCH;

  // Read input dimensions
  const meta = await sharp(input).metadata();
  const inputW = meta.width!;
  const inputH = meta.height!;

  // Hough threshold: a real ledger line should span >= 25% of image width
  const houghMinVotes = Math.max(20, Math.round(inputW * 0.25));

  const thresholds = {
    minAngleDeg: minAngle,
    maxAngleDeg: maxAngle,
    minConfidence: minConf,
    edgeThreshold,
    houghMinVotes,
    angleSearchRange: angleSearch,
  };

  const noOp = (reasons: string[], angle = 0, conf = 0, lc = 0, av = Infinity): DeskewResult => ({
    applied: false,
    deskewedBuffer: null,
    angleDeg: angle,
    confidence: conf,
    reasons,
    thresholds,
    inputDimensions: { w: inputW, h: inputH },
    outputDimensions: { w: inputW, h: inputH },
    method: METHOD,
    lineCount: lc,
    angleVariance: av,
  });

  // Downscale for analysis
  const analysisWidth = Math.min(inputW, ANALYSIS_MAX_WIDTH);
  const scaleDown = inputW / analysisWidth;
  const analysisHeight = Math.round(inputH / scaleDown);

  const { data: pixels, info } = await sharp(input)
    .resize(analysisWidth, analysisHeight, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // Step 1: Edge detection
  const edges = detectHorizontalEdges(pixels, w, h, edgeThreshold);

  // Scale hough threshold to analysis resolution
  const scaledMinVotes = Math.max(10, Math.round(houghMinVotes / scaleDown));

  // Step 2: Hough transform with NMS
  const lines = houghNearHorizontal(edges, w, h, angleSearch, scaledMinVotes);

  if (lines.length === 0) {
    console.debug(`[Deskew] No lines found`);
    return noOp(['NO_LINES_FOUND']);
  }

  // Step 3: Dominant angle
  const { angle, variance, lineCount } = computeDominantAngle(lines);
  const confidence = computeConfidence(lineCount, variance);

  console.debug(
    `[Deskew] ${lineCount} lines, angle=${angle.toFixed(3)}°, ` +
    `variance=${variance.toFixed(4)}, confidence=${confidence.toFixed(3)}`
  );

  // Step 4: Decision gates

  // Small angle → no correction needed
  if (Math.abs(angle) < minAngle) {
    return noOp(['DESKEW_SMALL_ANGLE'], angle, confidence, lineCount, variance);
  }

  // Low confidence → pass-through
  if (confidence < minConf) {
    return noOp(['DESKEW_UNCERTAIN'], angle, confidence, lineCount, variance);
  }

  // Clamp angle
  let correctionAngle = angle;
  const maxAllowed = confidence >= 0.90 ? 15 : maxAngle;
  if (Math.abs(correctionAngle) > maxAllowed) {
    correctionAngle = Math.sign(correctionAngle) * maxAllowed;
  }

  // Step 5: Apply rotation (counter-rotate the detected skew)
  const rotatedBuffer = await sharp(input)
    .rotate(-correctionAngle, { background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .jpeg({ quality: 90 })
    .toBuffer();

  const outMeta = await sharp(rotatedBuffer).metadata();
  const outputW = outMeta.width!;
  const outputH = outMeta.height!;

  console.debug(
    `[Deskew] Applied correction: ${(-correctionAngle).toFixed(3)}° rotation, ` +
    `${inputW}x${inputH} → ${outputW}x${outputH}`
  );

  return {
    applied: true,
    deskewedBuffer: rotatedBuffer,
    angleDeg: correctionAngle,
    confidence,
    reasons: ['DESKEW_APPLIED'],
    thresholds,
    inputDimensions: { w: inputW, h: inputH },
    outputDimensions: { w: outputW, h: outputH },
    method: METHOD,
    lineCount,
    angleVariance: variance,
  };
}
