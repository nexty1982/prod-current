/**
 * adminHudTypes — Shared types and styled component for AdminFloatingHUD.
 * Extracted from AdminFloatingHUD.tsx
 */
import { Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

// ─── Types ───────────────────────────────────────────────────────

export interface SystemStatus {
  version_string?: string;
  last_git_sha?: string;
  church_count?: number;
  version_mismatch?: boolean;
  uptime?: string;
  environment?: string;
}

export interface SessionStats {
  totalSessions: number;
  uniqueUsers: number;
  ratio: number;
  health: string;
}

export interface MaintenanceStatus {
  enabled: boolean;
  message?: string;
}

export interface LogEntry {
  type: 'error' | 'warning';
  message: string;
  timestamp: string;
  id: string;
}

export interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  isMonitoring: boolean;
}

export interface OmaiHealth {
  overall: string;
  services: Record<string, string>;
  disk: { size: string; used: string; avail: string; percent: string };
  memory: { totalMB: string; usedMB: string; freeMB: string; availableMB: string };
  errors: { lastHour: number; last24h: number };
}

export interface OmaiBriefing {
  date: string;
  summary: {
    commits: number;
    tasksCompleted: number;
    tasksInProgress: number;
    tasksCreated: number;
    errorsToday: number;
  };
}

export interface OmaiTaskItem {
  id: number;
  title: string;
  priority: string;
  status: string;
  category: string;
  assigned_to: string | null;
}

export interface OmaiTaskStats {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completedLast7Days: number;
}

export interface OmaiLogsSummary {
  last24h: { total_24h: number; errors_24h: string; warnings_24h: string };
  status: string;
}

export interface OmaiLogPattern {
  pattern: string;
  count: number;
}

// ─── Styled Component ────────────────────────────────────────────

export const DraggableHUD = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: 80,
  right: 16,
  zIndex: 9999,
  padding: theme.spacing(2),
  cursor: 'move',
  userSelect: 'none',
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a2e' : '#ffffff',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
    : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  borderRadius: 12,
  transition: 'width 0.3s ease, box-shadow 0.2s ease',
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark'
      ? '0 25px 30px -5px rgba(0, 0, 0, 0.4), 0 15px 15px -5px rgba(0, 0, 0, 0.3)'
      : '0 25px 30px -5px rgba(0, 0, 0, 0.15), 0 15px 15px -5px rgba(0, 0, 0, 0.08)',
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  '& .MuiTooltip-popper': {
    zIndex: 10000,
  },
}));

// ─── Constants ───────────────────────────────────────────────────

export const LEAK_THRESHOLD = 1.1;

export function priorityColor(p: string): string {
  switch (p) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#94a3b8';
  }
}
