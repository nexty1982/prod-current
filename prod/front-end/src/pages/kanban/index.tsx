import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Fab,
  IconButton,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ViewKanban as KanbanIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { DragDropContext } from '@hello-pangea/dnd';
import KanbanBoard from '../../components/KanbanBoard';

// Types
interface Board {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  board_color: string;
  user_role: string;
  task_count: number;
  created_by_name: string;
}

interface Column {
  id: number;
  name: string;
  position: number;
  color: string;
  wip_limit?: number;
}

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
  labels: Label[];
}

interface Label {
  id: number;
  name: string;
  color: string;
}

interface BoardDetails extends Board {
  columns: Column[];
  tasks: Task[];
  members: any[];
  labels: Label[];
}

const priorityColors = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  urgent: '#dc3545'
};

const KanbanPage: React.FC = () => {
  // State
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<BoardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  
  // Form states
  const [newBoardForm, setNewBoardForm] = useState({
    name: '',
    description: '',
    board_color: '#1976d2'
  });

  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: '',
    assigned_to: null as number | null,
    estimated_hours: null as number | null
  });

  // Filters
  const [filters, setFilters] = useState({
    priority: '',
    assigned_to: '',
    overdue: false,
    due_this_week: false
  });

  // API functions
  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kanban/boards', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch boards');
      }
      
      const data = await response.json();
      setBoards(data.boards || []);
      
      // Auto-select first board if none selected
      if (data.boards.length > 0 && !selectedBoard) {
        await fetchBoardDetails(data.boards[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boards');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoardDetails = async (boardId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/kanban/boards/${boardId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch board details');
      }
      
      const data = await response.json();
      setSelectedBoard(data.board);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch board details');
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    try {
      const response = await fetch('/api/kanban/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newBoardForm)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create board');
      }
      
      setCreateBoardOpen(false);
      setNewBoardForm({ name: '', description: '', board_color: '#1976d2' });
      await fetchBoards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    }
  };

  const createTask = async () => {
    if (!selectedBoard || !selectedColumn) return;
    
    try {
      const response = await fetch('/api/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newTaskForm,
          board_id: selectedBoard.id,
          column_id: selectedColumn
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      
      setCreateTaskOpen(false);
      setNewTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assigned_to: null,
        estimated_hours: null
      });
      setSelectedColumn(null);
      await fetchBoardDetails(selectedBoard.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const exportBoardToMarkdown = async () => {
    if (!selectedBoard) return;
    
    try {
      const response = await fetch(`/api/kanban/boards/${selectedBoard.id}/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export board');
      }
      
      // Get the markdown content
      const markdownContent = await response.text();
      
      // Create a blob and download link
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Generate filename
      const safeFileName = selectedBoard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `kanban_${safeFileName}_${new Date().toISOString().split('T')[0]}.md`;
      
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export board');
    }
  };

  const exportAllBoardsToMarkdown = async () => {
    try {
      const response = await fetch('/api/kanban/boards/export/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export all boards');
      }
      
      // Get the markdown content
      const markdownContent = await response.text();
      
      // Create a blob and download link
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Generate filename
      const fileName = `kanban_all_boards_${new Date().toISOString().split('T')[0]}.md`;
      
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export all boards');
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !selectedBoard) return;

    const { draggableId, source, destination } = result;
    const taskId = parseInt(draggableId);
    const sourceColumnId = parseInt(source.droppableId);
    const destColumnId = parseInt(destination.droppableId);

    // Optimistic update
    const updatedBoard = { ...selectedBoard };
    if (!updatedBoard.tasks) return;
    
    const task = updatedBoard.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Remove from source and add to destination
    task.column_id = destColumnId;
    task.position = destination.index;

    // Update other task positions
    updatedBoard.tasks.forEach(t => {
      if (t.column_id === sourceColumnId && t.position > source.index && t.id !== taskId) {
        t.position -= 1;
      }
      if (t.column_id === destColumnId && t.position >= destination.index && t.id !== taskId) {
        t.position += 1;
      }
    });

    setSelectedBoard(updatedBoard);

    // API call
    try {
      const response = await fetch(`/api/kanban/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          column_id: destColumnId,
          position: destination.index
        })
      });

      if (!response.ok) {
        // Revert on error
        await fetchBoardDetails(selectedBoard.id);
        throw new Error('Failed to move task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task');
    }
  };

  const getTaskCountByPriority = (priority: string) => {
    if (!selectedBoard || !selectedBoard.tasks) return 0;
    return selectedBoard.tasks.filter(task => 
      task.priority === priority && !task.completed_at
    ).length;
  };

  const getOverdueTaskCount = () => {
    if (!selectedBoard || !selectedBoard.tasks) return 0;
    const today = new Date();
    return selectedBoard.tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < today && 
      !task.completed_at
    ).length;
  };

  // Effects
  useEffect(() => {
    fetchBoards();
  }, []);

  if (loading && !selectedBoard) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KanbanIcon color="primary" />
            Kanban Board
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your projects, tasks, and team collaboration
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => selectedBoard && fetchBoardDetails(selectedBoard.id)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateBoardOpen(true)}
          >
            New Board
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportBoardToMarkdown}
            disabled={!selectedBoard}
          >
            Export to MD
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportAllBoardsToMarkdown}
            disabled={boards.length === 0}
          >
            Export All
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Board Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ minWidth: 'fit-content' }}>
              Select Board:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flex: 1 }}>
              {boards.map((board) => (
                <Chip
                  key={board.id}
                  label={board.name}
                  variant={selectedBoard?.id === board.id ? 'filled' : 'outlined'}
                  color={selectedBoard?.id === board.id ? 'primary' : 'default'}
                  onClick={() => fetchBoardDetails(board.id)}
                  sx={{
                    borderColor: board.board_color,
                    ...(selectedBoard?.id === board.id && {
                      backgroundColor: board.board_color,
                      color: 'white'
                    })
                  }}
                />
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Board Statistics */}
      {selectedBoard && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Tasks
                </Typography>
                <Typography variant="h4">
                  {selectedBoard.tasks.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  High Priority
                </Typography>
                <Typography variant="h4" color="error">
                  {getTaskCountByPriority('high') + getTaskCountByPriority('urgent')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Overdue
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {getOverdueTaskCount()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h4" color="success.main">
                  {selectedBoard.tasks.filter(t => t.completed_at).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Kanban Board */}
      {selectedBoard && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <KanbanBoard 
            board={selectedBoard}
            onAddTask={(columnId) => {
              setSelectedColumn(columnId);
              setCreateTaskOpen(true);
            }}
            onRefresh={() => fetchBoardDetails(selectedBoard.id)}
          />
        </DragDropContext>
      )}

      {/* Floating Action Button for Quick Task Creation */}
      {selectedBoard && (
        <Fab
          color="primary"
          aria-label="add task"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={() => setCreateTaskOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Create Board Dialog */}
      <Dialog open={createBoardOpen} onClose={() => setCreateBoardOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Board</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Board Name"
              value={newBoardForm.name}
              onChange={(e) => setNewBoardForm(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newBoardForm.description}
              onChange={(e) => setNewBoardForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Board Color"
              type="color"
              value={newBoardForm.board_color}
              onChange={(e) => setNewBoardForm(prev => ({ ...prev, board_color: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateBoardOpen(false)}>Cancel</Button>
          <Button onClick={createBoard} variant="contained" disabled={!newBoardForm.name.trim()}>
            Create Board
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Task Title"
              value={newTaskForm.title}
              onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newTaskForm.description}
              onChange={(e) => setNewTaskForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTaskForm.priority}
                onChange={(e) => setNewTaskForm(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Due Date"
              type="date"
              value={newTaskForm.due_date}
              onChange={(e) => setNewTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Estimated Hours"
              type="number"
              value={newTaskForm.estimated_hours || ''}
              onChange={(e) => setNewTaskForm(prev => ({ 
                ...prev, 
                estimated_hours: e.target.value ? parseFloat(e.target.value) : null 
              }))}
              fullWidth
              inputProps={{ min: 0, step: 0.5 }}
            />
            {selectedColumn && selectedBoard && (
              <Alert severity="info">
                Task will be added to: {selectedBoard.columns.find(c => c.id === selectedColumn)?.name}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTaskOpen(false)}>Cancel</Button>
          <Button onClick={createTask} variant="contained" disabled={!newTaskForm.title.trim()}>
            Create Task
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default KanbanPage;
