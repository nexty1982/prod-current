import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Chip, LinearProgress, Alert, CircularProgress, Tabs, Tab, Accordion,
  AccordionSummary, AccordionDetails, Paper, Divider, Avatar, Tooltip, Switch,
  FormControlLabel, Slider, TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  Psychology as PsychologyIcon, PlayArrow as PlayIcon, Pause as PauseIcon,
  Stop as StopIcon, Assessment as AssessmentIcon, TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon, ExpandMore as ExpandMoreIcon, CheckCircle as CheckCircleIcon,
  Warning as WarningIcon, Error as ErrorIcon, Info as InfoIcon, Timeline as TimelineIcon,
  AutoAwesome as AutoAwesomeIcon, SelfImprovement as SelfImprovementIcon,
  PsychologyAlt as PsychologyAltIcon, Analytics as AnalyticsIcon
} from '@mui/icons-material';

// Interface definitions
interface AutonomySession {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  decisions: any[];
  goals: any[];
  improvements: any[];
  metaAnalysis: any[];
  performance: AutonomyPerformance;
}

interface AutonomyPerformance {
  decisionsExecuted: number;
  decisionsSuccessful: number;
  goalsCompleted: number;
  goalsActive: number;
  improvementsInitiated: number;
  improvementsCompleted: number;
  overallEfficiency: number;
  learningRate: number;
  adaptationSpeed: number;
}

interface AutonomyStatus {
  isActive: boolean;
  currentSession?: string;
  lastActivity: string;
  performance: AutonomyPerformance;
  health: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

interface AutonomyParameters {
  decisionThreshold: number;
  goalPriority: 'conservative' | 'balanced' | 'aggressive';
  improvementFrequency: number;
  metaAnalysisInterval: number;
  safetyConstraints: string[];
  learningRate: number;
}

const AutonomyDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AutonomySession[]>([]);
  const [currentStatus, setCurrentStatus] = useState<AutonomyStatus | null>(null);
  const [parameters, setParameters] = useState<AutonomyParameters>({
    decisionThreshold: 0.7,
    goalPriority: 'balanced',
    improvementFrequency: 5,
    metaAnalysisInterval: 10,
    safetyConstraints: ['No system modifications', 'Preserve user data'],
    learningRate: 0.1
  });

  // Dialog states
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AutonomySession | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulated data
      const mockSessions: AutonomySession[] = [
        {
          id: 'session-1',
          status: 'active',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          decisions: [
            { id: 'dec-1', type: 'learning', priority: 'high', status: 'completed', success: true },
            { id: 'dec-2', type: 'optimization', priority: 'medium', status: 'executing', success: null }
          ],
          goals: [
            { id: 'goal-1', title: 'Improve pattern recognition', category: 'learning', progress: 75, status: 'active' },
            { id: 'goal-2', title: 'Optimize memory usage', category: 'optimization', progress: 45, status: 'active' }
          ],
          improvements: [
            { id: 'imp-1', type: 'enhancement', status: 'executing', trigger: 'Performance analysis' }
          ],
          metaAnalysis: [
            { id: 'meta-1', timestamp: new Date().toISOString(), confidence: 0.78 }
          ],
          performance: {
            decisionsExecuted: 8,
            decisionsSuccessful: 6,
            goalsCompleted: 2,
            goalsActive: 3,
            improvementsInitiated: 4,
            improvementsCompleted: 2,
            overallEfficiency: 0.75,
            learningRate: 0.12,
            adaptationSpeed: 0.65
          }
        }
      ];

      const mockStatus: AutonomyStatus = {
        isActive: true,
        currentSession: 'session-1',
        lastActivity: new Date().toISOString(),
        performance: mockSessions[0].performance,
        health: 'good',
        recommendations: [
          'Consider increasing learning rate for faster adaptation',
          'Monitor decision success rate for optimization opportunities'
        ]
      };

