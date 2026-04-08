/**
 * ChangelogTab.tsx
 * Extracted from OMDailyPage.tsx renderChangelog function.
 * Displays daily changelog with commit list, file changes, and date history sidebar.
 */

import {
  CloudUpload as CloudUploadIcon,
  Email as EmailIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  alpha,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { STATUS_COLORS } from './constants';
import type { BuildInfo, ChangelogCommit, ChangelogEntry } from './types';

// ─── Helper ────────────────────────────────────────────────────────

function parseJson(val: any) {
  if (!val) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

// ─── Props ─────────────────────────────────────────────────────────

export interface ChangelogTabProps {
  /** The currently selected changelog detail entry (or null). */
  changelogDetail: ChangelogEntry | null;
  /** Whether a changelog request is in flight. */
  changelogLoading: boolean;
  /** The selected date string (YYYY-MM-DD). */
  selectedChangelogDate: string;
  /** Setter for selectedChangelogDate. */
  setSelectedChangelogDate: (date: string) => void;
  /** Fetch detail for a given date. */
  fetchChangelogDetail: (date: string) => void;
  /** Trigger changelog generation for a date. */
  triggerGenerate: (date: string) => void;
  /** Trigger email send for a date. */
  triggerEmail: (date: string) => void;
  /** Build info (version, branch, etc.) or null. */
  buildInfo: BuildInfo | null;
  /** Whether a git push is in progress. */
  pushing: boolean;
  /** Push current branch to origin. */
  pushToOrigin: () => void;
  /** Hash of the currently expanded commit (or null). */
  expandedCommit: string | null;
  /** Setter for expandedCommit. */
  setExpandedCommit: (hash: string | null) => void;
  /** Whether the current theme is dark mode. */
  isDark: boolean;
  /** List of recent changelog entries for the sidebar. */
  changelogEntries: ChangelogEntry[];
}

// ─── Component ─────────────────────────────────────────────────────

const ChangelogTab: React.FC<ChangelogTabProps> = ({
  changelogDetail,
  changelogLoading,
  selectedChangelogDate,
  setSelectedChangelogDate,
  fetchChangelogDetail,
  triggerGenerate,
  triggerEmail,
  buildInfo,
  pushing,
  pushToOrigin,
  expandedCommit,
  setExpandedCommit,
  isDark,
  changelogEntries,
}) => {
  const detail = changelogDetail;
  const commits: ChangelogCommit[] = detail ? parseJson(detail.commits) || [] : [];
  const filesChanged = detail
    ? parseJson(detail.files_changed) || { added: 0, modified: 0, deleted: 0 }
    : { added: 0, modified: 0, deleted: 0 };
  const totalFiles = (filesChanged.added || 0) + (filesChanged.modified || 0) + (filesChanged.deleted || 0);
  const matchCount = commits.filter((c: any) => c.matchedItem).length;
  const matchRate = commits.length > 0 ? Math.round((matchCount / commits.length) * 100) : 0;

  const FILE_STATUS_COLORS: Record<string, string> = { added: '#4caf50', modified: '#ff9800', deleted: '#f44336' };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Main content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Top bar */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              type="date" size="small" value={selectedChangelogDate}
              onChange={(e) => { setSelectedChangelogDate(e.target.value); fetchChangelogDetail(e.target.value); }}
              InputLabelProps={{ shrink: true }} label="Date"
              sx={{ width: 180 }}
            />
            <Button variant="contained" size="small" startIcon={<RefreshIcon />}
              onClick={() => triggerGenerate(selectedChangelogDate)} disabled={changelogLoading}>
              Generate Now
            </Button>
            <Button variant="outlined" size="small" startIcon={<EmailIcon />}
              onClick={() => triggerEmail(selectedChangelogDate)}
              disabled={!detail || !!detail.email_sent_at}>
              {detail?.email_sent_at ? 'Email Sent' : 'Send Email'}
            </Button>
            {buildInfo && (
              <Chip
                label={`v${buildInfo.fullVersion}`}
                size="small"
                color="secondary"
                sx={{ fontWeight: 600, fontFamily: 'monospace' }}
              />
            )}
            <Tooltip title={`Push current branch to origin${buildInfo?.branch ? ` (${buildInfo.branch})` : ''}`}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  color="success"
                  startIcon={pushing ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                  onClick={pushToOrigin}
                  disabled={pushing}
                >
                  Push to Origin
                </Button>
              </span>
            </Tooltip>
            {changelogLoading && <CircularProgress size={20} />}
          </Box>
        </Paper>

        {/* Summary cards */}
        {detail && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2, mb: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: '#8c249d' }}>{commits.length}</Typography>
              <Typography variant="body2" color="text.secondary">Commits</Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{totalFiles}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                +{filesChanged.added || 0} ~{filesChanged.modified || 0} -{filesChanged.deleted || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Files Changed</Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">{matchRate}%</Typography>
              <Typography variant="body2" color="text.secondary">Pipeline Match</Typography>
            </Paper>
          </Box>
        )}

        {/* Commit list */}
        {!detail && !changelogLoading && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No changelog for this date. Click "Generate Now" to create one.</Typography>
          </Paper>
        )}

        {detail && commits.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No commits on {selectedChangelogDate}.</Typography>
          </Paper>
        )}

        {detail && commits.length > 0 && (
          <Paper>
            {commits.map((commit: ChangelogCommit) => {
              const isExpanded = expandedCommit === commit.hash;
              const matchStatus = commit.matchedItem ? commit.matchedItem.status : 'unmatched';
              const chipColor = STATUS_COLORS[matchStatus] || '#9e9e9e';

              return (
                <Box key={commit.hash}>
                  <Box
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                      borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha('#8c249d', 0.03) },
                    }}
                    onClick={() => setExpandedCommit(isExpanded ? null : commit.hash)}
                  >
                    <ExpandMoreIcon sx={{ fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#8c249d', fontWeight: 600, fontSize: '0.82rem', flexShrink: 0 }}>
                      {commit.hash}
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.88rem' }} noWrap>
                        {commit.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {commit.author} &middot; {new Date(commit.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <Chip size="small" label={`${(commit.files || []).length} files`} sx={{ fontSize: '0.65rem', height: 20 }} />
                    <Chip size="small" label={commit.matchedItem ? commit.matchedItem.status : 'unmatched'}
                      sx={{ bgcolor: alpha(chipColor, 0.15), color: chipColor, fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                  </Box>
                  <Collapse in={isExpanded}>
                    <Box sx={{ pl: 7, pr: 2, py: 1.5, bgcolor: isDark ? alpha('#000', 0.2) : alpha('#f5f5f5', 0.5) }}>
                      {commit.matchedItem && (
                        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#8c249d' }}>
                          Matched: {commit.matchedItem.title}
                        </Typography>
                      )}
                      {(commit.files || []).map((f, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.3 }}>
                          <Chip size="small" label={f.status[0].toUpperCase()}
                            sx={{ width: 22, height: 18, fontSize: '0.6rem', bgcolor: alpha(FILE_STATUS_COLORS[f.status] || '#999', 0.2), color: FILE_STATUS_COLORS[f.status] || '#999', fontWeight: 700, '& .MuiChip-label': { px: 0 } }} />
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{f.path}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Paper>
        )}
      </Box>

      {/* Date history sidebar */}
      <Paper sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0, maxHeight: 600, overflow: 'auto' }}>
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${isDark ? '#333' : '#eee'}` }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#8c249d' }}>
            <HistoryIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
            Recent Days
          </Typography>
        </Box>
        <List dense disablePadding>
          {changelogEntries.map((entry) => {
            const entryCommits = parseJson(entry.commits) || [];
            const entryDate = typeof entry.date === 'string' ? entry.date.split('T')[0] : entry.date;
            const isSelected = entryDate === selectedChangelogDate;
            return (
              <ListItemButton key={entry.id} selected={isSelected}
                onClick={() => { setSelectedChangelogDate(entryDate); fetchChangelogDetail(entryDate); }}
                sx={{ px: 1.5, py: 0.8 }}>
                <ListItemText
                  primary={new Date(entryDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: isSelected ? 700 : 400 }}
                />
                <Badge badgeContent={entryCommits.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 18, height: 18 } }} />
              </ListItemButton>
            );
          })}
          {changelogEntries.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">No entries yet</Typography>
            </Box>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default ChangelogTab;
