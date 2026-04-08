/**
 * ItemListTab.tsx
 * Extracted from OMDailyPage.tsx — renders the filterable, multi-select item list
 * with search, horizon/status/priority/category filters, and expandable rows.
 */

import {
  Add as AddIcon,
  SmartToy as AgentIcon,
  ArrowForward as ArrowForwardIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  CheckBox as CheckBoxIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Inventory2 as PackageIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

// ─── Types ──────────────────────────────────────────────────────────

import type { DailyItem } from './types';
import {
  HORIZONS, HORIZON_LABELS, STATUSES, STATUS_LABELS, STATUS_COLORS,
  PRIORITIES, PRIORITY_COLORS, AGENT_TOOL_LABELS, AGENT_TOOL_COLORS,
  BRANCH_TYPE_LABELS, BRANCH_TYPE_COLORS, formatDate,
} from './constants';

export interface ItemListTabProps {
  items: DailyItem[];
  categories: string[];

  // Filters
  searchTerm: string;
  selectedHorizon: string;
  filterStatus: string;
  filterPriority: string;
  filterCategory: string;
  filterDue: string;
  activeTab: number;

  // Filter setters
  handleSearchChange: (val: string) => void;
  setSelectedHorizon: (val: string) => void;
  setFilterStatus: (val: string) => void;
  setFilterPriority: (val: string) => void;
  setFilterCategory: (val: string) => void;
  setFilterDue: (val: string) => void;

  // Expand/collapse
  expandedItem: number | null;
  setExpandedItem: (val: number | null) => void;

  // Multi-select
  selectedIds: Set<number>;
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Actions
  handleStatusChange: (item: DailyItem, newStatus: string) => void;
  handleDelete: (id: number) => void;
  openNewDialog: () => void;
  openEditDialog: (item: DailyItem) => void;
  openCreateCsDialog: () => void;
  openAddToCsDialog: () => void;
  navigate: (path: string) => void;
}

// ─── Chip Renderers ─────────────────────────────────────────────────

const renderStatusChip = (status: string) => (
  <Chip size="small" label={STATUS_LABELS[status] || status}
    sx={{ bgcolor: alpha(STATUS_COLORS[status] || '#999', 0.15), color: STATUS_COLORS[status] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
);

const renderPriorityChip = (priority: string) => (
  <Chip size="small" label={priority}
    sx={{ bgcolor: alpha(PRIORITY_COLORS[priority] || '#999', 0.15), color: PRIORITY_COLORS[priority] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 20, textTransform: 'capitalize' }} />
);

const renderAgentChip = (agentTool: string) => {
  const color = AGENT_TOOL_COLORS[agentTool] || '#666';
  return (
    <Tooltip title={`Agent: ${AGENT_TOOL_LABELS[agentTool] || agentTool}`}>
      <Chip size="small" icon={<AgentIcon sx={{ fontSize: 13 }} />} label={AGENT_TOOL_LABELS[agentTool] || agentTool}
        sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600, fontSize: '0.65rem', height: 20, '& .MuiChip-icon': { color } }} />
    </Tooltip>
  );
};

// ─── Component ──────────────────────────────────────────────────────

const ItemListTab: React.FC<ItemListTabProps> = ({
  items,
  categories,
  searchTerm,
  selectedHorizon,
  filterStatus,
  filterPriority,
  filterCategory,
  filterDue,
  activeTab,
  handleSearchChange,
  setSelectedHorizon,
  setFilterStatus,
  setFilterPriority,
  setFilterCategory,
  setFilterDue,
  expandedItem,
  setExpandedItem,
  selectedIds,
  toggleSelect,
  selectAll,
  clearSelection,
  handleStatusChange,
  handleDelete,
  openNewDialog,
  openEditDialog,
  openCreateCsDialog,
  openAddToCsDialog,
  navigate,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{'Search by text, #ID, CS-XXXX\nFilters: status:done priority:high category:OCR horizon:7\nExclude: -keyword\nQuote phrases: "exact match"'}</span>} arrow placement="bottom-start">
            <TextField size="small" placeholder="Search: text, #ID, status:done, -exclude..." value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 280 }}
            />
          </Tooltip>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Horizon</InputLabel>
            <Select value={selectedHorizon} label="Horizon" onChange={(e) => setSelectedHorizon(e.target.value)}>
              <MenuItem value="">All Horizons</MenuItem>
              {HORIZONS.map(h => <MenuItem key={h} value={h}>{HORIZON_LABELS[h]} Plan</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {STATUSES.map(s => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={filterPriority} label="Priority" onChange={(e) => setFilterPriority(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {PRIORITIES.map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          {categories.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          {filterDue && (
            <Chip
              label={filterDue === 'overdue' ? 'Overdue' : filterDue === 'today' ? 'Due Today' : 'Due Soon'}
              color={filterDue === 'overdue' ? 'error' : 'warning'}
              size="small"
              onDelete={() => setFilterDue('')}
              sx={{ fontWeight: 600 }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" size="small" startIcon={<PackageIcon />} onClick={() => navigate('/admin/control-panel/om-daily/change-sets')}>
            Change Sets
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNewDialog}>
            New Item
          </Button>
        </Box>
      </Paper>

      {/* Multi-select action bar */}
      {selectedIds.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.06), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
          <Typography variant="body2" fontWeight={600} sx={{ ml: 1 }}>
            {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" startIcon={<PackageIcon />} onClick={openCreateCsDialog}>
            Create Change Set
          </Button>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAddToCsDialog}>
            Add to Existing
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<ArrowForwardIcon />}
            onClick={() => navigate(`/admin/control-panel/om-daily/sdlc-wizard?mode=new-work&items=${Array.from(selectedIds).join(',')}`)}
          >
            Send to SDLC Wizard
          </Button>
          <Button size="small" color="inherit" onClick={clearSelection}>
            Clear
          </Button>
        </Paper>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No items yet. Click "New Item" to get started.</Typography>
        </Paper>
      ) : (
        <Paper>
          {/* Select all header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
            <IconButton size="small" onClick={selectAll} sx={{ p: 0.5 }}>
              {items.filter(i => !i.change_set).length > 0 && items.filter(i => !i.change_set).every(i => selectedIds.has(i.id))
                ? <CheckBoxIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                : <CheckBoxBlankIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
            </IconButton>
            <Typography variant="caption" color="text.secondary">{items.length} items</Typography>
          </Box>
          {items.map(item => {
            const isOverdue = item.due_date && item.status !== 'done' && item.status !== 'cancelled' && new Date(item.due_date) < new Date(new Date().toDateString());
            const isItemExpanded = expandedItem === item.id;
            const isSelected = selectedIds.has(item.id);
            const hasCsAssignment = !!item.change_set;
            return (
              <Box key={item.id}>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                    borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`,
                    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : isOverdue ? alpha('#f44336', 0.04) : item.status === 'done' ? alpha('#4caf50', 0.03) : 'transparent',
                    '&:hover': { bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.04) },
                    cursor: item.description ? 'pointer' : 'default',
                  }}
                  onClick={() => item.description && setExpandedItem(isItemExpanded ? null : item.id)}
                >
                  {/* Multi-select checkbox */}
                  <IconButton size="small" sx={{ p: 0.5 }} onClick={(e) => { e.stopPropagation(); if (!hasCsAssignment) toggleSelect(item.id); }}>
                    {hasCsAssignment ? (
                      <Tooltip title={`In ${item.change_set!.code}: ${item.change_set!.title}`}>
                        <PackageIcon sx={{ fontSize: 18, color: '#9c27b0' }} />
                      </Tooltip>
                    ) : isSelected ? (
                      <CheckBoxIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    ) : (
                      <CheckBoxBlankIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    )}
                  </IconButton>

                  {/* Quick status toggle */}
                  {item.status !== 'done' && item.status !== 'cancelled' ? (
                    <IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); handleStatusChange(item, 'done'); }}>
                      <CheckIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  ) : (
                    <CheckIcon sx={{ fontSize: 18, color: 'success.main', mx: 1 }} />
                  )}

                  {/* Expand arrow for items with description */}
                  {item.description && (
                    <ExpandMoreIcon sx={{ fontSize: 16, transform: isItemExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'text.disabled' }} />
                  )}

                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} sx={{
                      fontSize: '0.88rem',
                      textDecoration: item.status === 'done' ? 'line-through' : 'none',
                      opacity: item.status === 'done' ? 0.6 : 1,
                    }}>
                      {item.title}
                    </Typography>
                    {!isItemExpanded && item.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                        {item.description.length > 100 ? item.description.slice(0, 100) + '...' : item.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Meta chips */}
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    {item.change_set && (
                      <Tooltip title={`${item.change_set.code}: ${item.change_set.title} (${item.change_set.status})`}>
                        <Chip size="small" icon={<PackageIcon sx={{ fontSize: '14px !important' }} />}
                          label={item.change_set.code}
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/control-panel/om-daily/change-sets/${item.change_set!.change_set_id}`); }}
                          clickable
                          sx={{ fontSize: '0.65rem', height: 20, bgcolor: alpha('#9c27b0', 0.1), color: '#9c27b0', fontWeight: 600, fontFamily: 'monospace' }}
                        />
                      </Tooltip>
                    )}
                    {item.agent_tool && renderAgentChip(item.agent_tool)}
                    {item.branch_type && (
                      <Tooltip title={`Branch Type: ${BRANCH_TYPE_LABELS[item.branch_type] || item.branch_type}`}>
                        <Chip size="small" label={BRANCH_TYPE_LABELS[item.branch_type] || item.branch_type}
                          sx={{ fontSize: '0.6rem', height: 18, bgcolor: alpha(BRANCH_TYPE_COLORS[item.branch_type] || '#666', 0.12), color: BRANCH_TYPE_COLORS[item.branch_type] || '#666', fontWeight: 600 }} />
                      </Tooltip>
                    )}
                    {item.github_branch && (
                      <Tooltip title={`Branch: ${item.github_branch}`}>
                        <Chip size="small" label={item.github_branch} variant="outlined"
                          sx={{ fontSize: '0.58rem', height: 18, fontFamily: 'monospace', maxWidth: 180, borderColor: alpha('#24292e', 0.3), color: '#24292e' }} />
                      </Tooltip>
                    )}
                    {item.conversation_ref && (
                      <Tooltip title={`Linked: ${item.conversation_ref}`}>
                        <Chip size="small" label="Conv" variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 18, borderColor: alpha('#8c249d', 0.4), color: '#8c249d' }} />
                      </Tooltip>
                    )}
                    {!item.agent_tool && item.source === 'agent' && (() => {
                      const meta = typeof item.metadata === 'string' ? (() => { try { return JSON.parse(item.metadata); } catch { return {}; } })() : (item.metadata || {});
                      return (
                        <Tooltip title={`Agent: ${meta.agent || 'unknown'}`}>
                          <Chip size="small" icon={<AgentIcon sx={{ fontSize: 14 }} />} label={meta.agent || 'agent'}
                            sx={{ fontSize: '0.65rem', height: 20, bgcolor: alpha('#9c27b0', 0.1), color: '#9c27b0' }} />
                        </Tooltip>
                      );
                    })()}
                    {item.github_issue_number && (
                      <Tooltip title={`GitHub Issue #${item.github_issue_number}`}>
                        <Chip size="small" label={`#${item.github_issue_number}`} component="a"
                          href={`https://github.com/nexty1982/prod-current/issues/${item.github_issue_number}`}
                          target="_blank" rel="noreferrer" clickable
                          sx={{ fontSize: '0.65rem', height: 20, bgcolor: alpha('#24292e', 0.08), color: '#24292e', textDecoration: 'none' }} />
                      </Tooltip>
                    )}
                    {activeTab === 0 && (
                      <Chip size="small" label={HORIZON_LABELS[item.horizon]} sx={{ fontSize: '0.65rem', height: 20, bgcolor: alpha('#00897b', 0.1), color: '#00897b' }} />
                    )}
                    {renderStatusChip(item.status)}
                    {renderPriorityChip(item.priority)}
                    {item.category && <Chip size="small" label={item.category} variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                    {item.due_date && (
                      <Chip size="small" label={formatDate(item.due_date)} color={isOverdue ? 'error' : 'default'} sx={{ fontSize: '0.65rem', height: 20 }} />
                    )}
                  </Box>

                  {/* Actions */}
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditDialog(item); }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                  <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                </Box>

                {/* Expanded description */}
                <Collapse in={isItemExpanded}>
                  <Box sx={{ px: 7, py: 2, bgcolor: isDark ? alpha('#000', 0.2) : alpha('#f5f5f5', 0.5), borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}` }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {item.description}
                    </Typography>
                    {item.created_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Created {formatDate(item.created_at)} {item.completed_at ? ` | Completed ${formatDate(item.completed_at)}` : ''}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Paper>
      )}
    </Box>
  );
};

export default ItemListTab;
