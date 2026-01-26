import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Camera as CameraIcon,
  Compare as CompareIcon,
  Psychology as PsychologyIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { SnapshotConfig } from '@/ai/visualTesting/snapshotEngine';
import { DiffConfig } from '@/ai/visualTesting/diffAnalyzer';
import { ConfidenceConfig } from '@/ai/visualTesting/confidenceAdjuster';
import { PlaywrightConfig } from '@/ai/visualTesting/playwrightTests';
import { LearningConfig } from '@/ai/learning/regressionFeedback';
import { checkVRTAccess, logVRTAction, vrtSecurity } from '@/ai/vrt/vrtSecurity';

// Mock useAuth hook (replace with real auth context in production)
const useAuth = () => ({ 
  user: { 
    id: 'user_123',
    name: 'Super Admin', 
    role: 'super_admin',
    email: 'admin@orthodoxmetrics.com' 
  } 
});

interface VRTSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VRTSettings {
  snapshot: SnapshotConfig;
  diff: DiffConfig;
  confidence: ConfidenceConfig;
  playwright: PlaywrightConfig;
  learning: LearningConfig;
  enabledInProduction: boolean;
  requireSuperAdmin: boolean;
  auditLogging: boolean;
  auditLogRetentionDays: number;
  rateLimitPerHour: number;
}

