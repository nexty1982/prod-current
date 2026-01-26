import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Chip,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Badge,
  Tabs,
  Tab,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Sync as SyncIcon,
  Task as TaskIcon,
  ViewKanban as KanbanIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  FileDownload as ExportIcon,
  BugReport as TestIcon,
  History as HistoryIcon,
  Dashboard as StatsIcon
} from '@mui/icons-material';

interface Task {
  id: string;
  filename: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tags: string[];
  createdAt: string;
  modifiedAt: string;
  kanban: {
    synced: boolean;
    cardId: string | null;
    column: string;
    lastSync: string | null;
  };
}

interface KanbanCard {
  id: string;
  title: string;
  description: string;
  column: string;
  priority: string;
  tags: string[];
  created: string;
  updated: string;
  metadata: {
    taskId: string | null;
    sourceFile: string | null;
  };
}

interface SyncStatus {
  isActive: boolean;
  lastSync: string | null;
  statistics: {
    totalSyncs: number;
    successfulSyncs: number;
    errorCount: number;
  };
  tasks: {
    total: number;
    syncStatus: {
      synced: number;
      unsynced: number;
      errors: number;
    };
  };
  kanban: {
    totalCards: number;
    syncedTasks: number;
  };
  health: {
    score: number;
    status: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sync-tabpanel-${index}`}
      aria-labelledby={`sync-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BigBookKanbanSync: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kanbanCards, setKanbanCards] = useState<KanbanCard[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentTab, setCurrentTab] = useState(0);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'medium',
    tags: ''
  });

  useEffect(() => {
    loadSyncData();
    
    // Auto-refresh setup
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadSyncData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadSyncData = async () => {
    try {
      setLoading(true);
      
      const [statusResponse, tasksResponse, cardsResponse, conflictsResponse, logsResponse] = await Promise.all([
        fetch('/api/admin/kanban-sync/status'),
        fetch('/api/admin/kanban-sync/tasks?limit=100'),
        fetch('/api/admin/kanban-sync/kanban/cards'),
        fetch('/api/admin/kanban-sync/conflicts'),
        fetch('/api/admin/kanban-sync/logs?limit=50')
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSyncStatus(statusData.status);
      }

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks);
      }

      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json();
        setKanbanCards(cardsData.cards);
      }

      if (conflictsResponse.ok) {
        const conflictsData = await conflictsResponse.json();
        setConflicts(conflictsData.conflicts);
      }

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setSyncLogs(logsData.logs);
      }

      setError('');
    } catch (error) {
      console.error('Failed to load sync data:', error);
      setError('Failed to load sync data');
    } finally {
      setLoading(false);
    }
  };

  const performFullSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/kanban-sync/full-sync', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadSyncData();
        setError('');
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (error) {
      setError('Failed to perform sync');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    try {
      const taskData = {
        ...newTask,
        tags: newTask.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      const response = await fetch('/api/admin/kanban-sync/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      const data = await response.json();
      
      if (data.success) {
        setCreateTaskOpen(false);
        setNewTask({ title: '', description: '', status: 'To Do', priority: 'medium', tags: '' });
        await loadSyncData();
      } else {
        setError(data.error || 'Failed to create task');
      }
    } catch (error) {
      setError('Failed to create task');
    }
  };

  const syncSingleTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/admin/kanban-sync/tasks/${taskId}/sync`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadSyncData();
      } else {
        setError(data.error || 'Failed to sync task');
      }
    } catch (error) {
      setError('Failed to sync task');
    }
  };

  const moveKanbanCard = async (cardId: string, newColumn: string) => {
    try {
      const response = await fetch(`/api/admin/kanban-sync/kanban/cards/${cardId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column: newColumn })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadSyncData();
      } else {
        setError(data.error || 'Failed to move card');
      }
    } catch (error) {
      setError('Failed to move card');
    }
  };

  const testSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/kanban-sync/test', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadSyncData();
        setError('');
      } else {
        setError(data.error || 'Test sync failed');
      }
    } catch (error) {
      setError('Failed to test sync');
    } finally {
      setLoading(false);
    }
  };

  const exportSyncData = async () => {
    try {
      const response = await fetch('/api/admin/kanban-sync/export');
      const data = await response.json();
      
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bigbook-kanban-sync-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setError(data.error || 'Failed to export data');
      }
    } catch (error) {
      setError('Failed to export data');
    }
  };

  const getSeverityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'success';
      case 'In Progress': return 'info';
      case 'Review': return 'warning';
      case 'To Do': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (!syncStatus) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading BigBook-Kanban Sync...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SyncIcon />
        BigBook ⇄ Kanban Sync
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Status Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatsIcon />
                Sync Status
              </Typography>
              <Chip
                icon={syncStatus.isActive ? <SyncIcon /> : <CheckCircleIcon />}
                label={syncStatus.isActive ? 'SYNCING' : 'READY'}
                color={syncStatus.isActive ? 'warning' : 'success'}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                Last Sync: {syncStatus.lastSync ? formatDate(syncStatus.lastSync) : 'Never'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Syncs: {syncStatus.statistics.totalSyncs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate: {syncStatus.statistics.totalSyncs > 0 ? 
                  Math.round((syncStatus.statistics.successfulSyncs / syncStatus.statistics.totalSyncs) * 100) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TaskIcon />
                Tasks
              </Typography>
              <Typography variant="h4" color="primary">
                {syncStatus.tasks.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Synced: {syncStatus.tasks.syncStatus.synced}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unsynced: {syncStatus.tasks.syncStatus.unsynced}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Errors: {syncStatus.tasks.syncStatus.errors}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <KanbanIcon />
                Kanban
              </Typography>
              <Typography variant="h4" color="primary">
                {syncStatus.kanban.totalCards}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Linked: {syncStatus.kanban.syncedTasks}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Orphaned: {syncStatus.kanban.totalCards - syncStatus.kanban.syncedTasks}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sync Health
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h4" color={getHealthColor(syncStatus.health.score)}>
                  {syncStatus.health.score}
                </Typography>
                <Typography variant="body1">/100</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={syncStatus.health.score} 
                color={getHealthColor(syncStatus.health.score) as any}
                sx={{ mb: 1 }}
              />
              <Chip 
                label={syncStatus.health.status.toUpperCase()} 
                color={getHealthColor(syncStatus.health.score) as any}
                size="small"
              />
              {conflicts.length > 0 && (
                <Chip 
                  icon={<WarningIcon />}
                  label={`${conflicts.length} conflicts`}
                  color="warning"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sync Controls
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SyncIcon />}
              onClick={performFullSync}
              disabled={loading || syncStatus.isActive}
            >
              {loading ? 'Syncing...' : 'Full Sync'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadSyncData}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateTaskOpen(true)}
            >
              Create Task
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<TestIcon />}
              onClick={testSync}
              disabled={loading}
            >
              Test Sync
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={exportSyncData}
            >
              Export
            </Button>

            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="Auto Refresh"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label={`Tasks (${tasks.length})`} icon={<TaskIcon />} />
          <Tab label={`Kanban (${kanbanCards.length})`} icon={<KanbanIcon />} />
          <Tab label={`Conflicts (${conflicts.length})`} icon={<WarningIcon />} />
          <Tab label={`Logs (${syncLogs.length})`} icon={<HistoryIcon />} />
        </Tabs>
      </Box>

      {/* Tasks Tab */}
      <TabPanel value={currentTab} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Task</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Sync Status</TableCell>
                <TableCell>Modified</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{task.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {task.filename}
                    </Typography>
                    {task.tags.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {task.tags.map(tag => (
                          <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={task.status} 
                      color={getStatusColor(task.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={task.priority} 
                      color={getSeverityColor(task.priority) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {task.kanban.synced ? (
                      <Chip 
                        icon={<CheckCircleIcon />}
                        label="Synced" 
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip 
                        icon={<ErrorIcon />}
                        label="Unsynced" 
                        color="error"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(task.modifiedAt)}</TableCell>
                  <TableCell>
                    <Tooltip title="Sync to Kanban">
                      <IconButton 
                        size="small" 
                        onClick={() => syncSingleTask(task.id)}
                        disabled={loading}
                      >
                        <SyncIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Kanban Tab */}
      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {['To Do', 'In Progress', 'Review', 'Done'].map(column => (
            <Grid item xs={12} md={3} key={column}>
              <Typography variant="h6" gutterBottom>
                {column} ({kanbanCards.filter(card => card.column === column).length})
              </Typography>
              {kanbanCards.filter(card => card.column === column).map(card => (
                <Card key={card.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" paragraph>
                      {card.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={card.priority} size="small" color={getSeverityColor(card.priority) as any} />
                      {card.metadata.taskId && (
                        <Chip label="Linked" size="small" color="success" />
                      )}
                    </Box>
                    {card.tags.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        {card.tags.map(tag => (
                          <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Updated: {formatDate(card.updated)}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Conflicts Tab */}
      <TabPanel value={currentTab} index={2}>
        {conflicts.length === 0 ? (
          <Alert severity="success">
            <Typography>No sync conflicts detected!</Typography>
          </Alert>
        ) : (
          conflicts.map((conflict, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" />
                  <Typography>Conflict in {conflict.taskFile}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  Task ID: {conflict.taskId}
                </Typography>
                <Typography variant="body2" paragraph>
                  Card ID: {conflict.cardId}
                </Typography>
                <Typography variant="body2" paragraph>
                  Task Updated: {formatDate(conflict.taskUpdated)}
                </Typography>
                <Typography variant="body2" paragraph>
                  Card Updated: {formatDate(conflict.cardUpdated)}
                </Typography>
                <Typography variant="body2" paragraph>
                  Last Sync: {formatDate(conflict.lastSync)}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Differences:
                </Typography>
                {conflict.differences.map((diff: any, i: number) => (
                  <Typography key={i} variant="body2" sx={{ ml: 2 }}>
                    • {diff.field}: Task="{diff.task}" vs Card="{diff.card}"
                  </Typography>
                ))}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </TabPanel>

      {/* Logs Tab */}
      <TabPanel value={currentTab} index={3}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {syncLogs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell>{log.timestamp ? formatDate(log.timestamp) : 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={log.level} 
                      color={log.level === 'ERROR' ? 'error' : log.level === 'WARN' ? 'warning' : 'info'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Create Task Dialog */}
      <Dialog open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="To Do">To Do</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Review">Review</MenuItem>
                  <MenuItem value="Done">Done</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags (comma-separated)"
                value={newTask.tags}
                onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                placeholder="e.g., frontend, bug, urgent"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTaskOpen(false)}>Cancel</Button>
          <Button 
            onClick={createTask} 
            variant="contained"
            disabled={!newTask.title.trim()}
          >
            Create & Sync
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BigBookKanbanSync; 