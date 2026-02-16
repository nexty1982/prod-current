/**
 * Layout Template Editor — Visual column boundary editor for OCR templates.
 *
 * Route:  /devel/ocr-studio/layout-templates
 *
 * Allows super admins to create/edit layout templates with draggable column
 * boundaries on a reference image. Templates define column bands used by
 * the table extraction pipeline for different physical record formats.
 */

import { apiClient } from '@/shared/lib/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconDeviceFloppy,
  IconLayout,
  IconPlus,
  IconPlayerPlay,
  IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import OcrStudioNav from '../components/OcrStudioNav';
import ColumnBoundaryEditor, {
  type ColumnBand,
  boundariesToBands,
} from '../components/ColumnBoundaryEditor';

// ── Types ────────────────────────────────────────────────────────────────────

interface TemplateField {
  name: string;
  key: string;
  field_type: string;
  column_index: number;
  sort_order: number;
}

interface LayoutTemplate {
  id: number;
  name: string;
  description: string | null;
  record_type: string;
  column_bands: ColumnBand[] | null;
  header_y_threshold: number;
  preview_job_id: number | null;
  is_default: number;
  church_id: number | null;
  fields?: TemplateField[];
  field_count?: number;
  created_at: string;
  updated_at: string;
}

interface JobOption {
  id: number;
  filename: string;
  church_name: string;
  record_type: string;
}

interface PreviewRow {
  row_index: number;
  type: string;
  cells: Array<{
    column_index: number;
    content: string;
    confidence?: number | null;
    token_count?: number;
  }>;
}

const RECORD_TYPES = ['marriage', 'baptism', 'funeral', 'custom'];

