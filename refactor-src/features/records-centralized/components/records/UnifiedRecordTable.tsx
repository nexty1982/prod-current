/**
 * Unified Record Table Component
 * Demonstrates how to use the new shared components to replace the existing RecordTable
 */

import React, { useMemo } from 'react';
import { 
  RecordsTable, 
  RecordTableColumn, 
  DEFAULT_RECORD_ACTIONS,
  useRecords,
  useRecordMutations,
  useSearchState,
  usePagination,
} from './useUnifiedRecords';
import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/constants';

// Types
interface UnifiedRecordTableProps {
  recordType: string;
  churchId: string;
  onView?: (record: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onViewHistory?: (record: any) => void;
  onPreviewCertificate?: (record: any) => void;
  onGenerateCertificate?: (record: any) => void;
  isLocked?: boolean;
}

export function UnifiedRecordTable({
  recordType,
  churchId,
  onView,
  onEdit,
  onDelete,
  onViewHistory,
  onPreviewCertificate,
  onGenerateCertificate,
  isLocked = false,
}: UnifiedRecordTableProps) {
  // Get field definitions for this record type
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  if (!fieldDefs) {
    console.error(`Invalid record type: ${recordType}`);
    return <div>Error: Invalid record type</div>;
  }

  // State management
  const searchState = useSearchState();
  const pagination = usePagination(1, 10);
  const [selectedRecords, setSelectedRecords] = React.useState<string[]>([]);

  // Data fetching
  const {
    records,
    total,
    page,
    totalPages,
    isLoading,
    error,
    refetch,
  } = useRecords(churchId, recordType, {
    filters: searchState.filters,
    sort: searchState.sort,
    pagination: { page: pagination.page, limit: pagination.limit },
  });

  // Mutations
  const { delete: deleteMutation } = useRecordMutations(churchId, recordType);

  // Table columns configuration
  const columns: RecordTableColumn[] = useMemo(() => {
    const tableColumns = fieldDefs.tableColumns || [];
    
    return tableColumns.map(column => ({
      key: column.field,
      label: column.headerName || column.field,
      width: column.width || 'auto',
      sortable: true,
      render: (value, record) => {
        if (column.cellRenderer === 'dateRenderer') {
          return formatDate(value);
        }
        if (column.valueGetter) {
          return column.valueGetter({ data: record });
        }
        return value || 'N/A';
      },
    }));
  }, [fieldDefs.tableColumns]);

  // Actions configuration
  const actions = useMemo(() => {
    const availableActions = [...DEFAULT_RECORD_ACTIONS];
    
    // Add custom actions based on record type
    if (onViewHistory) {
      availableActions.push({
        key: 'history',
        label: 'History',
        icon: <span>📜</span>,
        color: 'info' as const,
      });
    }
    
    if (onPreviewCertificate) {
      availableActions.push({
        key: 'preview',
        label: 'Preview Certificate',
        icon: <span>👁️</span>,
        color: 'secondary' as const,
      });
    }
    
    if (onGenerateCertificate) {
      availableActions.push({
        key: 'generate',
        label: 'Generate Certificate',
        icon: <span>📄</span>,
        color: 'success' as const,
      });
    }

    return availableActions;
  }, [onViewHistory, onPreviewCertificate, onGenerateCertificate]);

  // Event handlers
  const handleRecordAction = (action: string, record: any) => {
    switch (action) {
      case 'view':
        onView?.(record);
        break;
      case 'edit':
        onEdit?.(record);
        break;
      case 'delete':
        onDelete?.(record);
        break;
      case 'history':
        onViewHistory?.(record);
        break;
      case 'preview':
        onPreviewCertificate?.(record);
        break;
      case 'generate':
        onGenerateCertificate?.(record);
        break;
    }
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    searchState.updateSort({ field, direction });
  };

  const handleRecordSelect = (recordId: string, selected: boolean) => {
    setSelectedRecords(prev => 
      selected 
        ? [...prev, recordId]
        : prev.filter(id => id !== recordId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRecords(records.map(record => record.id || record._id));
    } else {
      setSelectedRecords([]);
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return <RecordsTable columns={columns} loading={true} records={[]} />;
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filters would go here - using the RecordsSearch component */}
      
      {/* Table */}
      <RecordsTable
        records={records}
        columns={columns}
        loading={isLoading}
        error={error}
        selectedRecords={selectedRecords}
        onRecordSelect={handleRecordSelect}
        onSelectAll={handleSelectAll}
        onRecordAction={handleRecordAction}
        onSort={handleSort}
        sortField={searchState.sort?.field}
        sortDirection={searchState.sort?.direction}
        actions={actions}
        showCheckboxes={!isLocked}
        showActions={!isLocked}
        emptyMessage={`No ${recordType} records found`}
      />

      {/* Pagination would go here - using the RecordsPagination component */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p>
          Showing {records.length} of {total} records
          (Page {page} of {totalPages})
        </p>
        <div>
          <button 
            onClick={pagination.prevPage} 
            disabled={page <= 1}
          >
            Previous
          </button>
          <button 
            onClick={pagination.nextPage} 
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnifiedRecordTable;
