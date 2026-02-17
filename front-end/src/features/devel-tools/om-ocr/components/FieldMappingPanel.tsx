/**
 * FieldMappingPanel — Multi-record field mapping, review, and batch finalize.
 * Supports N record candidates from table extraction with auto-mapped fields.
 * Falls back to single-record mode when no candidates are available.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { IconChevronDown, IconSend, IconAlertTriangle, IconColumns, IconUser, IconCalendar, IconHash, IconMapPin, IconBan, IconSettings, IconWand } from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import { getCustomFieldsForType } from '../utils/fieldConfig';
import FieldConfigDialog from './FieldConfigDialog';
import { FIELD_ENTITY_MAP, type SuggestionResult, type EntityType } from '../utils/fieldSuggestions';

interface RecordCandidate {
  recordType: string;
  confidence: number;
  fields: Record<string, string>;
  sourceRowIndex: number;
  needsReview: boolean;
}

interface RecordCandidatesData {
  candidates: RecordCandidate[];
  detectedType: string;
  typeConfidence: number;
  columnMapping: Record<string, string>;
  unmappedColumns: string[];
  parsedAt: string;
}

interface RecordEntry {
  recordType: string;
  fields: Record<string, string>;
  selected: boolean;
  needsReview: boolean;
  sourceRowIndex: number;
  confidence: number;
}

/** Token from table extraction cell for chip display */
interface CellToken {
  text: string;
  confidence: number | null;
  columnIndex: number;
  columnKey: string;
}

/** Check if a string looks like a date */
function isDateLike(text: string): boolean {
  return /(?:\d{1,2}[\/\-\.]\d{1,2}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d{4})/i.test(text);
}

/** Validate a date string — returns error message or null */
function validateDate(text: string): string | null {
  if (!text.trim()) return null;
  // Try parsing common formats
  const d = new Date(text);
  if (!isNaN(d.getTime())) return null;
  // Try MM/DD/YYYY
  const parts = text.split(/[\/\-\.]/);
  if (parts.length >= 2 && parts.every(p => /^\d+$/.test(p))) return null;
  return 'Invalid date format';
}

interface FieldMappingPanelProps {
  jobId: number;
  churchId: number;
  ocrText: string | null;
  ocrResult: any | null;
  tableExtraction: any | null;
  recordCandidates?: RecordCandidatesData | null;
  initialRecordType: string;
  isFinalized: boolean;
  finalizedMeta?: { finalizedAt: string; createdRecordId: number } | null;
  onFinalized?: (result: { recordId: number; recordType: string } | { created_count: number }) => void;
  // Record highlighting integration
  selectedRecordIndex?: number | null;
  onRecordSelect?: (index: number | null) => void;
  focusedField?: string | null;
  onFieldFocus?: (fieldKey: string | null) => void;
  // External field updates from image token interaction
  externalFieldUpdate?: { fieldKey: string; text: string; mode: 'append' | 'replace' } | null;
  onExternalFieldUpdateHandled?: () => void;
  // Layout wizard trigger
  onOpenLayoutWizard?: () => void;
  // Auto-extract loading state
  autoExtracting?: boolean;
  // Field suggestions (intelligent entity detection)
  fieldSuggestions?: SuggestionResult | null;
  // Reject record (not a record)
  onRejectRecord?: (sourceRowIndex: number) => void;
}

