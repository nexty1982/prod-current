/**
 * MappingTab - Field mapping UI for OCR results to sacramental records
 * Maps extracted text to canonical database fields based on record type
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  IconWand,
  IconTrash,
  IconDeviceFloppy,
  IconFileImport,
  IconLink,
  IconCheck,
  IconAlertCircle,
  IconArrowRight
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import { getDefaultColumns, isDefaultColumn, getRequiredColumns } from '../config/defaultRecordColumns';
import { normalizeOcrLines } from '../utils/ocrTextNormalizer';
import { extractFieldsFromAnchors } from '../utils/ocrAnchorExtractor';
import { mapExtractedFieldsToForm } from '../utils/recordFieldMapper';
import { parseVisionResponse } from '../utils/visionParser';
import type { VisionResponse } from '../types/fusion';
import { getRecordSchema, validateFieldKeys, mapFieldKeyToDbColumn } from '@/shared/recordSchemas/registry';

// Field key to DB column mapping now uses canonical schema registry
// FIELD_TO_COLUMN_MAP removed - use mapFieldKeyToDbColumn() from registry instead

// Field definitions now come from canonical schema registry
// FIELD_DEFINITIONS removed - use getRecordSchema() instead

// Auto-mapping patterns for heuristic extraction
const AUTO_MAP_PATTERNS: Record<string, { pattern: RegExp; priority: number }[]> = {
  dob: [
    { pattern: /born[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 1 },
    { pattern: /birth[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 2 },
    { pattern: /b\.?\s*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 3 }
  ],
  baptism_date: [
    { pattern: /bapti[sz](?:ed|m)[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 1 },
    { pattern: /bapti[sz]m\s*(?:&|and)\s*chrismation[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 2 }
  ],
  marriage_date: [
    { pattern: /married[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 1 },
    { pattern: /marriage[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 2 }
  ],
  death_date: [
    { pattern: /died[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 1 },
    { pattern: /death[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 2 }
  ],
  funeral_date: [
    { pattern: /funeral[:\s]*([A-Za-z]+\.?\s*\d{1,2},?\s*\d{4})/i, priority: 1 }
  ],
  godparents: [
    { pattern: /godparents?[:\s]*([^\n]+)/i, priority: 1 },
    { pattern: /god\s*parents?[:\s]*([^\n]+)/i, priority: 2 },
    { pattern: /sponsors?[:\s]*([^\n]+)/i, priority: 3 }
  ],
  priest: [
    { pattern: /(?:father|fr\.?|rev\.?)\s+([A-Za-z]+\s+[A-Za-z]+)/i, priority: 1 },
    { pattern: /(?:by|officiated)[:\s]*(?:father|fr\.?)\s+([A-Za-z]+)/i, priority: 2 },
    { pattern: /sacraments?\s*(?:by|administered)[:\s]*(?:father|fr\.?)\s+([A-Za-z\s]+)/i, priority: 3 }
  ],
  parish: [
    { pattern: /(?:ss\.?|saints?)\s*([A-Za-z\s&]+)\s*church/i, priority: 1 },
    { pattern: /([A-Za-z\s]+)\s*orthodox\s*church/i, priority: 2 }
  ],
  father_name: [
    { pattern: /son\s*of[:\s]*([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*(?:and|&)/i, priority: 1 },
    { pattern: /daughter\s*of[:\s]*([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*(?:and|&)/i, priority: 2 }
  ],
  mother_name: [
    { pattern: /(?:and|&)\s*([A-Za-z]+(?:\s+\([A-Za-z]+\))?(?:\s+[A-Za-z]+)?)/i, priority: 1 }
  ]
};

interface MappingTabProps {
  jobId: string;
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  ocrText: string | null;
  existingMapping?: any;
  onSaveSuccess?: () => void;
  onSendToReview?: () => void; // Callback to switch to Review & Finalize tab
}

const MappingTab: React.FC<MappingTabProps> = ({
  jobId,
  churchId,
  recordType = 'baptism',
  ocrText,
  ocrResult,
  existingMapping,
  onSaveSuccess,
  onSendToReview
}) => {
  const theme = useTheme();

  // State
  const [mapping, setMapping] = useState<Record<string, { value: string; confidence?: number; bboxIndex?: number }>>({});
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState(false);
  const [sendingToReview, setSendingToReview] = useState(false);
  const [sentToReviewSuccess, setSentToReviewSuccess] = useState(false);

  // Get sticky defaults from localStorage
  const getStickyDefault = (): boolean => {
    try {
      const stored = localStorage.getItem('om.enhancedOcrUploader.stickyDefaults.v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        const key = `${recordType}_records` as 'baptism_records' | 'marriage_records' | 'funeral_records';
        return parsed[key] || false;
      }
    } catch (e) {
      console.warn('Failed to load sticky defaults:', e);
    }
    return false;
  };

  const isStickyEnabled = getStickyDefault();

  // Get field definitions from canonical schema registry
  const fields = useMemo(() => {
    const schema = getRecordSchema(recordType, {
      stickyDefaults: isStickyEnabled,
    });
    
    // Convert schema to field format expected by component
    return schema.map(field => ({
      key: field.key, // Canonical key
      label: field.label,
      type: field.dataType,
      dbColumn: field.dbColumn, // For reference
      required: field.required,
    }));
  }, [recordType, isStickyEnabled]);
  
  // Dev-only validation
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const fieldKeys = Object.keys(mapping);
      if (fieldKeys.length > 0) {
        const validation = validateFieldKeys(recordType, fieldKeys);
        if (!validation.valid) {
          console.warn('[MappingTab] Field key validation failed:', validation.errors);
        }
      }
    }
  }, [mapping, recordType]);

  // Extract tokens/lines from OCR text
  const tokens = ocrText
    ? ocrText.split('\n').filter(line => line.trim().length > 0)
    : [];

  // Load existing mapping on mount (from prop or fetch from API)
  useEffect(() => {
    if (existingMapping?.mappingJson) {
      setMapping(existingMapping.mappingJson);
    } else if (existingMapping?.mapping_json) {
      // Handle snake_case from API
      setMapping(existingMapping.mapping_json);
    }
  }, [existingMapping]);

  // Fetch existing mapping from API on mount
  useEffect(() => {
    const fetchMapping = async () => {
      try {
        const response = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}/mapping`);
        const data = (response as any).data;
        if (data?.mapping_json && Object.keys(data.mapping_json).length > 0) {
          console.log('[MappingTab] Loaded existing mapping:', data.mapping_json);
          setMapping(data.mapping_json);
        }
      } catch (err) {
        // No existing mapping - that's ok
        console.debug('[MappingTab] No existing mapping found');
      }
    };
    fetchMapping();
  }, [churchId, jobId]);

  // Helper function to split a full name into first and last name
  const splitName = useCallback((fullName: string): { firstName: string; lastName: string } => {
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);
    
    if (parts.length === 0) {
      return { firstName: '', lastName: '' };
    }
    
    if (parts.length === 1) {
      // Only one part - assume it's first name
      return { firstName: parts[0], lastName: '' };
    }
    
    // Multiple parts - first part is first name, rest is last name
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    
    return { firstName, lastName };
  }, []);

  // Handle clicking a token to insert into selected field
  const handleTokenClick = useCallback((token: string) => {
    if (selectedField) {
      // Special handling for baptism child_name field - use canonical key
      if (recordType === 'baptism' && selectedField === 'child_name') {
        // For child_name, we store the full name (splitting happens at DB commit)
        setMapping(prev => ({
          ...prev,
          child_name: {
            value: prev.child_name?.value ? `${prev.child_name.value} ${token}` : token,
            confidence: 0.8
          }
        }));
      } else {
        // Default behavior for other fields
        setMapping(prev => ({
          ...prev,
          [selectedField]: {
            value: prev[selectedField]?.value ? `${prev[selectedField].value} ${token}` : token,
            confidence: 0.8
          }
        }));
      }
      
      // Dev-only: validate field key
      if (process.env.NODE_ENV === 'development') {
        const validation = validateFieldKeys(recordType, [selectedField]);
        if (!validation.valid) {
          console.warn(`[MappingTab] Invalid field key from token click: ${selectedField}`, validation.errors);
        }
      }
    }
  }, [selectedField, recordType]);

  // Handle field value change
  const handleFieldChange = useCallback((fieldKey: string, value: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], value }
    }));
  }, []);

  // Auto-map using structured extraction pipeline
  const handleAutoMap = useCallback(() => {
    if (!ocrText) return;

    try {
      // Step 1: Get OCR lines (from Vision JSON if available, otherwise parse text)
      let ocrLines: Array<{ id?: string; text: string; bbox: any; tokens: any[] }> = [];
      
      if (ocrResult) {
        // Use structured Vision response
        const parsed = parseVisionResponse(ocrResult);
        ocrLines = parsed;
      } else {
        // Fallback: create lines from plain text
        const textLines = ocrText.split('\n').filter(l => l.trim());
        ocrLines = textLines.map((text, idx) => ({
          id: `line-${idx}`,
          text,
          bbox: { x: 0, y: idx * 20, w: 100, h: 20 },
          tokens: [],
        }));
      }

      // Step 2: Normalize lines
      const normalizedLines = normalizeOcrLines(ocrLines);

      // Step 3: Extract fields using anchors
      const extracted = extractFieldsFromAnchors(normalizedLines, recordType, 'auto');

      // Step 4: Map extracted fields to form fields
      const mappingResult = mapExtractedFieldsToForm(extracted, recordType);

      // Step 5: Convert to mapping format and apply
      const newMapping: typeof mapping = {};
      const allowedFieldKeys = new Set(fields.map(f => f.key));

      Object.entries(mappingResult.formPatch).forEach(([fieldKey, fieldData]) => {
        // Skip if sticky defaults enabled and field is not in allowed list
        if (isStickyEnabled && !allowedFieldKeys.has(fieldKey)) {
          return;
        }

        // Use canonical field key from schema
        newMapping[fieldKey] = {
          value: fieldData.value,
          confidence: fieldData.confidence,
        };
        
        // Dev-only: validate field key
        if (process.env.NODE_ENV === 'development') {
          const validation = validateFieldKeys(recordType, [fieldKey]);
          if (!validation.valid) {
            console.warn(`[MappingTab] Invalid field key from auto-map: ${fieldKey}`, validation.errors);
          }
        }
      });

      setMapping(newMapping);
      setMappingConfidence(mappingResult.mappingConfidence);

      // Log extraction debug info
      if (process.env.NODE_ENV === 'development') {
        console.log('[MappingTab] Auto-map extraction result:', {
          extracted,
          mappingResult,
          debug: extracted.debug,
        });
      }
    } catch (error) {
      console.error('[MappingTab] Auto-map error:', error);
      // Fallback to old pattern-based approach on error
      const newMapping: typeof mapping = {};
      const allowedFieldKeys = new Set(fields.map(f => f.key));

      Object.entries(AUTO_MAP_PATTERNS).forEach(([fieldKey, patterns]) => {
        if (isStickyEnabled && !allowedFieldKeys.has(fieldKey)) {
          return;
        }

        for (const { pattern } of patterns) {
          const match = ocrText.match(pattern);
          if (match && match[1]) {
            newMapping[fieldKey] = {
              value: match[1].trim(),
              confidence: 0.7
            };
            break;
          }
        }
      });

      // Try to extract names from first few lines (often the name is at the top)
      const lines = ocrText.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        // Look for a line that looks like a name (not a date, not a number)
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i].trim();
          // Skip if it's primarily numbers or looks like a date
          if (/^\d+$/.test(line) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(line)) continue;
          
          // Look for name patterns
          const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+\([A-Z][a-z]+\))?)\s+([A-Z][a-z]+)$/i);
        if (nameMatch) {
          // Only map if fields are allowed
          if (allowedFieldKeys.has('first_name') && !newMapping.first_name) {
            newMapping.first_name = { value: nameMatch[1], confidence: 0.6 };
          }
          if (allowedFieldKeys.has('last_name') && !newMapping.last_name) {
            newMapping.last_name = { value: nameMatch[2], confidence: 0.6 };
          }
          break;
        }
      }
    }

      setMapping(prev => ({ ...prev, ...newMapping }));
      setMappingConfidence(null); // Reset confidence on fallback
    }
  }, [ocrText, ocrResult, recordType, fields, isStickyEnabled]);

  // Clear all mappings
  const handleClearMapping = useCallback(() => {
    setMapping({});
    setSaveSuccess(false);
    setDraftSuccess(false);
  }, []);

  // Save mapping to backend using church-specific endpoint
  const handleSaveMapping = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/mapping`, {
        record_type: recordType,
        mapping_json: mapping
      });

      setSaveSuccess(true);
      onSaveSuccess?.();
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  }, [jobId, churchId, recordType, mapping, onSaveSuccess]);

  // Create draft record
  const handleCreateDraft = useCallback(async () => {
    setCreatingDraft(true);
    setSaveError(null);
    setDraftSuccess(false);

    try {
      // First save the mapping
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/mapping`, {
        record_type: recordType,
        mapping_json: mapping
      });

      // Create fusion draft via church-scoped endpoint
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`, {
        record_type: recordType,
        drafts: [{
          entry_index: 0,
          record_type: recordType,
          payload_json: Object.fromEntries(
            Object.entries(mapping).map(([k, v]) => [k, v.value])
          )
        }]
      });

      setDraftSuccess(true);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to create draft record');
    } finally {
      setCreatingDraft(false);
    }
  }, [jobId, churchId, recordType, mapping]);

  // Send to Review & Finalize - creates a fusion draft and switches tab
  const handleSendToReview = useCallback(async () => {
    setSendingToReview(true);
    setSaveError(null);

    try {
      // Validate required fields are filled
      const requiredFields = getRequiredColumns(recordType);
      const schema = getRecordSchema(recordType);
      const missingFields: string[] = [];

      for (const reqField of requiredFields) {
        // Find the schema field that corresponds to this required DB column
        const schemaField = schema.find(f => f.dbColumn === reqField);
        if (schemaField) {
          const fieldKey = schemaField.key;
          const fieldValue = mapping[fieldKey];
          if (!fieldValue || !fieldValue.value || !fieldValue.value.trim()) {
            // Use schema field label directly (fields might not be in scope in some code paths)
            const fieldLabel = schemaField.label || fieldKey;
            missingFields.push(fieldLabel);
          }
        }
      }

      if (missingFields.length > 0) {
        setSaveError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setSendingToReview(false);
        return;
      }

      // First save the mapping
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/mapping`, {
        record_type: recordType,
        mapping_json: mapping
      });

      // Create a fusion draft from the mapping, mapping field keys to DB column names
      const payload: Record<string, any> = {};
      
      for (const [fieldKey, field] of Object.entries(mapping)) {
        if (field.value && field.value.trim()) {
          // Map field key to database column name
          const dbColumn = fieldMap[fieldKey] || fieldKey;
          payload[dbColumn] = field.value.trim();
        }
      }

      console.log('[MappingTab] Creating fusion draft with payload:', payload);

      const draftResponse = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`,
        {
          entries: [{
            entry_index: 0,
            record_type: recordType,
            payload_json: payload,
            bbox_json: {}
          }]
        }
      );

      console.log('[MappingTab] Draft created:', draftResponse);

      // Mark as ready for review
      await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/ready-for-review`,
        { entry_indexes: [0] }
      );

      console.log('[MappingTab] Marked as ready for review');

      // Show success message briefly
      setSentToReviewSuccess(true);
      setSaveError(null);
      
      // Auto-dismiss success message after 2 seconds
      setTimeout(() => {
        setSentToReviewSuccess(false);
      }, 2000);
      
      // Switch to Review & Finalize tab immediately
      if (onSendToReview) {
        console.log('[MappingTab] Calling onSendToReview callback to switch to Review tab');
        // Small delay to ensure state updates are processed
        setTimeout(() => {
          onSendToReview();
        }, 50);
      } else {
        console.warn('[MappingTab] onSendToReview callback not provided');
      }
    } catch (error: any) {
      console.error('[MappingTab] Send to Review error:', error);
      console.error('[MappingTab] Error response:', error.response?.data);
      
      let errorMessage = 'Failed to send to review';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add more context if available
      if (error.response?.status) {
        errorMessage += ` (Status: ${error.response.status})`;
      }
      
      setSaveError(errorMessage);
      setSentToReviewSuccess(false);
    } finally {
      setSendingToReview(false);
    }
  }, [jobId, churchId, recordType, mapping, onSendToReview, fields]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 2 }}>
      {/* Header Actions */}
      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" fontWeight={600}>
          Map to {(recordType || 'baptism').charAt(0).toUpperCase() + (recordType || 'baptism').slice(1)} Fields
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconWand size={16} />}
            onClick={handleAutoMap}
            disabled={!ocrText}
          >
            Auto-Map
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<IconTrash size={16} />}
            onClick={handleClearMapping}
          >
            Clear
          </Button>
        </Stack>
      </Stack>

      {/* Main Content - Two Column Layout */}
      <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
        {/* Left: Detected Tokens */}
        <Paper
          variant="outlined"
          sx={{
            width: '40%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              DETECTED TEXT (click to insert)
            </Typography>
          </Box>
          <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
            {tokens.map((token, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => handleTokenClick(token)}
                  disabled={!selectedField}
                  sx={{
                    py: 0.75,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08)
                    }
                  }}
                >
                  <ListItemText
                    primary={token}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem'
                    }}
                  />
                  {selectedField && (
                    <IconArrowRight size={14} color={theme.palette.text.secondary} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
            {tokens.length === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  No OCR text available
                </Typography>
              </Box>
            )}
          </List>
        </Paper>

        {/* Right: Field Mapping Form */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              RECORD FIELDS {selectedField && `(selected: ${selectedField})`}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Stack spacing={2}>
              {fields.map((field) => {
                // Use registry to get DB column
                const dbColumn = field.dbColumn || mapFieldKeyToDbColumn(recordType, field.key);
                const requiredColumns = getRequiredColumns(recordType);
                const isRequired = dbColumn && requiredColumns.includes(dbColumn);
                
                return (
                  <Box key={field.key}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={500}>
                        {field.label}
                        {isRequired && (
                          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>
                            *
                          </Typography>
                        )}
                      </Typography>
                      {mapping[field.key]?.confidence !== undefined && (
                        <Chip
                          size="small"
                          label={`${Math.round(mapping[field.key].confidence! * 100)}%`}
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: alpha(
                              mapping[field.key].confidence! > 0.7
                                ? theme.palette.success.main
                                : theme.palette.warning.main,
                              0.1
                            ),
                            color: mapping[field.key].confidence! > 0.7
                              ? theme.palette.success.main
                              : theme.palette.warning.main
                          }}
                        />
                      )}
                    </Stack>
                  <TextField
                    size="small"
                    fullWidth
                    multiline={field.type === 'textarea'}
                    rows={field.type === 'textarea' ? 2 : 1}
                    value={mapping[field.key]?.value || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    onFocus={() => setSelectedField(field.key)}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: selectedField === field.key ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        '&.Mui-focused': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }
                    }}
                    InputProps={{
                      endAdornment: mapping[field.key]?.bboxIndex !== undefined && (
                        <Tooltip title="Linked to bounding box">
                          <IconButton size="small">
                            <IconLink size={14} />
                          </IconButton>
                        </Tooltip>
                      )
                    }}
                  />
                </Box>
                );
              })}
            </Stack>
          </Box>
        </Paper>
      </Box>

      {/* Status Messages */}
      {saveError && (
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}
      {saveSuccess && (
        <Alert severity="success" onClose={() => setSaveSuccess(false)}>
          Mapping saved successfully!
        </Alert>
      )}
      {draftSuccess && (
        <Alert severity="success" onClose={() => setDraftSuccess(false)}>
          Draft record created successfully!
        </Alert>
      )}
      {sentToReviewSuccess && (
        <Alert severity="success" onClose={() => setSentToReviewSuccess(false)}>
          Record sent to Review & Finalize successfully! Switching to Review tab...
        </Alert>
      )}

      {/* Footer Actions */}
      <Divider />
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          startIcon={saving ? <CircularProgress size={16} /> : <IconDeviceFloppy size={18} />}
          onClick={handleSaveMapping}
          disabled={saving || Object.keys(mapping).length === 0}
        >
          {saving ? 'Saving...' : 'Save Mapping'}
        </Button>
        <Button
          variant="outlined"
          startIcon={creatingDraft ? <CircularProgress size={16} color="inherit" /> : <IconFileImport size={18} />}
          onClick={handleCreateDraft}
          disabled={creatingDraft || Object.keys(mapping).length === 0}
        >
          {creatingDraft ? 'Creating...' : 'Create Draft Record'}
        </Button>
        <Button
          variant="contained"
          color="info"
          startIcon={sendingToReview ? <CircularProgress size={16} color="inherit" /> : <IconArrowRight size={18} />}
          onClick={handleSendToReview}
          disabled={sendingToReview || Object.keys(mapping).length === 0}
        >
          {sendingToReview ? 'Sending...' : 'Send to Review & Finalize'}
        </Button>
      </Stack>
    </Box>
  );
};

export default MappingTab;

