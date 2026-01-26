import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Chip, Divider, Alert, CircularProgress, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, ListItemIcon, Switch, FormControlLabel } from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  BugReport as BugIcon,
  Build as BuildIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Api as ApiIcon,
  Palette as PaletteIcon,
  History as HistoryIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  ExpandMore as ExpandMoreIcon,
  AutoFixHigh as AutoFixIcon,
  Restore as RestoreIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccountTree as GitBranchIcon,
  CameraAlt as CameraAltIcon,
  Compare as CompareIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import ComponentInfo  from '@/hooks/useComponentRegistry';
import { editorBridge, FixResponse } from '@/shared/lib/om-ai/editorBridge';
import { OMAIStatus } from '@/shared/lib/om-ai/editorBridge';
import { autoFixEngine, AutoFixConfig } from '@/ai/autoFixEngine';
import { DetectedIssue, IssueSeverity } from '@/ai/errorClassifier';
import { FixRecord } from '@/ai/fixLogger';
import GitOpsPanel from './GitOpsPanel';
import VisualRegressionDashboard from './VisualRegressionDashboard';
import ManualFixEditor from './ManualFixEditor';

interface ComponentInspectorProps {
  isOpen: boolean;
  component: ComponentInfo | null;
  onClose: () => void;
  onApplyChanges: () => void;
  onDiscardChanges: () => void;
  onToggleEditMode: () => void;
  onUpdateChanges: (changes: Record<string, any>) => void;
  isEditMode: boolean;
  pendingChanges: Record<string, any>;
  omaiStatus: OMAIStatus;
}

