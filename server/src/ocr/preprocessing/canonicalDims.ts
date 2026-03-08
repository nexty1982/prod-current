/**
 * canonicalDims.ts — Coordinate contract helpers for the OCR pipeline.
 *
 * The "canonical dimensions" are the actual pixel dimensions of the preprocessed
 * image sent to the Vision API. Vision API may return different page.width/height
 * values (e.g. from EXIF metadata of the original image). All downstream stages
 * must normalize coordinates against canonical dims, not Vision's reported dims.
 */

import sharp from 'sharp';

// ─── Types ───────────────────────────────────────────────────────────

export interface CanonicalDims {
  width: number;
  height: number;
}

/** A bounding box in pixel coordinates */
export interface PixelBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A bounding box normalized to [0..1] */
export interface NormBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// ─── Core Functions ──────────────────────────────────────────────────

/**
 * Read canonical dimensions from the actual preprocessed image file.
 */
export async function getCanonicalDims(imagePath: string): Promise<CanonicalDims> {
  const meta = await sharp(imagePath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Cannot read dimensions from ${imagePath}`);
  }
  return { width: meta.width, height: meta.height };
}

/**
 * Override Vision API's page.width/height with canonical dims in-place.
 * Logs the delta if dimensions differ.
 * Returns true if an override was applied.
 */
export function overrideVisionDims(visionJson: any, canonical: CanonicalDims): boolean {
  let overridden = false;
  if (!visionJson?.pages?.length) return false;

  for (const page of visionJson.pages) {
    const vw = page.width;
    const vh = page.height;
    if (vw !== canonical.width || vh !== canonical.height) {
      console.log(
        `[canonicalDims] Overriding vision dims ${vw}x${vh} → ${canonical.width}x${canonical.height} ` +
        `(delta: ${Math.abs(vw - canonical.width)}x${Math.abs(vh - canonical.height)})`
      );
      page.width = canonical.width;
      page.height = canonical.height;
      overridden = true;
    }
  }
  return overridden;
}

/**
 * Normalize a pixel-coordinate box to [0..1] fractional coordinates.
 */
export function normalizeBox(pixelBox: PixelBox, canonical: CanonicalDims): NormBox {
  return {
    x0: pixelBox.x0 / canonical.width,
    y0: pixelBox.y0 / canonical.height,
    x1: pixelBox.x1 / canonical.width,
    y1: pixelBox.y1 / canonical.height,
  };
}

/**
 * Convert a [0..1] fractional box back to pixel coordinates.
 */
export function denormalizeBox(normBox: NormBox, canonical: CanonicalDims): PixelBox {
  return {
    x0: Math.round(normBox.x0 * canonical.width),
    y0: Math.round(normBox.y0 * canonical.height),
    x1: Math.round(normBox.x1 * canonical.width),
    y1: Math.round(normBox.y1 * canonical.height),
  };
}

/**
 * Clamp a pixel box to image bounds, ensuring no negative values.
 */
export function clampBox(box: PixelBox, maxW: number, maxH: number): PixelBox {
  return {
    x0: Math.max(0, Math.min(box.x0, maxW)),
    y0: Math.max(0, Math.min(box.y0, maxH)),
    x1: Math.max(0, Math.min(box.x1, maxW)),
    y1: Math.max(0, Math.min(box.y1, maxH)),
  };
}

/**
 * Validate that a box has sensible dimensions relative to the canonical size.
 */
export function validateBox(box: PixelBox, canonical: CanonicalDims): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (box.x0 < 0 || box.y0 < 0) errors.push('Negative coordinates');
  if (box.x1 <= box.x0) errors.push('Zero or negative width');
  if (box.y1 <= box.y0) errors.push('Zero or negative height');
  if (box.x1 > canonical.width) errors.push(`x1 (${box.x1}) exceeds image width (${canonical.width})`);
  if (box.y1 > canonical.height) errors.push(`y1 (${box.y1}) exceeds image height (${canonical.height})`);
  return { valid: errors.length === 0, errors };
}

// ─── Header Contamination Detection ──────────────────────────────────

/**
 * Keywords commonly found in ledger headers/column headings.
 * Used to detect when header text contaminates data rows.
 */
export const HEADER_KEYWORDS: string[] = [
  'ORTHODOX', 'CHURCH', 'GREEK', 'ANTIOCHIAN', 'RUSSIAN', 'SERBIAN',
  'BIRTHS', 'BAPTISMS', 'MARRIAGES', 'DEATHS', 'FUNERALS', 'BURIALS',
  'NAME OF CHILD', 'NAME OF DECEASED', 'CERTIFICATE', 'REGISTER',
  'YEAR', 'PAGE', 'VOLUME', 'BOOK', 'PARISH',
  'PRIEST\'S NAME', 'OFFICIATING',
  'MALE', 'FEMALE', 'NUMBER', 'NO.',
  'DATE OF BIRTH', 'DATE OF BAPTISM', 'DATE OF MARRIAGE', 'DATE OF DEATH',
  'SPONSORS', 'GODPARENTS', 'WITNESSES',
  'PARENTS', 'FATHER', 'MOTHER',
  'GROOM', 'BRIDE',
  'CAUSE OF DEATH', 'BURIAL PLACE', 'CEMETERY',
];

/**
 * Detect if text contains header/column-heading contamination.
 * Returns contamination status and which keywords matched.
 *
 * @param text - The text to check (typically a record's concatenated fields)
 * @param threshold - Minimum number of keyword matches to flag (default 2)
 */
export function detectContamination(
  text: string,
  threshold: number = 2
): { contaminated: boolean; matches: string[] } {
  const upper = text.toUpperCase();
  const matches = HEADER_KEYWORDS.filter(kw => upper.includes(kw));
  return {
    contaminated: matches.length >= threshold,
    matches,
  };
}

/**
 * Extract vision tokens that fall within a given Y-band (normalized 0..1).
 * Used for per-record token extraction without re-calling Vision API.
 */
export function extractTokensInYBand(
  visionJson: any,
  yMinNorm: number,
  yMaxNorm: number,
  pageIndex: number = 0
): any[] {
  const page = visionJson?.pages?.[pageIndex];
  if (!page) return [];

  const pw = page.width;
  const ph = page.height;
  const tokens: any[] = [];

  for (const block of page.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const word of para.words || []) {
        const bb = word.boundingBox;
        if (!bb?.vertices?.length) continue;

        const ys = bb.vertices.map((v: any) => v.y / ph);
        const yCenter = (Math.min(...ys) + Math.max(...ys)) / 2;

        if (yCenter >= yMinNorm && yCenter <= yMaxNorm) {
          const xs = bb.vertices.map((v: any) => v.x / pw);
          tokens.push({
            text: word.text,
            confidence: word.confidence,
            bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
            cx: (Math.min(...xs) + Math.max(...xs)) / 2,
            cy: yCenter,
          });
        }
      }
    }
  }

  return tokens;
}
