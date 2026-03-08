/**
 * Conservative Redaction Mask — Step 1B.3
 *
 * Produces a binary mask identifying low-content border regions that can
 * safely be ignored by OCR. The mask is non-destructive — it does NOT
 * modify the source image. Downstream consumers can overlay it to skip
 * irrelevant regions (stamps, margin bleed, scanner artifacts).
 *
 * Algorithm: density_border_mask_v1
 *   1. Convert to greyscale, tile the image (proportional tiles)
 *   2. Compute ink density per tile
 *   3. Identify low-density tiles in the outer border zone (~5%)
 *   4. Protect grid lines (morphological H/V opening) and handwriting
 *      clusters from redaction
 *   5. Merge candidate tiles into a binary mask (white=keep, black=redact)
 *
 * Pure function: no DB access, no side effects.
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface RedactionOptions {
  /** Tile size in pixels. Default 64. */
  tileSize?: number;
  /** Border zone as fraction of dimension. Default 0.05 (5%). */
  borderFrac?: number;
  /** Ink density threshold: tiles below this are redaction candidates. Default 0.03 (3%). */
  inkDensityThreshold?: number;
  /** Minimum redacted area fraction to set applied=true. Default 0.02 (2%). */
  minRedactedArea?: number;
  /** Grid protection padding in tiles. Default 1. */
  gridPadTiles?: number;
  /** Handwriting cluster density threshold. Default 0.08 (8%). */
  handwritingThreshold?: number;
}

export interface RedactionResult {
  applied: boolean;
  maskBuffer: Buffer;       // always produced (PNG, white=keep, black=redact)
  confidence: number;
  reasons: string[];
  redactedAreaFrac: number;
  tileStats: {
    totalTiles: number;
    borderTiles: number;
    candidateTiles: number;
    protectedTiles: number;
    redactedTiles: number;
  };
  inputDimensions: { w: number; h: number };
  thresholds: {
    tileSize: number;
    borderFrac: number;
    inkDensityThreshold: number;
    minRedactedArea: number;
    gridPadTiles: number;
    handwritingThreshold: number;
  };
  method: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const METHOD = 'density_border_mask_v1';
const DEFAULT_TILE_SIZE = 64;
const DEFAULT_BORDER_FRAC = 0.05;
const DEFAULT_INK_DENSITY = 0.03;
const DEFAULT_MIN_REDACTED = 0.02;
const DEFAULT_GRID_PAD = 1;
const DEFAULT_HANDWRITING = 0.08;
const ADAPTIVE_BLOCK = 31;
const ADAPTIVE_C = 15;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Adaptive threshold using integral image.
 * Returns binary Uint8Array: 255 = foreground (dark ink), 0 = background.
 */
function adaptiveThreshold(
  grey: Uint8Array, w: number, h: number, blockSize: number, C: number
): Uint8Array {
  const half = Math.floor(blockSize / 2);
  const out = new Uint8Array(w * h);

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

      out[y * w + x] = grey[y * w + x] < (sum / area - C) ? 255 : 0;
    }
  }

  return out;
}

/**
 * Morphological opening with 1D horizontal kernel (erode then dilate).
 */
function openH(binary: Uint8Array, w: number, h: number, kernelLen: number): Uint8Array {
  const half = Math.floor(kernelLen / 2);

  // Erode
  const eroded = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let allSet = true;
      for (let dx = -half; dx <= half; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w || binary[row + nx] === 0) { allSet = false; break; }
      }
      eroded[row + x] = allSet ? 255 : 0;
    }
  }

  // Dilate
  const dilated = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let anySet = false;
      for (let dx = -half; dx <= half; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < w && eroded[row + nx] === 255) { anySet = true; break; }
      }
      dilated[row + x] = anySet ? 255 : 0;
    }
  }

  return dilated;
}

/**
 * Morphological opening with 1D vertical kernel.
 */