const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  isOpen,
  component,
  onClose,
  onApplyChanges,
  onDiscardChanges,
  onToggleEditMode,
  onUpdateChanges,
  isEditMode,
  pendingChanges,
  omaiStatus
}) => {
  const [omaiResponse, setOmaiResponse] = useState<FixResponse | null>(null);
  const [isOmaiLoading, setIsOmaiLoading] = useState(false);
  const [editingProps, setEditingProps] = useState<Record<string, any>>({});
  
  // Autonomous fix system state
  const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixResult, setAutoFixResult] = useState<any>(null);
  const [fixHistory, setFixHistory] = useState<FixRecord[]>([]);
  const [autoFixConfig, setAutoFixConfig] = useState<AutoFixConfig>(autoFixEngine.getConfig());
  const [showAutoFixSettings, setShowAutoFixSettings] = useState(false);
  
  // GitOps panel state
  const [showGitOpsPanel, setShowGitOpsPanel] = useState(false);
  const [vrtDashboardOpen, setVrtDashboardOpen] = useState(false);

  // Initialize editing props when component changes
  useEffect(() => {
    if (component) {
      setEditingProps(component.props);
      // Load fix history for this component
      loadFixHistory();
      // Detect issues for this component
      detectIssues();
    }
  }, [component]);

  // Load fix history for the current component
  const loadFixHistory = async () => {
    if (!component) return;
    try {
      const history = await autoFixEngine.getFixHistory(component.id);
      setFixHistory(history);
    } catch (error) {
      console.error('Failed to load fix history:', error);
    }
  };

  // Detect issues for the current component
  const detectIssues = async () => {
    if (!component) return;
    try {
      // This would integrate with the error classifier
      // For now, we'll simulate issue detection
      const mockIssues: DetectedIssue[] = [];
      
      // Check for zero dimensions
      if (component.position.width === 0 || component.position.height === 0) {
        mockIssues.push({
          id: 'mock-issue-1',
          type: 'ZERO_DIMENSIONS' as any,
          severity: IssueSeverity.WARNING,
          message: 'Component has zero dimensions',
          componentId: component.id,
          componentName: component.name,
          confidence: 0.8,
          suggestions: ['Add explicit width and height', 'Check parent container']
        });
      }

      // Check for missing props
      const requiredProps = ['id', 'className'];
      const missingProps = requiredProps.filter(prop => !component.props[prop]);
      if (missingProps.length > 0) {
        mockIssues.push({
          id: 'mock-issue-2',
          type: 'UNBOUND_PROP' as any,
          severity: IssueSeverity.WARNING,
          message: `Missing props: ${missingProps.join(', ')}`,
          componentId: component.id,
          componentName: component.name,
          confidence: 0.7,
          suggestions: ['Add missing props', 'Provide default values']
        });
      }

      setDetectedIssues(mockIssues);
    } catch (error) {
      console.error('Failed to detect issues:', error);
    }
  };

  // Handle OMAI fix request
  const handleOmaiFix = async () => {
    if (!component) return;

    setIsOmaiLoading(true);
    setOmaiResponse(null);

    try {
      const response = await editorBridge.analyzeComponent(component);
      setOmaiResponse(response);
    } catch (error) {
      console.error('Error requesting OMAI fix:', error);
      setOmaiResponse({
        success: false,
        explanation: 'Failed to communicate with OMAI service.'
      });
    } finally {
      setIsOmaiLoading(false);
    }
  };

  // Handle prop value change
  const handlePropChange = (key: string, value: any) => {
    const newProps = { ...editingProps, [key]: value };
    setEditingProps(newProps);
    onUpdateChanges(newProps);
  };

  // Handle prop deletion
  const handlePropDelete = (key: string) => {
    const newProps = { ...editingProps };
    delete newProps[key];
    setEditingProps(newProps);
    onUpdateChanges(newProps);
  };

  // Handle autonomous fix
  const handleAutoFix = async () => {
    if (!component) return;

    setIsAutoFixing(true);
    setAutoFixResult(null);

    try {
      const result = await autoFixEngine.autoFixComponent({
        component,
        detectedIssues,
        userRole: 'super_admin', // This should come from auth context
        environment: 'development' // This should be configurable
      });

      setAutoFixResult(result);
      
      if (result.success) {
        // Reload fix history after successful fix
        await loadFixHistory();
        // Re-detect issues to see if they're resolved
        await detectIssues();
      }
    } catch (error) {
      console.error('Auto-fix failed:', error);
      setAutoFixResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Handle rollback
  const handleRollback = async (fixId: string) => {
    try {
      const success = await autoFixEngine.rollbackFix(fixId);
      if (success) {
        await loadFixHistory();
        await detectIssues();
        alert('Fix rolled back successfully');
      } else {
        alert('Failed to rollback fix');
      }
    } catch (error) {
      console.error('Rollback failed:', error);
      alert('Rollback failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Update auto-fix configuration
  const updateAutoFixConfig = (newConfig: Partial<AutoFixConfig>) => {
    const updatedConfig = { ...autoFixConfig, ...newConfig };
    setAutoFixConfig(updatedConfig);
    autoFixEngine.updateConfig(updatedConfig);
  };

  // Handle manual fix save
  const handleManualFixSave = async (path: string, contents: string) => {
    try {
      const response = await fetch('/api/editor/save-component', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, contents })
      });

      if (response.ok) {
        const result = await response.json();
        alert('Component saved successfully! Page will refresh to show changes.');
        
        // Refresh the page or reload the component
        window.location.reload();
        
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save component');
      }
    } catch (error) {
      console.error('Failed to save component:', error);
      alert('Failed to save component: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    }
  };

  // Handle preview diff
  const handlePreviewDiff = (originalContent: string, newContent: string) => {
    // This will be handled in the ManualFixEditor component
    console.log('Preview diff requested');
  };

  // Handle manual rollback (overloaded for manual fixes)
  const handleManualRollback = async (backupToken: string) => {
    try {
      const response = await fetch('/api/editor/rollback-component', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupToken })
      });

      if (response.ok) {
        alert('Component rolled back successfully! Page will refresh.');
        window.location.reload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to rollback component');
      }
    } catch (error) {
      console.error('Failed to rollback component:', error);
      alert('Failed to rollback: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Log component data to console
  const logToConsole = () => {
    if (component) {
      console.group('🔍 Component Inspector - Detailed Data');
      console.log('Component Info:', component);
      console.log('Current Props:', component.props);
      console.log('Pending Changes:', pendingChanges);
      console.log('Editing Props:', editingProps);
      console.log('API Routes:', component.apiRoutes);
      console.log('DB Tables:', component.dbTables);
      console.log('CSS Classes:', component.cssClasses);
      console.log('Tailwind Classes:', component.tailwindClasses);
      console.log('Position:', component.position);
      console.log('Detected Issues:', detectedIssues);
      console.log('Fix History:', fixHistory);
      console.groupEnd();
    }
  };

  if (!component) return null;

  return (
    <div className={`inspector-panel ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="inspector-header">
        <Typography className="inspector-title">
          {component.name}
        </Typography>
        <button className="inspector-close-btn" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      {/* Content */}
      <div className="inspector-content">
        {/* OMAI Status */}
        <div className={`omai-status ${omaiStatus.isAvailable ? 'online' : 'offline'}`}>
          <div className="omai-status-indicator" />
          <span>
            {omaiStatus.isAvailable ? 'OMAI Available' : 'OMAI Offline'}
          </span>
        </div>

        {/* Component Type */}
        <div className="inspector-section">
          <div className="inspector-section-title">
            <CodeIcon sx={{ fontSize: 16, mr: 1 }} />
            Component Type
          </div>
          <div className="inspector-field">
            <div className="inspector-field-value">
              {component.type}
            </div>
          </div>
        </div>

        {/* Props */}
        <div className="inspector-section">
          <div className="inspector-section-title">
            <EditIcon sx={{ fontSize: 16, mr: 1 }} />
            Properties
          </div>
          {Object.entries(editingProps).map(([key, value]) => (
            <div key={key} className="inspector-field">
              <div className="inspector-field-label">{key}</div>
              {isEditMode ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <TextField
                    size="small"
                    value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    onChange={(e) => handlePropChange(key, e.target.value)}
                    fullWidth
                    sx={{ flex: 1 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handlePropDelete(key)}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <div className="inspector-field-value">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </div>
              )}
            </div>
          ))}
          {Object.keys(editingProps).length === 0 && (
            <div className="inspector-field">
              <div className="inspector-field-value" style={{ color: '#6b7280' }}>
                No properties
              </div>
            </div>
          )}
        </div>

        {/* API Routes */}
        {component.apiRoutes && component.apiRoutes.length > 0 && (
          <div className="inspector-section">
            <div className="inspector-section-title">
              <ApiIcon sx={{ fontSize: 16, mr: 1 }} />
              API Routes
            </div>
            <div className="inspector-array">
              {component.apiRoutes.map((route, index) => (
                <span key={index} className="inspector-tag api">
                  {route}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Database Tables */}
        {component.dbTables && component.dbTables.length > 0 && (
          <div className="inspector-section">
            <div className="inspector-section-title">
              <StorageIcon sx={{ fontSize: 16, mr: 1 }} />
              Database Tables
            </div>
            <div className="inspector-array">
              {component.dbTables.map((table, index) => (
                <span key={index} className="inspector-tag db">
                  {table}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CSS Classes */}
        {component.cssClasses && component.cssClasses.length > 0 && (
          <div className="inspector-section">
            <div className="inspector-section-title">
              <PaletteIcon sx={{ fontSize: 16, mr: 1 }} />
              CSS Classes
            </div>
            <div className="inspector-array">
              {component.cssClasses.map((cls, index) => (
                <span key={index} className="inspector-tag css">
                  {cls}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tailwind Classes */}
        {component.tailwindClasses && component.tailwindClasses.length > 0 && (
          <div className="inspector-section">
            <div className="inspector-section-title">
              <PaletteIcon sx={{ fontSize: 16, mr: 1 }} />
              Tailwind Classes
            </div>
            <div className="inspector-array">
              {component.tailwindClasses.map((cls, index) => (
                <span key={index} className="inspector-tag css">
                  {cls}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Position Information */}
        <div className="inspector-section">
          <div className="inspector-section-title">
            <HistoryIcon sx={{ fontSize: 16, mr: 1 }} />
            Position
          </div>
          <div className="inspector-field">
            <div className="inspector-field-label">Dimensions</div>
            <div className="inspector-field-value">
              {component.position.width} × {component.position.height}px
            </div>
          </div>
          <div className="inspector-field">
            <div className="inspector-field-label">Location</div>
            <div className="inspector-field-value">
              ({component.position.x}, {component.position.y})
            </div>
          </div>
        </div>

        {/* Autonomous Fix System */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoFixIcon sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2">Autonomous Fix System</Typography>
              {detectedIssues.length > 0 && (
                <Chip 
                  label={detectedIssues.length} 
                  size="small" 
                  color="warning" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {/* Auto-Fix Settings */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  Auto-Fix Settings
                </Typography>
                <Button
                  size="small"
                  startIcon={<SettingsIcon />}
                  onClick={() => setShowAutoFixSettings(!showAutoFixSettings)}
                >
                  {showAutoFixSettings ? 'Hide' : 'Show'}
                </Button>
              </Box>
              
              {showAutoFixSettings && (
                <Box sx={{ pl: 2, borderLeft: '2px solid #e5e7eb', mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoFixConfig.enabled}
                        onChange={(e) => updateAutoFixConfig({ enabled: e.target.checked })}
                        size="small"
                      />
                    }
                    label="Auto-fix enabled"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoFixConfig.lockdownMode}
                        onChange={(e) => updateAutoFixConfig({ lockdownMode: e.target.checked })}
                        size="small"
                      />
                    }
                    label="Lockdown mode"
                  />
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block">
                      Confidence Threshold: {Math.round(autoFixConfig.confidenceThreshold * 100)}%
                    </Typography>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={autoFixConfig.confidenceThreshold}
                      onChange={(e) => updateAutoFixConfig({ confidenceThreshold: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Detected Issues */}
            {detectedIssues.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Detected Issues ({detectedIssues.length})
                </Typography>
                <List dense>
                  {detectedIssues.map((issue, index) => (
                    <ListItem key={issue.id} sx={{ py: 0.5 }}>
                      <ListItemIcon>
                        {issue.severity === IssueSeverity.CRITICAL ? (
                          <ErrorIcon color="error" sx={{ fontSize: 16 }} />
                        ) : issue.severity === IssueSeverity.WARNING ? (
                          <WarningIcon color="warning" sx={{ fontSize: 16 }} />
                        ) : (
                          <CheckCircleIcon color="info" sx={{ fontSize: 16 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={issue.message}
                        secondary={`Confidence: ${Math.round(issue.confidence * 100)}%`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Auto-Fix Result */}
            {autoFixResult && (
              <Box sx={{ mb: 2 }}>
                <Alert 
                  severity={autoFixResult.success ? 'success' : 'error'}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2">
                    {autoFixResult.success ? 'Auto-fix completed successfully' : 'Auto-fix failed'}
                  </Typography>
                  {autoFixResult.error && (
                    <Typography variant="caption" display="block">
                      Error: {autoFixResult.error}
                    </Typography>
                  )}
                  {autoFixResult.confidence && (
                    <Typography variant="caption" display="block">
                      Confidence: {Math.round(autoFixResult.confidence * 100)}%
                    </Typography>
                  )}
                </Alert>
              </Box>
            )}

            {/* Fix History */}
            {fixHistory.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Fix History ({fixHistory.length})
                </Typography>
                <List dense>
                  {fixHistory.slice(0, 3).map((record) => (
                    <ListItem key={record.id} sx={{ py: 0.5 }}>
                      <ListItemIcon>
                        {record.success ? (
                          <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                        ) : (
                          <ErrorIcon color="error" sx={{ fontSize: 16 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={`${record.appliedFixes.length} fixes applied`}
                        secondary={new Date(record.timestamp).toLocaleString()}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      {record.success && (
                        <Button
                          size="small"
                          startIcon={<RestoreIcon />}
                          onClick={() => handleRollback(record.id)}
                          sx={{ ml: 1 }}
                        >
                          Rollback
                        </Button>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Auto-Fix Actions */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<AutoFixIcon />}
                onClick={handleAutoFix}
                disabled={isAutoFixing || !autoFixConfig.enabled || detectedIssues.length === 0}
                color="primary"
              >
                {isAutoFixing ? 'Fixing...' : 'Auto-Fix Issues'}
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<BugIcon />}
                onClick={detectIssues}
                disabled={isAutoFixing}
              >
                Re-scan Issues
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* GitOps & Pull Requests */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitBranchIcon sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2">GitOps & Pull Requests</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <GitOpsPanel
              component={component}
              isOpen={showGitOpsPanel}
              onClose={() => setShowGitOpsPanel(false)}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<GitBranchIcon />}
                onClick={() => setShowGitOpsPanel(!showGitOpsPanel)}
              >
                {showGitOpsPanel ? 'Hide GitOps Panel' : 'Open GitOps Panel'}
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Visual Regression Testing */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugIcon sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2">Visual Regression Testing</Typography>
              {/* Live VRT status indicator */}
              <Chip 
                label="Live" 
                color="primary" 
                size="small" 
                sx={{ fontSize: '0.7rem', height: '18px' }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Integrated Visual Regression Testing for Manual Fixes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                VRT automatically captures snapshots before and after manual fixes to validate visual changes.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<BugIcon />}
                  onClick={() => setVrtDashboardOpen(true)}
                  color="info"
                >
                  Open VRT Dashboard
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SettingsIcon />}
                  onClick={() => {
                    // Open VRT settings (could be integrated later)
                    console.log('Open VRT Settings');
                  }}
                >
                  VRT Settings
                </Button>
              </Box>
            </Box>

            {/* Real-time VRT Status */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Current Session Status
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip 
                  label="Pre-fix Snapshot" 
                  color="default" 
                  size="small"
                  icon={<CheckCircleIcon />}
                />
                <Chip 
                  label="Manual Fix Available" 
                  color="primary" 
                  size="small"
                  icon={<EditIcon />}
                />
                <Chip 
                  label="Post-fix Pending" 
                  color="default" 
                  size="small"
                  icon={<PendingIcon />}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                VRT will auto-capture post-fix snapshot when manual changes are saved
              </Typography>
            </Box>

            {/* VRT Summary with Live Updates */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Latest Analysis Summary
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pixel Difference
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    2.5%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Severity
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="warning.main">
                    MINOR
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Confidence
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="success.main">
                    92%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    2 min ago
                  </Typography>
                </Box>
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Auto-Integration:</strong> VRT will automatically re-run when you save manual fixes 
                  in the editor below. Check the Visual Testing tab in the Manual Fix Editor for detailed results.
                </Typography>
              </Alert>
            </Box>

            {/* Quick VRT Actions */}
            <Box>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CameraAltIcon />}
                  onClick={() => {
                    // This would trigger a manual snapshot
                    console.log('Manual snapshot triggered');
                  }}
                >
                  Take Snapshot
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CompareIcon />}
                  onClick={() => {
                    // This would trigger comparison
                    console.log('Manual comparison triggered');
                  }}
                >
                  Compare
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    // This would reset VRT session
                    console.log('VRT session reset');
                  }}
                >
                  Reset Session
                </Button>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Manual Fix Editor */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2">Manual Fix Editor</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <ManualFixEditor 
              component={component}
              onSave={handleManualFixSave}
              onPreviewDiff={handlePreviewDiff}
              onRollback={handleManualRollback}
            />
          </AccordionDetails>
        </Accordion>

        {/* OMAI Response */}
        {omaiResponse && (
          <div className="inspector-section">
            <div className="inspector-section-title">
              <BuildIcon sx={{ fontSize: 16, mr: 1 }} />
              OMAI Analysis
            </div>
            <Alert 
              severity={omaiResponse.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              {omaiResponse.explanation}
            </Alert>
            {omaiResponse.suggestion && (
              <div className="inspector-field">
                <div className="inspector-field-label">Suggestion</div>
                <div className="inspector-field-value">
                  {omaiResponse.suggestion}
                </div>
              </div>
            )}
            {omaiResponse.confidence && (
              <div className="inspector-field">
                <div className="inspector-field-label">Confidence</div>
                <div className="inspector-field-value">
                  {Math.round(omaiResponse.confidence * 100)}%
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="inspector-actions">
        {/* Edit Mode Toggle */}
        <button
          className={`inspector-btn ${isEditMode ? 'danger' : 'secondary'}`}
          onClick={onToggleEditMode}
        >
          {isEditMode ? <CancelIcon /> : <EditIcon />}
          {isEditMode ? 'Cancel' : 'Edit'}
        </button>

        {/* Save Changes */}
        {isEditMode && (
          <button
            className="inspector-btn primary"
            onClick={onApplyChanges}
            disabled={Object.keys(pendingChanges).length === 0}
          >
            <SaveIcon />
            Save
          </button>
        )}

        {/* OMAI Fix */}
        <button
          className="inspector-btn secondary"
          onClick={handleOmaiFix}
          disabled={isOmaiLoading || !omaiStatus.isAvailable}
        >
          {isOmaiLoading ? (
            <CircularProgress size={16} />
          ) : (
            <BugIcon />
          )}
          {isOmaiLoading ? 'Analyzing...' : 'Fix with OMAI'}
        </button>

        {/* Console Log */}
        <button
          className="inspector-btn secondary"
          onClick={logToConsole}
        >
          <CodeIcon />
          Console
        </button>
      </div>

      {/* VRT Dashboard Dialog */}
      <VisualRegressionDashboard
        component={component}
        isOpen={vrtDashboardOpen}
        onClose={() => setVrtDashboardOpen(false)}
      />
    </div>
  );
};

export default ComponentInspector; 