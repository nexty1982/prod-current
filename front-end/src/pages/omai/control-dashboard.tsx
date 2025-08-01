import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface TenantStatus {
  records: { status: string; lastCheck: string; issues: string[] };
  docs: { status: string; lastCheck: string; issues: string[] };
  routes: { status: string; lastCheck: string; issues: string[] };
  ui: { status: string; lastCheck: string; issues: string[] };
  dbSync: { status: string; lastCheck: string; issues: string[] };
  lastAudit: string | null;
  overallHealth: string;
}

interface TenantStatusData {
  lastUpdated: string;
  tenants: Record<string, TenantStatus>;
  systemMetrics: {
    totalTenants: number;
    healthyTenants: number;
    warningTenants: number;
    criticalTenants: number;
    lastSystemCheck: string;
  };
}

interface TaskEntry {
  id: string;
  agent: string;
  tenant?: string;
  action: string;
  target: string;
  status: string;
  timestamp: string;
  result?: {
    success: boolean;
    output: string;
    filesCreated?: string[];
    issuesFound?: number;
    error?: string;
  };
  duration?: number;
}

interface TaskData {
  lastUpdated: string;
  tasks: TaskEntry[];
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageDuration: number;
    successRate: number;
  };
}

interface GapItem {
  component?: string;
  recordType?: string;
  endpoint?: string;
  page?: string;
  tenant: string;
  priority: string;
  estimatedEffort: string;
  assignedAgent: string;
}

interface GapReportData {
  lastUpdated: string;
  gaps: {
    missingDocumentation: GapItem[];
    missingSchemas: GapItem[];
    undefinedRoutes: GapItem[];
    unlinkedComponents: GapItem[];
    pagesWithoutAudit: GapItem[];
  };
  summary: {
    totalGaps: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    estimatedTotalEffort: string;
  };
}

interface AgentMetric {
  tasksRun: number;
  successRate: number;
  averageDuration: number;
  lastRun: string;
  commonFailures: string[];
  topIssues: string[];
}

interface AgentMetrics {
  lastUpdated: string;
  agentMetrics: Record<string, AgentMetric>;
  systemMetrics: {
    totalTasksRun: number;
    overallSuccessRate: number;
    averageTaskDuration: number;
    activeAgents: number;
    lastSystemCheck: string;
  };
  topUnresolvedIssues: Array<{
    issue: string;
    priority: string;
    assignedAgent: string;
    daysOpen: number;
  }>;
}

const ControlDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantStatus, setTenantStatus] = useState<TenantStatusData | null>(null);
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [gapData, setGapData] = useState<GapReportData | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, these would be API calls
      // For now, we'll simulate the data loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulated data - replace with actual API calls
      setTenantStatus({
        lastUpdated: new Date().toISOString(),
        tenants: {
          'St. George': {
            records: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            docs: { status: 'warning', lastCheck: new Date().toISOString(), issues: ['Missing component documentation'] },
            routes: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            ui: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            dbSync: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            lastAudit: new Date().toISOString(),
            overallHealth: 'good'
          },
          'SSPPOC': {
            records: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            docs: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            routes: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            ui: { status: 'warning', lastCheck: new Date().toISOString(), issues: ['Outdated component versions'] },
            dbSync: { status: 'warning', lastCheck: new Date().toISOString(), issues: ['Pending schema updates'] },
            lastAudit: new Date().toISOString(),
            overallHealth: 'needs_sync'
          },
          'Holy Resurrection': {
            records: { status: 'critical', lastCheck: new Date().toISOString(), issues: ['Database connection failed'] },
            docs: { status: 'critical', lastCheck: new Date().toISOString(), issues: ['No documentation found'] },
            routes: { status: 'critical', lastCheck: new Date().toISOString(), issues: ['API endpoints not responding'] },
            ui: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            dbSync: { status: 'healthy', lastCheck: new Date().toISOString(), issues: [] },
            lastAudit: null,
            overallHealth: 'critical'
          }
        },
        systemMetrics: {
          totalTenants: 3,
          healthyTenants: 1,
          warningTenants: 1,
          criticalTenants: 1,
          lastSystemCheck: new Date().toISOString()
        }
      });

      setTaskData({
        lastUpdated: new Date().toISOString(),
        tasks: [
          {
            id: 'task_001',
            agent: 'omai-doc-bot',
            tenant: 'St. George',
            action: 'generateMissingDoc',
            target: 'marriage-records-icon',
            status: 'completed',
            timestamp: new Date().toISOString(),
            result: {
              success: true,
              output: 'Generated documentation for marriage-records-icon component',
              filesCreated: ['docs/OM-BigBook/pages/components/marriage-records-icon.md']
            },
            duration: 1500
          }
        ],
        metrics: {
          totalTasks: 1,
          completedTasks: 1,
          failedTasks: 0,
          averageDuration: 1500,
          successRate: 100
        }
      });

      setGapData({
        lastUpdated: new Date().toISOString(),
        gaps: {
          missingDocumentation: [
            {
              component: 'marriage-records-icon',
              tenant: 'St. George',
              priority: 'medium',
              estimatedEffort: '30min',
              assignedAgent: 'omai-doc-bot'
            }
          ],
          missingSchemas: [],
          undefinedRoutes: [],
          unlinkedComponents: [],
          pagesWithoutAudit: []
        },
        summary: {
          totalGaps: 1,
          highPriority: 0,
          mediumPriority: 1,
          lowPriority: 0,
          estimatedTotalEffort: '30min'
        }
      });

      setAgentMetrics({
        lastUpdated: new Date().toISOString(),
        agentMetrics: {
          'omai-doc-bot': {
            tasksRun: 15,
            successRate: 93.33,
            averageDuration: 1200,
            lastRun: new Date().toISOString(),
            commonFailures: ['File permission denied'],
            topIssues: ['Missing component documentation']
          }
        },
        systemMetrics: {
          totalTasksRun: 15,
          overallSuccessRate: 93.33,
          averageTaskDuration: 1200,
          activeAgents: 1,
          lastSystemCheck: new Date().toISOString()
        },
        topUnresolvedIssues: [
          {
            issue: 'Database connection failed for Holy Resurrection',
            priority: 'critical',
            assignedAgent: 'omai-schema-sentinel',
            daysOpen: 2
          }
        ]
      });

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return <CheckCircleIcon color="success" />;
      case 'warning':
      case 'needs_sync':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return 'success';
      case 'warning':
      case 'needs_sync':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleRunAudit = async (tenant?: string) => {
    try {
      // In a real implementation, this would call the orchestrator API
      console.log(`Running audit for ${tenant || 'all tenants'}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadDashboardData();
    } catch (err) {
      setError('Failed to run audit');
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
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={handleRefresh}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          OMAI Control Dashboard
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={() => handleRunAudit()}
          >
            Run System Audit
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Tenant Status" />
        <Tab label="Agent Metrics" />
        <Tab label="Knowledge Gaps" />
        <Tab label="Recent Tasks" />
      </Tabs>

      {activeTab === 0 && tenantStatus && (
        <Box>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tenants
                  </Typography>
                  <Typography variant="h4">
                    {tenantStatus.systemMetrics.totalTenants}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Healthy
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {tenantStatus.systemMetrics.healthyTenants}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Needs Attention
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {tenantStatus.systemMetrics.warningTenants}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Critical
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {tenantStatus.systemMetrics.criticalTenants}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Church Name</TableCell>
                  <TableCell>Records</TableCell>
                  <TableCell>Docs</TableCell>
                  <TableCell>Routes</TableCell>
                  <TableCell>UI</TableCell>
                  <TableCell>DB Sync</TableCell>
                  <TableCell>Last Audit</TableCell>
                  <TableCell>Health</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(tenantStatus.tenants).map(([tenant, status]) => (
                  <TableRow key={tenant}>
                    <TableCell>{tenant}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(status.records.status)}
                        label={status.records.status}
                        color={getStatusColor(status.records.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(status.docs.status)}
                        label={status.docs.status}
                        color={getStatusColor(status.docs.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(status.routes.status)}
                        label={status.routes.status}
                        color={getStatusColor(status.routes.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(status.ui.status)}
                        label={status.ui.status}
                        color={getStatusColor(status.ui.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(status.dbSync.status)}
                        label={status.dbSync.status}
                        color={getStatusColor(status.dbSync.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {status.lastAudit ? new Date(status.lastAudit).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(status.overallHealth)}
                        label={status.overallHealth}
                        color={getStatusColor(status.overallHealth) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRunAudit(tenant)}
                      >
                        Audit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {activeTab === 1 && agentMetrics && (
        <Box>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tasks Run
                  </Typography>
                  <Typography variant="h4">
                    {agentMetrics.systemMetrics.totalTasksRun}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {agentMetrics.systemMetrics.overallSuccessRate.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Duration
                  </Typography>
                  <Typography variant="h4">
                    {agentMetrics.systemMetrics.averageTaskDuration}ms
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Agents
                  </Typography>
                  <Typography variant="h4">
                    {agentMetrics.systemMetrics.activeAgents}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Agent Performance
                  </Typography>
                  {Object.entries(agentMetrics.agentMetrics).map(([agentId, metric]) => (
                    <Accordion key={agentId}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{agentId}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2">Tasks Run: {metric.tasksRun}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">Success Rate: {metric.successRate.toFixed(1)}%</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">Avg Duration: {metric.averageDuration}ms</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">Last Run: {new Date(metric.lastRun).toLocaleString()}</Typography>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Unresolved Issues
                  </Typography>
                  {agentMetrics.topUnresolvedIssues.map((issue, index) => (
                    <Box key={index} mb={2}>
                      <Typography variant="body2" color="textSecondary">
                        {issue.issue}
                      </Typography>
                      <Box display="flex" gap={1} mt={1}>
                        <Chip
                          label={issue.priority}
                          color={issue.priority === 'critical' ? 'error' : 'warning'}
                          size="small"
                        />
                        <Chip label={issue.assignedAgent} size="small" />
                        <Chip label={`${issue.daysOpen}d`} size="small" />
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 2 && gapData && (
        <Box>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Gaps
                  </Typography>
                  <Typography variant="h4">
                    {gapData.summary.totalGaps}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    High Priority
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {gapData.summary.highPriority}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Medium Priority
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {gapData.summary.mediumPriority}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Estimated Effort
                  </Typography>
                  <Typography variant="h4">
                    {gapData.summary.estimatedTotalEffort}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {Object.entries(gapData.gaps).map(([gapType, items]) => (
              <Grid item xs={12} md={6} key={gapType}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {gapType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Typography>
                    {items.map((item, index) => (
                      <Box key={index} mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
                        <Typography variant="body2" fontWeight="bold">
                          {item.component || item.recordType || item.endpoint || item.page}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Tenant: {item.tenant}
                        </Typography>
                        <Box display="flex" gap={1} mt={1}>
                          <Chip
                            label={item.priority}
                            color={item.priority === 'high' ? 'error' : item.priority === 'medium' ? 'warning' : 'default'}
                            size="small"
                          />
                          <Chip label={item.estimatedEffort} size="small" />
                          <Chip label={item.assignedAgent} size="small" />
                        </Box>
                      </Box>
                    ))}
                    {items.length === 0 && (
                      <Typography variant="body2" color="textSecondary">
                        No issues found
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {activeTab === 3 && taskData && (
        <Box>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tasks
                  </Typography>
                  <Typography variant="h4">
                    {taskData.metrics.totalTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Completed
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {taskData.metrics.completedTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Failed
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {taskData.metrics.failedTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h4">
                    {taskData.metrics.successRate.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task ID</TableCell>
                  <TableCell>Agent</TableCell>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {taskData.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.id}</TableCell>
                    <TableCell>{task.agent}</TableCell>
                    <TableCell>{task.tenant || 'N/A'}</TableCell>
                    <TableCell>{task.action}</TableCell>
                    <TableCell>{task.target}</TableCell>
                    <TableCell>
                      <Chip
                        label={task.status}
                        color={task.status === 'completed' ? 'success' : task.status === 'failed' ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{task.duration ? `${task.duration}ms` : 'N/A'}</TableCell>
                    <TableCell>{new Date(task.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default ControlDashboard; 