/**
 * Ledger ROI Detection & Crop — Step 1A.3
 *
 * Detects the tabular content region (ledger grid) within a metrical book
 * page scan and crops to it, removing headers, page numbers, and margins.
 *
 * Two algorithms:
 *   Primary: hough_grid_roi_v1 — Hough lines to find grid bounding box
 *   Fallback: ink_density_roi_v1 — Adaptive threshold + tile density map
 *
 * Pure function: no DB access, no side effects.
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface RoiCropOptions {
  /** Minimum confidence to apply crop. Default 0.70. */
  minConfidence?: number;
  /** Sobel edge threshold for Hough. Default 60. */
  edgeThreshold?: number;
  /** Min Hough votes as fraction of dimension. Default 0.15. */
  houghVoteFraction?: number;
  /** Ink density tile size (px at analysis scale). Default 20. */
  tileSizePx?: number;
  /** Min ink fraction per tile to count as "dense". Default 0.08. */
  inkDensityThreshold?: number;
  /** Binarization threshold for ink density. Default 128. */
  binarizeThreshold?: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoiCropResult {
  applied: boolean;
  croppedBuffer: Buffer | null;
  roiBoxPx: Box;
  roiBoxNorm: Box;
  confidence: number;
  reasons: string[];
  thresholds: Record<string, number>;
  inputDimensions: { w: number; h: number };
  outputDimensions: { w: number; h: number };
  method: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ANALYSIS_MAX_WIDTH = 600;
const DEFAULT_MIN_CONFIDENCE = 0.70;
const DEFAULT_EDGE_THRESHOLD = 60;
const DEFAULT_HOUGH_VOTE_FRACTION = 0.15;
const DEFAULT_TILE_SIZE = 20;
const DEFAULT_INK_DENSITY_THRESHOLD = 0.08;
const DEFAULT_BINARIZE_THRESHOLD = 128;
const MIN_OUTPUT_DIM = 256;

// ── Hough grid ROI (primary) ─────────────────────────────────────────────────

interface LineSegment {
  orientation: 'horizontal' | 'vertical';
  position: number; // y for horizontal, x for vertical (at analysis scale)
  votes: number;
}

/**
 * Detect strong horizontal and vertical lines via Hough transform.
 * Returns separate arrays of horizontal and vertical line positions.
 */
function detectGridLines(
  pixels: Buffer,
  w: number,
  h: number,
  edgeThreshold: number,
  minVotesH: number,
  minVotesV: number
): { horizontals: LineSegment[]; verticals: LineSegment[] } {
  // Compute Sobel gradients in both directions
  const horizontals: LineSegment[] = [];
  const verticals: LineSegment[] = [];

  // ── Horizontal line detection (vertical gradient → Gy) ──
  // Project: for each row y, count edge pixels (strong vertical gradient)
  const rowVotes = new Uint32Array(h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gy =
        -pixels[(y - 1) * w + (x - 1)] - 2 * pixels[(y - 1) * w + x] - pixels[(y - 1) * w + (x + 1)]
        + pixels[(y + 1) * w + (x - 1)] + 2 * pixels[(y + 1) * w + x] + pixels[(y + 1) * w + (x + 1)];
      if (Math.abs(gy) > edgeThreshold) {
        rowVotes[y]++;
      }
    }
  }

  // Extract horizontal line peaks with NMS (±2 rows)
  for (let y = 2; y < h - 2; y++) {
    if (rowVotes[y] < minVotesH) continue;
    let isMax = true;
    for (let dy = -2; dy <= 2; dy++) {
      if (dy === 0) continue;
      if (rowVotes[y + dy] > rowVotes[y]) { isMax = false; break; }
    }
    if (isMax) {
      horizontals.push({ orientation: 'horizontal', position: y, votes: rowVotes[y] });
    }
  }

  // ── Vertical line detection (horizontal gradient → Gx) ──
  const colVotes = new Uint32Array(w);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -pixels[(y - 1) * w + (x - 1)] + pixels[(y - 1) * w + (x + 1)]
        - 2 * pixels[y * w + (x - 1)] + 2 * pixels[y * w + (x + 1)]
        - pixels[(y + 1) * w + (x - 1)] + pixels[(y + 1) * w + (x + 1)];
      if (Math.abs(gx) > edgeThreshold) {
        colVotes[x]++;
      }
    }
  }

  // Extract vertical line peaks with NMS (±2 cols)
  for (let x = 2; x < w - 2; x++) {
    if (colVotes[x] < minVotesV) continue;
    let isMax = true;
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0) continue;
      if (colVotes[x + dx] > colVotes[x]) { isMax = false; break; }
    }
    if (isMax) {
      verticals.push({ orientation: 'vertical', position: x, votes: colVotes[x] });
    }
  }

  return { horizontals, verticals };
}

