import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Switch,
  FormControlLabel,
  Alert,
  Grid,
  Paper,
  Divider,
  IconButton,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon,
  AutoFixHigh as AutoFixIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  Compare as CompareIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Camera as CameraIcon,
  Psychology as PsychologyIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import VisualRegressionDashboard from '../../components/VisualRegressionDashboard';
import VRTSettingsPanel from '../../components/VRTSettingsPanel';

interface VisualTestDemoProps {}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  category: 'layout' | 'color' | 'accessibility' | 'responsive' | 'performance';
  enabled: boolean;
  component: string;
  expectedIssues: string[];
}

const VisualTestDemo: React.FC<VisualTestDemoProps> = () => {
  const { user } = useAuth();
  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([
    {
      id: 'layout-shift',
      name: 'Layout Shift Bug',
      description: 'Simulates a layout shift by changing component dimensions',
      severity: 'major',
      category: 'layout',
      enabled: true,
      component: 'UserCard',
      expectedIssues: ['Layout shift detected', 'Component dimensions changed']
    },
    {
      id: 'color-change',
      name: 'Color Change Bug',
      description: 'Introduces unexpected color changes in components',
      severity: 'moderate',
      category: 'color',
      enabled: true,
      component: 'Button',
      expectedIssues: ['Color change detected', 'Contrast ratio affected']
    },
    {
      id: 'accessibility-issue',
      name: 'Accessibility Bug',
      description: 'Removes accessibility attributes from interactive elements',
      severity: 'critical',
      category: 'accessibility',
      enabled: true,
      component: 'FormInput',
      expectedIssues: ['Missing ARIA labels', 'Accessibility score decreased']
    },
    {
      id: 'responsive-break',
      name: 'Responsive Break Bug',
      description: 'Breaks responsive layout at specific breakpoints',
      severity: 'major',
      category: 'responsive',
      enabled: true,
      component: 'Grid',
      expectedIssues: ['Responsive layout broken', 'Overflow detected']
    },
    {
      id: 'performance-issue',
      name: 'Performance Bug',
      description: 'Simulates performance issues with heavy rendering',
      severity: 'moderate',
      category: 'performance',
      enabled: true,
      component: 'DataTable',
      expectedIssues: ['Rendering performance degraded', 'Memory usage increased']
    }
  ]);

  const [vrtDashboardOpen, setVrtDashboardOpen] = useState(false);
  const [vrtSettingsOpen, setVrtSettingsOpen] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string>('UserCard');
  const [testConfig, setTestConfig] = useState({
    diffSensitivity: 0.05,
    enableMultiBreakpoint: true,
    enableAccessibilityTests: true,
    enablePerformanceTests: true,
    screenshotQuality: 0.9
  });

  const handleScenarioToggle = (scenarioId: string) => {
    setTestScenarios(prev =>
      prev.map(scenario =>
        scenario.id === scenarioId
          ? { ...scenario, enabled: !scenario.enabled }
          : scenario
      )
    );
  };

  const runVisualTests = async () => {
    setIsRunningTests(true);
    
    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResults = testScenarios
        .filter(scenario => scenario.enabled)
        .map(scenario => ({
          id: `test_${scenario.id}_${Date.now()}`,
          scenarioId: scenario.id,
          component: scenario.component,
          status: Math.random() > 0.3 ? 'passed' : 'failed',
          severity: scenario.severity,
          issues: scenario.expectedIssues,
          timestamp: Date.now(),
          diffPercentage: Math.random() * 10,
          confidence: 0.7 + Math.random() * 0.3
        }));
      
      setTestResults(mockResults);
      console.log('[VRT Demo] Visual tests completed:', mockResults);
    } catch (error) {
      console.error('[VRT Demo] Test execution failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const exportTestResults = () => {
    const data = {
      exportDate: new Date().toISOString(),
      testConfig,
      scenarios: testScenarios.filter(s => s.enabled),
      results: testResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vrt-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'major': return 'warning';
      case 'moderate': return 'info';
      case 'minor': return 'success';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'layout': return <CompareIcon />;
      case 'color': return <VisibilityIcon />;
      case 'accessibility': return <PsychologyIcon />;
      case 'responsive': return <AutoFixIcon />;
      case 'performance': return <StorageIcon />;
      default: return <BugIcon />;
    }
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This demo is only available to super_admin users.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Visual Regression Testing Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This demo provides a controlled environment for testing the Visual Regression Testing (VRT) system.
        Use the test scenarios below to simulate various visual bugs and validate the VRT detection capabilities.
      </Typography>

      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Control Panel
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={isRunningTests ? <StopIcon /> : <PlayIcon />}
                onClick={runVisualTests}
                disabled={isRunningTests}
                fullWidth
              >
                {isRunningTests ? 'Running Tests...' : 'Run Visual Tests'}
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={clearTestResults}
                disabled={testResults.length === 0}
                fullWidth
              >
                Clear Results
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportTestResults}
                disabled={testResults.length === 0}
                fullWidth
              >
                Export Results
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setVrtSettingsOpen(true)}
                fullWidth
              >
                VRT Settings
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Test Configuration */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Test Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Diff Sensitivity: {(testConfig.diffSensitivity * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={testConfig.diffSensitivity}
                onChange={(e, value) => setTestConfig(prev => ({ ...prev, diffSensitivity: value as number }))}
                min={0.01}
                max={0.20}
                step={0.01}
                marks={[
                  { value: 0.01, label: '1%' },
                  { value: 0.05, label: '5%' },
                  { value: 0.10, label: '10%' },
                  { value: 0.20, label: '20%' }
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Target Component</InputLabel>
                <Select
                  value={selectedComponent}
                  onChange={(e) => setSelectedComponent(e.target.value)}
                  label="Target Component"
                >
                  <MenuItem value="UserCard">User Card</MenuItem>
                  <MenuItem value="Button">Button</MenuItem>
                  <MenuItem value="FormInput">Form Input</MenuItem>
                  <MenuItem value="Grid">Grid</MenuItem>
                  <MenuItem value="DataTable">Data Table</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={testConfig.enableMultiBreakpoint}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, enableMultiBreakpoint: e.target.checked }))}
                  />
                }
                label="Multi-Breakpoint Testing"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={testConfig.enableAccessibilityTests}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, enableAccessibilityTests: e.target.checked }))}
                  />
                }
                label="Accessibility Tests"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={testConfig.enablePerformanceTests}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, enablePerformanceTests: e.target.checked }))}
                  />
                }
                label="Performance Tests"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Test Scenarios */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Scenarios
              </Typography>
              <List>
                {testScenarios.map(scenario => (
                  <ListItem key={scenario.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getSeverityColor(scenario.severity) }}>
                        {getCategoryIcon(scenario.category)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {scenario.name}
                          </Typography>
                          <Chip
                            label={scenario.severity}
                            color={getSeverityColor(scenario.severity) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {scenario.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Component: {scenario.component}
                          </Typography>
                        </Box>
                      }
                    />
                    <Switch
                      checked={scenario.enabled}
                      onChange={() => handleScenarioToggle(scenario.id)}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Results
              </Typography>
              {testResults.length === 0 ? (
                <Alert severity="info">
                  No test results available. Run the visual tests to see results.
                </Alert>
              ) : (
                <List>
                  {testResults.map(result => (
                    <ListItem key={result.id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: result.status === 'passed' ? 'success.main' : 'error.main' }}>
                          {result.status === 'passed' ? <CheckCircleIcon /> : <ErrorIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {testScenarios.find(s => s.id === result.scenarioId)?.name}
                            </Typography>
                            <Chip
                              label={result.status}
                              color={result.status === 'passed' ? 'success' : 'error'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Diff: {result.diffPercentage.toFixed(2)}% | Confidence: {(result.confidence * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Demo Components with Intentional Issues */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Demo Components (with Intentional Issues)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These components have intentional visual issues for testing VRT detection.
          </Typography>
          
          <Grid container spacing={2}>
            {/* User Card with Layout Issues */}
            <Grid item xs={12} md={4}>
              <Card sx={{ 
                border: '2px dashed #ff9800',
                minHeight: 200,
                transform: testScenarios.find(s => s.id === 'layout-shift')?.enabled ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.3s ease'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>JD</Avatar>
                    <Box>
                      <Typography variant="h6">John Doe</Typography>
                      <Typography variant="body2" color="text.secondary">Administrator</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    This card has intentional layout issues for testing VRT detection.
                  </Typography>
                  <Button variant="contained" size="small">
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Button with Color Issues */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: testScenarios.find(s => s.id === 'color-change')?.enabled ? '#ff0000' : 'primary.main',
                    color: 'white'
                  }}
                >
                  Color Change Test
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    borderColor: testScenarios.find(s => s.id === 'color-change')?.enabled ? '#ff0000' : 'primary.main',
                    color: testScenarios.find(s => s.id === 'color-change')?.enabled ? '#ff0000' : 'primary.main'
                  }}
                >
                  Border Color Test
                </Button>
              </Box>
            </Grid>

            {/* Form Input with Accessibility Issues */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Accessibility Test Input"
                  variant="outlined"
                  size="small"
                  aria-label={testScenarios.find(s => s.id === 'accessibility-issue')?.enabled ? undefined : "Accessibility test input"}
                />
                <TextField
                  label="Required Field"
                  variant="outlined"
                  size="small"
                  required
                  aria-required={testScenarios.find(s => s.id === 'accessibility-issue')?.enabled ? undefined : "true"}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Testing Instructions
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="1. Configure Test Scenarios"
                secondary="Enable/disable specific test scenarios to control which visual issues are introduced."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Adjust Test Configuration"
                secondary="Modify diff sensitivity, target components, and test types as needed."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. Run Visual Tests"
                secondary="Execute the VRT system to detect and analyze visual differences."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="4. Review Results"
                secondary="Examine test results, diff percentages, and confidence scores."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="5. Open VRT Dashboard"
                secondary="Use the dashboard to view detailed snapshots, diff analysis, and confidence adjustments."
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          startIcon={<CameraIcon />}
          onClick={() => setVrtDashboardOpen(true)}
          size="large"
        >
          Open VRT Dashboard
        </Button>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setVrtSettingsOpen(true)}
          size="large"
        >
          VRT Settings
        </Button>
      </Box>

      {/* VRT Dashboard Dialog */}
      <VisualRegressionDashboard
        component={{
          id: 'demo-component',
          name: selectedComponent,
          type: 'demo',
          props: {},
          element: document.createElement('div'),
          position: { x: 0, y: 0, width: 800, height: 600 },
          cssClasses: [],
          tailwindClasses: []
        }}
        isOpen={vrtDashboardOpen}
        onClose={() => setVrtDashboardOpen(false)}
      />

      {/* VRT Settings Dialog */}
      <VRTSettingsPanel
        isOpen={vrtSettingsOpen}
        onClose={() => setVrtSettingsOpen(false)}
      />
    </Box>
  );
};

export default VisualTestDemo; 