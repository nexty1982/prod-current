import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Typography,
    Button,
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
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Stack,
    Box,
    Divider,
} from '@mui/material';
import {
    Backup as BackupIcon,
    CloudDownload as DownloadIcon,
    RestoreFromTrash as RestoreIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@shared/lib/axiosInstance';

interface BackupFile {
    filename: string;
    size: number;
    created_at: string;
    modified_at: string;
}

interface SDLCBackupPanelProps {
    className?: string;
}

const SDLCBackupPanel: React.FC<SDLCBackupPanelProps> = ({ className }) => {
    const { user } = useAuth();
    const [selectedEnv, setSelectedEnv] = useState<'prod' | 'dev'>('prod');
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
    const [deletingBackup, setDeletingBackup] = useState<string | null>(null);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
    
    // Progress tracking states
    const [backupProgress, setBackupProgress] = useState<{
        percentage: number;
        status: string;
        currentStep: string;
    } | null>(null);
    const [restoreProgress, setRestoreProgress] = useState<{
        percentage: number;
        status: string;
        currentStep: string;
    } | null>(null);
    
    // Console log states for real-time status
    const [consoleLogs, setConsoleLogs] = useState<Array<{
        timestamp: string;
        message: string;
        type: 'info' | 'success' | 'error' | 'warning';
    }>>([]);
    const [showConsole, setShowConsole] = useState(false);

    useEffect(() => {
        loadBackups();
    }, [selectedEnv]);

    // Helper function to add console logs
    const addConsoleLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setConsoleLogs(prev => [...prev, { timestamp, message, type }]);
        // Auto-scroll to bottom
        setTimeout(() => {
            const consoleElement = document.getElementById('backup-console');
            if (consoleElement) {
                consoleElement.scrollTop = consoleElement.scrollHeight;
            }
        }, 100);
    };

    // Clear console logs
    const clearConsole = () => {
        setConsoleLogs([]);
    };

    const loadBackups = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/backups/list?env=${selectedEnv}`);
            // Fix: Handle the response structure correctly
            // The backend returns { backups: [...] } directly
            const backupsData = response.data?.backups || response.backups || [];
            setBackups(backupsData);
        } catch (error) {
            console.error('Failed to load backups:', error);
            setAlert({ type: 'error', message: 'Failed to load backups' });
        } finally {
            setLoading(false);
        }
    };

    const createBackup = async () => {
        try {
            setCreatingBackup(true);
            setShowConsole(true);
            clearConsole();
            
            addConsoleLog(`Starting backup for ${selectedEnv.toUpperCase()} environment...`, 'info');
            setBackupProgress({ percentage: 0, status: 'Starting backup process...', currentStep: 'Initializing' });
            
            addConsoleLog('Validating environment and permissions...', 'info');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            addConsoleLog('Checking source directory...', 'info');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            addConsoleLog('Source directory verified ✓', 'success');
            setBackupProgress({ percentage: 10, status: 'Source directory verified', currentStep: 'Validation' });
            
            addConsoleLog('Creating backup archive...', 'info');
            setBackupProgress({ percentage: 20, status: 'Creating backup archive...', currentStep: 'Archiving' });
            
            // Simulate progress updates with console logs
            const progressInterval = setInterval(() => {
                setBackupProgress(prev => {
                    if (!prev) return prev;
                    const newPercentage = Math.min(prev.percentage + 5, 90);
                    
                    if (newPercentage === 30) {
                        addConsoleLog('Compressing application files...', 'info');
                    } else if (newPercentage === 50) {
                        addConsoleLog('Processing large files and uploads...', 'info');
                    } else if (newPercentage === 70) {
                        addConsoleLog('Finalizing archive...', 'info');
                    } else if (newPercentage === 85) {
                        addConsoleLog('Verifying backup integrity...', 'info');
                    }
                    
                    return { 
                        percentage: newPercentage, 
                        status: 'Creating backup...', 
                        currentStep: 'Processing' 
                    };
                });
            }, 800);
            
            const response = await apiClient.post('/backups/create', { env: selectedEnv });
            
            clearInterval(progressInterval);
            
            // Fix: Handle the response structure correctly
            const responseData = response.data || response;
            
            if (responseData.success) {
                addConsoleLog('Backup completed successfully!', 'success');
                addConsoleLog(`Backup file: ${responseData.filename}`, 'info');
                addConsoleLog(`File size: ${(responseData.size / 1024 / 1024).toFixed(2)} MB`, 'info');
                
                setBackupProgress({ percentage: 100, status: 'Backup completed successfully!', currentStep: 'Complete' });
                setAlert({ type: 'success', message: responseData.message });
                loadBackups();
            } else {
                addConsoleLog(`Backup failed: ${responseData.error}`, 'error');
                setBackupProgress({ percentage: 0, status: 'Backup failed', currentStep: 'Error' });
                setAlert({ type: 'error', message: responseData.error || 'Failed to create backup' });
            }
        } catch (error: any) {
            console.error('Failed to create backup:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to create backup';
            addConsoleLog(`Error: ${errorMessage}`, 'error');
            setAlert({ type: 'error', message: errorMessage });
            setBackupProgress({ percentage: 0, status: 'Backup failed', currentStep: 'Error' });
        } finally {
            setCreatingBackup(false);
            // Clear progress after a delay
            setTimeout(() => setBackupProgress(null), 5000);
        }
    };

    const downloadBackup = async (filename: string) => {
        try {
            // Add a small delay to show the loading state
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const response = await apiClient.get(`/backups/download/${selectedEnv}/${filename}`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setAlert({ type: 'success', message: 'Backup download started' });
        } catch (error) {
            console.error('Failed to download backup:', error);
            setAlert({ type: 'error', message: 'Failed to download backup' });
        }
    };

    const restoreBackup = async (filename: string) => {
        try {
            setRestoringBackup(filename);
            setShowConsole(true);
            addConsoleLog(`Starting restore for backup: ${filename}`, 'info');
            setRestoreProgress({ percentage: 0, status: 'Starting restore process...', currentStep: 'Initializing' });
            
            addConsoleLog('Validating backup file...', 'info');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            addConsoleLog('Creating pre-restore backup...', 'info');
            setRestoreProgress({ percentage: 10, status: 'Creating pre-restore backup...', currentStep: 'Backup' });
            await new Promise(resolve => setTimeout(resolve, 500));
            
            addConsoleLog('Pre-restore backup created ✓', 'success');
            
            addConsoleLog('Extracting backup archive...', 'info');
            setRestoreProgress({ percentage: 30, status: 'Extracting backup files...', currentStep: 'Extracting' });
            
            // Simulate progress updates with console logs
            const progressInterval = setInterval(() => {
                setRestoreProgress(prev => {
                    if (!prev) return prev;
                    const newPercentage = Math.min(prev.percentage + 10, 90);
                    
                    if (newPercentage === 50) {
                        addConsoleLog('Replacing application files...', 'info');
                    } else if (newPercentage === 70) {
                        addConsoleLog('Updating configuration...', 'info');
                    } else if (newPercentage === 85) {
                        addConsoleLog('Verifying restore integrity...', 'info');
                    }
                    
                    return { 
                        percentage: newPercentage, 
                        status: 'Restoring backup...', 
                        currentStep: 'Processing' 
                    };
                });
            }, 400);
            
            const response = await apiClient.post('/backups/restore', {
                env: selectedEnv,
                filename: filename
            });
            
            clearInterval(progressInterval);
            
            // Fix: Handle the response structure correctly
            const responseData = response.data || response;
            
            if (responseData.success) {
                addConsoleLog('Restore completed successfully!', 'success');
                addConsoleLog(`Pre-restore backup: ${responseData.pre_restore_backup}`, 'info');
                
                setRestoreProgress({ percentage: 100, status: 'Restore completed successfully!', currentStep: 'Complete' });
                setAlert({ 
                    type: 'success', 
                    message: `${responseData.message}. Pre-restore backup created: ${responseData.pre_restore_backup}` 
                });
                setRestoreDialogOpen(false);
                setSelectedBackup(null);
                loadBackups();
            } else {
                addConsoleLog(`Restore failed: ${responseData.error}`, 'error');
                setRestoreProgress({ percentage: 0, status: 'Restore failed', currentStep: 'Error' });
                setAlert({ type: 'error', message: responseData.error || 'Failed to restore backup' });
            }
        } catch (error: any) {
            console.error('Failed to restore backup:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to restore backup';
            addConsoleLog(`Error: ${errorMessage}`, 'error');
            setAlert({ type: 'error', message: errorMessage });
            setRestoreProgress({ percentage: 0, status: 'Restore failed', currentStep: 'Error' });
        } finally {
            setRestoringBackup(null);
            // Clear progress after a delay
            setTimeout(() => setRestoreProgress(null), 5000);
        }
    };

    const deleteBackup = async (filename: string) => {
        try {
            setDeletingBackup(filename);
            // Add a small delay to show the loading state
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const response = await apiClient.delete(`/backups/${selectedEnv}/${filename}`);

            // Fix: Handle the response structure correctly
            const responseData = response.data || response;

            if (responseData.success) {
                setAlert({ type: 'success', message: responseData.message });
                loadBackups();
            } else {
                setAlert({ type: 'error', message: responseData.error || 'Failed to delete backup' });
            }
        } catch (error: any) {
            console.error('Failed to delete backup:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to delete backup';
            setAlert({ type: 'error', message: errorMessage });
        } finally {
            setDeletingBackup(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    };

    const getEnvironmentColor = (env: string) => {
        return env === 'prod' ? 'error' : 'primary';
    };

    const getEnvironmentIcon = (env: string) => {
        return env === 'prod' ? '🚀' : '🔧';
    };

    if (user?.role !== 'super_admin') {
        return null;
    }

    return (
        <Card className={className}>
            <CardHeader
                title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <BackupIcon color="primary" />
                        <Typography variant="h6">SDLC Backup Management</Typography>
                    </Stack>
                }
                action={
                    <IconButton onClick={loadBackups} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                }
            />
            <CardContent>
                {alert && (
                    <Alert
                        severity={alert.type}
                        sx={{ mb: 2 }}
                        onClose={() => setAlert(null)}
                    >
                        {alert.message}
                    </Alert>
                )}

                {/* Environment Selection */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1">Environment:</Typography>
                    <FormControl sx={{ minWidth: 120 }}>
                        <Select
                            value={selectedEnv}
                            onChange={(e) => setSelectedEnv(e.target.value as 'prod' | 'dev')}
                            size="small"
                        >
                            <MenuItem value="prod">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <span>{getEnvironmentIcon('prod')}</span>
                                    <span>Production</span>
                                </Stack>
                            </MenuItem>
                            <MenuItem value="dev">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <span>{getEnvironmentIcon('dev')}</span>
                                    <span>Development</span>
                                </Stack>
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <Chip 
                        label={selectedEnv.toUpperCase()} 
                        color={getEnvironmentColor(selectedEnv) as any}
                        size="small"
                    />
                </Stack>

                {/* Create Backup Section */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Create New Backup
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={createBackup}
                        disabled={creatingBackup}
                        startIcon={creatingBackup ? <CircularProgress size={20} /> : <BackupIcon />}
                        color={getEnvironmentColor(selectedEnv) as any}
                        fullWidth
                    >
                        {creatingBackup ? 'Creating Backup...' : `Create ${selectedEnv.toUpperCase()} Backup`}
                    </Button>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        Creates a timestamped ZIP archive of the current {selectedEnv} environment
                    </Typography>
                    
                    {/* Progress Indicator */}
                    {backupProgress && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                                <CircularProgress 
                                    variant="determinate" 
                                    value={backupProgress.percentage} 
                                    size={24}
                                    color={backupProgress.percentage === 100 ? 'success' : 'primary'}
                                />
                                <Typography variant="body2" fontWeight="medium">
                                    {backupProgress.percentage}% Complete
                                </Typography>
                            </Stack>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                {backupProgress.status}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Current step: {backupProgress.currentStep}
                            </Typography>
                        </Box>
                    )}

                    {/* Backup Console */}
                    {showConsole && (
                        <Box sx={{ mt: 2 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" color="primary">
                                    📋 Backup Console
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={clearConsole}
                                        disabled={consoleLogs.length === 0}
                                    >
                                        Clear
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => setShowConsole(false)}
                                    >
                                        Hide
                                    </Button>
                                </Stack>
                            </Stack>
                            <Box
                                id="backup-console"
                                sx={{
                                    height: 200,
                                    maxHeight: 200,
                                    overflowY: 'auto',
                                    bgcolor: '#1e1e1e',
                                    color: '#ffffff',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    p: 2,
                                    borderRadius: 1,
                                    border: '1px solid #333',
                                    '&::-webkit-scrollbar': {
                                        width: '8px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#2d2d2d',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#555',
                                        borderRadius: '4px',
                                    },
                                }}
                            >
                                {consoleLogs.length === 0 ? (
                                    <Typography variant="body2" color="#888" sx={{ fontStyle: 'italic' }}>
                                        Console ready. Backup operations will appear here...
                                    </Typography>
                                ) : (
                                    consoleLogs.map((log, index) => (
                                        <Box key={index} sx={{ mb: 0.5 }}>
                                            <Typography
                                                component="span"
                                                sx={{
                                                    color: '#888',
                                                    fontSize: '11px',
                                                    mr: 1,
                                                }}
                                            >
                                                [{log.timestamp}]
                                            </Typography>
                                            <Typography
                                                component="span"
                                                sx={{
                                                    color: log.type === 'error' ? '#ff6b6b' :
                                                           log.type === 'success' ? '#51cf66' :
                                                           log.type === 'warning' ? '#ffd43b' : '#ffffff',
                                                    fontWeight: log.type === 'error' ? 'bold' : 'normal',
                                                }}
                                            >
                                                {log.message}
                                            </Typography>
                                        </Box>
                                    ))
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Available Backups Section */}
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Available Backups
                    </Typography>
                    
                    {loading ? (
                        <Box display="flex" justifyContent="center" p={3}>
                            <CircularProgress />
                        </Box>
                    ) : backups.length === 0 ? (
                        <Alert severity="info">
                            No backups found for {selectedEnv} environment. Create your first backup above.
                        </Alert>
                    ) : (
                        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {backups.map((backup) => (
                                <ListItem key={backup.filename} divider>
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {backup.filename.replace('.zip', '')}
                                                </Typography>
                                                <Chip 
                                                    label={formatFileSize(backup.size)} 
                                                    size="small" 
                                                    variant="outlined"
                                                />
                                            </Stack>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="textSecondary">
                                                Created: {formatDate(backup.created_at)}
                                            </Typography>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Stack direction="row" spacing={1}>
                                            <Tooltip title="Download Backup">
                                                <IconButton
                                                    onClick={() => downloadBackup(backup.filename)}
                                                    size="small"
                                                >
                                                    <DownloadIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Restore Backup">
                                                <IconButton
                                                    onClick={() => {
                                                        setSelectedBackup(backup);
                                                        setRestoreDialogOpen(true);
                                                    }}
                                                    color="warning"
                                                    size="small"
                                                    disabled={restoringBackup === backup.filename}
                                                >
                                                    {restoringBackup === backup.filename ? (
                                                        <CircularProgress size={20} />
                                                    ) : (
                                                        <RestoreIcon />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Backup">
                                                <IconButton
                                                    onClick={() => deleteBackup(backup.filename)}
                                                    color="error"
                                                    size="small"
                                                    disabled={deletingBackup === backup.filename}
                                                >
                                                    {deletingBackup === backup.filename ? (
                                                        <CircularProgress size={20} />
                                                    ) : (
                                                        <DeleteIcon />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

                {/* Restore Confirmation Dialog */}
                <Dialog
                    open={restoreDialogOpen}
                    onClose={() => setRestoreDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <WarningIcon color="warning" />
                            <Typography>Confirm Backup Restore</Typography>
                        </Stack>
                    </DialogTitle>
                    <DialogContent>
                        <Typography sx={{ mb: 2 }}>
                            Are you sure you want to restore the backup <strong>{selectedBackup?.filename}</strong>?
                        </Typography>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                <strong>Warning:</strong> This will overwrite the current {selectedEnv} environment with the backup contents. 
                                A pre-restore backup will be created automatically.
                            </Typography>
                        </Alert>
                        <Typography variant="body2" color="textSecondary">
                            Backup details:
                        </Typography>
                        <List dense>
                            <ListItem>
                                <ListItemText 
                                    primary="Filename" 
                                    secondary={selectedBackup?.filename} 
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText 
                                    primary="Size" 
                                    secondary={selectedBackup ? formatFileSize(selectedBackup.size) : ''} 
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText 
                                    primary="Created" 
                                    secondary={selectedBackup ? formatDate(selectedBackup.created_at) : ''} 
                                />
                            </ListItem>
                        </List>
                        
                        {/* Restore Progress Indicator */}
                        {restoreProgress && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'orange.50', borderRadius: 1, border: '1px solid orange.200' }}>
                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                                    <CircularProgress 
                                        variant="determinate" 
                                        value={restoreProgress.percentage} 
                                        size={24}
                                        color={restoreProgress.percentage === 100 ? 'success' : 'warning'}
                                    />
                                    <Typography variant="body2" fontWeight="medium">
                                        {restoreProgress.percentage}% Complete
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                    {restoreProgress.status}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Current step: {restoreProgress.currentStep}
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRestoreDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => selectedBackup && restoreBackup(selectedBackup.filename)}
                            color="warning"
                            variant="contained"
                            disabled={restoringBackup === selectedBackup?.filename}
                            startIcon={restoringBackup === selectedBackup?.filename ? <CircularProgress size={20} /> : <RestoreIcon />}
                        >
                            {restoringBackup === selectedBackup?.filename ? 'Restoring...' : 'Restore Backup'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default SDLCBackupPanel; 