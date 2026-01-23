/**
 * Canonical Dynamic Records Display Component
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  Description as CertificateIcon,
} from '@mui/icons-material';
import { inferColumnsFromRecords, mapFieldDefinitionsToDynamicColumns } from './columnMappers';
import { renderCellValue } from './cellRenderers';
import { getNormalColWidth, calculateColumnWidths } from './columnWidthHelper';
import { buildNormalColGroup } from './buildColGroup';
import { getCompletenessSeverity } from '../quality/recordCompleteness';

export interface DynamicColumn {
  field: string;
  headerName?: string;
  // valueGetter supports both signatures for compatibility:
  // - (row: any) => any (simple form)
  // - ({ data: row }) => any (AG Grid style)
  valueGetter?: ((row: any) => any) | ((params: { data: any }) => any);
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
  onGenerateCertificate?: (row: any) => void;
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
  autoShrink?: boolean;
  recordType?: 'baptism' | 'marriage' | 'funeral';
  highlightIncomplete?: boolean;
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
  onGenerateCertificate,
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
  autoShrink = false,
  recordType,
  highlightIncomplete = false,
}) => {
  const [sortConfig, setSortConfig] = useState<SortModel | null>(initialSort || null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Apply field-specific styling rules
  const getFieldCellStyle = (fieldName: string) => {
    const rule = fieldRules?.find(r => r.field === fieldName);
    if (!rule && !themeTokens) return { fontSize: '15px' };
    
    const style: any = {
      color: themeTokens?.cellText,
      borderBottom: themeTokens ? `1px solid ${themeTokens.border}` : undefined,
      fontSize: '15px',
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

  // DEV-only logging: Log row structure and column keys ONCE per page load
  const hasLoggedRef = useRef(false);
  useEffect(() => {
    if (import.meta.env.DEV && records.length > 0 && columns.length > 0 && !hasLoggedRef.current) {
      const sampleRow = records[0];
      const rowKeys = Object.keys(sampleRow || {});
      const columnKeys = columns.map(c => ({ 
        key: c.field, 
        header: c.headerName || 'N/A',
        hasValueGetter: !!c.valueGetter
      }));
      
      console.log('📊 NORMAL: Row structure and columns (first render):', {
        rowSample: sampleRow,
        rowKeys,
        columnKeys,
        recordCount: records.length
      });
      
      // Check for key mismatches
      const mismatches = columnKeys.filter(col => 
        !rowKeys.includes(col.key) && !col.hasValueGetter
      );
      if (mismatches.length > 0) {
        console.warn('⚠️ NORMAL: Column keys not found in row:', mismatches);
      }
      
      // Log sample cell values for first row
      const sampleCellValues = columnKeys.slice(0, 5).map(col => {
        let val: any;
        if (col.hasValueGetter) {
          const colObj = columns.find(c => c.field === col.key);
          if (colObj?.valueGetter) {
            try {
              if (colObj.valueGetter.length === 1) {
                val = (colObj.valueGetter as (row: any) => any)(sampleRow);
              } else {
                val = colObj.valueGetter({ data: sampleRow });
              }
            } catch {
              val = undefined;
            }
          }
        } else {
          val = sampleRow[col.key];
        }
        return { field: col.key, value: val, type: typeof val };
      });
      console.log('📊 NORMAL: Sample cell values (first 5 columns):', sampleCellValues);
      
      hasLoggedRef.current = true;
    }
  }, [records, columns]); // Only log when records/columns change

  // Memoize completeness severity for all records
  const completenessMap = useMemo(() => {
    if (!highlightIncomplete || !recordType) return new Map<string, { severity: 0 | 1 | 2; missing: string[] }>();
    
    // Defensive guard: ensure getCompletenessSeverity is available
    if (typeof getCompletenessSeverity !== 'function') {
      console.warn('⚠️ getCompletenessSeverity is not available, skipping completeness highlighting');
      return new Map<string, { severity: 0 | 1 | 2; missing: string[] }>();
    }
    
    const map = new Map<string, { severity: 0 | 1 | 2; missing: string[] }>();
    records.forEach((record) => {
      const rowId = String(record.id || record._id || records.indexOf(record));
      try {
        const result = getCompletenessSeverity(recordType, record);
        map.set(rowId, result);
      } catch (error) {
        // Defensive: if evaluation fails, default to severity 0 (complete)
        console.warn('⚠️ Error evaluating completeness for record:', error);
        map.set(rowId, { severity: 0, missing: [] });
      }
    });
    return map;
  }, [records, recordType, highlightIncomplete]);

  const sortedRecords = useMemo(() => {
    if (!sortConfig || !records.length) return records;

    const sortedData = [...records].sort((a, b) => {
      const column = columns.find((col: DynamicColumn) => col.field === sortConfig.field);
      if (!column) return 0;

      // Handle valueGetter with both signatures
      let aVal: any;
      let bVal: any;
      if (column.valueGetter) {
        try {
          if (column.valueGetter.length === 1) {
            aVal = (column.valueGetter as (row: any) => any)(a);
            bVal = (column.valueGetter as (row: any) => any)(b);
          } else {
            aVal = column.valueGetter({ data: a });
            bVal = column.valueGetter({ data: b });
          }
        } catch (err) {
          aVal = a[sortConfig.field];
          bVal = b[sortConfig.field];
        }
      } else {
        aVal = a[sortConfig.field];
        bVal = b[sortConfig.field];
      }

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

  const handleAction = (action: 'view' | 'edit' | 'delete' | 'certificate') => {
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
      case 'certificate':
        onGenerateCertificate?.(selectedRow);
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

    const tableClassName = autoShrink 
      ? `${className} om-normal-table--autoshrink`.trim()
      : className;

    // Calculate column widths and total fixed width when autoShrink is enabled
    const { columnWidths, totalFixedWidth } = useMemo(() => {
      if (!autoShrink) return { columnWidths: null, totalFixedWidth: 0 };
      const visibleColumns = [...columns];
      if (showActions) {
        visibleColumns.push({ field: '__actions' });
      }
      const result = calculateColumnWidths(visibleColumns, dateFields, recordType);
      // Add checkbox column width at the beginning if needed
      if (showCheckboxes) {
        const checkboxWidth = 44;
        return {
          columnWidths: [{ width: checkboxWidth, minWidth: checkboxWidth }, ...result.widths],
          totalFixedWidth: result.totalFixedWidth + checkboxWidth,
        };
      }
      return {
        columnWidths: result.widths,
        totalFixedWidth: result.totalFixedWidth,
      };
    }, [autoShrink, columns, dateFields, showCheckboxes, showActions, recordType]);

    // Build colgroup element using shared helper
    const colGroupElement = buildNormalColGroup({
      recordType,
      columns,
      autoShrinkEnabled: autoShrink,
      dateFields,
      showCheckboxes,
      showActions,
    });

    return (
      <TableContainer 
        component={Paper} 
        style={{ 
          maxHeight,
        }} 
        className={tableClassName}
        sx={autoShrink && totalFixedWidth > 0 ? {
          minWidth: `${totalFixedWidth}px`,
          overflowX: 'auto', // Allow horizontal scroll on small screens
          overflowY: 'auto', // Allow vertical scroll when content exceeds maxHeight
        } : {
          overflowX: 'auto', // Allow horizontal scroll when autoShrink is OFF
          overflowY: 'auto', // Allow vertical scroll when content exceeds maxHeight
        }}
      >
        <Table 
          stickyHeader 
          size={autoShrink ? 'small' : (layout === 'dense' ? 'small' : 'medium')} 
          sx={autoShrink ? { 
            tableLayout: 'fixed', 
            width: '100%',
            minWidth: totalFixedWidth > 0 ? `${totalFixedWidth}px` : undefined,
            '& .MuiTableCell-root': {
              padding: '6px 10px',
              fontSize: '13px',
              lineHeight: '1.4',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            '& .MuiTableRow-root': {
              height: 'auto',
              minHeight: '32px',
              '& .MuiTableCell-root': {
                lineHeight: '1.4',
              },
            },
            '& .MuiTableCell-head': {
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: '1.4',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            // Date fields: center alignment
            '& .MuiTableCell-root[data-field-type="date"]': {
              textAlign: 'center',
            },
            // Text fields: left alignment (default)
            '& .MuiTableCell-root:not([data-field-type="date"])': {
              textAlign: 'left',
            },
          } : {}}
        >
          {colGroupElement}
        <TableHead>
          <TableRow sx={themeTokens ? { bgcolor: themeTokens.headerBg, color: themeTokens.headerText } : {}}>
            {showCheckboxes && (
              <TableCell 
                padding="checkbox" 
                sx={themeTokens ? { 
                  bgcolor: themeTokens.headerBg, 
                  color: themeTokens.headerText, 
                  borderBottom: `1px solid ${themeTokens.border}`, 
                  fontSize: autoShrink ? '13px' : '16px', 
                  fontWeight: 'bold',
                  padding: autoShrink ? '6px 10px' : undefined,
                } : { 
                  fontSize: autoShrink ? '13px' : '16px', 
                  fontWeight: 'bold' 
                }}
              >
                <Checkbox
                  indeterminate={someSelected && !allSelected}
                  checked={allSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                  size={autoShrink ? 'small' : 'medium'}
                />
              </TableCell>
            )}
            {columns.map((column: DynamicColumn, colIndex) => {
              const widthConfig = autoShrink && columnWidths 
                ? columnWidths[showCheckboxes ? colIndex + 1 : colIndex]
                : null;
              
              // Determine if this is a date field for alignment
              const fieldLower = column.field.toLowerCase();
              const isDateField = dateFields.includes(column.field) || 
                fieldLower.includes('date') || 
                fieldLower.includes('_date');
              
              return (
                <TableCell 
                  key={column.field}
                  data-field-type={isDateField ? 'date' : 'text'}
                  sx={{
                    ...(themeTokens ? { 
                      bgcolor: themeTokens.headerBg, 
                      color: themeTokens.headerText, 
                      borderBottom: `1px solid ${themeTokens.border}`, 
                      fontSize: autoShrink ? '13px' : '16px', 
                      fontWeight: 'bold',
                      padding: autoShrink ? '6px 10px' : undefined,
                      lineHeight: autoShrink ? '1.4' : undefined,
                    } : { 
                      fontSize: autoShrink ? '13px' : '16px', 
                      fontWeight: 'bold',
                      lineHeight: autoShrink ? '1.4' : undefined,
                    }),
                    ...(widthConfig && typeof widthConfig.width === 'number' 
                      ? { width: `${widthConfig.width}px`, minWidth: `${widthConfig.minWidth || widthConfig.width}px` }
                      : widthConfig
                      ? { width: widthConfig.width, minWidth: widthConfig.minWidth ? `${widthConfig.minWidth}px` : undefined }
                      : {}),
                    // Alignment: center for dates, left for text
                    textAlign: isDateField ? 'center' : 'left',
                  }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={sortConfig?.field === column.field}
                      direction={sortConfig?.field === column.field ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort(column.field)}
                      sx={{ fontSize: autoShrink ? '13px' : '16px', fontWeight: 'bold' }}
                    >
                      {column.headerName || column.field}
                    </TableSortLabel>
                  ) : (
                    column.headerName || column.field
                  )}
                </TableCell>
              );
            })}
            {showActions && (
              <TableCell 
                sx={{ 
                  ...(themeTokens ? { 
                    bgcolor: themeTokens.headerBg, 
                    color: themeTokens.headerText, 
                    borderBottom: `1px solid ${themeTokens.border}`, 
                    fontSize: autoShrink ? '13px' : '16px', 
                    fontWeight: 'bold',
                    padding: autoShrink ? '6px 10px' : undefined,
                  } : { 
                    fontSize: autoShrink ? '13px' : '16px', 
                    fontWeight: 'bold' 
                  }),
                  width: autoShrink ? 50 : 60,
                  minWidth: autoShrink ? 50 : 60,
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
            
            // Get completeness severity for this row
            const completeness = highlightIncomplete ? completenessMap.get(rowId) : null;
            const severity = completeness?.severity || 0;
            const missingFields = completeness?.missing || [];
            
            return (
              <Tooltip
                title={highlightIncomplete && severity > 0 ? `Missing: ${missingFields.join(', ')}` : ''}
                arrow
                placement="top"
              >
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
                    // Completeness highlighting
                    ...(highlightIncomplete && severity === 1 ? {
                      backgroundColor: (theme: any) => 
                        theme.palette.mode === 'dark' 
                          ? 'rgba(255, 193, 7, 0.15)' // Yellow tint for dark mode
                          : 'rgba(255, 193, 7, 0.1)', // Yellow tint for light mode
                      '&:hover': {
                        backgroundColor: (theme: any) => 
                          theme.palette.mode === 'dark' 
                            ? 'rgba(255, 193, 7, 0.25)'
                            : 'rgba(255, 193, 7, 0.15)',
                      },
                    } : {}),
                    ...(highlightIncomplete && severity === 2 ? {
                      backgroundColor: (theme: any) => 
                        theme.palette.mode === 'dark' 
                          ? 'rgba(244, 67, 54, 0.15)' // Red tint for dark mode
                          : 'rgba(244, 67, 54, 0.1)', // Red tint for light mode
                      '&:hover': {
                        backgroundColor: (theme: any) => 
                          theme.palette.mode === 'dark' 
                            ? 'rgba(244, 67, 54, 0.25)'
                            : 'rgba(244, 67, 54, 0.15)',
                      },
                    } : {}),
                    ...rowStyleProps,
                  }}
                >
                {showCheckboxes && (
                  <TableCell 
                    padding="checkbox"
                    sx={autoShrink ? { padding: '6px 10px' } : {}}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => onRecordSelect?.(rowId, e.target.checked)}
                      size={autoShrink ? 'small' : 'medium'}
                    />
                  </TableCell>
                )}
                {columns.map((column: DynamicColumn, colIndex) => {
                  const widthConfig = autoShrink && columnWidths 
                    ? columnWidths[showCheckboxes ? colIndex + 1 : colIndex]
                    : null;
                  
                  // Get cell value with proper key matching
                  let cellValue: any;
                  if (column.valueGetter) {
                    // Use valueGetter if provided (this handles field name variations)
                    try {
                      // valueGetter can be either (row) => value or ({ data: row }) => value
                      // Try both signatures for compatibility
                      if (column.valueGetter.length === 1) {
                        // Signature: (row) => value
                        cellValue = (column.valueGetter as (row: any) => any)(row);
                      } else {
                        // Signature: ({ data: row }) => value
                        cellValue = column.valueGetter({ data: row });
                      }
                    } catch (err) {
                      if (import.meta.env.DEV) {
                        console.warn('⚠️ valueGetter error for field:', column.field, err);
                      }
                      cellValue = undefined;
                    }
                  } else {
                    // No valueGetter: try direct field access, then try common variations
                    cellValue = row[column.field];
                    
                    // If not found, try common key variations (snake_case <-> camelCase)
                    if (cellValue === undefined || cellValue === null) {
                      const field = column.field;
                      // Try camelCase if field is snake_case
                      if (field.includes('_')) {
                        const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                        if (row[camelCase] !== undefined && row[camelCase] !== null) {
                          cellValue = row[camelCase];
                        }
                      }
                      // Try snake_case if field is camelCase
                      if ((cellValue === undefined || cellValue === null) && /[A-Z]/.test(field)) {
                        const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
                        if (row[snakeCase] !== undefined && row[snakeCase] !== null) {
                          cellValue = row[snakeCase];
                        }
                      }
                      // Try lowercase version
                      if ((cellValue === undefined || cellValue === null)) {
                        const lowerField = field.toLowerCase();
                        if (row[lowerField] !== undefined && row[lowerField] !== null) {
                          cellValue = row[lowerField];
                        }
                      }
                    }
                  }
                  
                  // DEV-only: Log if cell value is still undefined for first few cells
                  if (import.meta.env.DEV && colIndex < 3 && row === sortedRecords[0]) {
                    if (cellValue === undefined || cellValue === null) {
                      console.warn('⚠️ NORMAL: Cell value undefined for field:', column.field, {
                        rowHasField: column.field in row,
                        rowKeys: Object.keys(row).slice(0, 10),
                        columnField: column.field,
                        hasValueGetter: !!column.valueGetter
                      });
                    }
                  }
                  
                  // Pass cellValue directly to renderCellValue - it handles null/undefined/objects/arrays
                  // Do NOT pre-convert objects/arrays here - let renderCellValue handle it properly
                  let displayValue = column.cellRenderer
                    ? column.cellRenderer(cellValue, row)
                    : renderCellValue(cellValue, column.field, dateFields);
                  
                  // Ensure displayValue is always renderable (prevent React error #300)
                  // STRICT null check only
                  if (displayValue === null || displayValue === undefined) {
                    if (import.meta.env.DEV) {
                      console.warn('⚠️ DEV: displayValue is null/undefined for field:', column.field, {
                        cellValue,
                        rowKeys: Object.keys(row).slice(0, 10),
                        columnField: column.field
                      });
                    }
                    // Fallback to safe string representation (only for null/undefined)
                    displayValue = <Typography variant="body2" color="textSecondary">—</Typography>;
                  }
                  
                  // DEV-only assertion: Check if >80% of cells are showing "—" (blank table)
                  if (import.meta.env.DEV && colIndex === 0 && row === sortedRecords[0]) {
                    // Check first row's first few cells
                    const firstRowCells = columns.slice(0, Math.min(10, columns.length)).map((col: DynamicColumn) => {
                      let val: any;
                      if (col.valueGetter) {
                        try {
                          if (col.valueGetter.length === 1) {
                            val = (col.valueGetter as (row: any) => any)(row);
                          } else {
                            val = col.valueGetter({ data: row });
                          }
                        } catch {
                          val = undefined;
                        }
                      } else {
                        val = row[col.field];
                      }
                      return { field: col.field, value: val };
                    });
                    
                    const blankCount = firstRowCells.filter(cell => 
                      cell.value === null || cell.value === undefined || cell.value === ''
                    ).length;
                    const blankPercentage = (blankCount / firstRowCells.length) * 100;
                    
                    if (blankPercentage > 80 && columns.length > 0 && sortedRecords.length > 0) {
                      console.warn('⚠️ NORMAL: >80% of cells showing blank. Diagnostic:', {
                        blankCount,
                        totalCells: firstRowCells.length,
                        blankPercentage: `${blankPercentage.toFixed(1)}%`,
                        rowKeys: Object.keys(row),
                        columnKeys: columns.map(c => c.field),
                        firstRowCells: firstRowCells.slice(0, 5),
                        sampleRow: row
                      });
                    }
                  }
                  
                  // Get cell text for tooltip (STRICT null check)
                  const cellText = typeof displayValue === 'string' 
                    ? displayValue 
                    : (cellValue === null || cellValue === undefined)
                      ? ''
                      : String(cellValue);
                  // Check if field is a long text field that might be truncated (sponsors, parents, long text)
                  const fieldLower = column.field.toLowerCase();
                  const isLongTextField = fieldLower.includes('location') ||
                    fieldLower.includes('notes') ||
                    fieldLower.includes('address') ||
                    fieldLower.includes('comment') ||
                    fieldLower.includes('description') ||
                    fieldLower.includes('sponsor') ||
                    fieldLower.includes('parent') ||
                    fieldLower.includes('witness');
                  const isTruncated = autoShrink && isLongTextField && cellText && cellText.length > 0;
                  
                  // Determine if this is a date field for alignment
                  const isDateField = dateFields.includes(column.field) || 
                    fieldLower.includes('date') || 
                    fieldLower.includes('_date');
                  
                  const cellContent = (
                    <TableCell
                      key={column.field}
                      data-field-type={isDateField ? 'date' : 'text'}
                      sx={{
                        ...getFieldCellStyle(column.field),
                        ...(widthConfig && typeof widthConfig.width === 'number' 
                          ? { width: `${widthConfig.width}px`, minWidth: `${widthConfig.minWidth || widthConfig.width}px` }
                          : widthConfig
                          ? { width: widthConfig.width, minWidth: widthConfig.minWidth ? `${widthConfig.minWidth}px` : undefined }
                          : {}),
                        // Alignment: center for dates, left for text
                        textAlign: isDateField ? 'center' : 'left',
                      }}
                      title={isTruncated ? cellText : undefined}
                    >
                      {displayValue}
                    </TableCell>
                  );

                  // Wrap in Tooltip if truncated (for better UX)
                  if (isTruncated && cellText) {
                    return (
                      <Tooltip key={column.field} title={cellText} arrow placement="top">
                        {cellContent}
                      </Tooltip>
                    );
                  }
                  
                  return cellContent;
                })}
                {showActions && (
                  <TableCell 
                    sx={{ 
                      width: autoShrink ? 72 : 60,
                      minWidth: autoShrink ? 72 : 60,
                      position: 'sticky',
                      right: 0,
                      backgroundColor: isNew ? '#e8f5e9' : (themeTokens ? (index % 2 === 0 ? themeTokens.rowEvenBg : themeTokens.rowOddBg) : 'background.paper'),
                      zIndex: 5,
                      padding: autoShrink ? '6px 10px' : undefined,
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
              </Tooltip>
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
          ...(autoShrink ? {
          } : {}),
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
        {onGenerateCertificate ? (
          <MenuItem onClick={() => handleAction('certificate')}>
            <ListItemIcon>
              <CertificateIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Generate Certificate</ListItemText>
          </MenuItem>
        ) : null}
        {!onView && !onEdit && !onDelete && !onGenerateCertificate && (
          <MenuItem disabled>
            <ListItemText>No actions available</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default DynamicRecordsDisplay;
