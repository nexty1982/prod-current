/**
 * Canonical Record Schema Registry
 * Single source of truth for field definitions across all OCR components
 * 
 * This registry ensures consistency between:
 * - Fusion Workflow "Map Fields" step
 * - OCR Inspection Panel Mapping Tab
 * - Auto-mapping logic
 * - Database column mappings
 */

import { getDefaultColumns, getRequiredColumns } from '@/features/devel-tools/om-ocr/config/defaultRecordColumns';
import { LABEL_DICTIONARIES } from '@/features/devel-tools/om-ocr/types/fusion';

export type RecordType = 'baptism' | 'marriage' | 'funeral';
export type DataType = 'text' | 'date' | 'textarea' | 'number';
export type Language = 'en' | 'ru' | 'auto';

export interface RecordFieldSchema {
  key: string; // Canonical field key (used in code, must be unique)
  label: string; // Display label for UI
  dbColumn: string; // Database column name
  dataType: DataType; // Field data type
  required: boolean; // Whether field is required
  order: number; // Display order (lower = first)
  helpText?: string; // Optional help text/tooltip
}

/**
 * Canonical field schemas for each record type
 * Keys must match LABEL_DICTIONARIES canonical fields for consistency
 * These keys are used across FusionTab, MappingTab, and auto-mapping
 */
const SCHEMA_REGISTRY: Record<RecordType, RecordFieldSchema[]> = {
  baptism: [
    { key: 'record_number', label: 'Record #', dbColumn: 'id', dataType: 'text', required: false, order: 0 },
    { key: 'child_name', label: 'Name of Child', dbColumn: 'first_name', dataType: 'text', required: true, order: 1, helpText: 'Will be split into first_name and last_name' },
    { key: 'date_of_birth', label: 'Date of Birth', dbColumn: 'birth_date', dataType: 'date', required: false, order: 2 },
    { key: 'place_of_birth', label: 'Place of Birth', dbColumn: 'birthplace', dataType: 'text', required: false, order: 3 },
    { key: 'date_of_baptism', label: 'Date of Baptism', dbColumn: 'reception_date', dataType: 'date', required: true, order: 4, helpText: 'Date of baptism/reception' },
    { key: 'father_name', label: "Father's Name", dbColumn: 'parents', dataType: 'text', required: false, order: 5, helpText: 'Part of parents field' },
    { key: 'mother_name', label: "Mother's Name", dbColumn: 'parents', dataType: 'text', required: false, order: 6, helpText: 'Part of parents field' },
    { key: 'parents_name', label: 'Parents Name', dbColumn: 'parents', dataType: 'text', required: false, order: 7 },
    { key: 'godparents', label: 'Godparents', dbColumn: 'sponsors', dataType: 'text', required: false, order: 8 },
    { key: 'performed_by', label: 'Performed By', dbColumn: 'clergy', dataType: 'text', required: true, order: 9 },
    { key: 'church', label: 'Church', dbColumn: 'church_id', dataType: 'text', required: false, order: 10 },
    { key: 'address', label: 'Address', dbColumn: 'address', dataType: 'text', required: false, order: 11 },
    { key: 'notes', label: 'Notes', dbColumn: 'notes', dataType: 'textarea', required: false, order: 12 },
  ],
  marriage: [
    { key: 'record_number', label: 'Record #', dbColumn: 'id', dataType: 'text', required: false, order: 0 },
    { key: 'groom_name', label: 'Groom Name', dbColumn: 'fname_groom', dataType: 'text', required: true, order: 1, helpText: 'Will be split into first and last name' },
    { key: 'bride_name', label: 'Bride Name', dbColumn: 'fname_bride', dataType: 'text', required: true, order: 2, helpText: 'Will be split into first and last name' },
    { key: 'date_of_marriage', label: 'Date of Marriage', dbColumn: 'mdate', dataType: 'date', required: true, order: 3 },
    { key: 'place_of_marriage', label: 'Place of Marriage', dbColumn: 'place_of_marriage', dataType: 'text', required: false, order: 4 },
    { key: 'witnesses', label: 'Witnesses', dbColumn: 'witness', dataType: 'text', required: false, order: 5 },
    { key: 'best_man', label: 'Best Man', dbColumn: 'best_man', dataType: 'text', required: false, order: 6 },
    { key: 'maid_of_honor', label: 'Maid of Honor', dbColumn: 'maid_of_honor', dataType: 'text', required: false, order: 7 },
    { key: 'officiant', label: 'Officiant', dbColumn: 'clergy', dataType: 'text', required: true, order: 8 },
    { key: 'church', label: 'Church', dbColumn: 'church_id', dataType: 'text', required: false, order: 9 },
    { key: 'notes', label: 'Notes', dbColumn: 'notes', dataType: 'textarea', required: false, order: 10 },
  ],
  funeral: [
    { key: 'record_number', label: 'Record #', dbColumn: 'id', dataType: 'text', required: false, order: 0 },
    { key: 'deceased_name', label: 'Name of Deceased', dbColumn: 'name', dataType: 'text', required: true, order: 1, helpText: 'Will be split into first_name and last_name' },
    { key: 'date_of_death', label: 'Date of Death', dbColumn: 'deceased_date', dataType: 'date', required: false, order: 2 },
    { key: 'date_of_funeral', label: 'Date of Funeral', dbColumn: 'funeral_date', dataType: 'date', required: false, order: 3 },
    { key: 'date_of_burial', label: 'Date of Burial', dbColumn: 'burial_date', dataType: 'date', required: true, order: 4 },
    { key: 'place_of_burial', label: 'Place of Burial', dbColumn: 'burial_location', dataType: 'text', required: false, order: 5 },
    { key: 'age_at_death', label: 'Age at Death', dbColumn: 'age', dataType: 'number', required: false, order: 6 },
    { key: 'cause_of_death', label: 'Cause of Death', dbColumn: 'cause_of_death', dataType: 'text', required: false, order: 7 },
    { key: 'next_of_kin', label: 'Next of Kin', dbColumn: 'next_of_kin', dataType: 'text', required: false, order: 8 },
    { key: 'officiant', label: 'Officiant', dbColumn: 'clergy', dataType: 'text', required: true, order: 9 },
    { key: 'church', label: 'Church', dbColumn: 'church_id', dataType: 'text', required: false, order: 10 },
    { key: 'notes', label: 'Notes', dbColumn: 'notes', dataType: 'textarea', required: false, order: 11 },
  ],
};

