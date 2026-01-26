/**
 * Orthodox Metrics - AG Grid Records Table
 * Advanced data grid with configuration support and template integration
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, ColumnApi, GridReadyEvent, CellValueChangedEvent, SelectionChangedEvent } from 'ag-grid-community';
import { Box, Typography, Alert, CircularProgress, Button, Chip, Tooltip, IconButton } from '@mui/material';
import { Refresh as RefreshIcon, Download as DownloadIcon, Settings as SettingsIcon } from '@mui/icons-material';

// Import unified hooks and types
import {
  useUnifiedRecords,
  useUnifiedRecordMutations,
  useAgGridConfig,
  useTableSchema,
  useFieldDefinitions,
  getCurrentTemplate,
} from '@/core';

// Import types
import { RecordData, RecordFilters, UnifiedTableSchema, AgGridConfig } from '@/core/types/RecordsTypes';

interface AgGridRecordsTableProps {
  churchId: number;
  tableName: string;
  configName?: string;
  data?: RecordData[];
  schema?: UnifiedTableSchema;
  loading?: boolean;
  error?: string | null;
  onRecordSelect?: (record: RecordData) => void;
  onRecordEdit?: (record: RecordData) => void;
  onRecordDelete?: (record: RecordData) => void;
  onRecordCreate?: () => void;
  onRecordView?: (record: RecordData) => void;
  onRecordDuplicate?: (record: RecordData) => void;
  onBulkDelete?: (records: RecordData[]) => void;
  onBulkExport?: (records: RecordData[]) => void;
  onBulkUpdate?: (records: RecordData[], updates: Partial<RecordData>) => void;
  selectedRecords?: RecordData[];
  onSelectionChange?: (selectedRecords: RecordData[]) => void;
  onFiltersChange?: (filters: RecordFilters) => void;
  onSortChange?: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  onPaginationChange?: (pagination: { page: number; limit: number }) => void;
  pagination?: any;
  enableSelection?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  enableBulkActions?: boolean;
  enableInlineEdit?: boolean;
  enableRowActions?: boolean;
  className?: string;
  style?: React.CSSProperties;
  height?: string | number;
  width?: string | number;
}

export function AgGridRecordsTable({
  churchId,
  tableName,
  configName = 'default',
  data = [],
  schema,
  loading = false,
  error = null,
  onRecordSelect,
  onRecordEdit,
  onRecordDelete,
  onRecordCreate,
  onRecordView,
  onRecordDuplicate,
  onBulkDelete,
  onBulkExport,
  onBulkUpdate,
  selectedRecords = [],
  onSelectionChange,
  onFiltersChange,
  onSortChange,
  onPaginationChange,
  pagination,
  enableSelection = true,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableSearch = true,
  enableExport = true,
  enableBulkActions = true,
  enableInlineEdit = false,
  enableRowActions = true,
  className,
  style,
  height = '600px',
  width = '100%',
}: AgGridRecordsTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [columnApi, setColumnApi] = useState<ColumnApi | null>(null);

  // Get AG Grid configuration
  const {
    config,
    loading: configLoading,
    error: configError,
  } = useAgGridConfig(churchId, tableName, configName);

  // Get table schema
  const {
    schema: tableSchema,
    loading: schemaLoading,
  } = useTableSchema(churchId, tableName);

  // Get field definitions
  const {
    fields,
    loading: fieldsLoading,
  } = useFieldDefinitions(churchId, tableName);

  // Record mutations
  const {
    updateRecord,
    deleteRecord,
    isUpdating,
    isDeleting,
  } = useUnifiedRecordMutations({
    churchId,
    tableName,
  });

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Memoized column definitions
  const columnDefs = useMemo((): ColDef[] => {
    if (!fields || !schema) return [];

    const columns: ColDef[] = [];

    // Selection column
    if (enableSelection) {
      columns.push({
        field: 'select',
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: 'left',
        suppressMenu: true,
        sortable: false,
        filter: false,
      });
    }

    // Data columns
    fields
      .filter(field => !field.is_hidden)
      .sort((a, b) => a.display_order - b.display_order)
      .forEach(field => {
        const colDef: ColDef = {
          field: field.column_name,
          headerName: field.display_name,
          width: field.column_width || 150,
          sortable: enableSorting && field.sortable !== false,
          filter: enableFiltering && field.filterable !== false,
          editable: enableInlineEdit && field.editable !== false,
          resizable: true,
          suppressMenu: false,
          cellRenderer: (params: any) => {
            const value = params.value;
            if (value === null || value === undefined) {
              return <Typography variant="body2" color="text.secondary">—</Typography>;
            }
            if (field.field_type === 'boolean') {
              return <Chip label={value ? 'Yes' : 'No'} color={value ? 'success' : 'default'} size="small" />;
            }
            if (field.field_type === 'date') {
              return new Date(value).toLocaleDateString();
            }
            if (typeof value === 'string' && value.length > 50) {
              return value.substring(0, 50) + '...';
            }
            return String(value);
          },
        };

        // Add specific column types
        if (field.field_type === 'date') {
          colDef.filter = 'agDateColumnFilter';
        } else if (field.field_type === 'number') {
          colDef.filter = 'agNumberColumnFilter';
        } else if (field.field_type === 'select') {
          colDef.filter = 'agSetColumnFilter';
          colDef.cellEditor = 'agSelectCellEditor';
          colDef.cellEditorParams = {
            values: field.options || [],
          };
        }

        columns.push(colDef);
      });

    // Actions column
    if (enableRowActions) {
      columns.push({
        field: 'actions',
        headerName: 'Actions',
        width: 120,
        pinned: 'right',
        suppressMenu: true,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const record = params.data;
          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {onRecordView && (
                <Tooltip title="View">
                  <IconButton size="small" onClick={() => onRecordView(record)}>
                    👁️
                  </IconButton>
                </Tooltip>
              )}
              {onRecordEdit && (
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onRecordEdit(record)}>
                    ✏️
                  </IconButton>
                </Tooltip>
              )}
              {onRecordDelete && (
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onRecordDelete(record)}>
                    🗑️
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        },
      });
    }

    return columns;
  }, [fields, schema, enableSelection, enableSorting, enableFiltering, enableInlineEdit, enableRowActions, onRecordView, onRecordEdit, onRecordDelete]);

  // Memoized grid options
  const gridOptions = useMemo(() => {
    const baseOptions = {
      columnDefs,
      rowData: data,
      rowSelection: enableSelection ? 'multiple' : undefined,
      suppressRowClickSelection: true,
      enableRangeSelection: true,
      enableCharts: true,
      enableCellTextSelection: true,
      animateRows: true,
      domLayout: 'normal' as const,
      pagination: enablePagination,
      paginationPageSize: pagination?.limit || 50,
      paginationPageSizeSelector: [10, 25, 50, 100],
      onGridReady: (event: GridReadyEvent) => {
        setGridApi(event.api);
        setColumnApi(event.columnApi);
      },
      onSelectionChanged: (event: SelectionChangedEvent) => {
        const selectedRows = event.api.getSelectedRows();
        onSelectionChange?.(selectedRows);
      },
      onCellValueChanged: (event: CellValueChangedEvent) => {
        if (enableInlineEdit) {
          updateRecord(event.data.id, { [event.colDef.field!]: event.newValue });
        }
      },
      onRowClicked: (event: any) => {
        onRecordSelect?.(event.data);
      },
    };

    // Merge with configuration if available
    if (config) {
      return {
        ...baseOptions,
        ...config.grid_options,
        columnDefs: config.column_definitions || columnDefs,
      };
    }

    return baseOptions;
  }, [columnDefs, data, enableSelection, enablePagination, pagination, config, enableInlineEdit, updateRecord, onSelectionChange, onRecordSelect]);

  // Event handlers
  const handleRefresh = useCallback(() => {
    gridApi?.refreshCells();
  }, [gridApi]);

  const handleExport = useCallback((format: 'csv' | 'excel' | 'pdf' = 'csv') => {
    if (!gridApi) return;

    switch (format) {
      case 'csv':
        gridApi.exportDataAsCsv({
          fileName: `${tableName}-export.csv`,
        });
        break;
      case 'excel':
        gridApi.exportDataAsExcel({
          fileName: `${tableName}-export.xlsx`,
        });
        break;
      case 'pdf':
        // PDF export would require additional setup
        console.log('PDF export not implemented yet');
        break;
    }
  }, [gridApi, tableName]);

  // Loading state
  if (configLoading || schemaLoading || fieldsLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading AG Grid configuration...</Typography>
      </Box>
    );
  }

  // Error state
  if (configError || error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {configError || error}
      </Alert>
    );
  }

  // No data
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No records found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {onRecordCreate ? 'Create your first record to get started' : 'No records available for this table'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className={className}
      style={{
        height,
        width,
        ...style,
      }}
    >
      {/* Toolbar */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">
            {schema?.displayName || tableName} Records
          </Typography>
          <Chip label="AG Grid" color="primary" size="small" />
          <Chip label={currentTemplate.toUpperCase()} color="secondary" size="small" />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          {enableExport && (
            <Tooltip title="Export CSV">
              <IconButton onClick={() => handleExport('csv')}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Settings">
            <IconButton>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: 'calc(100% - 80px)', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          {...gridOptions}
        />
      </div>
    </Box>
  );
}

export default AgGridRecordsTable;
