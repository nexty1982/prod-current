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
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
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
  ArrowBack,
  ArrowForward,
  Check,
  Close,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Storage as SeedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Developer Tools' },
  { title: 'Record Creation Wizard' },
];

// ============================================================================
// TYPES
// ============================================================================
interface Church {
  id: number;
  name: string;
  database_name?: string;
}

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
  dbColumn: string;
  generationStrategy: string;
  generationDependsOn?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  group?: string;
  displayOrder: number;
  visibleInPreview: boolean;
  dateConstraint?: any;
}

interface ValidationIssue {
  row: number;
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface WizardState {
  recordType: string;
  church: Church | null;
  mode: 'single' | 'batch' | 'auto' | 'template';
  count: number;
  dateStart: string;
  dateEnd: string;
  distribution: 'even' | 'random' | 'seasonal' | 'chronological';
  maxPerDay: number;
  overrides: Record<string, any>;
  records: Record<string, any>[];
  validationIssues: ValidationIssue[];
}

interface Preset {
  id: number;
  name: string;
  record_type: string;
  church_id?: number;
  preset_json: any;
}

type RecordType = 'baptism' | 'marriage' | 'funeral';

const RECORD_TYPE_META: Record<RecordType, { label: string; color: string; icon: string }> = {
  baptism: { label: 'Baptism', color: '#1565c0', icon: '💧' },
  marriage: { label: 'Marriage', color: '#7b1fa2', icon: '💍' },
  funeral: { label: 'Funeral', color: '#455a64', icon: '🕊️' },
};

const STEPS = [
  'Record Type',
  'Church',
  'Creation Mode',
  'Configure',
  'Preview & Validate',
  'Create',
];

const today = new Date().toISOString().split('T')[0];
const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];

