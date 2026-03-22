/**
 * OMDailyKanban.tsx
 * Kanban board view for OM Daily items.
 * Drag-and-drop between status columns, with rich cards showing
 * priority, category, agent tool, branch type, and due dates.
 */

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  IconCalendar,
  IconDotsVertical,
  IconGripVertical,
} from '@tabler/icons-react';
import {
  alpha,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Flag as FlagIcon,
  SmartToy as AgentIcon,
} from '@mui/icons-material';
import React, { useState } from 'react';
import SimpleBar from 'simplebar-react';

// ─── Types ──────────────────────────────────────────────────────

interface DailyItem {
  id: number;
  title: string;
  description: string | null;
  horizon: string;
  status: string;
  priority: string;
  category: string | null;
  due_date: string | null;
  tags: any;
  progress: number;
  created_at: string;
  updated_at: string;
  source?: string;
  agent_tool?: string | null;
  branch_type?: string | null;
  github_branch?: string | null;
  change_set?: { code: string; title: string } | null;
}

interface OMDailyKanbanProps {
  items: DailyItem[];
  onStatusChange: (itemId: number, newStatus: string) => Promise<void>;
  onEditItem: (item: DailyItem) => void;
  onDeleteItem: (itemId: number) => void;
  onQuickDone: (itemId: number) => void;
}

// ─── Constants ──────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: '#9e9e9e' },
  { id: 'todo', label: 'To Do', color: '#2196f3' },
  { id: 'in_progress', label: 'In Progress', color: '#ff9800' },
  { id: 'review', label: 'Review', color: '#9c27b0' },
  { id: 'done', label: 'Done', color: '#4caf50' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: '#9e9e9e',
  medium: '#2196f3',
  high: '#ff9800',
  critical: '#f44336',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
  critical: 'Crit',
};

const AGENT_TOOL_COLORS: Record<string, string> = {
  windsurf: '#00b4d8',
  claude_cli: '#d4a574',
  cursor: '#7c3aed',
};

const AGENT_TOOL_LABELS: Record<string, string> = {
  windsurf: 'Windsurf',
  claude_cli: 'Claude',
  cursor: 'Cursor',
};

const BRANCH_TYPE_COLORS: Record<string, string> = {
  bugfix: '#d73a4a',
  new_feature: '#0e8a16',
  existing_feature: '#1d76db',
  patch: '#fbca04',
};

const HORIZON_LABELS: Record<string, string> = {
  '1': '24h', '2': '48h', '7': '7d', '14': '14d', '30': '30d', '60': '60d', '90': '90d',
};

function formatShortDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

// ─── Card Component ─────────────────────────────────────────────

const KanbanCard: React.FC<{
  item: DailyItem;
  index: number;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onQuickDone: () => void;
}> = ({ item, index, isDark, onEdit, onDelete, onQuickDone }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const priorityColor = PRIORITY_COLORS[item.priority] || '#9e9e9e';
  const overdue = isOverdue(item.due_date) && item.status !== 'done';

  return (
    <Draggable draggableId={String(item.id)} index={index}>
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{
            mb: 1.5,
            borderRadius: '10px',
            bgcolor: isDark ? '#1a1d27' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            borderLeft: `3px solid ${priorityColor}`,
            boxShadow: snapshot.isDragging
              ? `0 8px 24px ${alpha(priorityColor, 0.25)}`
              : '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.15s ease, transform 0.15s ease',
            '&:hover': {
              boxShadow: `0 2px 8px rgba(0,0,0,0.1)`,
            },
            opacity: snapshot.isDragging ? 0.9 : 1,
            cursor: 'grab',
          }}
        >
          {/* Card Header */}
          <Box
            {...provided.dragHandleProps}
            sx={{ px: 1.5, pt: 1.25, pb: 0.5, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
          >
            <IconGripVertical size={14} style={{ opacity: 0.3, marginTop: 3, flexShrink: 0 }} />
            <Typography
              variant="subtitle2"
              sx={{
                flex: 1,
                fontSize: '0.8125rem',
                fontWeight: 600,
                lineHeight: 1.35,
                color: isDark ? '#f3f4f6' : '#1a1a2e',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {item.title}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ ml: 'auto', mt: -0.5, opacity: 0.5, '&:hover': { opacity: 1 } }}
            >
              <IconDotsVertical size={14} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { setAnchorEl(null); onEdit(); }}>
                <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>
              {item.status !== 'done' && (
                <MenuItem onClick={() => { setAnchorEl(null); onQuickDone(); }}>
                  <ListItemIcon><CheckCircleIcon fontSize="small" sx={{ color: '#4caf50' }} /></ListItemIcon>
                  <ListItemText>Mark Done</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => { setAnchorEl(null); onDelete(); }}>
                <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#f44336' }} /></ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </Menu>
          </Box>

          {/* Description preview */}
          {item.description && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 1.5,
                pb: 0.5,
                color: 'text.secondary',
                fontSize: '0.7rem',
                lineHeight: 1.4,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {item.description}
            </Typography>
          )}

          {/* Chips row */}
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ px: 1.5, pb: 1 }}>
            {/* Priority */}
            <Chip
              size="small"
              icon={<FlagIcon sx={{ fontSize: 12, color: `${priorityColor} !important` }} />}
              label={PRIORITY_LABELS[item.priority] || item.priority}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: alpha(priorityColor, isDark ? 0.15 : 0.08),
                color: priorityColor,
                '& .MuiChip-icon': { ml: '4px' },
              }}
            />

            {/* Horizon */}
            <Chip
              size="small"
              label={HORIZON_LABELS[item.horizon] || item.horizon}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 500,
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: 'text.secondary',
              }}
            />

            {/* Category */}
            {item.category && (
              <Chip
                size="small"
                label={item.category}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: 'text.secondary',
                }}
              />
            )}

            {/* Agent tool */}
            {item.agent_tool && (
              <Chip
                size="small"
                icon={<AgentIcon sx={{ fontSize: 12, color: `${AGENT_TOOL_COLORS[item.agent_tool] || '#888'} !important` }} />}
                label={AGENT_TOOL_LABELS[item.agent_tool] || item.agent_tool}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  bgcolor: alpha(AGENT_TOOL_COLORS[item.agent_tool] || '#888', isDark ? 0.15 : 0.08),
                  color: AGENT_TOOL_COLORS[item.agent_tool] || '#888',
                  '& .MuiChip-icon': { ml: '4px' },
                }}
              />
            )}

            {/* Branch type */}
            {item.branch_type && (
              <Chip
                size="small"
                label={item.branch_type.replace('_', ' ')}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha(BRANCH_TYPE_COLORS[item.branch_type] || '#888', isDark ? 0.15 : 0.08),
                  color: BRANCH_TYPE_COLORS[item.branch_type] || '#888',
                }}
              />
            )}

            {/* Change set */}
            {item.change_set && (
              <Chip
                size="small"
                label={item.change_set.code}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: alpha('#2d1b4e', isDark ? 0.2 : 0.08),
                  color: isDark ? '#d4af37' : '#2d1b4e',
                }}
              />
            )}
          </Stack>

          {/* Footer: due date + ID */}
          <Box
            sx={{
              px: 1.5,
              pb: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {item.due_date ? (
              <Stack direction="row" alignItems="center" gap={0.5}>
                <IconCalendar size={12} style={{ opacity: 0.5 }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.65rem',
                    color: overdue ? '#f44336' : 'text.secondary',
                    fontWeight: overdue ? 700 : 400,
                  }}
                >
                  {formatShortDate(item.due_date)}
                  {overdue && ' (overdue)'}
                </Typography>
              </Stack>
            ) : (
              <Box />
            )}
            <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.35, fontFamily: 'monospace' }}>
              #{item.id}
            </Typography>
          </Box>
        </Box>
      )}
    </Draggable>
  );
};

