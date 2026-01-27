/**
 * Export file for Dynamic Records components
 * Ported from December 2025 backup
 */

export { DynamicRecordsDisplay, type DynamicColumn, type DynamicRecordsDisplayProps } from './DynamicRecordsDisplay';
export { default as DynamicRecordsInspector } from './DynamicRecordsInspector';
export { inferColumnsFromRecords, mapFieldDefinitionsToDynamicColumns, humanizeFieldName, isDateField } from './columnMappers';
export { renderCellValue, formatDate } from './cellRenderers';
