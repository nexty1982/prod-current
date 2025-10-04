import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { adminAPI } from '../../admin.api.ts';
import SDLCBackupPanel from './SDLCBackupPanel.tsx';

interface NFSConfig {
  enabled: boolean;
  nfsServerIP: string;
  remotePath: string;
  mountTarget: string;
  persistMount: boolean;
}

interface MountStatus {
  mounted: boolean;
  mountInfo?: string;
}

interface DiskSpace {
  total: string;
  used: string;
  available: string;
  usePercent: string;
}

interface BackupLog {
  timestamp: string;
  level: string;
  message: string;
}

const NFSBackupConfig: React.FC = () => {
  const [config, setConfig] = useState<NFSConfig>({
    enabled: false,
    nfsServerIP: '',
    remotePath: '',
    mountTarget: '/mnt/orthodox-nfs-backup',
    persistMount: false,
  });
  
  const [mountStatus, setMountStatus] = useState<MountStatus>({ mounted: false });
  const [diskSpace, setDiskSpace] = useState<DiskSpace | null>(null);
  const [recentBackups, setRecentBackups] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Load configuration on component mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.nfsBackup.getConfig();
      
      if (response.success) {
        setConfig(response.config);
        setMountStatus(response.mountStatus);
        setDiskSpace(response.diskSpace);
      }
    } catch (err: any) {
      setError('Failed to load NFS configuration');
      console.error('Error loading NFS config:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await adminAPI.nfsBackup.getStatus();
      
      if (response.success) {
        setMountStatus(response.mountStatus);
        setDiskSpace(response.diskSpace);
        setRecentBackups(response.recentBackups || []);
      }
    } catch (err: any) {
      console.error('Error loading NFS status:', err);
    }
  };

  const handleConfigChange = (field: keyof NFSConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!config.nfsServerIP) {
      return 'NFS Server IP is required';
    }
    
    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(config.nfsServerIP)) {
      return 'Invalid NFS Server IP address';
    }
    
    if (!config.remotePath) {
      return 'Remote Path is required';
    }
    
    if (!config.remotePath.startsWith('/')) {
      return 'Remote Path must start with /';
    }
    
    if (!config.mountTarget) {
      return 'Mount Target is required';
    }
    
    if (!config.mountTarget.startsWith('/')) {
      return 'Mount Target must start with /';
    }
    
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await adminAPI.nfsBackup.updateConfig(config);
      
      if (response.success) {
        setSuccess('NFS configuration saved successfully');
        await loadStatus(); // Refresh status after save
      } else {
        setError(response.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.nfsServerIP || !config.remotePath) {
      setError('Please enter NFS Server IP and Remote Path before testing');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setSuccess(null);
      
      const response = await adminAPI.nfsBackup.testConnection(config.nfsServerIP, config.remotePath);
      
      if (response.success) {
        setSuccess(response.message || 'NFS connection test successful');
      } else {
        setError(response.message || response.error || 'NFS connection test failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'NFS connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleMount = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await adminAPI.nfsBackup.mount();
      
      if (response.success) {
        setSuccess('NFS share mounted successfully');
        await loadStatus();
      } else {
        setError(response.error || 'Failed to mount NFS share');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mount NFS share');
    } finally {
      setLoading(false);
    }
  };

  const handleUnmount = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await adminAPI.nfsBackup.unmount();
      
      if (response.success) {
        setSuccess('NFS share unmounted successfully');
        await loadStatus();
      } else {
        setError(response.error || 'Failed to unmount NFS share');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unmount NFS share');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!config.enabled) return 'default';
    return mountStatus.mounted ? 'success' : 'error';
  };

  const getStatusText = () => {
    if (!config.enabled) return 'Disabled';
    return mountStatus.mounted ? 'Mounted' : 'Not Mounted';
  };

  const getStatusIcon = () => {
    if (!config.enabled) return <SettingsIcon />;
    return mountStatus.mounted ? <CheckCircleIcon /> : <ErrorIcon />;
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h5" component="h2">
              Remote NFS Backup Configuration
            </Typography>
          </Box>

          {/* Status Display */}
          <Box display="flex" alignItems="center" mb={3}>
            <Chip
              icon={getStatusIcon()}
              label={getStatusText()}
              color={getStatusColor()}
              variant="outlined"
              sx={{ mr: 2 }}
            />
            <Tooltip title="Refresh Status">
              <IconButton onClick={loadStatus} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Configuration Form */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="NFS Server IP"
                value={config.nfsServerIP}
                onChange={(e) => handleConfigChange('nfsServerIP', e.target.value)}
                placeholder="192.168.1.230"
                disabled={loading}
                helperText="Enter the IP address of your NFS server"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Remote Path"
                value={config.remotePath}
                onChange={(e) => handleConfigChange('remotePath', e.target.value)}
                placeholder="/nfs/backup"
                disabled={loading}
                helperText="Enter the NFS export path"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mount Target (Optional)"
                value={config.mountTarget}
                onChange={(e) => handleConfigChange('mountTarget', e.target.value)}
                placeholder="/mnt/orthodox-nfs-backup"
                disabled={loading}
                helperText="Local mount point for the NFS share"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" height="100%">
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.persistMount}
                      onChange={(e) => handleConfigChange('persistMount', e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Persist Mount (add to /etc/fstab)"
                />
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={testing || loading || !config.nfsServerIP || !config.remotePath}
              startIcon={testing ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <SettingsIcon />}
            >
              {loading ? 'Saving...' : 'Apply Settings'}
            </Button>
            
            {config.enabled && (
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleMount}
                  disabled={loading || mountStatus.mounted}
                  startIcon={<CloudDownloadIcon />}
                >
                  Mount Share
                </Button>
                
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleUnmount}
                  disabled={loading || !mountStatus.mounted}
                  startIcon={<CloudUploadIcon />}
                >
                  Unmount Share
                </Button>
              </>
            )}
            
            <Button
              variant="text"
              onClick={() => setShowLogs(true)}
              disabled={recentBackups.length === 0}
            >
              View Recent Backups ({recentBackups.length})
            </Button>
          </Box>

          {/* Enable/Disable Toggle */}
          <Box mt={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                  disabled={loading}
                />
              }
              label="Enable NFS Remote Backup"
            />
          </Box>

          {/* Disk Space Display */}
          {mountStatus.mounted && diskSpace && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Disk Space
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">Total</Typography>
                  <Typography variant="body1">{diskSpace.total}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">Used</Typography>
                  <Typography variant="body1">{diskSpace.used}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">Available</Typography>
                  <Typography variant="body1">{diskSpace.available}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">Usage</Typography>
                  <Typography variant="body1">{diskSpace.usePercent}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Mount Information */}
          {mountStatus.mounted && mountStatus.mountInfo && (
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                Mount Info: {mountStatus.mountInfo}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Recent Backups Dialog */}
      <Dialog open={showLogs} onClose={() => setShowLogs(false)} maxWidth="md" fullWidth>
        <DialogTitle>Recent Backup Activity</DialogTitle>
        <DialogContent>
          {recentBackups.length > 0 ? (
            <List>
              {recentBackups.map((log, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={log.message}
                    secondary={`${log.timestamp} [${log.level}]`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="textSecondary">No recent backup activity found</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogs(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* SDLC Backup Management */}
      <Box mt={3}>
        <SDLCBackupPanel />
      </Box>
    </Box>
  );
};

export default NFSBackupConfig; 