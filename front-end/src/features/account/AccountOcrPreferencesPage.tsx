/**
 * AccountOcrPreferencesPage — Church-scoped OCR settings for church_admin+ roles.
 *
 * Exposes a curated subset of ocr_settings via /api/my/ocr-preferences.
 * Sections: Document Language, Confidence Threshold, Image Preprocessing,
 *           Document Processing, Document Retention.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import SaveIcon from '@mui/icons-material/Save';
import TranslateIcon from '@mui/icons-material/Translate';
import TuneIcon from '@mui/icons-material/Tune';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useAuth } from '@/context/AuthContext';
import { canManageOcrPreferences } from './accountPermissions';
import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION } from './accountConstants';
import { ocrApi, extractErrorMessage } from './accountApi';

/* ── Language options ── */
const LANGUAGES = [
  { code: 'eng', label: 'English', flag: '🇺🇸' },
  { code: 'ell', label: 'Greek (Modern)', flag: '🇬🇷' },
  { code: 'grc', label: 'Greek (Ancient/Church)', flag: '🇬🇷' },
  { code: 'rus', label: 'Russian', flag: '🇷🇺' },
  { code: 'ron', label: 'Romanian', flag: '🇷🇴' },
  { code: 'srp', label: 'Serbian', flag: '🇷🇸' },
  { code: 'bul', label: 'Bulgarian', flag: '🇧🇬' },
  { code: 'ukr', label: 'Ukrainian', flag: '🇺🇦' },
];

/* ── Types ── */
interface OcrPreferences {
  language: string;
  defaultLanguage: string;
  confidenceThreshold: number;
  deskew: boolean;
  removeNoise: boolean;
  preprocessImages: boolean;
  documentProcessing: {
    spellingCorrection: string;
    extractAllText: string;
    improveFormatting: string;
  };
  documentDeletion: {
    deleteAfter: number;
    deleteUnit: string;
  };
}

const DEFAULT_PREFS: OcrPreferences = {
  language: 'eng',
  defaultLanguage: 'en',
  confidenceThreshold: 75,
  deskew: true,
  removeNoise: true,
  preprocessImages: true,
  documentProcessing: {
    spellingCorrection: 'fix',
    extractAllText: 'yes',
    improveFormatting: 'yes',
  },
  documentDeletion: {
    deleteAfter: 7,
    deleteUnit: 'days',
  },
};

