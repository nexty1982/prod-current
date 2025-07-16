import React from 'react';
import {
  Box,
  Typography,
  Stack,
} from '@mui/material';
import { Droppable } from 'react-beautiful-dnd';
import KanbanColumn from './KanbanColumn';

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

interface Board {
  id: number;
  name: string;
  description: string;
  board_color: string;
  columns: Column[];
  tasks: Task[];
  members: any[];
  labels: any[];
}

interface KanbanBoardProps {
  board: Board;
  onAddTask: (columnId: number) => void;
  onRefresh: () => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ board, onAddTask, onRefresh }) => {
  // Group tasks by column
  const tasksByColumn = (board.tasks || []).reduce((acc, task) => {
    if (!acc[task.column_id]) {
      acc[task.column_id] = [];
    }
    acc[task.column_id].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

  // Sort tasks by position within each column
  Object.keys(tasksByColumn).forEach(columnId => {
    tasksByColumn[parseInt(columnId)].sort((a, b) => a.position - b.position);
  });

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 3, 
      overflowX: 'auto',
      pb: 2,
      minHeight: '60vh'
    }}>
      {(board.columns || [])
        .sort((a, b) => a.position - b.position)
        .map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            onAddTask={() => onAddTask(column.id)}
            onRefresh={onRefresh}
            boardLabels={board.labels || []}
          />
        ))}
    </Box>
  );
};

export default KanbanBoard;
