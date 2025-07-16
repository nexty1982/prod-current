/**
 * Orthodox Metrics - AG Grid View-Only Component
 * Read-only grid component for displaying church records with color highlighting
 */

import React, { useMemo, useCallback, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellClickedEvent, SelectionChangedEvent } from 'ag-grid-community';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Toolbar,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  ViewList as ViewIcon,
} from '@mui/icons-material';

import {
  ChurchRecord,
  RecordType,
  RecordColumnDef,
  AGGridViewOnlyProps,
  RecordField,
} from '../../types/church-records-advanced.types';
import { devLogStateChange } from '../../utils/devLogger';

// AG Grid CSS imports
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

/**
 * Custom cell renderer for colored fields
 */
const ColoredCellRenderer = (params: any) => {
  const { value, data, colDef } = params;
  const fieldKey = colDef.field;
  const record = data as ChurchRecord;
  
  // Get color from record's color overrides or field's default color
  const fieldConfig = record.fields.find(f => f.key === fieldKey);
  const color = record.colorOverrides?.[fieldKey] || fieldConfig?.color;
  
  const cellStyle: React.CSSProperties = {
    backgroundColor: color ? `${color}20` : undefined, // 20% opacity
    borderLeft: color ? `3px solid ${color}` : undefined,
    paddingLeft: color ? '8px' : undefined,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  };
  
  return (
    <div style={cellStyle}>
      {value}
    </div>
  );
};

/**
 * Date formatter for date fields
 */
const formatDate = (value: any): string => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString();
};

/**
 * Boolean formatter for boolean fields
 */
const formatBoolean = (value: any): string => {
  if (typeof value !== 'boolean') return '';
  return value ? 'Yes' : 'No';
};

/**
 * AG Grid View-Only Component
 */
