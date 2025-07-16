/**
 * OCR Multi-Record Mapper Component
 * Main component for correcting OCR results containing multiple structured records
 * Designed for Orthodox church death logs and similar documents
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  AutoFixHigh as AutoFixHighIcon,
  Visibility as PreviewIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Import our components and utilities
import { EditableRecordRow } from './EditableRecordRow';
import { OcrTextBlockList } from './OcrTextBlockList';
import { useMappingState, DeathRecord, MappingStateManager } from './MappingState';
import { OcrRowSplitter, generateMockOcrData, RecordSegment } from './utils/ocrRowSplitter';

interface OcrMultiRecordMapperProps {
  ocrData?: any; // OCR data from backend
  onSubmit: (correctedRecords: any) => void;
  onCancel?: () => void;
  churchId: string;
  className?: string;
}

export const OcrMultiRecordMapper: React.FC<OcrMultiRecordMapperProps> = ({
  ocrData,
  onSubmit,
  onCancel,
  churchId,
  className = ''
}) => {
  // Initialize OCR lines (use mock data if no real data provided)
  const ocrLines = useMemo(() => {
    if (ocrData?.ocrLines) {
      return ocrData.ocrLines;
    }
    // Use mock data for development/testing
    return generateMockOcrData();
  }, [ocrData]);

  // Initialize mapping state
  const [mappingState, mappingActions] = useMappingState(ocrLines);
  
  // Component state
  const [autoSplitComplete, setAutoSplitComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [lockedRecords, setLockedRecords] = useState<Set<string>>(new Set());
  const [collapsedRecords, setCollapsedRecords] = useState<Set<string>>(new Set());
  const [completedRecordsCount, setCompletedRecordsCount] = useState(0);
  
  // Auto-split records on initialization
  useEffect(() => {
    if (!autoSplitComplete && ocrLines.length > 0) {
      performAutoSplit();
      setAutoSplitComplete(true);
    }
  }, [ocrLines, autoSplitComplete]);

  // Create mappings lookup for OCR text block list
  const currentMappings = useMemo(() => {
    const mappings = new Map<number, { recordIndex: number; fieldName: string }>();
    
    mappingState.records.forEach((record, recordIndex) => {
      (['death_date', 'burial_date', 'name', 'age', 'priest_officiated', 'burial_location'] as const).forEach(fieldName => {
        const field = record[fieldName];
        if (field?.sourceLine !== undefined && field.sourceLine >= 0) {
          mappings.set(field.sourceLine, { recordIndex, fieldName });
        }
      });
    });
    
    return mappings;
  }, [mappingState.records]);

  // Auto-split OCR text into record segments
  const performAutoSplit = useCallback(() => {
    console.log('Performing auto-split on', ocrLines.length, 'OCR lines');
    
    const segments = OcrRowSplitter.splitIntoRecords(ocrLines);
    console.log('Found', segments.length, 'record segments:', segments);
    
    if (segments.length > 1) {
      // Clear existing records and create new ones based on segments
      const newRecords = segments.map(() => MappingStateManager.createEmptyRecord());
      
      // Apply suggestions for each segment
      segments.forEach((segment, recordIndex) => {
        const suggestions = OcrRowSplitter.suggestFieldMappings(segment);
        console.log(`Suggestions for record ${recordIndex}:`, suggestions);
        
        // Apply the most confident suggestions
        Object.entries(suggestions).forEach(([fieldName, lineIndices]) => {
          if (lineIndices.length > 0) {
            // Use the first suggested line for each field
            const lineIndex = lineIndices[0];
            mappingActions.mapLineToField(newRecords[recordIndex].id, fieldName as keyof DeathRecord, lineIndex);
          }
        });
      });
      
      setSnackbarMessage(`Auto-split detected ${segments.length} records with smart field mapping applied!`);
    } else {
      setSnackbarMessage('Auto-split completed - treating as single record');
    }
  }, [ocrLines, mappingActions]);

  // Handle line selection from OCR text block list
  const handleLineSelect = useCallback((lineIndex: number, recordIndex: number, fieldName: string) => {
    if (recordIndex < mappingState.records.length) {
      const record = mappingState.records[recordIndex];
      // Don't allow assignment to locked records
      if (lockedRecords.has(record.id)) {
        setSnackbarMessage(`Cannot assign to locked record ${recordIndex + 1}`);
        return;
      }
      
      mappingActions.mapLineToField(record.id, fieldName as keyof DeathRecord, lineIndex);
      setSnackbarMessage(`Mapped "${ocrLines[lineIndex]?.text}" to ${fieldName} in Record ${recordIndex + 1}`);
    }
  }, [mappingState.records, mappingActions, ocrLines, lockedRecords]);

  // Handle reset of OCR text blocks
  const handleResetOcrBlocks = useCallback(() => {
    // Clear all mappings
    mappingState.records.forEach(record => {
      (['death_date', 'burial_date', 'name', 'age', 'priest_officiated', 'burial_location'] as const).forEach(fieldName => {
        mappingActions.clearFieldMapping(record.id, fieldName);
      });
    });
    setSnackbarMessage('All OCR text block assignments have been reset');
  }, [mappingState.records, mappingActions]);

  // Handle lock/unlock record
  const handleToggleLock = useCallback((recordId: string) => {
    setLockedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
        // Auto-collapse when locking
        setCollapsedRecords(prevCollapsed => new Set(prevCollapsed).add(recordId));
      }
      return newSet;
    });
  }, []);

  // Handle collapse/expand record
  const handleToggleCollapse = useCallback((recordId: string) => {
    setCollapsedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  // Update completed records count when records change
  useEffect(() => {
    const completed = mappingState.records.filter(record => {
      const validation = MappingStateManager.validateRecord(record);
      const completeness = MappingStateManager.getRecordCompleteness(record);
      return validation.isValid && completeness >= 50;
    }).length;
    setCompletedRecordsCount(completed);
  }, [mappingState.records]);

  // Handle field updates
  const handleFieldUpdate = useCallback((recordId: string, fieldName: keyof DeathRecord, value: string) => {
    // Don't allow updates to locked records
    if (lockedRecords.has(recordId)) {
      setSnackbarMessage('Cannot edit locked record');
      return;
    }
    mappingActions.updateFieldValue(recordId, fieldName, value);
  }, [mappingActions, lockedRecords]);

  // Handle field mapping clear
  const handleClearFieldMapping = useCallback((recordId: string, fieldName: keyof DeathRecord) => {
    mappingActions.clearFieldMapping(recordId, fieldName);
    setSnackbarMessage(`Cleared mapping for ${fieldName}`);
  }, [mappingActions]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (mappingState.records.length === 0) return 0;
    
    const totalCompleteness = mappingState.records.reduce((sum, record) => {
      return sum + MappingStateManager.getRecordCompleteness(record);
    }, 0);
    
    return Math.round(totalCompleteness / mappingState.records.length);
  }, [mappingState.records]);

  // Validate all records
  const validationSummary = useMemo(() => {
    const validRecords = mappingState.records.filter(record => 
      MappingStateManager.validateRecord(record).isValid
    ).length;
    
    return {
      valid: validRecords,
      total: mappingState.records.length,
      allValid: validRecords === mappingState.records.length
    };
  }, [mappingState.records]);

  // Handle submission
  const handleSubmit = async () => {
    if (!validationSummary.allValid) {
      setSnackbarMessage('Please complete all required fields before submitting');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const exportData = mappingActions.exportForSubmission();
      console.log('Submitting corrected records:', exportData);
      
      // Call the submission API
      const response = await fetch('/api/ocr/submit-corrected-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchId,
          ...exportData
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSnackbarMessage('Records submitted successfully!');
        onSubmit(result);
      } else {
        throw new Error(`Submission failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSnackbarMessage('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box className={`ocr-multi-record-mapper ${className}`} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              OCR Multi-Record Mapper
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Correct and organize OCR results for multiple structured records
            </Typography>
          </Box>
          
          {onCancel && (
            <IconButton onClick={onCancel} color="default">
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* Progress Overview */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Overall Progress:</Typography>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{ width: 100, height: 8, borderRadius: 4 }}
              color={overallProgress >= 80 ? 'success' : overallProgress >= 50 ? 'warning' : 'error'}
            />
            <Typography variant="body2" fontWeight="medium">{overallProgress}%</Typography>
          </Box>
          
          <Chip 
            label={`${mappingState.records.length} Records`}
            color="primary"
            variant="outlined"
          />
          
          <Chip 
            label={`${mappingState.usedLines.size} / ${ocrLines.length} Lines Mapped`}
            color="info"
            variant="outlined"
          />
          
          <Chip 
            label={`${validationSummary.valid} / ${validationSummary.total} Valid`}
            color={validationSummary.allValid ? 'success' : 'warning'}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Records */}
        <Box sx={{ 
          flex: 1, 
          p: 3, 
          overflowY: 'auto',
          borderRight: '1px solid #e0e0e0'
        }}>
        {/* Record Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Funeral Records ({mappingState.records.length})
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AutoFixHighIcon />}
                onClick={performAutoSplit}
                disabled={isSubmitting}
              >
                Auto-Split
              </Button>
              
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={mappingActions.addRecord}
                disabled={isSubmitting}
              >
                Add Record
              </Button>
            </Box>
          </Box>

          {/* Progress Summary */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip 
              label={`${completedRecordsCount} / ${mappingState.records.length} Completed`}
              color={completedRecordsCount === mappingState.records.length ? 'success' : 'warning'}
              variant="outlined"
            />
            <Chip 
              label={`${lockedRecords.size} Locked`}
              color="success"
              variant="outlined"
            />
            <Chip 
              label={`${collapsedRecords.size} Collapsed`}
              color="info"
              variant="outlined"
            />
          </Box>
        </Box>

          {/* Records List */}
          {mappingState.records.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No records yet. Click "Add Record" to start.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            mappingState.records.map((record, index) => (
              <EditableRecordRow
                key={record.id}
                record={record}
                recordIndex={index}
                onUpdateField={(fieldName, value) => handleFieldUpdate(record.id, fieldName, value)}
                onDeleteRecord={() => mappingActions.removeRecord(record.id)}
                onClearFieldMapping={(fieldName) => handleClearFieldMapping(record.id, fieldName)}
                fieldSuggestions={mappingState.fieldSuggestions}
                onSaveSuggestion={mappingActions.saveSuggestion}
                isLocked={lockedRecords.has(record.id)}
                onToggleLock={() => handleToggleLock(record.id)}
                isCollapsed={collapsedRecords.has(record.id)}
                onToggleCollapse={() => handleToggleCollapse(record.id)}
              />
            ))
          )}
        </Box>

        {/* Right Panel - OCR Text Blocks */}
        <Box sx={{ 
          width: 400, 
          p: 3, 
          overflowY: 'auto',
          bgcolor: 'grey.50'
        }}>
          <OcrTextBlockList
            ocrLines={ocrLines}
            usedLines={mappingState.usedLines}
            onLineSelect={handleLineSelect}
            currentMappings={currentMappings}
            onReset={handleResetOcrBlocks}
            hideUsedLines={true}
          />
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box sx={{ 
        p: 3, 
        borderTop: '1px solid #e0e0e0',
        bgcolor: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewOpen(true)}
            disabled={isSubmitting}
          >
            Preview
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              const exportData = mappingActions.exportForSubmission();
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `death_records_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={isSubmitting}
          >
            Export
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {!validationSummary.allValid && (
            <Alert severity="warning" sx={{ py: 0 }}>
              {validationSummary.total - validationSummary.valid} record(s) need attention
            </Alert>
          )}
          
          <Button
            variant="contained"
            size="large"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={isSubmitting || !validationSummary.allValid}
          >
            {isSubmitting ? 'Submitting...' : `Submit ${mappingState.records.length} Records`}
          </Button>
        </Box>
      </Box>

      {/* Loading Overlay */}
      {isSubmitting && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000
          }}
        />
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle>
          Records Preview
        </DialogTitle>
        <DialogContent sx={{
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}>
          <Box sx={{ 
            maxHeight: '60vh', 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}>
            <pre style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              {JSON.stringify(mappingActions.exportForSubmission(), null, 2)}
            </pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
      />
    </Box>
  );
};
