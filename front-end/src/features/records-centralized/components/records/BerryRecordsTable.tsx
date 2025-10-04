/**
 * Orthodox Metrics - Berry Records Table Component
 * Berry template specific implementation of the Records Table
 */

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { 
  Card, 
  CardContent, 
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
  Box,
  Typography,
  Skeleton,
  Alert,
  Pagination,
  TextField,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@tabler/icons-react';
import { BaseRecordsTable, BaseRecordsTableProps, BaseRecordsTableRef } from '@/base/BaseRecordsTable';
import { RecordData, UnifiedTableSchema } from '@/core/types/RecordsTypes';

export interface BerryRecordsTableProps extends BaseRecordsTableProps {
  // Berry-specific props
  elevation?: number;
  variant?: 'elevation' | 'outlined';
  showCard?: boolean;
  cardTitle?: string;
  cardActions?: React.ReactNode;
}

export interface BerryRecordsTableRef extends BaseRecordsTableRef {}

const BerryRecordsTable = forwardRef<BerryRecordsTableRef, BerryRecordsTableProps>(({
  // Data
  data,
  schema,
  loading = false,
  error = null,
  
  // Configuration
  churchId,
  tableName,
  configName = 'default',
  
  // Pagination
  pagination,
  
  // Filters and sorting
  filters,
  onFiltersChange,
  onSortChange,
  onPaginationChange,
  
  // Actions
  onRecordSelect,
  onRecordEdit,
  onRecordDelete,
  onRecordCreate,
  onRecordView,
  onRecordDuplicate,
  
  // Bulk actions
  onBulkDelete,
  onBulkExport,
  onBulkUpdate,
  
  // Selection
  selectedRecords = [],
  onSelectionChange,
  
  // Customization
  className,
  style,
  height,
  width,
  
  // Features
  enableSelection = true,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableSearch = true,
  enableExport = true,
  enableBulkActions = true,
  enableInlineEdit = false,
  enableRowActions = true,
  
  // Custom renderers
  renderCell,
  renderActions,
  renderHeader,
  renderEmpty,
  renderLoading,
  renderError,
  
  // Event handlers
  onRowClick,
  onRowDoubleClick,
  onCellClick,
  onCellEdit,
  
  // Accessibility
  ariaLabel,
  ariaLabelledBy,
  role,
  
  // Performance
  virtualScrolling = false,
  rowHeight = 56,
  overscan = 10,
  
  // Berry-specific props
  elevation = 1,
  variant = 'elevation',
  showCard = true,
  cardTitle,
  cardActions,
  
  ...props
}, ref) => {
  const [searchValue, setSearchValue] = useState(filters?.search || '');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refresh: () => {
      setIsRefreshing(true);
      // Simulate refresh
      setTimeout(() => setIsRefreshing(false), 1000);
    },
    clearSelection: () => {
      onSelectionChange?.([]);
    },
    selectAll: () => {
      onSelectionChange?.(data || []);
    },
    getSelectedRecords: () => selectedRecords,
    scrollToRow: (index: number) => {
      // Implementation for scrolling to specific row
      console.log('Scroll to row:', index);
    },
    scrollToTop: () => {
      tableRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    scrollToBottom: () => {
      tableRef.current?.scrollTo({ top: tableRef.current.scrollHeight, behavior: 'smooth' });
    },
    isRefreshing,
    selectedCount: selectedRecords.length,
    totalCount: data?.length || 0
  }));
  
  // Handle search
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    onFiltersChange?.({ ...filters, search: value });
  };
  
  // Handle sort
  const handleSort = (field: string) => {
    if (!enableSorting) return;
    
    const currentSort = filters?.sort;
    const newDirection = currentSort?.field === field && currentSort?.direction === 'asc' ? 'desc' : 'asc';
    onSortChange?.({ field, direction: newDirection });
  };
  
  // Handle selection
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(data || []);
    } else {
      onSelectionChange?.([]);
    }
  };
  
  const handleSelectRow = (record: RecordData, event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.([...selectedRecords, record]);
    } else {
      onSelectionChange?.(selectedRecords.filter(r => r.id !== record.id));
    }
  };
  
  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'delete':
        onBulkDelete?.(selectedRecords);
        break;
      case 'export':
        onBulkExport?.(selectedRecords);
        break;
      default:
        break;
    }
    setBulkMenuAnchor(null);
  };
  
  // Render loading state
  const renderLoadingState = () => {
    if (renderLoading) return renderLoading();
    
    return (
      <Card elevation={elevation} variant={variant}>
        <CardContent>
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={56} sx={{ mb: 1 }} />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  // Render error state
  const renderErrorState = () => {
    if (renderError) return renderError(error || 'Unknown error');
    
    return (
      <Card elevation={elevation} variant={variant}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'An error occurred while loading records'}
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => {
    if (renderEmpty) return renderEmpty();
    
    return (
      <Card elevation={elevation} variant={variant}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No records found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {searchValue ? 'Try adjusting your search criteria' : 'No records available for this table'}
            </Typography>
            {onRecordCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onRecordCreate}
              >
                Create First Record
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  // Render search bar
  const renderSearchBar = () => {
    if (!enableSearch) return null;
    
    return (
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search records..."
          value={searchValue}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchValue && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchValue('');
                    onFiltersChange?.({ ...filters, search: '' });
                  }}
                >
                  ×
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>
    );
  };
  
  // Render filters
  const renderFilters = () => {
    if (!enableFiltering) return null;
    
    return (
      <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          Filters
        </Button>
        {searchValue && (
          <Chip
            label={`Search: ${searchValue}`}
            onDelete={() => {
              setSearchValue('');
              onFiltersChange?.({ ...filters, search: '' });
            }}
          />
        )}
      </Box>
    );
  };
  
  // Render actions
  const renderActions = () => {
    return (
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {cardTitle || `${schema?.displayName || 'Records'} (${data?.length || 0})`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onRecordCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onRecordCreate}
            >
              Add Record
            </Button>
          )}
          <IconButton onClick={() => window.location.reload()}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };
  
  // Render bulk actions
  const renderBulkActions = () => {
    if (!enableBulkActions || selectedRecords.length === 0) return null;
    
    return (
      <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            {selectedRecords.length} record(s) selected
          </Typography>
          <Button
            size="small"
            onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
          >
            Bulk Actions
          </Button>
          <Button
            size="small"
            onClick={() => onSelectionChange?.([])}
          >
            Clear Selection
          </Button>
        </Box>
      </Box>
    );
  };
  
  // Render table
  const renderTable = () => {
    const visibleFields = schema?.fields.filter(field => !field.is_hidden) || [];
    
    return (
      <TableContainer component={Paper} elevation={0} ref={tableRef}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {enableSelection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRecords.length > 0 && selectedRecords.length < (data?.length || 0)}
                    checked={data && selectedRecords.length === data.length}
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
                    minWidth: field.column_width || 120
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {renderHeader ? renderHeader(field.column_name, schema!) : field.display_name}
                    {enableSorting && (
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ fontSize: '0.75rem', lineHeight: 0.5 }}>▲</Box>
                        <Box sx={{ fontSize: '0.75rem', lineHeight: 0.5 }}>▼</Box>
                      </Box>
                    )}
                  </Box>
                </TableCell>
              ))}
              {enableRowActions && (
                <TableCell align="right">Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((record, index) => (
              <TableRow
                key={record.id}
                hover
                onClick={(e) => onRowClick?.(record, e)}
                onDoubleClick={(e) => onRowDoubleClick?.(record, e)}
                sx={{ cursor: 'pointer' }}
              >
                {enableSelection && (
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
                    onClick={(e) => onCellClick?.(record[field.column_name], record, field.column_name, e)}
                  >
                    {renderCell ? renderCell(record[field.column_name], record, field.column_name) : (
                      <Typography variant="body2">
                        {record[field.column_name] || '—'}
                      </Typography>
                    )}
                  </TableCell>
                ))}
                {enableRowActions && (
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {onRecordView && (
                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordView(record);
                            }}
                          >
                            <ViewIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onRecordEdit && (
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordEdit(record);
                            }}
                          >
                            <EditIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onRecordDelete && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordDelete(record);
                            }}
                          >
                            <DeleteIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  // Render pagination
  const renderPagination = () => {
    if (!enablePagination || !pagination) return null;
    
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={(_, page) => onPaginationChange?.(page, pagination.limit)}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>
    );
  };
  
  // Main render
  if (loading) return renderLoadingState();
  if (error) return renderErrorState();
  if (!data || data.length === 0) return renderEmptyState();
  
  const content = (
    <Box className={className} style={style}>
      {renderSearchBar()}
      {renderFilters()}
      {renderActions()}
      {renderBulkActions()}
      {renderTable()}
      {renderPagination()}
    </Box>
  );
  
  if (showCard) {
    return (
      <Card elevation={elevation} variant={variant}>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }
  
  return content;
});

BerryRecordsTable.displayName = 'BerryRecordsTable';

export default BerryRecordsTable;
export type { BerryRecordsTableProps, BerryRecordsTableRef };
