import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
  Divider,
  Badge,
  Tabs,
  Tab,
  Fab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  Computer as ComputerIcon,
  SmartToy as AIIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Tag as TagIcon,
  Visibility as ViewIcon,
  Launch as LaunchIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarAPI } from '../../api/calendar.api.ts';

// Types
interface AITask {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: string;
  startDate?: string;
  tags: string[];
  linkedKanbanId?: string;
  agent: 'Ninja' | 'Claude' | 'Cursor' | 'OM-AI' | 'Junie' | 'GitHub Copilot';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  actualHours?: number;
  logs?: string[];
  metadata?: {
    markdownFile?: string;
    jsonFile?: string;
    chatSessionId?: string;
    consoleUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CalendarEvent extends AITask {
  start: Date;
  end: Date;
  allDay?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Calendar localizer
const locales = {
  'en-US': require('date-fns/locale/en-US')
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Agent color mapping
const agentColors = {
  'Ninja': '#FF6B6B',
  'Claude': '#4ECDC4',
  'Cursor': '#45B7D1',
  'OM-AI': '#96CEB4',
  'Junie': '#FFEAA7',
  'GitHub Copilot': '#DDA0DD'
};

// Status icons
const statusIcons = {
  pending: <ScheduleIcon />,
  in_progress: <SyncIcon />,
  completed: <CheckCircleIcon />,
  blocked: <ErrorIcon />
};

// Priority colors
const priorityColors = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
  critical: '#9C27B0'
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`calendar-tabpanel-${index}`}
      aria-labelledby={`calendar-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const OMCalendar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedTab, setSelectedTab] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['ai-tasks'],
    queryFn: calendarAPI.getTasks,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: calendarAPI.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tasks'] });
      setIsTaskDialogOpen(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: calendarAPI.updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tasks'] });
      setIsTaskDialogOpen(false);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: calendarAPI.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tasks'] });
      setSelectedEvent(null);
    },
  });

  // Convert tasks to calendar events
  const events: CalendarEvent[] = tasks.map((task: AITask) => ({
    ...task,
    start: new Date(task.dueDate),
    end: new Date(task.dueDate),
    allDay: true,
  }));

  // Handle date selection
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setSelectedDate(start);
    setIsEditMode(false);
    setSelectedEvent(null);
    setIsTaskDialogOpen(true);
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditMode(true);
    setIsTaskDialogOpen(true);
  }, []);

  // Handle event drop/resize
  const handleEventDrop = useCallback(({ event, start, end }: any) => {
    const updatedTask = {
      ...event,
      dueDate: format(start, 'yyyy-MM-dd'),
    };
    updateTaskMutation.mutate({ id: event.id, task: updatedTask });
  }, [updateTaskMutation]);

  // Task form state
  const [taskForm, setTaskForm] = useState<Partial<AITask>>({
    title: '',
    description: '',
    assignedTo: '',
    status: 'pending',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    tags: [],
    agent: 'Ninja',
    priority: 'medium',
    estimatedHours: 1,
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isTaskDialogOpen && selectedEvent) {
      setTaskForm(selectedEvent);
    } else if (isTaskDialogOpen && selectedDate) {
      setTaskForm({
        title: '',
        description: '',
        assignedTo: '',
        status: 'pending',
        dueDate: format(selectedDate, 'yyyy-MM-dd'),
        tags: [],
        agent: 'Ninja',
        priority: 'medium',
        estimatedHours: 1,
      });
    }
  }, [isTaskDialogOpen, selectedEvent, selectedDate]);

  // Handle form submission
  const handleSubmit = () => {
    if (isEditMode && selectedEvent) {
      updateTaskMutation.mutate({ id: selectedEvent.id, task: taskForm });
    } else {
      createTaskMutation.mutate(taskForm as AITask);
    }
  };

  // Handle tag input
  const handleTagInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && event.currentTarget.value.trim()) {
      event.preventDefault();
      const newTag = event.currentTarget.value.trim();
      setTaskForm(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag]
      }));
      event.currentTarget.value = '';
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTaskForm(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  // Event styling
  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = agentColors[event.agent] || '#ccc';
    const style = {
      backgroundColor,
      borderRadius: '4px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
      fontWeight: 'bold',
    };
    return { style };
  };

  // Custom event component
  const EventComponent = ({ event }: { event: CalendarEvent }) => (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
        {event.title}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
        {event.agent} • {event.status}
      </Typography>
    </Box>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load calendar tasks: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: isFullscreen ? '100vh' : 'auto', position: 'relative' }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <CalendarIcon color="primary" />
              <Typography variant="h5" component="h1">
                OrthodoxMetrics AI Task Calendar
              </Typography>
            </Box>

            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => refetch()}
                disabled={isLoading}
              >
                Refresh
              </Button>

              <IconButton
                onClick={() => setIsFullscreen(!isFullscreen)}
                color="primary"
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mt: 2 }}>
            <Tab label="Calendar View" />
            <Tab label="Task List" />
            <Tab label="AI Agents" />
            <Tab label="Kanban Sync" />
          </Tabs>
        </CardContent>
      </Card>

      {/* Tab Panels */}
      <TabPanel value={selectedTab} index={0}>
        <Paper sx={{ p: 2, height: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
            }}
            views={['month', 'week', 'day']}
            view={view}
            onView={(newView) => setView(newView)}
            selectable
            resizable
            popup
            tooltipAccessor={(event) => `${event.title} - ${event.agent} (${event.status})`}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={selectedTab} index={1}>
        <TaskListView tasks={tasks} onEditTask={handleSelectEvent} onDeleteTask={deleteTaskMutation.mutate} />
      </TabPanel>

      <TabPanel value={selectedTab} index={2}>
        <AIAgentsView tasks={tasks} />
      </TabPanel>

      <TabPanel value={selectedTab} index={3}>
        <KanbanSyncView tasks={tasks} />
      </TabPanel>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add task"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          setIsEditMode(false);
          setSelectedEvent(null);
          setSelectedDate(new Date());
          setIsTaskDialogOpen(true);
        }}
      >
        <AddIcon />
      </Fab>

      {/* Task Dialog */}
      <TaskDialog
        open={isTaskDialogOpen}
        onClose={() => setIsTaskDialogOpen(false)}
        task={taskForm}
        onTaskChange={setTaskForm}
        onSubmit={handleSubmit}
        onDelete={() => selectedEvent && deleteTaskMutation.mutate(selectedEvent.id)}
        isEditMode={isEditMode}
        isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
        onTagInput={handleTagInput}
        onRemoveTag={removeTag}
      />
    </Box>
  );
};

// Task List View Component
const TaskListView: React.FC<{
  tasks: AITask[];
  onEditTask: (task: CalendarEvent) => void;
  onDeleteTask: (id: string) => void;
}> = ({ tasks, onEditTask, onDeleteTask }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterAgent !== 'all' && task.agent !== filterAgent) return false;
    return true;
  });

  return (
    <Box>
      <Box display="flex" gap={2} mb={2}>
        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Agent</InputLabel>
          <Select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
            <MenuItem value="all">All Agents</MenuItem>
            <MenuItem value="Ninja">Ninja</MenuItem>
            <MenuItem value="Claude">Claude</MenuItem>
            <MenuItem value="Cursor">Cursor</MenuItem>
            <MenuItem value="OM-AI">OM-AI</MenuItem>
            <MenuItem value="Junie">Junie</MenuItem>
            <MenuItem value="GitHub Copilot">GitHub Copilot</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2}>
        {filteredTasks.map((task) => (
          <Grid item xs={12} md={6} lg={4} key={task.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="h6" component="h3" noWrap>
                    {task.title}
                  </Typography>
                  <Box display="flex" gap={0.5}>
                    <IconButton size="small" onClick={() => onEditTask({ ...task, start: new Date(task.dueDate), end: new Date(task.dueDate) })}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => onDeleteTask(task.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" mb={1}>
                  {task.description}
                </Typography>

                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Chip
                    label={task.agent}
                    size="small"
                    sx={{ backgroundColor: agentColors[task.agent], color: 'white' }}
                  />
                  <Chip
                    label={task.status}
                    size="small"
                    icon={statusIcons[task.status]}
                  />
                  <Chip
                    label={task.priority}
                    size="small"
                    sx={{ backgroundColor: priorityColors[task.priority], color: 'white' }}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// AI Agents View Component
const AIAgentsView: React.FC<{ tasks: AITask[] }> = ({ tasks }) => {
  const agents = ['Ninja', 'Claude', 'Cursor', 'OM-AI', 'Junie', 'GitHub Copilot'];

  const getAgentStats = (agent: string) => {
    const agentTasks = tasks.filter(task => task.agent === agent);
    return {
      total: agentTasks.length,
      pending: agentTasks.filter(t => t.status === 'pending').length,
      inProgress: agentTasks.filter(t => t.status === 'in_progress').length,
      completed: agentTasks.filter(t => t.status === 'completed').length,
      blocked: agentTasks.filter(t => t.status === 'blocked').length,
    };
  };

  return (
    <Grid container spacing={3}>
      {agents.map((agent) => {
        const stats = getAgentStats(agent);
        return (
          <Grid item xs={12} md={6} lg={4} key={agent}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <AIIcon sx={{ color: agentColors[agent] }} />
                  <Typography variant="h6">{agent}</Typography>
                </Box>

                <Grid container spacing={1}>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">{stats.total}</Typography>
                      <Typography variant="caption">Total</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
                      <Typography variant="caption">Pending</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">{stats.inProgress}</Typography>
                      <Typography variant="caption">Active</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">{stats.completed}</Typography>
                      <Typography variant="caption">Done</Typography>
                    </Box>
                  </Grid>
                </Grid>

                {stats.blocked > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {stats.blocked} task(s) blocked
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

// Kanban Sync View Component
const KanbanSyncView: React.FC<{ tasks: AITask[] }> = ({ tasks }) => {
  const syncedTasks = tasks.filter(task => task.linkedKanbanId);
  const unsyncedTasks = tasks.filter(task => !task.linkedKanbanId);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Kanban Integration Status
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Synced Tasks ({syncedTasks.length})
              </Typography>
              {syncedTasks.map((task) => (
                <Box key={task.id} display="flex" alignItems="center" gap={1} mb={1}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2">{task.title}</Typography>
                  <Chip label={task.linkedKanbanId} size="small" />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Unsynced Tasks ({unsyncedTasks.length})
              </Typography>
              {unsyncedTasks.map((task) => (
                <Box key={task.id} display="flex" alignItems="center" gap={1} mb={1}>
                  <WarningIcon color="warning" />
                  <Typography variant="body2">{task.title}</Typography>
                  <Button size="small" variant="outlined">
                    Link to Kanban
                  </Button>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Task Dialog Component
const TaskDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  task: Partial<AITask>;
  onTaskChange: (task: Partial<AITask>) => void;
  onSubmit: () => void;
  onDelete: () => void;
  isEditMode: boolean;
  isLoading: boolean;
  onTagInput: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveTag: (tag: string) => void;
}> = ({
  open,
  onClose,
  task,
  onTaskChange,
  onSubmit,
  onDelete,
  isEditMode,
  isLoading,
  onTagInput,
  onRemoveTag,
}) => {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditMode ? 'Edit AI Task' : 'Create New AI Task'}
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Task Title"
                value={task.title || ''}
                onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={task.description || ''}
                onChange={(e) => onTaskChange({ ...task, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Assigned To"
                value={task.assignedTo || ''}
                onChange={(e) => onTaskChange({ ...task, assignedTo: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={task.dueDate || ''}
                onChange={(e) => onTaskChange({ ...task, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>AI Agent</InputLabel>
                <Select
                  value={task.agent || 'Ninja'}
                  onChange={(e) => onTaskChange({ ...task, agent: e.target.value as AITask['agent'] })}
                >
                  <MenuItem value="Ninja">Ninja</MenuItem>
                  <MenuItem value="Claude">Claude</MenuItem>
                  <MenuItem value="Cursor">Cursor</MenuItem>
                  <MenuItem value="OM-AI">OM-AI</MenuItem>
                  <MenuItem value="Junie">Junie</MenuItem>
                  <MenuItem value="GitHub Copilot">GitHub Copilot</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={task.status || 'pending'}
                  onChange={(e) => onTaskChange({ ...task, status: e.target.value as AITask['status'] })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={task.priority || 'medium'}
                  onChange={(e) => onTaskChange({ ...task, priority: e.target.value as AITask['priority'] })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Estimated Hours"
                value={task.estimatedHours || ''}
                onChange={(e) => onTaskChange({ ...task, estimatedHours: Number(e.target.value) })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags (press Enter to add)"
                onKeyPress={onTagInput}
                placeholder="Add tags..."
              />
              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                {task.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => onRemoveTag(tag)}
                    size="small"
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Linked Kanban ID"
                value={task.linkedKanbanId || ''}
                onChange={(e) => onTaskChange({ ...task, linkedKanbanId: e.target.value })}
                placeholder="kanban-123"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          {isEditMode && (
            <Button onClick={onDelete} color="error">
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            disabled={isLoading || !task.title}
          >
            {isLoading ? <CircularProgress size={20} /> : (isEditMode ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

export default OMCalendar; 