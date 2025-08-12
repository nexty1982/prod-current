import React, { useState, useEffect } from 'react';
import { formatTimestamp } from '../../utils/formatTimestamp';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  PlayCircleFilled as ExecuteIcon,
  Done as AcknowledgeIcon
} from '@mui/icons-material';

interface WatchdogConfig {
  enabled: boolean;
  alertLevel: 'info' | 'warning' | 'error' | 'critical';
  scanFrequency: string;
  quietHours: {
    start: string;
    end: string;
  };
  maxAlerts: number;
  allowedFiles: string[];
  systemChecks: {
    diskSpace: { enabled: boolean; threshold: number };
    memoryUsage: { enabled: boolean; threshold: number };
    cpuUsage: { enabled: boolean; threshold: number };
    loadAverage: { enabled: boolean; threshold: number };
    failedLogins: { enabled: boolean; threshold: number };
    serviceHealth: { enabled: boolean; services: string[] };
  };
}

interface Alert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  title: string;
  message: string;
  source: string;
  acknowledged: boolean;
  actions: Array<{
    type: string;
    title: string;
    description: string;
    command: string;
  }>;
}

interface SystemStatus {
  isActive: boolean;
  isMonitoring: boolean;
  config: WatchdogConfig;
  activeAlerts: number;
  totalAlerts: number;
  watchedFiles: string[];
  uptime: number;
}

