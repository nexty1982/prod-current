/**
 * Canonical Dynamic Records Display Component
 * 
 * A flexible, schema-aware component that can display any record type with:
 * - Automatic column inference from data
 * - Field definition mapping support
 * - Customizable column ordering and hiding
 * - Built-in date formatting and cell rendering
 * - Action buttons for view/edit/delete operations
 */

import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Box,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { inferColumnsFromRecords, mapFieldDefinitionsToDynamicColumns } from './columnMappers';
import { renderCellValue } from './cellRenderers';

// Types
export interface DynamicColumn {
  field: string;
  headerName?: string;
  valueGetter?: (row: any) => any;
  cellRenderer?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  width?: number;
  hide?: boolean;
}

export type LayoutVariant = 'table' | 'dense' | 'cards';
export type SortModel = { field: string; direction: 'asc' | 'desc' };

export interface DynamicRecordsDisplayProps {
  records: any[];
  columns?: DynamicColumn[];
  inferColumns?: boolean;
  columnOrder?: string[];
  hiddenFields?: string[];
  dateFields?: string[];
  layout?: LayoutVariant;
  initialSort?: SortModel;
  onSortChange?: (model: SortModel) => void;
  loading?: boolean;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (id: string | number) => void;
  maxHeight?: number;
  showActions?: boolean;
  emptyMessage?: string;
  className?: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export const DynamicRecordsDisplay: React.FC<DynamicRecordsDisplayProps> = ({
  records = [],
  columns: providedColumns,
  inferColumns = true,
  columnOrder = [],
  hiddenFields = [],
  dateFields = [],
  layout = 'table',
  initialSort,
  onSortChange,
  loading = false,
  onView,
  onEdit,
  onDelete,
  maxHeight = 600,
  showActions = true,
  emptyMessage = 'No records found',
  className = '',
}) => {
  const [sortConfig, setSortConfig] = useState<SortModel | null>(initialSort || null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Determine columns to use
  const columns = useMemo(() => {
    if (providedColumns && providedColumns.length > 0) {
      return providedColumns.filter(col => !col.hide && !hiddenFields.includes(col.field));
    }

    if (inferColumns && records.length > 0) {
      return inferColumnsFromRecords(records, {
        columnOrder,
        hiddenFields,
        dateFields,
      });
    }

    return [];
  }, [providedColumns, inferColumns, records, columnOrder, hiddenFields, dateFields]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (!sortConfig || records.length === 0) {
      return records;
    }

    const sortedData = [...records].sort((a, b) => {
      const column = columns.find(col => col.field === sortConfig.field);
      
      let aVal = column?.valueGetter ? column.valueGetter(a) : a[sortConfig.field];
      let bVal = column?.valueGetter ? column.valueGetter(b) : b[sortConfig.field];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Convert to strings for comparison if needed
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sortedData;
  }, [records, sortConfig, columns]);

  // Handle sorting
  const handleSort = (field: string) => {
    const column = columns.find(col => col.field === field);
    if (!column?.sortable) return;

    setSortConfig(current => {
      const newSort = current?.field === field 
        ? (current.direction === 'asc' ? { field, direction: 'desc' as const } : null)
        : { field, direction: 'asc' as const };
      
      // Call onSortChange callback if provided
      if (newSort && onSortChange) {
        onSortChange(newSort);
      }
      
      return newSort;
    });
  };

  // Handle action menu
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleAction = (action: 'view' | 'edit' | 'delete') => {
    if (!selectedRow) return;

    switch (action) {
      case 'view':
        onView?.(selectedRow);
        break;
      case 'edit':
        onEdit?.(selectedRow);
        break;
      case 'delete':
        const id = selectedRow.id || selectedRow._id || selectedRow.ID;
        if (id != null) {
          onDelete?.(id);
        }
        break;
    }
    handleActionClose();
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  // Empty state
  if (records.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography variant="body1" color="textSecondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  // No columns available
  if (columns.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography variant="body1" color="textSecondary">
          No columns available to display
        </Typography>
      </Box>
    );
  }

  const hasActions = showActions && (onView || onEdit || onDelete);

  return (
    <Paper className={className} elevation={1}>
      <TableContainer style={{ maxHeight }}>
        <Table stickyHeader size={layout === 'dense' ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  style={{ width: column.width }}
                  sortDirection={
                    sortConfig?.field === column.field ? sortConfig.direction : false
                  }
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortConfig?.field === column.field}
                      direction={sortConfig?.field === column.field ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort(column.field)}
                    >
                      {column.headerName || column.field}
                    </TableSortLabel>
                  ) : (
                    column.headerName || column.field
                  )}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell width={60} align="center">
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRecords.map((row, index) => {
              const rowId = row.id || row._id || row.ID || index;
              
              return (
                <TableRow key={rowId} hover>
                  {columns.map((column) => {
                    const value = column.valueGetter ? column.valueGetter(row) : row[column.field];
                    const renderedValue = column.cellRenderer 
                      ? column.cellRenderer(value, row)
                      : renderCellValue(value, column.field, dateFields);

                    return (
                      <TableCell key={`${rowId}-${column.field}`}>
                        {renderedValue}
                      </TableCell>
                    );
                  })}
                  {hasActions && (
                    <TableCell align="center">
                      <Tooltip title="Actions">
                        <IconButton
                          size="small"
                          onClick={(event) => handleActionClick(event, row)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {onView && (
          <MenuItem onClick={() => handleAction('view')}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View</ListItemText>
          </MenuItem>
        )}
        {onEdit && (
          <MenuItem onClick={() => handleAction('edit')}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem onClick={() => handleAction('delete')}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default DynamicRecordsDisplay;