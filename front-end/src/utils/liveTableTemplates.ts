/**
 * Live Table Builder - Template Storage Utilities
 * Manages reusable table templates in localStorage
 */

import type { TableState } from '../features/devel-tools/live-table-builder/types';

export type RecordType = 'baptism' | 'marriage' | 'funeral';
export type Locale = 'en' | 'gr' | 'ru' | 'ro' | 'ka' | string;

export interface Template {
  name: string;
  tableState: TableState;
  recordType?: RecordType;
  locale?: Locale;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface TemplatesStore {
  [name: string]: Template;
}

const STORAGE_KEY = 'om.liveTableBuilder.templates.v1';

/**
 * Get all templates from localStorage
 */
export function getAllTemplates(): TemplatesStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const parsed = JSON.parse(stored) as TemplatesStore;
    // Validate structure
    if (typeof parsed !== 'object' || parsed === null) return {};
    
    return parsed;
  } catch (error) {
    console.error('Failed to load templates:', error);
    return {};
  }
}

/**
 * Save a template
 */
export function saveTemplate(template: Template): void {
  const templates = getAllTemplates();
  templates[template.name] = {
    ...template,
    updatedAt: new Date().toISOString(),
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Failed to save template:', error);
    throw new Error('Failed to save template to localStorage');
  }
}

/**
 * Get a template by name
 */
export function getTemplate(name: string): Template | null {
  const templates = getAllTemplates();
  return templates[name] || null;
}

/**
 * Delete a template
 */
export function deleteTemplate(name: string): boolean {
  const templates = getAllTemplates();
  if (!(name in templates)) return false;
  
  delete templates[name];
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  } catch (error) {
    console.error('Failed to delete template:', error);
    return false;
  }
}

/**
 * Check if a template exists
 */
export function templateExists(name: string): boolean {
  const templates = getAllTemplates();
  return name in templates;
}

/**
 * Get all template names
 */
export function getTemplateNames(): string[] {
  const templates = getAllTemplates();
  return Object.keys(templates).sort();
}

/**
 * Export all templates as JSON
 */
export function exportTemplates(): string {
  const templates = getAllTemplates();
  return JSON.stringify(templates, null, 2);
}

/**
 * Import templates from JSON
 */
export interface ImportResult {
  imported: number;
  overwritten: number;
  skipped: number;
  errors: string[];
}

export function importTemplates(
  jsonText: string,
  options: {
    overwriteConflicts?: boolean;
    skipConflicts?: boolean;
  } = {}
): ImportResult {
  const result: ImportResult = {
    imported: 0,
    overwritten: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const imported = JSON.parse(jsonText) as TemplatesStore;
    
    if (typeof imported !== 'object' || imported === null || Array.isArray(imported)) {
      result.errors.push('Invalid template format: expected object');
      return result;
    }

    const existing = getAllTemplates();
    const merged: TemplatesStore = { ...existing };

    for (const [name, template] of Object.entries(imported)) {
      // Validate template structure
      if (!template || typeof template !== 'object') {
        result.errors.push(`Invalid template structure for "${name}"`);
        continue;
      }

      if (!template.name || !template.tableState) {
        result.errors.push(`Missing required fields in template "${name}"`);
        continue;
      }

      // Ensure name matches key
      template.name = name;

      // Ensure timestamps
      if (!template.createdAt) {
        template.createdAt = new Date().toISOString();
      }
      if (!template.updatedAt) {
        template.updatedAt = new Date().toISOString();
      }

      // Handle conflicts
      if (name in existing) {
        if (options.skipConflicts) {
          result.skipped++;
          continue;
        }
        if (options.overwriteConflicts) {
          result.overwritten++;
        } else {
          // Default: skip if not explicitly overwriting
          result.skipped++;
          continue;
        }
      }

      merged[name] = template;
      result.imported++;
    }

    // Save merged templates
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
      result.errors.push('Failed to save imported templates to localStorage');
      console.error('Failed to save templates:', error);
    }
  } catch (error) {
    result.errors.push(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Create standard record templates
 */
export function createStandardTemplates(): void {
  const standardHeaders = [
    'id',
    'church_id',
    'entry_no',
    'date',
    'first_name',
    'last_name',
    'father_name',
    'mother_name',
    'godfather_name',
    'godmother_name',
    'notes',
  ];

  const recordTypes: RecordType[] = ['baptism', 'marriage', 'funeral'];
  const locales: Locale[] = ['en', 'gr'];

  const now = new Date().toISOString();

  for (const locale of locales) {
    for (const recordType of recordTypes) {
      const name = `${locale}_${recordType}_records`;
      
      // Create columns from standard headers
      const columns = standardHeaders.map((header, index) => ({
        id: `col_${index}`,
        label: header,
      }));

      // Create one empty row
      const rows = [
        {
          id: 'row_0',
          cells: columns.reduce((acc, col) => {
            acc[col.id] = '';
            return acc;
          }, {} as Record<string, string>),
        },
      ];

      const template: Template = {
        name,
        tableState: {
          data: { columns, rows },
          version: '1',
        },
        recordType,
        locale,
        createdAt: now,
        updatedAt: now,
      };

      saveTemplate(template);
    }
  }
}