// ============================================================================
// API HELPER
// ============================================================================
async function apiJson(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

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

  // STEP 3: Configure
  const renderConfigureStep = () => {
    const meta = RECORD_TYPE_META[state.recordType as RecordType];

    if (state.mode === 'single') {
      // Single record: show all fields as a form
      return (
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Configure {meta?.label} Record
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Fill in the fields for your record. Required fields are marked.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {fieldConfigs.map(field => renderFieldInput(field, state.overrides, (key, val) => {
              updateState({ overrides: { ...state.overrides, [key]: val } });
            }))}
          </Box>
        </Box>
      );
    }

    // Batch / Auto modes
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Configure {meta?.label} Batch Generation
        </Typography>

        {/* Count */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Number of Records</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              type="number"
              size="small"
              value={state.count}
              onChange={(e) => updateState({ count: Math.min(500, Math.max(1, parseInt(e.target.value) || 1)) })}
              inputProps={{ min: 1, max: 500 }}
              sx={{ width: 120 }}
            />
            <Stack direction="row" spacing={1}>
              {[5, 10, 25, 50, 100].map(n => (
                <Chip
                  key={n}
                  label={n}
                  size="small"
                  onClick={() => updateState({ count: n })}
                  variant={state.count === n ? 'filled' : 'outlined'}
                  color={state.count === n ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Stack>
        </Box>

        {/* Date Range */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Date Range</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="date"
              size="small"
              label="Start Date"
              value={state.dateStart}
              onChange={(e) => updateState({ dateStart: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="date"
              size="small"
              label="End Date"
              value={state.dateEnd}
              onChange={(e) => updateState({ dateEnd: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {[
              { label: 'Last Year', start: yearAgo, end: today },
              { label: '2025', start: '2025-01-01', end: '2025-12-31' },
              { label: '2024', start: '2024-01-01', end: '2024-12-31' },
              { label: 'Last 5 Years', start: new Date(Date.now() - 5 * 365 * 86400000).toISOString().split('T')[0], end: today },
              { label: 'Historic (1960-2000)', start: '1960-01-01', end: '2000-12-31' },
            ].map(preset => (
              <Chip
                key={preset.label}
                label={preset.label}
                size="small"
                variant="outlined"
                onClick={() => updateState({ dateStart: preset.start, dateEnd: preset.end })}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>

        {/* Distribution */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Date Distribution</Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={state.distribution}
              onChange={(e) => updateState({ distribution: e.target.value as WizardState['distribution'] })}
            >
              <MenuItem value="random">Natural Randomized</MenuItem>
              <MenuItem value="even">Evenly Distributed</MenuItem>
              <MenuItem value="seasonal">Seasonal Weighted (Spring/Fall heavy)</MenuItem>
              <MenuItem value="chronological">Chronological Sequence</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Max per day */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Max Records Per Day: {state.maxPerDay}
          </Typography>
          <Slider
            value={state.maxPerDay}
            onChange={(_, v) => updateState({ maxPerDay: v as number })}
            min={1}
            max={10}
            step={1}
            marks
            valueLabelDisplay="auto"
            sx={{ maxWidth: 300 }}
          />
        </Box>

        {/* Field overrides */}
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Field Overrides (Optional)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set fixed values for specific fields. Leave empty to auto-generate.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {fieldConfigs.map(field => renderFieldInput(field, state.overrides, (key, val) => {
            const overrides = { ...state.overrides };
            if (val === '' || val === null || val === undefined) {
              delete overrides[key];
            } else {
              overrides[key] = val;
            }
            updateState({ overrides });
          }, true))}
        </Box>

        {/* Preset save */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" variant="outlined" startIcon={<SaveIcon />} onClick={() => setPresetDialogOpen(true)}>
            Save as Preset
          </Button>
        </Box>
      </Box>
    );
  };

  // Field input renderer (config-driven)
  const renderFieldInput = (
    field: FieldConfig,
    values: Record<string, any>,
    onChange: (key: string, val: any) => void,
    isOverride = false
  ) => {
    const val = values[field.key] ?? '';
    const label = isOverride ? `${field.label} (override)` : `${field.label}${field.required ? ' *' : ''}`;

    if (field.type === 'select' && field.options) {
      return (
        <FormControl key={field.key} size="small" fullWidth>
          <InputLabel>{label}</InputLabel>
          <Select
            value={val}
            label={label}
            onChange={(e) => onChange(field.key, e.target.value)}
          >
            {isOverride && <MenuItem value=""><em>Auto-generate</em></MenuItem>}
            {field.options.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (field.generationStrategy === 'clergy') {
      return (
        <Autocomplete
          key={field.key}
          size="small"
          options={clergyOptions}
          value={val || null}
          onChange={(_e, v) => onChange(field.key, v || '')}
          freeSolo
          renderInput={(params) => <TextField {...params} label={label} />}
        />
      );
    }

    return (
      <TextField
        key={field.key}
        size="small"
        fullWidth
        label={label}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={val}
        onChange={(e) => onChange(field.key, e.target.value)}
        InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
        multiline={field.type === 'textarea'}
        rows={field.type === 'textarea' ? 2 : undefined}
        required={!isOverride && field.required}
      />
    );
  };

  // STEP 4: Preview & Validate
  const renderPreviewStep = () => {
    if (loading) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="body1" sx={{ mt: 2 }}>Generating preview...</Typography>
        </Box>
      );
    }

    if (state.records.length === 0) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No records generated. Go back and configure.</Typography>
          <Button sx={{ mt: 2 }} onClick={handleGeneratePreview} startIcon={<RefreshIcon />}>
            Generate Preview
          </Button>
        </Box>
      );
    }

    const meta = RECORD_TYPE_META[state.recordType as RecordType];

    return (
      <Box sx={{ py: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Preview: {state.records.length} {meta?.label} Records
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              {errorCount > 0 && (
                <Chip icon={<ErrorIcon />} label={`${errorCount} error${errorCount > 1 ? 's' : ''}`} size="small" color="error" />
              )}
              {warningCount > 0 && (
                <Chip icon={<WarningIcon />} label={`${warningCount} warning${warningCount > 1 ? 's' : ''}`} size="small" color="warning" />
              )}
              {errorCount === 0 && warningCount === 0 && (
                <Chip icon={<Check />} label="All valid" size="small" color="success" />
              )}
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleGeneratePreview}>
              Regenerate All
            </Button>
          </Stack>
        </Stack>

        {/* Validation issues summary */}
        {state.validationIssues.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {state.validationIssues.slice(0, 10).map((issue, idx) => (
              <Alert
                key={idx}
                severity={issue.severity}
                icon={issue.severity === 'error' ? <ErrorIcon fontSize="small" /> : issue.severity === 'warning' ? <WarningIcon fontSize="small" /> : <InfoIcon fontSize="small" />}
                sx={{ mb: 0.5, py: 0 }}
              >
                <Typography variant="body2">
                  Row {issue.row}: {issue.message}
                  {issue.field !== 'duplicate' && ` (${issue.field})`}
                </Typography>
              </Alert>
            ))}
            {state.validationIssues.length > 10 && (
              <Typography variant="caption" color="text.secondary">
                ...and {state.validationIssues.length - 10} more issues
              </Typography>
            )}
          </Box>
        )}

        {/* Records table */}
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 50 }}>#</TableCell>
                {fieldConfigs.map(f => (
                  <TableCell key={f.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {f.label}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.records.map((record, idx) => {
                const rowIssues = state.validationIssues.filter(v => v.row === idx + 1);
                const hasError = rowIssues.some(v => v.severity === 'error');
                const isEditing = editingRow === idx;

                return (
                  <TableRow
                    key={idx}
                    sx={{
                      bgcolor: hasError ? alpha(theme.palette.error.main, isDark ? 0.1 : 0.04) : undefined,
                    }}
                  >
                    <TableCell>
                      <Typography variant="caption" fontWeight={600}>{idx + 1}</Typography>
                      {hasError && <ErrorIcon fontSize="small" color="error" sx={{ ml: 0.5, fontSize: 14 }} />}
                    </TableCell>
                    {fieldConfigs.map(f => (
                      <TableCell key={f.key} sx={{ fontSize: '0.75rem', maxWidth: 160 }}>
                        {isEditing ? (
                          <TextField
                            size="small"
                            variant="standard"
                            value={editRowData[f.key] ?? ''}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, [f.key]: e.target.value }))}
                            type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                            fullWidth
                            InputProps={{ sx: { fontSize: '0.75rem' } }}
                          />
                        ) : (
                          <Tooltip title={String(record[f.key] || '')}>
                            <Typography variant="body2" fontSize="0.75rem" noWrap>
                              {record[f.key] ?? '—'}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      {isEditing ? (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" color="primary" onClick={handleSaveRow}><Check fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => setEditingRow(null)}><Close fontSize="small" /></IconButton>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleEditRow(idx)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => handleRegenerateRow(idx)}><RefreshIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteRow(idx)}><DeleteIcon fontSize="small" /></IconButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // STEP 5: Create / Summary
  const renderCreateStep = () => {
    if (createResult) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Check sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>Records Created Successfully</Typography>
          <Box sx={{ display: 'inline-block', textAlign: 'left', mt: 2 }}>
            <Stack spacing={1}>
              <Typography variant="body1">Requested: <strong>{createResult.requested}</strong></Typography>
              <Typography variant="body1">Inserted: <strong>{createResult.inserted}</strong></Typography>
              {createResult.skipped > 0 && (
                <Typography variant="body1" color="warning.main">Skipped: <strong>{createResult.skipped}</strong></Typography>
              )}
              <Typography variant="body1">Record Type: <strong>{createResult.record_type}</strong></Typography>
              <Typography variant="body1">Church: <strong>{createResult.church}</strong></Typography>
              <Typography variant="body1">Database: <strong>{createResult.database}</strong></Typography>
            </Stack>
          </Box>
          {createResult.warnings?.length > 0 && (
            <Alert severity="warning" sx={{ mt: 3, maxWidth: 500, mx: 'auto' }}>
              {createResult.warnings.length} warning(s) encountered during creation.
            </Alert>
          )}
          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              onClick={() => {
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
              }}
            >
              Create More Records
            </Button>
          </Box>
        </Box>
      );
    }

    // Confirmation view before create
    const meta = RECORD_TYPE_META[state.recordType as RecordType];
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Confirm & Create</Typography>
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="body1">Record Type: <strong>{meta?.label}</strong></Typography>
            <Typography variant="body1">Church: <strong>{state.church?.name}</strong></Typography>
            <Typography variant="body1">Records to Create: <strong>{state.records.length}</strong></Typography>
            <Typography variant="body1">Date Range: <strong>{state.dateStart} to {state.dateEnd}</strong></Typography>
            {errorCount > 0 && (
              <Alert severity="error">Cannot create — {errorCount} validation error(s) must be resolved first.</Alert>
            )}
            {warningCount > 0 && (
              <Alert severity="warning">{warningCount} warning(s) — records will be created but review recommended.</Alert>
            )}
          </Stack>
        </Paper>
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={handleCreate}
          disabled={creating || errorCount > 0}
          startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <SeedIcon />}
        >
          {creating ? 'Creating...' : `Create ${state.records.length} Records`}
        </Button>
      </Box>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
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
