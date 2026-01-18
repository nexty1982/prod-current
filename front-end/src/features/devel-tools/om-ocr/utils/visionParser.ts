/**
 * Vision JSON Parser Utilities
 * Parses Google Vision API response into structured lines, tokens, and entries
 */

import {
  BBox,
  FusionEntry,
  FusionLine,
  FusionToken,
  VisionResponse,
  VisionBlock,
  VisionParagraph,
  VisionWord,
  VisionSymbol,
  VisionBoundingPoly,
  VisionVertex,
  DetectedLabel,
  LABEL_DICTIONARIES,
} from '../types/fusion';
import { getRecordSchema, validateFieldKeys } from '@/shared/recordSchemas/registry';
import { getDefaultColumns } from '../config/defaultRecordColumns';

// ============================================================================
// BBox Utilities
// ============================================================================

/**
 * Convert Vision vertices to our BBox format
 */
export function verticesToBBox(vertices: VisionVertex[] | undefined): BBox {
  if (!vertices || vertices.length < 4) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  
  const xs = vertices.map(v => v.x || 0);
  const ys = vertices.map(v => v.y || 0);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

/**
 * Get centroid of a bounding box
 */
export function getBBoxCentroid(bbox: BBox): { x: number; y: number } {
  return {
    x: bbox.x + bbox.w / 2,
    y: bbox.y + bbox.h / 2,
  };
}

/**
 * Merge multiple bboxes into one encompassing bbox
 */
export function mergeBBoxes(bboxes: BBox[]): BBox {
  if (bboxes.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  
  const minX = Math.min(...bboxes.map(b => b.x));
  const minY = Math.min(...bboxes.map(b => b.y));
  const maxX = Math.max(...bboxes.map(b => b.x + b.w));
  const maxY = Math.max(...bboxes.map(b => b.y + b.h));
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

/**
 * Check if two bboxes overlap
 */
export function bboxesOverlap(a: BBox, b: BBox): boolean {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

/**
 * Check if bbox A is within the same Y band as bbox B (with tolerance)
 */
export function isInSameYBand(a: BBox, b: BBox, tolerance: number = 20): boolean {
  const aCenterY = a.y + a.h / 2;
  const bTop = b.y - tolerance;
  const bBottom = b.y + b.h + tolerance;
  return aCenterY >= bTop && aCenterY <= bBottom;
}

/**
 * Check if bbox A is to the right of bbox B
 */
export function isToRightOf(a: BBox, b: BBox): boolean {
  return a.x > b.x + b.w;
}

/**
 * Check if bbox A is below bbox B
 */
export function isBelow(a: BBox, b: BBox): boolean {
  return a.y > b.y + b.h;
}

/**
 * Check if a bbox is within or intersects with a container bbox
 */
export function isBboxWithinContainer(bbox: BBox, container: BBox): boolean {
  // Check if bbox intersects with container
  return !(
    bbox.x + bbox.w < container.x ||
    container.x + container.w < bbox.x ||
    bbox.y + bbox.h < container.y ||
    container.y + container.h < bbox.y
  );
}

/**
 * Filter entry lines to only include those within the entry bbox
 */
export function filterEntryByBbox(entry: FusionEntry): FusionEntry {
  const filteredLines = entry.lines.filter(line => 
    isBboxWithinContainer(line.bbox, entry.bbox)
  );
  
  // Also filter tokens within each line
  const filteredLinesWithTokens = filteredLines.map(line => ({
    ...line,
    tokens: line.tokens.filter(token => 
      isBboxWithinContainer(token.bbox, entry.bbox)
    ),
  }));

  return {
    ...entry,
    lines: filteredLinesWithTokens,
  };
}

// ============================================================================
// Vision JSON Parsing
// ============================================================================

/**
 * Extract word text from Vision symbols
 */
function extractWordText(word: VisionWord): string {
  if (!word.symbols) return '';
  
  let text = '';
  for (const symbol of word.symbols) {
    text += symbol.text || '';
    // Add space/break after symbol if indicated
    if (symbol.property?.detectedBreak) {
      const breakType = symbol.property.detectedBreak.type;
      if (breakType === 'SPACE' || breakType === 'SURE_SPACE') {
        text += ' ';
      }
    }
  }
  return text;
}

/**
 * Generate stable deterministic ID for a token/line
 * Uses bbox coordinates rounded to integers + text + index for uniqueness
 */
function generateStableId(
  type: 'token' | 'line',
  text: string,
  bbox: BBox,
  index: number,
  pageIndex: number = 0
): string {
  // Round bbox to integers for stability
  const x = Math.round(bbox.x);
  const y = Math.round(bbox.y);
  const w = Math.round(bbox.w);
  const h = Math.round(bbox.h);
  
  // Normalize text (remove extra whitespace, lowercase for comparison)
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // Create stable ID: type_pageIndex_x_y_w_h_normalizedText_index
  return `${type}_p${pageIndex}_${x}_${y}_${w}_${h}_${normalizedText.slice(0, 20)}_${index}`;
}

/**
 * Parse Vision word into FusionToken with stable ID
 */
function parseWord(word: VisionWord, index: number, pageIndex: number = 0): FusionToken & { id: string } {
  const text = extractWordText(word).trim();
  const bbox = verticesToBBox(word.boundingBox?.vertices);
  
  return {
    id: generateStableId('token', text, bbox, index, pageIndex),
    text,
    bbox,
    confidence: word.confidence,
  };
}

/**
 * Parse Vision paragraph into FusionLine with stable IDs
 */
function parseParagraph(
  paragraph: VisionParagraph,
  paragraphIndex: number,
  pageIndex: number = 0
): FusionLine & { id: string } {
  const tokens: (FusionToken & { id: string })[] = (paragraph.words || []).map((word, wordIndex) =>
    parseWord(word, wordIndex, pageIndex)
  );
  const text = tokens.map(t => t.text).join(' ');
  const tokenBboxes = tokens.filter(t => t.bbox.w > 0).map(t => t.bbox);
  const bbox = tokenBboxes.length > 0 ? mergeBBoxes(tokenBboxes) : verticesToBBox(paragraph.boundingBox?.vertices);
  
  return {
    id: generateStableId('line', text, bbox, paragraphIndex, pageIndex),
    text,
    bbox,
    confidence: paragraph.confidence,
    tokens,
  };
}

/**
 * Parse Vision block into array of FusionLines with stable IDs
 */
function parseBlock(block: VisionBlock, blockIndex: number, pageIndex: number = 0): (FusionLine & { id: string })[] {
  if (!block.paragraphs) return [];
  return block.paragraphs.map((paragraph, paragraphIndex) =>
    parseParagraph(paragraph, paragraphIndex, pageIndex)
  );
}

/**
 * Parse full Vision response into lines with bboxes and stable IDs
 */
export function parseVisionResponse(vision: VisionResponse | null): (FusionLine & { id: string })[] {
  if (!vision?.fullTextAnnotation?.pages) {
    return [];
  }
  
  const lines: (FusionLine & { id: string })[] = [];
  
  vision.fullTextAnnotation.pages.forEach((page, pageIndex) => {
    (page.blocks || []).forEach((block, blockIndex) => {
      lines.push(...parseBlock(block, blockIndex, pageIndex));
    });
  });
  
  return lines;
}

/**
 * Get page dimensions from Vision response
 */
export function getVisionPageSize(vision: VisionResponse | null): { width: number; height: number } {
  if (!vision?.fullTextAnnotation?.pages?.[0]) {
    return { width: 0, height: 0 };
  }
  
  const page = vision.fullTextAnnotation.pages[0];
  return {
    width: page.width || 0,
    height: page.height || 0,
  };
}

// ============================================================================
// Entry Detection (Multi-Record Segmentation) - Production-Grade with NMS
// ============================================================================

/**
 * Anchor labels that indicate a valid sacramental record
 */
const ANCHOR_LABELS = [
  'NAME OF CHILD', 'NAME OF PARENTS', 'DATE OF BIRTH', 'DATE OF BAPTISM',
  'PLACE OF BIRTH', 'GOD PARENTS', 'GODPARENTS', 'SPONSORS', 'SACRAMENTS',
  'PERFORMED BY', 'RECTOR', 'PRIEST', 'FATHER', 'MOTHER', 'ADDRESS',
  'PARISH RECORD', 'BAPTISM', 'MARRIAGE', 'FUNERAL', 'CONFIRMATION',
];

/**
 * Calculate Intersection over Union (IoU) between two bboxes
 */
export function calculateIoU(a: BBox, b: BBox): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const intersection = xOverlap * yOverlap;
  
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const union = areaA + areaB - intersection;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * Calculate containment percentage (how much of B is inside A)
 */
export function calculateContainment(container: BBox, contained: BBox): number {
  const xOverlap = Math.max(0, Math.min(container.x + container.w, contained.x + contained.w) - Math.max(container.x, contained.x));
  const yOverlap = Math.max(0, Math.min(container.y + container.h, contained.y + contained.h) - Math.max(container.y, contained.y));
  const intersection = xOverlap * yOverlap;
  
  const areaContained = contained.w * contained.h;
  return areaContained > 0 ? intersection / areaContained : 0;
}

/**
 * Calculate aspect ratio of a bbox
 */
export function calculateAspectRatio(bbox: BBox): number {
  return bbox.h > 0 ? bbox.w / bbox.h : 0;
}

/**
 * Score a candidate entry based on multiple factors
 */
interface CandidateScore {
  area: number;
  textDensity: number;
  anchorLabelCount: number;
  aspectRatioPenalty: number;
  totalScore: number;
}

function scoreCandidate(
  bbox: BBox,
  lines: FusionLine[],
  pageArea: number
): CandidateScore {
  const area = bbox.w * bbox.h;
  const normalizedArea = pageArea > 0 ? area / pageArea : 0;
  
  // Text density: characters per area (normalized)
  const totalChars = lines.reduce((sum, l) => sum + l.text.length, 0);
  const textDensity = area > 0 ? (totalChars / area) * 10000 : 0; // Scale for readability
  
  // Count anchor labels found in this entry
  const allText = lines.map(l => l.text.toUpperCase()).join(' ');
  let anchorLabelCount = 0;
  for (const label of ANCHOR_LABELS) {
    if (allText.includes(label)) {
      anchorLabelCount++;
    }
  }
  
  // Aspect ratio penalty: penalize extreme ratios (too wide or too tall)
  const aspectRatio = calculateAspectRatio(bbox);
  let aspectRatioPenalty = 0;
  if (aspectRatio < 0.3 || aspectRatio > 3.0) {
    aspectRatioPenalty = 0.5; // Heavy penalty for extreme aspect ratios
  } else if (aspectRatio < 0.5 || aspectRatio > 2.0) {
    aspectRatioPenalty = 0.2; // Moderate penalty
  }
  
  // Total score: weighted combination
  // Prefer: larger area, higher text density, more anchor labels
  const totalScore = (
    normalizedArea * 40 +           // Area contributes 40%
    Math.min(textDensity, 10) * 3 + // Text density contributes up to 30%
    anchorLabelCount * 5 -          // Each anchor label adds 5 points
    aspectRatioPenalty * 20         // Penalty subtracts up to 10 points
  );
  
  return {
    area,
    textDensity,
    anchorLabelCount,
    aspectRatioPenalty,
    totalScore,
  };
}

/**
 * Debug log for entry detection (can be toggled)
 */
const DEBUG_ENTRY_DETECTION = true;

function debugLog(message: string, data?: any) {
  if (DEBUG_ENTRY_DETECTION) {
    console.log(`[EntryDetection] ${message}`, data || '');
  }
}

/**
 * Non-Maximum Suppression to collapse duplicate/overlapping entries
 * Rules:
 * - IoU >= 0.5 OR containment >= 80% => same entry
 * - Keep highest scoring box, discard/merge others
 */
function applyNMS(
  candidates: Array<{ entry: FusionEntry; score: CandidateScore }>,
  iouThreshold: number = 0.5,
  containmentThreshold: number = 0.8
): FusionEntry[] {
  if (candidates.length === 0) return [];
  if (candidates.length === 1) return [candidates[0].entry];
  
  // Sort by score descending
  const sorted = [...candidates].sort((a, b) => b.score.totalScore - a.score.totalScore);
  
  const kept: FusionEntry[] = [];
  const suppressed = new Set<number>();
  
  debugLog('NMS Input candidates:', sorted.map((c, i) => ({
    index: i,
    score: c.score.totalScore.toFixed(2),
    area: c.score.area,
    anchorLabels: c.score.anchorLabelCount,
    bbox: c.entry.bbox,
  })));
  
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    
    const current = sorted[i];
    kept.push(current.entry);
    
    // Check all remaining candidates for overlap
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      
      const other = sorted[j];
      const iou = calculateIoU(current.entry.bbox, other.entry.bbox);
      const containment = calculateContainment(current.entry.bbox, other.entry.bbox);
      const reverseContainment = calculateContainment(other.entry.bbox, current.entry.bbox);
      
      debugLog(`Comparing ${i} vs ${j}:`, {
        iou: iou.toFixed(3),
        containment: containment.toFixed(3),
        reverseContainment: reverseContainment.toFixed(3),
      });
      
      // Suppress if significant overlap or containment
      if (iou >= iouThreshold || containment >= containmentThreshold || reverseContainment >= containmentThreshold) {
        debugLog(`Suppressing candidate ${j} (overlaps with ${i})`);
        suppressed.add(j);
        
        // Merge lines from suppressed entry into current
        const existingLineTexts = new Set(current.entry.lines.map(l => l.text));
        for (const line of other.entry.lines) {
          if (!existingLineTexts.has(line.text)) {
            current.entry.lines.push(line);
          }
        }
        // Update bbox to encompass merged content
        current.entry.bbox = mergeBBoxes([current.entry.bbox, other.entry.bbox]);
      }
    }
  }
  
  debugLog(`NMS Result: ${candidates.length} candidates -> ${kept.length} entries`);
  return kept;
}

/**
 * Check if a single dominant entry should collapse all others
 * Returns true if one entry is clearly dominant and overlaps all others
 */
function checkSingleRecordDominance(
  candidates: Array<{ entry: FusionEntry; score: CandidateScore }>,
  pageArea: number
): boolean {
  if (candidates.length <= 1) return false;
  
  // Only check for single record dominance if we have 3+ candidates
  // This prevents false positives when we have 2-4 valid entries
  if (candidates.length < 3) {
    debugLog('Skipping single record dominance check (too few candidates)');
    return false;
  }
  
  // Sort by area descending
  const sorted = [...candidates].sort((a, b) => b.score.area - a.score.area);
  const largest = sorted[0];
  
  // Check if largest covers significant portion of page (>60% - increased threshold)
  const largestCoverage = largest.score.area / pageArea;
  if (largestCoverage < 0.6) {
    debugLog(`Not single dominant: coverage ${(largestCoverage * 100).toFixed(1)}% < 60%`);
    return false;
  }
  
  // Check if largest has significantly more anchor labels (at least 2x more)
  const largestAnchors = largest.score.anchorLabelCount;
  const otherMaxAnchors = Math.max(...sorted.slice(1).map(c => c.score.anchorLabelCount));
  if (largestAnchors < otherMaxAnchors * 2) {
    debugLog(`Not single dominant: anchor labels ${largestAnchors} < ${otherMaxAnchors * 2}`);
    return false;
  }
  
  // Check if all other candidates overlap with the largest (at least 80% overlap)
  for (let i = 1; i < sorted.length; i++) {
    const containment = calculateContainment(largest.entry.bbox, sorted[i].entry.bbox);
    if (containment < 0.8) {
      // Found a candidate that doesn't significantly overlap - not single dominant
      debugLog(`Not single dominant: candidate ${i} has only ${(containment * 100).toFixed(1)}% overlap`);
      return false;
    }
  }
  
  debugLog('Single record dominance detected', {
    coverage: (largestCoverage * 100).toFixed(1) + '%',
    anchorLabels: largestAnchors,
  });
  
  return true;
}

/**
 * Detect entries using quadrant clustering for 4-card layouts
 * Now with post-processing to validate results
 */
export function detectEntriesQuadrant(
  lines: FusionLine[],
  pageWidth: number,
  pageHeight: number
): FusionEntry[] {
  if (lines.length === 0 || pageWidth === 0 || pageHeight === 0) {
    return [];
  }
  
  const midX = pageWidth / 2;
  const midY = pageHeight / 2;
  
  // Group lines into quadrants
  const quadrants: { [key: string]: FusionLine[] } = {
    TL: [], TR: [], BL: [], BR: [],
  };
  
  for (const line of lines) {
    const centroid = getBBoxCentroid(line.bbox);
    const isLeft = centroid.x < midX;
    const isTop = centroid.y < midY;
    
    if (isTop && isLeft) quadrants.TL.push(line);
    else if (isTop && !isLeft) quadrants.TR.push(line);
    else if (!isTop && isLeft) quadrants.BL.push(line);
    else quadrants.BR.push(line);
  }
  
  // Create entries from non-empty quadrants
  const entries: FusionEntry[] = [];
  const quadrantOrder = ['TL', 'TR', 'BL', 'BR'];
  
  for (const quadrant of quadrantOrder) {
    const quadrantLines = quadrants[quadrant];
    if (quadrantLines.length === 0) continue;
    
    const lineBboxes = quadrantLines.map(l => l.bbox);
    const entryBbox = mergeBBoxes(lineBboxes);
    const recordNumber = extractRecordNumber(quadrantLines);
    
    entries.push({
      id: `entry-${entries.length}`,
      index: entries.length,
      recordNumber,
      bbox: entryBbox,
      blocks: [],
      lines: quadrantLines,
    });
  }
  
  return entries;
}

/**
 * Detect entries using gap-based clustering (for non-quadrant layouts)
 */
export function detectEntriesGap(
  lines: FusionLine[],
  yGapThreshold: number = 30  // Reduced threshold for better detection of closely-spaced entries
): FusionEntry[] {
  if (lines.length === 0) return [];
  
  // Sort lines by Y position
  const sortedLines = [...lines].sort((a, b) => a.bbox.y - b.bbox.y);
  
  const entries: FusionEntry[] = [];
  let currentLines: FusionLine[] = [sortedLines[0]];
  
  for (let i = 1; i < sortedLines.length; i++) {
    const prevLine = sortedLines[i - 1];
    const currLine = sortedLines[i];
    const gap = currLine.bbox.y - (prevLine.bbox.y + prevLine.bbox.h);
    
    if (gap > yGapThreshold) {
      // Start new entry
      const lineBboxes = currentLines.map(l => l.bbox);
      const entryBbox = mergeBBoxes(lineBboxes);
      const recordNumber = extractRecordNumber(currentLines);
      
      entries.push({
        id: `entry-${entries.length}`,
        index: entries.length,
        recordNumber,
        bbox: entryBbox,
        blocks: [],
        lines: currentLines,
      });
      
      currentLines = [currLine];
    } else {
      currentLines.push(currLine);
    }
  }
  
  // Don't forget the last group
  if (currentLines.length > 0) {
    const lineBboxes = currentLines.map(l => l.bbox);
    const entryBbox = mergeBBoxes(lineBboxes);
    const recordNumber = extractRecordNumber(currentLines);
    
    entries.push({
      id: `entry-${entries.length}`,
      index: entries.length,
      recordNumber,
      bbox: entryBbox,
      blocks: [],
      lines: currentLines,
    });
  }
  
  return entries;
}

/**
 * Extract record number from lines (looks for N° or No patterns)
 */
export function extractRecordNumber(lines: FusionLine[]): string | undefined {
  const patterns = [
    /N[°o]\s*(\d+)/i,
    /No\.?\s*(\d+)/i,
    /Record\s*#?\s*(\d+)/i,
    /PARISH\s+RECORD\s+N[°o]?\s*(\d+)/i,
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  
  return undefined;
}

/**
 * Hard filters to discard invalid candidate entries
 */
function applyHardFilters(
  entries: FusionEntry[],
  pageWidth: number,
  pageHeight: number
): FusionEntry[] {
  const pageArea = pageWidth * pageHeight;
  const minAreaThreshold = pageArea * 0.05; // At least 5% of page
  
  return entries.filter(entry => {
    const area = entry.bbox.w * entry.bbox.h;
    const aspectRatio = calculateAspectRatio(entry.bbox);
    
    // Filter 1: Minimum area
    if (area < minAreaThreshold) {
      debugLog(`Filtered out entry (too small): area=${area}, threshold=${minAreaThreshold}`);
      return false;
    }
    
    // Filter 2: Extreme aspect ratios (not resembling a record card)
    if (aspectRatio < 0.2 || aspectRatio > 5.0) {
      debugLog(`Filtered out entry (extreme aspect ratio): ${aspectRatio.toFixed(2)}`);
      return false;
    }
    
    // Filter 3: Must have some text content
    if (entry.lines.length === 0) {
      debugLog('Filtered out entry (no lines)');
      return false;
    }
    
    return true;
  });
}

/**
 * Main entry detection function - Production-grade with NMS
 * Tries multiple detection strategies and applies robust post-processing
 */
export function detectEntries(
  vision: VisionResponse | null,
  ocrText?: string
): FusionEntry[] {
  debugLog('=== Starting Entry Detection ===');
  
  // Try Vision-based detection first
  if (vision?.fullTextAnnotation) {
    const lines = parseVisionResponse(vision);
    const { width, height } = getVisionPageSize(vision);
    const pageArea = width * height;
    
    debugLog(`Page dimensions: ${width}x${height}, Lines: ${lines.length}`);
    
    if (lines.length > 0 && width > 0 && height > 0) {
      // Collect candidate entries from multiple strategies
      let candidates: Array<{ entry: FusionEntry; score: CandidateScore }> = [];
      
      // Strategy 1: Quadrant detection
      const quadrantEntries = detectEntriesQuadrant(lines, width, height);
      debugLog(`Quadrant detection found ${quadrantEntries.length} entries`);
      
      // Strategy 2: Gap-based detection
      const gapEntries = detectEntriesGap(lines);
      debugLog(`Gap detection found ${gapEntries.length} entries`);
      
      // Strategy 3: Single entry (all lines together)
      const singleEntry: FusionEntry = {
        id: 'entry-single',
        index: 0,
        recordNumber: extractRecordNumber(lines),
        bbox: mergeBBoxes(lines.map(l => l.bbox)),
        blocks: [],
        lines,
      };
      
      // Score all candidates
      const allCandidates = [
        ...quadrantEntries,
        ...gapEntries,
        singleEntry,
      ];
      
      // Apply hard filters first
      const filteredCandidates = applyHardFilters(allCandidates, width, height);
      debugLog(`After hard filters: ${filteredCandidates.length} candidates`);
      
      // Score remaining candidates
      candidates = filteredCandidates.map(entry => ({
        entry,
        score: scoreCandidate(entry.bbox, entry.lines, pageArea),
      }));
      
      // Log candidate scores for debugging
      for (const c of candidates) {
        debugLog(`Candidate score:`, {
          area: c.score.area,
          textDensity: c.score.textDensity.toFixed(2),
          anchorLabels: c.score.anchorLabelCount,
          aspectPenalty: c.score.aspectRatioPenalty,
          totalScore: c.score.totalScore.toFixed(2),
          bbox: c.entry.bbox,
        });
      }
      
      // Check for single record dominance
      if (checkSingleRecordDominance(candidates, pageArea)) {
        // Return only the largest/highest-scoring entry
        const sorted = [...candidates].sort((a, b) => b.score.totalScore - a.score.totalScore);
        const dominant = sorted[0].entry;
        dominant.id = 'entry-0';
        dominant.index = 0;
        debugLog('Returning single dominant entry');
        return [dominant];
      }
      
      // Apply NMS to collapse overlapping entries
      const nmsResult = applyNMS(candidates);
      
      // Re-index entries
      const finalEntries = nmsResult.map((entry, idx) => ({
        ...entry,
        id: `entry-${idx}`,
        index: idx,
      }));
      
      debugLog(`Final result: ${finalEntries.length} entries`);
      return finalEntries;
    }
  }
  
  // Fallback: regex-based detection from OCR text
  if (ocrText) {
    debugLog('Falling back to text-based detection');
    return detectEntriesFromText(ocrText);
  }
  
  debugLog('No entries detected');
  return [];
}

/**
 * Fallback: detect entries from plain OCR text using regex
 */
export function detectEntriesFromText(ocrText: string): FusionEntry[] {
  // Strategy 1: Split by "PARISH RECORD" or "PART 1" headers
  const entryPattern = /(?:PARISH\s+RECORD|PART\s+1[-–]?BAPTISMS?)/gi;
  const parts = ocrText.split(entryPattern);
  
  if (parts.length > 1) {
    const entries: FusionEntry[] = [];
    for (let i = 1; i < parts.length; i++) {
      const text = parts[i].trim();
      if (!text) continue;
      
      // Try to extract record number
      const recordMatch = text.match(/N[°o]\s*(\d+)/i);
      
      entries.push({
        id: `entry-${entries.length}`,
        index: entries.length,
        recordNumber: recordMatch?.[1],
        bbox: { x: 0, y: 0, w: 0, h: 0 }, // No bbox info in text-only mode
        blocks: [],
        lines: [{ text, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
      });
    }
    
    if (entries.length > 0) return entries;
  }
  
  // Strategy 2: Split by blank lines (double newlines or large gaps)
  // This handles documents where entries are separated by blank lines
  const blankLinePattern = /\n\s*\n\s*\n/; // Three or more newlines
  const blankLineParts = ocrText.split(blankLinePattern);
  
  if (blankLineParts.length > 1) {
    const entries: FusionEntry[] = [];
    for (let i = 0; i < blankLineParts.length; i++) {
      const text = blankLineParts[i].trim();
      if (!text || text.length < 10) continue; // Skip very short fragments
      
      // Try to extract record number
      const recordMatch = text.match(/N[°o]\s*(\d+)/i);
      
      entries.push({
        id: `entry-${entries.length}`,
        index: entries.length,
        recordNumber: recordMatch?.[1],
        bbox: { x: 0, y: 0, w: 0, h: 0 },
        blocks: [],
        lines: [{ text, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
      });
    }
    
    if (entries.length > 1) {
      debugLog(`Text-based detection found ${entries.length} entries via blank lines`);
      return entries;
    }
  }
  
  // Strategy 3: Split by patterns that look like name lines (lines starting with capital letters)
  // This is a fallback for documents without clear separators
  const lines = ocrText.split('\n').filter(l => l.trim().length > 0);
  const namePattern = /^[A-ZА-ЯЁ][a-zа-яё]+\s+[A-ZА-ЯЁ][a-zа-яё]+/; // Pattern: CapitalWord CapitalWord
  
  if (lines.length > 5) {
    const entries: FusionEntry[] = [];
    let currentEntryLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line looks like the start of a new entry (name pattern)
      if (namePattern.test(line) && currentEntryLines.length > 3) {
        // Save previous entry
        const entryText = currentEntryLines.join('\n');
        entries.push({
          id: `entry-${entries.length}`,
          index: entries.length,
          recordNumber: undefined,
          bbox: { x: 0, y: 0, w: 0, h: 0 },
          blocks: [],
          lines: [{ text: entryText, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
        });
        currentEntryLines = [line];
      } else {
        currentEntryLines.push(line);
      }
    }
    
    // Don't forget the last entry
    if (currentEntryLines.length > 0) {
      const entryText = currentEntryLines.join('\n');
      entries.push({
        id: `entry-${entries.length}`,
        index: entries.length,
        recordNumber: undefined,
        bbox: { x: 0, y: 0, w: 0, h: 0 },
        blocks: [],
        lines: [{ text: entryText, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
      });
    }
    
    if (entries.length > 1) {
      debugLog(`Text-based detection found ${entries.length} entries via name patterns`);
      return entries;
    }
  }
  
  // Fallback: return single entry
  debugLog('Text-based detection: falling back to single entry');
  return [{
    id: 'entry-0',
    index: 0,
    bbox: { x: 0, y: 0, w: 0, h: 0 },
    blocks: [],
    lines: [{ text: ocrText, bbox: { x: 0, y: 0, w: 0, h: 0 }, tokens: [] }],
  }];
}

// ============================================================================
// Label Anchoring (Fuzzy Matching)
// ============================================================================

/**
 * Normalize text for fuzzy matching
 */
export function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
export function similarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  
  if (normA === normB) return 1;
  if (normA.length === 0 || normB.length === 0) return 0;
  
  // Check for contains
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.9;
  }
  
  // Levenshtein-based similarity
  const maxLen = Math.max(normA.length, normB.length);
  const distance = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Detect labels in entry lines using fuzzy matching
 */
export function detectLabels(
  entry: FusionEntry,
  recordType: 'baptism' | 'marriage' | 'funeral'
): DetectedLabel[] {
  const dictionary = LABEL_DICTIONARIES[recordType] || {};
  const detectedLabels: DetectedLabel[] = [];
  
  for (const line of entry.lines) {
    const normalizedLine = normalizeText(line.text);
    
    for (const [labelText, fieldName] of Object.entries(dictionary)) {
      const normalizedLabel = normalizeText(labelText);
      const score = similarity(normalizedLine, normalizedLabel);
      
      // Also check for partial matches at line start
      if (normalizedLine.startsWith(normalizedLabel)) {
        const partialScore = Math.min(1, 0.85 + (normalizedLabel.length / normalizedLine.length) * 0.15);
        
        if (partialScore > 0.6) {
          detectedLabels.push({
            label: labelText,
            canonicalField: fieldName,
            bbox: line.bbox,
            confidence: partialScore,
            matchedText: line.text,
          });
        }
      } else if (score > 0.7) {
        detectedLabels.push({
          label: labelText,
          canonicalField: fieldName,
          bbox: line.bbox,
          confidence: score,
          matchedText: line.text,
        });
      }
    }
    
    // Also check individual tokens
    for (const token of line.tokens) {
      const normalizedToken = normalizeText(token.text);
      
      for (const [labelText, fieldName] of Object.entries(dictionary)) {
        const normalizedLabel = normalizeText(labelText);
        const score = similarity(normalizedToken, normalizedLabel);
        
        if (score > 0.8) {
          // Check if we already have this label with higher confidence
          const existing = detectedLabels.find(l => l.canonicalField === fieldName);
          if (!existing || existing.confidence < score) {
            if (existing) {
              existing.confidence = score;
              existing.bbox = token.bbox;
              existing.matchedText = token.text;
            } else {
              detectedLabels.push({
                label: labelText,
                canonicalField: fieldName,
                bbox: token.bbox,
                confidence: score,
                matchedText: token.text,
              });
            }
          }
        }
      }
    }
  }
  
  // Deduplicate by field name, keeping highest confidence
  const deduped: DetectedLabel[] = [];
  const seenFields = new Set<string>();
  
  const sorted = [...detectedLabels].sort((a, b) => b.confidence - a.confidence);
  
  for (const label of sorted) {
    if (!seenFields.has(label.canonicalField)) {
      seenFields.add(label.canonicalField);
      deduped.push(label);
    }
  }
  
  return deduped;
}

// ============================================================================
// Value Extraction (Field Mapping)
// ============================================================================

/**
 * Extract value for a detected label by looking at text to the right or below
 */
export function extractValueForLabel(
  label: DetectedLabel,
  entry: FusionEntry,
  allLabels: DetectedLabel[]
): { value: string; bbox?: BBox; confidence: number } {
  // Find lines/tokens to the right of label in same Y band
  const rightTokens: FusionToken[] = [];
  const belowTokens: FusionToken[] = [];
  
  for (const line of entry.lines) {
    // Skip the label line itself if it's a direct match
    if (line.text === label.matchedText) {
      // Look at tokens after the label within the same line
      let foundLabel = false;
      for (const token of line.tokens) {
        if (foundLabel) {
          rightTokens.push(token);
        } else if (similarity(token.text, label.label) > 0.7 || 
                   similarity(token.text, label.matchedText) > 0.7) {
          foundLabel = true;
        }
      }
      continue;
    }
    
    // Check if line is to the right in same Y band
    if (isInSameYBand(line.bbox, label.bbox, 30) && isToRightOf(line.bbox, label.bbox)) {
      for (const token of line.tokens) {
        rightTokens.push(token);
      }
    }
    
    // Check if line is below (within reasonable distance)
    if (isBelow(line.bbox, label.bbox)) {
      const verticalDistance = line.bbox.y - (label.bbox.y + label.bbox.h);
      if (verticalDistance < 50) {
        // Make sure we're not crossing into another label's territory
        const isAnotherLabel = allLabels.some(
          l => l !== label && bboxesOverlap(line.bbox, l.bbox)
        );
        if (!isAnotherLabel) {
          for (const token of line.tokens) {
            belowTokens.push(token);
          }
        }
      }
    }
  }
  
  // Prefer right tokens, fall back to below tokens
  const tokens = rightTokens.length > 0 ? rightTokens : belowTokens;
  
  if (tokens.length === 0) {
    return { value: '', confidence: 0 };
  }
  
  const value = tokens.map(t => t.text).join(' ').trim();
  const avgConfidence = tokens.reduce((sum, t) => sum + (t.confidence || 0.5), 0) / tokens.length;
  const bbox = tokens.length > 0 ? mergeBBoxes(tokens.map(t => t.bbox)) : undefined;
  
  return { value, bbox, confidence: avgConfidence };
}

/**
 * Auto-map all detected labels to field values
 * Uses canonical schema keys (not DB column names)
 */
export function autoMapFields(
  entry: FusionEntry,
  labels: DetectedLabel[],
  recordType?: 'baptism' | 'marriage' | 'funeral',
  stickyDefaults?: Record<'baptism' | 'marriage' | 'funeral', boolean>
): Record<string, { value: string; confidence: number; labelBbox?: BBox; valueBbox?: BBox }> {
  const result: Record<string, { value: string; confidence: number; labelBbox?: BBox; valueBbox?: BBox }> = {};
  
  // If sticky defaults enabled, filter labels to only default columns
  let filteredLabels = labels;
  if (recordType && stickyDefaults?.[recordType]) {
    const defaultColumns = getDefaultColumns(recordType);
    
    // Only process labels that map to default columns
    filteredLabels = labels.filter(label => {
      // Map canonicalField to database column name
      // This is a simple mapping - you may need to adjust based on your field naming
      const dbColumn = label.canonicalField;
      return defaultColumns.includes(dbColumn);
    });
  }
  
  // ============================================================================
  // CUSTOM FIELD MAPPING LOGIC - Uses Canonical Schema Keys
  // ============================================================================
  // Use canonical schema registry keys (not DB column names)
  // The label.canonicalField already matches schema keys from LABEL_DICTIONARIES
  
  // Get schema for validation
  const schema = getRecordSchema(recordType || 'baptism');
  const schemaKeys = new Set(schema.map(f => f.key));
  
  // Process each label - use canonical field key directly
  for (const label of filteredLabels) {
    const { value, bbox, confidence } = extractValueForLabel(label, entry, labels);
    
    // Use canonical field key from label dictionary (matches schema registry)
    const canonicalKey = label.canonicalField;
    
    // Dev-only: validate canonical key exists in schema
    if (process.env.NODE_ENV === 'development' && !schemaKeys.has(canonicalKey)) {
      console.warn(`[autoMapFields] Unknown canonical field key: "${canonicalKey}" for ${recordType}`);
    }
    
    // Apply custom value processing for specific fields
    let processedValue = value;
    let processedConfidence = confidence;
    
    // Date fields: normalize date format
    if (canonicalKey === 'date_of_birth' || canonicalKey === 'date_of_baptism' || 
        canonicalKey === 'date_of_marriage' || canonicalKey === 'date_of_death' ||
        canonicalKey === 'date_of_funeral' || canonicalKey === 'date_of_burial') {
      processedValue = normalizeDateValue(value);
      processedConfidence = Math.min(confidence + 0.1, 1.0);
    }
    
    // Name fields: capitalize first letter
    if (canonicalKey === 'child_name' || canonicalKey === 'deceased_name' ||
        canonicalKey === 'groom_name' || canonicalKey === 'bride_name') {
      // Don't split here - keep full name in canonical key
      // Splitting happens at DB commit time
      processedValue = value.trim();
    } else if (canonicalKey === 'father_name' || canonicalKey === 'mother_name') {
      // Capitalize first letter of each word
      processedValue = value.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Split parents name into father and mother if needed
    if (canonicalKey === 'parents_name' && value.includes(' and ')) {
      const parts = value.split(' and ');
      if (parts.length === 2) {
        result['father_name'] = {
          value: parts[0].trim(),
          confidence: confidence * 0.9,
          labelBbox: label.bbox,
          valueBbox: bbox,
        };
        result['mother_name'] = {
          value: parts[1].trim(),
          confidence: confidence * 0.9,
          labelBbox: label.bbox,
          valueBbox: bbox,
        };
        continue; // Skip adding to 'parents_name' field
      }
    }
    
    // Store the mapped field using canonical key
    result[canonicalKey] = {
      value: processedValue,
      confidence: processedConfidence,
      labelBbox: label.bbox,
      valueBbox: bbox,
    };
  }
  
  // Dev-only: validate all result keys
  if (process.env.NODE_ENV === 'development' && recordType) {
    const resultKeys = Object.keys(result);
    const validation = validateFieldKeys(recordType, resultKeys);
    if (!validation.valid) {
      console.warn('[autoMapFields] Field key validation failed:', validation.errors);
    }
  }
  
  // Also extract record number if found (always include this)
  if (entry.recordNumber && !result.record_number) {
    result.record_number = {
      value: entry.recordNumber,
      confidence: 0.9,
    };
  }
  
  return result;
}

/**
 * Helper function to normalize date values
 * Converts various date formats to YYYY-MM-DD
 */
function normalizeDateValue(dateStr: string): string {
  if (!dateStr) return '';
  
  // Try to parse common date formats
  // Example: "January 1, 1920" -> "1920-01-01"
  // Example: "1/1/1920" -> "1920-01-01"
  // Example: "Jan 1, 1920" -> "1920-01-01"
  
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If parsing fails, return original value
  return dateStr;
}

// ============================================================================
// Coordinate Conversion (Vision coords → Screen coords)
// ============================================================================

/**
 * Convert vision-space bbox to screen-space bbox based on rendered image dimensions
 */
export function visionToScreenBBox(
  visionBbox: BBox,
  visionWidth: number,
  visionHeight: number,
  screenWidth: number,
  screenHeight: number
): BBox {
  if (visionWidth === 0 || visionHeight === 0) {
    return visionBbox;
  }
  
  const scaleX = screenWidth / visionWidth;
  const scaleY = screenHeight / visionHeight;
  
  return {
    x: visionBbox.x * scaleX,
    y: visionBbox.y * scaleY,
    w: visionBbox.w * scaleX,
    h: visionBbox.h * scaleY,
  };
}

