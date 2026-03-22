/**
 * AccountSessionsPage — View and manage active login sessions.
 * Uses GET/DELETE /api/user/sessions, POST /api/user/sessions/revoke-others.
 *
 * Accessible to all authenticated users.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import ComputerIcon from '@mui/icons-material/Computer';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import TabletIcon from '@mui/icons-material/Tablet';
import TerminalIcon from '@mui/icons-material/Terminal';
import PublicIcon from '@mui/icons-material/Public';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SecurityIcon from '@mui/icons-material/Security';
import LogoutIcon from '@mui/icons-material/Logout';

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionData {
  id: number;
  is_current: boolean;
  status: 'active' | 'revoked' | 'expired';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION } from './accountConstants';
import { sessionsApi, extractErrorMessage } from './accountApi';

interface ConfirmDialog {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

// ── UA Parsing ─────────────────────────────────────────────────────────────

function parseUserAgent(ua: string | null): { browser: string; os: string; deviceType: 'desktop' | 'mobile' | 'tablet' | 'cli' | 'unknown' } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', deviceType: 'unknown' };

  // CLI tools
  if (/^curl\//i.test(ua)) return { browser: 'curl (CLI)', os: 'Command Line', deviceType: 'cli' };
  if (/^python/i.test(ua)) return { browser: 'Python HTTP', os: 'Command Line', deviceType: 'cli' };
  if (/^node/i.test(ua)) return { browser: 'Node.js', os: 'Command Line', deviceType: 'cli' };
  if (/^wget/i.test(ua)) return { browser: 'wget (CLI)', os: 'Command Line', deviceType: 'cli' };

  // Browser detection
  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  // Headless browser
  if (/HeadlessChrome/i.test(ua)) browser = 'Headless Chrome';

  // OS detection
  let os = 'Unknown OS';
  if (/Windows NT 10/i.test(ua)) os = 'Windows';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';

  // Device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'cli' | 'unknown' = 'desktop';
  if (/Mobile/i.test(ua) || /Android.*Mobile/i.test(ua) || /iPhone/i.test(ua)) deviceType = 'mobile';
  else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) deviceType = 'tablet';

  return { browser, os, deviceType };
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case 'mobile': return <PhoneAndroidIcon fontSize="small" />;
    case 'tablet': return <TabletIcon fontSize="small" />;
    case 'cli': return <TerminalIcon fontSize="small" />;
    default: return <ComputerIcon fontSize="small" />;
  }
}

function maskIp(ip: string | null): string {
  if (!ip) return 'Unknown';
  // Show full IP for private ranges, mask last octet for public
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '127.0.0.1' || ip === '::1') {
    return ip;
  }
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }
  return ip;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ── Component ──────────────────────────────────────────────────────────────

const AccountSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<number | 'all' | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ open: false, title: '', message: '', onConfirm: () => {} });

  // ── Load sessions ──

  const fetchSessions = useCallback(async () => {
    try {
      const sessions = await sessionsApi.getSessions();
      setSessions(sessions as SessionData[]);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Derived data ──

  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);
  const activeOtherSessions = otherSessions.filter((s) => s.status === 'active');

  // ── Revoke single session ──

  const handleRevokeSingle = useCallback((session: SessionData) => {
    const { browser, os } = parseUserAgent(session.user_agent);
    setConfirmDialog({
      open: true,
      title: 'Revoke Session',
      message: `This will sign out the ${browser} on ${os} session (signed in ${formatRelativeTime(session.created_at)}). The device will need to log in again.`,
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }));
        setRevoking(session.id);
        try {
          await sessionsApi.revokeSession(String(session.id));
          setSnackbar({ open: true, message: 'Session revoked successfully.', severity: 'success' });
          fetchSessions();
        } catch (err: any) {
          setSnackbar({ open: true, message: err.message || 'Failed to revoke session.', severity: 'error' });
        } finally {
          setRevoking(null);
        }
      },
    });
  }, [fetchSessions]);

  // ── Revoke all others ──

  const handleRevokeAll = useCallback(() => {
    setConfirmDialog({
      open: true,
      title: 'Sign Out All Other Sessions',
      message: `This will revoke ${activeOtherSessions.length} other active session(s). Those devices will need to log in again. Your current session will not be affected.`,
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }));
        setRevoking('all');
        try {
          const data = await sessionsApi.revokeOtherSessions();
          const count = data.data?.revoked_count || 0;
          setSnackbar({ open: true, message: `Revoked ${count} session(s).`, severity: 'success' });
          fetchSessions();
        } catch (err: any) {
          setSnackbar({ open: true, message: err.message || 'Failed to revoke sessions.', severity: 'error' });
        } finally {
          setRevoking(null);
        }
      },
    });
  }, [activeOtherSessions.length, fetchSessions]);

  // ── Loading state ──

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Render ──

  return (
    <>
      {/* Header */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <SecurityIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Active Sessions
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Manage the devices and browsers that are currently signed in to your account.
            If you notice any sessions you don&apos;t recognize, revoke them immediately and change your password.
          </Typography>
        </CardContent>
      </Card>

      {/* Current Session */}
      {currentSession && (
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderColor: 'primary.main',
            borderWidth: 2,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <DevicesIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Current Session
                </Typography>
              </Box>
              <Chip label="This Device" color="primary" size="small" />
            </Box>
            <SessionDetails session={currentSession} />
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <DevicesIcon color="action" />
              <Typography variant="subtitle1" fontWeight={600}>
                Other Sessions
              </Typography>
              {activeOtherSessions.length > 0 && (
                <Chip
                  label={`${activeOtherSessions.length} active`}
                  size="small"
                  color="default"
                  variant="outlined"
                />
              )}
            </Box>
            {activeOtherSessions.length > 1 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={handleRevokeAll}
                disabled={revoking !== null}
              >
                Sign Out All Others
              </Button>
            )}
          </Box>

          {otherSessions.length === 0 ? (
            <Box textAlign="center" py={4}>
              <SecurityIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                No other sessions found.
              </Typography>
              <Typography variant="body2" color="text.disabled" mt={0.5}>
                You are only signed in on this device.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0} divider={<Divider />}>
              {otherSessions.map((session) => (
                <Box
                  key={session.id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  py={2}
                  sx={{ opacity: session.status !== 'active' ? 0.6 : 1 }}
                >
                  <SessionDetails session={session} />
                  <Box sx={{ ml: 2, flexShrink: 0 }}>
                    {session.status === 'active' ? (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRevokeSingle(session)}
                        disabled={revoking !== null}
                        startIcon={revoking === session.id ? <CircularProgress size={16} /> : <LogoutIcon />}
                      >
                        {revoking === session.id ? 'Revoking...' : 'Revoke'}
                      </Button>
                    ) : (
                      <Chip
                        label={session.status === 'revoked' ? 'Revoked' : 'Expired'}
                        size="small"
                        color={session.status === 'revoked' ? 'error' : 'default'}
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <Alert severity="info" sx={{ mt: 3 }} icon={<SecurityIcon />}>
        Sessions expire automatically after 30 days of inactivity.
        For security, we recommend periodically reviewing your active sessions and revoking any you don&apos;t recognize.
      </Alert>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((d) => ({ ...d, open: false }))}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button onClick={confirmDialog.onConfirm} color="error" variant="contained">
            Revoke
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={SNACKBAR_DURATION}
        onClose={() => setSnackbar(SNACKBAR_CLOSED)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(SNACKBAR_CLOSED)}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ── Session Details Sub-component ──────────────────────────────────────────

const SessionDetails: React.FC<{ session: SessionData }> = ({ session }) => {
  const { browser, os, deviceType } = parseUserAgent(session.user_agent);

  return (
    <Box display="flex" alignItems="flex-start" gap={2} flex={1} minWidth={0}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: session.is_current ? 'primary.light' : 'action.hover',
          color: session.is_current ? 'primary.main' : 'text.secondary',
          flexShrink: 0,
        }}
      >
        {getDeviceIcon(deviceType)}
      </Box>
      <Box minWidth={0}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {browser} on {os}
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 0.5 }}>
          <Tooltip title={`IP Address: ${session.ip_address || 'Unknown'}`}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <PublicIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                {maskIp(session.ip_address)}
              </Typography>
            </Box>
          </Tooltip>
          <Tooltip title={`Signed in: ${formatDateTime(session.created_at)}`}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                Signed in {formatRelativeTime(session.created_at)}
              </Typography>
            </Box>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
};

export default AccountSessionsPage;
