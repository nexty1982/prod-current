/**
 * Unit tests for OCR Text Normalizer
 */

import { normalizeOcrLines, normalizeLineText } from '../ocrTextNormalizer';
import { FusionLine } from '../../types/fusion';

describe('ocrTextNormalizer', () => {
  describe('normalizeLineText', () => {
    it('should normalize whitespace', () => {
      expect(normalizeLineText('  hello   world  ')).toBe('hello world');
    });

    it('should normalize full-width colon', () => {
      expect(normalizeLineText('Child： Stepan')).toBe('Child: Stepan');
    });

    it('should normalize label separators', () => {
      expect(normalizeLineText('Child.- Stepan')).toBe('Child: Stepan');
      expect(normalizeLineText('Child:  Stepan')).toBe('Child: Stepan');
    });
  });

  describe('normalizeOcrLines', () => {
    const createLine = (text: string, index: number): FusionLine => ({
      id: `line-${index}`,
      text,
      bbox: { x: 0, y: index * 20, w: 100, h: 20 },
      tokens: [],
    });

    it('should normalize basic lines', () => {
      const lines = [
        createLine('  Child:  Stepan  ', 0),
        createLine('Birth date: 5/10/1931', 1),
      ];

      const normalized = normalizeOcrLines(lines);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].text).toBe('Child: Stepan');
      expect(normalized[1].text).toBe('Birth date: 5/10/1931');
    });

    it('should join wrapped lines (label on one line, value on next)', () => {
      const lines = [
        createLine('Child:', 0),
        createLine('Stepan Роздольский', 1),
      ];

      const normalized = normalizeOcrLines(lines);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].text).toBe('Child: Stepan Роздольский');
      expect(normalized[0].isWrapped).toBe(true);
      expect(normalized[0].joinedIndices).toEqual([0, 1]);
    });

    it('should join comma-wrapped lines', () => {
      const lines = [
        createLine('Parents: John,', 0),
        createLine('Mary Smith', 1),
      ];

      const normalized = normalizeOcrLines(lines);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].text).toBe('Parents: John, Mary Smith');
    });

    it('should not join if next line is a label', () => {
      const lines = [
        createLine('Child: Stepan', 0),
        createLine('Birth date: 5/10/1931', 1),
      ];

      const normalized = normalizeOcrLines(lines);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].text).toBe('Child: Stepan');
    });

    it('should preserve original indices', () => {
      const lines = [
        createLine('Line 1', 0),
        createLine('Line 2', 1),
        createLine('Line 3', 2),
      ];

      const normalized = normalizeOcrLines(lines);

      expect(normalized[0].originalIndex).toBe(0);
      expect(normalized[1].originalIndex).toBe(1);
      expect(normalized[2].originalIndex).toBe(2);
    });
  });
});

