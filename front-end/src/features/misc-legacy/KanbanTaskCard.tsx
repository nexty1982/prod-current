import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Dialog,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Flag as FlagIcon,
  Comment as CommentIcon,
  Attachment as AttachmentIcon,
} from '@mui/icons-material';
import { Draggable } from '@hello-pangea/dnd';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import KanbanTaskModal from './KanbanTaskModal';

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
}

interface Label {
  id: number;
  name: string;
  color: string;
}

interface KanbanTaskCardProps {
  task: Task;
  index: number;
  onRefresh: () => void;
  boardLabels: Label[];
}

const priorityColors = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  urgent: '#dc3545'
};

const priorityIcons = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  urgent: '🔴'
};

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ 
  task, 
  index, 
  onRefresh,
  boardLabels 
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTaskClick = () => {
    setTaskModalOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const response = await fetch(`/api/kanban/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
    
    handleMenuClose();
  };

  const getDueDateColor = () => {
    if (!task.due_date) return 'default';
    
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const weekFromNow = addDays(today, 7);
    
    if (isBefore(dueDate, today)) return 'error';
    if (isBefore(dueDate, weekFromNow)) return 'warning';
    return 'default';
  };

  const getDueDateText = () => {
    if (!task.due_date) return null;
    
    const dueDate = new Date(task.due_date);
    const today = new Date();
    
    if (isBefore(dueDate, today)) {
      return `Overdue: ${format(dueDate, 'MMM d')}`;
    }
    
    return format(dueDate, 'MMM d');
  };

  return (
    <>
      <Draggable draggableId={task.id.toString()} index={index}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            sx={{
              cursor: 'pointer',
              transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
              boxShadow: snapshot.isDragging ? 8 : 1,
              backgroundColor: task.task_color || 'background.paper',
              border: task.task_color ? `2px solid ${task.task_color}` : 'none',
              '&:hover': {
                boxShadow: 3
              }
            }}
            onClick={handleTaskClick}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              {/* Task Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ 
                    wordBreak: 'break-word',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {task.title}
                  </Typography>
                </Box>
                
                <IconButton 
                  size="small" 
                  onClick={handleMenuClick}
                  sx={{ ml: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Task Description */}
              {task.description && (
                <Typography variant="body2" color="text.secondary" sx={{ 
                  mb: 1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {task.description}
                </Typography>
              )}

              {/* Priority Flag */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  size="small"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{priorityIcons[task.priority]}</span>
                      <span style={{ textTransform: 'capitalize' }}>{task.priority}</span>
                    </Box>
                  }
                  sx={{
                    backgroundColor: priorityColors[task.priority],
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }}
                />
                
                {task.estimated_hours && (
                  <Chip
                    size="small"
                    icon={<ScheduleIcon sx={{ fontSize: '0.8rem' }} />}
                    label={`${task.estimated_hours}h`}
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
              </Box>

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {task.labels.slice(0, 3).map((label) => (
                      <Chip
                        key={label.id}
                        size="small"
                        label={label.name}
                        sx={{
                          backgroundColor: label.color,
                          color: 'white',
                          fontSize: '0.6rem',
                          height: 20
                        }}
                      />
                    ))}
                    {task.labels.length > 3 && (
                      <Chip
                        size="small"
                        label={`+${task.labels.length - 3}`}
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 20 }}
                      />
                    )}
                  </Stack>
                </Box>
              )}

              {/* Due Date */}
              {task.due_date && (
                <Box sx={{ mb: 1 }}>
                  <Chip
                    size="small"
                    icon={<ScheduleIcon sx={{ fontSize: '0.8rem' }} />}
                    label={getDueDateText()}
                    color={getDueDateColor() as any}
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Box>
              )}

              {/* Assignee */}
              {task.assigned_to_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                    alt={task.assigned_to_name}
                  >
                    {task.assigned_to_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {task.assigned_to_name}
                  </Typography>
                </Box>
              )}

              {/* Task Stats (Comments, Attachments) */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* These would show actual counts from the task data */}
                  <Tooltip title="Comments">
                    <Chip
                      size="small"
                      icon={<CommentIcon sx={{ fontSize: '0.7rem' }} />}
                      label="0"
                      variant="outlined"
                      sx={{ fontSize: '0.6rem', height: 18 }}
                    />
                  </Tooltip>
                  <Tooltip title="Attachments">
                    <Chip
                      size="small"
                      icon={<AttachmentIcon sx={{ fontSize: '0.7rem' }} />}
                      label="0"
                      variant="outlined"
                      sx={{ fontSize: '0.6rem', height: 18 }}
                    />
                  </Tooltip>
                </Box>
                
                <Typography variant="caption" color="text.secondary">
                  #{task.id}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Draggable>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => { setTaskModalOpen(true); handleMenuClose(); }}>
          Edit Task
        </MenuItem>
        <MenuItem onClick={handleDeleteTask} sx={{ color: 'error.main' }}>
          Delete Task
        </MenuItem>
      </Menu>

      {/* Task Detail Modal */}
      <KanbanTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={task}
        onRefresh={onRefresh}
        boardLabels={boardLabels}
      />
    </>
  );
};

export default KanbanTaskCard;
