/**
 * Record Creation Wizard — Production-grade wizard for creating sacramental records.
 * Supports: Baptism, Marriage, Funeral
 * Modes: Manual single, Manual batch, Auto-generated batch, Template-based
 *
 * Uses: POST /api/admin/record-wizard/preview, /validate, /create, /presets
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import * as XLSX from 'xlsx';
import type { Church, FieldConfig, WizardState, Preset, RecordType } from './recordWizardTypes';
import { RECORD_TYPE_META, STEPS, today, yearAgo, apiJson } from './recordWizardTypes';
import WizardConfigureStep from './WizardConfigureStep';
import WizardPreviewStep from './WizardPreviewStep';
import WizardCreateStep from './WizardCreateStep';

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Developer Tools' },
  { title: 'Record Creation Wizard' },
];

// ============================================================================
// WIZARD COMPONENT
// ============================================================================
export default function RecordCreationWizard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Wizard step
  const [activeStep, setActiveStep] = useState(0);

  // Wizard state
  const [state, setState] = useState<WizardState>({
    recordType: '',
    church: null,
    mode: 'auto',
    count: 25,
    dateStart: yearAgo,
    dateEnd: today,
    distribution: 'random',
    maxPerDay: 3,
    overrides: {},
    records: [],
    validationIssues: [],
  });

  // Data
  const [churches, setChurches] = useState<Church[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(true);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [clergyOptions, setClergyOptions] = useState<string[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [outputFormat, setOutputFormat] = useState<'database' | 'csv' | 'xlsx'>('database');
  const [editRowData, setEditRowData] = useState<Record<string, any>>({});
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Load churches on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiJson('/api/admin/record-wizard/churches');
        setChurches(res.churches || []);
      } catch { setChurches([]); }
      finally { setLoadingChurches(false); }
    })();
  }, []);

  // Load field config when record type changes
  useEffect(() => {
    if (!state.recordType) return;
    (async () => {
      try {
        const res = await apiJson(`/api/admin/record-wizard/config/${state.recordType}`);
        setFieldConfigs(res.fields || []);
        setClergyOptions(res.clergyOptions || []);
      } catch (err) {
        console.error('Failed to load field config:', err);
      }
    })();
  }, [state.recordType]);

  // Load presets
  useEffect(() => {
    if (!state.recordType) return;
    (async () => {
      try {
        const res = await apiJson(`/api/admin/record-wizard/presets?record_type=${state.recordType}`);
        setPresets(res.presets || []);
      } catch { setPresets([]); }
    })();
  }, [state.recordType]);

  // Updater
  const updateState = useCallback((patch: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  // ============================================================================
  // GENERATE PREVIEW
  // ============================================================================
  const handleGeneratePreview = useCallback(async () => {
    setLoading(true);
    try {
      if (state.mode === 'single') {
        // Single manual record: use overrides as the record
        const record = { ...state.overrides, church_id: state.church!.id };
        const valRes = await apiJson('/api/admin/record-wizard/validate', {
          method: 'POST',
          body: JSON.stringify({ record_type: state.recordType, records: [record] }),
        });
        updateState({
          records: [record],
          validationIssues: valRes.issues || [],
        });
      } else {
        // Batch / auto generation
        const res = await apiJson('/api/admin/record-wizard/preview', {
          method: 'POST',
          body: JSON.stringify({
            record_type: state.recordType,
            church_id: state.church!.id,
            count: state.count,
            date_start: state.dateStart,
            date_end: state.dateEnd,
            distribution: state.distribution,
            max_per_day: state.maxPerDay,
            overrides: state.overrides,
          }),
        });
        updateState({
          records: res.records || [],
          validationIssues: res.validation?.issues || [],
        });
      }
    } catch (err: any) {
      setToast({ msg: 'Preview generation failed', severity: 'error' });
    }
    setLoading(false);
  }, [state, updateState]);

  // ============================================================================
  // CREATE RECORDS
  // ============================================================================
  const handleCreate = useCallback(async () => {
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await apiJson('/api/admin/record-wizard/create', {
        method: 'POST',
        body: JSON.stringify({
          record_type: state.recordType,
          church_id: state.church!.id,
          records: state.records,
        }),
      });
      if (res.success) {
        setCreateResult(res);
        setToast({ msg: `Created ${res.inserted} ${state.recordType} records`, severity: 'success' });
        setActiveStep(5); // Move to summary step
      } else {
        setToast({ msg: res.error || 'Creation failed', severity: 'error' });
        if (res.issues) {
          updateState({ validationIssues: res.issues });
        }
      }
    } catch (err: any) {
      setToast({ msg: 'Creation failed: ' + (err.message || 'Unknown error'), severity: 'error' });
    }
    setCreating(false);
  }, [state, updateState]);

  // ============================================================================
  // PRESET OPERATIONS
  // ============================================================================
  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) return;
    try {
      await apiJson('/api/admin/record-wizard/presets', {
        method: 'POST',
        body: JSON.stringify({
          name: presetName.trim(),
          record_type: state.recordType,
          church_id: state.church?.id || null,
          preset_json: {
            count: state.count,
            dateStart: state.dateStart,
            dateEnd: state.dateEnd,
            distribution: state.distribution,
            maxPerDay: state.maxPerDay,
            overrides: state.overrides,
            mode: state.mode,
          },
        }),
      });
      setToast({ msg: 'Preset saved', severity: 'success' });
      setPresetDialogOpen(false);
      setPresetName('');
      // Reload presets
      const res = await apiJson(`/api/admin/record-wizard/presets?record_type=${state.recordType}`);
      setPresets(res.presets || []);
    } catch {
      setToast({ msg: 'Failed to save preset', severity: 'error' });
    }
  }, [presetName, state]);

  const handleLoadPreset = useCallback((preset: Preset) => {
    const cfg = typeof preset.preset_json === 'string' ? JSON.parse(preset.preset_json) : preset.preset_json;
    updateState({
      count: cfg.count || 25,
      dateStart: cfg.dateStart || yearAgo,
      dateEnd: cfg.dateEnd || today,
      distribution: cfg.distribution || 'random',
      maxPerDay: cfg.maxPerDay || 3,
      overrides: cfg.overrides || {},
      mode: cfg.mode || 'auto',
    });
    setToast({ msg: `Loaded preset: ${preset.name}`, severity: 'info' });
  }, [updateState]);

  const handleDeletePreset = useCallback(async (id: number) => {
    try {
      await apiJson(`/api/admin/record-wizard/presets/${id}`, { method: 'DELETE' });
      setPresets(prev => prev.filter(p => p.id !== id));
      setToast({ msg: 'Preset deleted', severity: 'info' });
    } catch {
      setToast({ msg: 'Failed to delete preset', severity: 'error' });
    }
  }, []);

  // ============================================================================
  // ROW EDITING
  // ============================================================================
  const handleEditRow = useCallback((idx: number) => {
    setEditingRow(idx);
    setEditRowData({ ...state.records[idx] });
  }, [state.records]);

  const handleSaveRow = useCallback(() => {
    if (editingRow === null) return;
    const updated = [...state.records];
    updated[editingRow] = { ...editRowData };
    updateState({ records: updated });
    setEditingRow(null);
    setEditRowData({});
  }, [editingRow, editRowData, state.records, updateState]);

  const handleDeleteRow = useCallback((idx: number) => {
    const updated = state.records.filter((_, i) => i !== idx);
    updateState({ records: updated });
    // Re-validate
    apiJson('/api/admin/record-wizard/validate', {
      method: 'POST',
      body: JSON.stringify({ record_type: state.recordType, records: updated }),
    }).then(res => {
      updateState({ validationIssues: res.issues || [] });
    }).catch(() => {});
  }, [state.records, state.recordType, updateState]);

  const handleRegenerateRow = useCallback(async (idx: number) => {
    // Generate a single new record and replace
    try {
      const res = await apiJson('/api/admin/record-wizard/preview', {
        method: 'POST',
        body: JSON.stringify({
          record_type: state.recordType,
          church_id: state.church!.id,
          count: 1,
          date_start: state.dateStart,
          date_end: state.dateEnd,
          distribution: 'random',
          max_per_day: 10,
          overrides: state.overrides,
        }),
      });
      if (res.records?.length) {
        const updated = [...state.records];
        updated[idx] = res.records[0];
        updateState({ records: updated });
      }
    } catch { /* ignore */ }
  }, [state, updateState]);

  // ============================================================================
  // DOWNLOAD AS CSV / XLSX
  // ============================================================================
  const handleDownloadFile = useCallback((format: 'csv' | 'xlsx') => {
    if (!state.records.length) return;
    // Build rows using field configs for column ordering and labels
    const headers = fieldConfigs.map(f => f.label);
    const keys = fieldConfigs.map(f => f.key);
    const rows = state.records.map(r => keys.map(k => r[k] ?? ''));

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Records');

    const meta = RECORD_TYPE_META[state.recordType as RecordType];
    const churchName = (state.church?.name || 'records').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${meta?.label || state.recordType}_${churchName}_${state.records.length}`;

    if (format === 'csv') {
      XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, `${filename}.xlsx`, { bookType: 'xlsx' });
    }
    setToast({ msg: `Downloaded ${state.records.length} records as ${format.toUpperCase()}`, severity: 'success' });
    setCreateResult({ downloaded: true, format, count: state.records.length, record_type: meta?.label, church: state.church?.name });
    setActiveStep(5);
  }, [state, fieldConfigs]);

  // ============================================================================
  // STEP VALIDATION
  // ============================================================================
  const canProceed = useMemo(() => {
    switch (activeStep) {
      case 0: return !!state.recordType;
      case 1: return !!state.church;
      case 2: return !!state.mode;
      case 3: return true; // Config step always allows forward (preview validates)
      case 4: return state.records.length > 0 && !state.validationIssues.some(v => v.severity === 'error');
      default: return false;
    }
  }, [activeStep, state]);

  // Preview fields for display
  const previewFields = useMemo(() => {
    return fieldConfigs.filter(f => f.visibleInPreview);
  }, [fieldConfigs]);

  const errorCount = useMemo(() => state.validationIssues.filter(v => v.severity === 'error').length, [state.validationIssues]);
  const warningCount = useMemo(() => state.validationIssues.filter(v => v.severity === 'warning').length, [state.validationIssues]);

  // ============================================================================
  // STEP NAVIGATION
  // ============================================================================
  const handleNext = useCallback(async () => {
    if (activeStep === 3) {
      // Moving from Configure to Preview — generate records
      await handleGeneratePreview();
    }
    setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  }, [activeStep, handleGeneratePreview]);

  const handleBack = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  }, []);

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  // STEP 0: Record Type Selection
  const renderRecordTypeStep = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>Select Record Type</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose the type of sacramental record to create.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {(Object.entries(RECORD_TYPE_META) as [RecordType, typeof RECORD_TYPE_META[RecordType]][]).map(([key, meta]) => (
          <Paper
            key={key}
            onClick={() => updateState({ recordType: key, records: [], validationIssues: [], overrides: {} })}
            elevation={state.recordType === key ? 4 : 1}
            sx={{
              flex: 1,
              p: 3,
              cursor: 'pointer',
              borderRadius: 2,
              border: state.recordType === key ? `2px solid ${meta.color}` : '2px solid transparent',
              bgcolor: state.recordType === key ? alpha(meta.color, isDark ? 0.15 : 0.05) : 'background.paper',
              transition: 'all 0.2s',
              '&:hover': { borderColor: alpha(meta.color, 0.5), transform: 'translateY(-2px)' },
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" sx={{ mb: 1 }}>{meta.icon}</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: meta.color }}>{meta.label}</Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  );

  // STEP 1: Church Selection
  const renderChurchStep = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>Select Church</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Records will be created in the selected church's database.
      </Typography>
      <Autocomplete
        options={churches}
        loading={loadingChurches}
        getOptionLabel={(c) => `[${c.id}] ${c.name}`}
        value={state.church}
        onChange={(_e, v) => updateState({ church: v, records: [], validationIssues: [] })}
        renderInput={(params) => (
          <TextField {...params} placeholder="Search churches..." variant="outlined" />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Box>
              <Typography variant="body1" fontWeight={500}>{option.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {option.id} &bull; DB: {option.database_name || 'N/A'}
              </Typography>
            </Box>
          </li>
        )}
      />
      {state.church && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Selected: <strong>{state.church.name}</strong> (DB: {state.church.database_name || `church_${state.church.id}`})
        </Alert>
      )}
    </Box>
  );

  // STEP 2: Creation Mode
  const renderModeStep = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>Creation Mode</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose how you want to create records.
      </Typography>
      <RadioGroup
        value={state.mode}
        onChange={(e) => updateState({ mode: e.target.value as WizardState['mode'] })}
      >
        {[
          { value: 'auto', label: 'Auto-Generated Batch', desc: 'System generates realistic records within your date range and rules. Best for demo/sample data.' },
          { value: 'single', label: 'Manual Single Record', desc: 'Fill in all fields manually for one record.' },
          { value: 'batch', label: 'Manual Batch Entry', desc: 'Define shared rules and generate multiple records with manual overrides.' },
          { value: 'template', label: 'From Saved Preset', desc: 'Load a previously saved configuration preset.' },
        ].map(opt => (
          <Paper
            key={opt.value}
            sx={{
              mb: 1.5,
              p: 2,
              borderRadius: 2,
              border: state.mode === opt.value ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
              bgcolor: state.mode === opt.value ? alpha(theme.palette.primary.main, isDark ? 0.1 : 0.03) : 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => updateState({ mode: opt.value as WizardState['mode'] })}
          >
            <FormControlLabel
              value={opt.value}
              control={<Radio />}
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>{opt.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{opt.desc}</Typography>
                </Box>
              }
            />
          </Paper>
        ))}
      </RadioGroup>

      {/* Preset loader when template mode selected */}
      {state.mode === 'template' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Available Presets</Typography>
          {presets.length === 0 ? (
            <Alert severity="info">No presets saved for {RECORD_TYPE_META[state.recordType as RecordType]?.label || state.recordType} records.</Alert>
          ) : (
            <Stack spacing={1}>
              {presets.map(p => (
                <Paper key={p.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.record_type}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => handleLoadPreset(p)}>Load</Button>
                    <IconButton size="small" color="error" onClick={() => handleDeletePreset(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );


  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  const renderConfigureStep = () => (
    <WizardConfigureStep
      state={state}
      fieldConfigs={fieldConfigs}
      clergyOptions={clergyOptions}
      updateState={updateState}
      onOpenPresetDialog={() => setPresetDialogOpen(true)}
    />
  );

  const renderPreviewStep = () => (
    <WizardPreviewStep
      state={state}
      loading={loading}
      fieldConfigs={fieldConfigs}
      editingRow={editingRow}
      editRowData={editRowData}
      errorCount={errorCount}
      warningCount={warningCount}
      handleGeneratePreview={handleGeneratePreview}
      handleEditRow={handleEditRow}
      handleSaveRow={handleSaveRow}
      handleDeleteRow={handleDeleteRow}
      handleRegenerateRow={handleRegenerateRow}
      setEditingRow={setEditingRow}
      setEditRowData={setEditRowData}
    />
  );

  const renderCreateStep = () => (
    <WizardCreateStep
      state={state}
      createResult={createResult}
      creating={creating}
      outputFormat={outputFormat}
      errorCount={errorCount}
      warningCount={warningCount}
      setOutputFormat={setOutputFormat}
      handleCreate={handleCreate}
      handleDownloadFile={handleDownloadFile}
      onReset={() => {
        setActiveStep(0);
        setState({
          recordType: '',
          church: null,
          mode: 'auto',
          count: 25,
          dateStart: yearAgo,
          dateEnd: today,
          distribution: 'random',
          maxPerDay: 3,
          overrides: {},
          records: [],
          validationIssues: [],
        });
        setCreateResult(null);
        setOutputFormat('database');
      }}
    />
  );

  const stepContent = [
    renderRecordTypeStep,
    renderChurchStep,
    renderModeStep,
    renderConfigureStep,
    renderPreviewStep,
    renderCreateStep,
  ];

  return (
    <PageContainer title="Record Creation Wizard" description="Create sacramental records with configurable fields and batch generation">
      <Breadcrumb title="Record Creation Wizard" items={BCrumb} />

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          {/* Stepper */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {STEPS.map((label, idx) => (
              <Step key={label} completed={idx < activeStep}>
                <StepLabel
                  sx={{ cursor: idx < activeStep ? 'pointer' : 'default' }}
                  onClick={() => { if (idx < activeStep) setActiveStep(idx); }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step content */}
          <Box sx={{ minHeight: 300 }}>
            {stepContent[activeStep]?.()}
          </Box>

          {/* Navigation */}
          {activeStep < 5 && !createResult && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" justifyContent="space-between">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={handleBack}
                  disabled={activeStep === 0}
                >
                  Back
                </Button>
                {activeStep === 4 ? (
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={() => setActiveStep(5)}
                    disabled={!canProceed}
                    color="primary"
                  >
                    Proceed to Create
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
                    onClick={handleNext}
                    disabled={!canProceed || loading}
                  >
                    {activeStep === 3 ? 'Generate Preview' : 'Next'}
                  </Button>
                )}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Preset Dialog */}
      <Dialog open={presetDialogOpen} onClose={() => setPresetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="e.g., OCA NY Baptism Demo Set"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePreset} disabled={!presetName.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">{toast.msg}</Alert> : undefined}
      </Snackbar>
    </PageContainer>
  );
}
