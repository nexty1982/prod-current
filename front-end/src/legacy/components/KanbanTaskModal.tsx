import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  Avatar,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Autocomplete,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Flag as FlagIcon,
  Comment as CommentIcon,
  Attachment as AttachmentIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import MarkdownUpload from './MarkdownUpload.tsx';

interface Task {
  id: number;
  column_id: number;
  title: string;
  description: string;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assigned_to?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  task_color?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  created_by_name: string;
  labels: any[];
  markdown_content?: string;
  markdown_filename?: string;
}

interface Label {
  id: number;
  name: string;
  color: string;
}

interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user_name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface KanbanTaskModalProps {
  open: boolean;
  onClose: () => void;
  task: Task;
  onRefresh: () => void;
  boardLabels: Label[];
}

const priorityColors = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  urgent: '#dc3545'
};

const KanbanTaskModal: React.FC<KanbanTaskModalProps> = ({
  open,
  onClose,
  task,
  onRefresh,
  boardLabels
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: null as Date | null,
    assigned_to: null as number | null,
    estimated_hours: '',
    actual_hours: '',
    task_color: ''
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        due_date: task.due_date ? new Date(task.due_date) : null,
        assigned_to: task.assigned_to || null,
        estimated_hours: task.estimated_hours?.toString() || '',
        actual_hours: task.actual_hours?.toString() || '',
        task_color: task.task_color || ''
      });
      setSelectedLabels(task.labels || []);
      loadComments();
      loadUsers();
    }
  }, [open, task]);

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/kanban/tasks/${task.id}/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        assigned_to: formData.assigned_to,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        actual_hours: formData.actual_hours ? parseFloat(formData.actual_hours) : null,
        task_color: formData.task_color,
        labels: selectedLabels.map(label => label.id)
      };
      
      const response = await fetch(`/api/kanban/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const response = await fetch(`/api/kanban/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ comment: newComment })
      });
      
      if (response.ok) {
        setNewComment('');
        loadComments();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setError('');
    onClose();
  };

  const handleMarkdownUploadSuccess = () => {
    onRefresh();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Task #{task?.id}</Typography>
            <Chip
              size="small"
              label={task?.priority}
              sx={{
                backgroundColor: priorityColors[task?.priority || 'medium'],
                color: 'white',
                textTransform: 'capitalize'
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isEditing ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton onClick={handleSave} disabled={loading} color="primary">
                  <SaveIcon />
                </IconButton>
                <IconButton onClick={() => setIsEditing(false)} disabled={loading}>
                  <CancelIcon />
                </IconButton>
              </Box>
            ) : (
              <IconButton onClick={() => setIsEditing(true)}>
                <EditIcon />
              </IconButton>
            )}
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          {/* Title */}
          {isEditing ? (
            <TextField
              label="Task Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              variant="outlined"
            />
          ) : (
            <Typography variant="h5" fontWeight="bold">
              {task.title}
            </Typography>
          )}

          {/* Description */}
          {isEditing ? (
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              variant="outlined"
              multiline
              rows={4}
            />
          ) : (
            <Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {task.description || 'No description'}
              </Typography>
            </Box>
          )}

          {/* Task Details Grid */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={isEditing ? formData.priority : task.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  disabled={!isEditing}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Assignee</InputLabel>
                <Select
                  value={isEditing ? formData.assigned_to || '' : task.assigned_to || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value as number })}
                  disabled={!isEditing}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Due Date and Hours */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <DatePicker
                label="Due Date"
                value={isEditing ? formData.due_date : (task.due_date ? new Date(task.due_date) : null)}
                onChange={(date) => setFormData({ ...formData, due_date: date })}
                disabled={!isEditing}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined'
                  }
                }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Estimated Hours"
                value={isEditing ? formData.estimated_hours : task.estimated_hours || ''}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                disabled={!isEditing}
                type="number"
                fullWidth
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Actual Hours"
                value={isEditing ? formData.actual_hours : task.actual_hours || ''}
                onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                disabled={!isEditing}
                type="number"
                fullWidth
              />
            </Grid>
          </Grid>

          {/* Labels */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Labels</Typography>
            {isEditing ? (
              <Autocomplete
                multiple
                options={boardLabels}
                getOptionLabel={(option) => option.name}
                value={selectedLabels}
                onChange={(_, newValue) => setSelectedLabels(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Labels" variant="outlined" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={option.id}
                      label={option.name}
                      sx={{ backgroundColor: option.color, color: 'white' }}
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            ) : (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {task.labels && task.labels.length > 0 ? (
                  task.labels.map((label: any) => (
                    <Chip
                      key={label.id}
                      label={label.name}
                      sx={{ backgroundColor: label.color, color: 'white' }}
                      size="small"
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No labels assigned</Typography>
                )}
              </Box>
            )}
          </Box>

          <Divider />

          {/* Markdown Upload Component */}
          <MarkdownUpload
            taskId={task.id}
            markdownContent={task.markdown_content}
            markdownFilename={task.markdown_filename}
            onUploadSuccess={handleMarkdownUploadSuccess}
          />

          <Divider />

          {/* Comments Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CommentIcon />
              Comments ({comments.length})
            </Typography>
            
            <List sx={{ maxHeight: 200, overflow: 'auto' }}>
              {comments.map((comment) => (
                <ListItem key={comment.id} alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>{comment.user_name.charAt(0).toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">{comment.user_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                    secondary={comment.comment}
                  />
                </ListItem>
              ))}
            </List>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                multiline
                rows={2}
                fullWidth
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                sx={{ height: 'fit-content' }}
              >
                <AddIcon />
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </LocalizationProvider>
  );
};

export default KanbanTaskModal;
