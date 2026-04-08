/**
 * WizardConfigureStep — Step 3 of RecordCreationWizard.
 * Handles single-record form and batch configuration (count, date range,
 * distribution, max-per-day, field overrides, preset save).
 * Includes the config-driven renderFieldInput helper.
 * Extracted from RecordCreationWizard.tsx
 */
import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import type { FieldConfig, WizardState, RecordType } from './recordWizardTypes';
import { RECORD_TYPE_META, today, yearAgo } from './recordWizardTypes';

interface WizardConfigureStepProps {
  state: WizardState;
  fieldConfigs: FieldConfig[];
  clergyOptions: string[];
  updateState: (patch: Partial<WizardState>) => void;
  onOpenPresetDialog: () => void;
}

// Field input renderer (config-driven)
export function renderFieldInput(
  field: FieldConfig,
  values: Record<string, any>,
  onChange: (key: string, val: any) => void,
  clergyOptions: string[],
  isOverride = false
) {
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
}

const WizardConfigureStep: React.FC<WizardConfigureStepProps> = ({
  state,
  fieldConfigs,
  clergyOptions,
  updateState,
  onOpenPresetDialog,
}) => {
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
          }, clergyOptions))}
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
            {[5, 10, 25, 50, 100, 250, 500].map(n => (
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
        }, clergyOptions, true))}
      </Box>

      {/* Preset save */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="small" variant="outlined" startIcon={<SaveIcon />} onClick={onOpenPresetDialog}>
          Save as Preset
        </Button>
      </Box>
    </Box>
  );
};

export default WizardConfigureStep;