const LayoutTemplateEditorPage: React.FC = () => {
  const theme = useTheme();

  // Template list
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Editor state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recordType, setRecordType] = useState('marriage');
  const [columnBands, setColumnBands] = useState<ColumnBand[]>([]);
  const [headerY, setHeaderY] = useState(0.15);
  const [isDefault, setIsDefault] = useState(false);
  const [fields, setFields] = useState<TemplateField[]>([]);

  // Reference job
  const [refJobId, setRefJobId] = useState<number | null>(null);
  const [refJobs, setRefJobs] = useState<JobOption[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Preview
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewCols, setPreviewCols] = useState(0);
  const [previewing, setPreviewing] = useState(false);

  // Saving
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' | 'info' } | null>(null);

  // ── Load templates ────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/api/ocr/layout-templates');
      const data = res?.data ?? res;
      setTemplates(data.templates || []);
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to load templates', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Load reference jobs for job picker ─────────────────────────────────────

  const fetchRefJobs = useCallback(async () => {
    try {
      const res: any = await apiClient.get(`/api/ocr/table-jobs?pageSize=100&record_type=${recordType}`);
      const data = res?.data ?? res;
      setRefJobs(
        (data.rows || []).map((j: any) => ({
          id: j.id,
          filename: j.filename,
          church_name: j.church_name,
          record_type: j.record_type,
        })),
      );
    } catch { /* ignore */ }
  }, [recordType]);

  useEffect(() => { fetchRefJobs(); }, [fetchRefJobs]);

  // ── Load image when ref job changes ────────────────────────────────────────

  useEffect(() => {
    if (refJobId) {
      // Determine church_id from the job list
      const job = refJobs.find((j) => j.id === refJobId);
      if (job) {
        // Use the OCR job image endpoint
        setImageUrl(`/api/church/46/ocr/jobs/${refJobId}/image`);
      } else {
        setImageUrl(null);
      }
    } else {
      setImageUrl(null);
    }
  }, [refJobId, refJobs]);

  // ── Select a template ──────────────────────────────────────────────────────

  const handleSelectTemplate = useCallback(
    async (id: number | null) => {
      setSelectedId(id);
      setPreviewRows([]);
      setPreviewCols(0);

      if (!id) {
        // New template
        setName('');
        setDescription('');
        setRecordType('marriage');
        setColumnBands([]);
        setHeaderY(0.15);
        setIsDefault(false);
        setFields([]);
        setRefJobId(null);
        setDirty(false);
        return;
      }

      try {
        const res: any = await apiClient.get(`/api/ocr/layout-templates/${id}`);
        const data = res?.data ?? res;
        const tpl = data.template;
        setName(tpl.name || '');
        setDescription(tpl.description || '');
        setRecordType(tpl.record_type || 'marriage');
        setColumnBands(tpl.column_bands || []);
        setHeaderY(tpl.header_y_threshold || 0.15);
        setIsDefault(!!tpl.is_default);
        setFields(tpl.fields || []);
        setRefJobId(tpl.preview_job_id || null);
        setDirty(false);
      } catch (e: any) {
        setToast({ msg: e?.response?.data?.error || 'Failed to load template', severity: 'error' });
      }
    },
    [],
  );

  // ── Sync fields with column bands ──────────────────────────────────────────

  const handleBandsChange = useCallback(
    (bands: ColumnBand[]) => {
      setColumnBands(bands);
      setDirty(true);
      // Auto-sync fields array to match band count
      setFields((prev) => {
        const newFields: TemplateField[] = [];
        for (let i = 0; i < bands.length; i++) {
          const existing = prev.find((f) => f.column_index === i);
          newFields.push({
            name: existing?.name || `Column ${i + 1}`,
            key: existing?.key || `col_${i + 1}`,
            field_type: existing?.field_type || 'text',
            column_index: i,
            sort_order: i,
          });
        }
        return newFields;
      });
    },
    [],
  );

  const handleHeaderYChange = useCallback((y: number) => {
    setHeaderY(y);
    setDirty(true);
  }, []);

  const handleFieldNameChange = useCallback((index: number, newName: string) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, name: newName, key: newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') } : f,
      ),
    );
    setDirty(true);
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setToast({ msg: 'Template name is required', severity: 'error' });
      return;
    }
    if (columnBands.length === 0) {
      setToast({ msg: 'Add at least one column boundary', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        record_type: recordType,
        column_bands: columnBands,
        header_y_threshold: headerY,
        preview_job_id: refJobId,
        is_default: isDefault,
        fields,
      };

      if (selectedId) {
        await apiClient.put(`/api/ocr/layout-templates/${selectedId}`, payload);
        setToast({ msg: 'Template saved', severity: 'success' });
      } else {
        const res: any = await apiClient.post('/api/ocr/layout-templates', payload);
        const data = res?.data ?? res;
        setSelectedId(data.template_id);
        setToast({ msg: 'Template created', severity: 'success' });
      }

      setDirty(false);
      fetchTemplates();
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [name, description, recordType, columnBands, headerY, refJobId, isDefault, fields, selectedId, fetchTemplates]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this layout template?')) return;

    try {
      await apiClient.delete(`/api/ocr/layout-templates/${selectedId}`);
      setToast({ msg: 'Template deleted', severity: 'success' });
      handleSelectTemplate(null);
      fetchTemplates();
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to delete', severity: 'error' });
    }
  }, [selectedId, fetchTemplates, handleSelectTemplate]);

  // ── Preview extraction ─────────────────────────────────────────────────────

  const handlePreview = useCallback(async () => {
    if (!selectedId || !refJobId) {
      setToast({ msg: 'Save template and select a reference job first', severity: 'error' });
      return;
    }

    setPreviewing(true);
    try {
      const res: any = await apiClient.post(`/api/ocr/layout-templates/${selectedId}/preview`, {
        job_id: refJobId,
      });
      const data = res?.data ?? res;
      const extraction = data.extraction;
      if (extraction?.tables?.length > 0) {
        const table = extraction.tables[0];
        setPreviewRows(table.rows || []);
        setPreviewCols(table.column_count || 0);
        setToast({ msg: `Preview: ${extraction.data_rows} rows, ${extraction.columns_detected} columns`, severity: 'success' });
      } else {
        setPreviewRows([]);
        setPreviewCols(0);
        setToast({ msg: 'No rows extracted — adjust column boundaries', severity: 'info' });
      }
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Preview failed', severity: 'error' });
    } finally {
      setPreviewing(false);
    }
  }, [selectedId, refJobId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageContainer title="Layout Template Editor" description="Visual column boundary editor for OCR layout templates">
      <OcrStudioNav />
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconLayout size={24} />
            <Typography variant="h5" fontWeight={700}>Layout Template Editor</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {dirty && <Chip label="Unsaved" color="warning" size="small" />}
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconPlus size={16} />}
              onClick={() => handleSelectTemplate(null)}
            >
              New
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={16} />}
              onClick={handleSave}
              disabled={saving}
            >
              Save
            </Button>
            {selectedId && (
              <Button size="small" color="error" variant="outlined" startIcon={<IconTrash size={16} />} onClick={handleDelete}>
                Delete
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Template selector + metadata */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                select
                size="small"
                label="Template"
                value={selectedId ?? ''}
                onChange={(e) => handleSelectTemplate(e.target.value ? Number(e.target.value) : null)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">-- New Template --</MenuItem>
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name} {t.is_default ? '(default)' : ''} — {t.record_type}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Name"
                value={name}
                onChange={(e) => { setName(e.target.value); setDirty(true); }}
                sx={{ minWidth: 200 }}
              />
              <TextField
                select
                size="small"
                label="Record Type"
                value={recordType}
                onChange={(e) => { setRecordType(e.target.value); setDirty(true); }}
                sx={{ minWidth: 140 }}
              >
                {RECORD_TYPES.map((rt) => (
                  <MenuItem key={rt} value={rt}>{rt}</MenuItem>
                ))}
              </TextField>
              <Autocomplete
                size="small"
                options={refJobs}
                getOptionLabel={(o) => `#${o.id} — ${o.filename || 'unnamed'} (${o.church_name})`}
                value={refJobs.find((j) => j.id === refJobId) || null}
                onChange={(_, v) => { setRefJobId(v?.id ?? null); setDirty(true); }}
                renderInput={(params) => <TextField {...params} label="Reference Job" placeholder="Select a job for image" />}
                sx={{ minWidth: 300 }}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Main editor area: image + column fields */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 500 }}>
          {/* Left: Column Boundary Editor */}
          <Box sx={{ flex: 2, minHeight: 400 }}>
            <Card sx={{ height: '100%' }}>
              {imageUrl ? (
                <ColumnBoundaryEditor
                  imageUrl={imageUrl}
                  columnBands={columnBands}
                  headerY={headerY}
                  onBandsChange={handleBandsChange}
                  onHeaderYChange={handleHeaderYChange}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
                  <Typography color="text.secondary">
                    Select a reference job to load an image for visual column editing.
                  </Typography>
                </Box>
              )}
            </Card>
          </Box>

          {/* Right: Column fields + preview */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            {/* Column fields */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Column Fields ({fields.length})
                </Typography>
                {fields.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Add column boundaries on the image to define columns.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {fields.map((field, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={i + 1}
                          size="small"
                          sx={{ minWidth: 28, fontWeight: 700 }}
                        />
                        <TextField
                          size="small"
                          value={field.name}
                          onChange={(e) => handleFieldNameChange(i, e.target.value)}
                          fullWidth
                          placeholder={`Column ${i + 1}`}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Preview extraction */}
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Preview Extraction</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={previewing ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                    onClick={handlePreview}
                    disabled={previewing || !selectedId || !refJobId}
                  >
                    Preview
                  </Button>
                </Stack>

                {!selectedId && (
                  <Typography variant="body2" color="text.secondary">Save the template first to enable preview.</Typography>
                )}

                {previewRows.length > 0 && (
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, mt: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.65rem' }}>Row</TableCell>
                          {fields.map((f, i) => (
                            <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                              {f.name}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewRows
                          .filter((r) => r.type === 'row')
                          .slice(0, 20)
                          .map((row) => (
                            <TableRow key={row.row_index}>
                              <TableCell sx={{ fontSize: '0.7rem' }}>{row.row_index}</TableCell>
                              {row.cells.map((cell, ci) => (
                                <TableCell key={ci} sx={{ fontSize: '0.7rem', maxWidth: 150 }}>
                                  <Tooltip title={cell.content || 'empty'}>
                                    <Typography variant="body2" fontSize="0.7rem" noWrap>
                                      {cell.content || <em style={{ color: theme.palette.text.disabled }}>—</em>}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {previewRows.length === 0 && selectedId && refJobId && !previewing && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Click Preview to test extraction with current column boundaries.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>

        {/* Toast */}
        <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.msg}</Alert> : undefined}
        </Snackbar>
      </Box>
    </PageContainer>
  );
};

export default LayoutTemplateEditorPage;
