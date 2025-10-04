/**
 * Unified Record Manager Component
 * Demonstrates how to use all the new shared components together
 * This replaces the existing RecordManager with a more maintainable approach
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Divider,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Import unified components
import {
  RecordsTable,
  RecordsSearch,
  RecordsModal,
  useRecords,
  useRecordSearch,
  useRecordMutations,
  useRecordImportExport,
  useSearchState,
  usePagination,
  useLoadingState,
} from './useUnifiedRecords';

import { UnifiedRecordForm } from '@/features/records-centralized/shared/ui/legacy/forms/UnifiedRecordForm';
import { FIELD_DEFINITIONS, RECORD_TYPES, THEME_COLORS } from '@/constants';

// Types
interface UnifiedRecordManagerProps {
  recordType: string;
  churchId: string;
  PDFDocument?: any;
  ReadOnlyView?: React.ComponentType;
}

export function UnifiedRecordManager({
  recordType,
  churchId,
  PDFDocument,
  ReadOnlyView,
}: UnifiedRecordManagerProps) {
  // Validate record type
  if (!Object.values(RECORD_TYPES).includes(recordType)) {
    console.error(`Invalid record type: ${recordType}`);
    return <Alert severity="error">Invalid record type: {recordType}</Alert>;
  }

  // Get field definitions and theme
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  const themeColors = THEME_COLORS[recordType] || THEME_COLORS[RECORD_TYPES.BAPTISM];

  // State management
  const searchState = useSearchState();
  const pagination = usePagination(1, 10);
  const loadingState = useLoadingState();
  
  // UI state
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  // Data fetching
  const {
    records,
    total,
    page,
    totalPages,
    isLoading,
    error,
    refetch,
  } = useRecords(churchId, recordType, {
    filters: searchState.filters,
    sort: searchState.sort,
    pagination: { page: pagination.page, limit: pagination.limit },
  });

  // Search functionality
  const {
    results: searchResults,
    total: searchTotal,
    isLoading: isSearching,
    error: searchError,
  } = useRecordSearch(churchId, recordType, searchState.searchTerm, {
    filters: searchState.filters,
    sort: searchState.sort,
    pagination: { page: pagination.page, limit: pagination.limit },
    enabled: !!searchState.searchTerm.trim(),
  });

  // Mutations
  const { create, update, delete: deleteRecord } = useRecordMutations(churchId, recordType);
  const { import: importMutation, export: exportMutation } = useRecordImportExport(churchId, recordType);

  // Table columns configuration
  const columns = useMemo(() => {
    const tableColumns = fieldDefs.tableColumns || [];
    
    return tableColumns.map(column => ({
      key: column.field,
      label: column.headerName || column.field,
      width: column.width || 'auto',
      sortable: true,
      render: (value: any, record: any) => {
        if (column.cellRenderer === 'dateRenderer') {
          return formatDate(value);
        }
        if (column.valueGetter) {
          return column.valueGetter({ data: record });
        }
        return value || 'N/A';
      },
    }));
  }, [fieldDefs.tableColumns]);

  // Search filters configuration
  const searchFilters = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' },
      ],
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'daterange' as const,
    },
    {
      key: 'clergy',
      label: 'Clergy',
      type: 'multiselect' as const,
      options: [], // Would be populated from dropdown options
    },
  ], []);

  // Event handlers
  const handleSearch = () => {
    refetch();
  };

  const handleClear = () => {
    searchState.reset();
    refetch();
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    searchState.updateSort({ field, direction });
  };

  const handleRecordAction = (action: string, record: any) => {
    switch (action) {
      case 'view':
        setSelectedRecord(record);
        setShowForm(true);
        break;
      case 'edit':
        setSelectedRecord(record);
        setShowForm(true);
        break;
      case 'delete':
        handleDeleteRecord(record);
        break;
      default:
        console.log(`Action ${action} not implemented`);
    }
  };

  const handleDeleteRecord = async (record: any) => {
    if (window.confirm(`Are you sure you want to delete this record?`)) {
      try {
        await deleteRecord.mutateAsync(record.id || record._id);
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleFormSuccess = (record: any) => {
    setShowForm(false);
    setSelectedRecord(null);
    refetch();
  };

  const handleFormError = (error: string) => {
    console.error('Form error:', error);
  };

  const handleImport = async (file: File) => {
    try {
      await importMutation.mutateAsync({ file });
      setShowImport(false);
      refetch();
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const result = await exportMutation.mutateAsync({ 
        format, 
        filters: searchState.filters 
      });
      
      if (result.success && result.data) {
        // Create download link
        const url = window.URL.createObjectURL(result.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${recordType}-export.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleLockToggle = () => {
    setIsLocked(!isLocked);
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Use search results if searching, otherwise use regular records
  const displayRecords = searchState.searchTerm.trim() ? searchResults : records;
  const displayTotal = searchState.searchTerm.trim() ? searchTotal : total;

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading {recordType} records...</Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading records: {error}
        <Button onClick={() => refetch()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: themeColors.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            background: themeColors.header || 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              {fieldDefs.displayName || recordType} Records
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={isLocked ? 'Locked' : 'Unlocked'}
                color={isLocked ? 'error' : 'success'}
                icon={isLocked ? <LockIcon /> : <LockOpenIcon />}
              />
              
              <Tooltip title="Toggle Lock">
                <IconButton onClick={handleLockToggle}>
                  {isLocked ? <LockIcon /> : <LockOpenIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowForm(true)}
              disabled={isLocked}
            >
              Add Record
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setShowImport(true)}
              disabled={isLocked}
            >
              Import
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ p: 3, pb: 0 }}>
          <RecordsSearch
            searchTerm={searchState.searchTerm}
            onSearchChange={searchState.updateSearchTerm}
            onSearch={handleSearch}
            onClear={handleClear}
            filters={searchFilters}
            activeFilters={searchState.filters}
            onFilterChange={searchState.updateFilters}
            onClearFilters={searchState.clearFilters}
            loading={isSearching}
            resultsCount={displayTotal}
            showFilters={true}
            showResultsCount={true}
            searchPlaceholder={`Search ${recordType} records...`}
          />
        </Box>

        {/* Records Table */}
        <Box sx={{ p: 3, pt: 0 }}>
          <RecordsTable
            records={displayRecords}
            columns={columns}
            loading={isLoading}
            error={searchError}
            selectedRecords={selectedRecords}
            onRecordSelect={(recordId, selected) => {
              setSelectedRecords(prev => 
                selected 
                  ? [...prev, recordId]
                  : prev.filter(id => id !== recordId)
              );
            }}
            onSelectAll={(selected) => {
              if (selected) {
                setSelectedRecords(displayRecords.map(record => record.id || record._id));
              } else {
                setSelectedRecords([]);
              }
            }}
            onRecordAction={handleRecordAction}
            onSort={handleSort}
            sortField={searchState.sort?.field}
            sortDirection={searchState.sort?.direction}
            showCheckboxes={!isLocked}
            showActions={!isLocked}
            emptyMessage={`No ${recordType} records found`}
          />
        </Box>

        {/* Pagination */}
        <Box sx={{ p: 3, pt: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {displayRecords.length} of {displayTotal} records
            (Page {page} of {totalPages})
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={pagination.prevPage}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={pagination.nextPage}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Form Modal */}
      <UnifiedRecordForm
        recordType={recordType}
        churchId={churchId}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedRecord(null);
        }}
        currentRecord={selectedRecord}
        onSuccess={handleFormSuccess}
        onError={handleFormError}
      />

      {/* Import Modal */}
      <RecordsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title={`Import ${recordType} Records`}
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Select a file to import {recordType} records.
          </Typography>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </Box>
      </RecordsModal>
    </Box>
  );
}

export default UnifiedRecordManager;