const VRTSettingsPanel: React.FC<VRTSettingsPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<VRTSettings>({
    snapshot: {
      enabled: true,
      retentionDays: 30,
      breakpoints: {
        desktop: { width: 1920, height: 1080 },
        tablet: { width: 768, height: 1024 },
        mobile: { width: 375, height: 667 }
      },
      quality: 0.9,
      format: 'png'
    },
    diff: {
      sensitivity: 0.05,
      minRegionSize: 100,
      maxRegions: 50,
      colorThreshold: 30,
      layoutThreshold: 5,
      enableTextDetection: true,
      enableStyleDetection: true
    },
    confidence: {
      enabled: true,
      visualWeight: 0.3,
      severityPenalties: {
        NONE: 0,
        MINOR: -0.05,
        MODERATE: -0.15,
        MAJOR: -0.25,
        CRITICAL: -0.4
      },
      typeBonuses: {
        LAYOUT_SHIFT: -0.2,
        COLOR_CHANGE: 0.05,
        ELEMENT_MISSING: -0.3,
        ELEMENT_ADDED: 0.1,
        SIZE_CHANGE: -0.1,
        POSITION_CHANGE: -0.15,
        TEXT_CHANGE: 0.02,
        STYLE_CHANGE: 0.05
      },
      unexpectedChangePenalty: -0.1,
      intentionalChangeBonus: 0.05,
      layoutStabilityBonus: 0.1,
      minConfidence: 0.1,
      maxConfidence: 0.95,
      learningEnabled: true
    },
    playwright: {
      enabled: true,
      environments: [],
      defaultAssertions: [],
      screenshotOptions: {
        fullPage: false,
        quality: 0.9,
        type: 'png'
      },
      accessibilityThreshold: 0.8,
      colorContrastThreshold: 4.5,
      responsiveBreakpoints: [375, 768, 1024, 1440, 1920],
      maxTestDuration: 30000,
      retryAttempts: 2
    },
    learning: {
      enabled: true,
      minSamplesForTraining: 50,
      trainingInterval: 24 * 60 * 60 * 1000,
      featureExtraction: {
        includeVisualFeatures: true,
        includeConfidenceFeatures: true,
        includeTestFeatures: true,
        includeUserFeedback: true
      },
      modelUpdate: {
        autoUpdate: true,
        validationSplit: 0.2,
        learningRate: 0.01,
        maxIterations: 1000
      },
      storage: {
        maxSamples: 1000,
        retentionDays: 90,
        compressionEnabled: true
      }
    },
    enabledInProduction: false,
    requireSuperAdmin: true,
    auditLogging: true,
    auditLogRetentionDays: 90,
    rateLimitPerHour: 100
  });

  const [selectedTab, setSelectedTab] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      // In a real implementation, load settings from services
      // For now, we'll use the default settings
      console.log('[VRT] Loading settings...');
    } catch (error) {
      console.error('[VRT] Failed to load settings:', error);
    }
  };

  const handleSettingChange = (category: keyof VRTSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleNestedSettingChange = (category: keyof VRTSettings, parentKey: string, childKey: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentKey]: {
          ...(prev[category] as any)[parentKey],
          [childKey]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Check access before saving
    const accessCheck = checkVRTAccess(user);
    if (!accessCheck.allowed) {
      setError(`Cannot save settings: ${accessCheck.reason}`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Prepare configuration object
      const newConfig = {
        enabledInProduction: settings.enabledInProduction,
        requireSuperAdmin: settings.requireSuperAdmin,
        auditLogging: settings.auditLogging,
        maxSnapshotRetention: settings.snapshot.retentionDays,
        maxAuditLogRetention: settings.auditLogRetentionDays,
        rateLimitPerHour: settings.rateLimitPerHour
      };

      // Update VRT security configuration
      vrtSecurity.updateConfig(newConfig, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      });

      // Store VRT module settings in localStorage
      const vrtSettings = {
        snapshot: {
          enabled: settings.snapshot.enabled,
          retentionDays: settings.snapshot.retentionDays,
          breakpoints: settings.snapshot.breakpoints,
          quality: settings.snapshot.quality,
          format: settings.snapshot.format
        },
        diff: {
          sensitivity: settings.diff.sensitivity,
          minRegionSize: settings.diff.minRegionSize,
          maxRegions: settings.diff.maxRegions,
          colorThreshold: settings.diff.colorThreshold,
          layoutThreshold: settings.diff.layoutThreshold,
          enableTextDetection: settings.diff.enableTextDetection,
          enableStyleDetection: settings.diff.enableStyleDetection
        },
        confidence: {
          enabled: settings.confidence.enabled,
          visualWeight: settings.confidence.visualWeight,
          severityPenalties: settings.confidence.severityPenalties,
          typeBonuses: settings.confidence.typeBonuses,
          unexpectedChangePenalty: settings.confidence.unexpectedChangePenalty,
          intentionalChangeBonus: settings.confidence.intentionalChangeBonus,
          layoutStabilityBonus: settings.confidence.layoutStabilityBonus,
          minConfidence: settings.confidence.minConfidence,
          maxConfidence: settings.confidence.maxConfidence,
          learningEnabled: settings.confidence.learningEnabled
        },
        playwright: {
          enabled: settings.playwright.enabled,
          environments: settings.playwright.environments,
          defaultAssertions: settings.playwright.defaultAssertions,
          screenshotOptions: settings.playwright.screenshotOptions,
          accessibilityThreshold: settings.playwright.accessibilityThreshold,
          colorContrastThreshold: settings.playwright.colorContrastThreshold,
          responsiveBreakpoints: settings.playwright.responsiveBreakpoints,
          maxTestDuration: settings.playwright.maxTestDuration,
          retryAttempts: settings.playwright.retryAttempts
        },
        learning: {
          enabled: settings.learning.enabled,
          minSamplesForTraining: settings.learning.minSamplesForTraining,
          trainingInterval: settings.learning.trainingInterval,
          featureExtraction: settings.learning.featureExtraction,
          modelUpdate: settings.learning.modelUpdate,
          storage: settings.learning.storage
        }
      };

      localStorage.setItem('vrt_module_settings', JSON.stringify(vrtSettings));

      // Log successful save
      await logVRTAction(user, 'SETTINGS_UPDATE', {
        action: 'settings_saved',
        settingsUpdated: Object.keys(newConfig),
        timestamp: new Date().toISOString()
      });

      setSuccessMessage('VRT settings saved successfully!');
      
      // Auto-close success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (saveError) {
      const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save settings';
      setError(errorMessage);
      
      // Log failed save
      await logVRTAction(user, 'SETTINGS_UPDATE', {
        action: 'settings_save_failed',
        error: errorMessage
      }, undefined, undefined, false, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    // Check access before resetting
    const accessCheck = checkVRTAccess(user);
    if (!accessCheck.allowed) {
      setError(`Cannot reset settings: ${accessCheck.reason}`);
      return;
    }

    setLoading(true);
    
    try {
      // Reset to default values
      const defaultSettings = {
        // Snapshot settings
        snapshot: {
          enabled: true,
          retentionDays: 30,
          breakpoints: {
            desktop: { width: 1920, height: 1080 },
            tablet: { width: 768, height: 1024 },
            mobile: { width: 375, height: 667 }
          },
          quality: 0.9,
          format: 'png' as 'png' | 'jpeg'
        },
        diff: {
          sensitivity: 0.05,
          minRegionSize: 100,
          maxRegions: 50,
          colorThreshold: 30,
          layoutThreshold: 5,
          enableTextDetection: true,
          enableStyleDetection: true
        },
        confidence: {
          enabled: true,
          visualWeight: 0.3,
          severityPenalties: {
            NONE: 0,
            MINOR: -0.05,
            MODERATE: -0.15,
            MAJOR: -0.25,
            CRITICAL: -0.4
          },
          typeBonuses: {
            LAYOUT_SHIFT: -0.2,
            COLOR_CHANGE: 0.05,
            ELEMENT_MISSING: -0.3,
            ELEMENT_ADDED: 0.1,
            SIZE_CHANGE: -0.1,
            POSITION_CHANGE: -0.15,
            TEXT_CHANGE: 0.02,
            STYLE_CHANGE: 0.05
          },
          unexpectedChangePenalty: -0.1,
          intentionalChangeBonus: 0.05,
          layoutStabilityBonus: 0.1,
          minConfidence: 0.1,
          maxConfidence: 0.95,
          learningEnabled: true
        },
        playwright: {
          enabled: true,
          environments: [],
          defaultAssertions: [],
          screenshotOptions: {
            fullPage: false,
            quality: 0.9,
            type: 'png'
          },
          accessibilityThreshold: 0.8,
          colorContrastThreshold: 4.5,
          responsiveBreakpoints: [375, 768, 1024, 1440, 1920],
          maxTestDuration: 30000,
          retryAttempts: 2
        },
        learning: {
          enabled: true,
          minSamplesForTraining: 50,
          trainingInterval: 24 * 60 * 60 * 1000,
          featureExtraction: {
            includeVisualFeatures: true,
            includeConfidenceFeatures: true,
            includeTestFeatures: true,
            includeUserFeedback: true
          },
          modelUpdate: {
            autoUpdate: true,
            validationSplit: 0.2,
            learningRate: 0.01,
            maxIterations: 1000
          },
          storage: {
            maxSamples: 1000,
            retentionDays: 90,
            compressionEnabled: true
          }
        },
        enabledInProduction: false,
        requireSuperAdmin: true,
        auditLogging: true,
        auditLogRetentionDays: 90,
        rateLimitPerHour: 100
      };

      setSettings(defaultSettings);

      // Log reset action
      await logVRTAction(user, 'SETTINGS_UPDATE', {
        action: 'settings_reset_to_defaults'
      });

      setSuccessMessage('Settings reset to defaults');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (resetError) {
      const errorMessage = resetError instanceof Error ? resetError.message : 'Failed to reset settings';
      setError(errorMessage);
      
      // Log failed reset
      await logVRTAction(user, 'SETTINGS_UPDATE', {
        action: 'settings_reset_failed',
        error: errorMessage
      }, undefined, undefined, false, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  if (!isOpen) return null;

  // Check access for rendering
  const accessCheck = checkVRTAccess(user);
  if (!accessCheck.allowed) {
    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">VRT Settings</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="h6">Access Denied</Typography>
            <Typography>{accessCheck.reason}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              VRT settings require super administrator privileges.
            </Typography>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Visual Regression Testing Settings</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {/* Security Warning for Production */}
        {settings.enabledInProduction && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Production Warning</Typography>
            <Typography variant="body2">
              VRT is enabled in production. This may impact performance and storage usage.
              Ensure adequate monitoring and resource allocation.
            </Typography>
          </Alert>
        )}

        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Snapshot Engine" icon={<CameraIcon />} />
            <Tab label="Diff Analysis" icon={<CompareIcon />} />
            <Tab label="Confidence" icon={<PsychologyIcon />} />
            <Tab label="Testing" icon={<SpeedIcon />} />
            <Tab label="Learning" icon={<StorageIcon />} />
            <Tab label="Security" icon={<SecurityIcon />} />
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {selectedTab === 0 && (
              <SnapshotSettingsTab
                settings={settings.snapshot}
                onChange={(key, value) => handleSettingChange('snapshot', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('snapshot', parentKey, childKey, value)}
              />
            )}
            {selectedTab === 1 && (
              <DiffSettingsTab
                settings={settings.diff}
                onChange={(key, value) => handleSettingChange('diff', key, value)}
              />
            )}
            {selectedTab === 2 && (
              <ConfidenceSettingsTab
                settings={settings.confidence}
                onChange={(key, value) => handleSettingChange('confidence', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('confidence', parentKey, childKey, value)}
              />
            )}
            {selectedTab === 3 && (
              <PlaywrightSettingsTab
                settings={settings.playwright}
                onChange={(key, value) => handleSettingChange('playwright', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('playwright', parentKey, childKey, value)}
              />
            )}
            {selectedTab === 4 && (
              <LearningSettingsTab
                settings={settings.learning}
                onChange={(key, value) => handleSettingChange('learning', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('learning', parentKey, childKey, value)}
              />
            )}
            {selectedTab === 5 && (
              <SecuritySettingsTab
                settings={settings}
                onChange={(key, value) => handleSettingChange('settings', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('settings', parentKey, childKey, value)}
              />
            )}
          </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleReset} 
          color="secondary"
          disabled={loading}
        >
          Reset to Defaults
        </Button>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Tab Components
const SnapshotSettingsTab: React.FC<{
  settings: SnapshotConfig;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enabled}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
        }
        label="Enable Snapshot Engine"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Retention Days"
        type="number"
        value={settings.retentionDays}
        onChange={(e) => onChange('retentionDays', parseInt(e.target.value))}
        inputProps={{ min: 1, max: 365 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <FormControl fullWidth>
        <InputLabel>Image Format</InputLabel>
        <Select
          value={settings.format}
          onChange={(e) => onChange('format', e.target.value)}
          label="Image Format"
        >
          <MenuItem value="png">PNG</MenuItem>
          <MenuItem value="jpeg">JPEG</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    <Grid item xs={12}>
      <Typography variant="subtitle1" gutterBottom>
        Image Quality
      </Typography>
      <Slider
        value={settings.quality}
        onChange={(e, value) => onChange('quality', value)}
        min={0.1}
        max={1}
        step={0.1}
        marks={[
          { value: 0.1, label: '10%' },
          { value: 0.5, label: '50%' },
          { value: 1, label: '100%' }
        ]}
        valueLabelDisplay="auto"
      />
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Breakpoint Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(settings.breakpoints).map(([device, dimensions]) => (
              <Grid item xs={12} md={4} key={device}>
                <Typography variant="subtitle2" gutterBottom>
                  {device.charAt(0).toUpperCase() + device.slice(1)}
                </Typography>
                <TextField
                  fullWidth
                  label="Width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => onNestedChange('breakpoints', device, { ...dimensions, width: parseInt(e.target.value) })}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  label="Height"
                  type="number"
                  value={dimensions.height}
                  onChange={(e) => onNestedChange('breakpoints', device, { ...dimensions, height: parseInt(e.target.value) })}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  </Grid>
);

const DiffSettingsTab: React.FC<{
  settings: DiffConfig;
  onChange: (key: string, value: any) => void;
}> = ({ settings, onChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="subtitle1" gutterBottom>
        Diff Sensitivity
      </Typography>
      <Slider
        value={settings.sensitivity}
        onChange={(e, value) => onChange('sensitivity', value)}
        min={0.01}
        max={0.20}
        step={0.01}
        marks={[
          { value: 0.01, label: '1%' },
          { value: 0.05, label: '5%' },
          { value: 0.10, label: '10%' },
          { value: 0.20, label: '20%' }
        ]}
        valueLabelDisplay="auto"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Minimum Region Size (pixels)"
        type="number"
        value={settings.minRegionSize}
        onChange={(e) => onChange('minRegionSize', parseInt(e.target.value))}
        inputProps={{ min: 1 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Maximum Regions"
        type="number"
        value={settings.maxRegions}
        onChange={(e) => onChange('maxRegions', parseInt(e.target.value))}
        inputProps={{ min: 1, max: 1000 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Color Threshold"
        type="number"
        value={settings.colorThreshold}
        onChange={(e) => onChange('colorThreshold', parseInt(e.target.value))}
        inputProps={{ min: 0, max: 255 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Layout Threshold (px)"
        type="number"
        value={settings.layoutThreshold}
        onChange={(e) => onChange('layoutThreshold', parseInt(e.target.value))}
        inputProps={{ min: 0 }}
      />
    </Grid>

    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enableTextDetection}
            onChange={(e) => onChange('enableTextDetection', e.target.checked)}
          />
        }
        label="Enable Text Detection"
      />
    </Grid>

    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enableStyleDetection}
            onChange={(e) => onChange('enableStyleDetection', e.target.checked)}
          />
        }
        label="Enable Style Detection"
      />
    </Grid>
  </Grid>
);

const ConfidenceSettingsTab: React.FC<{
  settings: ConfidenceConfig;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enabled}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
        }
        label="Enable Confidence Adjustment"
      />
    </Grid>

    <Grid item xs={12}>
      <Typography variant="subtitle1" gutterBottom>
        Visual Weight
      </Typography>
      <Slider
        value={settings.visualWeight}
        onChange={(e, value) => onChange('visualWeight', value)}
        min={0}
        max={1}
        step={0.1}
        marks={[
          { value: 0, label: '0%' },
          { value: 0.5, label: '50%' },
          { value: 1, label: '100%' }
        ]}
        valueLabelDisplay="auto"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Unexpected Change Penalty"
        type="number"
        value={settings.unexpectedChangePenalty}
        onChange={(e) => onChange('unexpectedChangePenalty', parseFloat(e.target.value))}
        inputProps={{ step: 0.01, min: -1, max: 0 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Intentional Change Bonus"
        type="number"
        value={settings.intentionalChangeBonus}
        onChange={(e) => onChange('intentionalChangeBonus', parseFloat(e.target.value))}
        inputProps={{ step: 0.01, min: 0, max: 1 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Layout Stability Bonus"
        type="number"
        value={settings.layoutStabilityBonus}
        onChange={(e) => onChange('layoutStabilityBonus', parseFloat(e.target.value))}
        inputProps={{ step: 0.01, min: 0, max: 1 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.learningEnabled}
            onChange={(e) => onChange('learningEnabled', e.target.checked)}
          />
        }
        label="Enable Learning"
      />
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Severity Penalties</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(settings.severityPenalties).map(([severity, penalty]) => (
              <Grid item xs={12} md={6} key={severity}>
                <TextField
                  fullWidth
                  label={severity}
                  type="number"
                  value={penalty}
                  onChange={(e) => onNestedChange('severityPenalties', severity, parseFloat(e.target.value))}
                  inputProps={{ step: 0.01, min: -1, max: 1 }}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  </Grid>
);

const PlaywrightSettingsTab: React.FC<{
  settings: PlaywrightConfig;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enabled}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
        }
        label="Enable Playwright Tests"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Accessibility Threshold"
        type="number"
        value={settings.accessibilityThreshold}
        onChange={(e) => onChange('accessibilityThreshold', parseFloat(e.target.value))}
        inputProps={{ step: 0.1, min: 0, max: 1 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Color Contrast Threshold"
        type="number"
        value={settings.colorContrastThreshold}
        onChange={(e) => onChange('colorContrastThreshold', parseFloat(e.target.value))}
        inputProps={{ step: 0.1, min: 1, max: 21 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Max Test Duration (ms)"
        type="number"
        value={settings.maxTestDuration}
        onChange={(e) => onChange('maxTestDuration', parseInt(e.target.value))}
        inputProps={{ min: 1000, max: 60000 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Retry Attempts"
        type="number"
        value={settings.retryAttempts}
        onChange={(e) => onChange('retryAttempts', parseInt(e.target.value))}
        inputProps={{ min: 0, max: 10 }}
      />
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Screenshot Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.screenshotOptions.fullPage}
                    onChange={(e) => onNestedChange('screenshotOptions', 'fullPage', e.target.checked)}
                  />
                }
                label="Full Page Screenshots"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Quality"
                type="number"
                value={settings.screenshotOptions.quality}
                onChange={(e) => onNestedChange('screenshotOptions', 'quality', parseFloat(e.target.value))}
                inputProps={{ step: 0.1, min: 0.1, max: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={settings.screenshotOptions.type}
                  onChange={(e) => onNestedChange('screenshotOptions', 'type', e.target.value)}
                  label="Format"
                >
                  <MenuItem value="png">PNG</MenuItem>
                  <MenuItem value="jpeg">JPEG</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  </Grid>
);

const LearningSettingsTab: React.FC<{
  settings: LearningConfig;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enabled}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
        }
        label="Enable Learning System"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Min Samples for Training"
        type="number"
        value={settings.minSamplesForTraining}
        onChange={(e) => onChange('minSamplesForTraining', parseInt(e.target.value))}
        inputProps={{ min: 10, max: 1000 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Training Interval (hours)"
        type="number"
        value={settings.trainingInterval / (60 * 60 * 1000)}
        onChange={(e) => onChange('trainingInterval', parseInt(e.target.value) * 60 * 60 * 1000)}
        inputProps={{ min: 1, max: 168 }}
      />
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Feature Extraction</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(settings.featureExtraction).map(([feature, enabled]) => (
              <Grid item xs={12} md={6} key={feature}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enabled}
                      onChange={(e) => onNestedChange('featureExtraction', feature, e.target.checked)}
                    />
                  }
                  label={feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                />
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Model Update</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.modelUpdate.autoUpdate}
                    onChange={(e) => onNestedChange('modelUpdate', 'autoUpdate', e.target.checked)}
                  />
                }
                label="Auto Update Model"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Validation Split"
                type="number"
                value={settings.modelUpdate.validationSplit}
                onChange={(e) => onNestedChange('modelUpdate', 'validationSplit', parseFloat(e.target.value))}
                inputProps={{ step: 0.1, min: 0.1, max: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Learning Rate"
                type="number"
                value={settings.modelUpdate.learningRate}
                onChange={(e) => onNestedChange('modelUpdate', 'learningRate', parseFloat(e.target.value))}
                inputProps={{ step: 0.001, min: 0.001, max: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Iterations"
                type="number"
                value={settings.modelUpdate.maxIterations}
                onChange={(e) => onNestedChange('modelUpdate', 'maxIterations', parseInt(e.target.value))}
                inputProps={{ min: 100, max: 10000 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Storage</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Samples"
                type="number"
                value={settings.storage.maxSamples}
                onChange={(e) => onNestedChange('storage', 'maxSamples', parseInt(e.target.value))}
                inputProps={{ min: 100, max: 10000 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Retention Days"
                type="number"
                value={settings.storage.retentionDays}
                onChange={(e) => onNestedChange('storage', 'retentionDays', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.storage.compressionEnabled}
                    onChange={(e) => onNestedChange('storage', 'compressionEnabled', e.target.checked)}
                  />
                }
                label="Enable Compression"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  </Grid>
);

const SecuritySettingsTab: React.FC<{
  settings: VRTSettings;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Alert severity="info">
        <Typography variant="subtitle2" gutterBottom>
          Security & Privacy Settings
        </Typography>
        <Typography variant="body2">
          These settings control how VRT data is handled and stored to ensure compliance with privacy regulations.
        </Typography>
      </Alert>
    </Grid>

    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Retention
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Snapshot Retention"
                secondary="Snapshots are automatically deleted after the configured retention period"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Learning Data"
                secondary="Feedback samples are retained for model training and automatically cleaned up"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Access Control
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon />
              </ListItemIcon>
              <ListItemText
                primary="Super Admin Only"
                secondary="VRT features are restricted to super_admin users only"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon />
              </ListItemIcon>
              <ListItemText
                primary="Local Storage"
                secondary="All VRT data is stored locally in the browser, not transmitted to external servers"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Compliance
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText
                primary="GDPR Compliant"
                secondary="No personal data is collected or stored by the VRT system"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText
                primary="Audit Trail"
                secondary="All VRT operations are logged for compliance and debugging purposes"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

export default VRTSettingsPanel; 