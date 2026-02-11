/**
 * Admin Floating HUD Component
 * Displays system status information for Super Admin users
 * Features: Draggable, auto-polling, version mismatch alerts
 */

import { Box, Button, Chip, Paper, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { Activity, Wrench, AlertCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
// DISABLED: Socket.IO admin log monitoring — backend socketService removed (PM2 dependency)
// import { io, Socket } from 'socket.io-client';
type Socket = any;

interface SystemStatus {
  version_string?: string;
  last_git_sha?: string;
  church_count?: number;
  version_mismatch?: boolean;
  uptime?: string;
  environment?: string;
}

interface SessionStats {
  totalSessions: number;
  uniqueUsers: number;
  ratio: number;
  health: string;
}

interface MaintenanceStatus {
  enabled: boolean;
  message?: string;
}

interface LogEntry {
  type: 'error' | 'warning';
  message: string;
  timestamp: string;
  id: string;
}

interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  isMonitoring: boolean;
}

const DraggableHUD = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: 80,
  right: 16,
  zIndex: 9999,
  padding: theme.spacing(2),
  width: 280,
  cursor: 'move',
  userSelect: 'none',
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a2e' : '#ffffff',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
  boxShadow: theme.palette.mode === 'dark' 
    ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
    : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  borderRadius: 12,
  transition: 'box-shadow 0.2s ease',
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

const AdminFloatingHUD: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHidden, setIsHidden] = useState(false);
  const [logStats, setLogStats] = useState<LogStats>({ total: 0, errors: 0, warnings: 0, isMonitoring: false });
  const [logIssues, setLogIssues] = useState<LogEntry[]>([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const LEAK_THRESHOLD = 1.1;

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get('/api/system/status');
        setStatus(res.data);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('HUD Fetch Failed', err);
        }
      }
    };

    const fetchSessionStats = async () => {
      try {
        const res = await axios.get('/api/admin/session-stats');
        const data = res.data;
        const totalSessions = data.stats?.totalSessions || 0;
        const uniqueUsers = data.stats?.uniqueUsers || 1;
        const ratio = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0;
        setSessionStats({
          totalSessions,
          uniqueUsers,
          ratio,
          health: data.stats?.health || 'unknown'
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Session stats fetch failed', err);
        }
      }
    };

    const fetchMaintenanceStatus = async () => {
      try {
        const res = await axios.get('/api/maintenance/status');
        setIsInMaintenance(res.data.enabled || false);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Maintenance status fetch failed', err);
        }
      }
    };

    fetchStatus();
    fetchSessionStats();
    fetchMaintenanceStatus();
    
    const statusInterval = setInterval(fetchStatus, 10000);
    const sessionInterval = setInterval(fetchSessionStats, 30000);
    const maintenanceInterval = setInterval(fetchMaintenanceStatus, 15000);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(sessionInterval);
      clearInterval(maintenanceInterval);
    };
  }, []);

  // DISABLED: Socket.IO admin log monitoring — backend socketService removed (PM2 dependency)
  // Real-time log alerts are no longer available. Use journalctl on the server instead.

  // DISABLED: Log archive — backend /api/admin/logs routes removed (PM2 dependency)
  const handleArchiveLogs = async () => {
    console.log('[AdminHUD] Log archiving disabled — use journalctl on the server');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hudRef.current) return;
    
    const rect = hudRef.current.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - offset.x;
    const newY = e.clientY - offset.y;

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    // Use a small timeout to prevent click event from firing after drag
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);

  const handleSyncTasks = async () => {
    try {
      await axios.post('/api/admin/sync-tasks');
      alert('Export to Sheets initiated');
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Export failed - check console');
    }
  };

  const toggleMaintenanceMode = async (enable: boolean) => {
    setIsToggling(true);
    try {
      const res = await axios.post('/api/maintenance/toggle', { enabled: enable });
      setIsInMaintenance(res.data.enabled);
    } catch (err) {
      console.error('Failed to toggle maintenance mode:', err);
      alert('Failed to toggle maintenance mode');
    } finally {
      setIsToggling(false);
    }
  };

  if (!status) return null;

  // Show toggle button when hidden
  if (isHidden) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 80,
          right: 16,
          zIndex: 9999,
        }}
      >
        <Button
          onClick={() => setIsHidden(false)}
          variant="contained"
          size="small"
          sx={{
            minWidth: 'auto',
            px: 1.5,
            py: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2563eb' : '#3b82f6',
            color: '#fff',
            textTransform: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1d4ed8' : '#2563eb',
            },
          }}
        >
          👁️ Show HUD
        </Button>
      </Box>
    );
  }

  const hudStyle = position.x !== 0 || position.y !== 0
    ? {
        left: position.x,
        top: position.y,
        right: 'auto',
        bottom: 'auto',
      }
    : {};

  return (
    <DraggableHUD
      ref={hudRef}
      onMouseDown={handleMouseDown}
      sx={{
        ...hudStyle,
        border: (theme) => status.version_mismatch 
          ? '2px solid #ef4444' 
          : `2px solid ${theme.palette.mode === 'dark' ? '#3b82f6' : '#60a5fa'}`,
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1a1a2e' : '#ffffff',
        color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          pb: 1,
          mb: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: '10px',
            color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6',
            letterSpacing: '0.5px',
          }}
        >
          SUPER ADMIN HUD
        </Typography>
        
        <Tooltip title="Hide HUD" arrow>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHidden(true);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: '12px',
              opacity: 0.6,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            ✕
          </button>
        </Tooltip>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* Session Health Indicator */}
          {sessionStats && (
            <Tooltip
              title={
                sessionStats.ratio > LEAK_THRESHOLD
                  ? `⚠️ Session Leak (${sessionStats.totalSessions}/${sessionStats.uniqueUsers} = ${sessionStats.ratio.toFixed(2)})`
                  : `✓ Healthy (${sessionStats.totalSessions}/${sessionStats.uniqueUsers})`
              }
              arrow
              PopperProps={{
                sx: { zIndex: 10000 }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: sessionStats.ratio > LEAK_THRESHOLD
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(34, 197, 94, 0.2)',
                  cursor: 'help',
                }}
              >
                <Activity
                  size={12}
                  style={{
                    color: sessionStats.ratio > LEAK_THRESHOLD ? '#ef4444' : '#22c55e',
                  }}
                />
              </Box>
            </Tooltip>
          )}

          {/* LIVE/MAINT Status */}
          <Tooltip 
            title={isInMaintenance ? 'Disable Maintenance' : 'Enable Maintenance'} 
            arrow
            PopperProps={{
              sx: { zIndex: 10000 }
            }}
          >
            <button
              onClick={() => toggleMaintenanceMode(!isInMaintenance)}
              disabled={isToggling}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                cursor: isToggling ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isInMaintenance ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                color: isInMaintenance ? '#f97316' : '#22c55e',
                border: `1.5px solid ${isInMaintenance ? 'rgba(249, 115, 22, 0.5)' : 'rgba(34, 197, 94, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: isToggling ? 0.6 : 1,
              }}
            >
              <Wrench size={10} style={{ animation: isToggling || isInMaintenance ? 'spin 1s linear infinite' : 'none' }} />
              {isInMaintenance ? 'MAINT' : 'LIVE'}
            </button>
          </Tooltip>

          {status.version_mismatch && (
            <Chip
              label="MISMATCH"
              size="small"
              sx={{
                height: 16,
                fontSize: '8px',
                fontWeight: 700,
                backgroundColor: '#dc2626',
                color: '#fff',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Status Info */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            Ver:
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b' }}>
            {status.version_string || 'N/A'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            SHA:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '9px',
              fontFamily: 'monospace',
              color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569',
            }}
          >
            {status.last_git_sha?.substring(0, 8) || 'N/A'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            Churches:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#22c55e',
            }}
          >
            {status.church_count || 0}
          </Typography>
        </Box>

        {status.environment && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
              Env:
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b' }}>
              {status.environment}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Backend Monitor */}
      <Box sx={{ 
        mb: 2, 
        pt: 1.5, 
        borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', 
            fontSize: '10px',
            fontWeight: 600,
            mb: 1,
            display: 'block'
          }}
        >
          BACKEND MONITOR
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {/* orthodox-backend Status Pill */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              borderRadius: '12px',
              background: logStats.isMonitoring 
                ? 'linear-gradient(135deg, #1ED760 0%, #17b350 100%)'
                : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 600,
              flex: 1,
            }}
          >
            <span>🤖</span>
            <span>orthodox-backend</span>
            
            {/* Floating Counter Badge */}
            {logStats.total > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  bgcolor: '#17b350',
                  border: '2px solid #fff',
                  borderRadius: '10px',
                  px: 0.75,
                  py: 0.25,
                  fontSize: '9px',
                  fontWeight: 700,
                  minWidth: '18px',
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                {logStats.total}
              </Box>
            )}
          </Box>

          {/* Archive Button */}
          <Tooltip title="Archive logs to file" arrow>
            <button
              onClick={handleArchiveLogs}
              disabled={isArchiving || logStats.total === 0}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: isArchiving || logStats.total === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                opacity: isArchiving || logStats.total === 0 ? 0.5 : 1,
              }}
            >
              {isArchiving ? '...' : 'ARCHIVE'}
            </button>
          </Tooltip>
        </Box>

        {/* Error/Warning Stats */}
        {logStats.total > 0 && (
          <Box sx={{ display: 'flex', gap: 1, fontSize: '10px' }}>
            {logStats.errors > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertCircle size={12} style={{ color: '#ef4444' }} />
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
                  {logStats.errors} error{logStats.errors !== 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
            {logStats.warnings > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertCircle size={12} style={{ color: '#f59e0b' }} />
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>
                  {logStats.warnings} warning{logStats.warnings !== 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ pt: 1.5, borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
        <Button
          onClick={handleSyncTasks}
          fullWidth
          variant="contained"
          size="small"
          sx={{
            py: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: '#2563eb',
            color: '#fff',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#1d4ed8',
              boxShadow: 'none',
            },
          }}
        >
          📤 EXPORT TO SHEETS
        </Button>
      </Box>
    </DraggableHUD>
  );
};

export default AdminFloatingHUD;
