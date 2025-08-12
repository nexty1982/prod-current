// JIT Terminal Access Settings Page
// Provides interface for super_admin users to create and manage JIT terminal sessions

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Grid,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Timer as TimerIcon,
  History as HistoryIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import JITTerminal from '../../components/terminal/JITTerminal';

interface JITSession {
  id: string;
  userId: string;
  userName: string;
  startTime: number;
  expiryTime: number;
  isActive: boolean;
  commandCount: number;
  lastActivity: number;
}

interface JITConfig {
  enabled: boolean;
  allowInProduction: boolean;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  requireReauth: boolean;
  logCommands: boolean;
  logDirectory: string;
}

const JITTerminalAccess: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  
  const [sessions, setSessions] = useState<JITSession[]>([]);
  const [config, setConfig] = useState<JITConfig>({
    enabled: true,
    allowInProduction: false,
    sessionTimeoutMinutes: 10,
    maxConcurrentSessions: 3,
    requireReauth: false,
    logCommands: true,
    logDirectory: '/var/log/orthodmetrics/'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [reauthPassword, setReauthPassword] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Check access permissions
  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>
            JIT Terminal Access is restricted to super_admin users only.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Load configuration and sessions
  useEffect(() => {
    loadConfig();
    loadSessions();
    
    // Refresh sessions every 30 seconds
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/jit/config');
      if (response.ok) {
        const configData = await response.json();
        setConfig(configData);
      }
    } catch (error) {
      console.error('Failed to load JIT config:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/jit/sessions');
      if (response.ok) {
        const sessionsData = await response.json();
        setSessions(sessionsData);
      }
    } catch (error) {
      console.error('Failed to load JIT sessions:', error);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/jit/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setError(null);
        // Show success message
      } else {
        setError('Failed to save configuration');
      }
    } catch (error) {
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const requestBody: any = {
        timeoutMinutes: config.sessionTimeoutMinutes
      };

      // Add re-authentication if required
      if (config.requireReauth && reauthPassword) {
        requestBody.password = reauthPassword;
      }

      const response = await fetch('/api/jit/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const sessionData = await response.json();
        setCurrentSessionId(sessionData.sessionId);
        setShowTerminal(true);
        setShowCreateDialog(false);
        setReauthPassword('');
        loadSessions();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create session');
      }
    } catch (error) {
      setError('Failed to create terminal session');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/jit/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        loadSessions();
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };

  const downloadSessionLog = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/jit/session-log/${sessionId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `jit-session-${sessionId}.log`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download session log:', error);
    }
  };

  const formatTimeRemaining = (expiryTime: number): string => {
    const remaining = Math.max(0, expiryTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isProductionEnvironment = (): boolean => {
    return process.env.NODE_ENV === 'production' || 
           window.location.hostname !== 'localhost';
  };

  // Generate secure session URL for sharing with AI agents or collaborators
  const generateSessionUrl = (sessionId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/admin/jit-session/${sessionId}`;
  };

  // Copy session URL to clipboard
  const copySessionUrl = async (sessionId: string) => {
    try {
      const sessionUrl = generateSessionUrl(sessionId);
      await navigator.clipboard.writeText(sessionUrl);
      setCopySuccess(sessionId);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setCopySuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy session URL:', error);
      setError('Failed to copy session URL to clipboard');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TerminalIcon />
        JIT Terminal Access
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Just-In-Time terminal access provides temporary, monitored shell sessions with elevated privileges.
        All sessions are logged and automatically expire after the configured timeout period.
      </Typography>

      {/* Security Warning */}
      {isProductionEnvironment() && !config.allowInProduction && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Production Environment Detected:</strong> JIT Terminal is disabled in production 
            for security reasons. Enable "Allow in Production" to override this safety measure.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {copySuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Session URL copied to clipboard! Share this secure link with AI agents or collaborators:
          <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #ddd' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
              {generateSessionUrl(copySuccess)}
            </Typography>
          </Box>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon />
                Configuration
              </Typography>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enabled}
                      onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    />
                  }
                  label="Enable JIT Terminal Access"
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.allowInProduction}
                      onChange={(e) => setConfig(prev => ({ ...prev, allowInProduction: e.target.checked }))}
                    />
                  }
                  label="Allow in Production Environment"
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.requireReauth}
                      onChange={(e) => setConfig(prev => ({ ...prev, requireReauth: e.target.checked }))}
                    />
                  }
                  label="Require Re-authentication"
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.logCommands}
                      onChange={(e) => setConfig(prev => ({ ...prev, logCommands: e.target.checked }))}
                    />
                  }
                  label="Log All Commands"
                />
              </Box>

              <TextField
                fullWidth
                label="Session Timeout (Minutes)"
                type="number"
                value={config.sessionTimeoutMinutes}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  sessionTimeoutMinutes: parseInt(e.target.value) || 10 
                }))}
                inputProps={{ min: 1, max: 60 }}
                sx={{ mt: 2 }}
              />

              <TextField
                fullWidth
                label="Max Concurrent Sessions"
                type="number"
                value={config.maxConcurrentSessions}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  maxConcurrentSessions: parseInt(e.target.value) || 3 
                }))}
                inputProps={{ min: 1, max: 10 }}
                sx={{ mt: 2 }}
              />

              <TextField
                fullWidth
                label="Log Directory"
                value={config.logDirectory}
                onChange={(e) => setConfig(prev => ({ ...prev, logDirectory: e.target.value }))}
                sx={{ mt: 2 }}
              />
            </CardContent>

            <CardActions>
              <Button 
                variant="contained" 
                onClick={saveConfig}
                disabled={loading}
              >
                Save Configuration
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Session Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimerIcon />
                  Active Sessions ({sessions.filter(s => s.isActive).length})
                </Typography>
                
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateDialog(true)}
                  disabled={
                    !config.enabled || 
                    (isProductionEnvironment() && !config.allowInProduction) ||
                    sessions.filter(s => s.isActive).length >= config.maxConcurrentSessions
                  }
                >
                  New Session
                </Button>
              </Box>

              {sessions.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No active sessions
                </Typography>
              ) : (
                <List>
                  {sessions.map((session) => (
                    <React.Fragment key={session.id}>
                      <ListItem>
                        <ListItemIcon>
                          <TerminalIcon color={session.isActive ? 'primary' : 'disabled'} />
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                Session {session.id.substring(0, 8)}
                              </Typography>
                              {session.isActive && (
                                <Chip 
                                  label={formatTimeRemaining(session.expiryTime)} 
                                  size="small" 
                                  color="primary"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                User: {session.userName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Started: {new Date(session.startTime).toLocaleString()}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Commands: {session.commandCount}
                              </Typography>
                            </Box>
                          }
                        />
                        
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {session.isActive && (
                              <Tooltip title="Connect to Session">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setCurrentSessionId(session.id);
                                    setShowTerminal(true);
                                  }}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            )}

                            {session.isActive && (
                              <Tooltip title={copySuccess === session.id ? "URL Copied!" : "Copy Session URL for AI Agent"}>
                                <IconButton
                                  size="small"
                                  color={copySuccess === session.id ? "success" : "primary"}
                                  onClick={() => copySessionUrl(session.id)}
                                  sx={{
                                    bgcolor: copySuccess === session.id ? 'success.light' : 'transparent',
                                    '&:hover': {
                                      bgcolor: copySuccess === session.id ? 'success.main' : 'primary.light'
                                    }
                                  }}
                                >
                                  <CopyIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            <Tooltip title="Download Session Log">
                              <IconButton
                                size="small"
                                onClick={() => downloadSessionLog(session.id)}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            
                            {session.isActive && (
                              <Tooltip title="Terminate Session">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => terminateSession(session.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Security Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              Security & Compliance Information
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>Session Monitoring</Typography>
                <Typography variant="body2" color="text.secondary">
                  All terminal sessions are monitored and logged. Every command entered and 
                  its output are recorded for security and compliance purposes.
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>Automatic Expiry</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sessions automatically expire after the configured timeout period. 
                  Inactive sessions are terminated to prevent security risks.
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>Audit Trail</Typography>
                <Typography variant="body2" color="text.secondary">
                  Complete audit trails are maintained including session metadata, 
                  command history, and user information for compliance reporting.
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Session URL Sharing</Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Copy URL</strong> feature generates secure session access links (format: <code>/admin/jit-session/[sessionId]</code>) 
                  for sharing with AI agents or collaborators. URLs only work for active sessions and require proper authorization.
                  Session access is restricted to super_admin users and expires with the session timeout.
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create JIT Terminal Session</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              You are about to create a monitored terminal session with elevated privileges. 
              All commands will be logged for security purposes.
            </Typography>
          </Alert>

          <Typography variant="body2" sx={{ mb: 2 }}>
            Session will automatically expire in <strong>{config.sessionTimeoutMinutes} minutes</strong>.
          </Typography>

          {config.requireReauth && (
            <TextField
              fullWidth
              type="password"
              label="Re-enter Password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              sx={{ mt: 2 }}
              helperText="Re-authentication required for security"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={createSession}
            disabled={loading || (config.requireReauth && !reauthPassword)}
          >
            Create Session
          </Button>
        </DialogActions>
      </Dialog>

      {/* JIT Terminal */}
      {showTerminal && currentSessionId && (
        <JITTerminal
          isOpen={showTerminal}
          onClose={() => {
            setShowTerminal(false);
            setCurrentSessionId(null);
            loadSessions();
          }}
          sessionId={currentSessionId}
          user={{
            id: user?.id || 'unknown',
            name: user?.name || 'Unknown User',
            role: user?.role || 'user'
          }}
        />
      )}
    </Box>
  );
};

export default JITTerminalAccess; 