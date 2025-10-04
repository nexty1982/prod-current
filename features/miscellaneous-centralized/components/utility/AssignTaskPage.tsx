/**
 * AssignTaskPage.tsx
 * OMAI Task Assignment System - Public Form Page
 * Allows users to submit tasks to Nick via secure token links
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  Fade,
  Container,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Assignment as AssignmentIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { omaiAPI, Task, TokenValidationResponse } from '../api/omai.api';

// Types
interface FormTask extends Task {
  id: string;
}

const AssignTaskPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // State
  const [tokenData, setTokenData] = useState<TokenValidationResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tasks, setTasks] = useState<FormTask[]>([
    { id: '1', title: '', description: '', priority: 'medium' }
  ]);

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No token provided. Please use the link from your email.');
        setLoading(false);
        return;
      }

      try {
        const response = await omaiAPI.validateToken(token);
        if (response.success && response.data) {
          setTokenData(response.data);
          if (response.data.is_used) {
            setError('This task assignment link has already been used.');
          }
        } else {
          setError(response.error || 'Invalid or expired token.');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to validate token.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Add new task
  const addTask = () => {
    const newTask: FormTask = {
      id: Date.now().toString(),
      title: '',
      description: '',
      priority: 'medium'
    };
    setTasks([...tasks, newTask]);
  };

  // Remove task
  const removeTask = (id: string) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter(task => task.id !== id));
    }
  };

  // Update task
  const updateTask = (id: string, field: keyof Task, value: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  // Validate form
  const validateForm = (): boolean => {
    const validTasks = tasks.filter(task => 
      task.title.trim().length > 0 && omaiAPI.validateTask(task)
    );
    return validTasks.length > 0;
  };

  // Submit tasks
  const handleSubmit = async () => {
    if (!token || !validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Filter out empty tasks
      const validTasks = tasks
        .filter(task => task.title.trim().length > 0)
        .map(({ id, ...task }) => task); // Remove the id field

      if (validTasks.length === 0) {
        setError('Please add at least one task with a title.');
        setSubmitting(false);
        return;
      }

      const response = await omaiAPI.submitTasks(token, validTasks);
      
      if (response.success) {
        setSuccess(true);
        setTasks([{ id: '1', title: '', description: '', priority: 'medium' }]);
      } else {
        setError('Failed to submit tasks. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit tasks.');
    } finally {
      setSubmitting(false);
    }
  };

  // Priority options
  const priorityOptions = [
    { value: '🔥', label: '🔥 High Priority', color: '#ff4444' },
    { value: '⚠️', label: '⚠️ Medium Priority', color: '#ff9944' },
    { value: '🧊', label: '🧊 Low Priority', color: '#44ff44' }
  ];

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Box textAlign="center">
            <CircularProgress size={60} sx={{ color: '#8c249d' }} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Validating your task assignment link...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error && !tokenData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Invalid Task Link
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{ bgcolor: '#8c249d' }}
          >
            Return to Home
          </Button>
        </Card>
      </Container>
    );
  }

  // Success state
  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Fade in={success}>
          <Card sx={{ textAlign: 'center', p: 4, bgcolor: '#f0f9ff' }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              Tasks Submitted Successfully!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Your tasks have been sent to Nick at next1452@gmail.com.
              He will review them and get back to you soon.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                sx={{ mr: 2, bgcolor: '#8c249d' }}
                onClick={() => setSuccess(false)}
              >
                Submit More Tasks
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
              >
                Done
              </Button>
            </Box>
          </Card>
        </Fade>
      </Container>
    );
  }

  // Main form
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#8c249d', color: 'white', textAlign: 'center' }}>
        <AssignmentIcon sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h3" gutterBottom>
          Assign Tasks to Nick
        </Typography>
        <Typography variant="h6">
          OMAI Task Assignment System
        </Typography>
      </Paper>

      {/* Token Info */}
      {tokenData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <EmailIcon color="primary" />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Assigned to: {tokenData.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <ScheduleIcon sx={{ fontSize: 16, mr: 1 }} />
                  Created: {new Date(tokenData.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && !success && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Task Form */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <AssignmentIcon sx={{ mr: 1 }} />
            Your Tasks
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add one or more tasks with clear titles and descriptions. 
            Select the appropriate priority level for each task.
          </Typography>

          {tasks.map((task, index) => (
            <Card key={task.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  Task #{index + 1}
                  <Chip 
                    label={omaiAPI.getPriorityLabel(task.priority)} 
                    size="small" 
                    sx={{ 
                      ml: 2,
                      bgcolor: omaiAPI.getPriorityColor(task.priority),
                      color: 'white'
                    }} 
                  />
                </Typography>
                {tasks.length > 1 && (
                  <IconButton 
                    onClick={() => removeTask(task.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>

              <Box display="flex" gap={2} mb={2}>
                <TextField
                  fullWidth
                  label="Task Title"
                  value={task.title}
                  onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                  placeholder="e.g., Fix login bug, Add new feature, Review documentation"
                  required
                  inputProps={{ maxLength: 200 }}
                  error={task.title.length > 200}
                  helperText={`${task.title.length}/200 characters`}
                />
                
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={task.priority}
                    label="Priority"
                    onChange={(e) => updateTask(task.id, 'priority', e.target.value)}
                  >
                    {priorityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description (Optional)"
                value={task.description}
                onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                placeholder="Provide additional details, context, or requirements for this task..."
                inputProps={{ maxLength: 1000 }}
                error={task.description.length > 1000}
                helperText={`${task.description.length}/1000 characters`}
              />
            </Card>
          ))}

          <Box display="flex" gap={2} mt={3}>
            <Button
              variant="outlined"
              onClick={addTask}
              startIcon={<AddIcon />}
              disabled={submitting}
            >
              Add Another Task
            </Button>

            <Box flexGrow={1} />

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!validateForm() || submitting || (tokenData?.is_used)}
              startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
              sx={{ bgcolor: '#8c249d', minWidth: 140 }}
            >
              {submitting ? 'Submitting...' : 'Submit Tasks'}
            </Button>
          </Box>

          {/* Instructions */}
          <Divider sx={{ mt: 3, mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            <strong>📋 Instructions:</strong>
            <br />
            • Fill out clear, descriptive task titles
            • Add detailed descriptions when helpful
            • Set appropriate priorities (🔥 urgent, ⚠️ normal, 🧊 when time permits)
            • Tasks will be sent directly to Nick's email
            • You can add multiple tasks before submitting
          </Typography>
        </CardContent>
      </Card>

      {/* Footer */}
      <Box textAlign="center" mt={4}>
        <Typography variant="body2" color="text.secondary">
          © 2025 Orthodox Metrics AI System | 
          Powered by OMAI Task Assignment
        </Typography>
      </Box>
    </Container>
  );
};

export default AssignTaskPage; 