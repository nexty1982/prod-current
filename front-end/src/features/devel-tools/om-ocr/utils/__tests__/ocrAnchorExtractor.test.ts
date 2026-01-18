/**
 * Unit tests for OCR Anchor Extractor
 */

import { extractFieldsFromAnchors } from '../ocrAnchorExtractor';
import { normalizeOcrLines } from '../ocrTextNormalizer';
import { FusionLine } from '../../types/fusion';

describe('ocrAnchorExtractor', () => {
  const createLine = (text: string, index: number): FusionLine => ({
    id: `line-${index}`,
    text,
    bbox: { x: 0, y: index * 20, w: 100, h: 20 },
    tokens: [],
  });

  describe('extractFieldsFromAnchors', () => {
    it('should extract child name from "Child: Stepan"', () => {
      const lines = [createLine('Child: Stepan Роздольский', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.child_name_raw).toBeDefined();
      expect(extracted.child_name_raw?.rawValue).toBe('Stepan Роздольский');
      expect(extracted.child_name_raw?.rawValue).not.toContain('Child:');
    });

    it('should extract child name when label is on separate line', () => {
      const lines = [
        createLine('Child:', 0),
        createLine('Stepan Роздольский', 1),
      ];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.child_name_raw).toBeDefined();
      expect(extracted.child_name_raw?.rawValue).toBe('Stepan Роздольский');
    });

    it('should extract birth date', () => {
      const lines = [createLine('Birth date: 5/10/1931', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.birth_date_raw).toBeDefined();
      expect(extracted.birth_date_raw?.rawValue).toBe('5/10/1931');
    });

    it('should extract reception date', () => {
      const lines = [createLine('Reception date: 5/24/1931', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.reception_date_raw).toBeDefined();
      expect(extracted.reception_date_raw?.rawValue).toBe('5/24/1931');
    });

    it('should extract parents', () => {
      const lines = [createLine('Parents: John and Mary Smith', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.parents_raw).toBeDefined();
      expect(extracted.parents_raw?.rawValue).toBe('John and Mary Smith');
    });

    it('should extract sponsors/godparents', () => {
      const lines = [createLine('Godparents: Peter and Anna', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.sponsors_raw).toBeDefined();
      expect(extracted.sponsors_raw?.rawValue).toBe('Peter and Anna');
    });

    it('should extract clergy', () => {
      const lines = [createLine('Performed by: Fr. John Smith', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.clergy_raw).toBeDefined();
      expect(extracted.clergy_raw?.rawValue).toBe('Fr. John Smith');
    });

    it('should handle Russian/Cyrillic anchors', () => {
      const lines = [createLine('Ребенок: Степан Роздольский', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'ru');

      expect(extracted.child_name_raw).toBeDefined();
      expect(extracted.child_name_raw?.rawValue).toBe('Степан Роздольский');
    });

    it('should include debug information', () => {
      const lines = [createLine('Child: Stepan', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.debug).toBeDefined();
      expect(extracted.debug.matched_anchor.child_name).toBeDefined();
      expect(extracted.debug.source_line_indexes.child_name).toEqual([0]);
    });

    it('should not extract label text as value', () => {
      const lines = [createLine('Child: Stepan', 0)];
      const normalized = normalizeOcrLines(lines);
      const extracted = extractFieldsFromAnchors(normalized, 'baptism', 'en');

      expect(extracted.child_name_raw?.rawValue).not.toContain('Child:');
      expect(extracted.child_name_raw?.rawValue).toBe('Stepan');
    });
  });
});