/**
 * Compute grid bounding box from detected horizontal + vertical lines.
 * The ROI is the rectangle spanning the outermost grid lines.
 */
function computeGridBoundingBox(
  horizontals: LineSegment[],
  verticals: LineSegment[],
  w: number,
  h: number
): { box: Box; confidence: number } | null {
  if (horizontals.length < 2 || verticals.length < 2) {
    return null;
  }

  // Sort by position
  const hSorted = horizontals.slice().sort((a, b) => a.position - b.position);
  const vSorted = verticals.slice().sort((a, b) => a.position - b.position);

  const yMin = hSorted[0].position;
  const yMax = hSorted[hSorted.length - 1].position;
  const xMin = vSorted[0].position;
  const xMax = vSorted[vSorted.length - 1].position;

  const boxW = xMax - xMin;
  const boxH = yMax - yMin;

  // Reject if box is too small (< 30% of either dimension)
  if (boxW < w * 0.30 || boxH < h * 0.30) {
    return null;
  }

  // Confidence based on:
  // - Number of lines (more = more grid-like)
  // - Coverage ratio (larger grid = higher confidence)
  const totalLines = horizontals.length + verticals.length;
  const lineScore = Math.min(1.0, totalLines / 12); // 12+ lines = max

  const coverageW = boxW / w;
  const coverageH = boxH / h;
  const coverageScore = Math.min(coverageW, coverageH); // worst-axis coverage

  const confidence = lineScore * 0.5 + coverageScore * 0.5;

  return {
    box: { x: xMin, y: yMin, w: boxW, h: boxH },
    confidence: Math.min(1.0, Math.max(0, confidence)),
  };
}

// ── Ink density ROI (fallback) ───────────────────────────────────────────────

/**
 * Detect the densest content region using adaptive thresholding and
 * tile-based ink density analysis.
 */
