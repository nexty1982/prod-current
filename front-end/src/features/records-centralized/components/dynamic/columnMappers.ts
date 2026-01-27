/**
 * Column Mappers for Dynamic Records Display
 * Ported from December 2025 backup
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
      Object.keys(record).forEach(key => allFields.add(key));
    }
  });

  const availableFields = Array.from(allFields).filter(
    field => !hiddenFields.includes(field)
  );

  const fieldsToUse = maxColumns > 0 ? availableFields.slice(0, maxColumns) : availableFields;

  return fieldsToUse.map((fieldName: string) => ({
    field: fieldName,
    headerName: humanizeFieldName(fieldName),
    sortable: true,
  }));
}

export function mapFieldDefinitionsToDynamicColumns(recordType?: string): any[] {
  return [];
}

export function detectFieldType(fieldName: string, sampleValues: any[]): string {
  return 'text';
}
