/**
 * Canonical Dynamic Records Display Component
 */

import React, { useMemo, useState } from 'react';
import { Global } from '@emotion/react';
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Chip,
  Checkbox,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { inferColumnsFromRecords, mapFieldDefinitionsToDynamicColumns } from './columnMappers';
import { renderCellValue } from './cellRenderers';

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
  selectedRecords?: string[];
  onRecordSelect?: (recordId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  rowStyle?: (record: any) => React.CSSProperties;
  themeTokens?: {
    headerBg: string;
    headerText: string;
    rowOddBg: string;
    rowEvenBg: string;
    border: string;
    accent: string;
    cellText: string;
  };
  fieldRules?: {
    field: string;
    weight?: "regular" | "bold";
    italic?: boolean;
    uppercase?: boolean;
    color?: string;
    bg?: string;
  }[];
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
  themeTokens,
  fieldRules = [],
  selectedRecords = [],
  onRecordSelect,
  onSelectAll,
  rowStyle,
}) => {
  const [sortConfig, setSortConfig] = useState<SortModel | null>(initialSort || null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Apply field-specific styling rules
  const getFieldCellStyle = (fieldName: string) => {
    const rule = fieldRules?.find(r => r.field === fieldName);
    if (!rule && !themeTokens) return {};
    
    const style: any = {
      color: themeTokens?.cellText,
      borderBottom: themeTokens ? `1px solid ${themeTokens.border}` : undefined
    };
    
    if (rule) {
      if (rule.weight === 'bold') style.fontWeight = 'bold';
      if (rule.italic) style.fontStyle = 'italic';
      if (rule.uppercase) style.textTransform = 'uppercase';
      if (rule.color) style.color = rule.color;
      if (rule.bg) style.bgcolor = rule.bg;
    }
    
    return style;
  };

  const columns = useMemo<DynamicColumn[]>(() => {
    if (providedColumns && providedColumns.length > 0) {
      return providedColumns.filter((col: DynamicColumn) => !col.hide && !hiddenFields.includes(col.field));
    }
    
    if (inferColumns && records.length > 0) {
      return inferColumnsFromRecords(records, { hiddenFields, dateFields, columnOrder });
    }
    
    return [];
  }, [providedColumns, inferColumns, records, hiddenFields, dateFields, columnOrder]);

  const sortedRecords = useMemo(() => {
    if (!sortConfig || !records.length) return records;

    const sortedData = [...records].sort((a, b) => {
      const column = columns.find((col: DynamicColumn) => col.field === sortConfig.field);
      if (!column) return 0;

      let aVal = column.valueGetter ? column.valueGetter(a) : a[sortConfig.field];
      let bVal = column.valueGetter ? column.valueGetter(b) : b[sortConfig.field];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (dateFields.includes(sortConfig.field)) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'number' || !isNaN(Number(aVal))) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sortedData;
  }, [records, sortConfig, columns, dateFields]);

  const handleSort = (field: string) => {
    const column = columns.find((col: DynamicColumn) => col.field === field);
    if (!column?.sortable) return;

    setSortConfig((current: SortModel | null) => {
      const newSort = current?.field === field 
        ? (current.direction === 'asc' ? { field, direction: 'desc' as const } : null)
        : { field, direction: 'asc' as const };
      
      if (newSort && onSortChange) {
        onSortChange(newSort);
      }
      
      return newSort;
    });
  };

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
        const rowId = selectedRow.id || selectedRow._id || selectedRow.ID;
        if (rowId != null) {
          onDelete?.(rowId);
        }
        break;
    }
    handleActionClose();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sortedRecords.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  const renderTableLayout = () => {
    const showCheckboxes = !!onRecordSelect;
    const allSelected = sortedRecords.length > 0 && sortedRecords.every((row: any) => {
      const rowId = String(row.id || row._id || '');
      return selectedRecords.includes(rowId);
    });
    const someSelected = sortedRecords.some((row: any) => {
      const rowId = String(row.id || row._id || '');
      return selectedRecords.includes(rowId);
    });

    // Debug: Log to ensure showActions is true
    // if (showActions) {
    //   console.log('✅ Action buttons should be visible. showActions:', showActions, 'onView:', !!onView, 'onEdit:', !!onEdit, 'onDelete:', !!onDelete);
    // }

    return (
    <TableContainer component={Paper} style={{ maxHeight }} className={className}>
      <Table stickyHeader size={layout === 'dense' ? 'small' : 'medium'}>
        <TableHead>
          <TableRow sx={themeTokens ? { bgcolor: themeTokens.headerBg, color: themeTokens.headerText } : {}}>
            {showCheckboxes && (
              <TableCell padding="checkbox" sx={themeTokens ? { bgcolor: themeTokens.headerBg, color: themeTokens.headerText, borderBottom: `1px solid ${themeTokens.border}` } : {}}>
                <Checkbox
                  indeterminate={someSelected && !allSelected}
                  checked={allSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                />
              </TableCell>
            )}
            {columns.map((column: DynamicColumn) => (
              <TableCell key={column.field} sx={themeTokens ? { bgcolor: themeTokens.headerBg, color: themeTokens.headerText, borderBottom: `1px solid ${themeTokens.border}` } : {}}>
                {column.sortable !== false ? (
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
            {showActions && (
              <TableCell 
                sx={{ 
                  ...(themeTokens ? { bgcolor: themeTokens.headerBg, color: themeTokens.headerText, borderBottom: `1px solid ${themeTokens.border}` } : {}),
                  width: 60,
                  minWidth: 60,
                  position: 'sticky',
                  right: 0,
                  backgroundColor: themeTokens?.headerBg || 'background.paper',
                  zIndex: 10
                }}
              >
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRecords.map((row: any, index: number) => {
            const rowId = String(row.id || row._id || index);
            const isSelected = selectedRecords.includes(rowId);
            const isNew = row._isNew;
            const rowStyleProps = rowStyle ? rowStyle(row) : {};
            
            return (
              <TableRow 
                key={rowId} 
                hover 
                selected={isSelected}
                className={isNew ? 'new-record-row' : ''}
                sx={{
                  ...(themeTokens ? { 
                    bgcolor: index % 2 === 0 ? themeTokens.rowEvenBg : themeTokens.rowOddBg, 
                    borderBottom: `1px solid ${themeTokens.border}` 
                  } : {}),
                  ...(isNew ? {
                    backgroundColor: '#e8f5e9 !important',
                    borderLeft: '4px solid #4caf50 !important',
                    '& .MuiTableCell-root': {
                      backgroundColor: 'transparent',
                    },
                  } : {}),
                  ...rowStyleProps,
                }}
              >
                {showCheckboxes && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => onRecordSelect?.(rowId, e.target.checked)}
                    />
                  </TableCell>
                )}
                {columns.map((column: DynamicColumn) => {
                  const value = column.valueGetter ? column.valueGetter(row) : row[column.field];
                  return (
                    <TableCell key={column.field} sx={getFieldCellStyle(column.field)}>
                      {column.cellRenderer 
                        ? column.cellRenderer(value, row) 
                        : renderCellValue(value, column.field, dateFields)
                      }
                    </TableCell>
                  );
                })}
                {showActions && (
                  <TableCell 
                    sx={{ 
                      width: 60,
                      minWidth: 60,
                      position: 'sticky',
                      right: 0,
                      backgroundColor: isNew ? '#e8f5e9' : (themeTokens ? (index % 2 === 0 ? themeTokens.rowEvenBg : themeTokens.rowOddBg) : 'background.paper'),
                      zIndex: 5
                    }}
                  >
                    <Tooltip title="Actions">
                      <IconButton
                        size="small"
                        onClick={(event: React.MouseEvent<HTMLElement>) => handleActionClick(event, row)}
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: 'action.hover' 
                          } 
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
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
    );
  };

  const renderCardsLayout = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {columns.slice(0, 4).map((column: DynamicColumn) => (
          <Chip
            key={column.field}
            label={column.headerName || column.field}
            variant={sortConfig?.field === column.field ? 'filled' : 'outlined'}
            onClick={() => column.sortable !== false && handleSort(column.field)}
            color={sortConfig?.field === column.field ? 'primary' : 'default'}
            sx={{ cursor: column.sortable !== false ? 'pointer' : 'default' }}
          />
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {sortedRecords.map((row: any, index: number) => {
          const rowId = row.id || row._id || index;
          return (
            <Box key={rowId} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 11px)' } }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  {columns.slice(0, 6).map((column: DynamicColumn) => {
                    const value = column.valueGetter ? column.valueGetter(row) : row[column.field];
                    const displayValue = column.cellRenderer 
                      ? column.cellRenderer(value, row) 
                      : renderCellValue(value, column.field, dateFields);
                    
                    return (
                      <Box key={column.field} sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {column.headerName || column.field}:
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {displayValue}
                        </Typography>
                      </Box>
                    );
                  })}
                  
                  {showActions && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      {onView && (
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => onView(row)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onEdit && (
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => onEdit(row)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onDelete && (
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              const id = row.id || row._id || row.ID;
                              if (id != null) onDelete(id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <>
      <Global
        styles={{
          '@keyframes fadeIn': {
            from: {
              opacity: 0,
              transform: 'translateY(-10px)',
            },
            to: {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
          '.new-record-row': {
            backgroundColor: '#e8f5e9 !important',
            borderLeft: '4px solid #4caf50 !important',
            animation: 'fadeIn 0.5s ease-in',
          },
        }}
      />
      {layout === 'cards' ? renderCardsLayout() : renderTableLayout()}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {onView ? (
          <MenuItem onClick={() => handleAction('view')}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View</ListItemText>
          </MenuItem>
        ) : null}
        {onEdit ? (
          <MenuItem onClick={() => handleAction('edit')}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        ) : null}
        {onDelete ? (
          <MenuItem onClick={() => handleAction('delete')}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        ) : null}
        {!onView && !onEdit && !onDelete && (
          <MenuItem disabled>
            <ListItemText>No actions available</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default DynamicRecordsDisplay;
