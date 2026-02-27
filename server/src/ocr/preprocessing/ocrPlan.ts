/**
 * OCR Plan Generator — Phase 2.1
 *
 * Uses the redaction mask (from Step 1B.3) to derive OCR regions:
 * content-bearing areas that should be sent to Vision API.
 *
 * Algorithm: mask_connected_regions_v1
 *   1. Load redaction mask as greyscale
 *   2. Downscale for analysis (max 800px wide)
 *   3. Threshold to binary (white >= 128 = content)
 *   4. Find connected components of content pixels
 *   5. Compute bounding box for each component
 *   6. Filter tiny components (< minRegionFrac of image area)
 *   7. Merge overlapping/nearby regions (within mergePadPx)
 *   8. Cap at maxRegions (merge smallest until within cap)
 *   9. If total content area < minContentFrac → fallback to full-image OCR
 *
 * Pure function: no DB access, no side effects.
 */

import sharp from 'sharp';

// ── Public types ─────────────────────────────────────────────────────────────

export interface OcrPlanOptions {
  /** Maximum number of OCR regions. Default 6. */
  maxRegions?: number;
  /** Minimum region area as fraction of image area. Default 0.02 (2%). */
  minRegionFrac?: number;
  /** Merge padding in pixels (at analysis scale). Default 20. */
  mergePadPx?: number;
  /** Minimum content area fraction to proceed with region-scoped OCR.
   *  Below this, fallback to full-image OCR. Default 0.30 (30%). */
  minContentFrac?: number;
  /** Padding added to each region boundary in original pixels. Default 8. */
  regionPadPx?: number;
}

export interface OcrRegion {
  /** 0-based region index */
  index: number;
  /** Bounding box in original image pixel coordinates */
  box: { x: number; y: number; w: number; h: number };
  /** Bounding box as normalized fractions [0..1] */
  boxNorm: { x: number; y: number; w: number; h: number };
  /** Fraction of image area covered by this region */
  areaFrac: number;
}