// ─── Column Component ───────────────────────────────────────────

const KanbanColumn: React.FC<{
  column: { id: string; label: string; color: string };
  items: DailyItem[];
  isDark: boolean;
  onEdit: (item: DailyItem) => void;
  onDelete: (id: number) => void;
  onQuickDone: (id: number) => void;
}> = ({ column, items, isDark, onEdit, onDelete, onQuickDone }) => {
  return (
    <Box
      sx={{
        width: 280,
        minWidth: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 280px)',
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderRadius: '10px 10px 0 0',
          bgcolor: alpha(column.color, isDark ? 0.12 : 0.06),
          borderBottom: `2px solid ${alpha(column.color, 0.4)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: column.color,
            }}
          />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: isDark ? '#f3f4f6' : '#1a1a2e',
            }}
          >
            {column.label}
          </Typography>
        </Stack>
        <Chip
          size="small"
          label={items.length}
          sx={{
            height: 22,
            minWidth: 28,
            fontSize: '0.75rem',
            fontWeight: 700,
            bgcolor: alpha(column.color, isDark ? 0.2 : 0.12),
            color: column.color,
          }}
        />
      </Box>

      {/* Droppable area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 1,
              borderRadius: '0 0 10px 10px',
              bgcolor: snapshot.isDraggingOver
                ? alpha(column.color, isDark ? 0.06 : 0.03)
                : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
              borderTop: 'none',
              transition: 'background-color 0.2s ease',
              minHeight: 120,
              // Custom scrollbar
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                borderRadius: 2,
              },
            }}
          >
            {items.map((item, index) => (
              <KanbanCard
                key={item.id}
                item={item}
                index={index}
                isDark={isDark}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item.id)}
                onQuickDone={() => onQuickDone(item.id)}
              />
            ))}
            {provided.placeholder}
            {items.length === 0 && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  py: 3,
                  opacity: 0.3,
                  fontStyle: 'italic',
                }}
              >
                Drop items here
              </Typography>
            )}
          </Box>
        )}
      </Droppable>
    </Box>
  );
};

// ─── Main Kanban Board ──────────────────────────────────────────

const OMDailyKanban: React.FC<OMDailyKanbanProps> = ({
  items,
  onStatusChange,
  onEditItem,
  onDeleteItem,
  onQuickDone,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Group items by status
  const columnItems: Record<string, DailyItem[]> = {};
  KANBAN_COLUMNS.forEach((col) => {
    columnItems[col.id] = items
      .filter((item) => item.status === col.id)
      .sort((a, b) => {
        // Sort by priority (critical first), then by due date
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
  });

  // Items with status "cancelled" are excluded from the board

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const itemId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Optimistic update would go here if we wanted snappier UX,
    // but we rely on the parent's onStatusChange to refetch
    await onStatusChange(itemId, newStatus);
  };

  return (
    <Box sx={{ mt: 1 }}>
      <SimpleBar style={{ overflowX: 'auto' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Box display="flex" gap={1.5} sx={{ pb: 2, minWidth: KANBAN_COLUMNS.length * 290 }}>
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                items={columnItems[column.id] || []}
                isDark={isDark}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
                onQuickDone={onQuickDone}
              />
            ))}
          </Box>
        </DragDropContext>
      </SimpleBar>
    </Box>
  );
};

export default OMDailyKanban;
