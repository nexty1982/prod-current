/**
 * ChangeSetsDashboard.tsx
 * Primary management surface for change_set delivery containers.
 * Lists all change_sets with status filters, priority indicators, and quick actions.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
  Inventory2 as PackageIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/shared/lib/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChangeSet {
  id: number;
  code: string;
  title: string;
  status: string;
  priority: string;
  change_type: string;
  git_branch: string | null;
  deployment_strategy: string;
  has_db_changes: boolean;
  item_count: number;
  created_by_email: string;
  reviewed_by_email: string | null;
  staged_at: string | null;
  approved_at: string | null;
  promoted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:              { label: 'Draft',             color: '#9e9e9e' },
  active:             { label: 'Active',            color: '#1976d2' },
  ready_for_staging:  { label: 'Ready for Staging', color: '#ed6c02' },
  staged:             { label: 'Staged',            color: '#9c27b0' },
  in_review:          { label: 'In Review',         color: '#0288d1' },
  approved:           { label: 'Approved',          color: '#2e7d32' },
  promoted:           { label: 'Promoted',          color: '#388e3c' },
  rejected:           { label: 'Rejected',          color: '#d32f2f' },
  rolled_back:        { label: 'Rolled Back',       color: '#f44336' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' }> = {
  critical: { label: 'Critical', color: 'error' },
  high:     { label: 'High',     color: 'warning' },
  medium:   { label: 'Medium',   color: 'info' },
  low:      { label: 'Low',      color: 'default' },
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  feature:  'Feature',
  bugfix:   'Bugfix',
  hotfix:   'Hotfix',
  refactor: 'Refactor',
  infra:    'Infra',
};

// ── Component ─────────────────────────────────────────────────────────────────

const ChangeSetsDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [changeSets, setChangeSets] = useState<ChangeSet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('feature');
  const [newPriority, setNewPriority] = useState('medium');
  const [newBranch, setNewBranch] = useState('');
  const [newStrategy, setNewStrategy] = useState('stage_then_promote');

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/om-daily', title: 'OM Daily' },
    { title: 'Change Sets' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.change_type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await apiClient.get('/admin/change-sets', { params });
      setChangeSets(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load change sets:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, priorityFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await apiClient.post('/admin/change-sets', {
        title: newTitle.trim(),
        change_type: newType,
        priority: newPriority,
        git_branch: newBranch.trim() || undefined,
        deployment_strategy: newStrategy,
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewBranch('');
      navigate(`/admin/control-panel/om-daily/change-sets/${res.data.change_set.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create change set');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <PageContainer title="Change Sets" description="SDLC Delivery Containers">
      <Breadcrumb title="Change Sets" items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              <PackageIcon sx={{ mr: 1, verticalAlign: 'middle', color: theme.palette.primary.main }} />
              Change Sets
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {total} delivery container{total !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              startIcon={<PackageIcon />}
              onClick={() => navigate('/admin/control-panel/om-daily/sdlc-wizard')}
            >
              SDLC Wizard
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={() => navigate('/admin/control-panel/om-daily/change-sets/releases')}
            >
              Release History
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              New Change Set
            </Button>
            <IconButton size="small" onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Status summary chips */}
        {!loading && changeSets.length > 0 && !statusFilter && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {Object.entries(
              changeSets.reduce((acc, cs) => { acc[cs.status] = (acc[cs.status] || 0) + 1; return acc; }, {} as Record<string, number>)
            ).map(([status, count]) => {
              const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
              return (
                <Chip key={status} label={`${sc.label}: ${count}`} size="small"
                  onClick={() => setStatusFilter(status)}
                  sx={{ bgcolor: alpha(sc.color, 0.1), color: sc.color, fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}
                />
              );
            })}
          </Box>
        )}

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel><FilterIcon sx={{ fontSize: 16, mr: 0.5 }} />Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {Object.entries(CHANGE_TYPE_LABELS).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          {(statusFilter || typeFilter || priorityFilter) && (
            <Button size="small" onClick={() => { setStatusFilter(''); setTypeFilter(''); setPriorityFilter(''); }}>
              Clear Filters
            </Button>
          )}
        </Box>

        {/* Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Next Step</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : changeSets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No change sets found</Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ mt: 1 }}>
                      Create your first change set
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                changeSets.map((cs) => {
                  const sc = STATUS_CONFIG[cs.status] || STATUS_CONFIG.draft;
                  const pc = PRIORITY_CONFIG[cs.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <TableRow
                      key={cs.id}
                      hover
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(sc.color, 0.04) } }}
                      onClick={() => navigate(`/admin/control-panel/om-daily/change-sets/${cs.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                          {cs.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 280 }}>
                          {cs.title}
                        </Typography>
                        {cs.has_db_changes && (
                          <Chip label="DB" size="small" color="warning" variant="outlined" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sc.label}
                          size="small"
                          sx={{
                            bgcolor: alpha(sc.color, 0.12),
                            color: sc.color,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={pc.label} size="small" color={pc.color} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {CHANGE_TYPE_LABELS[cs.change_type] || cs.change_type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {cs.git_branch ? (
                          <Tooltip title={cs.git_branch}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 160 }} noWrap>
                              {cs.git_branch}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>{cs.item_count}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {cs.status === 'draft' && 'Activate'}
                          {cs.status === 'active' && (cs.item_count === 0 ? 'Add items' : 'Mark Ready')}
                          {cs.status === 'ready_for_staging' && (
                            cs.deployment_strategy === 'hotfix_direct'
                              ? <Chip label="Run hotfix CLI" size="small" variant="outlined" color="error" sx={{ fontSize: '0.65rem', height: 20 }} />
                              : <Chip label="Run stage CLI" size="small" variant="outlined" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />
                          )}
                          {cs.status === 'staged' && 'Start Review'}
                          {cs.status === 'in_review' && 'Approve / Reject'}
                          {cs.status === 'approved' && (
                            <Chip label="Run promote CLI" size="small" variant="outlined" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
                          )}
                          {cs.status === 'promoted' && 'Done'}
                          {cs.status === 'rejected' && 'Reactivate'}
                          {cs.status === 'rolled_back' && '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Change Set</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            fullWidth
            required
            autoFocus
            placeholder="e.g. Portal Q1 Polish"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={newType} label="Type" onChange={(e) => setNewType(e.target.value)}>
                <MenuItem value="feature">Feature</MenuItem>
                <MenuItem value="bugfix">Bugfix</MenuItem>
                <MenuItem value="hotfix">Hotfix</MenuItem>
                <MenuItem value="refactor">Refactor</MenuItem>
                <MenuItem value="infra">Infra</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select value={newPriority} label="Priority" onChange={(e) => setNewPriority(e.target.value)}>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TextField
            label="Git Branch (optional)"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            fullWidth
            size="small"
            placeholder="feature/username/2026-03-08/description"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Deployment Strategy</InputLabel>
            <Select value={newStrategy} label="Deployment Strategy" onChange={(e) => setNewStrategy(e.target.value)}>
              <MenuItem value="stage_then_promote">Stage then Promote</MenuItem>
              <MenuItem value="hotfix_direct">Hotfix Direct</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ChangeSetsDashboard;
