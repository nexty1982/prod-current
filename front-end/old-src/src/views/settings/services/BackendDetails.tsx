// Backend Diagnostics Panel - Comprehensive system monitoring for super_admin users

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider
} from '@mui/material';
import {
  Computer as SystemIcon,
  Route as RouteIcon,
  Memory as MemoryIcon,
  Settings as ServiceIcon,
  Terminal as LogIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Speed as PerformanceIcon
} from '@mui/icons-material';

interface SystemInfo {
  node: {
    version: string;
    platform: string;
    arch: string;
    execPath: string;
  };
  uptime: {
    seconds: number;
    formatted: string;
    startTime: string;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    usage: { user: number; system: number };
    count: number;
  };
  pid: number;
  workingDirectory: string;
  environment: Record<string, string>;
}

interface Route {
  method: string;
  path: string;
  type: string;
}

interface ApplicationInfo {
  routes: {
    total: number;
    byMethod: Record<string, number>;
    list: Route[];
  };
  middleware: {
    total: number;
    list: Array<{
      index: number;
      name: string;
      type: string;
      regexp: string | null;
    }>;
  };
  express: {
    version: string;
  };
}

interface ServicesStatus {
  pm2: {
    status: string;
    processes?: Array<{
      name: string;
      pid: number;
      status: string;
      uptime: number;
      memory: number;
      cpu: number;
    }>;
    error?: string;
  };
  database: {
    status: string;
    type?: string;
    error?: string;
  };
  redis: {
    status: string;
    note?: string;
    error?: string;
  };
  jit: {
    status: string;
    note?: string;
    error?: string;
  };
  ocr: {
    status: string;
    note?: string;
    error?: string;
  };
}

interface LogInfo {
  source: string;
  totalLines?: number;
  recentLines?: string[];
  lastModified?: string;
  error?: string;
  searchedPaths?: string[];
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  details: string;
}

interface DiagnosticsData {
  timestamp: string;
  requestedBy: {
    userId: string;
    userName: string;
    role: string;
  };
  system: SystemInfo;
  application: ApplicationInfo;
  services: ServicesStatus;
  performance: any;
  logs: LogInfo;
}

