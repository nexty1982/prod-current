/**
 * Marriage Records Implementation
 * Uses unified components for consistent UX and maintainability
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  History as HistoryIcon,
  PictureAsPdf as PdfIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';

// Import unified components
import {
  ModernDynamicRecordsManager,
  ModernDynamicRecordsTable,
  ModernDynamicRecordForm,
  BulkOperations,
  AdvancedSearch,
  AuditTrail,
  useUnifiedRecords,
  useUnifiedRecordMutations,
  useRecordTableConfig,
  useAgGridConfig,
  useSearchableFields,
  useSortableFields,
} from '@/../features/records/records/useUnifiedRecords';

import { UnifiedRecordForm } from '@/features/records-centralized/shared/ui/legacy/forms/UnifiedRecordForm';
import { RECORD_TYPES, FIELD_DEFINITIONS, THEME_COLORS } from '@/constants';

// Types
interface MarriageRecordsProps {
  churchId: string;
  PDFDocument?: any;
  ReadOnlyView?: React.ComponentType;
}

export function MarriageRecords({
  churchId,
  PDFDocument,
  ReadOnlyView,
}: MarriageRecordsProps) {
  const recordType = RECORD_TYPES.MARRIAGE;
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  const themeColors = THEME_COLORS[recordType];

  // State management
  const searchState = useSearchState();
  const pagination = usePagination(1, 10);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  // Mutations
  const { create, update, delete: deleteRecord } = useRecordMutations(churchId, recordType);
  const { import: importMutation, export: exportMutation } = useRecordImportExport(churchId, recordType);

  // Dropdown options
  const { options: dropdownOptions } = useDropdownOptions(churchId);

  // Table columns configuration
  const columns = useMemo(() => {
    return fieldDefs.tableColumns.map(column => ({
      key: column.field,
      label: column.headerName,
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
      key: 'startDate',
      label: 'Start Date',
      type: 'date' as const,
    },
    {
      key: 'endDate',
      label: 'End Date',
      type: 'date' as const,
    },
    {
      key: 'clergy',
      label: 'Clergy',
      type: 'select' as const,
      options: dropdownOptions.clergy?.map((clergy: any) => ({
        value: clergy.id,
        label: clergy.name
      })) || [],
    },
  ], [dropdownOptions]);

  // Actions configuration
  const actions = useMemo(() => [
    {
      key: 'view',
      label: 'View',
      icon: <span>👁️</span>,
      color: 'primary' as const,
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <span>✏️</span>,
      color: 'primary' as const,
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <span>🗑️</span>,
      color: 'error' as const,
    },
    {
      key: 'history',
      label: 'History',
      icon: <HistoryIcon fontSize="small" />,
      color: 'info' as const,
    },
    {
      key: 'certificate',
      label: 'Certificate',
      icon: <PdfIcon fontSize="small" />,
      color: 'secondary' as const,
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
      case 'history':
        setSelectedRecord(record);
        setShowHistory(true);
        break;
      case 'certificate':
        handleGenerateCertificate(record);
        break;
    }
  };

  const handleDeleteRecord = async (record: any) => {
    if (window.confirm(`Are you sure you want to delete the marriage record for ${fieldDefs.displayName(record)}?`)) {
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
        link.download = `marriage-records-export.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleGenerateCertificate = (record: any) => {
    // Implement certificate generation
    console.log('Generating marriage certificate for:', record);
    // This would integrate with the existing PDF generation system
  };

  const handleLockToggle = () => {
    setIsLocked(!isLocked);
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading marriage records...</Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading marriage records: {error}
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
        background: themeColors.gradient,
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
            background: themeColors.header,
            borderBottom: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FavoriteIcon sx={{ color: 'white', fontSize: 32 }} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'white' }}>
                Marriage Records
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={isLocked ? 'Locked' : 'Unlocked'}
                color={isLocked ? 'error' : 'success'}
                icon={isLocked ? <LockIcon /> : <LockOpenIcon />}
                sx={{ color: 'white' }}
              />
              
              <Tooltip title="Toggle Lock">
                <IconButton onClick={handleLockToggle} sx={{ color: 'white' }}>
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
              sx={{
                background: themeColors.addButton,
                '&:hover': { background: themeColors.addButton, opacity: 0.9 }
              }}
            >
              Add Marriage Record
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setShowImport(true)}
              disabled={isLocked}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Import
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('csv')}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Export CSV
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              sx={{ color: 'white', borderColor: 'white' }}
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
            loading={isLoading}
            resultsCount={total}
            showFilters={true}
            showResultsCount={true}
            searchPlaceholder="Search marriage records..."
          />
        </Box>

        {/* Records Table */}
        <Box sx={{ p: 3, pt: 0 }}>
          <RecordsTable
            records={records}
            columns={columns}
            loading={isLoading}
            error={error}
            onRecordAction={handleRecordAction}
            onSort={handleSort}
            sortField={searchState.sort?.field}
            sortDirection={searchState.sort?.direction}
            actions={actions}
            showCheckboxes={!isLocked}
            showActions={!isLocked}
            emptyMessage="No marriage records found"
          />
        </Box>

        {/* Pagination */}
        <Box sx={{ p: 3, pt: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {records.length} of {total} records
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
        title="Import Marriage Records"
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Select a file to import marriage records. Supported formats: CSV, Excel.
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

      {/* History Modal */}
      <RecordsModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="Record History"
        maxWidth="md"
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body1">
            History for: {selectedRecord ? fieldDefs.displayName(selectedRecord) : 'Unknown'}
          </Typography>
          {/* History content would go here */}
        </Box>
      </RecordsModal>
    </Box>
  );
}

export default MarriageRecords;