/**
 * Get the canonical record schema for a record type
 * Optionally filtered by default columns (sticky defaults)
 */
export function getRecordSchema(
  recordType: RecordType,
  options?: {
    churchId?: number;
    language?: string;
    stickyDefaults?: boolean; // Filter to default columns only
  }
): RecordFieldSchema[] {
  const schema = SCHEMA_REGISTRY[recordType] || [];
  
  // If sticky defaults enabled, filter to default columns only
  if (options?.stickyDefaults) {
    const defaultColumns = getDefaultColumns(recordType);
    return schema.filter(field => defaultColumns.includes(field.dbColumn));
  }
  
  // Sort by order
  return [...schema].sort((a, b) => a.order - b.order);
}

/**
 * Get a single field schema by key
 */
export function getFieldSchema(recordType: RecordType, fieldKey: string): RecordFieldSchema | undefined {
  const schema = SCHEMA_REGISTRY[recordType] || [];
  return schema.find(field => field.key === fieldKey);
}

/**
 * Get field schema by database column name
 */
export function getFieldSchemaByDbColumn(recordType: RecordType, dbColumn: string): RecordFieldSchema | undefined {
  const schema = SCHEMA_REGISTRY[recordType] || [];
  return schema.find(field => field.dbColumn === dbColumn);
}

/**
 * Get all field keys for a record type
 */
