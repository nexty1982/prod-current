/**
 * OCR Row Splitter Utility
 * Intelligently segments OCR'd text into multiple record blocks
 * Designed for Orthodox church death records and similar structured documents
 */

export interface OcrTextLine {
  text: string;
  confidence: number;
  index: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RecordSegment {
  startIndex: number;
  endIndex: number;
  lines: OcrTextLine[];
  estimatedRecordNumber: number;
}

/**
 * Splits OCR text into logical record blocks based on date patterns
 * and structural analysis
 */
export class OcrRowSplitter {
  private static readonly DATE_PATTERNS = [
    /^\d{1,2}\/\d{1,2}$/,           // MM/DD or M/D
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // MM/DD/YY or MM/DD/YYYY
    /^\d{1,2}-\d{1,2}$/,            // MM-DD or M-D
    /^\d{1,2}-\d{1,2}-\d{2,4}$/,    // MM-DD-YY or MM-DD-YYYY
    /^\d{1,2}\.\d{1,2}$/,           // MM.DD or M.D
    /^\d{1,2}\.\d{1,2}\.\d{2,4}$/   // MM.DD.YY or MM.DD.YYYY
  ];

  private static readonly NAME_PATTERNS = [
    /^[A-Z][a-z]+ [A-Z][a-z]+(\s+\([^)]+\))?$/,  // "John Smith" or "John Smith (NP)"
    /^[A-Z][a-z]+,?\s+[A-Z][a-z]+/,              // "Smith, John" or "Smith John"
    /^[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+/       // "John A. Smith"
  ];

  private static readonly PRIEST_PATTERNS = [
    /^Fr\.\s+/i,                    // "Fr. John"
    /^Father\s+/i,                  // "Father John"
    /^Rev\.\s+/i,                   // "Rev. John"
    /^Reverend\s+/i                 // "Reverend John"
  ];

  private static readonly AGE_PATTERNS = [
    /^\d{1,3}$/,                    // Simple age number
    /^\d{1,3}\s*(yrs?|years?)$/i,   // "80 yrs" or "80 years"
    /^Age\s*:?\s*\d{1,3}$/i         // "Age: 80"
  ];

  /**
   * Main method to split OCR text into record segments
   */
  public static splitIntoRecords(ocrLines: OcrTextLine[]): RecordSegment[] {
    if (!ocrLines || ocrLines.length === 0) {
      return [];
    }

    const segments: RecordSegment[] = [];
    let currentSegmentStart = 0;
    let recordNumber = 1;

    // Find potential record boundaries
    const recordBoundaries = this.findRecordBoundaries(ocrLines);
    
    // Create segments based on boundaries
    for (let i = 0; i < recordBoundaries.length; i++) {
      const startIndex = recordBoundaries[i];
      const endIndex = i < recordBoundaries.length - 1 
        ? recordBoundaries[i + 1] - 1 
        : ocrLines.length - 1;

      if (startIndex <= endIndex) {
        segments.push({
          startIndex,
          endIndex,
          lines: ocrLines.slice(startIndex, endIndex + 1),
          estimatedRecordNumber: recordNumber++
        });
      }
    }

    // If no boundaries found, treat all text as one record
    if (segments.length === 0) {
      segments.push({
        startIndex: 0,
        endIndex: ocrLines.length - 1,
        lines: ocrLines,
        estimatedRecordNumber: 1
      });
    }

    return segments;
  }

  /**
   * Find potential record start boundaries using date patterns and spacing
   */
  private static findRecordBoundaries(ocrLines: OcrTextLine[]): number[] {
    const boundaries: number[] = [0]; // Always start with first line
    
    for (let i = 1; i < ocrLines.length; i++) {
      const line = ocrLines[i];
      const prevLine = ocrLines[i - 1];
      
      // Check if current line starts a new record
      if (this.isRecordStart(line, prevLine, i)) {
        boundaries.push(i);
      }
    }

    return boundaries;
  }

  /**
   * Determine if a line likely starts a new record
   */
  private static isRecordStart(
    currentLine: OcrTextLine, 
    prevLine: OcrTextLine, 
    index: number
  ): boolean {
    const text = currentLine.text.trim();
    
    // Primary indicator: starts with a date pattern
    if (this.isDatePattern(text)) {
      return true;
    }

    // Secondary indicators
    const hasSignificantGap = this.hasSignificantVerticalGap(currentLine, prevLine);
    const isAfterCompletedRecord = this.looksLikeRecordEnd(prevLine.text);
    
    return hasSignificantGap && (this.isNamePattern(text) || isAfterCompletedRecord);
  }

  /**
   * Check if text matches date patterns
   */
  private static isDatePattern(text: string): boolean {
    return this.DATE_PATTERNS.some(pattern => pattern.test(text.trim()));
  }

  /**
   * Check if text matches name patterns
   */
  private static isNamePattern(text: string): boolean {
    return this.NAME_PATTERNS.some(pattern => pattern.test(text.trim()));
  }

