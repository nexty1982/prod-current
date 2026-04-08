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
