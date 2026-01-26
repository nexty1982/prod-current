/**
 * Extract Tokens and Lines from Vision API Response
 * Adapter to convert Google Vision JSON to normalized Token[] format
 * Reuses Token interface from layoutExtractor
 */

import { Token, NormalizedBBox } from '../layoutExtractor';

// Vision API types (minimal - just what we need)
interface VisionVertex {
  x?: number;
  y?: number;
}

interface VisionBoundingPoly {
  vertices?: VisionVertex[];
}

interface VisionSymbol {
  text?: string;
  confidence?: number;
  property?: {
    detectedBreak?: {
      type?: string;
    };
  };
}

interface VisionWord {
  symbols?: VisionSymbol[];
  boundingBox?: VisionBoundingPoly;
  confidence?: number;
}

interface VisionParagraph {
  words?: VisionWord[];
  boundingBox?: VisionBoundingPoly;
  confidence?: number;
}

interface VisionBlock {
  paragraphs?: VisionParagraph[];
}

interface VisionPage {
  width?: number;
  height?: number;
  blocks?: VisionBlock[];
}

interface VisionResponse {
  fullTextAnnotation?: {
    pages?: VisionPage[];
  };
}

export interface OcrLine {
  text: string;
  tokens: Token[];
  bboxNorm: NormalizedBBox;
  confidence?: number;
}

/**
 * Convert pixel bbox to normalized bbox (0..1 range)
 */
function normalizeBBox(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  pageWidth: number,
  pageHeight: number
): NormalizedBBox {
  if (pageWidth === 0 || pageHeight === 0) {
    return { x0: 0, y0: 0, x1: 0, y1: 0 };
  }
  return {
    x0: Math.max(0, Math.min(1, x0 / pageWidth)),
    y0: Math.max(0, Math.min(1, y0 / pageHeight)),
    x1: Math.max(0, Math.min(1, x1 / pageWidth)),
    y1: Math.max(0, Math.min(1, y1 / pageHeight)),
  };
}

/**
 * Extract bounding box from Vision vertices
 */
function extractBBox(vertices: VisionVertex[] | undefined): { x0: number; y0: number; x1: number; y1: number } {
  if (!vertices || vertices.length < 2) {
    return { x0: 0, y0: 0, x1: 0, y1: 0 };
  }

  const xs = vertices.map(v => v.x || 0).filter(x => x !== undefined);
  const ys = vertices.map(v => v.y || 0).filter(y => y !== undefined);

  if (xs.length === 0 || ys.length === 0) {
    return { x0: 0, y0: 0, x1: 0, y1: 0 };
  }

  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);

  return { x0, y0, x1, y1 };
}

/**
 * Detect script (Cyrillic, Latin, unknown)
 */
function detectScript(text: string): 'cyrillic' | 'latin' | 'unknown' {
  if (!text) return 'unknown';
  
  // Check for Cyrillic characters (Unicode range \u0400-\u04FF)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'cyrillic';
  }
  
  // Check for Latin characters
  if (/[A-Za-z]/.test(text)) {
    return 'latin';
  }
  
  return 'unknown';
}

/**
 * Extract word text from Vision symbols
 */
function extractWordText(symbols: VisionSymbol[] | undefined): string {
  if (!symbols) return '';
  
  let text = '';
  for (const symbol of symbols) {
    text += symbol.text || '';
    
    // Add space if break detected
    if (symbol.property?.detectedBreak?.type === 'SPACE' || 
        symbol.property?.detectedBreak?.type === 'SURE_SPACE') {
      text += ' ';
    }
  }
  
  return text.trim();
}

/**
 * Extract tokens and lines from Vision API response
 */
export function extractTokensFromVision(
  visionResponse: VisionResponse | null | undefined,
  options?: {
    pageIndex?: number; // Which page to extract (default: 0)
  }
): { tokens: Token[]; lines: OcrLine[] } {
  if (!visionResponse?.fullTextAnnotation?.pages) {
    return { tokens: [], lines: [] };
  }

  const pageIndex = options?.pageIndex ?? 0;
  const page = visionResponse.fullTextAnnotation.pages[pageIndex];
  
  if (!page) {
    return { tokens: [], lines: [] };
  }

  const pageWidth = page.width || 0;
  const pageHeight = page.height || 0;

  if (pageWidth === 0 || pageHeight === 0) {
    console.warn('[extractTokensFromVision] Page dimensions are zero');
    return { tokens: [], lines: [] };
  }

  const tokens: Token[] = [];
  const lines: OcrLine[] = [];
  let tokenIndex = 0;

  // Process blocks → paragraphs → words
  for (const block of page.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      const paragraphTokens: Token[] = [];
      const paragraphBBoxes: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];

      // Extract words from paragraph
      for (const word of paragraph.words || []) {
        const text = extractWordText(word.symbols);
        if (!text) continue;

        const bboxPx = extractBBox(word.boundingBox?.vertices);
        const bboxNorm = normalizeBBox(bboxPx.x0, bboxPx.y0, bboxPx.x1, bboxPx.y1, pageWidth, pageHeight);
        
        const script = detectScript(text);
        const isRu = script === 'cyrillic';
        
        const token: Token = {
          text,
          confidence: word.confidence ?? 0,
          langCodes: isRu ? ['ru'] : ['en'],
          bboxPx: {
            x0: bboxPx.x0,
            y0: bboxPx.y0,
            x1: bboxPx.x1,
            y1: bboxPx.y1,
          },
          bboxNorm: {
            nx0: bboxNorm.x0,
            ny0: bboxNorm.y0,
            nx1: bboxNorm.x1,
            ny1: bboxNorm.y1,
          },
          pageIndex,
          isRu,
          tokenId: `token_${pageIndex}_${tokenIndex++}`,
        };

        paragraphTokens.push(token);
        paragraphBBoxes.push(bboxPx);
      }

      if (paragraphTokens.length > 0) {
        // Add tokens to main list
        tokens.push(...paragraphTokens);

        // Create line from paragraph
        const lineText = paragraphTokens.map(t => t.text).join(' ');
        const lineBBoxPx = paragraphBBoxes.length > 0
          ? paragraphBBoxes.reduce((union, bbox) => ({
              x0: Math.min(union.x0, bbox.x0),
              y0: Math.min(union.y0, bbox.y0),
              x1: Math.max(union.x1, bbox.x1),
              y1: Math.max(union.y1, bbox.y1),
            }))
          : { x0: 0, y0: 0, x1: 0, y1: 0 };
        
        const lineBBoxNorm = normalizeBBox(
          lineBBoxPx.x0,
          lineBBoxPx.y0,
          lineBBoxPx.x1,
          lineBBoxPx.y1,
          pageWidth,
          pageHeight
        );

        lines.push({
          text: lineText,
          tokens: paragraphTokens,
          bboxNorm: lineBBoxNorm,
          confidence: paragraph.confidence,
        });
      }
    }
  }

  return { tokens, lines };
}

