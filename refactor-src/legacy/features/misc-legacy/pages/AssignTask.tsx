/**
 * AssignTask.tsx
 * Public task assignment page for OMAI Task Assignment system
 * Accessible via /assign-task?token={token}
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextareaAutosize,
  Stack,
  Container,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Task as TaskIcon,
  PriorityHigh as PriorityHighIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { OM_COLORS } from '@/theme/omTheme';

interface Task {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  category: 'general' | 'bug' | 'feature' | 'ui' | 'ux';
  comments?: string;
}

const AssignTask: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  
  const [tasks, setTasks] = useState<Task[]>([
    {
      title: '',
      description: '',
      priority: 'medium',
      deadline: '',
      category: 'general',
      comments: ''
    }
  ]);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    organization: ''
  });

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/omai/validate-token?t=${token}`);
      const data = await response.json();
      
      if (data.success) {
        setTokenValid(true);
        setTokenInfo(data.data);
      } else {
        setTokenValid(false);
        setError(data.error || 'Invalid or expired token');
      }
    } catch (err) {
      setTokenValid(false);
      setError('Failed to validate token');
    } finally {
      setLoading(false);
    }
  };

  const addTask = () => {
    setTasks([...tasks, {
      title: '',
      description: '',
      priority: 'medium',
      deadline: '',
      category: 'general',
      comments: ''
    }]);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const updateTask = (index: number, field: keyof Task, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !tokenValid) {
      setError('Invalid token');
      return;
    }

    // Validate form
    if (!formData.email || !formData.name) {
      setError('Please fill in all required fields');
      return;
    }

    const validTasks = tasks.filter(task => task.title.trim());
    if (validTasks.length === 0) {
      setError('Please add at least one task');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/omai/submit-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          submitter: {
            email: formData.email,
            name: formData.name,
            organization: formData.organization
          },
          tasks: validTasks
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTasks([{ title: '', description: '', priority: 'medium', deadline: '', category: 'general', comments: '' }]);
        setFormData({ email: '', name: '', organization: '' });
      } else {
        setError(data.error || 'Failed to submit tasks');
      }
    } catch (err) {
      setError('Failed to submit tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          No task assignment token provided. Please use a valid task assignment link.
        </Alert>
      </Box>
    );
  }

  if (loading && tokenValid === null) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Validating task assignment token...
        </Typography>
      </Box>
    );
  }

  if (tokenValid === false) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          {error || 'Invalid or expired task assignment token'}
        </Alert>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Please contact the task administrator for a new link.
        </Typography>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="success" icon={<CheckCircleIcon />}>
          Tasks submitted successfully!
        </Alert>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Thank you for submitting your tasks. They have been sent to the task administrator.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You will receive a confirmation email shortly.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f5f5f5'
    }}>
             {/* Brand Bar */}
       <Box sx={{ width: '100%', bgcolor: '#5B2EBF', py: { xs: 2, md: 3 } }}>
         <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center' }}>
           <Box component="img" 
                src="/brand/for-assign.png" 
                alt="Orthodox Metrics LLC"
                sx={{ height: { xs: 48, md: 64 }, width: 'auto', display: 'block' }} />
         </Container>
       </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
                 {/* Header */}
         <Card sx={{ p: { xs: 3, md: 5 }, mb: 4, textAlign: 'center', bgcolor: 'white' }}>
           <Typography variant="h3" component="h1" gutterBottom color="primary" fontWeight="bold" sx={{ mb: 2 }}>
             Task Assignment
           </Typography>
           <Typography variant="h6" color="text.secondary" sx={{ mb: 3, fontWeight: 400 }}>
             Submit tasks for the OrthodoxMetrics AI System
           </Typography>
           {tokenInfo && (
             <Box sx={{ mt: 3 }}>
               <Chip 
                 label={`Token: ${token.substring(0, 8)}...`} 
                 variant="outlined" 
                 size="medium"
                 sx={{ 
                   bgcolor: OM_COLORS.lavender,
                   borderColor: OM_COLORS.purple,
                   color: OM_COLORS.purple,
                   fontWeight: 500
                 }}
               />
               {tokenInfo.notes && (
                 <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                   {tokenInfo.notes}
                 </Typography>
               )}
             </Box>
           )}
         </Card>

                 {/* Task Submission Form */}
         <Card sx={{ p: { xs: 3, md: 5 }, bgcolor: 'white' }}>
           <form onSubmit={handleSubmit}>
             {/* Submitter Information */}
             <Typography variant="h5" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: 'text.primary' }}>
               Your Information
             </Typography>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Organization (Optional)"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

                         {/* Tasks Section */}
             <Box sx={{ mb: 4 }}>
               <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                 <Typography variant="h5" fontWeight="bold" color="text.primary">
                   Tasks
                 </Typography>
                                 <Button
                   startIcon={<AddIcon />}
                   onClick={addTask}
                   variant="contained"
                   color="primary"
                   size="medium"
                   sx={{ 
                     borderRadius: 3,
                     textTransform: 'none',
                     fontWeight: 600,
                     px: 3,
                     py: 1,
                     bgcolor: OM_COLORS.purple,
                     '&:hover': {
                       bgcolor: '#4a1f9a'
                     }
                   }}
                 >
                   + Add Task
                 </Button>
              </Box>

                             {tasks.map((task, index) => (
                 <Card key={index} variant="outlined" sx={{ p: 4, mb: 3, border: '2px solid #f0f0f0', borderRadius: 3 }}>
                   <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                     <Typography variant="h5" fontWeight="bold" color="primary">
                       Task {index + 1}
                     </Typography>
                    {tasks.length > 1 && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeTask(index)}
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Task Title *"
                        value={task.title}
                        onChange={(e) => updateTask(index, 'title', e.target.value)}
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        multiline
                        minRows={4}
                        value={task.description}
                        onChange={(e) => updateTask(index, 'description', e.target.value)}
                        placeholder="Describe what needs to be done..."
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <FormLabel sx={{ fontWeight: 600, mb: 1 }}>Priority</FormLabel>
                        <RadioGroup
                          row
                          value={task.priority}
                          onChange={(e) => updateTask(index, 'priority', e.target.value)}
                          sx={{
                            '& .MuiFormControlLabel-root': {
                              marginRight: 3
                            }
                          }}
                        >
                          <FormControlLabel 
                            value="low" 
                            control={<Radio />} 
                            label="Low" 
                            sx={{ fontWeight: 500 }}
                          />
                          <FormControlLabel 
                            value="medium" 
                            control={<Radio />} 
                            label="Medium" 
                            sx={{ fontWeight: 500 }}
                          />
                          <FormControlLabel 
                            value="high" 
                            control={<Radio />} 
                            label="High" 
                            sx={{ fontWeight: 500 }}
                          />
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Category</InputLabel>
                        <Select
                          value={task.category}
                          onChange={(e) => updateTask(index, 'category', e.target.value)}
                          label="Category"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2
                            }
                          }}
                        >
                          <MenuItem value="general">General</MenuItem>
                          <MenuItem value="bug">Bug</MenuItem>
                          <MenuItem value="feature">Feature</MenuItem>
                          <MenuItem value="ui">UI</MenuItem>
                          <MenuItem value="ux">UX</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Deadline (Optional)"
                        type="date"
                        value={task.deadline}
                        onChange={(e) => updateTask(index, 'deadline', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Additional Comments"
                        multiline
                        minRows={3}
                        value={task.comments}
                        onChange={(e) => updateTask(index, 'comments', e.target.value)}
                        placeholder="Any additional notes or context..."
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Box>

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

                         {/* Footer Buttons */}
             <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, mt: 5 }}>
               <Button
                 variant="outlined"
                 color="primary"
                 size="large"
                 disabled={loading}
                 sx={{ 
                   borderRadius: 3,
                   textTransform: 'none',
                   fontWeight: 600,
                   px: 5,
                   py: 2,
                   borderColor: OM_COLORS.purple,
                   color: OM_COLORS.purple,
                   '&:hover': {
                     borderColor: '#4a1f9a',
                     bgcolor: OM_COLORS.lavender
                   }
                 }}
               >
                 Save Draft
               </Button>
               <Button
                 type="submit"
                 variant="contained"
                 color="primary"
                 size="large"
                 startIcon={<SendIcon />}
                 disabled={loading}
                 sx={{ 
                   borderRadius: 3,
                   textTransform: 'none',
                   fontWeight: 600,
                   px: 5,
                   py: 2,
                   bgcolor: OM_COLORS.purple,
                   '&:hover': {
                     bgcolor: '#4a1f9a'
                   }
                 }}
               >
                 {loading ? 'Submitting...' : 'Submit Tasks'}
               </Button>
             </Box>
          </form>
        </Card>

                 {/* Footer */}
         <Card sx={{ p: 4, mt: 4, textAlign: 'center', bgcolor: 'white' }}>
           <Typography variant="body2" color="text.secondary">
             © 2024 OrthodoxMetrics AI System. All rights reserved.
           </Typography>
         </Card>
      </Container>
    </Box>
  );
};

export default AssignTask;
