/**
 * Orthodox Metrics - Modern Dynamic Records Table
 * Updated to use the new unified configuration system and template-agnostic architecture
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  Chip,
  Skeleton,
  Alert,
  TableSortLabel,
  TablePagination,
  CircularProgress,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Import unified hooks and types
import {
  useUnifiedRecords,
  useUnifiedRecordMutations,
  useTableSchema,
  useFieldDefinitions,
  getCurrentTemplate,
} from '@/core';

// Import template-specific components
import { getRecordsTableComponent } from '@/ui/components';

// Import types
import { RecordData, RecordFilters, UnifiedTableSchema, FieldDefinition } from '@/core/types/RecordsTypes';

interface ModernDynamicRecordsTableProps {
  churchId: number;
  tableName: string;
  configName?: string;
  readOnly?: boolean;
  onRecordSelect?: (record: RecordData) => void;
  onRecordEdit?: (record: RecordData) => void;
  onRecordDelete?: (record: RecordData) => void;
  onRecordCreate?: () => void;
  onRecordView?: (record: RecordData) => void;
  onRecordDuplicate?: (record: RecordData) => void;
  onBulkDelete?: (records: RecordData[]) => void;
  onBulkExport?: (records: RecordData[]) => void;
  onBulkUpdate?: (records: RecordData[], updates: Partial<RecordData>) => void;
  className?: string;
  style?: React.CSSProperties;
  height?: string | number;
  width?: string | number;
  enableSelection?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  enableBulkActions?: boolean;
  enableInlineEdit?: boolean;
  enableRowActions?: boolean;
  virtualScrolling?: boolean;
  rowHeight?: number;
  overscan?: number;
}

export function ModernDynamicRecordsTable({
  churchId,
  tableName,
  configName = 'default',
  readOnly = false,
  onRecordSelect,
  onRecordEdit,
  onRecordDelete,
  onRecordCreate,
  onRecordView,
  onRecordDuplicate,
  onBulkDelete,
  onBulkExport,
  onBulkUpdate,
  className,
  style,
  height = 'auto',
  width = '100%',
  enableSelection = true,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableSearch = true,
  enableExport = true,
  enableBulkActions = true,
  enableInlineEdit = false,
  enableRowActions = true,
  virtualScrolling = false,
  rowHeight = 56,
  overscan = 10,
}: ModernDynamicRecordsTableProps) {
  // State management
  const [selectedRecords, setSelectedRecords] = useState<RecordData[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Get table schema
  const {
    schema,
    loading: schemaLoading,
    error: schemaError,
  } = useTableSchema(churchId, tableName);

  // Get field definitions
  const {
    fields,
    loading: fieldsLoading,
  } = useFieldDefinitions(churchId, tableName);

  // Get records with unified hook
  const {
    records,
    pagination,
    loading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
    setFilters,
    setSort,
    setPagination,
  } = useUnifiedRecords({
    churchId,
    tableName,
    filters: {},
    enabled: !!tableName,
  });

  // Record mutations
  const {
    deleteRecord,
    isDeleting,
    error: mutationError,
  } = useUnifiedRecordMutations({
    churchId,
    tableName,
  });

  // Get the appropriate table component for current template
  const RecordsTable = useMemo(() => getRecordsTableComponent(), [currentTemplate]);

  // Memoized visible fields
  const visibleFields = useMemo(() => {
    if (!fields) return [];
    return fields
      .filter(field => !field.is_hidden)
      .sort((a, b) => a.display_order - b.display_order);
  }, [fields]);

  // Memoized actions configuration
  const actions = useMemo(() => [
    ...(onRecordView ? [{
      key: 'view',
      label: 'View',
      icon: <ViewIcon />,
      color: 'primary' as const,
    }] : []),
    ...(onRecordEdit && !readOnly ? [{
      key: 'edit',
      label: 'Edit',
      icon: <EditIcon />,
      color: 'primary' as const,
    }] : []),
    ...(onRecordDelete && !readOnly ? [{
      key: 'delete',
      label: 'Delete',
      icon: <DeleteIcon />,
      color: 'error' as const,
    }] : []),
  ], [onRecordView, onRecordEdit, onRecordDelete, readOnly]);

  // Event handlers
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRecords(records || []);
    } else {
      setSelectedRecords([]);
    }
  }, [records]);

  const handleSelectRow = useCallback((record: RecordData, event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRecords(prev => [...prev, record]);
    } else {
      setSelectedRecords(prev => prev.filter(r => r.id !== record.id));
    }
  }, []);

  const handleSort = useCallback((field: string) => {
    if (!enableSorting) return;
    
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    setSort({ field, direction: newDirection });
  }, [enableSorting, sortField, sortDirection, setSort]);

  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
    setPagination({ page: newPage + 1, limit: rowsPerPage });
  }, [rowsPerPage, setPagination]);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setPagination({ page: 1, limit: newRowsPerPage });
  }, [setPagination]);

  const handleRecordAction = useCallback((action: string, record: RecordData) => {
    switch (action) {
      case 'view':
        onRecordView?.(record);
        break;
      case 'edit':
        onRecordEdit?.(record);
        break;
      case 'delete':
        onRecordDelete?.(record);
        break;
    }
  }, [onRecordView, onRecordEdit, onRecordDelete]);

  const handleRowClick = useCallback((record: RecordData) => {
    onRecordSelect?.(record);
  }, [onRecordSelect]);

  // Render cell content
  const renderCell = useCallback((value: any, field: FieldDefinition) => {
    if (value === null || value === undefined) {
      return <Typography variant="body2" color="text.secondary">—</Typography>;
    }

    if (field.field_type === 'boolean') {
      return (
        <Chip
          label={value ? 'Yes' : 'No'}
          color={value ? 'success' : 'default'}
          size="small"
        />
      );
    }

    if (field.field_type === 'date') {
      return (
        <Typography variant="body2">
          {new Date(value).toLocaleDateString()}
        </Typography>
      );
    }

    if (field.field_type === 'number') {
      return (
        <Typography variant="body2" sx={{ textAlign: 'right' }}>
          {value.toLocaleString()}
        </Typography>
      );
    }

    if (typeof value === 'string' && value.length > 50) {
      return (
        <Tooltip title={value}>
          <Typography variant="body2">
            {value.substring(0, 50)}...
          </Typography>
        </Tooltip>
      );
    }

    return <Typography variant="body2">{String(value)}</Typography>;
  }, []);

  // Render actions
  const renderActions = useCallback((record: RecordData) => {
    if (!enableRowActions || actions.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {actions.map((action) => (
          <Tooltip key={action.key} title={action.label}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleRecordAction(action.key, record);
              }}
              color={action.color}
            >
              {action.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    );
  }, [enableRowActions, actions, handleRecordAction]);

  // Loading state
  if (schemaLoading || fieldsLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={56} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  // Error state
  if (schemaError || recordsError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {schemaError || recordsError}
        <IconButton onClick={() => refetchRecords()} sx={{ ml: 2 }}>
          <RefreshIcon />
        </IconButton>
      </Alert>
    );
  }

  // No schema
  if (!schema) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No schema found for table: {tableName}
      </Alert>
    );
  }

  // No records
  if (!records || records.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No records found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {onRecordCreate ? 'Create your first record to get started' : 'No records available for this table'}
        </Typography>
        {onRecordCreate && (
          <IconButton
            onClick={onRecordCreate}
            sx={{ mt: 2 }}
            color="primary"
          >
            <EditIcon />
          </IconButton>
        )}
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
      {/* Use template-specific component if available */}
      {RecordsTable && RecordsTable !== require('../../ui/shared/ui/legacy/base/BaseRecordsTable').default ? (
        <RecordsTable
          data={records}
          schema={schema}
          churchId={churchId}
          tableName={tableName}
          configName={configName}
          loading={recordsLoading}
          error={recordsError}
          onRecordSelect={onRecordSelect}
          onRecordEdit={onRecordEdit}
          onRecordDelete={onRecordDelete}
          onRecordCreate={onRecordCreate}
          onRecordView={onRecordView}
          onRecordDuplicate={onRecordDuplicate}
          onBulkDelete={onBulkDelete}
          onBulkExport={onBulkExport}
          onBulkUpdate={onBulkUpdate}
          selectedRecords={selectedRecords}
          onSelectionChange={setSelectedRecords}
          onFiltersChange={setFilters}
          onSortChange={setSort}
          onPaginationChange={setPagination}
          pagination={pagination}
          enableSelection={enableSelection && !readOnly}
          enableSorting={enableSorting}
          enableFiltering={enableFiltering}
          enablePagination={enablePagination}
          enableSearch={enableSearch}
          enableExport={enableExport}
          enableBulkActions={enableBulkActions && !readOnly}
          enableInlineEdit={enableInlineEdit && !readOnly}
          enableRowActions={enableRowActions && !readOnly}
          virtualScrolling={virtualScrolling}
          rowHeight={rowHeight}
          overscan={overscan}
        />
      ) : (
        /* Fallback to base table implementation */
        <TableContainer component={Paper} elevation={0}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {enableSelection && !readOnly && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedRecords.length > 0 && selectedRecords.length < (records?.length || 0)}
                      checked={records && selectedRecords.length === records.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
                {visibleFields.map((field) => (
                  <TableCell
                    key={field.column_name}
                    onClick={() => handleSort(field.column_name)}
                    sx={{
                      cursor: enableSorting ? 'pointer' : 'default',
                      userSelect: 'none',
                      minWidth: field.column_width || 120,
                    }}
                  >
                    <TableSortLabel
                      active={sortField === field.column_name}
                      direction={sortField === field.column_name ? sortDirection : 'asc'}
                    >
                      {field.display_name}
                    </TableSortLabel>
                  </TableCell>
                ))}
                {enableRowActions && actions.length > 0 && (
                  <TableCell align="right">Actions</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {records?.map((record, index) => (
                <TableRow
                  key={record.id}
                  hover
                  onClick={() => handleRowClick(record)}
                  sx={{ cursor: 'pointer' }}
                >
                  {enableSelection && !readOnly && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRecords.some(r => r.id === record.id)}
                        onChange={(e) => handleSelectRow(record, e)}
                      />
                    </TableCell>
                  )}
                  {visibleFields.map((field) => (
                    <TableCell
                      key={field.column_name}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderCell(record[field.column_name], field)}
                    </TableCell>
                  ))}
                  {enableRowActions && actions.length > 0 && (
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {renderActions(record)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {enablePagination && pagination && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      )}
    </Box>
  );
}

export default ModernDynamicRecordsTable;