export const AGGridViewOnly: React.FC<AGGridViewOnlyProps> = ({
  data,
  recordType,
  columns,
  onCellClick,
  onRowSelect,
  colorOverrides,
  loading = false,
  error = null,
  height = 400,
  enableFilters = true,
  enableSorting = true,
  enableExport = false,
}) => {
  const [selectedRows, setSelectedRows] = useState<ChurchRecord[]>([]);

  // Create column definitions from record fields
  const columnDefs = useMemo((): ColDef[] => {
    if (columns) {
      // Use provided column definitions
      return columns.map(col => ({
        field: col.field,
        headerName: col.headerName,
        width: col.width || 150,
        minWidth: col.minWidth || 100,
        maxWidth: col.maxWidth,
        resizable: col.resizable !== false,
        sortable: enableSorting && (col.sortable !== false),
        filter: enableFilters && (col.filter !== false),
        editable: false, // Always read-only in this component
        cellRenderer: ColoredCellRenderer,
        valueFormatter: col.valueFormatter,
      }));
    }

    // Auto-generate columns from first record
    if (!data || data.length === 0) return [];
    
    const firstRecord = data[0];
    const columns: ColDef[] = [];

    // Add ID column
    columns.push({
      field: 'id',
      headerName: 'ID',
      width: 120,
      pinned: 'left',
      cellRenderer: ColoredCellRenderer,
    });

    // Add field columns
    firstRecord.fields.forEach((field: RecordField) => {
      let valueFormatter: ((params: any) => string) | undefined;
      
      switch (field.type) {
        case 'date':
          valueFormatter = (params) => formatDate(params.value);
          break;
        case 'boolean':
          valueFormatter = (params) => formatBoolean(params.value);
          break;
        case 'number':
          valueFormatter = (params) => params.value?.toString() || '';
          break;
        default:
          valueFormatter = (params) => params.value || '';
      }

      columns.push({
        field: `fields.${field.key}`,
        headerName: field.label,
        width: field.type === 'textarea' ? 200 : 150,
        resizable: true,
        sortable: enableSorting,
        filter: enableFilters,
        cellRenderer: ColoredCellRenderer,
        valueGetter: (params) => {
          const record = params.data as ChurchRecord;
          const fieldData = record.fields.find(f => f.key === field.key);
          return fieldData?.value || '';
        },
        valueFormatter,
      });
    });

    // Add metadata columns
    columns.push(
      {
        field: 'metadata.status',
        headerName: 'Status',
        width: 100,
        cellRenderer: ColoredCellRenderer,
        valueGetter: (params) => params.data.metadata.status,
      },
      {
        field: 'metadata.createdAt',
        headerName: 'Created',
        width: 120,
        cellRenderer: ColoredCellRenderer,
        valueGetter: (params) => params.data.metadata.createdAt,
        valueFormatter: (params) => formatDate(params.value),
      }
    );

    return columns;
  }, [data, columns, enableFilters, enableSorting]);

  // Transform data for AG Grid
  const rowData = useMemo(() => {
    if (!data) return [];
    
    return data.map(record => ({
      ...record,
      // Apply color overrides
      colorOverrides: { ...record.colorOverrides, ...colorOverrides },
    }));
  }, [data, colorOverrides]);

  // Handle cell click
  const handleCellClicked = useCallback((event: CellClickedEvent) => {
    devLogStateChange('AG Grid Cell Clicked', null, {
      field: event.colDef.field,
      value: event.value,
      recordId: event.data.id,
    }, 'AGGridViewOnly');

    if (onCellClick && event.colDef.field) {
      const fieldKey = event.colDef.field.replace('fields.', '');
      onCellClick(fieldKey, event.data as ChurchRecord);
    }
  }, [onCellClick]);

  // Handle row selection
  const handleSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    const selected = event.api.getSelectedRows() as ChurchRecord[];
    const oldSelection = selectedRows;
    setSelectedRows(selected);
    
    devLogStateChange('AG Grid Selection Changed', oldSelection, selected, 'AGGridViewOnly');

    if (onRowSelect && selected.length === 1) {
      onRowSelect(selected[0]);
    }
  }, [onRowSelect, selectedRows]);

  // Export functionality
  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    devLogStateChange('AG Grid Export Requested', null, { recordType, rowCount: data.length }, 'AGGridViewOnly');
  }, [recordType, data]);

  // Refresh functionality
  const handleRefresh = useCallback(() => {
    // TODO: Implement refresh functionality
    devLogStateChange('AG Grid Refresh Requested', null, { recordType }, 'AGGridViewOnly');
  }, [recordType]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading {recordType} records...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading records: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Toolbar */}
      <Toolbar variant="dense" sx={{ px: 0, minHeight: '48px' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {recordType.charAt(0).toUpperCase() + recordType.slice(1)} Records ({data.length})
        </Typography>
        
        {selectedRows.length > 0 && (
          <Typography variant="body2" sx={{ mr: 2 }}>
            {selectedRows.length} selected
          </Typography>
        )}

        <Tooltip title="Refresh">
          <IconButton size="small" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        {enableExport && (
          <Tooltip title="Export">
            <IconButton size="small" onClick={handleExport}>
              <ExportIcon />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>

      {/* AG Grid */}
      <Box 
        className="ag-theme-material" 
        sx={{ 
          height, 
          width: '100%',
          '& .ag-header': {
            backgroundColor: '#f5f5f5',
          },
          '& .ag-row:hover': {
            backgroundColor: '#f0f0f0',
          },
        }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            resizable: true,
            sortable: enableSorting,
            filter: enableFilters,
            floatingFilter: enableFilters,
          }}
          rowSelection="multiple"
          suppressRowClickSelection={false}
          onCellClicked={handleCellClicked}
          onSelectionChanged={handleSelectionChanged}
          animateRows={true}
          enableRangeSelection={true}
          suppressMovableColumns={false}
          suppressColumnVirtualisation={false}
          domLayout="normal"
        />
      </Box>

      {data.length === 0 && (
        <Box textAlign="center" py={4}>
          <ViewIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No {recordType} records found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Records will appear here once they are created.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AGGridViewOnly;