      setSessions(mockSessions);
      setCurrentStatus(mockStatus);
      setSelectedSession(mockSessions[0]);
    } catch (error) {
      setError('Failed to load autonomy dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadDashboardData();
    } catch (error) {
      setError('Failed to start autonomy session');
    }
  };

  const handlePauseSession = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadDashboardData();
    } catch (error) {
      setError('Failed to pause autonomy session');
    }
  };

  const handleStopSession = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadDashboardData();
    } catch (error) {
      setError('Failed to stop autonomy session');
    }
  };

  const handleUpdateParameters = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSettingsDialog(false);
    } catch (error) {
      setError('Failed to update autonomy parameters');
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayIcon color="success" />;
      case 'paused': return <PauseIcon color="warning" />;
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      default: return <InfoIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          OMAI Autonomy Dashboard
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialog(true)}
            sx={{ mr: 1 }}
          >
            Settings
          </Button>
          {currentStatus?.isActive ? (
            <>
              <Button
                variant="outlined"
                startIcon={<PauseIcon />}
                onClick={handlePauseSession}
                sx={{ mr: 1 }}
              >
                Pause
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopSession}
              >
                Stop
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayIcon />}
              onClick={handleStartSession}
            >
              Start Autonomy
            </Button>
          )}
        </Box>
      </Box>

      {/* Status Overview */}
      {currentStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">System Status</Typography>
              <Chip
                label={currentStatus.health}
                color={getHealthColor(currentStatus.health) as any}
                icon={getStatusIcon(currentStatus.isActive ? 'active' : 'paused')}
              />
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Efficiency</Typography>
                <Typography variant="h6">{(currentStatus.performance.overallEfficiency * 100).toFixed(1)}%</Typography>
                <LinearProgress
                  variant="determinate"
                  value={currentStatus.performance.overallEfficiency * 100}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Learning Rate</Typography>
                <Typography variant="h6">{(currentStatus.performance.learningRate * 100).toFixed(1)}%</Typography>
                <LinearProgress
                  variant="determinate"
                  value={currentStatus.performance.learningRate * 100}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Adaptation Speed</Typography>
                <Typography variant="h6">{(currentStatus.performance.adaptationSpeed * 100).toFixed(1)}%</Typography>
                <LinearProgress
                  variant="determinate"
                  value={currentStatus.performance.adaptationSpeed * 100}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">Active Goals</Typography>
                <Typography variant="h6">{currentStatus.performance.goalsActive}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Card>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" icon={<AnalyticsIcon />} />
          <Tab label="Decisions" icon={<PsychologyAltIcon />} />
          <Tab label="Goals" icon={<SelfImprovementIcon />} />
          <Tab label="Improvements" icon={<AutoAwesomeIcon />} />
          <Tab label="Meta-Analysis" icon={<PsychologyIcon />} />
          <Tab label="Sessions" icon={<TimelineIcon />} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Overview Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Recent Decisions</Typography>
                    <List>
                      {selectedSession?.decisions.slice(0, 5).map((decision) => (
                        <ListItem key={decision.id}>
                          <ListItemText
                            primary={decision.type}
                            secondary={`Priority: ${decision.priority}`}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={decision.status}
                              color={getStatusColor(decision.status) as any}
                              size="small"
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Active Goals</Typography>
                    <List>
                      {selectedSession?.goals.filter(g => g.status === 'active').map((goal) => (
                        <ListItem key={goal.id}>
                          <ListItemText
                            primary={goal.title}
                            secondary={`Category: ${goal.category}`}
                          />
                          <ListItemSecondaryAction>
                            <Typography variant="body2" color="text.secondary">
                              {goal.progress}%
                            </Typography>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Recommendations</Typography>
                    <List>
                      {currentStatus?.recommendations.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Decisions Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Autonomous Decisions</Typography>
              <List>
                {selectedSession?.decisions.map((decision) => (
                  <ListItem key={decision.id} divider>
                    <ListItemText
                      primary={decision.type}
                      secondary={`Priority: ${decision.priority} | Status: ${decision.status}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={decision.status}
                        color={getStatusColor(decision.status) as any}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Goals Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Autonomous Goals</Typography>
              <List>
                {selectedSession?.goals.map((goal) => (
                  <ListItem key={goal.id} divider>
                    <ListItemText
                      primary={goal.title}
                      secondary={`Category: ${goal.category} | Status: ${goal.status}`}
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" sx={{ mr: 2 }}>
                          {goal.progress}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={goal.progress}
                          sx={{ width: 100 }}
                        />
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Improvements Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Self-Improvement Cycles</Typography>
              <List>
                {selectedSession?.improvements.map((improvement) => (
                  <ListItem key={improvement.id} divider>
                    <ListItemText
                      primary={`${improvement.type} Improvement`}
                      secondary={`Trigger: ${improvement.trigger} | Status: ${improvement.status}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={improvement.status}
                        color={getStatusColor(improvement.status) as any}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Meta-Analysis Tab */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>Meta-Cognitive Analysis</Typography>
              <List>
                {selectedSession?.metaAnalysis.map((analysis) => (
                  <ListItem key={analysis.id} divider>
                    <ListItemText
                      primary={`Analysis at ${new Date(analysis.timestamp).toLocaleString()}`}
                      secondary={`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`}
                    />
                    <ListItemSecondaryAction>
                      <Button size="small" variant="outlined">
                        View Details
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Sessions Tab */}
          {activeTab === 5 && (
            <Box>
              <Typography variant="h6" gutterBottom>Autonomy Sessions</Typography>
              <List>
                {sessions.map((session) => (
                  <ListItem key={session.id} divider>
                    <ListItemText
                      primary={`Session ${session.id}`}
                      secondary={`Started: ${new Date(session.startTime).toLocaleString()} | Status: ${session.status}`}
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center">
                        <Chip
                          label={session.status}
                          color={getStatusColor(session.status) as any}
                          sx={{ mr: 1 }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedSession(session);
                            setSessionDialog(true);
                          }}
                        >
                          View Details
                        </Button>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Autonomy Parameters</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Decision Threshold</InputLabel>
                <Select
                  value={parameters.decisionThreshold}
                  onChange={(e) => setParameters({ ...parameters, decisionThreshold: e.target.value as number })}
                >
                  <MenuItem value={0.5}>Low (0.5)</MenuItem>
                  <MenuItem value={0.7}>Medium (0.7)</MenuItem>
                  <MenuItem value={0.9}>High (0.9)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Goal Priority</InputLabel>
                <Select
                  value={parameters.goalPriority}
                  onChange={(e) => setParameters({ ...parameters, goalPriority: e.target.value as any })}
                >
                  <MenuItem value="conservative">Conservative</MenuItem>
                  <MenuItem value="balanced">Balanced</MenuItem>
                  <MenuItem value="aggressive">Aggressive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Improvement Frequency (minutes)</Typography>
              <Slider
                value={parameters.improvementFrequency}
                onChange={(_, value) => setParameters({ ...parameters, improvementFrequency: value as number })}
                min={1}
                max={30}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Learning Rate</Typography>
              <Slider
                value={parameters.learningRate}
                onChange={(_, value) => setParameters({ ...parameters, learningRate: value as number })}
                min={0.01}
                max={0.5}
                step={0.01}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Safety Constraints"
                value={parameters.safetyConstraints.join('\n')}
                onChange={(e) => setParameters({ ...parameters, safetyConstraints: e.target.value.split('\n') })}
                helperText="One constraint per line"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateParameters} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog open={sessionDialog} onClose={() => setSessionDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Session Details</DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box>
              <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Decisions Executed</Typography>
                  <Typography variant="h6">{selectedSession.performance.decisionsExecuted}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Success Rate</Typography>
                  <Typography variant="h6">
                    {selectedSession.performance.decisionsExecuted > 0
                      ? ((selectedSession.performance.decisionsSuccessful / selectedSession.performance.decisionsExecuted) * 100).toFixed(1)
                      : 0}%
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Goals Completed</Typography>
                  <Typography variant="h6">{selectedSession.performance.goalsCompleted}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Improvements</Typography>
                  <Typography variant="h6">{selectedSession.performance.improvementsInitiated}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialog(false)}>Close</Button>
          <Button onClick={() => setReportDialog(true)} variant="contained">Generate Report</Button>
        </DialogActions>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Autonomy Report</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Detailed autonomy report would be generated here with comprehensive analysis of decisions, goals, improvements, and meta-cognitive insights.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>Close</Button>
          <Button variant="contained">Export Report</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutonomyDashboard; 