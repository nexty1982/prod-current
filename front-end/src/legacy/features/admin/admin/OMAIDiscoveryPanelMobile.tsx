import React, { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Button,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SwipeableDrawer,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Grid,
  Collapse,
  IconButton,
  MobileStepper,
  useTheme,
  useMediaQuery,
  Divider,
  AppBar,
  Toolbar,
  Slide,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Assessment as StatusIcon,
  Memory as MemoryIcon,
  SmartToy as AutofixIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Psychology as BrainIcon,
  Timeline as TimelineIcon,
  Folder as FolderIcon,
  Code as CodeIcon,
  Description as FileIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface LearningStatus {
  success: boolean;
  learning?: {
    isActive: boolean;
    lastRun?: string;
    totalFilesProcessed: number;
    totalFilesSkipped: number;
    totalErrors: number;
    memoryCacheSize: number;
    learningTime?: number;
  };
  sources?: Record<string, {
    path: string;
    type: string;
    priority: string;
    extensions: string[];
  }>;
  agents?: {
    registered: string[];
  };
}

interface MemoryPreview {
  totalEntries: number;
  recentEntries: Array<{
    id: string;
    type: string;
    context: string;
    content: string;
    timestamp: string;
  }>;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  commands: string[];
}

const OMAIDiscoveryPanelMobile: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isFold = useMediaQuery('(max-width: 768px)');

  // Core state
  const [learningStatus, setLearningStatus] = useState<LearningStatus | null>(null);
  const [memoryPreview, setMemoryPreview] = useState<MemoryPreview | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Loading states
  const [learningLoading, setLearningLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [autofixLoading, setAutofixLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [autofixDialogOpen, setAutofixDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);

  // UI states
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Progress tracking
  const [progress, setProgress] = useState({
    learning: 0,
    memory: 0,
    autofix: 0
  });

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<string>('');

  // Autofix state
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [autofixCommand, setAutofixCommand] = useState<string>('');
  const [autofixResult, setAutofixResult] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadLearningStatus(),
      loadMemoryPreview(),
      loadAgents()
    ]);
  };

  const loadLearningStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/omai/learning-status');
      const data = await response.json();
      setLearningStatus(data);
    } catch (error) {
      console.error('Failed to load learning status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const loadMemoryPreview = async () => {
    setMemoryLoading(true);
    try {
      const response = await fetch('/api/omai/memory-preview');
      if (response.ok) {
        const data = await response.json();
        setMemoryPreview(data);
      }
    } catch (error) {
      console.error('Failed to load memory preview:', error);
    } finally {
      setMemoryLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/omai/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const refreshLearning = async () => {
    setLearningLoading(true);
    setProgress(prev => ({ ...prev, learning: 0 }));

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => ({
        ...prev,
        learning: Math.min(prev.learning + 10, 90)
      }));
    }, 200);

    try {
      const response = await fetch('/api/omai/learn-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true })
      });
      
      const data = await response.json();
      clearInterval(progressInterval);
      setProgress(prev => ({ ...prev, learning: 100 }));
      
      if (data.success) {
        setLastRefreshTime(new Date());
        await loadLearningStatus();
        setStatusDialogOpen(true);
      } else {
        throw new Error(data.error || 'Learning refresh failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Learning refresh failed:', error);
      alert('Learning refresh failed. Please check the logs.');
    } finally {
      setLearningLoading(false);
      setTimeout(() => {
        setProgress(prev => ({ ...prev, learning: 0 }));
      }, 2000);
    }
  };

  const runAutofix = async () => {
    if (!selectedAgent || !autofixCommand) {
      alert('Please select an agent and command');
      return;
    }

    setAutofixLoading(true);
    setProgress(prev => ({ ...prev, autofix: 0 }));

    const progressInterval = setInterval(() => {
      setProgress(prev => ({
        ...prev,
        autofix: Math.min(prev.autofix + 15, 90)
      }));
    }, 300);

    try {
      const response = await fetch('/api/omai/agents/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent,
          command: autofixCommand,
          context: 'mobile-interface'
        })
      });

      const data = await response.json();
      clearInterval(progressInterval);
      setProgress(prev => ({ ...prev, autofix: 100 }));

      if (data.success) {
        setAutofixResult(data.result || 'Command executed successfully');
        setAutofixDialogOpen(true);
      } else {
        throw new Error(data.error || 'Autofix failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Autofix failed:', error);
      setAutofixResult(`Error: ${error}`);
      setAutofixDialogOpen(true);
    } finally {
      setAutofixLoading(false);
      setTimeout(() => {
        setProgress(prev => ({ ...prev, autofix: 0 }));
      }, 2000);
    }
  };

  const uploadKnowledgeFile = async () => {
    if (!uploadFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('source', 'mobile-upload');

    try {
      const response = await fetch('/api/omai/upload-knowledge', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setUploadResult(`File uploaded successfully: ${data.processed} entries processed`);
        setUploadDialogOpen(true);
        await loadLearningStatus();
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadResult(`Upload failed: ${error}`);
      setUploadDialogOpen(true);
    } finally {
      setUploadLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const formatLastRun = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const speedDialActions = [
    { icon: <RefreshIcon />, name: 'Refresh Learning', action: refreshLearning, disabled: learningLoading },
    { icon: <StatusIcon />, name: 'Learning Status', action: () => setStatusDialogOpen(true) },
    { icon: <MemoryIcon />, name: 'View Memory', action: () => setMemoryDialogOpen(true) },
    { icon: <AutofixIcon />, name: 'Run Autofix', action: () => setAutofixDialogOpen(true) },
    { icon: <UploadIcon />, name: 'Upload Knowledge', action: () => setUploadDialogOpen(true) }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      pb: 10, // Space for FAB
      px: isFold ? 1 : 2
    }}>
      {/* Header */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', mb: 2 }}>
        <Toolbar>
          <BrainIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            OMAI Mobile
          </Typography>
          <IconButton onClick={loadInitialData} disabled={statusLoading}>
            {statusLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Toolbar>
        {(learningLoading || autofixLoading) && (
          <LinearProgress 
            variant="determinate" 
            value={learningLoading ? progress.learning : progress.autofix}
            sx={{ height: 3 }}
          />
        )}
      </AppBar>

      <Stack direction="column" spacing={2}>
        {/* Quick Status Overview */}
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                System Status
              </Typography>
              <IconButton onClick={() => toggleSection('overview')} size="small">
                {expandedSections.includes('overview') ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={expandedSections.includes('overview')}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                    <Typography variant="h4" color="success.dark">
                      {learningStatus?.learning?.isActive ? '✓' : '○'}
                    </Typography>
                    <Typography variant="caption">Learning Active</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                    <Typography variant="h4" color="info.dark">
                      {learningStatus?.learning?.memoryCacheSize || 0}
                    </Typography>
                    <Typography variant="caption">Memory Entries</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                    <Typography variant="h4" color="warning.dark">
                      {learningStatus?.learning?.totalFilesProcessed || 0}
                    </Typography>
                    <Typography variant="caption">Files Processed</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light' }}>
                    <Typography variant="h4" color="secondary.dark">
                      {learningStatus?.agents?.registered?.length || 0}
                    </Typography>
                    <Typography variant="caption">Active Agents</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {lastRefreshTime && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Last refresh: {lastRefreshTime.toLocaleTimeString()}
                </Alert>
              )}
            </Collapse>
          </CardContent>
        </Card>

        {/* Learning Sources */}
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Learning Sources
              </Typography>
              <IconButton onClick={() => toggleSection('sources')} size="small">
                {expandedSections.includes('sources') ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={expandedSections.includes('sources')}>
              <List dense>
                {learningStatus?.sources && Object.entries(learningStatus.sources).map(([key, source]) => (
                  <ListItem key={key} divider>
                    <ListItemIcon>
                      {source.type === 'documentation' ? <FileIcon /> : 
                       source.type === 'react-component' ? <CodeIcon /> : <FolderIcon />}
                    </ListItemIcon>
                    <ListItemText
                      primary={source.path}
                      secondary={`${source.type} • ${source.priority} priority`}
                    />
                    <Chip 
                      label={source.extensions.length} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Quick Actions
            </Typography>
            
            <Stack spacing={2}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={learningLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={refreshLearning}
                disabled={learningLoading}
                sx={{ py: 2 }}
              >
                {learningLoading ? 'Refreshing Learning...' : 'Refresh Learning'}
              </Button>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<StatusIcon />}
                    onClick={() => setStatusDialogOpen(true)}
                    sx={{ py: 1.5 }}
                  >
                    Status
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<MemoryIcon />}
                    onClick={() => setMemoryDialogOpen(true)}
                    sx={{ py: 1.5 }}
                  >
                    Memory
                  </Button>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AutofixIcon />}
                    onClick={() => setAutofixDialogOpen(true)}
                    sx={{ py: 1.5 }}
                  >
                    Autofix
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<UploadIcon />}
                    onClick={() => setUploadDialogOpen(true)}
                    sx={{ py: 1.5 }}
                  >
                    Upload
                  </Button>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Activity
              </Typography>
              <Button size="small" onClick={() => setLogsDrawerOpen(true)}>
                View Logs
              </Button>
            </Box>

            <List dense>
              <ListItem>
                <ListItemText
                  primary="Last Learning Run"
                  secondary={formatLastRun(learningStatus?.learning?.lastRun)}
                />
                <Chip 
                  size="small" 
                  label={learningStatus?.learning?.isActive ? 'Active' : 'Idle'}
                  color={learningStatus?.learning?.isActive ? 'success' : 'default'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Memory Cache"
                  secondary={`${learningStatus?.learning?.memoryCacheSize || 0} entries`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Files Processed"
                  secondary={`${learningStatus?.learning?.totalFilesProcessed || 0} total`}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Stack>

      {/* Floating Speed Dial */}
      <SpeedDial
        ariaLabel="OMAI Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
        direction="up"
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            tooltipOpen
            onClick={() => {
              setSpeedDialOpen(false);
              action.action();
            }}
            sx={{ 
              opacity: action.disabled ? 0.5 : 1,
              pointerEvents: action.disabled ? 'none' : 'auto'
            }}
          />
        ))}
      </SpeedDial>

      {/* Learning Status Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        fullScreen={isFold}
      >
        <DialogTitle>
          <StatusIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Learning Status
        </DialogTitle>
        <DialogContent>
          {learningStatus?.success && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Learning system is operational
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>System Status</Typography>
                  <Typography variant="body2">
                    Active: {learningStatus.learning?.isActive ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="body2">
                    Last Run: {formatLastRun(learningStatus.learning?.lastRun)}
                  </Typography>
                  <Typography variant="body2">
                    Processing Time: {learningStatus.learning?.learningTime || 0}ms
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Statistics</Typography>
                  <Typography variant="body2">
                    Files Processed: {learningStatus.learning?.totalFilesProcessed || 0}
                  </Typography>
                  <Typography variant="body2">
                    Files Skipped: {learningStatus.learning?.totalFilesSkipped || 0}
                  </Typography>
                  <Typography variant="body2">
                    Errors: {learningStatus.learning?.totalErrors || 0}
                  </Typography>
                  <Typography variant="body2">
                    Memory Cache: {learningStatus.learning?.memoryCacheSize || 0} entries
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Memory Preview Dialog */}
      <Dialog
        open={memoryDialogOpen}
        onClose={() => setMemoryDialogOpen(false)}
        TransitionComponent={Transition}
        maxWidth="md"
        fullWidth
        fullScreen={isFold}
      >
        <DialogTitle>
          <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Memory Preview
        </DialogTitle>
        <DialogContent>
          {memoryLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : memoryPreview ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Total Entries: {memoryPreview.totalEntries}
              </Typography>
              <List>
                {memoryPreview.recentEntries.map((entry) => (
                  <ListItem key={entry.id} divider>
                    <ListItemText
                      primary={entry.context}
                      secondary={`${entry.type} • ${new Date(entry.timestamp).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Alert severity="info">Memory preview not available</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Autofix Dialog */}
      <Dialog
        open={autofixDialogOpen}
        onClose={() => setAutofixDialogOpen(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        fullScreen={isFold}
      >
        <DialogTitle>
          <AutofixIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Run Autofix
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Select Agent</InputLabel>
              <Select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                label="Select Agent"
              >
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Command</InputLabel>
              <Select
                value={autofixCommand}
                onChange={(e) => setAutofixCommand(e.target.value)}
                label="Command"
                disabled={!selectedAgent}
              >
                {agents.find(a => a.id === selectedAgent)?.commands?.map((cmd) => (
                  <MenuItem key={cmd} value={cmd}>
                    {cmd}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {autofixResult && (
              <Alert severity={autofixResult.includes('Error') ? 'error' : 'success'}>
                {autofixResult}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutofixDialogOpen(false)}>Close</Button>
          <Button 
            onClick={runAutofix} 
            variant="contained"
            disabled={!selectedAgent || !autofixCommand || autofixLoading}
            startIcon={autofixLoading ? <CircularProgress size={16} /> : <PlayIcon />}
          >
            {autofixLoading ? 'Running...' : 'Run'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        fullScreen={isFold}
      >
        <DialogTitle>
          <UploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Upload Knowledge File
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <input
              type="file"
              accept=".md,.txt,.json,.js,.ts,.tsx,.jsx"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ width: '100%', padding: '8px' }}
            />
            
            {uploadFile && (
              <Alert severity="info">
                Selected: {uploadFile.name} ({Math.round(uploadFile.size / 1024)}KB)
              </Alert>
            )}

            {uploadResult && (
              <Alert severity={uploadResult.includes('failed') ? 'error' : 'success'}>
                {uploadResult}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Close</Button>
          <Button 
            onClick={uploadKnowledgeFile} 
            variant="contained"
            disabled={!uploadFile || uploadLoading}
            startIcon={uploadLoading ? <CircularProgress size={16} /> : <UploadIcon />}
          >
            {uploadLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={logsDrawerOpen}
        onClose={() => setLogsDrawerOpen(false)}
        onOpen={() => setLogsDrawerOpen(true)}
        PaperProps={{
          sx: { height: '50vh' }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">System Logs</Typography>
            <IconButton onClick={() => setLogsDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Logs would be displayed here in a real implementation.
            This could show learning progress, errors, and system events.
          </Typography>
        </Box>
      </SwipeableDrawer>
    </Box>
  );
};

export default OMAIDiscoveryPanelMobile; 