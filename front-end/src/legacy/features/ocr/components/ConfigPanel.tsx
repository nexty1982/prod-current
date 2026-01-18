import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, Save, RefreshCw } from 'lucide-react';
import { 
  Box, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  FormControlLabel, 
  Checkbox, 
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import { fetchSettings, updateSettings, type OCRSettings } from '../lib/ocrApi';

interface ConfigPanelProps {
  trigger: React.ReactNode;
  churchId?: number;
  onSettingsChange?: (settings: OCRSettings) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ trigger, churchId, onSettingsChange }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<OCRSettings>({
    engine: 'tesseract',
    language: 'eng',
    dpi: 300,
    deskew: true,
    removeNoise: true,
    preprocessImages: true,
    outputFormat: 'json',
    confidenceThreshold: 75
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSettings(churchId);
      setSettings(data);
    } catch (error: any) {
      console.error('Failed to load OCR settings:', error);
      setError(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSettings(settings, churchId);
      onSettingsChange?.(settings);
      setOpen(false);
    } catch (error: any) {
      console.error('Failed to save OCR settings:', error);
      setError(error.message || 'Failed to save settings. The endpoint may not be implemented yet.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      engine: 'tesseract',
      language: 'eng',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    });
  };

  return (
    <>
      <Box component="span" onClick={() => setOpen(true)} sx={{ cursor: 'pointer' }}>
        {trigger}
      </Box>
      
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.primary' }}>
              <Settings size={20} />
              <Typography variant="h6" color="text.primary">
                OCR Settings
              </Typography>
            </Box>
            <Button
              onClick={() => setOpen(false)}
              sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}
            >
              <X size={20} />
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              {/* Engine Selection */}
              <FormControl fullWidth>
                <InputLabel>OCR Engine</InputLabel>
                <Select
                  value={settings.engine}
                  label="OCR Engine"
                  onChange={(e) => setSettings({ ...settings, engine: e.target.value as OCRSettings['engine'] })}
                >
                  <MenuItem value="tesseract">Tesseract (Open Source)</MenuItem>
                  <MenuItem value="google-vision">Google Vision AI</MenuItem>
                  <MenuItem value="azure-cognitive">Azure Cognitive Services</MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Different engines may provide varying accuracy for different document types
                </Typography>
              </FormControl>

              {/* Language Selection */}
              <FormControl fullWidth>
                <InputLabel>Primary Language</InputLabel>
                <Select
                  value={settings.language}
                  label="Primary Language"
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <MenuItem value="eng">English</MenuItem>
                  <MenuItem value="ell">Greek (Modern)</MenuItem>
                  <MenuItem value="grc">Greek (Ancient)</MenuItem>
                  <MenuItem value="rus">Russian</MenuItem>
                  <MenuItem value="ron">Romanian</MenuItem>
                  <MenuItem value="srp">Serbian</MenuItem>
                  <MenuItem value="bul">Bulgarian</MenuItem>
                  <MenuItem value="ukr">Ukrainian</MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Choose the primary language of documents you'll be processing
                </Typography>
              </FormControl>

              {/* Image Processing Settings */}
              <Box>
                <Typography variant="subtitle2" color="text.primary" sx={{ mb: 2 }}>
                  Image Processing
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <TextField
                    label="DPI (Dots Per Inch)"
                    type="number"
                    inputProps={{ min: 150, max: 600, step: 50 }}
                    value={settings.dpi}
                    onChange={(e) => setSettings({ ...settings, dpi: parseInt(e.target.value) || 300 })}
                    fullWidth
                    size="small"
                  />
                  
                  <TextField
                    label="Confidence Threshold (%)"
                    type="number"
                    inputProps={{ min: 0, max: 100 }}
                    value={settings.confidenceThreshold}
                    onChange={(e) => setSettings({ ...settings, confidenceThreshold: parseInt(e.target.value) || 75 })}
                    fullWidth
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.deskew}
                        onChange={(e) => setSettings({ ...settings, deskew: e.target.checked })}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">Auto-deskew images</Typography>}
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.removeNoise}
                        onChange={(e) => setSettings({ ...settings, removeNoise: e.target.checked })}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">Remove image noise</Typography>}
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.preprocessImages}
                        onChange={(e) => setSettings({ ...settings, preprocessImages: e.target.checked })}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">Apply preprocessing filters</Typography>}
                  />
                </Box>
              </Box>

              {/* Output Format */}
              <FormControl fullWidth>
                <InputLabel>Output Format</InputLabel>
                <Select
                  value={settings.outputFormat}
                  label="Output Format"
                  onChange={(e) => setSettings({ ...settings, outputFormat: e.target.value as OCRSettings['outputFormat'] })}
                >
                  <MenuItem value="json">JSON (Structured Data)</MenuItem>
                  <MenuItem value="text">Plain Text</MenuItem>
                  <MenuItem value="hocr">hOCR (HTML + Coordinates)</MenuItem>
                  <MenuItem value="pdf">Searchable PDF</MenuItem>
                </Select>
              </FormControl>

              {/* Engine-specific tips */}
              <Alert severity="info" sx={{ bgcolor: 'info.light' }}>
                <Typography variant="subtitle2" color="info.dark" sx={{ mb: 1 }}>
                  Tips for {settings.engine}
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {settings.engine === 'tesseract' && (
                    <>
                      <li><Typography variant="caption" color="info.dark">Works best with high-contrast, clean text</Typography></li>
                      <li><Typography variant="caption" color="info.dark">Consider higher DPI (300-400) for better accuracy</Typography></li>
                      <li><Typography variant="caption" color="info.dark">Free and works offline</Typography></li>
                    </>
                  )}
                  {settings.engine === 'google-vision' && (
                    <>
                      <li><Typography variant="caption" color="info.dark">Excellent for handwritten text and mixed languages</Typography></li>
                      <li><Typography variant="caption" color="info.dark">Requires internet connection</Typography></li>
                      <li><Typography variant="caption" color="info.dark">May have usage costs</Typography></li>
                    </>
                  )}
                  {settings.engine === 'azure-cognitive' && (
                    <>
                      <li><Typography variant="caption" color="info.dark">Great for structured documents and forms</Typography></li>
                      <li><Typography variant="caption" color="info.dark">Supports custom models</Typography></li>
                      <li><Typography variant="caption" color="info.dark">Requires Azure subscription</Typography></li>
                    </>
                  )}
                </Box>
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
          <Button
            onClick={handleReset}
            startIcon={<RefreshCw size={16} />}
            variant="outlined"
          >
            Reset to Defaults
          </Button>
          
          <Box sx={{ flex: 1 }} />
          
          <Button
            onClick={() => setOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <Save size={16} />}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfigPanel;
