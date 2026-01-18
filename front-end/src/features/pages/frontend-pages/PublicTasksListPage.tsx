/**
 * PublicTasksListPage.tsx
 * Public-facing page listing all tasks with visibility='public'
 * Accessible without authentication
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Pagination
} from '@mui/material';
import {
  Task as TaskIcon,
  CalendarToday as CalendarIcon,
  Label as LabelIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { omaiAPI } from '@/api/omai.api';

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

const PublicTasksListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    type: ''
  });

  useEffect(() => {
    fetchTasks();
  }, [page, filters]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await omaiAPI.getPublicTasks({
        page,
        limit: 12,
        category: filters.category || undefined,
        status: filters.status ? parseInt(filters.status) : undefined,
        type: filters.type || undefined
      });

      if (response.success) {
        setTasks(response.data.tasks || []);
        setTotalPages(Math.ceil((response.data.total || 0) / 12));
      } else {
        setError(response.error || 'Failed to load tasks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTaskClick = (taskId: number) => {
    navigate(`/tasks/${taskId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h3" gutterBottom fontWeight="bold">
          Public Tasks
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View our publicly available tasks and track progress
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, category: e.target.value }));
                    setPage(1);
                  }}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  <MenuItem value="Ingestion & Digitization">Ingestion & Digitization</MenuItem>
                  <MenuItem value="Data Structuring & Accuracy">Data Structuring & Accuracy</MenuItem>
                  <MenuItem value="Workflow & User Experience">Workflow & User Experience</MenuItem>
                  <MenuItem value="Platform & Infrastructure">Platform & Infrastructure</MenuItem>
                  <MenuItem value="Analytics & Intelligence">Analytics & Intelligence</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, type: e.target.value }));
                    setPage(1);
                  }}
                  label="Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, status: e.target.value }));
                    setPage(1);
                  }}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Tasks Grid */}
      {!loading && !error && (
        <>
          {tasks.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" align="center" py={4}>
                  No public tasks available at this time.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {tasks.map((task) => (
                <Grid item xs={12} md={6} key={task.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Typography variant="h6" component="h2" gutterBottom>
                          {task.title}
                        </Typography>
                        <Chip
                          label={STATUS_LABELS[task.status] || 'Unknown'}
                          size="small"
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

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {task.details}
                      </Typography>

                      {task.tags && task.tags.length > 0 && (
                        <Box mb={2}>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                            {task.tags.slice(0, 3).map((tag, index) => (
                              <Chip
                                key={index}
                                label={tag}
                                size="small"
                                icon={<LabelIcon />}
                                variant="outlined"
                              />
                            ))}
                            {task.tags.length > 3 && (
                              <Chip
                                label={`+${task.tags.length - 3}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>
                      )}

                      <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                        <CalendarIcon fontSize="small" />
                        <Typography variant="caption">
                          Created: {formatDate(task.date_created)}
                        </Typography>
                        {task.date_completed && (
                          <>
                            <Typography variant="caption"> • </Typography>
                            <Typography variant="caption" color="success.main">
                              Completed: {formatDate(task.date_completed)}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => handleTaskClick(task.id)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default PublicTasksListPage;