const BackendDetails: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [controlLoading, setControlLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logAutoRefresh, setLogAutoRefresh] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch diagnostics data
  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/server/status/backend');
      const result = await response.json();

      if (response.ok) {
        setDiagnostics(result.data);
      } else {
        setError(result.message || 'Failed to fetch diagnostics');
      }
    } catch (error) {
      setError('Failed to connect to server');
      console.error('Diagnostics fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Perform health check
  const performHealthCheck = async () => {
    setControlLoading('health-check');

    try {
      const response = await fetch('/api/server/control/health-check', {
        method: 'POST'
      });
      const result = await response.json();

      if (response.ok) {
        setHealthChecks(result.healthChecks);
        setSuccess(`Health check completed - Overall status: ${result.overallStatus}`);
      } else {
        setError(result.message || 'Health check failed');
      }
    } catch (error) {
      setError('Failed to perform health check');
      console.error('Health check failed:', error);
    } finally {
      setControlLoading(null);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  // Restart backend
  const restartBackend = async () => {
    if (!confirm('Are you sure you want to restart the backend server? This will disconnect all users.')) {
      return;
    }

    setControlLoading('restart');

    try {
      const response = await fetch('/api/server/control/restart', {
        method: 'POST'
      });
      const result = await response.json();

      if (response.ok) {
        setSuccess(`Restart initiated: ${result.message}`);
        // Refresh diagnostics after restart
        setTimeout(() => {
          fetchDiagnostics();
        }, 3000);
      } else {
        setError(result.message || 'Restart failed');
      }
    } catch (error) {
      setError('Failed to restart backend');
      console.error('Restart failed:', error);
    } finally {
      setControlLoading(null);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  // Auto-refresh logs
  useEffect(() => {
    if (logAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchDiagnostics();
      }, 5000); // Refresh every 5 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [logAutoRefresh]);

  // Scroll to bottom of logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [diagnostics?.logs]);

  // Initial load
  useEffect(() => {
    fetchDiagnostics();
    performHealthCheck();
  }, []);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status color
  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'available':
        return 'success';
      case 'warning':
      case 'not_configured':
        return 'warning';
      case 'error':
      case 'not_available':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'available':
        return <HealthyIcon color="success" />;
      case 'warning':
      case 'not_configured':
        return <WarningIcon color="warning" />;
      case 'error':
      case 'not_available':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  if (loading && !diagnostics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading backend diagnostics...</Typography>
      </Box>
    );
  }

  if (error && !diagnostics) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={fetchDiagnostics} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Backend System Diagnostics
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={controlLoading === 'health-check' ? <CircularProgress size={16} /> : <HealthyIcon />}
            onClick={performHealthCheck}
            disabled={controlLoading === 'health-check'}
          >
            Health Check
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDiagnostics}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            color="warning"
            startIcon={controlLoading === 'restart' ? <CircularProgress size={16} /> : <StartIcon />}
            onClick={restartBackend}
            disabled={controlLoading === 'restart'}
          >
            Restart Backend
          </Button>
        </Box>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Main Content */}
      {diagnostics && (
        <>
          {/* Tabs */}
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="System Info" icon={<SystemIcon />} />
            <Tab label="Routes & Middleware" icon={<RouteIcon />} />
            <Tab label="Services Status" icon={<ServiceIcon />} />
            <Tab label="Performance" icon={<PerformanceIcon />} />
            <Tab label="Logs" icon={<LogIcon />} />
            <Tab label="Health Checks" icon={<HealthyIcon />} />
          </Tabs>

          {/* Tab Content */}
          <Box>
            {/* System Info Tab */}
            {currentTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Node.js Runtime
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="Version" secondary={diagnostics.system.node.version} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Platform" secondary={`${diagnostics.system.node.platform} (${diagnostics.system.node.arch})`} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Process ID" secondary={diagnostics.system.pid} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Working Directory" secondary={diagnostics.system.workingDirectory} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Uptime" secondary={diagnostics.system.uptime.formatted} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Started At" secondary={new Date(diagnostics.system.uptime.startTime).toLocaleString()} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Memory Usage
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="Heap Used" secondary={formatBytes(diagnostics.system.memory.heapUsed)} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Heap Total" secondary={formatBytes(diagnostics.system.memory.heapTotal)} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="External" secondary={formatBytes(diagnostics.system.memory.external)} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="RSS" secondary={formatBytes(diagnostics.system.memory.rss)} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">Environment Variables ({Object.keys(diagnostics.system.environment).length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Variable</TableCell>
                              <TableCell>Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(diagnostics.system.environment).map(([key, value]) => (
                              <TableRow key={key}>
                                <TableCell component="th" scope="row">{key}</TableCell>
                                <TableCell>{value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            )}

            {/* Routes & Middleware Tab */}
            {currentTab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Express Routes ({diagnostics.application.routes.total})
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        {Object.entries(diagnostics.application.routes.byMethod).map(([method, count]) => (
                          <Chip 
                            key={method}
                            label={`${method}: ${count}`}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                            color={method === 'GET' ? 'primary' : method === 'POST' ? 'success' : 'default'}
                          />
                        ))}
                      </Box>

                      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Method</TableCell>
                              <TableCell>Path</TableCell>
                              <TableCell>Type</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {diagnostics.application.routes.list.map((route, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Chip 
                                    label={route.method} 
                                    size="small"
                                    color={route.method === 'GET' ? 'primary' : route.method === 'POST' ? 'success' : 'default'}
                                  />
                                </TableCell>
                                <TableCell>{route.path}</TableCell>
                                <TableCell>{route.type}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Middleware Stack ({diagnostics.application.middleware.total})
                      </Typography>
                      
                      <List dense>
                        {diagnostics.application.middleware.list.map((middleware) => (
                          <ListItem key={middleware.index}>
                            <ListItemText 
                              primary={`${middleware.index + 1}. ${middleware.name}`}
                              secondary={middleware.type}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Services Status Tab */}
            {currentTab === 2 && (
              <Grid container spacing={3}>
                {Object.entries(diagnostics.services).map(([serviceName, serviceData]) => (
                  <Grid item xs={12} md={6} lg={4} key={serviceName}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          {getStatusIcon(serviceData.status)}
                          <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                            {serviceName}
                          </Typography>
                          <Chip 
                            label={serviceData.status} 
                            color={getStatusColor(serviceData.status)}
                            size="small"
                          />
                        </Box>

                        {serviceData.error && (
                          <Alert severity="error" sx={{ mb: 1 }}>
                            {serviceData.error}
                          </Alert>
                        )}

                        {serviceData.note && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {serviceData.note}
                          </Typography>
                        )}

                        {serviceName === 'pm2' && serviceData.processes && (
                          <List dense>
                            {serviceData.processes.map((process) => (
                              <ListItem key={process.name}>
                                <ListItemText 
                                  primary={process.name}
                                  secondary={`PID: ${process.pid} | Status: ${process.status} | CPU: ${process.cpu}% | Memory: ${formatBytes(process.memory)}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Performance Tab */}
            {currentTab === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Performance Metrics
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Performance monitoring data will be displayed here when available.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Logs Tab */}
            {currentTab === 4 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">
                          Server Logs
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Auto-refresh:
                          </Typography>
                          <Button
                            size="small"
                            variant={logAutoRefresh ? 'contained' : 'outlined'}
                            onClick={() => setLogAutoRefresh(!logAutoRefresh)}
                          >
                            {logAutoRefresh ? 'ON' : 'OFF'}
                          </Button>
                        </Box>
                      </Box>

                      {diagnostics.logs.source === 'none' ? (
                        <Alert severity="warning">
                          No log files found. Searched paths: {diagnostics.logs.searchedPaths?.join(', ')}
                        </Alert>
                      ) : diagnostics.logs.source === 'error' ? (
                        <Alert severity="error">
                          Error reading logs: {diagnostics.logs.error}
                        </Alert>
                      ) : (
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Source: {diagnostics.logs.source} | 
                            Total Lines: {diagnostics.logs.totalLines} | 
                            Last Modified: {diagnostics.logs.lastModified ? new Date(diagnostics.logs.lastModified).toLocaleString() : 'Unknown'}
                          </Typography>
                          
                          <Paper 
                            ref={logContainerRef}
                            sx={{ 
                              height: '400px', 
                              overflow: 'auto', 
                              p: 2, 
                              bgcolor: '#1e1e1e', 
                              color: '#ffffff',
                              fontFamily: 'monospace',
                              fontSize: '0.8rem'
                            }}
                          >
                            {diagnostics.logs.recentLines?.map((line, index) => (
                              <Box key={index} sx={{ whiteSpace: 'pre-wrap', borderBottom: '1px solid #333' }}>
                                {line}
                              </Box>
                            ))}
                          </Paper>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Health Checks Tab */}
            {currentTab === 5 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        System Health Checks
                      </Typography>
                      
                      {healthChecks.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No health checks performed yet. Click "Health Check" button to run diagnostics.
                        </Typography>
                      ) : (
                        <List>
                          {healthChecks.map((check, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                {getStatusIcon(check.status)}
                              </ListItemIcon>
                              <ListItemText 
                                primary={check.name}
                                secondary={check.details}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Diagnostics generated at: {new Date(diagnostics.timestamp).toLocaleString()} | 
              Requested by: {diagnostics.requestedBy.userName} ({diagnostics.requestedBy.role})
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default BackendDetails; 