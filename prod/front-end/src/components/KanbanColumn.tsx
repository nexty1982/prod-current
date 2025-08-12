import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Stack,
  Badge,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Droppable } from '@hello-pangea/dnd';
import KanbanTaskCard from './KanbanTaskCard';

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
  labels: any[];
}

interface Label {
  id: number;
  name: string;
  color: string;
}

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask: () => void;
  onRefresh: () => void;
  boardLabels: Label[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  column, 
  tasks, 
  onAddTask, 
  onRefresh,
  boardLabels 
}) => {
  const isOverLimit = column.wip_limit && tasks.length > column.wip_limit;

  return (
    <Paper
      elevation={2}
      sx={{
        minWidth: 300,
        maxWidth: 350,
        height: 'fit-content',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${column.color}`,
        ...(isOverLimit && {
          borderTop: `4px solid #dc3545`,
          backgroundColor: '#fff5f5'
        })
      }}
    >
      {/* Column Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" fontWeight="bold" sx={{ color: column.color }}>
            {column.name}
          </Typography>
          <Badge 
            badgeContent={tasks.length} 
            color={isOverLimit ? 'error' : 'primary'}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }
            }}
          >
            <Box sx={{ width: 20, height: 20 }} />
          </Badge>
        </Stack>
        
        {column.wip_limit && (
          <Chip
            size="small"
            label={`Limit: ${column.wip_limit}`}
            color={isOverLimit ? 'error' : 'default'}
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        )}
        
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onAddTask}
          sx={{ 
            mt: 1,
            borderColor: column.color,
            color: column.color,
            '&:hover': {
              borderColor: column.color,
              backgroundColor: `${column.color}15`
            }
          }}
        >
          Add Task
        </Button>
      </Box>

      {/* Tasks Container */}
      <Droppable droppableId={column.id.toString()}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              flex: 1,
              p: 1,
              overflowY: 'auto',
              backgroundColor: snapshot.isDraggingOver ? `${column.color}10` : 'transparent',
              minHeight: 200,
              transition: 'background-color 0.2s ease'
            }}
          >
            <Stack spacing={1}>
              {tasks.map((task, index) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onRefresh={onRefresh}
                  boardLabels={boardLabels}
                />
              ))}
              {provided.placeholder}
              
              {tasks.length === 0 && (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    color: 'text.secondary',
                    fontStyle: 'italic'
                  }}
                >
                  No tasks yet
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </Droppable>
    </Paper>
  );
};

export default KanbanColumn;