function computeInkDensityROI(
  pixels: Buffer,
  w: number,
  h: number,
  tileSize: number,
  inkThreshold: number,
  binarizeThreshold: number
): { box: Box; confidence: number } | null {
  const tilesX = Math.floor(w / tileSize);
  const tilesY = Math.floor(h / tileSize);

  if (tilesX < 3 || tilesY < 3) return null;

  // Compute ink density per tile
  const density = new Float32Array(tilesX * tilesY);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      let inkPixels = 0;
      let totalPixels = 0;
      const startY = ty * tileSize;
      const startX = tx * tileSize;

      for (let dy = 0; dy < tileSize && startY + dy < h; dy++) {
        for (let dx = 0; dx < tileSize && startX + dx < w; dx++) {
          totalPixels++;
          if (pixels[(startY + dy) * w + (startX + dx)] < binarizeThreshold) {
            inkPixels++;
          }
        }
      }

      density[ty * tilesX + tx] = totalPixels > 0 ? inkPixels / totalPixels : 0;
    }
  }

  // Find bounding box of tiles with ink density above threshold
  let minTX = tilesX, maxTX = -1, minTY = tilesY, maxTY = -1;
  let denseCount = 0;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      if (density[ty * tilesX + tx] >= inkThreshold) {
        if (tx < minTX) minTX = tx;
        if (tx > maxTX) maxTX = tx;
        if (ty < minTY) minTY = ty;
        if (ty > maxTY) maxTY = ty;
        denseCount++;
      }
    }
  }

  if (maxTX < 0 || maxTY < 0) return null;

  const boxX = minTX * tileSize;
  const boxY = minTY * tileSize;
  const boxW = (maxTX - minTX + 1) * tileSize;
  const boxH = (maxTY - minTY + 1) * tileSize;

  // Reject if too small
  if (boxW < w * 0.30 || boxH < h * 0.30) return null;

  // Confidence: ratio of dense tiles within the bounding box
  const boxTilesX = maxTX - minTX + 1;
  const boxTilesY = maxTY - minTY + 1;
  const boxTotalTiles = boxTilesX * boxTilesY;
  const fillRatio = denseCount / boxTotalTiles;

  // Lower confidence than grid method (less structural evidence)
  const confidence = Math.min(0.85, fillRatio * 0.7 + 0.15);

  return {
    box: { x: boxX, y: boxY, w: boxW, h: boxH },
    confidence: Math.max(0, confidence),
  };
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function detectAndCropROI(
  input: Buffer,
  opts?: RoiCropOptions
): Promise<RoiCropResult> {
  const minConf = opts?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const edgeThreshold = opts?.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD;
  const houghVoteFraction = opts?.houghVoteFraction ?? DEFAULT_HOUGH_VOTE_FRACTION;
  const tileSize = opts?.tileSizePx ?? DEFAULT_TILE_SIZE;
  const inkDensityThreshold = opts?.inkDensityThreshold ?? DEFAULT_INK_DENSITY_THRESHOLD;
  const binarizeThreshold = opts?.binarizeThreshold ?? DEFAULT_BINARIZE_THRESHOLD;

  const meta = await sharp(input).metadata();
  const inputW = meta.width!;
  const inputH = meta.height!;

  const thresholds: Record<string, number> = {
    minConfidence: minConf,
    edgeThreshold,
    houghVoteFraction,
    tileSizePx: tileSize,
    inkDensityThreshold,
    binarizeThreshold,
  };

  const noOp = (method: string, reasons: string[], conf = 0): RoiCropResult => ({
    applied: false,
    croppedBuffer: null,
    roiBoxPx: { x: 0, y: 0, w: inputW, h: inputH },
    roiBoxNorm: { x: 0, y: 0, w: 1, h: 1 },
    confidence: conf,
    reasons,
    thresholds,
    inputDimensions: { w: inputW, h: inputH },
    outputDimensions: { w: inputW, h: inputH },
    method,
  });

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

  // ── Primary: Hough grid ROI ───────────────────────────────────────────
  const minVotesH = Math.max(10, Math.round(w * houghVoteFraction));
  const minVotesV = Math.max(10, Math.round(h * houghVoteFraction));

  const { horizontals, verticals } = detectGridLines(pixels, w, h, edgeThreshold, minVotesH, minVotesV);

  let gridResult = computeGridBoundingBox(horizontals, verticals, w, h);
  let method = 'hough_grid_roi_v1';
  let reasons: string[] = [];
  let confidence = 0;
  let roiBoxAnalysis: Box | null = null;

  if (gridResult) {
    roiBoxAnalysis = gridResult.box;
    confidence = gridResult.confidence;
    reasons = ['ROI_APPLIED'];
    console.debug(
      `[ROI] Grid detected: ${horizontals.length}H + ${verticals.length}V lines, ` +
      `box=${gridResult.box.x},${gridResult.box.y} ${gridResult.box.w}x${gridResult.box.h}, ` +
      `conf=${confidence.toFixed(3)}`
    );
  } else {
    // ── Fallback: ink density ROI ─────────────────────────────────────
    console.debug(
      `[ROI] No grid found (${horizontals.length}H + ${verticals.length}V lines), trying ink density fallback`
    );
    method = 'ink_density_roi_v1';

    const inkResult = computeInkDensityROI(pixels, w, h, tileSize, inkDensityThreshold, binarizeThreshold);

    if (inkResult) {
      roiBoxAnalysis = inkResult.box;
      confidence = inkResult.confidence;
      reasons = ['FALLBACK_USED', 'ROI_APPLIED'];
      console.debug(
        `[ROI] Ink density fallback: box=${inkResult.box.x},${inkResult.box.y} ` +
        `${inkResult.box.w}x${inkResult.box.h}, conf=${confidence.toFixed(3)}`
      );
    } else {
      console.debug(`[ROI] Ink density fallback: no dense region found`);
      return noOp(method, ['NO_GRID_FOUND']);
    }
  }

  // ── Confidence gate ────────────────────────────────────────────────────
  if (confidence < minConf) {
    return noOp(method, ['ROI_UNCERTAIN'], confidence);
  }

  // ── Scale box back to original coordinates ─────────────────────────────
  let cropX = Math.round(roiBoxAnalysis!.x * scale);
  let cropY = Math.round(roiBoxAnalysis!.y * scale);
  let cropW = Math.round(roiBoxAnalysis!.w * scale);
  let cropH = Math.round(roiBoxAnalysis!.h * scale);

  // Add small padding (2% of each dimension)
  const padX = Math.round(inputW * 0.02);
  const padY = Math.round(inputH * 0.02);
  cropX = Math.max(0, cropX - padX);
  cropY = Math.max(0, cropY - padY);
  cropW = Math.min(inputW - cropX, cropW + 2 * padX);
  cropH = Math.min(inputH - cropY, cropH + 2 * padY);

  // ── Dimension clamp: don't crop away more than 15% unless conf >= 0.90 ─
  const maxCropFraction = confidence >= 0.90 ? 0.25 : 0.15;
  const minW = Math.round(inputW * (1 - maxCropFraction));
  const minH = Math.round(inputH * (1 - maxCropFraction));

  if (cropW < minW) {
    // Expand crop symmetrically to meet minimum
    const deficit = minW - cropW;
    const expandLeft = Math.min(cropX, Math.floor(deficit / 2));
    cropX -= expandLeft;
    cropW = Math.min(inputW - cropX, minW);
  }
  if (cropH < minH) {
    const deficit = minH - cropH;
    const expandTop = Math.min(cropY, Math.floor(deficit / 2));
    cropY -= expandTop;
    cropH = Math.min(inputH - cropY, minH);
  }

  // ── Minimum output size safety guard ──────────────────────────────────
  if (cropW < MIN_OUTPUT_DIM || cropH < MIN_OUTPUT_DIM) {
    console.debug(`[ROI] Safety guard: crop would produce ${cropW}x${cropH}, forcing pass-through`);
    return noOp(method, ['ROI_UNCERTAIN'], confidence);
  }

  // ── Perform crop ──────────────────────────────────────────────────────
  const croppedBuffer = await sharp(input)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .jpeg({ quality: 90 })
    .toBuffer();

  const roiBoxPx: Box = { x: cropX, y: cropY, w: cropW, h: cropH };
  const roiBoxNorm: Box = {
    x: cropX / inputW,
    y: cropY / inputH,
    w: cropW / inputW,
    h: cropH / inputH,
  };

  console.debug(
    `[ROI] Applied: ${cropW}x${cropH} from ${inputW}x${inputH} ` +
    `(${((cropW * cropH) / (inputW * inputH) * 100).toFixed(1)}% area), conf=${confidence.toFixed(3)}`
  );

  return {
    applied: true,
    croppedBuffer,
    roiBoxPx,
    roiBoxNorm,
    confidence,
    reasons,
    thresholds,
    inputDimensions: { w: inputW, h: inputH },
    outputDimensions: { w: cropW, h: cropH },
    method,
  };
}
