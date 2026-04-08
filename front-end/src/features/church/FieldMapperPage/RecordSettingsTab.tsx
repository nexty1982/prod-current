import {
    Business as BusinessIcon,
    CalendarToday as CalendarIcon,
    CloudUpload as CloudUploadIcon,
    Image as ImageIcon,
    PhotoLibrary as PhotoLibraryIcon,
    Refresh as RefreshIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Grid,
    Stack,
    Switch,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import RecordHeaderPreview from '../RecordHeaderPreview';
import type { RecordSettings } from './types';

interface RecordSettingsTabProps {
  churchId: number;
  churchName: string;
  urlTableName: string;
  recordSettings: RecordSettings;
  setRecordSettings: React.Dispatch<React.SetStateAction<any>>;
  saving: boolean;
  error: string | null;
  success: string | null;
  columnsError: string | null;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  setSaving: (saving: boolean) => void;
  handleImageUpload: (type: string, file: File) => Promise<string>;
  handleResetDefaults: () => void;
  handleSaveRecordSettings: () => void;
  handleCancel: () => void;
}

const RecordSettingsTab: React.FC<RecordSettingsTabProps> = ({
  churchId,
  churchName,
  urlTableName,
  recordSettings,
  setRecordSettings,
  saving,
  error,
  success,
  columnsError,
  setError,
  setSuccess,
  setSaving,
  handleImageUpload,
  handleResetDefaults,
  handleSaveRecordSettings,
  handleCancel,
}) => {
  const theme = useTheme();

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Header Display Configuration</Typography>
          <Typography variant="body2" color="text.secondary">Configure visual elements for the record table header</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            component="label"
            startIcon={<CloudUploadIcon />}
            disabled={saving}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Upload Library
            <input
              type="file"
              hidden
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                  if (!validTypes.includes(file.type.toLowerCase())) {
                    setError('Please upload a .jpg or .png image file');
                    return;
                  }
                  setError(null);
                  setSuccess(null);
                  setSaving(true);
                  try {
                    await handleImageUpload('baptism', file);
                    setSuccess('Image uploaded successfully to library!');
                  } catch (err: any) {
                    setError(err?.message || 'Failed to upload image.');
                  } finally {
                    setSaving(false);
                    e.target.value = '';
                  }
                }
              }}
            />
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleResetDefaults}
            disabled={saving}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Reset Defaults
          </Button>
        </Stack>
      </Stack>

      {/* Status Messages */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {columnsError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {columnsError}. Live preview may not reflect final schema.
        </Alert>
      )}

      {/* Elements + Live Preview */}
      <Grid container spacing={3}>
        {/* Left: Elements toggles */}
        <Grid item xs={12} md={5}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            ELEMENTS
          </Typography>
          <Stack spacing={1}>
            {[
              { key: 'recordImages', label: 'Record Image', icon: <ImageIcon fontSize="small" /> },
              { key: 'calendar', label: 'Calendar', icon: <CalendarIcon fontSize="small" /> },
              { key: 'logo', label: 'Church Logo', icon: <BusinessIcon fontSize="small" /> },
              { key: 'omLogo', label: 'OM Logo', icon: <PhotoLibraryIcon fontSize="small" /> },
              { key: 'backgroundImage', label: 'Background', icon: <ImageIcon fontSize="small" /> },
              { key: 'g1Image', label: 'Overlay', icon: <ImageIcon fontSize="small" /> },
            ].map((element) => {
              const isEnabled = element.key === 'recordImages'
                ? true
                : (recordSettings as any)[element.key]?.enabled ?? true;
              return (
                <Card
                  key={element.key}
                  variant="outlined"
                  sx={{
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: isEnabled ? 'primary.main' : theme.palette.action.hover,
                    color: isEnabled ? 'primary.contrastText' : 'text.primary',
                    borderColor: isEnabled ? 'primary.main' : 'divider',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (element.key === 'recordImages') return;
                    setRecordSettings((prev: any) => ({
                      ...prev,
                      [element.key]: {
                        ...prev[element.key],
                        enabled: !prev[element.key]?.enabled,
                      },
                    }));
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {element.icon}
                    <Typography variant="body2" fontWeight={500}>{element.label}</Typography>
                  </Box>
                  {element.key !== 'recordImages' ? (
                    <Switch
                      size="small"
                      checked={isEnabled}
                      onChange={() => {
                        setRecordSettings((prev: any) => ({
                          ...prev,
                          [element.key]: {
                            ...prev[element.key],
                            enabled: !prev[element.key]?.enabled,
                          },
                        }));
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: isEnabled ? '#fff' : undefined,
                        },
                      }}
                    />
                  ) : (
                    <Switch size="small" checked disabled />
                  )}
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* Right: Live Header Preview */}
        <Grid item xs={12} md={7}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block', textAlign: 'right' }}>
            LIVE HEADER PREVIEW
          </Typography>
          <RecordHeaderPreview
            churchId={churchId}
            recordSettings={recordSettings}
            setRecordSettings={setRecordSettings}
            onImageUpload={handleImageUpload}
            recordType={
              urlTableName === 'baptism_records' ? 'baptism' :
              urlTableName === 'marriage_records' ? 'marriage' :
              urlTableName === 'funeral_records' ? 'funeral' : 'baptism'
            }
            churchName={churchName || `Church ${churchId}`}
          />
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
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSaveRecordSettings}
              disabled={saving}
              sx={{ textTransform: 'none' }}
            >
              {saving ? 'Saving...' : 'Save Record Settings'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default RecordSettingsTab;