export function getFieldKeys(recordType: RecordType): string[] {
  const schema = SCHEMA_REGISTRY[recordType] || [];
  return schema.map(field => field.key);
}

/**
 * Get all database columns for a record type
 */
export function getDbColumns(recordType: RecordType): string[] {
  const schema = SCHEMA_REGISTRY[recordType] || [];
  return schema.map(field => field.dbColumn);
}

/**
 * Validate field keys (dev-only)
 * Detects unknown/duplicate keys and logs errors
 */
export function validateFieldKeys(recordType: RecordType, fieldKeys: string[]): { valid: boolean; errors: string[] } {
  // Skip validation in production builds (Vite replaces process.env.NODE_ENV during build)
  if (import.meta.env.PROD) {
    return { valid: true, errors: [] };
  }
  
  const errors: string[] = [];
  const validKeys = getFieldKeys(recordType);
  const seen = new Set<string>();
  
  for (const key of fieldKeys) {
    // Check for duplicates
    if (seen.has(key)) {
      errors.push(`Duplicate field key detected: "${key}"`);
    }
    seen.add(key);
    
    // Check for unknown keys
    if (!validKeys.includes(key)) {
      errors.push(`Unknown field key: "${key}" (valid keys: ${validKeys.join(', ')})`);
    }
  }
  
  if (errors.length > 0) {
    console.error(`[SchemaRegistry] Validation errors for ${recordType}:`, errors);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Map field key to database column
 * Alias: uiKeyToDbColumn (requested naming)
 */
export function mapFieldKeyToDbColumn(recordType: RecordType, fieldKey: string): string | undefined {
  const field = getFieldSchema(recordType, fieldKey);
  return field?.dbColumn;
}

/**
 * Map UI field key to database column (alias for mapFieldKeyToDbColumn)
 */
export function uiKeyToDbColumn(recordType: RecordType, key: string): string | undefined {
  return mapFieldKeyToDbColumn(recordType, key);
}

/**
 * Map database column to field key
 */
export function mapDbColumnToFieldKey(recordType: RecordType, dbColumn: string): string | undefined {
  const field = getFieldSchemaByDbColumn(recordType, dbColumn);
  return field?.key;
}

/**
 * Get label dictionary for a record type and language
 * Returns map of label text -> canonical schema key
 * Alias: labelDictionary (requested naming)
 */
export function getLabelDictionary(
  recordType: RecordType,
  language: Language = 'en'
): Record<string, string> {
  // LABEL_DICTIONARIES uses uppercase keys, return as-is
  // The canonical keys in the dictionary already match schema keys
  return LABEL_DICTIONARIES[recordType] || {};
}

/**
 * Get label dictionary (alias for getLabelDictionary)
 * Returns anchors -> schema keys mapping
 */
export function labelDictionary(recordType: RecordType, language: Language = 'en'): Record<string, string> {
  return getLabelDictionary(recordType, language);
}

/**
 * Get all label variants for a schema field key
 * Returns array of label texts that map to this field
 */
export function getLabelVariants(recordType: RecordType, fieldKey: string): string[] {
  const dictionary = getLabelDictionary(recordType);
  return Object.entries(dictionary)
    .filter(([_, key]) => key === fieldKey)
    .map(([label, _]) => label);
}

/**
 * Find schema key from label text (case-insensitive fuzzy match)
 */
export function findSchemaKeyFromLabel(
  recordType: RecordType,
  labelText: string
): string | undefined {
  const dictionary = getLabelDictionary(recordType);
  const normalizedLabel = labelText.toUpperCase().trim();
  
  // Exact match
  if (dictionary[normalizedLabel]) {
    return dictionary[normalizedLabel];
  }
  
  // Fuzzy match (contains)
  for (const [label, key] of Object.entries(dictionary)) {
    if (normalizedLabel.includes(label) || label.includes(normalizedLabel)) {
      return key;
    }
  }
  
  return undefined;
}

