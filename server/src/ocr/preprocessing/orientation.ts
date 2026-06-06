/**
 * Auto-Orientation Detection — Step 1A.1
 *
 * Detects 90°, 180°, 270° page orientation using text block geometry
 * from Google Vision API results. Runs BEFORE deskew.
 *
 * Algorithm: text_block_orientation_v1
 *   1. Extract text block bounding boxes from Vision API result
 *   2. Compute dominant text flow direction from block positions
 *   3. Determine orientation: 0° (normal), 90° (CW), 180° (upside-down), 270° (CCW)
 *   4. Apply correction via sharp rotation
 *
 * If Vision API has not yet been called (no text blocks), uses aspect ratio
 * heuristic: if image is portrait-oriented but record books are typically
 * landscape, suggest 90° rotation.
 *
 * Pure function: no DB access, no side effects.
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface OrientationResult {
  applied: boolean;
  correctedBuffer: Buffer | null;
  detectedDegrees: number; // 0, 90, 180, 270
  confidence: number;
  method: string;
  reasons: string[];
  inputDimensions: { w: number; h: number };
  outputDimensions: { w: number; h: number };
}

// ── Main function ────────────────────────────────────────────────────────────

/**
 * Detect and correct page orientation from Google Vision text blocks.
 *
 * @param imageBuffer - Raw image buffer
 * @param visionResult - Google Vision API fullTextAnnotation (optional)
 * @returns OrientationResult with corrected buffer if rotation applied
 */
export async function detectAndCorrectOrientation(
  imageBuffer: Buffer,
  visionResult?: any,
): Promise<OrientationResult> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const reasons: string[] = [];

  let detectedDegrees = 0;
  let confidence = 0;
  let method = 'none';

  // ── Method 1: Vision API text block geometry ────────────────────────────
  if (visionResult?.fullTextAnnotation?.pages?.[0]) {
    const page = visionResult.fullTextAnnotation.pages[0];
    const blocks = page.blocks || [];

    if (blocks.length >= 3) {
      const orientationVotes = detectFromTextBlocks(blocks, w, h);
      method = 'text_block_orientation_v1';

      if (orientationVotes.bestRotation !== 0 && orientationVotes.confidence > 0.6) {
        detectedDegrees = orientationVotes.bestRotation;
        confidence = orientationVotes.confidence;
        reasons.push(
          `Detected ${detectedDegrees}° rotation from ${blocks.length} text blocks`,
          `Dominant flow: ${orientationVotes.dominantFlow}`,
          `Confidence: ${(confidence * 100).toFixed(0)}%`
        );
      } else {
        reasons.push(`Text blocks suggest normal orientation (0°)`);
      }
    } else {
      reasons.push(`Too few text blocks (${blocks.length}) for orientation detection`);
    }
  }

  // ── Method 2: EXIF orientation ──────────────────────────────────────────
  if (detectedDegrees === 0 && meta.orientation && meta.orientation > 1) {
    const exifRotation = exifOrientationToDegrees(meta.orientation);
    if (exifRotation !== 0) {
      detectedDegrees = exifRotation;
      confidence = 0.95;
      method = 'exif_orientation';
      reasons.push(`EXIF orientation tag ${meta.orientation} → ${exifRotation}° correction`);
    }
  }

  // ── Apply correction ───────────────────────────────────────────────────
  if (detectedDegrees !== 0 && confidence >= 0.6) {
    try {
      const corrected = await sharp(imageBuffer)
        .rotate(detectedDegrees)
        .toBuffer();

      const correctedMeta = await sharp(corrected).metadata();

      return {
        applied: true,
        correctedBuffer: corrected,
        detectedDegrees,
        confidence,
        method,
        reasons,
        inputDimensions: { w, h },
        outputDimensions: { w: correctedMeta.width || 0, h: correctedMeta.height || 0 },
      };
    } catch (err: any) {
      reasons.push(`Rotation failed: ${err.message}`);
    }
  }

  return {
    applied: false,
    correctedBuffer: null,
    detectedDegrees: 0,
    confidence,
    method,
    reasons,
    inputDimensions: { w, h },
    outputDimensions: { w, h },
  };
}

// ── Text block orientation detection ──────────────────────────────────────

interface OrientationVotes {
  bestRotation: number;
  confidence: number;
  dominantFlow: string;
}

