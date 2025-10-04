import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Compare as CompareIcon,
  BugReport as BugIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Computer as DesktopIcon,
  TabletMac as TabletIcon,
  Smartphone as PhoneIcon
} from '@mui/icons-material';
import { ComponentInfo } from '../hooks/useComponentRegistry.ts';
import { SnapshotData } from '../ai/visualTesting/snapshotEngine.ts';
import { VisualDiffResult, DiffSeverity, DiffType } from '../ai/visualTesting/diffAnalyzer.ts';
import { ConfidenceAdjustment } from '../ai/visualTesting/confidenceAdjuster.ts';
import { PlaywrightTestSuite, TestResult } from '../ai/visualTesting/playwrightTests.ts';
import { RegressionFeedback } from '../ai/learning/regressionFeedback.ts';
import { exportSnapshotAsPng, exportVRTMetadataAsJson, generatePngFilename, generateJsonFilename, logExportAction, VRTMetadata } from '../ai/vrt/exportUtils.ts';

interface VisualRegressionDashboardProps {
  component: ComponentInfo;
  isOpen: boolean;
  onClose: () => void;
}

interface DashboardState {
  snapshots: SnapshotData[];
  diffResults: VisualDiffResult[];
  testSuites: PlaywrightTestSuite[];
  confidenceAdjustments: ConfidenceAdjustment[];
  feedbackSamples: RegressionFeedback[];
  selectedSnapshot: SnapshotData | null;
  selectedDiff: VisualDiffResult | null;
  selectedTestSuite: PlaywrightTestSuite | null;
  loading: boolean;
  error: string | null;
  filters: {
    severity: DiffSeverity[];
    deviceType: string[];
    dateRange: { start: number; end: number } | null;
    minScore: number;
    maxScore: number;
  };
  sortBy: 'timestamp' | 'severity' | 'score' | 'deviceType';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list' | 'timeline';
  showOverlays: boolean;
  diffSensitivity: number;
  selectedTab: number;
}

// Mock useAuth for super_admin check (replace with real context in production)
const useAuth = () => ({ user: { role: 'super_admin', name: 'super_admin' } });

