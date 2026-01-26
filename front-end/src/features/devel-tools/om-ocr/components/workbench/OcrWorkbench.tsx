/**
 * OcrWorkbench - Main workbench container for OCR job processing
 * Two-phase UI: (1) Jobs List, (2) Workbench for selected job
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  alpha,
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';
import { useOcrJobs } from '../../hooks/useOcrJobs';
import { useWorkbench } from '../../context/WorkbenchContext';
import WorkbenchHeader from './WorkbenchHeader';
import WorkbenchStepper from './WorkbenchStepper';
import WorkbenchViewer from './WorkbenchViewer';
import UnifiedJobsList from './UnifiedJobsList';
import TranscriptionPanel from '../TranscriptionPanel';
import { extractTextFromVisionResponse } from '../../utils/displayNormalizer';
import { detectMetadata } from '../../utils/recordTypeDetector';
import { useServerNormalization } from '../../utils/useServerNormalization';
import type { JobDetail } from '../../types/inspection';
import type { VisionResponse } from '../../types/fusion';

interface OcrWorkbenchProps {
  churchId: number;
  initialJobId?: number;
}

const OcrWorkbench: React.FC<OcrWorkbenchProps> = ({
  churchId,
  initialJobId,
}) => {
  const theme = useTheme();
  const workbench = useWorkbench();
  
  // Server normalization hook
  const { normalize, normalizing, serverNormalized } = useServerNormalization();
  const [normalizedText, setNormalizedText] = useState<string | null>(null);
  
  // Check flag dynamically - check on each render to react to localStorage changes
  // This will update when localStorage changes (after page reload)
  const serverNormalizationEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const flag = localStorage.getItem('OCR_NORMALIZE_SERVER');
    return flag === '1' || flag === 'true';
  }, [normalizedText]); // Re-check when normalizedText changes (triggers after normalization)
  
  // Toast notifications
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const showToast = useCallback((message: string, severity: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ open: true, message, severity });
  }, []);
  
  // Track selected job ID locally (workbench state will be updated when job data loads)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(initialJobId || null);
  
  // Fetch jobs list
  const { jobs, loading, error, refresh, fetchJobDetail, deleteJobs } = useOcrJobs({ churchId });
  
  // Auto-refresh jobs list periodically to catch new uploads
  useEffect(() => {
    if (!churchId) return;
    
    // Initial load
    refresh();
    
    // Set up polling every 5 seconds to catch new uploads
    const pollInterval = setInterval(() => {
      refresh();
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, [churchId, refresh]);
  
  // Get selected job details
  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null;
    return jobs.find(j => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);
  
  // Load job data into workbench when job is selected
  useEffect(() => {
    if (!selectedJobId || !churchId) {
      // Clear workbench if no job selected
      if (!selectedJobId) {
        workbench.reset();
      }
      return;
    }
    
    const loadJobData = async () => {
      try {
        const jobDetail = await fetchJobDetail(selectedJobId);
        if (!jobDetail) {
          workbench.dispatch({ type: 'SET_ERROR', payload: 'Job not found' });
          return;
        }
        
        // Parse OCR result
        let ocrResult: VisionResponse | null = null;
        try {
          if (jobDetail.ocr_result_json) {
            ocrResult = typeof jobDetail.ocr_result_json === 'string'
              ? JSON.parse(jobDetail.ocr_result_json)
              : jobDetail.ocr_result_json;
          } else if (jobDetail.ocrResultJson) {
            ocrResult = typeof jobDetail.ocrResultJson === 'string'
              ? JSON.parse(jobDetail.ocrResultJson)
              : jobDetail.ocrResultJson;
          }
        } catch (e) {
          console.warn('[OcrWorkbench] Failed to parse OCR result:', e);
        }
        
        // Get image URL - always use API endpoint (file_path is server path, not URL)
        const imageUrl = (churchId && selectedJobId) 
          ? `/api/church/${churchId}/ocr/jobs/${selectedJobId}/image`
          : null;
        
        // Extract OCR text - prefer stored text, fallback to extracting from Vision response
        // Use structured extraction for better formatting
        let ocrTextForDetection = jobDetail.ocr_text || jobDetail.ocrText || null;
        if (!ocrTextForDetection && ocrResult) {
          ocrTextForDetection = extractTextFromVisionResponse(ocrResult);
        }
        let detectedRecordType = jobDetail.record_type || jobDetail.recordType || 'baptism';
        
        if (ocrTextForDetection) {
          try {
            // Explicitly call detectMetadata with proper error handling
            // This ensures no require() or other Node.js globals are used
            const metadata = detectMetadata(ocrTextForDetection);
            if (metadata && metadata.recordType && metadata.confidence > 0.5) {
              detectedRecordType = metadata.recordType;
              console.log('[OcrWorkbench] Auto-detected record type:', metadata.recordType, 'confidence:', metadata.confidence);
              if (metadata.year) {
                console.log('[OcrWorkbench] Auto-detected year:', metadata.year);
              }
            }
          } catch (e) {
            // Gracefully handle any errors without crashing
            console.warn('[OcrWorkbench] Failed to auto-detect record type:', e);
            // Continue with default record type (detectedRecordType already set above)
          }
        }
        
        // Set job in workbench
        workbench.setJob(
          selectedJobId,
          {
            filename: jobDetail.original_filename || jobDetail.originalFilename || 'Unknown',
            recordType: detectedRecordType as any,
            status: jobDetail.status || 'unknown',
            confidence: jobDetail.confidence_score || jobDetail.confidenceScore || 0,
            churchId,
          },
          ocrTextForDetection,
          ocrResult,
          imageUrl
        );
      } catch (err) {
        console.error('[OcrWorkbench] Failed to load job data:', err);
        workbench.dispatch({ type: 'SET_ERROR', payload: 'Failed to load job data' });
      }
    };
    
    loadJobData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId, churchId]); // Removed workbench and fetchJobDetail to prevent infinite loops
  
  // Handle job selection
  const handleJobSelect = useCallback((jobId: number) => {
    setSelectedJobId(jobId);
    workbench.dispatch({ type: 'SET_ACTIVE_STEP', payload: 0 });
    workbench.dispatch({ type: 'SET_ERROR', payload: null });
  }, [workbench]);
  
  // Handle delete jobs
  const handleDeleteJobs = useCallback(async (jobIds: number[]) => {
    if (!confirm(`Delete ${jobIds.length} job(s)? This cannot be undone.`)) {
      return;
    }
    const success = await deleteJobs(jobIds);
    if (success) {
      // If deleted job was selected, clear selection
      if (selectedJobId && jobIds.includes(selectedJobId)) {
        setSelectedJobId(null);
        workbench.reset();
      }
      // Refresh jobs list
      await refresh();
    }
  }, [deleteJobs, refresh, selectedJobId, workbench]);
  
  // Handle close workbench
  const handleCloseWorkbench = useCallback(() => {
    setSelectedJobId(null);
    workbench.reset();
    setNormalizedText(null); // Clear normalized text when closing
  }, [workbench]);

  // Expose normalized text globally for FusionTab access (when not using WorkbenchContext)
  useEffect(() => {
    if (normalizedText) {
      (window as any).__workbenchState = { normalizedText };
    } else {
      delete (window as any).__workbenchState;
    }
    return () => {
      delete (window as any).__workbenchState;
    };
  }, [normalizedText]);

  // Handle normalize button click
  const handleNormalize = useCallback(async () => {
    if (!selectedJobId || !churchId) return;
    
    // Get raw OCR text
    const rawText = workbench.state.ocrText || 
                   (workbench.state.ocrResult ? extractTextFromVisionResponse(workbench.state.ocrResult) : null);
    
    if (!rawText) {
      showToast('No OCR text available to normalize', 'warning');
      return;
    }

    // Read document processing settings from localStorage
    let docSettings = {
      transcriptionMode: 'exact' as const,
      textExtractionScope: 'all' as const,
      formattingMode: 'improve-formatting' as const,
      confidenceThreshold: 0.35,
    };
    
    try {
      const stored = sessionStorage.getItem('om.ocr.docSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        docSettings = { ...docSettings, ...parsed };
      }
    } catch (e) {
      console.warn('[OcrWorkbench] Failed to load doc settings:', e);
    }

    try {
      const result = await normalize(churchId, selectedJobId, rawText, docSettings);
      setNormalizedText(result);
      // Store in workbench context for use in Save Draft
      workbench.dispatch({ type: 'SET_NORMALIZED_TEXT', payload: result });
      showToast('Transcription normalized successfully', 'success');
    } catch (error: any) {
      console.error('[OcrWorkbench] Normalization failed:', error);
      showToast('Normalization failed, using client-side formatting', 'warning');
      setNormalizedText(null); // Use client fallback
      workbench.dispatch({ type: 'SET_NORMALIZED_TEXT', payload: null });
    }
  }, [selectedJobId, churchId, workbench, normalize, showToast]);
  
  // Show workbench if job is selected and loaded
  const showWorkbench = selectedJobId && workbench.state.jobMetadata;
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {showWorkbench ? (
        // Phase 2: Workbench for selected job
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <WorkbenchHeader
            job={{
              ...(selectedJob || {
                id: selectedJobId,
                original_filename: workbench.state.jobMetadata?.filename || 'Unknown',
                record_type: workbench.state.jobMetadata?.recordType || 'baptism',
                status: workbench.state.jobMetadata?.status || 'unknown',
                confidence_score: workbench.state.jobMetadata?.confidence || 0,
              } as any),
              ocr_text: workbench.state.ocrText || null,
            }}
            onClose={handleCloseWorkbench}
          />
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left: Image Viewer */}
            <Box sx={{ width: '50%', borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <WorkbenchViewer />
            </Box>
            {/* Right: Transcription Panel (Phase 1 - transcription-first) */}
            <Box sx={{ width: '50%', overflow: 'hidden', p: 2 }}>
              <TranscriptionPanel
                ocrText={
                  workbench.state.ocrText || 
                  (workbench.state.ocrResult ? extractTextFromVisionResponse(workbench.state.ocrResult) : null)
                }
                serverNormalizedText={normalizedText}
                loading={!workbench.state.ocrResult && !workbench.state.ocrText}
                normalizing={normalizing}
                onCopy={() => showToast('Copied to clipboard', 'success')}
                onDownload={() => showToast('Transcription downloaded', 'success')}
                onNormalize={serverNormalizationEnabled ? handleNormalize : undefined}
              />
            </Box>
          </Box>
          
          {/* Toast Notifications */}
          <Snackbar
            open={toast.open}
            autoHideDuration={3500}
            onClose={() => setToast({ ...toast, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={() => setToast({ ...toast, open: false })}
              severity={toast.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {toast.message}
            </Alert>
          </Snackbar>
        </Box>
      ) : (
        // Phase 1: Unified Jobs List
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            OCR Jobs
          </Typography>
          <UnifiedJobsList
            jobs={jobs}
            loading={loading}
            error={error}
            onJobSelect={handleJobSelect}
            onRefresh={refresh}
            onDeleteJobs={handleDeleteJobs}
            churchId={churchId}
          />
        </Box>
      )}
    </Box>
  );
};

export default OcrWorkbench;