const SystemWatchdog: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [config, setConfig] = useState<WatchdogConfig | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);

  useEffect(() => {
    loadWatchdogData();
    const interval = setInterval(loadWatchdogData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadWatchdogData = async () => {
    try {
      const [statusResponse, alertsResponse, summaryResponse] = await Promise.all([
        fetch('/api/admin/watchdog/status'),
        fetch('/api/admin/watchdog/alerts?limit=50'),
        fetch('/api/admin/watchdog/summary')
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData.status);
        setConfig(statusData.status.config);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts);
      }

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setDailySummary(summaryData.summary);
      }
    } catch (error) {
      console.error('Failed to load watchdog data:', error);
      setError('Failed to load watchdog data');
    }
  };

  const toggleWatchdog = async () => {
    if (!status) return;

    setLoading(true);
    try {
      const endpoint = status.isMonitoring ? '/api/admin/watchdog/stop' : '/api/admin/watchdog/start';
      const response = await fetch(endpoint, { method: 'POST' });
      
      if (response.ok) {
        await loadWatchdogData();
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to toggle watchdog');
      }
    } catch (error) {
      setError('Failed to toggle watchdog');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<WatchdogConfig>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/watchdog/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        await loadWatchdogData();
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      setError('Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/watchdog/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadWatchdogData();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const executeAction = async (alertId: string, actionType: string) => {
    try {
      const response = await fetch(`/api/admin/watchdog/alerts/${alertId}/execute/${actionType}`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadWatchdogData();
        setActionDialogOpen(false);
        setSelectedAlert(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to execute action');
      }
    } catch (error) {
      setError('Failed to execute action');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!status || !config) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading OMAI Watchdog...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon />
        OMAI System Watchdog
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Status Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ComputerIcon />
                System Status
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Chip
                  icon={status.isMonitoring ? <CheckCircleIcon /> : <StopIcon />}
                  label={status.isMonitoring ? 'MONITORING' : 'STOPPED'}
                  color={status.isMonitoring ? 'success' : 'default'}
                  variant="outlined"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uptime: {formatUptime(status.uptime)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Watched Files: {status.watchedFiles.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Alert Level: {config.alertLevel.toUpperCase()}
              </Typography>

              <Button
                variant="contained"
                color={status.isMonitoring ? 'secondary' : 'primary'}
                startIcon={status.isMonitoring ? <StopIcon /> : <StartIcon />}
                onClick={toggleWatchdog}
                disabled={loading}
                fullWidth
                sx={{ mt: 2 }}
              >
                {loading ? 'Please wait...' : (status.isMonitoring ? 'Stop Monitoring' : 'Start Monitoring')}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon />
                Active Alerts
                <Badge badgeContent={status.activeAlerts} color="error" sx={{ ml: 1 }} />
              </Typography>

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Critical: {alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Errors: {alerts.filter(a => a.severity === 'error' && !a.acknowledged).length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Warnings: {alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total: {status.totalAlerts}
                  </Typography>
                </Grid>
              </Grid>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadWatchdogData}
                fullWidth
                sx={{ mt: 2 }}
              >
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon />
                Today's Summary
              </Typography>

              {dailySummary ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Date: {dailySummary.date}
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Critical: {dailySummary.events?.critical || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Errors: {dailySummary.events?.error || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Warnings: {dailySummary.events?.warning || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Info: {dailySummary.events?.info || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No summary available for today
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration */}
        <Grid item xs={12}>
          <Accordion expanded={configExpanded} onChange={() => setConfigExpanded(!configExpanded)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon />
                Watchdog Configuration
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.enabled}
                        onChange={(e) => updateConfig({ enabled: e.target.checked })}
                      />
                    }
                    label="Enable Watchdog"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Alert Level</InputLabel>
                    <Select
                      value={config.alertLevel}
                      onChange={(e) => updateConfig({ alertLevel: e.target.value as any })}
                      label="Alert Level"
                    >
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Scan Frequency</InputLabel>
                    <Select
                      value={config.scanFrequency}
                      onChange={(e) => updateConfig({ scanFrequency: e.target.value })}
                      label="Scan Frequency"
                    >
                      <MenuItem value="5m">5 minutes</MenuItem>
                      <MenuItem value="15m">15 minutes</MenuItem>
                      <MenuItem value="1h">1 hour</MenuItem>
                      <MenuItem value="4h">4 hours</MenuItem>
                      <MenuItem value="1d">Daily</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Quiet Hours Start"
                    type="time"
                    value={config.quietHours.start}
                    onChange={(e) => updateConfig({
                      quietHours: { ...config.quietHours, start: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Quiet Hours End"
                    type="time"
                    value={config.quietHours.end}
                    onChange={(e) => updateConfig({
                      quietHours: { ...config.quietHours, end: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* System Checks */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    System Health Checks
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.systemChecks.diskSpace.enabled}
                        onChange={(e) => updateConfig({
                          systemChecks: {
                            ...config.systemChecks,
                            diskSpace: { ...config.systemChecks.diskSpace, enabled: e.target.checked }
                          }
                        })}
                      />
                    }
                    label={`Disk Space (>${config.systemChecks.diskSpace.threshold}%)`}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.systemChecks.memoryUsage.enabled}
                        onChange={(e) => updateConfig({
                          systemChecks: {
                            ...config.systemChecks,
                            memoryUsage: { ...config.systemChecks.memoryUsage, enabled: e.target.checked }
                          }
                        })}
                      />
                    }
                    label={`Memory Usage (>${config.systemChecks.memoryUsage.threshold}%)`}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.systemChecks.cpuUsage.enabled}
                        onChange={(e) => updateConfig({
                          systemChecks: {
                            ...config.systemChecks,
                            cpuUsage: { ...config.systemChecks.cpuUsage, enabled: e.target.checked }
                          }
                        })}
                      />
                    }
                    label={`CPU Usage (>${config.systemChecks.cpuUsage.threshold}%)`}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.systemChecks.serviceHealth.enabled}
                        onChange={(e) => updateConfig({
                          systemChecks: {
                            ...config.systemChecks,
                            serviceHealth: { ...config.systemChecks.serviceHealth, enabled: e.target.checked }
                          }
                        })}
                      />
                    }
                    label="Service Health Monitoring"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Active Alerts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Alerts
              </Typography>

              {alerts.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Severity</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {alerts.slice(0, 20).map((alert) => (
                        <TableRow 
                          key={alert.id}
                          sx={{ 
                            backgroundColor: alert.acknowledged ? 'transparent' : 'rgba(255, 152, 0, 0.1)',
                            opacity: alert.acknowledged ? 0.7 : 1
                          }}
                        >
                          <TableCell>
                            <Chip
                              icon={getSeverityIcon(alert.severity)}
                              label={alert.severity.toUpperCase()}
                              color={getSeverityColor(alert.severity) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {alert.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alert.message.substring(0, 100)}...
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={alert.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatTimestamp(alert.timestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {!alert.acknowledged && (
                                <Tooltip title="Acknowledge">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => acknowledgeAlert(alert.id)}
                                  >
                                    <AcknowledgeIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {alert.actions.length > 0 && (
                                <Tooltip title="Execute Action">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => {
                                      setSelectedAlert(alert);
                                      setActionDialogOpen(true);
                                    }}
                                  >
                                    <ExecuteIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No alerts to display
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Execute Suggested Action</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedAlert.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedAlert.message}
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Available Actions:
              </Typography>
              
              {selectedAlert.actions.map((action, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {action.description}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 2 }}>
                      Command: {action.command}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => executeAction(selectedAlert.id, action.type)}
                      startIcon={<ExecuteIcon />}
                    >
                      Execute
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemWatchdog; 