/**
 * Analyze text block bounding boxes to determine page orientation.
 *
 * Normal (0°): blocks flow left-to-right, top-to-bottom
 * 90° CW:      blocks flow top-to-bottom, right-to-left (text reads bottom-up)
 * 180°:        blocks flow right-to-left, bottom-to-top
 * 270° CCW:    blocks flow bottom-to-top, left-to-right (text reads top-down)
 */
function detectFromTextBlocks(blocks: any[], pageW: number, pageH: number): OrientationVotes {
  // Extract block centroids and dimensions
  const blockInfos: Array<{ cx: number; cy: number; bw: number; bh: number }> = [];

  for (const block of blocks) {
    if (!block.boundingBox?.vertices || block.boundingBox.vertices.length < 4) continue;

    const verts = block.boundingBox.vertices;
    const xs = verts.map((v: any) => v.x || 0);
    const ys = verts.map((v: any) => v.y || 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    blockInfos.push({
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      bw: maxX - minX,
      bh: maxY - minY,
    });
  }

  if (blockInfos.length < 3) {
    return { bestRotation: 0, confidence: 0, dominantFlow: 'insufficient_blocks' };
  }

  // Count blocks that are wider vs taller
  let widerCount = 0;
  let tallerCount = 0;
  for (const b of blockInfos) {
    if (b.bw > b.bh * 1.5) widerCount++;
    else if (b.bh > b.bw * 1.5) tallerCount++;
  }

  // If most blocks are taller than wide, text is likely sideways
  const total = widerCount + tallerCount;
  if (total === 0) {
    return { bestRotation: 0, confidence: 0, dominantFlow: 'ambiguous' };
  }

  const sidewaysRatio = tallerCount / total;

  if (sidewaysRatio > 0.6) {
    // Text blocks are taller than wide → page is likely rotated 90° or 270°
    // Determine direction by checking if text flows from top or bottom

    // Sort blocks by x-position to find columns
    const sortedByX = [...blockInfos].sort((a, b) => a.cx - b.cx);

    // Check if first column of blocks starts near top or bottom
    const firstColumnBlocks = sortedByX.slice(0, Math.ceil(blockInfos.length / 3));
    const avgY = firstColumnBlocks.reduce((sum, b) => sum + b.cy, 0) / firstColumnBlocks.length;

    if (avgY < pageH / 2) {
      // First blocks are near top → 90° CW rotation needed
      return { bestRotation: 90, confidence: 0.7 + (sidewaysRatio - 0.6), dominantFlow: 'vertical_top_start' };
    } else {
      // First blocks are near bottom → 270° CCW rotation needed
      return { bestRotation: 270, confidence: 0.7 + (sidewaysRatio - 0.6), dominantFlow: 'vertical_bottom_start' };
    }
  }

  // Blocks are wider than tall → normal or 180°
  // Check if text flows top-to-bottom (normal) or bottom-to-top (180°)
  const sortedByY = [...blockInfos].sort((a, b) => a.cy - b.cy);
  const topBlocks = sortedByY.slice(0, Math.ceil(blockInfos.length / 3));
  const bottomBlocks = sortedByY.slice(-Math.ceil(blockInfos.length / 3));

  // In normal orientation, top blocks should be near left edge (reading order)
  const topAvgX = topBlocks.reduce((sum, b) => sum + b.cx, 0) / topBlocks.length;
  const bottomAvgX = bottomBlocks.reduce((sum, b) => sum + b.cx, 0) / bottomBlocks.length;

  // If bottom blocks are more left-aligned than top blocks, page may be upside-down
  // This is a weak signal; need high confidence threshold
  if (bottomAvgX < topAvgX * 0.7 && (1 - sidewaysRatio) > 0.7) {
    return { bestRotation: 180, confidence: 0.65, dominantFlow: 'inverted_reading_order' };
  }

  return { bestRotation: 0, confidence: 1 - sidewaysRatio, dominantFlow: 'normal_horizontal' };
}

// ── EXIF orientation mapping ─────────────────────────────────────────────────

function exifOrientationToDegrees(orientation: number): number {
  switch (orientation) {
    case 3: return 180;
    case 6: return 90;
    case 8: return 270;
    default: return 0;
  }
}
