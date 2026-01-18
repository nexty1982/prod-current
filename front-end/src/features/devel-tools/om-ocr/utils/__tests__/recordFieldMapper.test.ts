/**
 * Unit tests for Record Field Mapper
 */

import { mapExtractedFieldsToForm } from '../recordFieldMapper';
import { ExtractedFields } from '../ocrAnchorExtractor';

describe('recordFieldMapper', () => {
  describe('mapExtractedFieldsToForm', () => {
    it('should split child name into first and last name', () => {
      const extracted: ExtractedFields = {
        child_name_raw: {
          rawValue: 'Stepan Роздольский',
          confidence: 0.9,
          sourceLineIndices: [0],
          matchedAnchor: 'child',
          anchorLanguage: 'en',
        },
        confidence_by_field: { child_name: 0.9 },
        debug: {
          matched_anchor: { child_name: 'child' },
          source_line_indexes: { child_name: [0] },
        },
      };

      const result = mapExtractedFieldsToForm(extracted, 'baptism');

      expect(result.formPatch.first_name).toBeDefined();
      expect(result.formPatch.first_name.value).toBe('Stepan');
      expect(result.formPatch.last_name).toBeDefined();
      expect(result.formPatch.last_name.value).toBe('Роздольский');
    });

    it('should NOT include label in first_name', () => {
      const extracted: ExtractedFields = {
        child_name_raw: {
          rawValue: 'Child: Stepan Роздольский', // Label included (should be removed)
          confidence: 0.9,
          sourceLineIndices: [0],
          matchedAnchor: 'child',
          anchorLanguage: 'en',
        },
        confidence_by_field: { child_name: 0.9 },
        debug: {
          matched_anchor: { child_name: 'child' },
          source_line_indexes: { child_name: [0] },
        },
      };

      const result = mapExtractedFieldsToForm(extracted, 'baptism');

      expect(result.formPatch.first_name.value).not.toContain('Child:');
      expect(result.formPatch.first_name.value).toBe('Stepan');
    });

    it('should parse birth date correctly', () => {
      const extracted: ExtractedFields = {
        birth_date_raw: {
          rawValue: '5/10/1931',
          confidence: 0.9,
          sourceLineIndices: [1],
          matchedAnchor: 'birth date',
          anchorLanguage: 'en',
        },
        confidence_by_field: { birth_date: 0.9 },
        debug: {
          matched_anchor: { birth_date: 'birth date' },
          source_line_indexes: { birth_date: [1] },
        },
      };

      const result = mapExtractedFieldsToForm(extracted, 'baptism');

      expect(result.formPatch.birth_date).toBeDefined();
      expect(result.formPatch.birth_date.value).toBe('1931-05-10');
    });

    it('should parse reception date correctly', () => {
      const extracted: ExtractedFields = {
        reception_date_raw: {
          rawValue: '5/24/1931',
          confidence: 0.9,
          sourceLineIndices: [2],
          matchedAnchor: 'reception date',
          anchorLanguage: 'en',
        },
        confidence_by_field: { reception_date: 0.9 },
        debug: {
          matched_anchor: { reception_date: 'reception date' },
          source_line_indexes: { reception_date: [2] },
        },
      };

      const result = mapExtractedFieldsToForm(extracted, 'baptism');

      expect(result.formPatch.reception_date).toBeDefined();
      expect(result.formPatch.reception_date.value).toBe('1931-05-24');
    });

    it('should split parents into father and mother', () => {
      const extracted: ExtractedFields = {
        parents_raw: {
          rawValue: 'John and Mary Smith',
          confidence: 0.9,
          sourceLineIndices: [3],
          matchedAnchor: 'parents',
          anchorLanguage: 'en',
        },
        confidence_by_field: { parents: 0.9 },
        debug: {
          matched_anchor: { parents: 'parents' },
          source_line_indexes: { parents: [3] },
        },
      };

      const result = mapExtractedFieldsToForm(extracted, 'baptism');

      expect(result.formPatch.father_name).toBeDefined();
      expect(result.formPatch.father_name.value).toBe('John');
      expect(result.formPatch.mother_name).toBeDefined();
      expect(result.formPatch.mother_name.value).toBe('Mary Smith');
    });

    it('should handle label on next line case', () => {
      const extracted: ExtractedFields = {
        child_name_raw: {
          rawValue: 'Stepan', // Value extracted from next line
          confidence: 0.85,
          sourceLineIndices: [0, 1], // Label on line 0, value on line 1
          matchedAnchor: 'child',
          anchorLanguage: 'en',
        },
        confidence_by_field: { child_name: 0.85 },
        debug: {
          matched_anchor: { child_name: 'child' },
          source_line_indexes: { child_name: [0, 1] },
        },
      };

      const result = mapExtractedFieldsToForm(extracted, 'baptism');

      expect(result.formPatch.first_name).toBeDefined();
      expect(result.formPatch.first_name.value).toBe('Stepan');
    });

    it('should calculate overall mapping confidence', () => {
      const extracted: ExtractedFields = {
        child_name_raw: {
          rawValue: 'Stepan Роздольский',
          confidence: 0.9,
          sourceLineIndices: [0],
          matchedAnchor: 'child',
          anchorLanguage: 'en',
        },
        birth_date_raw: {
          rawValue: '5/10/1931',
          confidence: 0.85,
          sourceLineIndices: [1],
          matchedAnchor: 'birth date',
          anchorLanguage: 'en',
        },
        confidence_by_field: {
          child_name: 0.9,
          birth_date: 0.85,
        },
        debug: {
          matched_anchor: {
            child_name: 'child',
            birth_date: 'birth date',
          },
          source_line_indexes: {
            child_name: [0],
            birth_date: [1],
          },
        },
      };

      const result = mapExtractedFieldsToForm(extracted, 'baptism');

      expect(result.mappingConfidence).toBeGreaterThan(0);
      expect(result.mappingConfidence).toBeLessThanOrEqual(1);
    });

    it('should include reasons for debugging', () => {
      const extracted: ExtractedFields = {
        child_name_raw: {
          rawValue: 'Stepan Роздольский',
          confidence: 0.9,
          sourceLineIndices: [0],
          matchedAnchor: 'child',
          anchorLanguage: 'en',
        },
        confidence_by_field: { child_name: 0.9 },
        debug: {
          matched_anchor: { child_name: 'child' },
          source_line_indexes: { child_name: [0] },
        },
      };

      const result = mapExtractedFieldsToForm(extracted, 'baptism');

      expect(result.reasons.first_name).toBeDefined();
      expect(result.reasons.first_name).toContain('Split from child_name');
    });
  });
});