  /**
   * Check if text matches priest patterns
   */
  private static isPriestPattern(text: string): boolean {
    return this.PRIEST_PATTERNS.some(pattern => pattern.test(text.trim()));
  }

  /**
   * Check if text matches age patterns
   */
  private static isAgePattern(text: string): boolean {
    return this.AGE_PATTERNS.some(pattern => pattern.test(text.trim()));
  }

  /**
   * Check if there's a significant vertical gap between lines
   */
  private static hasSignificantVerticalGap(
    currentLine: OcrTextLine, 
    prevLine: OcrTextLine
  ): boolean {
    if (!currentLine.boundingBox || !prevLine.boundingBox) {
      return false; // Can't determine without position data
    }

    const prevBottom = prevLine.boundingBox.y + prevLine.boundingBox.height;
    const currentTop = currentLine.boundingBox.y;
    const gap = currentTop - prevBottom;
    
    // Consider a gap significant if it's more than 1.5x the height of a typical line
    const typicalLineHeight = prevLine.boundingBox.height;
    return gap > typicalLineHeight * 1.5;
  }

  /**
   * Check if previous line looks like the end of a record
   */
  private static looksLikeRecordEnd(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    
    // Common endings for death records
    const endPatterns = [
      /cemetery/i,
      /burial/i,
      /plot\s*#?\d+/i,
      /grave/i,
      /section/i,
      /lot\s*#?\d+/i
    ];

    return endPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Analyze a segment to suggest field mappings
   */
  public static suggestFieldMappings(segment: RecordSegment): Record<string, number[]> {
    const suggestions: Record<string, number[]> = {
      death_date: [],
      burial_date: [],
      name: [],
      age: [],
      cause_of_death: [],
      priest_administered: [],
      priest_officiated: [],
      burial_location: []
    };

    segment.lines.forEach((line, index) => {
      const text = line.text.trim();
      
      if (this.isDatePattern(text)) {
        // First date is usually death date, second is burial date
        if (suggestions.death_date.length === 0) {
          suggestions.death_date.push(segment.startIndex + index);
        } else if (suggestions.burial_date.length === 0) {
          suggestions.burial_date.push(segment.startIndex + index);
        }
      } else if (this.isNamePattern(text)) {
        suggestions.name.push(segment.startIndex + index);
      } else if (this.isAgePattern(text)) {
        suggestions.age.push(segment.startIndex + index);
      } else if (this.isPriestPattern(text)) {
        // Could be either priest field
        if (suggestions.priest_administered.length === 0) {
          suggestions.priest_administered.push(segment.startIndex + index);
        } else {
          suggestions.priest_officiated.push(segment.startIndex + index);
        }
      } else if (this.looksLikeRecordEnd(text)) {
        suggestions.burial_location.push(segment.startIndex + index);
      }
    });

    return suggestions;
  }

  /**
   * Merge nearby segments that might have been over-split
   */
  public static mergeShortSegments(
    segments: RecordSegment[], 
    minLinesPerRecord: number = 4
  ): RecordSegment[] {
    const merged: RecordSegment[] = [];
    let i = 0;

    while (i < segments.length) {
      let currentSegment = segments[i];
      
      // If segment is too short, try to merge with next
      while (
        i + 1 < segments.length && 
        currentSegment.lines.length < minLinesPerRecord
      ) {
        const nextSegment = segments[i + 1];
        
        // Merge segments
        currentSegment = {
          startIndex: currentSegment.startIndex,
          endIndex: nextSegment.endIndex,
          lines: [...currentSegment.lines, ...nextSegment.lines],
          estimatedRecordNumber: currentSegment.estimatedRecordNumber
        };
        
        i++; // Skip the merged segment
      }
      
      merged.push(currentSegment);
      i++;
    }

    return merged;
  }
}

/**
 * Mock OCR data generator for testing
 */
export const generateMockOcrData = (): OcrTextLine[] => {
  const mockData = [
    "2/15", "2/20", "Helen Russo (NP)", "80",
    "Fr. Jass Pawells", "SS. Peter Paul cemetery plot #1",
    "5/02", "5/05", "Rose Lovenick", "83",
    "Natural causes", "Fr. Michael Jones", "Orthodox Cemetery Section B",
    "7/12", "7/15", "George Antonios", "67",
    "Heart failure", "Fr. Constantine", "St. Mary Cemetery",
    "9/03", "9/07", "Maria Popovich", "91",
    "Age-related", "Fr. Nicholas", "Holy Cross Cemetery plot #45"
  ];

  return mockData.map((text, index) => ({
    text,
    confidence: 0.85 + Math.random() * 0.1, // Random confidence 85-95%
    index,
    boundingBox: {
      x: 100 + (index % 2) * 300, // Simulate 2-column layout
      y: 50 + Math.floor(index / 2) * 25,
      width: 200,
      height: 20
    }
  }));
};
