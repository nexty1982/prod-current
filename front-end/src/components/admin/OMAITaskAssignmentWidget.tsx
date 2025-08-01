/**
 * OMAITaskAssignmentWidget.tsx
 * Dashboard widget showing recent OMAI task assignment activity
 * For admin/super_admin users only
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  Grid
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  RemoveRedEye as ViewIcon
} from '@mui/icons-material';
import { omaiAPI } from '../../api/omai.api';
import { useAuth } from '../../context/AuthContext';
import EmailSettingsForm from './EmailSettingsForm';

interface TaskAssignmentData {
  recent_links: Array<{
    id: number;
    email: string;
    created_at: string;
    is_used: boolean;
    used_at?: string;
    token?: string;
  }>;
  recent_submissions: Array<{
    id: number;
    email: string;
    tasks_json: string;
    submitted_at: string;
    sent_to_nick: boolean;
    sent_at?: string;
  }>;
  recent_logs: Array<{
    timestamp: string;
    action: string;
    email: string;
    token?: string;
    data: any;
  }>;
}

const OMAITaskAssignmentWidget: React.FC = () => {
  const { hasRole, isSuperAdmin } = useAuth();
  const [data, setData] = useState<TaskAssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [newLinkEmail, setNewLinkEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingToken, setDeletingToken] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewSubmissionOpen, setViewSubmissionOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  // Check if user has permission to view this widget
  const canView = isSuperAdmin() || hasRole('admin');

  const fetchData = async () => {
    if (!canView) return;
    
    try {
      setError(null);
      const response = await omaiAPI.getTaskLogs(10);
      if (response.success) {
        setData(response.data);
      } else {
        setError('Failed to load task assignment data');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [canView]);

  const handleGenerateLink = async () => {
    if (!newLinkEmail || !omaiAPI.validateEmail(newLinkEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await omaiAPI.generateTaskLink(newLinkEmail);
      if (response.success) {
        setGenerateDialogOpen(false);
        setNewLinkEmail('');
        fetchData(); // Refresh data
      } else {
        setError('Failed to generate task link');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate link');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteLink = async (token: string) => {
    setDeletingToken(token);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingToken) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await omaiAPI.deleteTaskLink(deletingToken);
      if (response.success) {
        fetchData(); // Refresh data
        showToast('Task link deleted successfully', 'success');
      } else {
        setError('Failed to delete task link');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete task link');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeletingToken(null);
    }
  };

  const handleCopyLink = async (token: string, email: string) => {
    const baseURL = window.location.origin;
    const taskURL = `${baseURL}/assign-task?token=${token}`;
    
    try {
      await navigator.clipboard.writeText(taskURL);
      showToast(`Task link copied to clipboard for ${email}`, 'success');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = taskURL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast(`Task link copied to clipboard for ${email}`, 'success');
    }
  };

  const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    // Assuming there's a toast system available
    setError(severity === 'error' ? message : null);
    if (severity === 'success') {
      setError(null);
      // You might want to implement a proper toast system here
      console.log('✅', message);
    }
  };

  const handleViewSubmission = (submission: any) => {
    setSelectedSubmission(submission);
    setViewSubmissionOpen(true);
  };

  const handleDownloadSubmission = (submission: any) => {
    try {
      const tasks = JSON.parse(submission.tasks_json);
      const filename = `task-submission-${submission.id}-${submission.email.replace('@', '_at_')}.txt`;
      
      const content = generateSubmissionReport(submission, tasks);
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(`Task submission downloaded as ${filename}`, 'success');
    } catch (error) {
      setError('Failed to download submission');
    }
  };

  const generateSubmissionReport = (submission: any, tasks: any[]) => {
    const date = new Date(submission.submitted_at).toLocaleString();
    
    let report = `OMAI Task Submission Report\n`;
    report += `=====================================\n\n`;
    report += `Submission ID: ${submission.id}\n`;
    report += `From Email: ${submission.email}\n`;
    report += `Submitted: ${date}\n`;
    report += `Total Tasks: ${tasks.length}\n`;
    report += `Sent to Nick: ${submission.sent_to_nick ? 'Yes' : 'No'}\n`;
    if (submission.sent_at) {
      report += `Email Sent: ${new Date(submission.sent_at).toLocaleString()}\n`;
    }
    report += `\n`;
    
    report += `TASK DETAILS\n`;
    report += `=====================================\n\n`;
    
    tasks.forEach((task, index) => {
      report += `Task ${index + 1}:\n`;
      report += `  Title: ${task.title}\n`;
      report += `  Priority: ${task.priority}\n`;
      if (task.description) {
        report += `  Description:\n    ${task.description.replace(/\n/g, '\n    ')}\n`;
      }
      report += `\n`;
    });
    
    report += `\nReport generated: ${new Date().toLocaleString()}\n`;
    report += `© Orthodox Metrics AI System\n`;
    
    return report;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      'TASK_LINK_GENERATED': <EmailIcon color="primary" />,
      'TASKS_SUBMITTED': <CheckCircleIcon color="success" />,
      'TOKEN_VALIDATED': <VisibilityIcon color="info" />,
      'TASK_LINK_ERROR': <AssignmentIcon color="error" />,
      'TASK_SUBMISSION_ERROR': <AssignmentIcon color="error" />
    };
    return iconMap[action] || <HistoryIcon />;
  };

  const getActionLabel = (action: string) => {
    const labelMap: { [key: string]: string } = {
      'TASK_LINK_GENERATED': 'Link Generated',
      'TASKS_SUBMITTED': 'Tasks Submitted',
      'TOKEN_VALIDATED': 'Token Validated',
      'TASK_LINK_ERROR': 'Link Error',
      'TASK_SUBMISSION_ERROR': 'Submission Error'
    };
    return labelMap[action] || action;
  };

  const parseTasksJson = (tasksJson: string) => {
    try {
      const tasks = JSON.parse(tasksJson);
      return Array.isArray(tasks) ? tasks : [];
    } catch {
      return [];
    }
  };

  // Don't render if user doesn't have permission
  if (!canView) {
    return null;
  }

  if (loading) {
    return (
      <Card sx={{ height: 400 }}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ height: 400 }}>
        <CardContent sx={{ p: 0 }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center">
                <AssignmentIcon sx={{ mr: 1, color: '#8c249d' }} />
                <Typography variant="h6">
                  OMAI Task Assignment
                </Typography>
              </Box>
              <Box>
                <Tooltip title="Generate New Task Link">
                  <IconButton
                    size="small"
                    onClick={() => setGenerateDialogOpen(true)}
                    sx={{ mr: 1 }}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Refresh Data">
                  <IconButton size="small" onClick={fetchData}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Links (${data?.recent_links?.length || 0})`} />
            <Tab label={`Submissions (${data?.recent_submissions?.length || 0})`} />
            <Tab label={`Activity (${data?.recent_logs?.length || 0})`} />
            <Tab label="Settings" icon={<SettingsIcon />} />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ height: 280, overflow: 'auto' }}>
            {/* Recent Links Tab */}
            {tabValue === 0 && (
              <List dense>
                {data?.recent_links?.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No task links generated yet" />
                  </ListItem>
                ) : (
                  data?.recent_links?.map((link) => (
                    <ListItem key={link.id} divider>
                      <ListItemIcon>
                        <EmailIcon color={link.is_used ? 'success' : 'primary'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={link.email}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              Created: {formatDate(link.created_at)}
                            </Typography>
                            {link.is_used && link.used_at && (
                              <Typography variant="caption" color="success.main">
                                Used: {formatDate(link.used_at)}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={link.is_used ? 'Used' : 'Pending'}
                          color={link.is_used ? 'success' : 'default'}
                          size="small"
                        />
                        {!link.is_used && (
                          <>
                            <Tooltip title="Copy Link">
                              <IconButton 
                                size="small" 
                                onClick={() => handleCopyLink(link.token || '', link.email)}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Link">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteLink(link.token || '')}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </ListItem>
                  ))
                )}
              </List>
            )}

            {/* Recent Submissions Tab */}
            {tabValue === 1 && (
              <List dense>
                {data?.recent_submissions?.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No task submissions yet" />
                  </ListItem>
                ) : (
                  data?.recent_submissions?.map((submission) => {
                    const tasks = parseTasksJson(submission.tasks_json);
                    return (
                      <ListItem key={submission.id} divider>
                        <ListItemIcon>
                          <CheckCircleIcon color={submission.sent_to_nick ? 'success' : 'warning'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={submission.email}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {tasks.length} task{tasks.length !== 1 ? 's' : ''} • {formatDate(submission.submitted_at)}
                              </Typography>
                              {submission.sent_to_nick && submission.sent_at && (
                                <Typography variant="caption" color="success.main">
                                  Sent to Nick: {formatDate(submission.sent_at)}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                                              <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={submission.sent_to_nick ? 'Delivered' : 'Pending'}
                          color={submission.sent_to_nick ? 'success' : 'warning'}
                          size="small"
                        />
                        <Tooltip title="View Tasks">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download Report">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownloadSubmission(submission)}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      </ListItem>
                    );
                  })
                )}
              </List>
            )}

            {/* Activity Logs Tab */}
            {tabValue === 2 && (
              <List dense>
                {data?.recent_logs?.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No recent activity" />
                  </ListItem>
                ) : (
                  data?.recent_logs?.map((log, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        {getActionIcon(log.action)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">
                              {getActionLabel(log.action)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {log.email}
                            </Typography>
                          </Box>
                        }
                        secondary={formatDate(log.timestamp)}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            )}

            {/* Email Settings Tab */}
            {tabValue === 3 && (
              <Box sx={{ p: 2 }}>
                <EmailSettingsForm />
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Generate Link Dialog */}
      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Task Assignment Link</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter an email address to generate a secure task assignment link. 
            The recipient will receive an email with instructions to assign tasks to Nick.
          </Typography>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={newLinkEmail}
            onChange={(e) => setNewLinkEmail(e.target.value)}
            placeholder="user@example.com"
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateLink}
            variant="contained"
            disabled={generating}
            startIcon={generating ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ bgcolor: '#8c249d' }}
          >
            {generating ? 'Generating...' : 'Generate Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Task Link</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this task assignment link?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. The link will no longer be accessible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Submission Dialog */}
      <Dialog 
        open={viewSubmissionOpen} 
        onClose={() => setViewSubmissionOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Task Submission Details
          {selectedSubmission && (
            <Typography variant="subtitle2" color="text.secondary">
              Submission #{selectedSubmission.id} from {selectedSubmission.email}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box>
              {/* Submission Info */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#f9f9f9' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Submitted:</strong> {formatDate(selectedSubmission.submitted_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Status:</strong> 
                      <Chip 
                        label={selectedSubmission.sent_to_nick ? 'Delivered' : 'Pending'}
                        color={selectedSubmission.sent_to_nick ? 'success' : 'warning'}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Grid>
                  {selectedSubmission.sent_to_nick && selectedSubmission.sent_at && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Delivered:</strong> {formatDate(selectedSubmission.sent_at)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Task List */}
              <Typography variant="h6" gutterBottom>
                Submitted Tasks
              </Typography>
              
              {(() => {
                try {
                  const tasks = JSON.parse(selectedSubmission.tasks_json);
                  return (
                    <List>
                      {tasks.map((task: any, index: number) => (
                        <Paper key={index} sx={{ mb: 2, p: 2 }}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Typography variant="h6" component="span">
                              Task {index + 1}
                            </Typography>
                            <Chip 
                              label={task.priority} 
                              color={
                                task.priority === 'high' ? 'error' :
                                task.priority === 'medium' ? 'warning' : 'default'
                              }
                              size="small"
                              sx={{ ml: 2 }}
                            />
                          </Box>
                          
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {task.title}
                          </Typography>
                          
                          {task.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                              {task.description}
                            </Typography>
                          )}
                        </Paper>
                      ))}
                    </List>
                  );
                } catch (error) {
                  return (
                    <Alert severity="error">
                      Failed to parse task data: {selectedSubmission.tasks_json}
                    </Alert>
                  );
                }
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewSubmissionOpen(false)}>
            Close
          </Button>
          {selectedSubmission && (
            <Button
              onClick={() => handleDownloadSubmission(selectedSubmission)}
              variant="contained"
              startIcon={<DownloadIcon />}
              sx={{ bgcolor: '#8c249d' }}
            >
              Download Report
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OMAITaskAssignmentWidget; 