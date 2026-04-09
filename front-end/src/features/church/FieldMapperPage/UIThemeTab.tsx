import { apiClient } from '@/api/utils/axiosInstance';
import { enhancedTableStore } from '@/store/enhancedTableStore';
import {
    Add as AddIcon,
    GridView as GridViewIcon,
    Palette as PaletteIcon,
    Save as SaveIcon,
    Search as SearchIcon,
    Settings as SettingsIcon,
    ViewList as ViewListIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Stack,
    Tab,
    Tabs,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import type { DynamicConfig } from './types';

interface UIThemeTabProps {
  churchId: number;
  uiThemeState: ReturnType<typeof enhancedTableStore.getState>;
  dynamicConfig: DynamicConfig;
  configuringButton: string | null;
  setConfiguringButton: (btn: string | null) => void;
  saving: boolean;
  error: string | null;
  success: string | null;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  handleCancel: () => void;
}

const ALL_BUTTONS = [
  { key: 'searchRecords', label: 'Search Records', icon: <SearchIcon />, badge: 'SEARCH' },
  { key: 'theme', label: 'Theme', icon: <PaletteIcon />, badge: 'ACTIONS' },
  { key: 'recordTableConfig', label: 'Record Table Config', icon: <SettingsIcon />, badge: 'ACTIONS' },
  { key: 'switchToAG', label: 'Switch to AG', icon: <ViewListIcon />, badge: 'ACTIONS' },
  { key: 'fieldSettings', label: 'Field Settings', icon: <SettingsIcon />, badge: 'ADMIN' },
  { key: 'addRecords', label: 'Add Records', icon: <AddIcon />, badge: 'ACTIONS' },
  { key: 'advancedGrid', label: 'Advanced Grid', icon: <GridViewIcon />, badge: 'ADMIN' },
];

const UIThemeTab: React.FC<UIThemeTabProps> = ({
  churchId,
  uiThemeState,
  dynamicConfig,
  configuringButton,
  setConfiguringButton,
  saving,
  error,
  success,
  setSaving,
  setError,
  setSuccess,
  handleCancel,
}) => {
  const theme = useTheme();
  const buttonConfigs = uiThemeState.actionButtonConfigs;
  const selectedKey = configuringButton || 'searchRecords';
  const selectedConfig = buttonConfigs?.[selectedKey as keyof typeof buttonConfigs];
  const selectedButton = ALL_BUTTONS.find(b => b.key === selectedKey) || ALL_BUTTONS[0];

  return (
    <Box>
      {/* Status Messages */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Action Buttons Preview */}
      <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        ACTION BUTTONS PREVIEW
      </Typography>
      <Card variant="outlined" sx={{ mb: 3, p: 2, bgcolor: theme.palette.background.paper }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {ALL_BUTTONS.map((btn) => {
            const config = buttonConfigs?.[btn.key as keyof typeof buttonConfigs];
            const isActive = selectedKey === btn.key;
            return (
              <Chip
                key={btn.key}
                icon={btn.icon}
                label={btn.label}
                onClick={() => setConfiguringButton(btn.key)}
                sx={{
                  borderRadius: '20px',
                  fontWeight: 500,
                  fontSize: config?.fontSize || '0.8rem',
                  backgroundColor: isActive
                    ? (config?.backgroundColor || '#4C1D95')
                    : (config?.backgroundColor || theme.palette.action.selected),
                  color: isActive
                    ? (config?.textColor || '#fff')
                    : (config?.textColor || theme.palette.text.primary),
                  border: isActive ? '2px solid' : '1px solid',
                  borderColor: isActive ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.85 },
                }}
              />
            );
          })}
        </Box>
      </Card>

      {/* Configuration Panel + Button Properties */}
      <Grid container spacing={3}>
        {/* Left: Configuration Panel */}
        <Grid item xs={12} md={5}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            CONFIGURATION PANEL
          </Typography>
          <Stack spacing={0.5}>
            {ALL_BUTTONS.map((btn) => (
              <Card
                key={btn.key}
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  bgcolor: selectedKey === btn.key ? 'primary.main' : theme.palette.background.paper,
                  color: selectedKey === btn.key ? 'primary.contrastText' : 'text.primary',
                  borderColor: selectedKey === btn.key ? 'primary.main' : 'divider',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
                onClick={() => setConfiguringButton(btn.key)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {btn.icon}
                  <Typography variant="body2" fontWeight={selectedKey === btn.key ? 600 : 400}>{btn.label}</Typography>
                </Box>
                <Chip
                  label={btn.badge}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: selectedKey === btn.key ? 'rgba(255,255,255,0.2)' : theme.palette.action.hover,
                    color: selectedKey === btn.key ? '#fff' : 'text.secondary',
                  }}
                />
              </Card>
            ))}
          </Stack>
        </Grid>

        {/* Right: Button Properties */}
        <Grid item xs={12} md={7}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            BUTTON PROPERTIES: {selectedButton.label.toUpperCase()}
          </Typography>
          <Card variant="outlined" sx={{ p: 3, bgcolor: theme.palette.background.paper }}>
            {/* Typography */}
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              TYPOGRAPHY
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Font Size</Typography>
              <Stack direction="row" spacing={1}>
                {['0.75rem', '0.875rem', '1rem'].map((size) => (
                  <Chip
                    key={size}
                    label={size}
                    size="small"
                    onClick={() => {
                      enhancedTableStore.setActionButtonConfigs({
                        [selectedKey]: { ...selectedConfig, fontSize: size },
                      });
                    }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: selectedConfig?.fontSize === size ? 'primary.main' : theme.palette.action.hover,
                      color: selectedConfig?.fontSize === size ? '#fff' : 'text.primary',
                      fontWeight: selectedConfig?.fontSize === size ? 600 : 400,
                    }}
                  />
                ))}
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Spacing */}
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              SPACING
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Padding (X / Y)</Typography>
              <Stack direction="row" spacing={1}>
                {[
                  { label: 'Small', value: '4px 8px' },
                  { label: 'Medium', value: '6px 16px' },
                  { label: 'Large', value: '8px 22px' },
                ].map((opt) => (
                  <Chip
                    key={opt.label}
                    label={opt.label}
                    size="small"
                    onClick={() => {
                      enhancedTableStore.setActionButtonConfigs({
                        [selectedKey]: { ...selectedConfig, padding: opt.value },
                      });
                    }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: selectedConfig?.padding === opt.value ? 'primary.main' : theme.palette.action.hover,
                      color: selectedConfig?.padding === opt.value ? '#fff' : 'text.primary',
                      fontWeight: selectedConfig?.padding === opt.value ? 600 : 400,
                    }}
                  />
                ))}
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Positioning */}
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              POSITIONING
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Tabs
                value={0}
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': { textTransform: 'none', minHeight: 36, py: 0.5, px: 2 },
                }}
              >
                <Tab label="Left" />
                <Tab label="Center" />
                <Tab label="Right" />
              </Tabs>
            </Box>

            <Alert severity="info" sx={{ borderRadius: 2, mt: 2 }}>
              <Typography variant="caption">
                These settings apply globally to all action buttons in the specified group to maintain visual consistency.
              </Typography>
            </Alert>
          </Card>
        </Grid>
      </Grid>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CircularProgress size={12} /> Live preview loading. Interactions may not be saved
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleCancel} disabled={saving} sx={{ textTransform: 'none' }}>
              Discard Changes
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={async () => {
                if (!churchId) {
                  setError('Invalid church ID. Cannot save UI theme.');
                  return;
                }
                try {
                  setSaving(true);
                  setError(null);
                  setSuccess(null);
                  const storeState = enhancedTableStore.exportConfig();
                  await apiClient.post<any>(`/admin/churches/${churchId}/dynamic-records-config`, {
                    config: {
                      branding: dynamicConfig.branding,
                      liturgicalTheme: dynamicConfig.liturgicalTheme,
                      fieldRules: dynamicConfig.fieldRules,
                      actionButtonConfigs: storeState.actionButtonConfigs,
                    },
                  });
                  setSuccess('UI Theme saved successfully!');
                  setTimeout(() => setSuccess(null), 3000);
                } catch (err: any) {
                  console.error('Error saving UI theme:', err);
                  setError(err?.message || 'Failed to save UI theme');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              sx={{ textTransform: 'none' }}
            >
              {saving ? 'Saving...' : 'Save UI Theme'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default UIThemeTab;
