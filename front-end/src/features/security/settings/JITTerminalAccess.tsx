/**
 * JITTerminalAccess Component
 * 
 * Access control and management page for JIT (Just-In-Time) Terminal sessions.
 * Provides a secure interface for super_admin users to request and manage terminal access.
 * 
 * Route: /settings/jit-terminal
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { JITTerminal } from '@/components/terminal/JITTerminal';
import { useAuth } from '@/hooks/useAuth';

interface JITSession {
  id: string;
  userId: string;
  userName: string;
  startTime: number;
  expiryTime: number;
  isActive: boolean;
  commandCount: number;
}

const JITTerminalAccess: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<JITSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [duration, setDuration] = useState<number>(30); // minutes

  // Fetch active sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/jit/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // Request new session
  const requestSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/jit/request-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: duration, // minutes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request session');
      }
      
      const data = await response.json();
      setSelectedSessionId(data.sessionId);
      setTerminalOpen(true);
      setRequestDialogOpen(false);
      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request session');
    } finally {
      setLoading(false);
    }
  };

  // End session
  const endSession = async (sessionId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/jit/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to end session');
      }
      
      fetchSessions();
      if (selectedSessionId === sessionId) {
        setTerminalOpen(false);
        setSelectedSessionId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh sessions every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const activeSessions = sessions.filter(s => s.isActive);
  const expiredSessions = sessions.filter(s => !s.isActive);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TerminalIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" gutterBottom>
                JIT Terminal Access
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Request and manage secure terminal sessions
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<TerminalIcon />}
            onClick={() => setRequestDialogOpen(true)}
            disabled={loading}
          >
            Request New Session
          </Button>
        </Box>

        {/* Security Warning */}
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Security Notice:</strong> JIT Terminal sessions provide direct server access and are monitored.
            All commands and outputs are logged for security and compliance purposes. Use responsibly.
          </Typography>
        </Alert>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Active Sessions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Active Sessions
              </Typography>
              <IconButton onClick={fetchSessions} disabled={loading} size="small">
                <RefreshIcon />
              </IconButton>
            </Box>
            
            {loading && sessions.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : activeSessions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No active sessions
              </Typography>
            ) : (
              <List>
                {activeSessions.map((session) => (
                  <ListItem key={session.id}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            Session {session.id.substring(0, 8)}
                          </Typography>
                          <Chip label="Active" color="success" size="small" />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Started: {formatTime(session.startTime)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Expires: {formatTime(session.expiryTime)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Commands: {session.commandCount}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Open Terminal">
                        <IconButton
                          edge="end"
                          onClick={() => {
                            setSelectedSessionId(session.id);
                            setTerminalOpen(true);
                          }}
                        >
                          <TerminalIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="End Session">
                        <IconButton
                          edge="end"
                          onClick={() => endSession(session.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon />
              About JIT Terminal Access
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              JIT (Just-In-Time) Terminal Access provides temporary, secure terminal sessions for super_admin users.
              Sessions are time-limited and fully monitored for security compliance.
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>All sessions are logged and audited</li>
              <li>Sessions expire automatically after the requested duration</li>
              <li>Only one active session per user is allowed</li>
              <li>All commands and outputs are recorded</li>
            </Box>
          </CardContent>
        </Card>
      </Paper>

      {/* Request Session Dialog */}
      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request New Terminal Session</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Session Duration</InputLabel>
            <Select
              value={duration}
              label="Session Duration"
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <MenuItem value={15}>15 minutes</MenuItem>
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={60}>1 hour</MenuItem>
              <MenuItem value={120}>2 hours</MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            The session will automatically expire after {formatDuration(duration)}.
            All activity will be logged for security purposes.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button onClick={requestSession} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Request Session'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terminal Dialog */}
      {selectedSessionId && user && (
        <JITTerminal
          isOpen={terminalOpen}
          onClose={() => {
            setTerminalOpen(false);
            setSelectedSessionId(null);
          }}
          sessionId={selectedSessionId}
          user={{
            id: user.id?.toString() || '',
            name: user.name || user.username || 'Unknown',
            role: user.role || 'super_admin',
          }}
        />
      )}
    </Box>
  );
};

export default JITTerminalAccess;
