/**
 * Mapping State Management for OCR Multi-Record Mapper
 * Handles the complex state structure for field mappings and record management
 */

import { OcrTextLine } from './utils/ocrRowSplitter';

export interface FieldMapping {
  value: string;
  sourceLine: number;
  confidence: number;
  isEdited?: boolean;
  suggestions?: string[];
}

export interface DeathRecord {
  id: string;
  death_date: FieldMapping | null;
  burial_date: FieldMapping | null;
  name: FieldMapping | null;
  age: FieldMapping | null;
  priest_officiated: FieldMapping | null;
  burial_location: FieldMapping | null;
}

export interface MappingState {
  records: DeathRecord[];
  ocrLines: OcrTextLine[];
  usedLines: Set<number>;
  fieldSuggestions: Record<string, string[]>;
}

export class MappingStateManager {
  private static readonly FIELD_NAMES = [
    'death_date',
    'burial_date', 
    'name',
    'age',
    'priest_officiated',
    'burial_location'
  ] as const;

  /**
   * Create initial empty state
   */
  public static createInitialState(ocrLines: OcrTextLine[]): MappingState {
    return {
      records: [this.createEmptyRecord()],
      ocrLines,
      usedLines: new Set(),
      fieldSuggestions: this.loadFieldSuggestions()
    };
  }

  /**
   * Create a new empty record
   */
  public static createEmptyRecord(): DeathRecord {
    return {
      id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      death_date: null,
      burial_date: null,
      name: null,
      age: null,
      priest_officiated: null,
      burial_location: null
    };
  }

  /**
   * Add a new record to the state
   */
  public static addRecord(state: MappingState): MappingState {
    return {
      ...state,
      records: [...state.records, this.createEmptyRecord()]
    };
  }

  /**
   * Remove a record from the state
   */
  public static removeRecord(state: MappingState, recordId: string): MappingState {
    const recordToRemove = state.records.find(r => r.id === recordId);
    if (!recordToRemove) return state;

    // Free up any used lines from the removed record
    const usedLines = new Set(state.usedLines);
    this.FIELD_NAMES.forEach(fieldName => {
      const field = recordToRemove[fieldName];
      if (field?.sourceLine !== undefined) {
        usedLines.delete(field.sourceLine);
      }
    });

    return {
      ...state,
      records: state.records.filter(r => r.id !== recordId),
      usedLines
    };
  }

  /**
   * Map an OCR line to a specific field in a specific record
   */
  public static mapLineToField(
    state: MappingState,
    recordId: string,
    fieldName: keyof DeathRecord,
    lineIndex: number
  ): MappingState {
    if (fieldName === 'id') return state;

    const ocrLine = state.ocrLines[lineIndex];
    if (!ocrLine) return state;

    // Create new used lines set
    const usedLines = new Set(state.usedLines);
    
    // Remove the line from any existing mappings
    const updatedRecords = state.records.map(record => {
      const updatedRecord = { ...record };
      
      // Remove the line from any existing field mappings in this record
      this.FIELD_NAMES.forEach(fname => {
        const field = updatedRecord[fname];
        if (field?.sourceLine === lineIndex) {
          updatedRecord[fname] = null;
        }
      });

      // If this is the target record, set the new mapping
      if (record.id === recordId) {
        // Clear the previous mapping for this field if it exists
        const existingField = record[fieldName] as FieldMapping | null;
        if (existingField?.sourceLine !== undefined) {
          usedLines.delete(existingField.sourceLine);
        }

        // Set new mapping
        updatedRecord[fieldName] = {
          value: ocrLine.text,
          sourceLine: lineIndex,
          confidence: ocrLine.confidence,
          isEdited: false
        } as FieldMapping;
        
        usedLines.add(lineIndex);
      }

      return updatedRecord;
    });

    return {
      ...state,
      records: updatedRecords,
      usedLines
    };
  }

  /**
   * Clear a field mapping
   */
  public static clearFieldMapping(
    state: MappingState,
    recordId: string,
    fieldName: keyof DeathRecord
  ): MappingState {
    if (fieldName === 'id') return state;

    const usedLines = new Set(state.usedLines);
    
    const updatedRecords = state.records.map(record => {
      if (record.id === recordId) {
        const field = record[fieldName] as FieldMapping | null;
        if (field?.sourceLine !== undefined) {
          usedLines.delete(field.sourceLine);
        }
        
        return {
          ...record,
          [fieldName]: null
        };
      }
      return record;
    });

    return {
      ...state,
      records: updatedRecords,
      usedLines
    };
  }

  /**
   * Update field value manually (when user edits directly)
   */
  public static updateFieldValue(
    state: MappingState,
    recordId: string,
    fieldName: keyof DeathRecord,
    newValue: string
  ): MappingState {
    if (fieldName === 'id') return state;

    const updatedRecords = state.records.map(record => {
      if (record.id === recordId) {
        const existingField = record[fieldName] as FieldMapping | null;
        
        return {
          ...record,
          [fieldName]: {
            value: newValue,
            sourceLine: existingField?.sourceLine ?? -1,
            confidence: existingField?.confidence ?? 1.0,
            isEdited: true
          } as FieldMapping
        };
      }
      return record;
    });

    return {
      ...state,
      records: updatedRecords
    };
  }

