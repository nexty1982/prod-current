import React, { useState, useEffect } from 'react';
import { Box, Tooltip } from '@mui/material';
import { Activity } from 'lucide-react';

interface SessionStats {
  totalSessions: number;
  uniqueUsers: number;
  ratio: number;
  health: string;
}

/**
 * SessionPulseIndicator - Small status icon for header
 * Shows RED if session-to-user ratio > 1.1 (indicates session leak)
 * Shows GREEN if ratio is healthy (<= 1.1)
 */
const SessionPulseIndicator: React.FC = () => {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const LEAK_THRESHOLD = 1.1; // Session leak indicator threshold

  useEffect(() => {
    const fetchSessionStats = async () => {
      try {
        const response = await fetch('/api/admin/session-stats', {
          credentials: 'include'
        });

        if (!response.ok) {
          // Not authorized or endpoint unavailable - hide indicator
          setError(true);
          return;
        }

        const data = await response.json();
        const totalSessions = data.stats?.totalSessions || 0;
        const uniqueUsers = data.stats?.uniqueUsers || 1; // Avoid division by zero
        const ratio = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0;

        setStats({
          totalSessions,
          uniqueUsers,
          ratio,
          health: data.stats?.health || 'unknown'
        });
        setError(false);
      } catch (err) {
        console.error('Failed to fetch session stats:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionStats();
    const interval = setInterval(fetchSessionStats, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Don't render if loading, error, or no stats
  if (loading || error || !stats) {
    return null;
  }

  const isLeaking = stats.ratio > LEAK_THRESHOLD;
  const statusColor = isLeaking ? '#ef4444' : '#22c55e'; // Red for leak, green for healthy
  const statusLabel = isLeaking 
    ? `⚠️ Session Leak Detected (${stats.totalSessions} sessions / ${stats.uniqueUsers} users = ${stats.ratio.toFixed(2)})`
    : `✓ Sessions Healthy (${stats.totalSessions} sessions / ${stats.uniqueUsers} users)`;

  return (
    <Tooltip title={statusLabel} arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: isLeaking ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          cursor: 'help',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: isLeaking ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)',
          }
        }}
      >
        <Activity
          size={16}
          style={{
            color: statusColor,
            animation: isLeaking ? 'pulse 1s ease-in-out infinite' : 'none'
          }}
        />
      </Box>
    </Tooltip>
  );
};

export default SessionPulseIndicator;
