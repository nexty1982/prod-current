/**
 * Shared types, constants, and utilities for the OM Daily module.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ChangeSetMembership {
  change_set_id: number;
  code: string;
  title: string;
  status: string;
}

export interface DailyItem {
  id: number;
  title: string;
  description: string | null;
  horizon: string;
  status: string;
  priority: string;
  category: string | null;
  due_date: string | null;
  assigned_to: number | null;
  tags: any;
  progress: number;
  created_by: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  source?: string;
  metadata?: any;
  github_issue_number?: number | null;
  github_synced_at?: string | null;
  agent_tool?: string | null;
  branch_type?: string | null;
  github_branch?: string | null;
  conversation_ref?: string | null;
  change_set?: ChangeSetMembership | null;
}

export interface GitHubSyncStatus {
  unsyncedCount: number;
  lastSync: string | null;
  repoUrl: string;
  issuesUrl: string;
}

export interface BuildInfo {
  version: string;
  buildNumber: number;
  buildDate: string | null;
  branch: string;
  commit: string;
  fullVersion: string;
}

export interface DashboardData {
  horizons: Record<string, { total: number; statuses: Record<string, number> }>;
  overdue: number;
  dueToday: number;
  recentlyCompleted: number;
  totalActive: number;
}

export interface ExtendedDashboard {
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  categoryBreakdown: { category: string; count: number; done_count: number }[];
  recentCompleted: { id: number; title: string; category: string | null; horizon: string; completed_at: string; priority: string }[];
  inProgressItems: { id: number; title: string; description: string | null; category: string | null; horizon: string; priority: string; due_date: string | null; agent_tool: string | null; branch_type: string | null; updated_at: string }[];
  dueSoon: { id: number; title: string; status: string; priority: string; due_date: string; horizon: string; category: string | null }[];
  velocity: { date: string; count: number }[];
  created: { date: string; count: number }[];
  phaseGroups: { source: string; category: string | null; total: number; done_count: number; active_count: number; items_summary: string }[];
}

export interface ChangelogCommit {
  hash: string;
  fullHash: string;
  author: string;
  message: string;
  timestamp: string;
  files: { status: string; path: string }[];
  matchedItem?: { id: number; title: string; status: string } | null;
}

export interface ChangelogEntry {
  id: number;
  date: string;
  commits: ChangelogCommit[] | string;
  files_changed: { added: number; modified: number; deleted: number; list: any[] } | string;
  summary: string;
  status_breakdown: Record<string, number> | string;
  matched_items: any[] | string;
  email_sent_at: string | null;
  created_at: string;
}

export interface ItemFormData {
  title: string;
  description: string;
  horizon: string;
  status: string;
  priority: string;
  category: string;
  due_date: string;
  agent_tool: string;
  branch_type: string;
}

// ─── Constants ──────────────────────────────────────────────────────

export const HORIZONS = ['1', '2', '7', '14', '30', '60', '90'];
export const HORIZON_LABELS: Record<string, string> = { '1': '24 Hour', '2': '48 Hour', '7': '7 Day', '14': '14 Day', '30': '30 Day', '60': '60 Day', '90': '90 Day' };
export const AGENT_TOOLS = ['windsurf', 'claude_cli', 'cursor', 'github_copilot'] as const;
export const AGENT_TOOL_LABELS: Record<string, string> = { windsurf: 'Windsurf', claude_cli: 'Claude CLI', cursor: 'Cursor', github_copilot: 'GitHub Copilot' };
export const AGENT_TOOL_COLORS: Record<string, string> = { windsurf: '#00b4d8', claude_cli: '#d4a574', cursor: '#7c3aed', github_copilot: '#1f883d' };
export const BRANCH_TYPES = ['bugfix', 'new_feature', 'existing_feature', 'patch'] as const;
export const BRANCH_TYPE_LABELS: Record<string, string> = { bugfix: 'Bug Fix', new_feature: 'New Feature', existing_feature: 'Existing Feature', patch: 'Patch' };
export const BRANCH_TYPE_COLORS: Record<string, string> = { bugfix: '#d73a4a', new_feature: '#0e8a16', existing_feature: '#1d76db', patch: '#fbca04' };
export const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled'];
export const STATUS_LABELS: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', cancelled: 'Cancelled' };
export const STATUS_COLORS: Record<string, string> = { backlog: '#9e9e9e', todo: '#2196f3', in_progress: '#ff9800', review: '#9c27b0', done: '#4caf50', cancelled: '#f44336' };
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const PRIORITY_COLORS: Record<string, string> = { low: '#9e9e9e', medium: '#2196f3', high: '#ff9800', critical: '#f44336' };

// ─── Utilities ──────────────────────────────────────────────────────

export function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function parseJson(val: any) {
  if (!val) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val; } }
  return val;
}

export const DEFAULT_FORM: ItemFormData = {
  title: '', description: '', horizon: '7', status: 'todo', priority: 'medium',
  category: '', due_date: '', agent_tool: '', branch_type: '',
};