export interface OcrPlanResult {
  /** Whether region-scoped OCR should be used */
  useRegions: boolean;
  /** OCR regions (empty if useRegions=false) */
  regions: OcrRegion[];
  /** Reason codes */
  reasons: string[];
  /** Algorithm identifier */
  method: string;
  /** Image dimensions */
  imageDimensions: { w: number; h: number };
  /** Mask dimensions (should match image) */
  maskDimensions: { w: number; h: number };
  /** Fraction of image that is content (non-redacted) */
  contentFrac: number;
  /** Thresholds used */
  thresholds: {
    maxRegions: number;
    minRegionFrac: number;
    mergePadPx: number;
    minContentFrac: number;
    regionPadPx: number;
  };
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_REGIONS = 6;
const DEFAULT_MIN_REGION_FRAC = 0.02;
const DEFAULT_MERGE_PAD_PX = 20;
const DEFAULT_MIN_CONTENT_FRAC = 0.30;
const DEFAULT_REGION_PAD_PX = 8;

// ── Internal types ───────────────────────────────────────────────────────────

interface Box {
  x: number; y: number; w: number; h: number;
}

interface Component {
  area: number;
  minX: number; minY: number;
  maxX: number; maxY: number;
}

// ── Main function ────────────────────────────────────────────────────────────

export async function generateOcrPlan(
  maskBuffer: Buffer,
  imageWidth: number,
  imageHeight: number,
  opts?: OcrPlanOptions,
): Promise<OcrPlanResult> {
  const maxRegions = opts?.maxRegions ?? DEFAULT_MAX_REGIONS;
  const minRegionFrac = opts?.minRegionFrac ?? DEFAULT_MIN_REGION_FRAC;
  const mergePadPx = opts?.mergePadPx ?? DEFAULT_MERGE_PAD_PX;
  const minContentFrac = opts?.minContentFrac ?? DEFAULT_MIN_CONTENT_FRAC;
  const regionPadPx = opts?.regionPadPx ?? DEFAULT_REGION_PAD_PX;

  const thresholds = { maxRegions, minRegionFrac, mergePadPx, minContentFrac, regionPadPx };
  const method = 'mask_connected_regions_v1';

  // ── 1. Load mask as greyscale ──────────────────────────────────────────
  const maskMeta = await sharp(maskBuffer).metadata();
  const maskW = maskMeta.width!;
  const maskH = maskMeta.height!;

  // ── 2. Downscale for analysis ──────────────────────────────────────────
  const analysisWidth = Math.min(maskW, 800);
  const scale = maskW / analysisWidth;
  const analysisHeight = Math.round(maskH / scale);

  const { data: pixels } = await sharp(maskBuffer)
    .resize(analysisWidth, analysisHeight, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const aW = analysisWidth;
  const aH = analysisHeight;

  // ── 3. Threshold to binary ─────────────────────────────────────────────
  // mask: white (>=128) = content, black (<128) = redacted
  const binary = new Uint8Array(aW * aH);
  let contentPixels = 0;
  for (let i = 0; i < aW * aH; i++) {
    if (pixels[i] >= 128) {
      binary[i] = 1;
      contentPixels++;
    }
  }

  const contentFrac = contentPixels / (aW * aH);
  const imageArea = imageWidth * imageHeight;

  // ── 4. Check minimum content fraction ──────────────────────────────────
  if (contentFrac < minContentFrac) {
    return {
      useRegions: false,
      regions: [],
      reasons: ['OCR_PLAN_LOW_CONTENT', `content_frac=${contentFrac.toFixed(3)}`],
      method,
      imageDimensions: { w: imageWidth, h: imageHeight },
      maskDimensions: { w: maskW, h: maskH },
      contentFrac,
      thresholds,
    };
  }

  // If nearly all content (>95%), no benefit to region-scoping
  if (contentFrac > 0.95) {
    return {
      useRegions: false,
      regions: [],
      reasons: ['OCR_PLAN_FULL_CONTENT', `content_frac=${contentFrac.toFixed(3)}`],
      method,
      imageDimensions: { w: imageWidth, h: imageHeight },
      maskDimensions: { w: maskW, h: maskH },
      contentFrac,
      thresholds,
    };
  }

  // ── 5. Find connected components ───────────────────────────────────────
  const components = findConnectedComponents(binary, aW, aH);

  // ── 6. Filter tiny components ──────────────────────────────────────────
  const minArea = minRegionFrac * aW * aH;
  let filtered = components.filter(c => c.area >= minArea);

  if (filtered.length === 0) {
    // All components too small — fallback to full image
    return {
      useRegions: false,
      regions: [],
      reasons: ['OCR_PLAN_NO_SIGNIFICANT_REGIONS'],
      method,
      imageDimensions: { w: imageWidth, h: imageHeight },
      maskDimensions: { w: maskW, h: maskH },
      contentFrac,
      thresholds,
    };
  }

  // ── 7. Convert to boxes (at analysis scale) ────────────────────────────
  let boxes: Box[] = filtered.map(c => ({
    x: c.minX,
    y: c.minY,
    w: c.maxX - c.minX + 1,
    h: c.maxY - c.minY + 1,
  }));

  // ── 8. Merge overlapping/nearby boxes ──────────────────────────────────
  boxes = mergeBoxes(boxes, mergePadPx);

  // ── 9. Cap at maxRegions (merge smallest pairs) ────────────────────────
  while (boxes.length > maxRegions) {
    // Find the two closest boxes and merge them
    let bestI = 0, bestJ = 1, bestDist = Infinity;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const d = boxDistance(boxes[i], boxes[j]);
        if (d < bestDist) {
          bestDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }
    const merged = unionBox(boxes[bestI], boxes[bestJ]);
    boxes.splice(bestJ, 1);
    boxes.splice(bestI, 1, merged);
  }

  // ── 10. Scale back to original coordinates + add padding ───────────────
  const regions: OcrRegion[] = boxes.map((box, idx) => {
    // Scale to original coordinates
    let ox = Math.round(box.x * scale);
    let oy = Math.round(box.y * scale);
    let ow = Math.round(box.w * scale);
    let oh = Math.round(box.h * scale);

    // Add padding
    ox = Math.max(0, ox - regionPadPx);
    oy = Math.max(0, oy - regionPadPx);
    ow = Math.min(imageWidth - ox, ow + 2 * regionPadPx);
    oh = Math.min(imageHeight - oy, oh + 2 * regionPadPx);

    return {
      index: idx,
      box: { x: ox, y: oy, w: ow, h: oh },
      boxNorm: {
        x: ox / imageWidth,
        y: oy / imageHeight,
        w: ow / imageWidth,
        h: oh / imageHeight,
      },
      areaFrac: (ow * oh) / imageArea,
    };
  });

  // Sort by Y then X (reading order)
  regions.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  regions.forEach((r, i) => { r.index = i; });

  return {
    useRegions: true,
    regions,
    reasons: ['OCR_PLAN_REGIONS', `region_count=${regions.length}`],
    method,
    imageDimensions: { w: imageWidth, h: imageHeight },
    maskDimensions: { w: maskW, h: maskH },
    contentFrac,
    thresholds,
  };
}

// ── Connected components (flood fill) ────────────────────────────────────────

function findConnectedComponents(binary: Uint8Array, w: number, h: number): Component[] {
  const labels = new Int32Array(w * h); // 0 = unlabeled
  let nextLabel = 1;
  const components: Component[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (binary[idx] === 1 && labels[idx] === 0) {
        // BFS flood fill
        const comp: Component = {
          area: 0,
          minX: x, minY: y,
          maxX: x, maxY: y,
        };
        const label = nextLabel++;
        const queue = [idx];
        labels[idx] = label;

        while (queue.length > 0) {
          const ci = queue.pop()!;
          const cx = ci % w;
          const cy = (ci - cx) / w;

          comp.area++;
          if (cx < comp.minX) comp.minX = cx;
          if (cx > comp.maxX) comp.maxX = cx;
          if (cy < comp.minY) comp.minY = cy;
          if (cy > comp.maxY) comp.maxY = cy;

          // 4-connected neighbors
          const neighbors = [
            cy > 0 ? ci - w : -1,
            cy < h - 1 ? ci + w : -1,
            cx > 0 ? ci - 1 : -1,
            cx < w - 1 ? ci + 1 : -1,
          ];

          for (const ni of neighbors) {
            if (ni >= 0 && binary[ni] === 1 && labels[ni] === 0) {
              labels[ni] = label;
              queue.push(ni);
            }
          }
        }

        components.push(comp);
      }
    }
  }

  return components;
}

// ── Box merging ──────────────────────────────────────────────────────────────

function boxesOverlap(a: Box, b: Box, pad: number): boolean {
  return (
    a.x - pad < b.x + b.w + pad &&
    a.x + a.w + pad > b.x - pad &&
    a.y - pad < b.y + b.h + pad &&
    a.y + a.h + pad > b.y - pad
  );
}

function unionBox(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x2 - x, h: y2 - y };
}

function boxDistance(a: Box, b: Box): number {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  return Math.sqrt((acx - bcx) ** 2 + (acy - bcy) ** 2);
}

function mergeBoxes(boxes: Box[], pad: number): Box[] {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (boxesOverlap(boxes[i], boxes[j], pad)) {
          boxes[i] = unionBox(boxes[i], boxes[j]);
          boxes.splice(j, 1);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  return boxes;
}