const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
  jobId,
  churchId,
  ocrResult,
  recordCandidates,
  initialRecordType,
  isFinalized: initialIsFinalized,
  finalizedMeta,
  onFinalized,
  selectedRecordIndex: externalSelectedIdx,
  onRecordSelect,
  focusedField: externalFocusedField,
  onFieldFocus,
  externalFieldUpdate,
  onExternalFieldUpdateHandled,
  onOpenLayoutWizard,
  autoExtracting,
  fieldSuggestions,
  onRejectRecord,
}) => {
  const theme = useTheme();
  const [recordType, setRecordType] = useState(initialRecordType || 'unknown');
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(initialIsFinalized);
  const [localFinalizedMeta, setLocalFinalizedMeta] = useState(finalizedMeta || null);
  const [internalExpandedIdx, setInternalExpandedIdx] = useState<number | false>(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Use external selection if provided, otherwise internal
  const expandedIdx = externalSelectedIdx !== undefined && externalSelectedIdx !== null
    ? externalSelectedIdx
    : internalExpandedIdx;

  const handleAccordionChange = useCallback((idx: number, expanded: boolean) => {
    const newVal = expanded ? idx : null;
    if (onRecordSelect) {
      onRecordSelect(newVal);
    }
    setInternalExpandedIdx(expanded ? idx : false);
    if (!expanded) {
      onFieldFocus?.(null);
    }
  }, [onRecordSelect, onFieldFocus]);

  // Handle external field updates (from image token interaction)
  useEffect(() => {
    if (!externalFieldUpdate || expandedIdx === false || expandedIdx === null) return;
    const { fieldKey, text, mode } = externalFieldUpdate;
    const recordIdx = typeof expandedIdx === 'number' ? expandedIdx : 0;

    setRecords((prev) => {
      const next = [...prev];
      if (!next[recordIdx]) return prev;
      const current = next[recordIdx].fields[fieldKey] || '';
      const newValue = mode === 'append'
        ? (current ? current + ' ' + text : text)
        : text;
      next[recordIdx] = {
        ...next[recordIdx],
        fields: { ...next[recordIdx].fields, [fieldKey]: newValue },
      };
      return next;
    });

    onExternalFieldUpdateHandled?.();
  }, [externalFieldUpdate, expandedIdx, onExternalFieldUpdateHandled]);

  // Determine if we have multi-record candidates
  const hasMultiRecords = useMemo(() => {
    return recordCandidates?.candidates && recordCandidates.candidates.length > 0;
  }, [recordCandidates]);

  // Sync external props
  useEffect(() => {
    setRecordType(initialRecordType || 'unknown');
  }, [initialRecordType]);

  useEffect(() => {
    setIsFinalized(initialIsFinalized);
    setLocalFinalizedMeta(finalizedMeta || null);
  }, [initialIsFinalized, finalizedMeta]);

  // Initialize records from candidates or ocrResult
  useEffect(() => {
    if (hasMultiRecords && recordCandidates) {
      const detectedType = recordCandidates.detectedType;
      if (detectedType && detectedType !== 'unknown' && detectedType !== 'custom') {
        setRecordType(detectedType);
      }

      const entries: RecordEntry[] = recordCandidates.candidates.map((c) => ({
        recordType: c.recordType || detectedType || recordType,
        fields: { ...c.fields },
        selected: true,
        needsReview: c.needsReview,
        sourceRowIndex: c.sourceRowIndex,
        confidence: c.confidence,
      }));
      setRecords(entries);
      setInternalExpandedIdx(0);
      onRecordSelect?.(0);
    } else if (ocrResult && typeof ocrResult === 'object' && !ocrResult.finalizedAt) {
      // Single-record fallback from ocrResult
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(ocrResult)) {
        if (typeof v === 'string' || typeof v === 'number') flat[k] = String(v);
      }
      setRecords([{
        recordType: recordType,
        fields: flat,
        selected: true,
        needsReview: true,
        sourceRowIndex: -1,
        confidence: 0,
      }]);
      setInternalExpandedIdx(0);
      onRecordSelect?.(0);
    } else {
      // Empty single-record placeholder
      setRecords([{
        recordType: recordType,
        fields: {},
        selected: true,
        needsReview: true,
        sourceRowIndex: -1,
        confidence: 0,
      }]);
      setInternalExpandedIdx(0);
      onRecordSelect?.(0);
    }
  }, [recordCandidates, ocrResult, jobId]);

  // Claimed values: tracks which token text is assigned to which field across a record
  // Map<normalizedTokenText, fieldKey>
  const [claimedValues, setClaimedValues] = useState<Map<string, string>>(new Map());

  // Extract cell tokens for the currently expanded record from recordCandidates
  const recordCellTokens = useMemo(() => {
    if (!recordCandidates?.candidates) return [];
    const idx = typeof expandedIdx === 'number' ? expandedIdx : 0;
    const candidate = recordCandidates.candidates[idx];
    if (!candidate) return [];

    // All fields in the candidate have auto-mapped values from table extraction cells
    // Build tokens from the candidate's fields + column mapping
    const tokens: CellToken[] = [];
    const mapping = recordCandidates.columnMapping || {};

    // Reverse mapping: field_key → column_key
    const fieldToCol: Record<string, string> = {};
    for (const [colKey, fieldKey] of Object.entries(mapping)) {
      fieldToCol[fieldKey] = colKey;
    }

    // For each field with a value, create a token
    for (const [fieldKey, value] of Object.entries(candidate.fields)) {
      if (!value || !value.trim()) continue;
      const colKey = fieldToCol[fieldKey] || fieldKey;
      const colIdx = parseInt(colKey.replace('col_', '')) - 1;
      tokens.push({
        text: value.trim(),
        confidence: candidate.confidence || null,
        columnIndex: isNaN(colIdx) ? 0 : colIdx,
        columnKey: colKey,
      });
    }

    // Also include unmapped column values if any
    for (const colKey of (recordCandidates.unmappedColumns || [])) {
      const val = candidate.fields[colKey];
      if (val && val.trim()) {
        tokens.push({
          text: val.trim(),
          confidence: null,
          columnIndex: parseInt(colKey.replace('col_', '')) - 1 || 0,
          columnKey: colKey,
        });
      }
    }

    return tokens;
  }, [recordCandidates, expandedIdx]);

  // Handle claiming a token value for a field
  const handleClaimToken = useCallback((recordIdx: number, fieldKey: string, tokenText: string) => {
    setRecords((prev) => {
      const next = [...prev];
      next[recordIdx] = { ...next[recordIdx], fields: { ...next[recordIdx].fields, [fieldKey]: tokenText } };
      return next;
    });
    setClaimedValues((prev) => {
      const next = new Map(prev);
      // Release any previously claimed value for this field
      for (const [text, fk] of next.entries()) {
        if (fk === fieldKey) next.delete(text);
      }
      // Claim new value
      next.set(tokenText.toLowerCase().trim(), fieldKey);
      return next;
    });
  }, []);

  // Get available tokens for a specific field (exclude claimed by other fields)
  const getAvailableTokens = useCallback((fieldKey: string, isDateField: boolean): CellToken[] => {
    let available = recordCellTokens.filter((t) => {
      const claimed = claimedValues.get(t.text.toLowerCase().trim());
      return !claimed || claimed === fieldKey;
    });
    // For date fields, only show date-like tokens
    if (isDateField) {
      available = available.filter((t) => isDateLike(t.text));
    }
    return available;
  }, [recordCellTokens, claimedValues]);

  // Reset claimed values when record changes
  useEffect(() => {
    setClaimedValues(new Map());
  }, [expandedIdx, jobId]);

  const [fieldConfigOpen, setFieldConfigOpen] = useState(false);
  const [fieldConfigVersion, setFieldConfigVersion] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fields = useMemo(() => getCustomFieldsForType(recordType), [recordType, fieldConfigVersion]);
  const selectedCount = records.filter((r) => r.selected).length;

  // Detect if records need review (layout not recognized OR low confidence)
  const needsReview = useMemo(() => {
    if (!recordCandidates) return false;
    const mappedCount = Object.keys(recordCandidates.columnMapping || {}).length;
    const unmappedCount = (recordCandidates.unmappedColumns || []).length;
    const layoutBad = mappedCount === 0 || unmappedCount > mappedCount;
    // Also trigger if average confidence is low
    const candidates = recordCandidates.candidates || [];
    if (candidates.length > 0) {
      const avgConf = candidates.reduce((s: number, c: any) => s + (c.confidence || 0), 0) / candidates.length;
      if (avgConf < 0.7) return true;
    }
    return layoutBad;
  }, [recordCandidates]);

  const handleRecordTypeChange = useCallback(async (newType: string) => {
    setRecordType(newType);
    // Update all records' recordType
    setRecords((prev) => prev.map((r) => ({ ...r, recordType: newType })));
    try {
      await apiClient.patch(`/api/church/${churchId}/ocr/jobs/${jobId}`, { record_type: newType });
    } catch {
      // non-fatal
    }
  }, [jobId]);

  const handleFieldChange = useCallback((recordIdx: number, key: string, value: string) => {
    setRecords((prev) => {
      const next = [...prev];
      next[recordIdx] = { ...next[recordIdx], fields: { ...next[recordIdx].fields, [key]: value } };
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((recordIdx: number) => {
    setRecords((prev) => {
      const next = [...prev];
      next[recordIdx] = { ...next[recordIdx], selected: !next[recordIdx].selected };
      return next;
    });
  }, []);

  // Smart Fill: distribute OCR tokens across fields by column order
  const handleSmartFill = useCallback((recordIdx: number) => {
    if (!recordCandidates?.candidates) return;
    const candidate = recordCandidates.candidates[recordIdx];
    if (!candidate) return;

    // Sort tokens by column index (left to right)
    const sortedTokens = [...recordCellTokens].sort((a, b) => a.columnIndex - b.columnIndex);
    if (sortedTokens.length === 0) return;

    // Get visible fields for current record type
    const visibleFields = getCustomFieldsForType(recordType);
    if (visibleFields.length === 0) return;

    // Distribute tokens across fields: assign each token to the next field in order
    const newFields: Record<string, string> = {};
    const newClaimed = new Map<string, string>();
    const fieldCount = visibleFields.length;
    const tokenCount = sortedTokens.length;

    // If we have more fields than tokens, assign one token per field from left
    // If we have more tokens than fields, group extras into the last field (notes)
    for (let i = 0; i < Math.min(tokenCount, fieldCount); i++) {
      const fieldKey = visibleFields[i].key;
      newFields[fieldKey] = sortedTokens[i].text;
      newClaimed.set(sortedTokens[i].text.toLowerCase().trim(), fieldKey);
    }

    // Overflow tokens go to the last field (usually 'notes')
    if (tokenCount > fieldCount) {
      const lastField = visibleFields[fieldCount - 1].key;
      const overflow = sortedTokens.slice(fieldCount - 1).map(t => t.text).join(' ');
      newFields[lastField] = overflow;
    }

    setRecords((prev) => {
      const next = [...prev];
      next[recordIdx] = {
        ...next[recordIdx],
        fields: { ...next[recordIdx].fields, ...newFields },
      };
      return next;
    });
    setClaimedValues(newClaimed);
  }, [recordCandidates, recordCellTokens, recordType]);

  // --- Auto-save draft (debounced) ---
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    // Don't auto-save if finalized, no records, or no churchId/jobId
    if (isFinalized || records.length === 0 || !churchId || !jobId) return;

    const serialized = JSON.stringify(records.map(r => r.fields));
    // Skip if nothing changed since last save
    if (serialized === lastSavedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/save-draft`, {
          records: records.map(r => ({ fields: r.fields, sourceRowIndex: r.sourceRowIndex })),
          recordType,
        });
        lastSavedRef.current = serialized;
      } catch (err) {
        console.warn('[FieldMappingPanel] Auto-save draft failed:', err);
      }
    }, 1500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [records, isFinalized, churchId, jobId, recordType]);

  const handleFinalize = useCallback(async () => {
    if (isFinalized || recordType === 'unknown') return;

    const selectedRecords = records.filter((r) => r.selected);
    if (selectedRecords.length === 0) {
      setSnackbar({ open: true, message: 'No records selected', severity: 'error' });
      return;
    }

    setFinalizing(true);
    try {
      if (selectedRecords.length === 1) {
        // Single record — use existing endpoint
        const rec = selectedRecords[0];
        const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/finalize`, {
          record_type: rec.recordType || recordType,
          mappedFields: rec.fields,
        });
        const data = res?.data || res;
        setIsFinalized(true);
        setLocalFinalizedMeta({ finalizedAt: new Date().toISOString(), createdRecordId: data.createdRecordId });
        setSnackbar({
          open: true,
          message: `Created 1 ${data.record_type} record (record #${data.createdRecordId})`,
          severity: 'success',
        });
        onFinalized?.({ recordId: data.createdRecordId, recordType: data.record_type });
      } else {
        // Batch finalize
        const payload = {
          records: selectedRecords.map((r) => ({
            record_type: r.recordType || recordType,
            mappedFields: r.fields,
          })),
        };
        const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/finalize-batch`, payload);
        const data = res?.data || res;
        setIsFinalized(true);
        setLocalFinalizedMeta({ finalizedAt: new Date().toISOString(), createdRecordId: data.created_records?.[0]?.recordId || 0 });
        setSnackbar({
          open: true,
          message: `Created ${data.created_count} record(s) in om_church_${churchId}`,
          severity: 'success',
        });
        onFinalized?.({ created_count: data.created_count });
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.error || err?.message || 'Finalize failed',
        severity: 'error',
      });
    }
    setFinalizing(false);
  }, [jobId, churchId, recordType, records, isFinalized, onFinalized]);

  // Entity type icon helper
  const entityIcon = (type: EntityType) => {
    switch (type) {
      case 'name': return <IconUser size={14} />;
      case 'date': return <IconCalendar size={14} />;
      case 'number': return <IconHash size={14} />;
      case 'address': return <IconMapPin size={14} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        <Stack spacing={2}>
          {/* Finalized banner */}
          {isFinalized && localFinalizedMeta && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Already finalized on {new Date(localFinalizedMeta.finalizedAt).toLocaleString()}
              {localFinalizedMeta.createdRecordId > 0 && <>{' — record #'}{localFinalizedMeta.createdRecordId}</>}
            </Alert>
          )}

          {/* Detection summary */}
          {hasMultiRecords && recordCandidates && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600}>
                  {recordCandidates.candidates.length} record{recordCandidates.candidates.length !== 1 ? 's' : ''} found
                </Typography>
                {recordCandidates.detectedType && recordCandidates.detectedType !== 'unknown' && (
                  <Chip
                    size="small"
                    label={`${recordCandidates.detectedType} (${Math.round(recordCandidates.typeConfidence * 100)}%)`}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {recordCandidates.unmappedColumns.length > 0 && (
                  <Chip
                    size="small"
                    label={`${recordCandidates.unmappedColumns.length} unmapped col(s)`}
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Paper>
          )}

          {/* Auto-extracting loading state */}
          {autoExtracting && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
              <CircularProgress size={28} sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight={600}>
                Auto-detecting records...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Analyzing page layout and extracting record areas
              </Typography>
            </Paper>
          )}

          {/* Records need review banner */}
          {!autoExtracting && needsReview && onOpenLayoutWizard && !isFinalized && (
            <Alert
              severity="warning"
              icon={<IconColumns size={20} />}
              action={
                <Button
                  color="warning"
                  size="small"
                  variant="outlined"
                  onClick={onOpenLayoutWizard}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Review Records
                </Button>
              }
              sx={{ borderRadius: 2 }}
            >
              <Typography variant="body2" fontWeight={600}>
                Records need review
              </Typography>
              <Typography variant="caption">
                Auto-detection may have missed some records or mapped fields incorrectly. Use the guided wizard to verify and improve results.
              </Typography>
            </Alert>
          )}

          {/* Record Type Selector */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <FormControl fullWidth size="small">
                <InputLabel id="fmp-record-type-label">Record Type</InputLabel>
                <Select
                  labelId="fmp-record-type-label"
                  value={recordType}
                  label="Record Type"
                  onChange={(e) => handleRecordTypeChange(e.target.value)}
                  disabled={isFinalized}
                >
                  <MenuItem value="baptism">Baptism</MenuItem>
                  <MenuItem value="marriage">Marriage</MenuItem>
                  <MenuItem value="funeral">Funeral</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Configure field labels and visibility">
                <IconButton size="small" onClick={() => setFieldConfigOpen(true)}>
                  <IconSettings size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
            {recordType === 'unknown' && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                Record type could not be determined. Please select one above before finalizing.
              </Typography>
            )}
          </Paper>

          {/* Record Cards */}
          {records.map((rec, idx) => (
            <Accordion
              key={idx}
              expanded={expandedIdx === idx}
              onChange={(_, expanded) => handleAccordionChange(idx, expanded)}
              variant="outlined"
              disableGutters
              sx={{ borderRadius: '8px !important', '&:before': { display: 'none' } }}
            >
              <AccordionSummary
                expandIcon={<IconChevronDown size={18} />}
                sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1, my: 0.5 } }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={rec.selected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggleSelect(idx)}
                      disabled={isFinalized}
                    />
                  }
                  label=""
                  sx={{ mr: 0 }}
                />
                <Typography variant="body2" fontWeight={600}>
                  Record {idx + 1}
                </Typography>
                {rec.sourceRowIndex >= 0 && (
                  <Chip size="small" label={`Row ${rec.sourceRowIndex}`} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
                {rec.confidence > 0 && (
                  <Chip
                    size="small"
                    label={`${Math.round(rec.confidence * 100)}%`}
                    color={rec.confidence > 0.7 ? 'success' : rec.confidence > 0.4 ? 'warning' : 'error'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
                {rec.needsReview && (
                  <IconAlertTriangle size={16} color={theme.palette.warning.main} />
                )}
                {onRejectRecord && !isFinalized && rec.sourceRowIndex >= 0 && (
                  <Tooltip title="Not a record — reject and re-extract">
                    <Box
                      component="span"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onRejectRecord(rec.sourceRowIndex);
                      }}
                      sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', ml: 0.5, '&:hover': { color: 'error.main' } }}
                    >
                      <IconBan size={16} />
                    </Box>
                  </Tooltip>
                )}
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1.5}>
                  {/* Smart Fill button */}
                  {expandedIdx === idx && recordCellTokens.length > 0 && !isFinalized && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<IconWand size={16} />}
                      onClick={() => handleSmartFill(idx)}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      Smart Fill ({recordCellTokens.length} tokens)
                    </Button>
                  )}
                  {/* Split warning banner */}
                  {expandedIdx === idx && fieldSuggestions?.splitWarning && (
                    <Alert severity="warning" sx={{ borderRadius: 1.5, py: 0.5 }}>
                      <Typography variant="caption" fontWeight={600}>
                        Possible merged records
                      </Typography>
                      <Typography variant="caption" display="block">
                        Found {fieldSuggestions.nameCount} name(s) but this record type expects {fieldSuggestions.expectedNameFields}. This record may contain data from multiple records.
                      </Typography>
                    </Alert>
                  )}
                  {fields.map((f) => {
                    const isFocused = expandedIdx === idx && externalFocusedField === f.key;
                    const showSuggestions = isFocused && fieldSuggestions?.fieldKey === f.key && fieldSuggestions.suggestions.length > 0;
                    const isDateField = FIELD_ENTITY_MAP[f.key] === 'date';
                    const fieldValue = rec.fields[f.key] || '';
                    const dateError = isDateField && fieldValue ? validateDate(fieldValue) : null;

                    // OCR token chips for this field
                    const availableTokens = expandedIdx === idx && recordCellTokens.length > 0
                      ? getAvailableTokens(f.key, isDateField)
                      : [];

                    return (
                      <Box key={f.key}>
                        <TextField
                          label={f.label + (f.required ? ' *' : '')}
                          size="small"
                          fullWidth
                          value={fieldValue}
                          onChange={(e) => handleFieldChange(idx, f.key, e.target.value)}
                          onFocus={() => onFieldFocus?.(f.key)}
                          onBlur={() => {
                            // Only clear if this field is still the focused one
                            if (externalFocusedField === f.key) onFieldFocus?.(null);
                          }}
                          disabled={isFinalized}
                          error={!!dateError}
                          helperText={dateError}
                          InputLabelProps={{ shrink: true }}
                          sx={isFocused ? {
                            '& .MuiOutlinedInput-root': {
                              borderColor: 'primary.main',
                              boxShadow: (t: any) => `0 0 0 2px ${t.palette.primary.main}40`,
                            },
                          } : undefined}
                        />
                        {/* OCR token chips — always visible when record is expanded */}
                        {availableTokens.length > 0 && !isFinalized && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {availableTokens.slice(0, 6).map((t, ti) => {
                              const isSelected = fieldValue.trim().toLowerCase() === t.text.toLowerCase();
                              const chipColor = t.confidence != null
                                ? (t.confidence > 0.9 ? 'success' : t.confidence > 0.7 ? 'warning' : 'error')
                                : 'default';
                              return (
                                <Chip
                                  key={ti}
                                  label={t.text.length > 30 ? t.text.substring(0, 30) + '...' : t.text}
                                  size="small"
                                  variant={isSelected ? 'filled' : 'outlined'}
                                  color={isSelected ? 'primary' : chipColor as any}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleClaimToken(idx, f.key, t.text)}
                                  sx={{
                                    cursor: 'pointer',
                                    fontSize: '0.7rem',
                                    height: 24,
                                  }}
                                />
                              );
                            })}
                          </Box>
                        )}
                        {/* Entity-based suggestion chips (shown on focus) */}
                        {showSuggestions && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {fieldSuggestions!.suggestions
                              .filter(s => !FIELD_ENTITY_MAP[f.key] || s.entityType === FIELD_ENTITY_MAP[f.key])
                              .slice(0, 4).map((s, si) => (
                              <Chip
                                key={`sug-${si}`}
                                icon={entityIcon(s.entityType) || undefined}
                                label={s.text.length > 35 ? s.text.substring(0, 35) + '...' : s.text}
                                size="small"
                                variant={s.score > 0.6 ? 'filled' : 'outlined'}
                                color={s.score > 0.6 ? 'primary' : 'default'}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  handleClaimToken(idx, f.key, s.text);
                                }}
                                sx={{
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                  height: 24,
                                  borderStyle: s.score > 0.6 ? 'solid' : 'dashed',
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Box>

      {/* Finalize button */}
      <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          variant="contained"
          fullWidth
          disabled={finalizing || isFinalized || recordType === 'unknown' || selectedCount === 0}
          onClick={handleFinalize}
          startIcon={finalizing ? <CircularProgress size={16} color="inherit" /> : <IconSend size={18} />}
          sx={{ fontWeight: 700, py: 1.2 }}
        >
          {finalizing
            ? 'Finalizing...'
            : isFinalized
              ? 'Already Finalized'
              : `Finalize ${selectedCount} Selected Record${selectedCount !== 1 ? 's' : ''}`}
        </Button>
      </Box>

      <FieldConfigDialog
        open={fieldConfigOpen}
        onClose={() => setFieldConfigOpen(false)}
        recordType={recordType}
        onSaved={() => setFieldConfigVersion(v => v + 1)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FieldMappingPanel;