const VisualRegressionDashboard: React.FC<VisualRegressionDashboardProps> = ({
  component,
  isOpen,
  onClose
}) => {
  const [state, setState] = useState<DashboardState>({
    snapshots: [],
    diffResults: [],
    testSuites: [],
    confidenceAdjustments: [],
    feedbackSamples: [],
    selectedSnapshot: null,
    selectedDiff: null,
    selectedTestSuite: null,
    loading: false,
    error: null,
    filters: {
      severity: [],
      deviceType: [],
      dateRange: null,
      minScore: 0,
      maxScore: 1
    },
    sortBy: 'timestamp',
    sortOrder: 'desc',
    viewMode: 'grid',
    showOverlays: true,
    diffSensitivity: 0.05,
    selectedTab: 0
  });

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && component) {
      loadDashboardData();
    }
  }, [isOpen, component]);

  const loadDashboardData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // In a real implementation, these would be loaded from the respective services
      // For now, we'll simulate the data loading
      const mockData = await simulateDataLoading();
      
      setState(prev => ({
        ...prev,
        ...mockData,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data'
      }));
    }
  };

  const simulateDataLoading = async (): Promise<Partial<DashboardState>> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock snapshots
    const mockSnapshots: SnapshotData[] = [
      {
        id: 'snapshot_1',
        metadata: {
          componentId: component.id,
          componentName: component.name,
          timestamp: Date.now() - 86400000, // 1 day ago
          dimensions: { width: 800, height: 600 },
          viewport: { width: 1920, height: 1080 },
          deviceType: 'desktop',
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        elementBounds: { x: 0, y: 0, width: 800, height: 600 },
        componentState: {}
      },
      {
        id: 'snapshot_2',
        metadata: {
          componentId: component.id,
          componentName: component.name,
          timestamp: Date.now(),
          dimensions: { width: 800, height: 600 },
          viewport: { width: 1920, height: 1080 },
          deviceType: 'desktop',
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        elementBounds: { x: 0, y: 0, width: 800, height: 600 },
        componentState: {}
      }
    ];

    // Mock diff results
    const mockDiffResults: VisualDiffResult[] = [
      {
        id: 'diff_1',
        baselineSnapshotId: 'snapshot_1',
        postFixSnapshotId: 'snapshot_2',
        componentId: component.id,
        timestamp: Date.now(),
        diffPercentage: 2.5,
        severity: DiffSeverity.MINOR,
        regions: [
          {
            x: 100,
            y: 100,
            width: 50,
            height: 30,
            diffType: DiffType.COLOR_CHANGE,
            severity: DiffSeverity.MINOR,
            confidence: 0.8,
            description: 'Color change detected (15.2 avg diff) - MINOR severity'
          }
        ],
        summary: {
          totalRegions: 1,
          regionsByType: { [DiffType.COLOR_CHANGE]: 1 },
          regionsBySeverity: { [DiffSeverity.MINOR]: 1 },
          averageConfidence: 0.8
        },
        metadata: {
          viewportSize: { width: 1920, height: 1080 },
          deviceType: 'desktop',
          processingTime: 150
        }
      }
    ];

    return {
      snapshots: mockSnapshots,
      diffResults: mockDiffResults,
      testSuites: [],
      confidenceAdjustments: [],
      feedbackSamples: []
    };
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setState(prev => ({ ...prev, selectedTab: newValue }));
  };

  const handleSnapshotSelect = (snapshot: SnapshotData) => {
    setState(prev => ({ ...prev, selectedSnapshot: snapshot }));
  };

  const handleDiffSelect = (diff: VisualDiffResult) => {
    setState(prev => ({ ...prev, selectedDiff: diff }));
  };

  const handleFilterChange = (filterType: keyof DashboardState['filters'], value: any) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value
      }
    }));
  };

  const handleSortChange = (sortBy: DashboardState['sortBy']) => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSeverityColor = (severity: DiffSeverity) => {
    switch (severity) {
      case DiffSeverity.CRITICAL: return 'error';
      case DiffSeverity.MAJOR: return 'warning';
      case DiffSeverity.MODERATE: return 'info';
      case DiffSeverity.MINOR: return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: DiffSeverity) => {
    switch (severity) {
      case DiffSeverity.CRITICAL: return <ErrorIcon />;
      case DiffSeverity.MAJOR: return <WarningIcon />;
      case DiffSeverity.MODERATE: return <InfoIcon />;
      case DiffSeverity.MINOR: return <CheckCircleIcon />;
      default: return <InfoIcon />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop': return <DesktopIcon />;
      case 'tablet': return <TabletIcon />;
      case 'mobile': return <PhoneIcon />;
      default: return <DesktopIcon />;
    }
  };

  const filteredDiffResults = state.diffResults.filter(diff => {
    if (state.filters.severity.length > 0 && !state.filters.severity.includes(diff.severity)) {
      return false;
    }
    if (state.filters.deviceType.length > 0 && !state.filters.deviceType.includes(diff.metadata.deviceType)) {
      return false;
    }
    if (state.filters.dateRange) {
      const timestamp = diff.timestamp;
      if (timestamp < state.filters.dateRange.start || timestamp > state.filters.dateRange.end) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    const aValue = a[state.sortBy as keyof VisualDiffResult];
    const bValue = b[state.sortBy as keyof VisualDiffResult];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return state.sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return state.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  // Export handlers
  const handleDownloadPng = async () => {
    if (!mainContentRef.current) return;
    const filename = generatePngFilename(component.name, 'side-by-side');
    await exportSnapshotAsPng('side-by-side', mainContentRef.current, filename);
    logExportAction({
      timestamp: new Date().toISOString(),
      action: 'Export VRT PNG',
      component: component.name,
      details: 'View: side-by-side',
      user: user?.name || 'unknown'
    });
  };
  const handleDownloadJson = () => {
    // Compose mock metadata for now
    const diff = state.diffResults[0];
    const metadata: VRTMetadata = {
      componentId: component.id,
      componentName: component.name,
      timestamp: Date.now(),
      diffScore: diff?.diffPercentage || 0,
      confidenceBefore: 0.9,
      confidenceAfter: 0.92,
      affectedSelectors: ['.mock-selector'],
      snapshotMetadata: diff ? {
        baseline: {
          timestamp: Date.now() - 86400000,
          dimensions: { width: 800, height: 600 },
          deviceType: 'desktop'
        },
        postFix: {
          timestamp: Date.now(),
          dimensions: { width: 800, height: 600 },
          deviceType: 'desktop'
        }
      } : undefined,
      diffRegions: diff?.regions?.map(r => ({
        x: r.x, y: r.y, width: r.width, height: r.height,
        diffType: r.diffType, severity: r.severity, confidence: r.confidence
      })) || [],
      testResults: []
    };
    const filename = generateJsonFilename(component.name);
    exportVRTMetadataAsJson(metadata, filename);
    logExportAction({
      timestamp: new Date().toISOString(),
      action: 'Export VRT Report JSON',
      component: component.name,
      details: `Score: ${metadata.diffScore}`,
      user: user?.name || 'unknown'
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Visual Regression Dashboard - {component.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isSuperAdmin && (
              <>
                <Button onClick={handleDownloadPng} startIcon={<DownloadIcon />} variant="outlined" size="small">
                  Download PNG
                </Button>
                <Button onClick={handleDownloadJson} startIcon={<DownloadIcon />} variant="outlined" size="small">
                  Download Report (JSON)
                </Button>
              </>
            )}
            <Tooltip title="Refresh Data">
              <IconButton onClick={loadDashboardData} disabled={state.loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <ErrorIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {state.loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : state.error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {state.error}
          </Alert>
        ) : (
          <Box ref={mainContentRef} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filters and Controls */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Severity</InputLabel>
                    <Select
                      multiple
                      value={state.filters.severity}
                      onChange={(e) => handleFilterChange('severity', e.target.value)}
                      label="Severity"
                    >
                      {Object.values(DiffSeverity).map(severity => (
                        <MenuItem key={severity} value={severity}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getSeverityIcon(severity)}
                            {severity}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Device Type</InputLabel>
                    <Select
                      multiple
                      value={state.filters.deviceType}
                      onChange={(e) => handleFilterChange('deviceType', e.target.value)}
                      label="Device Type"
                    >
                      {['desktop', 'tablet', 'mobile'].map(device => (
                        <MenuItem key={device} value={device}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getDeviceIcon(device)}
                            {device}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.showOverlays}
                        onChange={(e) => setState(prev => ({ ...prev, showOverlays: e.target.checked }))}
                      />
                    }
                    label="Show Overlays"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">Diff Sensitivity:</Typography>
                    <Slider
                      value={state.diffSensitivity}
                      onChange={(e, value) => setState(prev => ({ ...prev, diffSensitivity: value as number }))}
                      min={0.01}
                      max={0.20}
                      step={0.01}
                      size="small"
                      sx={{ width: 100 }}
                    />
                    <Typography variant="body2">{(state.diffSensitivity * 100).toFixed(0)}%</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Tabs value={state.selectedTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Snapshots" />
                <Tab label="Visual Diffs" />
                <Tab label="Test Results" />
                <Tab label="Confidence Analysis" />
                <Tab label="Learning Feedback" />
              </Tabs>

              <Box sx={{ height: 'calc(100% - 48px)', overflow: 'auto', p: 2 }}>
                {state.selectedTab === 0 && (
                  <SnapshotsTab
                    snapshots={state.snapshots}
                    selectedSnapshot={state.selectedSnapshot}
                    onSnapshotSelect={handleSnapshotSelect}
                    onFullscreenImage={setFullscreenImage}
                  />
                )}
                {state.selectedTab === 1 && (
                  <VisualDiffsTab
                    diffResults={filteredDiffResults}
                    selectedDiff={state.selectedDiff}
                    onDiffSelect={handleDiffSelect}
                    showOverlays={state.showOverlays}
                    diffSensitivity={state.diffSensitivity}
                  />
                )}
                {state.selectedTab === 2 && (
                  <TestResultsTab testSuites={state.testSuites} />
                )}
                {state.selectedTab === 3 && (
                  <ConfidenceAnalysisTab confidenceAdjustments={state.confidenceAdjustments} />
                )}
                {state.selectedTab === 4 && (
                  <LearningFeedbackTab feedbackSamples={state.feedbackSamples} />
                )}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Fullscreen Image Dialog */}
      <Dialog
        open={!!fullscreenImage}
        onClose={() => setFullscreenImage(null)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Snapshot Preview</Typography>
        </DialogTitle>
        <DialogContent>
          {fullscreenImage && (
            <img
              src={fullscreenImage}
              alt="Snapshot"
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFullscreenImage(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

// Tab Components
const SnapshotsTab: React.FC<{
  snapshots: SnapshotData[];
  selectedSnapshot: SnapshotData | null;
  onSnapshotSelect: (snapshot: SnapshotData) => void;
  onFullscreenImage: (imageData: string | null) => void;
}> = ({ snapshots, selectedSnapshot, onSnapshotSelect, onFullscreenImage }) => (
  <Grid container spacing={2}>
    {snapshots.map(snapshot => (
      <Grid item xs={12} md={6} lg={4} key={snapshot.id}>
        <Card
          sx={{
            cursor: 'pointer',
            border: selectedSnapshot?.id === snapshot.id ? 2 : 1,
            borderColor: selectedSnapshot?.id === snapshot.id ? 'primary.main' : 'divider'
          }}
          onClick={() => onSnapshotSelect(snapshot)}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getDeviceIcon(snapshot.metadata.deviceType)}
              <Typography variant="subtitle2">
                {snapshot.metadata.deviceType}
              </Typography>
              <Chip
                label={new Date(snapshot.metadata.timestamp).toLocaleDateString()}
                size="small"
              />
            </Box>
            <Box sx={{ position: 'relative' }}>
              <img
                src={snapshot.imageData}
                alt={`Snapshot ${snapshot.id}`}
                style={{ width: '100%', height: 'auto', maxHeight: 200 }}
              />
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onFullscreenImage(snapshot.imageData);
                }}
              >
                <FullscreenIcon />
              </IconButton>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {snapshot.metadata.dimensions.width} × {snapshot.metadata.dimensions.height}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

const VisualDiffsTab: React.FC<{
  diffResults: VisualDiffResult[];
  selectedDiff: VisualDiffResult | null;
  onDiffSelect: (diff: VisualDiffResult) => void;
  showOverlays: boolean;
  diffSensitivity: number;
}> = ({ diffResults, selectedDiff, onDiffSelect, showOverlays, diffSensitivity }) => (
  <Grid container spacing={2}>
    {diffResults.map(diff => (
      <Grid item xs={12} key={diff.id}>
        <Card
          sx={{
            cursor: 'pointer',
            border: selectedDiff?.id === diff.id ? 2 : 1,
            borderColor: selectedDiff?.id === diff.id ? 'primary.main' : 'divider'
          }}
          onClick={() => onDiffSelect(diff)}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {getSeverityIcon(diff.severity)}
              <Typography variant="h6">
                Visual Diff - {diff.diffPercentage.toFixed(2)}%
              </Typography>
              <Chip
                label={diff.severity}
                color={getSeverityColor(diff.severity) as any}
                size="small"
              />
              <Chip
                label={diff.metadata.deviceType}
                icon={getDeviceIcon(diff.metadata.deviceType)}
                size="small"
              />
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Diff Regions ({diff.summary.totalRegions})
                </Typography>
                <List dense>
                  {diff.regions.map((region, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {getSeverityIcon(region.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={region.diffType}
                        secondary={region.description}
                      />
                      <Chip
                        label={`${(region.confidence * 100).toFixed(0)}%`}
                        size="small"
                        color={region.confidence > 0.8 ? 'success' : 'warning'}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Summary
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    Processing Time: {diff.metadata.processingTime}ms
                  </Typography>
                  <Typography variant="body2">
                    Average Confidence: {(diff.summary.averageConfidence * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    Timestamp: {new Date(diff.timestamp).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

const TestResultsTab: React.FC<{ testSuites: PlaywrightTestSuite[] }> = ({ testSuites }) => (
  <Box>
    {testSuites.length === 0 ? (
      <Alert severity="info">No test suites found for this component.</Alert>
    ) : (
      testSuites.map(suite => (
        <Accordion key={suite.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">{suite.name}</Typography>
              <Chip
                label={`${suite.summary.successRate.toFixed(1)}%`}
                color={suite.summary.successRate > 80 ? 'success' : 'warning'}
              />
              <Typography variant="body2">
                {suite.summary.passed}/{suite.summary.totalTests} passed
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">
              Last run: {new Date(suite.metadata.lastRun).toLocaleString()}
            </Typography>
            <Typography variant="body2">
              Total runs: {suite.metadata.totalRuns}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))
    )}
  </Box>
);

const ConfidenceAnalysisTab: React.FC<{ confidenceAdjustments: ConfidenceAdjustment[] }> = ({ confidenceAdjustments }) => (
  <Box>
    {confidenceAdjustments.length === 0 ? (
      <Alert severity="info">No confidence adjustments found for this component.</Alert>
    ) : (
      confidenceAdjustments.map(adjustment => (
        <Card key={adjustment.timestamp} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">
              Confidence Adjustment
            </Typography>
            <Typography variant="body2">
              Original: {adjustment.originalConfidence.toFixed(3)} → Adjusted: {adjustment.adjustedConfidence.toFixed(3)}
            </Typography>
            <Typography variant="body2">
              Factor: {adjustment.adjustmentFactor > 0 ? '+' : ''}{adjustment.adjustmentFactor.toFixed(3)}
            </Typography>
          </CardContent>
        </Card>
      ))
    )}
  </Box>
);

const LearningFeedbackTab: React.FC<{ feedbackSamples: RegressionFeedback[] }> = ({ feedbackSamples }) => (
  <Box>
    {feedbackSamples.length === 0 ? (
      <Alert severity="info">No learning feedback found for this component.</Alert>
    ) : (
      feedbackSamples.map(feedback => (
        <Card key={feedback.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">
              Learning Feedback - {feedback.learningMetrics.overallScore.toFixed(3)} score
            </Typography>
            <Typography variant="body2">
              Visual Accuracy: {(feedback.learningMetrics.visualAccuracy * 100).toFixed(1)}%
            </Typography>
            <Typography variant="body2">
              Confidence Accuracy: {(feedback.learningMetrics.confidenceAccuracy * 100).toFixed(1)}%
            </Typography>
            <Typography variant="body2">
              Test Accuracy: {(feedback.learningMetrics.testAccuracy * 100).toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
      ))
    )}
  </Box>
);

export default VisualRegressionDashboard; 