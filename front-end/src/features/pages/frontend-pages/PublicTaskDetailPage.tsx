/**
 * PublicTaskDetailPage.tsx
 * Public-facing page showing details of a single task with visibility='public'
 * Accessible without authentication
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Divider,
  Link,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  Label as LabelIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { omaiAPI } from '@/api/omai.api';

interface TaskRevision {
  rev_index: number;
  rev_number: number | null;
  title: string;
  markdown: string;
}

interface PublicTask {
  id: number;
  title: string;
  category: string;
  importance: string;
  details: string;
  tags: string[];
  attachments?: string[];
  status: number;
  type: 'documentation' | 'configuration' | 'reference' | 'guide';
  visibility: 'admin' | 'public';
  date_created: string;
  date_completed?: string;
  assignedTo?: string;
  assignedBy?: string;
  notes?: string;
  revisions?: TaskRevision[];
}

const STATUS_LABELS: Record<number, string> = {
  1: 'Not Started',
  2: 'In Progress',
  3: 'In Review',
  4: 'Blocked',
  5: 'On Hold',
  6: 'Task Completed'
};

const IMPORTANCE_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default'
};

const TYPE_LABELS: Record<string, string> = {
  documentation: 'Documentation',
  configuration: 'Configuration',
  reference: 'Reference',
  guide: 'Guide'
};

const TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  documentation: 'info',
  configuration: 'warning',
  reference: 'primary',
  guide: 'success'
};

/**
 * Get display label for a revision
 */
const getRevisionLabel = (revision: TaskRevision): string => {
  if (revision.rev_number !== null) {
    return `rev${revision.rev_number}`;
  }
  return revision.title || 'intro';
};

const PublicTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<PublicTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await omaiAPI.getPublicTask(id);

      if (response.success && response.data) {
        // Verify task is public
        if (response.data.visibility !== 'public') {
          setError('This task is not publicly available');
          setTask(null);
        } else {
          setTask(response.data);
        }
      } else {
        setError(response.error || 'Task not found');
        setTask(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load task');
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !task) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/tasks')}
        >
          Back to Tasks
        </Button>
      </Container>
    );
  }

  if (!task) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Task not found
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/tasks')}
        >
          Back to Tasks
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/tasks')}
        sx={{ mb: 3 }}
      >
        Back to Tasks
      </Button>

      {/* Task Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
            <Typography variant="h4" component="h1" gutterBottom>
              {task.title}
            </Typography>
            <Chip
              label={STATUS_LABELS[task.status] || 'Unknown'}
              size="medium"
              color={task.status === 6 ? 'success' : 'default'}
            />
          </Box>

          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
            <Chip
              label={task.category}
              size="small"
              variant="outlined"
            />
            <Chip
              label={TYPE_LABELS[task.type] || task.type}
              size="small"
              color={TYPE_COLORS[task.type] || 'default'}
            />
            <Chip
              label={task.importance}
              size="small"
              color={IMPORTANCE_COLORS[task.importance] || 'default'}
            />
          </Stack>

          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" color="text.secondary">
            <Box display="flex" alignItems="center" gap={0.5}>
              <CalendarIcon fontSize="small" />
              <Typography variant="body2">
                Created: {formatDate(task.date_created)}
              </Typography>
            </Box>
            {task.date_completed && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <CalendarIcon fontSize="small" />
                <Typography variant="body2" color="success.main">
                  Completed: {formatDate(task.date_completed)}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Task Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Details
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {task.details}
          </Typography>
        </CardContent>
      </Card>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tags
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {task.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  icon={<LabelIcon />}
                  variant="outlined"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {task.attachments && task.attachments.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Attachments
            </Typography>
            <Stack spacing={1}>
              {task.attachments.map((attachment, index) => (
                <Link
                  key={index}
                  href={attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  <AttachFileIcon fontSize="small" />
                  <Typography variant="body2">
                    {attachment}
                  </Typography>
                </Link>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Assignment Info */}
      {(task.assignedTo || task.assignedBy) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Assignment
            </Typography>
            <Stack spacing={1}>
              {task.assignedTo && (
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>Assigned To:</strong> {task.assignedTo}
                  </Typography>
                </Box>
              )}
              {task.assignedBy && (
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>Assigned By:</strong> {task.assignedBy}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Revisions */}
      {task.revisions && task.revisions.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Revisions ({task.revisions.length})
            </Typography>
            <Box>
              {task.revisions.map((revision) => (
                <Accordion key={revision.rev_index} defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Chip
                        label={getRevisionLabel(revision)}
                        size="small"
                        color={revision.rev_number !== null ? 'primary' : 'default'}
                        sx={{ minWidth: '60px' }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {revision.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {revision.markdown.split('\n').length} lines
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        bgcolor: 'grey.50',
                        p: 2,
                        borderRadius: 1,
                        maxHeight: '400px',
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        m: 0
                      }}
                    >
                      {revision.markdown}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {task.notes && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {task.notes}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default PublicTaskDetailPage;

