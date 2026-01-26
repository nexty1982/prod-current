/**
 * Performance-Optimized Records Table Component
 * Uses virtual scrolling, memoization, and other performance optimizations
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Skeleton,
  IconButton,
  Tooltip,
  Chip,
  Box,
  Typography,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  FileDownload as DownloadIcon,
  Refresh as RefreshIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';

import { 
  useVirtualScroll,
  useMemoizedCallback,
  useMemoizedValue,
  useDebouncedSearch,
  usePerformanceMonitor,
  VirtualScrollConfig,
} from '@/utils/performance';

// Types
export interface OptimizedTableColumn {
  key: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  position: number;
  type: string;
  render?: (value: any, record: any) => React.ReactNode;
  memoized?: boolean;
}

export interface OptimizedRecordsTableProps {
  records: any[];
  columns: OptimizedTableColumn[];
  loading?: boolean;
  error?: string | null;
  selectedRecords?: string[];
  onRecordSelect?: (recordId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onRecordAction?: (action: string, record: any) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  actions?: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    disabled?: (record: any) => boolean;
  }>;
  emptyMessage?: string;
  className?: string;
  showCheckboxes?: boolean;
  showActions?: boolean;
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number;
  primaryKeyField?: string;
  // Performance props
  enableVirtualScrolling?: boolean;
  virtualScrollConfig?: VirtualScrollConfig;
  enableMemoization?: boolean;
  enableDebouncedSearch?: boolean;
  searchDebounceDelay?: number;
  batchSize?: number;
  enablePerformanceMonitoring?: boolean;
}

// Memoized row component for virtual scrolling
const MemoizedRow = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    records: any[];
    columns: OptimizedTableColumn[];
    selectedRecords: string[];
    actions: any[];
    onRecordSelect?: (recordId: string, selected: boolean) => void;
    onRecordAction?: (action: string, record: any) => void;
    onActionClick: (event: React.MouseEvent<HTMLElement>, recordId: string, index: number) => void;
    onActionClose: (recordId: string) => void;
    onActionSelect: (action: string, record: any) => void;
    anchorEl: { [key: string]: HTMLElement | null };
    showCheckboxes: boolean;
    showActions: boolean;
    primaryKeyField: string;
    getRecordId: (record: any) => string;
    getColumnValue: (record: any, column: OptimizedTableColumn) => any;
  };
}>(({ index, style, data }) => {
  const {
    records,
    columns,
    selectedRecords,
    actions,
    onRecordSelect,
    onRecordAction,
    onActionClick,
    onActionClose,
    onActionSelect,
    anchorEl,
    showCheckboxes,
    showActions,
    primaryKeyField,
    getRecordId,
    getColumnValue,
  } = data;

  const record = records[index];
  const recordId = getRecordId(record);
  const isSelected = selectedRecords.includes(recordId);
  const menuAnchor = anchorEl[recordId];

  const handleRecordSelect = useCallback((selected: boolean) => {
    onRecordSelect?.(recordId, selected);
  }, [onRecordSelect, recordId]);

  const handleActionClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    onActionClick(event, recordId, index);
  }, [onActionClick, recordId, index]);

  const handleActionClose = useCallback(() => {
    onActionClose(recordId);
  }, [onActionClose, recordId]);

  const handleActionSelect = useCallback((action: string) => {
    onActionSelect(action, record);
  }, [onActionSelect, record]);

  return (
    <div style={style}>
      <TableRow
        hover
        selected={isSelected}
        sx={{
          '&:nth-of-type(odd)': {
            backgroundColor: 'grey.50',
          },
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        {showCheckboxes && (
          <TableCell padding="checkbox">
            <Checkbox
              checked={isSelected}
              onChange={(e) => handleRecordSelect(e.target.checked)}
            />
          </TableCell>
        )}
        {columns.map((column) => {
          const value = column.render 
            ? column.render(null, record)
            : getColumnValue(record, column);

          return (
            <TableCell
              key={column.key}
              align={column.align || 'left'}
              sx={{ width: column.width }}
            >
              {value}
            </TableCell>
          );
        })}
        {showActions && actions.length > 0 && (
          <TableCell align="right">
            <IconButton
              size="small"
              onClick={handleActionClick}
            >
              <MoreIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleActionClose}
            >
              {actions.map((action) => {
                const isDisabled = action.disabled?.(record) || false;
                
                return (
                  <MenuItem
                    key={action.key}
                    onClick={() => handleActionSelect(action.key)}
                    disabled={isDisabled}
                    sx={{
                      color: isDisabled ? 'text.disabled' : `${action.color}.main`,
                    }}
                  >
                    <ListItemIcon>
                      {action.icon}
                    </ListItemIcon>
                    <ListItemText>{action.label}</ListItemText>
                  </MenuItem>
                );
              })}
            </Menu>
          </TableCell>
        )}
      </TableRow>
    </div>
  );
});

MemoizedRow.displayName = 'MemoizedRow';

export function OptimizedRecordsTable({
  records,
  columns,
  loading = false,
  error = null,
  selectedRecords = [],
  onRecordSelect,
  onSelectAll,
  onRecordAction,
  onSort,
  sortField,
  sortDirection = 'asc',
  actions = [],
  emptyMessage = 'No records found',
  className = '',
  showCheckboxes = false,
  showActions = true,
  dense = false,
  stickyHeader = true,
  maxHeight = 600,
  primaryKeyField = 'id',
  enableVirtualScrolling = false,
  virtualScrollConfig = { itemHeight: 50, containerHeight: 600 },
  enableMemoization = true,
  enableDebouncedSearch = true,
  searchDebounceDelay = 300,
  batchSize = 100,
  enablePerformanceMonitoring = false,
}: OptimizedRecordsTableProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const tableRef = useRef<HTMLTableElement>(null);
  const { measure, getMetrics } = usePerformanceMonitor();

  // Debounced search
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, searchDebounceDelay);

  // Memoized callbacks
  const handleSort = useMemoizedCallback((field: string) => {
    if (!onSort) return;
    
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  }, [onSort, sortField, sortDirection]);

  const handleActionClick = useMemoizedCallback((event: React.MouseEvent<HTMLElement>, recordId: string, index: number) => {
    setAnchorEl(prev => ({ ...prev, [recordId]: event.currentTarget }));
  }, []);

  const handleActionClose = useMemoizedCallback((recordId: string) => {
    setAnchorEl(prev => ({ ...prev, [recordId]: null }));
  }, []);

  const handleActionSelect = useMemoizedCallback((action: string, record: any) => {
    onRecordAction?.(action, record);
    setAnchorEl({});
  }, [onRecordAction]);

  const handleRecordSelect = useMemoizedCallback((recordId: string, selected: boolean) => {
    onRecordSelect?.(recordId, selected);
  }, [onRecordSelect]);

  const handleSelectAll = useMemoizedCallback((selected: boolean) => {
    onSelectAll?.(selected);
  }, [onSelectAll]);

  // Memoized utility functions
  const getRecordId = useMemoizedCallback((record: any): string => {
    return record[primaryKeyField] || 
           record.id || 
           record._id || 
           record[`${primaryKeyField}_id`] ||
           String(record._columnPositions?.[0] || '');
  }, [primaryKeyField]);

  const getColumnValue = useMemoizedCallback((record: any, column: OptimizedTableColumn): any => {
    // Try to get value by column position first
    if (record._displayData && record._displayData[column.position] !== undefined) {
      return record._displayData[column.position];
    }
    
    if (record._columnPositions && record._columnPositions[column.position] !== undefined) {
      return formatValue(record._columnPositions[column.position], column.type);
    }
    
    // Fallback to column name
    const columnName = column.key.replace('col_', '');
    const value = record[columnName];
    return formatValue(value, column.type);
  }, []);

  // Memoized data processing
  const processedRecords = useMemoizedValue(() => {
    if (enablePerformanceMonitoring) {
      return measure('dataProcessing', () => {
        return records.map(record => ({
          ...record,
          _processed: true,
        }));
      });
    }
    return records;
  }, [records, enablePerformanceMonitoring, measure]);

  // Memoized columns
  const sortedColumns = useMemoizedValue(() => {
    return [...columns].sort((a, b) => a.position - b.position);
  }, [columns]);

  // Memoized selection state
  const selectionState = useMemoizedValue(() => {
    const allSelected = records.length > 0 && selectedRecords.length === records.length;
    const someSelected = selectedRecords.length > 0 && selectedRecords.length < records.length;
    return { allSelected, someSelected };
  }, [records.length, selectedRecords.length]);

  // Virtual scrolling setup
  const virtualScrollData = useMemo(() => ({
    records: processedRecords,
    columns: sortedColumns,
    selectedRecords,
    actions,
    onRecordSelect: handleRecordSelect,
    onRecordAction,
    onActionClick: handleActionClick,
    onActionClose: handleActionClose,
    onActionSelect: handleActionSelect,
    anchorEl,
    showCheckboxes,
    showActions,
    primaryKeyField,
    getRecordId,
    getColumnValue,
  }), [
    processedRecords,
    sortedColumns,
    selectedRecords,
    actions,
    handleRecordSelect,
    onRecordAction,
    handleActionClick,
    handleActionClose,
    handleActionSelect,
    anchorEl,
    showCheckboxes,
    showActions,
    primaryKeyField,
    getRecordId,
    getColumnValue,
  ]);

  // Performance monitoring
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      const metrics = getMetrics();
      console.log('Performance Metrics:', metrics);
    }
  }, [enablePerformanceMonitoring, getMetrics]);

  // Loading state
  if (loading) {
    return (
      <Box role="status" aria-live="polite">
        <LinearProgress />
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading records...</Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        role="alert"
        aria-live="assertive"
      >
        {error}
      </Alert>
    );
  }

  // Empty state
  if (records.length === 0) {
    return (
      <Box 
        sx={{ p: 3, textAlign: 'center' }}
        role="status"
        aria-live="polite"
      >
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight: stickyHeader ? maxHeight : undefined,
        borderRadius: 2,
        boxShadow: 1,
      }}
      className={className}
    >
      <Table 
        ref={tableRef}
        stickyHeader={stickyHeader} 
        size={dense ? 'small' : 'medium'}
        role="table"
      >
        <TableHeader>
          <TableRow role="row">
            {showCheckboxes && (
              <TableCell 
                padding="checkbox"
                role="columnheader"
                aria-sort={selectionState.allSelected ? 'all' : selectionState.someSelected ? 'some' : 'none'}
              >
                <Checkbox
                  indeterminate={selectionState.someSelected}
                  checked={selectionState.allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all records"
                />
              </TableCell>
            )}
            {sortedColumns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || 'left'}
                sx={{
                  width: column.width,
                  cursor: column.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  fontWeight: 600,
                  backgroundColor: 'grey.50',
                }}
                onClick={() => column.sortable && handleSort(column.key)}
                role="columnheader"
                tabIndex={column.sortable ? 0 : -1}
                aria-sort={
                  column.sortable
                    ? sortField === column.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                    : undefined
                }
                aria-label={column.label}
                onKeyDown={(e) => {
                  if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleSort(column.key);
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {column.label}
                  {column.sortable && sortField === column.key && (
                    <Chip
                      label={sortDirection === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                      size="small"
                      color="primary"
                      variant="outlined"
                      aria-hidden="true"
                    />
                  )}
                </Box>
              </TableCell>
            ))}
            {showActions && actions.length > 0 && (
              <TableCell 
                align="right" 
                sx={{ width: 60, backgroundColor: 'grey.50' }}
                role="columnheader"
                aria-label="Actions"
              >
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {enableVirtualScrolling && records.length > batchSize ? (
            <List
              height={virtualScrollConfig.containerHeight}
              itemCount={records.length}
              itemSize={virtualScrollConfig.itemHeight}
              itemData={virtualScrollData}
              overscanCount={5}
            >
              {MemoizedRow}
            </List>
          ) : (
            <AnimatePresence>
              {processedRecords.map((record, index) => {
                const recordId = getRecordId(record);
                const isSelected = selectedRecords.includes(recordId);
                const menuAnchor = anchorEl[recordId];

                return (
                  <motion.tr
                    key={recordId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    asChild
                  >
                    <TableRow
                      hover
                      selected={isSelected}
                      sx={{
                        '&:nth-of-type(odd)': {
                          backgroundColor: 'grey.50',
                        },
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      {showCheckboxes && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleRecordSelect(recordId, e.target.checked)}
                          />
                        </TableCell>
                      )}
                      {sortedColumns.map((column) => {
                        const value = column.render 
                          ? column.render(null, record)
                          : getColumnValue(record, column);

                        return (
                          <TableCell
                            key={column.key}
                            align={column.align || 'left'}
                            sx={{ width: column.width }}
                          >
                            {value}
                          </TableCell>
                        );
                      })}
                      {showActions && actions.length > 0 && (
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => handleActionClick(e, recordId, index)}
                          >
                            <MoreIcon />
                          </IconButton>
                          <Menu
                            anchorEl={menuAnchor}
                            open={Boolean(menuAnchor)}
                            onClose={() => handleActionClose(recordId)}
                          >
                            {actions.map((action) => {
                              const isDisabled = action.disabled?.(record) || false;
                              
                              return (
                                <MenuItem
                                  key={action.key}
                                  onClick={() => handleActionSelect(action.key, record)}
                                  disabled={isDisabled}
                                  sx={{
                                    color: isDisabled ? 'text.disabled' : `${action.color}.main`,
                                  }}
                                >
                                  <ListItemIcon>
                                    {action.icon}
                                  </ListItemIcon>
                                  <ListItemText>{action.label}</ListItemText>
                                </MenuItem>
                              );
                            })}
                          </Menu>
                        </TableCell>
                      )}
                    </TableRow>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Format value based on column type
 */
function formatValue(value: any, type: string): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (type) {
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'number':
      return value.toString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'json':
      return typeof value === 'string' ? value : JSON.stringify(value);
    default:
      return String(value);
  }
}

export default OptimizedRecordsTable;
