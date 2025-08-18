/**
 * Export all record management components and utilities
 */

// Export main component
export { default as RecordManager } from './RecordManager';

// Export individual components
export { default as RecordHeader } from './RecordHeader';
export { default as RecordSearch } from './RecordSearch';
export { default as RecordFilters } from './RecordFilters';
export { default as RecordTable } from './RecordTable';
export { default as RecordFormModal } from './RecordFormModal';
export { default as RecordHistoryModal } from './RecordHistoryModal';
export { default as CertificatePreviewer } from './CertificatePreviewer';
export { default as ImportModal } from './ImportModal';
export { default as DeleteConfirmationModal } from './DeleteConfirmationModal';
export { default as RecordPagination } from './RecordPagination';

// Export hook and utilities
export { default as useRecordManager } from './useRecordManager';
export * from './api';
export * from './constants';