const AccountOcrPreferencesPage: React.FC = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<OcrPreferences>(DEFAULT_PREFS);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);
  const [dirty, setDirty] = useState(false);

  const canManage = canManageOcrPreferences(user);

  /* ── Load preferences ── */
  const fetchPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ocrApi.getPreferences();
      if (data.success) {
        setPrefs(data.preferences);
        setOcrEnabled(data.ocrEnabled !== false);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to load OCR preferences.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) fetchPrefs();
    else setLoading(false);
  }, [canManage, fetchPrefs]);

  /* ── Save preferences ── */
  const handleSave = async () => {
    try {
      setSaving(true);
      await ocrApi.updatePreferences(prefs);
      setSnackbar({ open: true, message: 'OCR preferences saved successfully.', severity: 'success' });
      setDirty(false);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save OCR preferences.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /* ── Field updaters ── */
  const updateField = <K extends keyof OcrPreferences>(key: K, value: OcrPreferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateDocProcessing = (key: string, value: string) => {
    setPrefs((prev) => ({
      ...prev,
      documentProcessing: { ...prev.documentProcessing, [key]: value },
    }));
    setDirty(true);
  };

  const updateDocDeletion = (key: string, value: string | number) => {
    setPrefs((prev) => ({
      ...prev,
      documentDeletion: { ...prev.documentDeletion, [key]: value },
    }));
    setDirty(true);
  };

  /* ── Permission guard ── */
  if (!canManage) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          OCR Preferences
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          OCR preferences are available to church administrators. Contact your church admin to manage these settings.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DocumentScannerIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              OCR Preferences
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure document scanning and processing settings for your church
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {!ocrEnabled && (
            <Chip label="OCR Disabled" color="warning" size="small" variant="outlined" />
          )}
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || !dirty}
            size="small"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Stack>

      {!ocrEnabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          OCR is currently disabled for your church. These preferences will take effect when OCR is enabled.
        </Alert>
      )}

      <Stack spacing={3}>
        {/* ── Section 1: Document Language ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <TranslateIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Document Language
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Primary language used in your church's historical records and documents.
            </Typography>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>OCR Language</InputLabel>
              <Select
                value={prefs.language}
                label="OCR Language"
                onChange={(e) => updateField('language', e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* ── Section 2: Confidence Threshold ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <TuneIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Confidence Threshold
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Minimum confidence level for OCR results. Characters below this threshold will be flagged for manual review.
            </Typography>
            <Stack direction="row" alignItems="center" spacing={3} sx={{ maxWidth: 500 }}>
              <Slider
                value={prefs.confidenceThreshold}
                onChange={(_, val) => updateField('confidenceThreshold', val as number)}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 75, label: '75%' },
                  { value: 100, label: '100%' },
                ]}
                sx={{ flex: 1 }}
              />
              <Chip
                label={`${prefs.confidenceThreshold}%`}
                color={prefs.confidenceThreshold >= 75 ? 'success' : prefs.confidenceThreshold >= 50 ? 'warning' : 'error'}
                size="small"
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Recommended: 75% for standard documents, 50% for aged or damaged records.
            </Typography>
          </CardContent>
        </Card>

        {/* ── Section 3: Image Preprocessing ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <ImageIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Image Preprocessing
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Automatic image corrections applied before text extraction.
            </Typography>
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.preprocessImages}
                    onChange={(e) => updateField('preprocessImages', e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Enable Image Preprocessing</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Master toggle for all image preprocessing
                    </Typography>
                  </Box>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.deskew}
                    onChange={(e) => updateField('deskew', e.target.checked)}
                    size="small"
                    disabled={!prefs.preprocessImages}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" color={!prefs.preprocessImages ? 'text.disabled' : undefined}>
                      Auto-Deskew & Rotate
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Straighten tilted scans and correct rotation
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.removeNoise}
                    onChange={(e) => updateField('removeNoise', e.target.checked)}
                    size="small"
                    disabled={!prefs.preprocessImages}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" color={!prefs.preprocessImages ? 'text.disabled' : undefined}>
                      Noise Removal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Remove spots, stains, and artifacts from scanned images
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </CardContent>
        </Card>

        {/* ── Section 4: Document Processing ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <DescriptionIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Document Processing
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Post-extraction processing options for scanned text.
            </Typography>
            <Stack spacing={2.5}>
              <FormControl size="small" sx={{ maxWidth: 300 }}>
                <InputLabel>Spelling Correction</InputLabel>
                <Select
                  value={prefs.documentProcessing.spellingCorrection}
                  label="Spelling Correction"
                  onChange={(e) => updateDocProcessing('spellingCorrection', e.target.value)}
                >
                  <MenuItem value="fix">Auto-fix</MenuItem>
                  <MenuItem value="suggest">Suggest only</MenuItem>
                  <MenuItem value="off">Disabled</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ maxWidth: 300 }}>
                <InputLabel>Extract All Text</InputLabel>
                <Select
                  value={prefs.documentProcessing.extractAllText}
                  label="Extract All Text"
                  onChange={(e) => updateDocProcessing('extractAllText', e.target.value)}
                >
                  <MenuItem value="yes">Yes — extract everything</MenuItem>
                  <MenuItem value="tables">Tables only</MenuItem>
                  <MenuItem value="no">No — manual selection</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ maxWidth: 300 }}>
                <InputLabel>Improve Formatting</InputLabel>
                <Select
                  value={prefs.documentProcessing.improveFormatting}
                  label="Improve Formatting"
                  onChange={(e) => updateDocProcessing('improveFormatting', e.target.value)}
                >
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* ── Section 5: Document Retention ── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <DeleteSweepIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Document Retention
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              How long uploaded document images are retained after processing.
            </Typography>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <TextField
                size="small"
                label="Delete After"
                type="number"
                value={prefs.documentDeletion.deleteAfter}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) updateDocDeletion('deleteAfter', val);
                }}
                inputProps={{ min: 1 }}
                sx={{ width: 120 }}
              />
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={prefs.documentDeletion.deleteUnit}
                  label="Unit"
                  onChange={(e) => updateDocDeletion('deleteUnit', e.target.value)}
                >
                  <MenuItem value="minutes">Minutes</MenuItem>
                  <MenuItem value="hours">Hours</MenuItem>
                  <MenuItem value="days">Days</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Processed records are saved permanently. This setting only applies to the uploaded image files.
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Bottom save bar (visible when dirty) */}
      {dirty && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 16,
            mt: 3,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            You have unsaved changes
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                fetchPrefs();
                setDirty(false);
              }}
            >
              Discard
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={SNACKBAR_DURATION}
        onClose={() => setSnackbar(SNACKBAR_CLOSED)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(SNACKBAR_CLOSED)}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AccountOcrPreferencesPage;
