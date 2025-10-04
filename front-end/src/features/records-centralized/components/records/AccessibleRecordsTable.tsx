/**
 * Accessible Records Table Component
 * Enhanced with ARIA attributes, keyboard navigation, and screen reader support
 */

import React, { useState, useRef, useEffect } from 'react';
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

import { useFocusManagement, useKeyboardNavigation } from '@/utils/performance';

// Types
export interface AccessibleTableColumn {
  key: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  position: number;
  type: string;
  render?: (value: any, record: any) => React.ReactNode;
  ariaLabel?: string;
  description?: string;
}

export interface AccessibleRecordsTableProps {
  records: any[];
  columns: AccessibleTableColumn[];
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
    ariaLabel?: string;
  }>;
  emptyMessage?: string;
  className?: string;
  showCheckboxes?: boolean;
  showActions?: boolean;
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number;
  primaryKeyField?: string;
  // Accessibility props
  tableLabel?: string;
  tableDescription?: string;
  announceChanges?: boolean;
  enableKeyboardNavigation?: boolean;
  enableScreenReaderSupport?: boolean;
}

export function AccessibleRecordsTable({
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
  tableLabel = 'Records table',
  tableDescription,
  announceChanges = true,
  enableKeyboardNavigation = true,
  enableScreenReaderSupport = true,
}: AccessibleRecordsTableProps) {
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  
  const tableRef = useRef<HTMLTableElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  
  const { registerFocusable, focusNext, focusPrevious, focusFirst, focusLast } = useFocusManagement();
  
  // Keyboard navigation
  useKeyboardNavigation(
    () => handleRowAction('view', records[focusedRow || 0]),
    () => setAnchorEl({}),
    () => focusPreviousRow(),
    () => focusNextRow()
  );

  // Announce changes to screen readers
  useEffect(() => {
    if (announceChanges && announcement && announcementRef.current) {
      announcementRef.current.textContent = announcement;
    }
  }, [announcement, announceChanges]);

  // Handle sort
  const handleSort = (field: string) => {
    if (!onSort) return;
    
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
    
    if (announceChanges) {
      setAnnouncement(`Sorted by ${field} in ${newDirection}ending order`);
    }
  };

  // Handle action menu
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, recordId: string, rowIndex: number) => {
    setAnchorEl(prev => ({ ...prev, [recordId]: event.currentTarget }));
    setFocusedRow(rowIndex);
  };

  const handleActionClose = (recordId: string) => {
    setAnchorEl(prev => ({ ...prev, [recordId]: null }));
  };

  const handleActionSelect = (action: string, record: any) => {
    onRecordAction?.(action, record);
    setAnchorEl({});
    
    if (announceChanges) {
      setAnnouncement(`Action ${action} performed on record`);
    }
  };

  // Handle selection
  const handleRecordSelect = (recordId: string, selected: boolean) => {
    onRecordSelect?.(recordId, selected);
    
    if (announceChanges) {
      setAnnouncement(`Record ${selected ? 'selected' : 'deselected'}`);
    }
  };

  const handleSelectAll = (selected: boolean) => {
    onSelectAll?.(selected);
    
    if (announceChanges) {
      setAnnouncement(`${selected ? 'All' : 'No'} records selected`);
    }
  };

  // Row navigation
  const focusNextRow = () => {
    if (focusedRow === null || focusedRow >= records.length - 1) {
      setFocusedRow(0);
    } else {
      setFocusedRow(focusedRow + 1);
    }
  };

  const focusPreviousRow = () => {
    if (focusedRow === null || focusedRow <= 0) {
      setFocusedRow(records.length - 1);
    } else {
      setFocusedRow(focusedRow - 1);
    }
  };

  const handleRowAction = (action: string, record: any) => {
    if (record) {
      onRecordAction?.(action, record);
    }
  };

  // Get record ID
  const getRecordId = (record: any): string => {
    return record[primaryKeyField] || 
           record.id || 
           record._id || 
           record[`${primaryKeyField}_id`] ||
           String(record._columnPositions?.[0] || '');
  };

  // Check selection state
  const allSelected = records.length > 0 && selectedRecords.length === records.length;
  const someSelected = selectedRecords.length > 0 && selectedRecords.length < records.length;

  // Sort columns by position
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

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
    <>
      {/* Screen reader announcements */}
      {enableScreenReaderSupport && (
        <Box
          ref={announcementRef}
          sx={{
            position: 'absolute',
            left: '-10000px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        />
      )}

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
          aria-label={tableLabel}
          aria-describedby={tableDescription ? 'table-description' : undefined}
        >
          {tableDescription && (
            <caption id="table-description" style={{ display: 'none' }}>
              {tableDescription}
            </caption>
          )}
          
          <TableHeader>
            <TableRow role="row">
              {showCheckboxes && (
                <TableCell 
                  padding="checkbox"
                  role="columnheader"
                  aria-sort={allSelected ? 'all' : someSelected ? 'some' : 'none'}
                >
                  <Checkbox
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all records"
                    inputProps={{ 'aria-describedby': 'select-all-description' }}
                  />
                  <Typography 
                    id="select-all-description" 
                    variant="caption" 
                    sx={{ display: 'none' }}
                  >
                    Check to select all records, uncheck to deselect all
                  </Typography>
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
                  aria-label={column.ariaLabel || column.label}
                  aria-describedby={column.description ? `${column.key}-description` : undefined}
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
                  {column.description && (
                    <Typography 
                      id={`${column.key}-description`}
                      variant="caption" 
                      sx={{ display: 'none' }}
                    >
                      {column.description}
                    </Typography>
                  )}
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
            <AnimatePresence>
              {records.map((record, index) => {
                const recordId = getRecordId(record);
                const isSelected = selectedRecords.includes(recordId);
                const isFocused = focusedRow === index;
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
                        ...(isFocused && {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: '-2px',
                        }),
                      }}
                      role="row"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onFocus={() => setFocusedRow(index)}
                      onKeyDown={(e) => {
                        if (enableKeyboardNavigation) {
                          switch (e.key) {
                            case 'ArrowDown':
                              e.preventDefault();
                              focusNextRow();
                              break;
                            case 'ArrowUp':
                              e.preventDefault();
                              focusPreviousRow();
                              break;
                            case 'Enter':
                            case ' ':
                              e.preventDefault();
                              handleRowAction('view', record);
                              break;
                          }
                        }
                      }}
                    >
                      {showCheckboxes && (
                        <TableCell 
                          padding="checkbox"
                          role="gridcell"
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleRecordSelect(recordId, e.target.checked)}
                            aria-label={`Select record ${index + 1}`}
                            inputProps={{ 
                              'aria-describedby': `record-${recordId}-description` 
                            }}
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
                            role="gridcell"
                            aria-label={`${column.label}: ${value}`}
                          >
                            {value}
                          </TableCell>
                        );
                      })}
                      {showActions && actions.length > 0 && (
                        <TableCell 
                          align="right"
                          role="gridcell"
                        >
                          <IconButton
                            size="small"
                            onClick={(e) => handleActionClick(e, recordId, index)}
                            aria-label={`Actions for record ${index + 1}`}
                            aria-haspopup="true"
                            aria-expanded={Boolean(menuAnchor)}
                            ref={(el) => registerFocusable(el)}
                          >
                            <MoreIcon />
                          </IconButton>
                          <Menu
                            anchorEl={menuAnchor}
                            open={Boolean(menuAnchor)}
                            onClose={() => handleActionClose(recordId)}
                            anchorOrigin={{
                              vertical: 'bottom',
                              horizontal: 'right',
                            }}
                            transformOrigin={{
                              vertical: 'top',
                              horizontal: 'right',
                            }}
                            role="menu"
                            aria-label={`Actions for record ${index + 1}`}
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
                                  role="menuitem"
                                  aria-label={action.ariaLabel || action.label}
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
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

/**
 * Get column value from record using position or name
 */
function getColumnValue(record: any, column: AccessibleTableColumn): any {
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

export default AccessibleRecordsTable;
