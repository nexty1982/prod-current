/**
 * Unified Records Table Component
 * Leverages existing table patterns from FieldMapperTable and TableSkeleton
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  FileDownload as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Types
export interface RecordTableColumn<T = any> {
  key: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  valueGetter?: (record: T) => any;
}

export interface RecordTableProps<T = any> {
  records: T[];
  columns: RecordTableColumn<T>[];
  loading?: boolean;
  error?: string | null;
  selectedRecords?: string[];
  onRecordSelect?: (recordId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onRecordAction?: (action: string, record: T) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  actions?: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    disabled?: (record: T) => boolean;
  }>;
  emptyMessage?: string;
  className?: string;
  showCheckboxes?: boolean;
  showActions?: boolean;
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number;
}

export function RecordsTable<T = any>({
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
}: RecordTableProps<T>) {
  const [anchorEl, setAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

  // Handle sort
  const handleSort = (field: string) => {
    if (!onSort) return;
    
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  };

  // Handle action menu
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, recordId: string) => {
    setAnchorEl(prev => ({ ...prev, [recordId]: event.currentTarget }));
  };

  const handleActionClose = (recordId: string) => {
    setAnchorEl(prev => ({ ...prev, [recordId]: null }));
  };

  const handleActionSelect = (action: string, record: T) => {
    onRecordAction?.(action, record);
    // Close all menus
    setAnchorEl({});
  };

  // Handle selection
  const handleRecordSelect = (recordId: string, selected: boolean) => {
    onRecordSelect?.(recordId, selected);
  };

  const handleSelectAll = (selected: boolean) => {
    onSelectAll?.(selected);
  };

  // Get record ID (assuming records have an 'id' field)
  const getRecordId = (record: T): string => {
    return (record as any).id || (record as any)._id || '';
  };

  // Check if all records are selected
  const allSelected = records.length > 0 && selectedRecords.length === records.length;
  const someSelected = selectedRecords.length > 0 && selectedRecords.length < records.length;

  // Loading skeleton
  if (loading) {
    return <RecordsTableSkeleton columns={columns.length} rows={10} />;
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="body1">
          {error}
        </Typography>
      </Box>
    );
  }

  // Empty state
  if (records.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
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
      <Table stickyHeader={stickyHeader} size={dense ? 'small' : 'medium'}>
        <TableHeader>
          <TableRow>
            {showCheckboxes && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
            )}
            {columns.map((column) => (
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
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {column.label}
                  {column.sortable && sortField === column.key && (
                    <Chip
                      label={sortDirection === 'asc' ? '↑' : '↓'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
            ))}
            {showActions && actions.length > 0 && (
              <TableCell align="right" sx={{ width: 60, backgroundColor: 'grey.50' }}>
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => {
            const recordId = getRecordId(record);
            const isSelected = selectedRecords.includes(recordId);
            const menuAnchor = anchorEl[recordId];

            return (
              <motion.tr
                key={recordId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                  {columns.map((column) => {
                    const value = column.valueGetter 
                      ? column.valueGetter(record)
                      : (record as any)[column.key];

                    return (
                      <TableCell
                        key={column.key}
                        align={column.align || 'left'}
                        sx={{ width: column.width }}
                      >
                        {column.render ? column.render(value, record) : value}
                      </TableCell>
                    );
                  })}
                  {showActions && actions.length > 0 && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleActionClick(e, recordId)}
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
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Loading skeleton for records table
 */
export function RecordsTableSkeleton({ 
  columns = 5, 
  rows = 10 
}: { 
  columns?: number; 
  rows?: number; 
}) {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableCell key={index}>
                <Skeleton animation="wave" width="100%" height={24} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton 
                    animation="wave" 
                    width={colIndex === 0 ? 60 : colIndex === 1 ? 120 : 100} 
                    height={20} 
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Default actions for records table
 */
export const DEFAULT_RECORD_ACTIONS = [
  {
    key: 'view',
    label: 'View',
    icon: <ViewIcon fontSize="small" />,
    color: 'primary' as const,
  },
  {
    key: 'edit',
    label: 'Edit',
    icon: <EditIcon fontSize="small" />,
    color: 'primary' as const,
  },
  {
    key: 'history',
    label: 'History',
    icon: <HistoryIcon fontSize="small" />,
    color: 'info' as const,
  },
  {
    key: 'download',
    label: 'Download',
    icon: <DownloadIcon fontSize="small" />,
    color: 'secondary' as const,
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: <DeleteIcon fontSize="small" />,
    color: 'error' as const,
  },
];

export default RecordsTable;
