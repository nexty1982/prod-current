/**
 * Column Mappers for Dynamic Records Display
 */

export interface ColumnInferenceOptions {
  columnOrder?: string[];
  hiddenFields?: string[];
  dateFields?: string[];
  maxColumns?: number;
}

export function humanizeFieldName(fieldName: string): string {
  return fieldName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDateField(fieldName: string, sampleValues: any[]): boolean {
  const datePatterns = [/date$/i, /time$/i, /_at$/i];
  return datePatterns.some(pattern => pattern.test(fieldName));
}

export function inferColumnsFromRecords(records: any[], options: ColumnInferenceOptions = {}): any[] {
  const { columnOrder = [], hiddenFields = [], maxColumns = 20 } = options;

  if (records.length === 0) return [];

  const allFields = new Set<string>();
  records.forEach((record: any) => {
    if (record && typeof record === 'object') {
      Object.keys(record).forEach(key => {
        // Skip internal/metadata fields
        if (!key.startsWith('_') && !key.startsWith('originalRecord')) {
          allFields.add(key);
        }
      });
    }
  });

  const availableFields = Array.from(allFields).filter(
    field => !hiddenFields.includes(field)
  );

  // Respect columnOrder if provided
  const orderedFields = columnOrder.length > 0
    ? [...columnOrder.filter(f => availableFields.includes(f)), ...availableFields.filter(f => !columnOrder.includes(f))]
    : availableFields;

  const fieldsToUse = maxColumns > 0 ? orderedFields.slice(0, maxColumns) : orderedFields;

  return fieldsToUse.map((fieldName: string) => ({
    field: fieldName,
    headerName: humanizeFieldName(fieldName),
    sortable: true,
    // Add valueGetter to handle key variations for inferred columns
    // Support both signatures: (row) => value and ({ data: row }) => value
    valueGetter: (params: any) => {
      // Handle both signatures
      const row = params?.data || params;
      
      // Try direct access first
      if (row[fieldName] !== undefined && row[fieldName] !== null) {
        return row[fieldName];
      }
      // Try camelCase if field is snake_case
      if (fieldName.includes('_')) {
        const camelCase = fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        if (row[camelCase] !== undefined && row[camelCase] !== null) {
          return row[camelCase];
        }
      }
      // Try snake_case if field is camelCase
      if (/[A-Z]/.test(fieldName)) {
        const snakeCase = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (row[snakeCase] !== undefined && row[snakeCase] !== null) {
          return row[snakeCase];
        }
      }
      return null;
    }
  }));
}

export function mapFieldDefinitionsToDynamicColumns(recordType?: string): any[] {
  return [];
}

export function detectFieldType(fieldName: string, sampleValues: any[]): string {
  return 'text';
}