function openV(binary: Uint8Array, w: number, h: number, kernelLen: number): Uint8Array {
  const half = Math.floor(kernelLen / 2);

  const eroded = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let allSet = true;
      for (let dy = -half; dy <= half; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h || binary[ny * w + x] === 0) { allSet = false; break; }
      }
      eroded[y * w + x] = allSet ? 255 : 0;
    }
  }

  const dilated = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let anySet = false;
      for (let dy = -half; dy <= half; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < h && eroded[ny * w + x] === 255) { anySet = true; break; }
      }
      dilated[y * w + x] = anySet ? 255 : 0;
    }
  }

  return dilated;
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function generateRedactionMask(
  input: Buffer,
  opts?: RedactionOptions
): Promise<RedactionResult> {
  const tileSize = opts?.tileSize ?? DEFAULT_TILE_SIZE;
  const borderFrac = opts?.borderFrac ?? DEFAULT_BORDER_FRAC;
  const inkDensityThreshold = opts?.inkDensityThreshold ?? DEFAULT_INK_DENSITY;
  const minRedactedArea = opts?.minRedactedArea ?? DEFAULT_MIN_REDACTED;
  const gridPadTiles = opts?.gridPadTiles ?? DEFAULT_GRID_PAD;
  const handwritingThreshold = opts?.handwritingThreshold ?? DEFAULT_HANDWRITING;

  const thresholds = {
    tileSize, borderFrac, inkDensityThreshold,
    minRedactedArea, gridPadTiles, handwritingThreshold,
  };

  const meta = await sharp(input).metadata();
  const inputW = meta.width!;
  const inputH = meta.height!;

  // ── Get greyscale raw pixels ─────────────────────────────────────────────
  const { data: greyPixels, info } = await sharp(input)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const grey = new Uint8Array(greyPixels.buffer, greyPixels.byteOffset, greyPixels.length);

  // ── Binarize for ink density ─────────────────────────────────────────────
  const binary = adaptiveThreshold(grey, w, h, ADAPTIVE_BLOCK, ADAPTIVE_C);

  // ── Build grid protection mask ───────────────────────────────────────────
  // Reuse the same morphological approach as denoise Step 1B.2
  const gridKernelFrac = 0.05;
  const hKernelLen = Math.max(11, Math.round(w * gridKernelFrac));
  const vKernelLen = Math.max(11, Math.round(h * gridKernelFrac));

  const hLines = openH(binary, w, h, hKernelLen);
  const vLines = openV(binary, w, h, vKernelLen);

  // Grid mask at pixel level
  const gridPixelMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gridPixelMask[i] = (hLines[i] === 255 || vLines[i] === 255) ? 1 : 0;
  }

  // ── Tile the image ───────────────────────────────────────────────────────
  const tilesX = Math.ceil(w / tileSize);
  const tilesY = Math.ceil(h / tileSize);
  const totalTiles = tilesX * tilesY;

  // Compute ink density and grid presence per tile
  const tileDensity = new Float64Array(totalTiles);
  const tileGridPresent = new Uint8Array(totalTiles);
  const tileHandwriting = new Uint8Array(totalTiles);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tIdx = ty * tilesX + tx;
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(x0 + tileSize, w);
      const y1 = Math.min(y0 + tileSize, h);

      let inkPixels = 0;
      let gridPixels = 0;
      let tilePixelCount = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          tilePixelCount++;
          if (binary[y * w + x] === 255) inkPixels++;
          if (gridPixelMask[y * w + x] === 1) gridPixels++;
        }
      }

      const density = tilePixelCount > 0 ? inkPixels / tilePixelCount : 0;
      tileDensity[tIdx] = density;
      tileGridPresent[tIdx] = gridPixels > 0 ? 1 : 0;

      // Handwriting: moderate density (above threshold but not grid)
      if (density >= handwritingThreshold && gridPixels === 0) {
        tileHandwriting[tIdx] = 1;
      }
    }
  }

  // ── Identify border zone tiles ───────────────────────────────────────────
  const borderTilesX = Math.max(1, Math.ceil(tilesX * borderFrac));
  const borderTilesY = Math.max(1, Math.ceil(tilesY * borderFrac));

  const isBorderTile = new Uint8Array(totalTiles);
  let borderTileCount = 0;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      if (tx < borderTilesX || tx >= tilesX - borderTilesX ||
          ty < borderTilesY || ty >= tilesY - borderTilesY) {
        isBorderTile[ty * tilesX + tx] = 1;
        borderTileCount++;
      }
    }
  }

  // ── Build protection mask (grid + padding + handwriting) ─────────────────
  const isProtected = new Uint8Array(totalTiles);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tIdx = ty * tilesX + tx;

      // Protect grid tiles + surrounding padding
      if (tileGridPresent[tIdx]) {
        for (let dy = -gridPadTiles; dy <= gridPadTiles; dy++) {
          for (let dx = -gridPadTiles; dx <= gridPadTiles; dx++) {
            const ny = ty + dy;
            const nx = tx + dx;
            if (ny >= 0 && ny < tilesY && nx >= 0 && nx < tilesX) {
              isProtected[ny * tilesX + nx] = 1;
            }
          }
        }
      }

      // Protect handwriting tiles + 1 tile padding
      if (tileHandwriting[tIdx]) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = ty + dy;
            const nx = tx + dx;
            if (ny >= 0 && ny < tilesY && nx >= 0 && nx < tilesX) {
              isProtected[ny * tilesX + nx] = 1;
            }
          }
        }
      }
    }
  }

  // ── Select redaction candidates ──────────────────────────────────────────
  // Border tile + low density + not protected
  const isRedacted = new Uint8Array(totalTiles);
  let candidateCount = 0;
  let protectedCount = 0;
  let redactedTileCount = 0;

  for (let i = 0; i < totalTiles; i++) {
    if (!isBorderTile[i]) continue;

    if (tileDensity[i] < inkDensityThreshold) {
      candidateCount++;
      if (isProtected[i]) {
        protectedCount++;
      } else {
        isRedacted[i] = 1;
        redactedTileCount++;
      }
    }
  }

  // ── Compute redacted area fraction ───────────────────────────────────────
  // Count actual pixels in redacted tiles (accounting for partial edge tiles)
  let redactedPixels = 0;
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      if (!isRedacted[ty * tilesX + tx]) continue;
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(x0 + tileSize, w);
      const y1 = Math.min(y0 + tileSize, h);
      redactedPixels += (x1 - x0) * (y1 - y0);
    }
  }
  const redactedAreaFrac = (w * h) > 0 ? redactedPixels / (w * h) : 0;

  console.debug(
    `[Redaction] tiles: ${totalTiles} total, ${borderTileCount} border, ` +
    `${candidateCount} candidates, ${protectedCount} protected, ${redactedTileCount} redacted ` +
    `(${(redactedAreaFrac * 100).toFixed(1)}% area)`
  );

  // ── Build mask image ─────────────────────────────────────────────────────
  // White (255) = keep, Black (0) = redact
  const maskPixels = new Uint8Array(w * h).fill(255);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      if (!isRedacted[ty * tilesX + tx]) continue;
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(x0 + tileSize, w);
      const y1 = Math.min(y0 + tileSize, h);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          maskPixels[y * w + x] = 0;
        }
      }
    }
  }

  const maskBuffer = await sharp(maskPixels, { raw: { width: w, height: h, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  // ── Decision ─────────────────────────────────────────────────────────────
  const tileStats = {
    totalTiles,
    borderTiles: borderTileCount,
    candidateTiles: candidateCount,
    protectedTiles: protectedCount,
    redactedTiles: redactedTileCount,
  };

  if (redactedTileCount === 0) {
    console.debug(`[Redaction] No tiles redacted`);
    return {
      applied: false,
      maskBuffer,
      confidence: 0,
      reasons: ['REDACTION_NOOP'],
      redactedAreaFrac: 0,
      tileStats,
      inputDimensions: { w: inputW, h: inputH },
      thresholds,
      method: METHOD,
    };
  }

  if (redactedAreaFrac < minRedactedArea) {
    console.debug(`[Redaction] Redacted area ${(redactedAreaFrac * 100).toFixed(1)}% < ${(minRedactedArea * 100).toFixed(0)}% minimum`);
    return {
      applied: false,
      maskBuffer,
      confidence: 0.3,
      reasons: ['REDACTION_UNCERTAIN'],
      redactedAreaFrac,
      tileStats,
      inputDimensions: { w: inputW, h: inputH },
      thresholds,
      method: METHOD,
    };
  }

  // ── Confidence ───────────────────────────────────────────────────────────
  // Based on: fraction of candidates that passed protection (60%),
  //           density separation clarity (40%)
  const passRate = candidateCount > 0
    ? redactedTileCount / candidateCount
    : 0;

  // Mean density of redacted tiles (should be very low)
  let redactedDensitySum = 0;
  for (let i = 0; i < totalTiles; i++) {
    if (isRedacted[i]) redactedDensitySum += tileDensity[i];
  }
  const meanRedactedDensity = redactedTileCount > 0
    ? redactedDensitySum / redactedTileCount
    : 0;
  const densityClearance = Math.min(1.0, (inkDensityThreshold - meanRedactedDensity) / inkDensityThreshold);

  const confidence = Math.min(0.99, passRate * 0.60 + densityClearance * 0.40);

  console.debug(
    `[Redaction] Applied: ${redactedTileCount} tiles, ` +
    `${(redactedAreaFrac * 100).toFixed(1)}% area, conf=${confidence.toFixed(3)}`
  );

  return {
    applied: true,
    maskBuffer,
    confidence,
    reasons: ['REDACTION_APPLIED'],
    redactedAreaFrac,
    tileStats,
    inputDimensions: { w: inputW, h: inputH },
    thresholds,
    method: METHOD,
  };
}
