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
  const [markdownFile, setMarkdownFile] = useState<File | null>(null);
  const [uploadingMarkdown, setUploadingMarkdown] = useState(false);
  const [markdownContent, setMarkdownContent] = useState<string>('');

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
      loadMarkdownContent();
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

  const loadMarkdownContent = async () => {
    if (task.markdown_content) {
      setMarkdownContent(task.markdown_content);
    } else {
      try {
        const response = await fetch(`/api/kanban/tasks/${task.id}/markdown`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setMarkdownContent(data.content || '');
        }
      } catch (error) {
        console.error('Error loading markdown:', error);
      }
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

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const response = await fetch(`/api/kanban/tasks/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        loadComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleMarkdownUpload = async () => {
    if (!markdownFile) return;
    
    setUploadingMarkdown(true);
    try {
      const formData = new FormData();
      formData.append('markdown', markdownFile);
      
      const response = await fetch(`/api/kanban/tasks/${task.id}/markdown`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        setMarkdownFile(null);
        loadMarkdownContent();
        onRefresh();
      } else {
        setError('Failed to upload markdown file');
      }
    } catch (error) {
      console.error('Error uploading markdown:', error);
      setError('Failed to upload markdown file');
    } finally {
      setUploadingMarkdown(false);
    }
  };

  const handleRemoveMarkdown = async () => {
    try {
      const response = await fetch(`/api/kanban/tasks/${task.id}/markdown`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setMarkdownContent('');
        onRefresh();
      } else {
        setError('Failed to remove markdown file');
      }
    } catch (error) {
      console.error('Error removing markdown:', error);
      setError('Failed to remove markdown file');
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setError('');
    onClose();
  };

  const assignedUser = users.find(user => user.id === formData.assigned_to);

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
          <Box>
            {!isEditing ? (
              <IconButton onClick={() => setIsEditing(true)}>
                <EditIcon />
              </IconButton>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton onClick={handleSave} disabled={loading} color="primary">
                  <SaveIcon />
                </IconButton>
                <IconButton onClick={() => setIsEditing(false)}>
                  <CancelIcon />
                </IconButton>
              </Box>
            )}
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          {/* Task Title */}
          {isEditing ? (
            <TextField
              fullWidth
              label="Task Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              variant="outlined"
            />
          ) : (
            <Typography variant="h5" fontWeight="bold">
              {task?.title}
            </Typography>
          )}

          {/* Task Description */}
          {isEditing ? (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              variant="outlined"
            />
          ) : (
            task?.description && (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {task.description}
              </Typography>
            )
          )}

          <Grid container spacing={2}>
            {/* Priority */}
            <Grid item xs={12} sm={6} md={3}>
              {isEditing ? (
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">Priority</Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {task?.priority}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Due Date */}
            <Grid item xs={12} sm={6} md={3}>
              {isEditing ? (
                <DatePicker
                  label="Due Date"
                  value={formData.due_date}
                  onChange={(date) => setFormData({ ...formData, due_date: date })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">Due Date</Typography>
                  <Typography variant="body2">
                    {task?.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'Not set'}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Estimated Hours */}
            <Grid item xs={12} sm={6} md={3}>
              {isEditing ? (
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Hours"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                />
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">Estimated Hours</Typography>
                  <Typography variant="body2">
                    {task?.estimated_hours || 'Not set'}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Actual Hours */}
            <Grid item xs={12} sm={6} md={3}>
              {isEditing ? (
                <TextField
                  fullWidth
                  type="number"
                  label="Actual Hours"
                  value={formData.actual_hours}
                  onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                />
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">Actual Hours</Typography>
                  <Typography variant="body2">
                    {task?.actual_hours || 'Not set'}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Assignee */}
          {isEditing ? (
            <FormControl fullWidth>
              <InputLabel>Assigned To</InputLabel>
              <Select
                value={formData.assigned_to || ''}
                label="Assigned To"
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value as number })}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">Assigned to:</Typography>
              {task?.assigned_to_name ? (
                <>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                    {task.assigned_to_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2">{task.assigned_to_name}</Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Unassigned</Typography>
              )}
            </Box>
          )}

          {/* Labels */}
          {isEditing ? (
            <Autocomplete
              multiple
              options={boardLabels}
              getOptionLabel={(option) => option.name}
              value={selectedLabels}
              onChange={(event, newValue) => setSelectedLabels(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option.id}
                    label={option.name}
                    {...getTagProps({ index })}
                    sx={{ backgroundColor: option.color, color: 'white' }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Labels" placeholder="Add labels" />
              )}
            />
          ) : (
            task?.labels && task.labels.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Labels:</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {task.labels.map((label) => (
                      <Chip
                        key={label.id}
                        label={label.name}
                        size="small"
                        sx={{ backgroundColor: label.color, color: 'white' }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Box>
            )
          )}

          <Divider />

          {/* Comments Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Comments ({comments.length})
            </Typography>
            
            {/* Add Comment */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                variant="outlined"
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                sx={{ alignSelf: 'flex-start' }}
              >
                <AddIcon />
              </Button>
            </Box>

            {/* Comments List */}
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {comments.map((comment) => (
                <ListItem
                  key={comment.id}
                  alignItems="flex-start"
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {comment.user_name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{comment.user_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                        {comment.comment}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Task Metadata */}
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Created by {task?.created_by_name} on {task?.created_at ? format(new Date(task.created_at), 'MMM dd, yyyy HH:mm') : 'Unknown'}
            </Typography>
            {task?.updated_at && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Last updated on {format(new Date(task.updated_at), 'MMM dd, yyyy HH:mm')}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default KanbanTaskModal;
