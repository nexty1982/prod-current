export const HORIZONS = ['1', '2', '7', '14', '30', '60', '90'];
export const HORIZON_LABELS: Record<string, string> = { '1': '24 Hour', '2': '48 Hour', '7': '7 Day', '14': '14 Day', '30': '30 Day', '60': '60 Day', '90': '90 Day' };
export const AGENT_TOOLS = ['windsurf', 'claude_cli', 'cursor', 'github_copilot'] as const;
export const AGENT_TOOL_LABELS: Record<string, string> = { windsurf: 'Windsurf', claude_cli: 'Claude CLI', cursor: 'Cursor', github_copilot: 'GitHub Copilot' };
export const AGENT_TOOL_COLORS: Record<string, string> = { windsurf: '#00b4d8', claude_cli: '#d4a574', cursor: '#7c3aed', github_copilot: '#1f883d' };
export const BRANCH_TYPES = ['bugfix', 'new_feature', 'existing_feature', 'patch'] as const;
export const BRANCH_TYPE_LABELS: Record<string, string> = { bugfix: 'Bug Fix', new_feature: 'New Feature', existing_feature: 'Existing Feature', patch: 'Patch' };
export const BRANCH_TYPE_COLORS: Record<string, string> = { bugfix: '#d73a4a', new_feature: '#0e8a16', existing_feature: '#1d76db', patch: '#fbca04' };
export const STATUSES = ['backlog', 'in_progress', 'self_review', 'review', 'staging', 'done', 'blocked', 'cancelled'];
export const STATUS_LABELS: Record<string, string> = { backlog: 'Backlog', in_progress: 'In Progress', self_review: 'Self Review', review: 'Review', staging: 'Staging', done: 'Done', blocked: 'Blocked', cancelled: 'Cancelled' };
export const STATUS_COLORS: Record<string, string> = { backlog: '#9e9e9e', in_progress: '#ffa726', self_review: '#ab47bc', review: '#26c6da', staging: '#66bb6a', done: '#4caf50', blocked: '#ef5350', cancelled: '#bdbdbd' };
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const PRIORITY_COLORS: Record<string, string> = { low: '#9e9e9e', medium: '#2196f3', high: '#ff9800', critical: '#f44336' };

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
