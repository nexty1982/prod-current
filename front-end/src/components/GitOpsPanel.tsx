import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AccountTree as GitBranchIcon,
  CallMerge as MergeIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Comment as CommentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Code as CodeIcon,
  Schedule as ScheduleIcon,
  Save as SaveIcon,
  FiberManualRecord as CommitIcon,
  CompareArrows as PullRequestIcon
} from '@mui/icons-material';
import { ComponentInfo } from '../hooks/useComponentRegistry.ts';
import { gitOpsBridge } from '../ai/git/gitOpsBridge.ts';
import { commitHandler, CommitData } from '../ai/git/commitHandler.ts';
import { prGenerator, PullRequest, PRResult } from '../ai/git/prGenerator.ts';
import { gitConfigManager, GitConfig } from '../ai/git/config.ts';

interface GitOpsPanelProps {
  component: ComponentInfo;
  isOpen: boolean;
  onClose: () => void;
}

interface GitOpsState {
  isConfigured: boolean;
  isInitialized: boolean;
  pendingPRs: PullRequest[];
  commitHistory: CommitData[];
  isLoading: boolean;
  error?: string;
  warnings?: string[];
}

const GitOpsPanel: React.FC<GitOpsPanelProps> = ({ component, isOpen, onClose }) => {
  const [state, setState] = useState<GitOpsState>({
    isConfigured: false,
    isInitialized: false,
    pendingPRs: [],
    commitHistory: [],
    isLoading: false,
    error: undefined,
    warnings: undefined
  });

  const [gitConfig, setGitConfig] = useState<GitConfig>(gitConfigManager.getConfig());
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (isOpen && component) {
      initializeGitOps();
      loadGitOpsData();
    }
  }, [isOpen, component]);

  const initializeGitOps = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      // Check if GitOps is configured
      const isConfigured = await gitOpsBridge.isConfigured();
      
      if (!isConfigured) {
        setState(prev => ({ 
          ...prev, 
          isConfigured: false, 
          isLoading: false, 
          error: 'GitOps is not configured. Please configure Git settings first.' 
        }));
        return;
      }

      // Initialize GitOps bridge
      const initResult = await gitOpsBridge.initialize();
      if (!initResult.success) {
        setState(prev => ({ 
          ...prev, 
          isConfigured: true, 
          isInitialized: false, 
          isLoading: false, 
          error: initResult.error,
          warnings: initResult.warnings 
        }));
        return;
      }

      setState(prev => ({ 
        ...prev, 
        isConfigured: true, 
        isInitialized: true, 
        isLoading: false,
        warnings: initResult.warnings 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Failed to initialize GitOps: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  const loadGitOpsData = async () => {
    if (!state.isInitialized) return;

    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Load pending PRs
      const pendingPRs = await prGenerator.getPendingPRs(component.name);
      
      // Load commit history
      const commitHistory = await commitHandler.getCommitHistory(component.name, 5);
      
      setState(prev => ({ 
        ...prev, 
        pendingPRs, 
        commitHistory, 
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Failed to load GitOps data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  const handleAutoCommit = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      // Create GitOps context
      const context = {
        componentName: component.name,
        issueSummary: 'Auto-fix applied by OMAI',
        confidence: 0.85, // This would come from the actual fix result
        appliedFixes: ['Fixed component rendering', 'Updated styling'],
        beforeSnapshot: JSON.stringify(component.props),
        afterSnapshot: JSON.stringify(component.props),
        user: 'super_admin' // This would come from auth context
      };

      const result = await commitHandler.autoCommitFix(context);
      
      if (result.success && result.commitData) {
        // Create PR if auto-create is enabled
        if (gitConfig.autoCreatePR) {
          const prResult = await prGenerator.createPullRequest(
            result.commitData.branchName,
            {
              componentName: context.componentName,
              issueSummary: context.issueSummary,
              confidence: context.confidence,
              appliedFixes: context.appliedFixes,
              beforeSnapshot: context.beforeSnapshot,
              afterSnapshot: context.afterSnapshot,
              user: context.user
            }
          );
          
          if (prResult.success && prResult.pullRequest) {
            setState(prev => ({ 
              ...prev, 
              pendingPRs: [...prev.pendingPRs, prResult.pullRequest!],
              isLoading: false 
            }));
          }
        }
        
        // Reload data
        await loadGitOpsData();
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Auto-commit failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  const handleMergePR = async (prId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const result = await prGenerator.mergePR(prId);
      
      if (result.success) {
        // Update local PR list
        setState(prev => ({
          ...prev,
          pendingPRs: prev.pendingPRs.map(pr => 
            pr.id === prId ? { ...pr, status: 'merged' as const } : pr
          ),
          isLoading: false
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Failed to merge PR: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  const handleClosePR = async (prId: string, reason?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const result = await prGenerator.closePR(prId, reason);
      
      if (result.success) {
        // Update local PR list
        setState(prev => ({
          ...prev,
          pendingPRs: prev.pendingPRs.map(pr => 
            pr.id === prId ? { ...pr, status: 'closed' as const } : pr
          ),
          isLoading: false
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Failed to close PR: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  const handleAddComment = async (prId: string) => {
    if (!commentText.trim()) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const result = await prGenerator.addPRComment(prId, {
        author: 'super_admin',
        content: commentText,
        type: 'comment'
      });
      
      if (result.success) {
        setCommentText('');
        setShowPRDialog(false);
        await loadGitOpsData();
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  const updateGitConfig = (updates: Partial<GitConfig>) => {
    const newConfig = { ...gitConfig, ...updates };
    setGitConfig(newConfig);
    gitConfigManager.updateConfig(updates);
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

  if (!isOpen) return null;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitBranchIcon sx={{ fontSize: 20 }} />
          <Typography variant="h6">GitOps & Pull Requests</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={loadGitOpsData} disabled={state.isLoading}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton size="small" onClick={() => setShowConfigDialog(true)}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Status */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {state.warnings && state.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {state.warnings.join(', ')}
        </Alert>
      )}

      {!state.isConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          GitOps is not configured. Click the settings icon to configure Git integration.
        </Alert>
      )}

      {/* Loading */}
      {state.isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* GitOps Actions */}
      {state.isConfigured && state.isInitialized && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CommitIcon sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2">GitOps Actions</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<CommitIcon />}
                onClick={handleAutoCommit}
                disabled={state.isLoading || !gitConfig.autoCommitEnabled}
              >
                Auto-Commit Fix
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ScheduleIcon />}
                onClick={loadGitOpsData}
                disabled={state.isLoading}
              >
                Refresh
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Pending Pull Requests */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PullRequestIcon sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2">Pending Pull Requests</Typography>
            {state.pendingPRs.length > 0 && (
              <Chip label={state.pendingPRs.length} size="small" color="primary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {state.pendingPRs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No pending pull requests
            </Typography>
          ) : (
            <List dense>
              {state.pendingPRs.map((pr) => (
                <ListItem key={pr.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <ListItemIcon>
                      {getStatusIcon(pr.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={pr.title}
                      secondary={`${pr.sourceBranch} → ${pr.targetBranch} • ${new Date(pr.createdAt).toLocaleDateString()}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {pr.url && (
                        <Tooltip title="Open in Git provider">
                          <IconButton size="small" onClick={() => window.open(pr.url, '_blank')}>
                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => { setSelectedPR(pr); setShowPRDialog(true); }}>
                          <CommentIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      {pr.status === 'open' && (
                        <>
                          <Tooltip title="Merge PR">
                            <IconButton size="small" onClick={() => handleMergePR(pr.id)}>
                              <MergeIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Close PR">
                            <IconButton size="small" onClick={() => handleClosePR(pr.id, 'Closed by user')}>
                              <CloseIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </Box>
                  {pr.labels && pr.labels.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                      {pr.labels.map((label) => (
                        <Chip key={label} label={label} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Commit History */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2">Commit History</Typography>
            {state.commitHistory.length > 0 && (
              <Chip label={state.commitHistory.length} size="small" color="secondary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {state.commitHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No commit history available
            </Typography>
          ) : (
            <List dense>
              {state.commitHistory.map((commit) => (
                <ListItem key={commit.commitHash} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <ListItemIcon>
                      <CommitIcon sx={{ fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={commit.commitMessage.split('\n')[0]}
                      secondary={`${commit.branchName} • ${new Date(commit.timestamp).toLocaleString()}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </Box>
                  {commit.files && commit.files.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                      {commit.files.slice(0, 3).map((file) => (
                        <Chip key={file} label={file.split('/').pop()} size="small" variant="outlined" />
                      ))}
                      {commit.files.length > 3 && (
                        <Chip label={`+${commit.files.length - 3} more`} size="small" variant="outlined" />
                      )}
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>GitOps Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={gitConfig.autoCommitEnabled}
                  onChange={(e) => updateGitConfig({ autoCommitEnabled: e.target.checked })}
                />
              }
              label="Auto-commit enabled"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={gitConfig.autoCreatePR}
                  onChange={(e) => updateGitConfig({ autoCreatePR: e.target.checked })}
                />
              }
              label="Auto-create PR"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={gitConfig.autoMergeEnabled}
                  onChange={(e) => updateGitConfig({ autoMergeEnabled: e.target.checked })}
                />
              }
              label="Auto-merge enabled"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={gitConfig.requireApproval}
                  onChange={(e) => updateGitConfig({ requireApproval: e.target.checked })}
                />
              }
              label="Require approval"
            />
            <Box>
              <Typography variant="body2" gutterBottom>
                Commit Confidence Threshold: {Math.round(gitConfig.commitConfidenceThreshold * 100)}%
              </Typography>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={gitConfig.commitConfidenceThreshold}
                onChange={(e) => updateGitConfig({ commitConfidenceThreshold: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </Box>
            <Box>
              <Typography variant="body2" gutterBottom>
                PR Confidence Threshold: {Math.round(gitConfig.prConfidenceThreshold * 100)}%
              </Typography>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={gitConfig.prConfidenceThreshold}
                onChange={(e) => updateGitConfig({ prConfidenceThreshold: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Git Provider</InputLabel>
              <Select
                value={gitConfig.provider}
                onChange={(e) => updateGitConfig({ provider: e.target.value as 'github' | 'gitlab' | 'gitea' })}
                label="Git Provider"
              >
                <MenuItem value="github">GitHub</MenuItem>
                <MenuItem value="gitlab">GitLab</MenuItem>
                <MenuItem value="gitea">Gitea</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Default Branch"
              value={gitConfig.defaultBranch}
              onChange={(e) => updateGitConfig({ defaultBranch: e.target.value })}
              fullWidth
            />
            <TextField
              label="Branch Prefix"
              value={gitConfig.omaiBranchPrefix}
              onChange={(e) => updateGitConfig({ omaiBranchPrefix: e.target.value })}
              fullWidth
            />
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
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedPR.description}
              </Typography>
              
              <Divider />
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Comments</Typography>
                {selectedPR.comments && selectedPR.comments.length > 0 ? (
                  <List dense>
                    {selectedPR.comments.map((comment) => (
                      <ListItem key={comment.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {comment.author}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(comment.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                          {comment.content}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No comments yet
                  </Typography>
                )}
              </Box>
              
              <Divider />
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Add Comment</Typography>
                <TextField
                  multiline
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  fullWidth
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPRDialog(false)}>Close</Button>
          {commentText.trim() && (
            <Button onClick={() => handleAddComment(selectedPR!.id)} variant="contained">
              Add Comment
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GitOpsPanel; 