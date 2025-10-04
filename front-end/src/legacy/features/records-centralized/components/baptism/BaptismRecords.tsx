/**
 * Baptism Records Implementation
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
  Tabs,
  Tab,
  CircularProgress,
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
interface BaptismRecordsProps {
  churchId: string;
  PDFDocument?: any;
  ReadOnlyView?: React.ComponentType;
}

export function BaptismRecords({
  churchId,
  PDFDocument,
  ReadOnlyView,
}: BaptismRecordsProps) {
  const tableName = 'baptism_records';
  const [activeTab, setActiveTab] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<any[]>([]);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Get table configuration
  const {
    config: tableConfig,
    loading: tableConfigLoading,
  } = useRecordTableConfig(parseInt(churchId), tableName, 'default');

  // Get AG Grid configuration
  const {
    config: agGridConfig,
    loading: agGridConfigLoading,
  } = useAgGridConfig(parseInt(churchId), tableName, 'default');

  // Get searchable fields
  const {
    fields: searchableFields,
    loading: searchableFieldsLoading,
  } = useSearchableFields(parseInt(churchId), tableName);

  // Get sortable fields
  const {
    fields: sortableFields,
    loading: sortableFieldsLoading,
  } = useSortableFields(parseInt(churchId), tableName);

  // Event handlers
  const handleBulkOperationComplete = (result: any) => {
    console.log('Bulk operation completed:', result);
    setSelectedRecords([]);
  };

  const handleSearchResults = (results: any[], total: number) => {
    console.log('Search results:', results, total);
  };

  const handleSearchChange = (filters: any) => {
    console.log('Search filters changed:', filters);
  };

  const handleAuditLogChange = (auditLog: any) => {
    console.log('Audit log changed:', auditLog);
  };

  const handleLockToggle = () => {
    setIsLocked(!isLocked);
  };

  // Loading state
  if (tableConfigLoading || agGridConfigLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading baptism records configuration...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Baptism Records
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

      {/* Main Content */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label="Records" />
          <Tab label="Advanced Search" />
          <Tab label="Audit Trail" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={isLocked}
            >
              Add Record
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              disabled={isLocked}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
            >
              Refresh
            </Button>
            {selectedRecords.length > 0 && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<SettingsIcon />}
                onClick={() => setShowBulkOperations(true)}
              >
                Bulk Operations ({selectedRecords.length})
              </Button>
            )}
          </Box>

          {/* Modern Dynamic Records Manager */}
          <ModernDynamicRecordsManager
            churchId={parseInt(churchId)}
            tableName={tableName}
            onSelectionChange={setSelectedRecords}
            disabled={isLocked}
          />
        </Box>
      )}

      {activeTab === 1 && (
        <AdvancedSearch
          churchId={parseInt(churchId)}
          tableName={tableName}
          onSearchResults={handleSearchResults}
          onSearchChange={handleSearchChange}
        />
      )}

      {activeTab === 2 && (
        <AuditTrail
          churchId={parseInt(churchId)}
          tableName={tableName}
          onAuditLogChange={handleAuditLogChange}
        />
      )}

      {/* Bulk Operations Dialog */}
      <BulkOperations
        churchId={parseInt(churchId)}
        tableName={tableName}
        selectedRecords={selectedRecords}
        onSelectionChange={setSelectedRecords}
        onOperationComplete={handleBulkOperationComplete}
        open={showBulkOperations}
        onClose={() => setShowBulkOperations(false)}
      />
    </Box>
  );
}

export default BaptismRecords;
