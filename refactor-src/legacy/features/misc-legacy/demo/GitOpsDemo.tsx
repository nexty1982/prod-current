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
  ListItemIcon,
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
  DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AccountTree as GitBranchIcon,
  CompareArrows as PullRequestIcon,
  FiberManualRecord as CommitIcon,
  CallMerge as MergeIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

const GitOpsDemo: React.FC = () => {
  const { user } = useAuth();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [selectedPR, setSelectedPR] = useState<any>(null);

  // Mock data for demonstration
  const mockPRs = [
    {
      id: 'pr-001',
      title: '🤖 OMAI Auto-Fix: UserTable - Fixed accessibility issues',
      status: 'open',
      sourceBranch: 'omai-fixes/2024-01-15-usertable',
      targetBranch: 'main',
      confidence: 0.92,
      createdAt: '2024-01-15T10:30:00Z',
      author: 'omai-bot',
      labels: ['omai-auto-fix', 'frontend', 'high-confidence', 'accessibility'],
      appliedFixes: ['Added aria-label to table headers', 'Fixed keyboard navigation', 'Improved color contrast'],
      url: 'https://github.com/orthodoxmetrics/orthodoxmetrics/pull/123'
    },
    {
      id: 'pr-002',
      title: '🤖 OMAI Auto-Fix: DashboardCard - Resolved layout issues',
      status: 'merged',
      sourceBranch: 'omai-fixes/2024-01-14-dashboardcard',
      targetBranch: 'main',
      confidence: 0.87,
      createdAt: '2024-01-14T15:45:00Z',
      author: 'omai-bot',
      labels: ['omai-auto-fix', 'frontend', 'medium-confidence', 'styling'],
      appliedFixes: ['Fixed responsive layout', 'Corrected CSS conflicts', 'Added proper spacing'],
      url: 'https://github.com/orthodoxmetrics/orthodoxmetrics/pull/122'
    },
    {
      id: 'pr-003',
      title: '🤖 OMAI Auto-Fix: NavigationMenu - Performance improvements',
      status: 'closed',
      sourceBranch: 'omai-fixes/2024-01-13-navigationmenu',
      targetBranch: 'main',
      confidence: 0.78,
      createdAt: '2024-01-13T09:20:00Z',
      author: 'omai-bot',
      labels: ['omai-auto-fix', 'frontend', 'medium-confidence', 'performance'],
      appliedFixes: ['Optimized re-renders', 'Reduced bundle size', 'Improved loading time'],
      url: 'https://github.com/orthodoxmetrics/orthodoxmetrics/pull/121'
    }
  ];

  const mockCommits = [
    {
      hash: 'abc1234',
      message: 'fix(UserTable): OMAI auto-fix - Fixed accessibility issues',
      branch: 'omai-fixes/2024-01-15-usertable',
      timestamp: '2024-01-15T10:30:00Z',
      files: ['front-end/src/shared/ui/legacy/UserTable.tsx', 'front-end/src/shared/ui/legacy/UserTable.css'],
      confidence: 0.92
    },
    {
      hash: 'def5678',
      message: 'fix(DashboardCard): OMAI auto-fix - Resolved layout issues',
      branch: 'omai-fixes/2024-01-14-dashboardcard',
      timestamp: '2024-01-14T15:45:00Z',
      files: ['front-end/src/shared/ui/legacy/DashboardCard.tsx'],
      confidence: 0.87
    }
  ];

  const mockGitConfig = {
    autoCommitEnabled: true,
    autoCreatePR: true,
    autoMergeEnabled: false,
    requireApproval: true,
    commitConfidenceThreshold: 0.7,
    prConfidenceThreshold: 0.8,
    provider: 'github',
    defaultBranch: 'main',
    omaiBranchPrefix: 'omai-fixes'
  };

  const handleViewPR = (pr: any) => {
    setSelectedPR(pr);
    setShowPRDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />;
      case 'merged':
        return <MergeIcon color="primary" sx={{ fontSize: 16 }} />;
      case 'closed':
        return <ErrorIcon color="error" sx={{ fontSize: 16 }} />;
      default:
        return <WarningIcon color="warning" sx={{ fontSize: 16 }} />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
        🔄 GitOps & Pull Request Automation Demo
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body1">
          <strong>Instructions:</strong> This demo showcases the GitOps integration and pull request automation features. As a super_admin, you can:
        </Typography>
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          <li>View simulated pull requests created by OMAI</li>
          <li>Configure GitOps settings and thresholds</li>
          <li>Test commit history and branch management</li>
          <li>Experience the automated PR workflow</li>
        </Box>
      </Alert>

      {/* GitOps Configuration Overview */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography variant="h6">GitOps Configuration</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, border: '1px solid #4caf50' }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  ✅ Enabled Features
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Auto-commit enabled" 
                      secondary="Fixes are automatically committed to Git"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Auto-create PR" 
                      secondary="Pull requests are created automatically"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Require approval" 
                      secondary="Manual approval required for merging"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, border: '1px solid #ff9800' }}>
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  ⚠️ Thresholds & Safety
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary={`Commit threshold: ${Math.round(mockGitConfig.commitConfidenceThreshold * 100)}%`}
                      secondary="Minimum confidence for auto-commit"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={`PR threshold: ${Math.round(mockGitConfig.prConfidenceThreshold * 100)}%`}
                      secondary="Minimum confidence for PR creation"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Auto-merge disabled" 
                      secondary="Manual review required"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setShowConfigDialog(true)}
            >
              Configure GitOps Settings
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Pull Requests Overview */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PullRequestIcon />
            <Typography variant="h6">Pull Requests ({mockPRs.length})</Typography>
            <Chip 
              label={`${mockPRs.filter(pr => pr.status === 'open').length} open`} 
              size="small" 
              color="primary" 
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {mockPRs.map((pr) => (
              <ListItem key={pr.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <ListItemIcon>
                    {getStatusIcon(pr.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={pr.title}
                    secondary={`${pr.sourceBranch} → ${pr.targetBranch} • ${new Date(pr.createdAt).toLocaleDateString()} • ${pr.author}`}
                    primaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip 
                      label={`${Math.round(pr.confidence * 100)}%`} 
                      size="small" 
                      color={getConfidenceColor(pr.confidence) as any}
                    />
                    <IconButton size="small" onClick={() => handleViewPR(pr)}>
                      <InfoIcon />
                    </IconButton>
                    {pr.url && (
                      <IconButton size="small" onClick={() => window.open(pr.url, '_blank')}>
                        <OpenInNewIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  {pr.labels.map((label) => (
                    <Chip key={label} label={label} size="small" variant="outlined" />
                  ))}
                </Box>
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Commit History */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CommitIcon />
            <Typography variant="h6">Recent Commits ({mockCommits.length})</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {mockCommits.map((commit) => (
              <ListItem key={commit.hash} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <ListItemIcon>
                    <CommitIcon sx={{ fontSize: 16 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={commit.message}
                    secondary={`${commit.branch} • ${new Date(commit.timestamp).toLocaleString()}`}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip 
                    label={`${Math.round(commit.confidence * 100)}%`} 
                    size="small" 
                    color={getConfidenceColor(commit.confidence) as any}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  {commit.files.map((file) => (
                    <Chip key={file} label={file.split('/').pop()} size="small" variant="outlined" />
                  ))}
                </Box>
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Testing Instructions */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>🧪 Testing Instructions</Typography>
        <Box component="ol" sx={{ pl: 2 }}>
          <li><strong>Enable Site Edit Mode:</strong> Click the floating edit button to activate the Site Editor overlay</li>
          <li><strong>Inspect Components:</strong> Hover over any component and click to open the Inspector Panel</li>
          <li><strong>Open GitOps Panel:</strong> In the Inspector Panel, expand the "GitOps & Pull Requests" section</li>
          <li><strong>Configure Settings:</strong> Use the settings dialog to adjust GitOps configuration</li>
          <li><strong>Test Auto-Commit:</strong> Apply fixes and watch them get committed automatically</li>
          <li><strong>Review PRs:</strong> View and interact with generated pull requests</li>
          <li><strong>Monitor History:</strong> Check commit history and branch management</li>
        </Box>
      </Paper>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>GitOps Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControlLabel
              control={<Switch checked={mockGitConfig.autoCommitEnabled} />}
              label="Auto-commit enabled"
            />
            <FormControlLabel
              control={<Switch checked={mockGitConfig.autoCreatePR} />}
              label="Auto-create PR"
            />
            <FormControlLabel
              control={<Switch checked={mockGitConfig.autoMergeEnabled} />}
              label="Auto-merge enabled"
            />
            <FormControlLabel
              control={<Switch checked={mockGitConfig.requireApproval} />}
              label="Require approval"
            />
            <Box>
              <Typography variant="body2" gutterBottom>
                Commit Confidence Threshold: {Math.round(mockGitConfig.commitConfidenceThreshold * 100)}%
              </Typography>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={mockGitConfig.commitConfidenceThreshold}
                style={{ width: '100%' }}
                disabled
              />
            </Box>
            <Box>
              <Typography variant="body2" gutterBottom>
                PR Confidence Threshold: {Math.round(mockGitConfig.prConfidenceThreshold * 100)}%
              </Typography>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={mockGitConfig.prConfidenceThreshold}
                style={{ width: '100%' }}
                disabled
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfigDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* PR Details Dialog */}
      <Dialog open={showPRDialog} onClose={() => setShowPRDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPR?.title}
        </DialogTitle>
        <DialogContent>
          {selectedPR && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="medium">Status:</Typography>
                <Chip 
                  label={selectedPR.status} 
                  size="small" 
                  color={selectedPR.status === 'open' ? 'success' : selectedPR.status === 'merged' ? 'primary' : 'error'}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="medium">Confidence:</Typography>
                <Chip 
                  label={`${Math.round(selectedPR.confidence * 100)}%`} 
                  size="small" 
                  color={getConfidenceColor(selectedPR.confidence) as any}
                />
              </Box>
              <Divider />
              <Typography variant="subtitle2" gutterBottom>Applied Fixes:</Typography>
              <List dense>
                {selectedPR.appliedFixes.map((fix: string, index: number) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemText primary={fix} primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                ))}
              </List>
              <Divider />
              <Typography variant="subtitle2" gutterBottom>Labels:</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedPR.labels.map((label: string) => (
                  <Chip key={label} label={label} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPRDialog(false)}>Close</Button>
          {selectedPR?.url && (
            <Button 
              variant="contained" 
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(selectedPR.url, '_blank')}
            >
              View on GitHub
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          🔄 Try the GitOps integration by enabling Site Edit Mode and exploring the GitOps panel in the Component Inspector!
        </Typography>
      </Box>
    </Box>
  );
};

export default GitOpsDemo; 