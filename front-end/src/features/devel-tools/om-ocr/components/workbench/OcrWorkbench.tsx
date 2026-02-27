/**
 * OcrWorkbench - Main workbench container for OCR job processing
 * Two-phase UI: (1) Jobs List, (2) Workbench for selected job
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Divider,
  alpha,
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  IconHighlight,
  IconHandClick,
  IconMarquee2,
  IconSquarePlus,
} from '@tabler/icons-react';
import { useOcrJobs } from '../../hooks/useOcrJobs';
import { useWorkbench } from '../../context/WorkbenchContext';
import WorkbenchHeader from './WorkbenchHeader';

import WorkbenchViewer from './WorkbenchViewer';
import UnifiedJobsList from './UnifiedJobsList';
import TranscriptionPanel from '../TranscriptionPanel';
import FieldMappingPanel from '../FieldMappingPanel';
import LayoutLearningWizard from '../LayoutLearningWizard';
import RecordReviewWizard from '../RecordReviewWizard';
import { extractTextFromVisionResponse } from '../../utils/displayNormalizer';
import { detectMetadata } from '../../utils/recordTypeDetector';
import { useServerNormalization } from '../../utils/useServerNormalization';
import { apiClient } from '@/shared/lib/axiosInstance';
import type { JobDetail } from '../../types/inspection';
import type { BBox, VisionResponse } from '../../types/fusion';
import type { OverlayBox } from '../FusionOverlay';
import { computeFieldSuggestions, getCellsForRecord, FIELD_ENTITY_MAP, type SuggestionResult } from '../../utils/fieldSuggestions';
import TemplateBuilder from '../TemplateBuilder';

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

  // Right panel tab state
  const [rightTab, setRightTab] = useState(0);

  // Feeder artifact state for download/rerun buttons
  const [feederPageId, setFeederPageId] = useState<number | null>(null);
  const [feederArtifactId, setFeederArtifactId] = useState<number | null>(null);
  const [rerunning, setRerunning] = useState(false);

  // Job detail data for FieldMappingPanel
  const [tableExtraction, setTableExtraction] = useState<any>(null);
  const [tableExtractionJson, setTableExtractionJson] = useState<any>(null);
  const [recordCandidates, setRecordCandidates] = useState<any>(null);
  const [scoringV2, setScoringV2] = useState<any>(null);
  const [jobOcrResult, setJobOcrResult] = useState<any>(null);
  const [jobIsFinalized, setJobIsFinalized] = useState(false);
  const [jobFinalizedMeta, setJobFinalizedMeta] = useState<{ finalizedAt: string; createdRecordId: number } | null>(null);

  // Record highlighting & interaction state
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'highlight' | 'click-select' | 'drag-select' | 'draw-record'>('highlight');
  const [cropReOcrResult, setCropReOcrResult] = useState<{ text: string; fields: Record<string, string>; bbox: any; tokenCount: number } | null>(null);
  const [cropReOcrLoading, setCropReOcrLoading] = useState(false);
  const [externalFieldUpdate, setExternalFieldUpdate] = useState<{
    fieldKey: string;
    text: string;
    mode: 'append' | 'replace';
  } | null>(null);

  // Auto-extract state
  const [autoExtracting, setAutoExtracting] = useState(false);

  // Field suggestions state (intelligent entity detection)
  const [fieldSuggestions, setFieldSuggestions] = useState<SuggestionResult | null>(null);

  // Layout wizard state
  const [showLayoutWizard, setShowLayoutWizard] = useState(false);

  const handleOpenLayoutWizard = useCallback(() => {
    setShowLayoutWizard(true);
  }, []);

  const handleTemplateApplied = useCallback((templateId: number, newCandidates: any) => {
    setRecordCandidates(newCandidates);
    setShowLayoutWizard(false);
    setRightTab(1); // Switch to Field Mapping tab
  }, []);

  const handleReviewComplete = useCallback((updatedCandidates: any, updatedTableExtraction: any, templateId?: number) => {
    setRecordCandidates(updatedCandidates);
    if (updatedTableExtraction) {
      setTableExtractionJson(updatedTableExtraction);
    }
    setShowLayoutWizard(false);
    setRightTab(1); // Switch to Field Mapping tab
    showToast(`Review complete: ${updatedCandidates?.candidates?.length || 0} records confirmed`, 'success');
  }, [showToast]);

  // Fetch jobs list
  const { jobs, loading, error, refresh, fetchJobDetail, deleteJobs, retryJob, hideJobs, detailCache } = useOcrJobs({ churchId });
  const detailCacheRef = useRef(detailCache);
  
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
  
  // Handle record bbox adjustment (drag-resize) — calls reextract-row endpoint
  const handleRecordBboxAdjusted = useCallback(
    async (idx: number, newVisionBbox: BBox) => {
      if (!tableExtractionJson?.page_dimensions || !selectedJobId || !churchId) return;
      const pageDims = tableExtractionJson.page_dimensions;

      // Convert Vision-pixel bbox back to fractional coords
      const fractionalBbox = {
        x_min: newVisionBbox.x / pageDims.width,
        y_min: newVisionBbox.y / pageDims.height,
        x_max: (newVisionBbox.x + newVisionBbox.w) / pageDims.width,
        y_max: (newVisionBbox.y + newVisionBbox.h) / pageDims.height,
      };

      try {
        const res: any = await apiClient.post(
          `/api/church/${churchId}/ocr/jobs/${selectedJobId}/reextract-row`,
          { recordIndex: idx, bbox: fractionalBbox }
        );
        const data = res?.data ?? res;
        if (data?.success && data.fields) {
          // Update the candidate's fields in recordCandidates
          setRecordCandidates((prev: any) => {
            if (!prev?.candidates?.[idx]) return prev;
            const updated = { ...prev, candidates: [...prev.candidates] };
            updated.candidates[idx] = {
              ...updated.candidates[idx],
              fields: { ...updated.candidates[idx].fields, ...data.fields },
            };
            return updated;
          });
          showToast(`Record ${idx + 1} area updated (${data.tokenCount} tokens)`, 'success');
        }
      } catch (err: any) {
        console.error('[OcrWorkbench] Reextract-row failed:', err);
        showToast('Failed to re-extract record area', 'error');
      }
    },
    [tableExtractionJson, selectedJobId, churchId, showToast],
  );

  // Convert fractional bbox [x_min, y_min, x_max, y_max] to Vision pixel BBox
  const cellBboxToVision = useCallback(
    (fractionalBbox: number[], pageDims: { width: number; height: number }): BBox => {
      const [x_min, y_min, x_max, y_max] = fractionalBbox;
      return {
        x: x_min * pageDims.width,
        y: y_min * pageDims.height,
        w: (x_max - x_min) * pageDims.width,
        h: (y_max - y_min) * pageDims.height,
      };
    },
    [],
  );

  // Compute record highlight boxes from table extraction + selected record
  const recordHighlightBoxes: OverlayBox[] = useMemo(() => {
    if (!tableExtractionJson || !recordCandidates?.candidates?.length) return [];

    const pageDims = tableExtractionJson.page_dimensions;
    if (!pageDims?.width || !pageDims?.height) return [];

    const tables = tableExtractionJson.tables;
    if (!tables || tables.length === 0) return [];

    // Get columnMapping to reverse-map focusedField -> column_index
    const columnMapping = recordCandidates.columnMapping || {};
    // Reverse: fieldKey -> columnKey(s)
    const fieldToColumns: Record<string, string[]> = {};
    for (const [colKey, fieldKey] of Object.entries(columnMapping)) {
      if (!fieldToColumns[fieldKey as string]) fieldToColumns[fieldKey as string] = [];
      fieldToColumns[fieldKey as string].push(colKey);
    }

    const HUES = [210, 30, 120, 280, 60, 330, 180, 0];
    const boxes: OverlayBox[] = [];

    recordCandidates.candidates.forEach((candidate: any, idx: number) => {
      const rowIndex = candidate.sourceRowIndex;
      if (rowIndex < 0) return;

      const isSelected = idx === selectedRecordIndex;
      const hue = HUES[idx % HUES.length];

      // Collect all cells at this row_index across all tables
      let unionXMin = Infinity, unionYMin = Infinity, unionXMax = -Infinity, unionYMax = -Infinity;
      let hasBbox = false;

      for (const table of tables) {
        for (const row of table.rows || []) {
          if (row.row_index !== rowIndex) continue;
          for (const cell of row.cells || []) {
            if (cell.bbox && cell.bbox.length === 4) {
              hasBbox = true;
              unionXMin = Math.min(unionXMin, cell.bbox[0]);
              unionYMin = Math.min(unionYMin, cell.bbox[1]);
              unionXMax = Math.max(unionXMax, cell.bbox[2]);
              unionYMax = Math.max(unionYMax, cell.bbox[3]);
            }
          }
        }
      }

      if (!hasBbox) return;

      const unionBbox = cellBboxToVision([unionXMin, unionYMin, unionXMax, unionYMax], pageDims);
      boxes.push({
        bbox: unionBbox,
        color: `hsl(${hue}, 70%, 50%)`,
        label: `Record ${idx + 1}`,
        selected: isSelected,
        emphasized: false,
        onClick: () => setSelectedRecordIndex(idx),
        editable: isSelected,
        onBboxChangeEnd: isSelected
          ? (newBbox: BBox) => handleRecordBboxAdjusted(idx, newBbox)
          : undefined,
      });

      // If this record is selected and a field is focused, add emphasized cell highlight
      if (isSelected && focusedField) {
        // Try scoring_v2 provenance first (bbox_union from token-level provenance)
        const scoringRow = scoringV2?.rows?.find((r: any) => r.candidate_index === idx);
        const scoringField = scoringRow?.fields?.find((sf: any) => sf.field_name === focusedField);
        const fieldScore = scoringField?.field_score;

        // Color by field_score: green for good, orange for medium, red for bad
        const highlightColor = fieldScore !== undefined
          ? (fieldScore >= 0.85 ? `hsl(120, 80%, 45%)` : fieldScore >= 0.60 ? `hsl(40, 90%, 55%)` : `hsl(0, 80%, 55%)`)
          : `hsl(${hue}, 90%, 60%)`;

        if (scoringField?.bbox_union) {
          // Use scoring_v2 provenance bbox_union (normalized [x, y, w, h] — convert to pixel coords)
          const [nx, ny, nw, nh] = scoringField.bbox_union;
          const provBbox: BBox = {
            x: nx * pageDims.width,
            y: ny * pageDims.height,
            w: nw * pageDims.width,
            h: nh * pageDims.height,
          };
          boxes.push({
            bbox: provBbox,
            color: highlightColor,
            label: `${focusedField}${fieldScore !== undefined ? ` (${Math.round(fieldScore * 100)}%)` : ''}`,
            selected: true,
            emphasized: true,
          });
        } else if (fieldToColumns[focusedField]) {
          // Fallback to table extraction cell bbox
          const targetColKeys = fieldToColumns[focusedField];
          for (const table of tables) {
            for (const row of table.rows || []) {
              if (row.row_index !== rowIndex) continue;
              for (const cell of row.cells || []) {
                const cellColKey = cell.column_key || `col_${cell.column_index}`;
                if (targetColKeys.includes(cellColKey) && cell.bbox?.length === 4) {
                  const cellBbox = cellBboxToVision(cell.bbox, pageDims);
                  boxes.push({
                    bbox: cellBbox,
                    color: highlightColor,
                    label: focusedField,
                    selected: true,
                    emphasized: true,
                  });
                }
              }
            }
          }
        }
      }
    });

    // Add gold dashed suggestion highlight boxes
    if (fieldSuggestions?.suggestions && tableExtractionJson?.page_dimensions) {
      const pd = tableExtractionJson.page_dimensions;
      const expectedType = focusedField ? FIELD_ENTITY_MAP[focusedField] : undefined;
      for (const suggestion of fieldSuggestions.suggestions) {
        if (!suggestion.bbox || suggestion.entityType === 'text') continue;
        // Only show boxes for suggestions that match the expected entity type
        if (expectedType && suggestion.entityType !== expectedType) continue;
        if (suggestion.score < 0.4) continue;
        const visionBbox = cellBboxToVision(suggestion.bbox, pd);
        boxes.push({
          bbox: visionBbox,
          color: '#FFD700', // gold
          label: suggestion.text.substring(0, 30),
          selected: false,
          emphasized: true,
          dashed: true,
          onClick: () => {
            // Fill the focused field with this suggestion
            if (focusedField) {
              setExternalFieldUpdate({ fieldKey: focusedField, text: suggestion.text, mode: 'replace' });
            }
          },
        });
      }
    }

    return boxes;
  }, [tableExtractionJson, recordCandidates, selectedRecordIndex, focusedField, cellBboxToVision, handleRecordBboxAdjusted, fieldSuggestions, scoringV2]);

  // Check if bbox data is available for interactive modes
  const hasBboxData = useMemo(() => {
    if (!tableExtractionJson?.page_dimensions) return false;
    const tables = tableExtractionJson.tables;
    if (!tables?.length) return false;
    return tables.some((t: any) => t.rows?.some((r: any) => r.cells?.some((c: any) => c.bbox?.length === 4)));
  }, [tableExtractionJson]);

  // Handle token select (click-select mode)
  const handleTokenSelect = useCallback(
    (text: string) => {
      if (!focusedField || selectedRecordIndex === null) return;
      setExternalFieldUpdate({ fieldKey: focusedField, text, mode: 'append' });
    },
    [focusedField, selectedRecordIndex],
  );

  // Handle drag select
  const handleDragSelect = useCallback(
    (text: string) => {
      if (!focusedField || selectedRecordIndex === null) return;
      setExternalFieldUpdate({ fieldKey: focusedField, text, mode: 'replace' });
    },
    [focusedField, selectedRecordIndex],
  );

  // Handle draw-record: crop + re-OCR
  const handleDrawRecord = useCallback(
    async (bbox: { x_min: number; y_min: number; x_max: number; y_max: number }) => {
      if (!selectedJobId || !churchId) return;
      setCropReOcrLoading(true);
      setCropReOcrResult(null);
      try {
        const res: any = await apiClient.post(
          `/api/church/${churchId}/ocr/jobs/${selectedJobId}/crop-reocr`,
          { bbox }
        );
        const data = res?.data ?? res;
        if (data?.success) {
          setCropReOcrResult({
            text: data.text || '',
            fields: data.fields || {},
            bbox: data.bbox,
            tokenCount: data.tokenCount || 0,
          });
          showToast(`Crop OCR: ${data.tokenCount} tokens extracted`, 'success');
        }
      } catch (err: any) {
        console.error('[OcrWorkbench] Crop re-OCR failed:', err);
        showToast('Crop re-OCR failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'), 'error');
      } finally {
        setCropReOcrLoading(false);
      }
    },
    [selectedJobId, churchId, showToast],
  );

  // Handle reject record (not a record)
  const handleRejectRecord = useCallback(async (sourceRowIndex: number) => {
    if (!selectedJobId || !churchId) return;
    try {
      const recordType = workbench.state.jobMetadata?.recordType || 'baptism';
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${selectedJobId}/reject-row`,
        { rowIndex: sourceRowIndex, recordType, tableExtraction: tableExtractionJson }
      );
      const data = res?.data ?? res;
      if (data?.success) {
        if (data.recordCandidates) setRecordCandidates(data.recordCandidates);
        if (data.tableExtraction) setTableExtractionJson(data.tableExtraction);
        setSelectedRecordIndex(0);
        showToast(`Row rejected. Now showing ${data.recordCandidates?.candidates?.length || 0} records`, 'success');
      }
    } catch (err: any) {
      console.error('[OcrWorkbench] Reject-row failed:', err);
      showToast('Failed to reject record: ' + (err?.message || 'Unknown error'), 'error');
    }
  }, [selectedJobId, churchId, workbench.state.jobMetadata?.recordType, showToast]);

  // Compute field suggestions when focused field or selected record changes
  useEffect(() => {
    if (!focusedField || selectedRecordIndex === null || !tableExtractionJson || !recordCandidates?.candidates) {
      setFieldSuggestions(null);
      return;
    }

    const candidate = recordCandidates.candidates[selectedRecordIndex];
    if (!candidate) {
      setFieldSuggestions(null);
      return;
    }

    const recordType = workbench.state.jobMetadata?.recordType || 'baptism';
    const columnMapping = recordCandidates.columnMapping || {};

    // Get source row index(es) for this record
    const sourceRowIndex = candidate.sourceRowIndex;
    const cells = getCellsForRecord(tableExtractionJson, sourceRowIndex);

    if (cells.length === 0) {
      setFieldSuggestions(null);
      return;
    }

    // Collect values already assigned to other fields (exclude the focused field)
    const usedValues = Object.entries(candidate.fields || {})
      .filter(([key, val]) => key !== focusedField && typeof val === 'string' && val.trim())
      .map(([, val]) => val as string);

    const result = computeFieldSuggestions(focusedField, recordType, cells, columnMapping, usedValues);
    setFieldSuggestions(result);
  }, [focusedField, selectedRecordIndex, tableExtractionJson, recordCandidates, workbench.state.jobMetadata?.recordType]);

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
        
        // Store table extraction & finalized state for FieldMappingPanel
        setTableExtraction(jobDetail.table_extraction || null);
        const rawOcrResult = jobDetail.ocr_result_json || jobDetail.ocrResultJson || jobDetail.ocr_result || null;
        let parsedRawResult: any = null;
        try {
          parsedRawResult = rawOcrResult && typeof rawOcrResult === 'string' ? JSON.parse(rawOcrResult) : rawOcrResult;
        } catch { parsedRawResult = rawOcrResult; }
        setJobOcrResult(parsedRawResult);
        const finalized = parsedRawResult?.finalizedAt;
        setJobIsFinalized(!!finalized);
        setJobFinalizedMeta(finalized ? { finalizedAt: parsedRawResult.finalizedAt, createdRecordId: parsedRawResult.createdRecordId } : null);

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
        
        // Extract OCR text - prefer feeder page data, then stored text, then Vision response
        let ocrTextForDetection: string | null = null;

        // Check for feeder pages (source of truth)
        if (jobDetail.pages && jobDetail.pages.length > 0) {
          const firstPage = jobDetail.pages[0];
          if (firstPage.rawText) {
            ocrTextForDetection = firstPage.rawText;
          }
          setFeederPageId(firstPage.pageId);
          setFeederArtifactId(firstPage.rawTextArtifactId);
          // Extract record candidates for multi-record field mapping
          if (firstPage.recordCandidates) {
            setRecordCandidates(firstPage.recordCandidates);
          } else {
            setRecordCandidates(null);
          }
          // Extract table extraction JSON (contains cell bboxes for highlighting)
          if (firstPage.tableExtractionJson) {
            setTableExtractionJson(
              typeof firstPage.tableExtractionJson === 'string'
                ? JSON.parse(firstPage.tableExtractionJson)
                : firstPage.tableExtractionJson,
            );
          } else {
            setTableExtractionJson(null);
          }
          // Extract scoring_v2 data (field-level scoring with provenance)
          if (firstPage.scoringV2) {
            setScoringV2(
              typeof firstPage.scoringV2 === 'string'
                ? JSON.parse(firstPage.scoringV2)
                : firstPage.scoringV2,
            );
          } else {
            setScoringV2(null);
          }
        } else {
          setFeederPageId(null);
          setFeederArtifactId(null);
          setRecordCandidates(null);
          setScoringV2(null);
        }

        // Auto-extract: if no recordCandidates but we have Vision data, trigger auto-extraction
        const hasVisionData = ocrResult || (jobDetail as any).ocr_text || (jobDetail as any).ocrText || ocrTextForDetection;
        if (!recordCandidates && hasVisionData) {
          setAutoExtracting(true);
          try {
            const autoRes: any = await apiClient.post(
              `/api/church/${churchId}/ocr/jobs/${selectedJobId}/auto-extract`
            );
            const autoData = autoRes?.data ?? autoRes;
            if (autoData?.success && autoData.recordCandidates?.candidates?.length > 0) {
              setRecordCandidates(autoData.recordCandidates);
              if (autoData.tableExtraction) {
                setTableExtractionJson(autoData.tableExtraction);
              }
              console.log(`[OcrWorkbench] Auto-extracted ${autoData.recordCandidates.candidates.length} records (cached=${autoData.cached})`);
            }
          } catch (autoErr) {
            console.warn('[OcrWorkbench] Auto-extract failed, falling back to manual layout:', autoErr);
          } finally {
            setAutoExtracting(false);
          }
        }

        // Fall back to stored text or Vision response
        if (!ocrTextForDetection) {
          ocrTextForDetection = (jobDetail as any).ocr_text || (jobDetail as any).ocrText || null;
        }
        if (!ocrTextForDetection && ocrResult) {
          ocrTextForDetection = extractTextFromVisionResponse(ocrResult);
        }
        let detectedRecordType = jobDetail.record_type || jobDetail.recordType || 'unknown';
        
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
    setNormalizedText(null);
    setFeederPageId(null);
    setFeederArtifactId(null);
    setRightTab(0);
    setTableExtraction(null);
    setTableExtractionJson(null);
    setRecordCandidates(null);
    setScoringV2(null);
    setJobOcrResult(null);
    setJobIsFinalized(false);
    setJobFinalizedMeta(null);
    setSelectedRecordIndex(null);
    setFocusedField(null);
    setEditMode('highlight');
    setExternalFieldUpdate(null);
    setFieldSuggestions(null);
  }, [workbench]);

  // Handle artifact download
  const handleDownloadArtifact = useCallback(() => {
    if (feederArtifactId && churchId) {
      window.open(`/api/church/${churchId}/ocr/feeder/artifacts/${feederArtifactId}/download`, '_blank');
    }
  }, [feederArtifactId, churchId]);

  // Handle re-run OCR
  const handleRerunOcr = useCallback(async () => {
    if (!feederPageId || !churchId) return;
    setRerunning(true);
    try {
      const response = await apiClient.post(`/api/church/${churchId}/ocr/feeder/pages/${feederPageId}/rerun`);
      const data = (response as any)?.data ?? response;
      showToast(`OCR re-run complete (confidence: ${((data.confidence || 0) * 100).toFixed(1)}%)`, 'success');
      // Clear detail cache and reload
      if (selectedJobId) {
        // Force re-fetch by clearing cache
        const cache = detailCacheRef.current;
        if (cache) cache.delete(selectedJobId);
        // Re-trigger loadJobData by toggling selectedJobId
        const jid = selectedJobId;
        setSelectedJobId(null);
        setTimeout(() => setSelectedJobId(jid), 50);
      }
    } catch (err: any) {
      console.error('[OcrWorkbench] Re-run OCR failed:', err);
      showToast('Re-run OCR failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setRerunning(false);
    }
  }, [feederPageId, churchId, selectedJobId, showToast]);

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
  
  // Navigation: compute prev/next job IDs from the jobs list
  const { prevJobId, nextJobId } = useMemo(() => {
    if (!selectedJobId || !jobs.length) return { prevJobId: null, nextJobId: null };
    // Filter to completed/reviewed jobs for navigation
    const navJobs = jobs.filter(j => j.status === 'completed' || j.status === 'reviewed' || j.status === 'processing');
    const idx = navJobs.findIndex(j => j.id === selectedJobId);
    if (idx < 0) return { prevJobId: null, nextJobId: null };
    return {
      prevJobId: idx > 0 ? navJobs[idx - 1].id : null,
      nextJobId: idx < navJobs.length - 1 ? navJobs[idx + 1].id : null,
    };
  }, [selectedJobId, jobs]);

  const handleNavPrev = useCallback(() => {
    if (prevJobId) handleJobSelect(prevJobId);
  }, [prevJobId, handleJobSelect]);

  const handleNavNext = useCallback(() => {
    if (nextJobId) handleJobSelect(nextJobId);
  }, [nextJobId, handleJobSelect]);

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
              // Override DB record_type with auto-detected type from workbench
              ...(workbench.state.jobMetadata?.recordType && workbench.state.jobMetadata.recordType !== 'unknown' && workbench.state.jobMetadata.recordType !== 'custom'
                ? { record_type: workbench.state.jobMetadata.recordType }
                : {}),
            }}
            onClose={handleCloseWorkbench}
            onPrev={handleNavPrev}
            onNext={handleNavNext}
            hasPrev={!!prevJobId}
            hasNext={!!nextJobId}
          />
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {/* Left: Image Viewer */}
            <Box sx={{ width: '50%', borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <WorkbenchViewer
                recordHighlightBoxes={recordHighlightBoxes}
                interactionMode={editMode}
                onTokenSelect={handleTokenSelect}
                onDragSelect={handleDragSelect}
                onDrawRecord={handleDrawRecord}
                tablePageDims={tableExtractionJson?.page_dimensions || null}
              />
            </Box>
            {/* Mode Toggle - shown when Field Mapping tab is active and we have bbox data */}
            {rightTab === 1 && hasBboxData && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '25%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 4,
                  p: 0.5,
                }}
              >
                <ToggleButtonGroup
                  value={editMode}
                  exclusive
                  onChange={(_, val) => val && setEditMode(val)}
                  size="small"
                >
                  <ToggleButton value="highlight">
                    <Tooltip title="Highlight Only">
                      <IconHighlight size={18} />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="click-select" disabled={!focusedField}>
                    <Tooltip title="Click tokens to append to focused field">
                      <IconHandClick size={18} />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="drag-select" disabled={!focusedField}>
                    <Tooltip title="Draw rectangle to select tokens">
                      <IconMarquee2 size={18} />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="draw-record">
                    <Tooltip title="Draw record box for crop + re-OCR">
                      <IconSquarePlus size={18} />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}
            {/* Crop Re-OCR Results Panel */}
            {(cropReOcrLoading || cropReOcrResult) && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  bottom: 60,
                  left: 16,
                  zIndex: 25,
                  maxWidth: '45%',
                  maxHeight: 300,
                  overflow: 'auto',
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderLeft: '3px solid',
                  borderColor: 'warning.main',
                }}
              >
                {cropReOcrLoading ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} />
                    <Typography variant="body2">Running crop OCR...</Typography>
                  </Stack>
                ) : cropReOcrResult ? (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} fontSize="0.75rem">
                        Crop OCR Result ({cropReOcrResult.tokenCount} tokens)
                      </Typography>
                      <IconButton size="small" onClick={() => setCropReOcrResult(null)} sx={{ p: 0.25 }}>
                        <Typography variant="caption" color="text.secondary">×</Typography>
                      </IconButton>
                    </Stack>
                    {cropReOcrResult.text && (
                      <Typography variant="body2" fontSize="0.7rem" sx={{ mb: 0.5, whiteSpace: 'pre-wrap', bgcolor: 'action.hover', p: 0.5, borderRadius: 0.5 }}>
                        {cropReOcrResult.text}
                      </Typography>
                    )}
                    {Object.keys(cropReOcrResult.fields).length > 0 && (
                      <Box>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Fields:</Typography>
                        {Object.entries(cropReOcrResult.fields).map(([key, val]) => (
                          <Typography key={key} variant="body2" fontSize="0.65rem">
                            <strong>{key}:</strong> {val}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : null}
              </Paper>
            )}
            {/* Right: Tabbed Panel (Transcription / Field Mapping) */}
            <Box sx={{ width: '50%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Tabs
                value={rightTab}
                onChange={(_, v) => setRightTab(v)}
                variant="fullWidth"
                sx={{
                  minHeight: 40,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '& .MuiTab-root': { minHeight: 40, fontSize: '0.8rem', textTransform: 'none', fontWeight: 600 },
                }}
              >
                <Tab label="Transcription" />
                <Tab label="Field Mapping" />
                <Tab label="Templates" />
              </Tabs>
              <Box sx={{ flex: 1, overflow: 'hidden', p: 2 }}>
                {rightTab === 0 && (
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
                    onRerunOcr={feederPageId ? handleRerunOcr : undefined}
                    rerunning={rerunning}
                    onDownloadArtifact={feederArtifactId ? handleDownloadArtifact : undefined}
                  />
                )}
                {rightTab === 1 && selectedJobId && (
                  <FieldMappingPanel
                    jobId={selectedJobId}
                    churchId={churchId}
                    ocrText={workbench.state.ocrText}
                    ocrResult={jobOcrResult}
                    tableExtraction={tableExtraction}
                    recordCandidates={recordCandidates}
                    initialRecordType={workbench.state.jobMetadata?.recordType || 'unknown'}
                    isFinalized={jobIsFinalized}
                    finalizedMeta={jobFinalizedMeta}
                    selectedRecordIndex={selectedRecordIndex}
                    onRecordSelect={setSelectedRecordIndex}
                    focusedField={focusedField}
                    onFieldFocus={setFocusedField}
                    externalFieldUpdate={externalFieldUpdate}
                    onExternalFieldUpdateHandled={() => setExternalFieldUpdate(null)}
                    onOpenLayoutWizard={handleOpenLayoutWizard}
                    autoExtracting={autoExtracting}
                    fieldSuggestions={fieldSuggestions}
                    scoringV2={scoringV2}
                    onRejectRecord={handleRejectRecord}
                    onFinalized={(result: any) => {
                      if (result.created_count) {
                        showToast(`${result.created_count} record(s) created`, 'success');
                      } else {
                        showToast(`Record #${result.recordId} created (${result.recordType})`, 'success');
                      }
                      setJobIsFinalized(true);
                    }}
                  />
                )}
                {rightTab === 2 && (
                  <TemplateBuilder
                    churchId={churchId}
                    onTemplateCreated={(templateId) => {
                      showToast(`Template ${templateId} created`, 'success');
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Record Review Wizard (guided step-by-step with learning) */}
          {selectedJobId && (
            <RecordReviewWizard
              open={showLayoutWizard}
              onClose={() => setShowLayoutWizard(false)}
              jobId={selectedJobId}
              churchId={churchId}
              imageUrl={`/api/church/${churchId}/ocr/jobs/${selectedJobId}/image`}
              recordType={workbench.state.jobMetadata?.recordType || 'baptism'}
              initialRecordCandidates={recordCandidates}
              initialTableExtraction={tableExtractionJson}
              onReviewComplete={handleReviewComplete}
            />
          )}

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
            onRetryJob={retryJob}
            onHideJobs={hideJobs}
            churchId={churchId}
          />
        </Box>
      )}
    </Box>
  );
};

export default OcrWorkbench;