  /**
   * Get available (unused) OCR lines
   */
  public static getAvailableLines(state: MappingState): OcrTextLine[] {
    return state.ocrLines.filter((_, index) => !state.usedLines.has(index));
  }

  /**
   * Get field suggestions based on field type
   */
  public static getFieldSuggestions(
    state: MappingState,
    fieldName: keyof DeathRecord
  ): string[] {
    return state.fieldSuggestions[fieldName as string] || [];
  }

  /**
   * Save a new suggestion for future use
   */
  public static saveSuggestion(
    state: MappingState,
    fieldName: keyof DeathRecord,
    value: string
  ): MappingState {
    if (fieldName === 'id' || !value.trim()) return state;

    const fieldKey = fieldName as string;
    const currentSuggestions = state.fieldSuggestions[fieldKey] || [];
    
    // Don't add duplicates
    if (currentSuggestions.includes(value)) return state;

    const updatedSuggestions = {
      ...state.fieldSuggestions,
      [fieldKey]: [...currentSuggestions, value].slice(-20) // Keep only last 20 suggestions
    };

    // Persist to localStorage
    localStorage.setItem('ocr_field_suggestions', JSON.stringify(updatedSuggestions));

    return {
      ...state,
      fieldSuggestions: updatedSuggestions
    };
  }

  /**
   * Load field suggestions from localStorage
   */
  private static loadFieldSuggestions(): Record<string, string[]> {
    try {
      const stored = localStorage.getItem('ocr_field_suggestions');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load field suggestions from localStorage:', error);
    }

    // Return default suggestions
    return {
      priest_officiated: [
        'Fr. John Kowalski',
        'Fr. Michael Jones', 
        'Fr. Constantine',
        'Fr. Nicholas',
        'Fr. Peter'
      ],
      burial_location: [
        'SS. Peter Paul Cemetery',
        'Orthodox Cemetery',
        'St. Mary Cemetery',
        'Holy Cross Cemetery',
        'Mount Olivet Cemetery'
      ]
    };
  }

  /**
   * Validate that a record has minimum required fields
   */
  public static validateRecord(record: DeathRecord): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!record.name?.value?.trim()) {
      errors.push('Name is required');
    }
    
    if (!record.death_date?.value?.trim()) {
      errors.push('Death date is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get completion percentage for a record
   */
  public static getRecordCompleteness(record: DeathRecord): number {
    const fieldCount = this.FIELD_NAMES.length;
    const filledCount = this.FIELD_NAMES.reduce((count, fieldName) => {
      const field = record[fieldName] as FieldMapping | null;
      return count + (field?.value?.trim() ? 1 : 0);
    }, 0);
    
    return Math.round((filledCount / fieldCount) * 100);
  }

  /**
   * Export state for API submission
   */
  public static exportForSubmission(state: MappingState): {
    records: Array<Record<string, any>>;
    ocrLines: OcrTextLine[];
    mappingMetadata: any;
  } {
    const cleanedRecords = state.records.map(record => {
      const cleanRecord: Record<string, any> = { id: record.id };
      
      this.FIELD_NAMES.forEach(fieldName => {
        const field = record[fieldName] as FieldMapping | null;
        cleanRecord[fieldName] = field?.value?.trim() || '';
        
        // Include metadata for non-empty fields
        if (field?.value?.trim()) {
          cleanRecord[`${fieldName}_metadata`] = {
            sourceLine: field.sourceLine,
            confidence: field.confidence,
            isEdited: field.isEdited || false
          };
        }
      });
      
      return cleanRecord;
    });

    return {
      records: cleanedRecords,
      ocrLines: state.ocrLines,
      mappingMetadata: {
        totalRecords: state.records.length,
        usedLines: Array.from(state.usedLines),
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Hook for managing mapping state with React
 */
export const useMappingState = (initialOcrLines: OcrTextLine[]) => {
  const [state, setState] = React.useState<MappingState>(() => 
    MappingStateManager.createInitialState(initialOcrLines)
  );

  const actions = React.useMemo(() => ({
    addRecord: () => setState(prev => MappingStateManager.addRecord(prev)),
    
    removeRecord: (recordId: string) => 
      setState(prev => MappingStateManager.removeRecord(prev, recordId)),
    
    mapLineToField: (recordId: string, fieldName: keyof DeathRecord, lineIndex: number) =>
      setState(prev => MappingStateManager.mapLineToField(prev, recordId, fieldName, lineIndex)),
    
    clearFieldMapping: (recordId: string, fieldName: keyof DeathRecord) =>
      setState(prev => MappingStateManager.clearFieldMapping(prev, recordId, fieldName)),
    
    updateFieldValue: (recordId: string, fieldName: keyof DeathRecord, newValue: string) =>
      setState(prev => MappingStateManager.updateFieldValue(prev, recordId, fieldName, newValue)),
    
    saveSuggestion: (fieldName: keyof DeathRecord, value: string) =>
      setState(prev => MappingStateManager.saveSuggestion(prev, fieldName, value)),
    
    getAvailableLines: () => MappingStateManager.getAvailableLines(state),
    
    exportForSubmission: () => MappingStateManager.exportForSubmission(state)
  }), [state]);

  return [state, actions] as const;
};

// Re-export React for the hook
import React from 'react';
