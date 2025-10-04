/**
 * Orthodox Metrics - Base Records Table Component
 * Template-agnostic base component that defines the interface for all record table implementations
 */

import React from 'react';
import { RecordData, RecordFilters, UnifiedTableSchema } from '@/core/types/RecordsTypes';

export interface BaseRecordsTableProps {
  // Data
  data: RecordData[];
  schema: UnifiedTableSchema;
  loading?: boolean;
  error?: string | null;
  
  // Configuration
  churchId: number;
  tableName: string;
  configName?: string;
  
  // Pagination
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Filters and sorting
  filters?: RecordFilters;
  onFiltersChange?: (filters: RecordFilters) => void;
  onSortChange?: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  onPaginationChange?: (pagination: { page: number; limit: number }) => void;
  
  // Actions
  onRecordSelect?: (record: RecordData) => void;
  onRecordEdit?: (record: RecordData) => void;
  onRecordDelete?: (record: RecordData) => void;
  onRecordCreate?: () => void;
  onRecordView?: (record: RecordData) => void;
  onRecordDuplicate?: (record: RecordData) => void;
  
  // Bulk actions
  onBulkDelete?: (records: RecordData[]) => void;
  onBulkExport?: (records: RecordData[]) => void;
  onBulkUpdate?: (records: RecordData[], updates: Partial<RecordData>) => void;
  
  // Selection
  selectedRecords?: RecordData[];
  onSelectionChange?: (selectedRecords: RecordData[]) => void;
  
  // Customization
  className?: string;
  style?: React.CSSProperties;
  height?: string | number;
  width?: string | number;
  
  // Features
  enableSelection?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  enableBulkActions?: boolean;
  enableInlineEdit?: boolean;
  enableRowActions?: boolean;
  
  // Custom renderers
  renderCell?: (value: any, record: RecordData, field: string) => React.ReactNode;
  renderActions?: (record: RecordData) => React.ReactNode;
  renderHeader?: (field: string, schema: UnifiedTableSchema) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
  
  // Event handlers
  onRowClick?: (record: RecordData, event: React.MouseEvent) => void;
  onRowDoubleClick?: (record: RecordData, event: React.MouseEvent) => void;
  onCellClick?: (value: any, record: RecordData, field: string, event: React.MouseEvent) => void;
  onCellEdit?: (value: any, record: RecordData, field: string) => void;
  
  // Accessibility
  ariaLabel?: string;
  ariaLabelledBy?: string;
  role?: string;
  
  // Performance
  virtualScrolling?: boolean;
  rowHeight?: number;
  overscan?: number;
}

export interface BaseRecordsTableRef {
  // Methods
  refresh: () => void;
  clearSelection: () => void;
  selectAll: () => void;
  getSelectedRecords: () => RecordData[];
  scrollToRow: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  
  // State
  isRefreshing: boolean;
  selectedCount: number;
  totalCount: number;
}

/**
 * Base Records Table Component
 * This is an abstract base component that defines the interface and common logic
 * Template-specific implementations should extend this component
 */
export abstract class BaseRecordsTable extends React.Component<BaseRecordsTableProps, any> {
  // Abstract methods that must be implemented by template-specific components
  abstract renderTable(): React.ReactNode;
  abstract renderPagination(): React.ReactNode;
  abstract renderFilters(): React.ReactNode;
  abstract renderSearch(): React.ReactNode;
  abstract renderActions(): React.ReactNode;
  abstract renderBulkActions(): React.ReactNode;
  abstract renderLoading(): React.ReactNode;
  abstract renderError(): React.ReactNode;
  abstract renderEmpty(): React.ReactNode;
  
  // Common methods that can be overridden by template-specific components
  protected handleRowClick = (record: RecordData, event: React.MouseEvent) => {
    this.props.onRowClick?.(record, event);
  };
  
  protected handleRowDoubleClick = (record: RecordData, event: React.MouseEvent) => {
    this.props.onRowDoubleClick?.(record, event);
  };
  
  protected handleCellClick = (value: any, record: RecordData, field: string, event: React.MouseEvent) => {
    this.props.onCellClick?.(value, record, field, event);
  };
  
  protected handleCellEdit = (value: any, record: RecordData, field: string) => {
    this.props.onCellEdit?.(value, record, field);
  };
  
  protected handleSelectionChange = (selectedRecords: RecordData[]) => {
    this.props.onSelectionChange?.(selectedRecords);
  };
  
  protected handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    this.props.onSortChange?.({ field, direction });
  };
  
  protected handleFilterChange = (filters: RecordFilters) => {
    this.props.onFiltersChange?.(filters);
  };
  
  protected handlePaginationChange = (page: number, limit: number) => {
    this.props.onPaginationChange?.({ page, limit });
  };
  
  // Common render methods
  protected renderCell = (value: any, record: RecordData, field: string): React.ReactNode => {
    if (this.props.renderCell) {
      return this.props.renderCell(value, record, field);
    }
    
    // Default cell rendering
    if (value === null || value === undefined) {
      return <span className="text-muted">—</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className={value ? 'text-success' : 'text-danger'}>
        {value ? 'Yes' : 'No'}
      </span>;
    }
    
    if (typeof value === 'string' && value.length > 50) {
      return <span title={value}>{value.substring(0, 50)}...</span>;
    }
    
    return <span>{String(value)}</span>;
  };
  
  protected renderHeader = (field: string, schema: UnifiedTableSchema): React.ReactNode => {
    if (this.props.renderHeader) {
      return this.props.renderHeader(field, schema);
    }
    
    // Default header rendering
    const fieldDef = schema.fields.find(f => f.column_name === field);
    return fieldDef?.display_name || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  protected renderActions = (record: RecordData): React.ReactNode => {
    if (this.props.renderActions) {
      return this.props.renderActions(record);
    }
    
    // Default actions rendering
    return (
      <div className="record-actions">
        {this.props.onRecordView && (
          <button
            onClick={() => this.props.onRecordView?.(record)}
            className="btn btn-sm btn-outline-primary"
            title="View Record"
          >
            👁️
          </button>
        )}
        {this.props.onRecordEdit && (
          <button
            onClick={() => this.props.onRecordEdit?.(record)}
            className="btn btn-sm btn-outline-secondary"
            title="Edit Record"
          >
            ✏️
          </button>
        )}
        {this.props.onRecordDelete && (
          <button
            onClick={() => this.props.onRecordDelete?.(record)}
            className="btn btn-sm btn-outline-danger"
            title="Delete Record"
          >
            🗑️
          </button>
        )}
      </div>
    );
  };
  
  // Main render method
  render(): React.ReactNode {
    const { loading, error, data, className, style, height, width } = this.props;
    
    if (loading) {
      return this.renderLoading();
    }
    
    if (error) {
      return this.renderError();
    }
    
    if (!data || data.length === 0) {
      return this.renderEmpty();
    }
    
    return (
      <div
        className={`base-records-table ${className || ''}`}
        style={{
          height: height || 'auto',
          width: width || '100%',
          ...style
        }}
        role="table"
        aria-label={this.props.ariaLabel || 'Records Table'}
      >
        {this.renderSearch()}
        {this.renderFilters()}
        {this.renderActions()}
        {this.renderBulkActions()}
        {this.renderTable()}
        {this.renderPagination()}
      </div>
    );
  }
}

// Export the base component and types
export default BaseRecordsTable;
export type { BaseRecordsTableProps, BaseRecordsTableRef };
