import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Switch,
    FormControlLabel,
    Grid,
    Box,
    Button,
    Divider,
    Alert,
    Stack,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Tooltip,
    CircularProgress,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Backup as BackupIcon,
    CloudDownload as DownloadIcon,
    Schedule as ScheduleIcon,
    Delete as DeleteIcon,
    Storage as StorageIcon,
    FolderOpen as DatabaseIcon,
    Folder as FolderIcon,
    Settings as SettingsIcon,
    PlayArrow as RunIcon,
    Refresh as RefreshIcon,
    GetApp as ExportIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import PageContainer from '@/shared/ui/PageContainer';
import BlankCard from '@/shared/ui/BlankCard';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { adminAPI } from '@/api/admin.api';
import { useAuth } from '@/context/AuthContext';
import NFSBackupConfig from '@/components/admin/NFSBackupConfig';

const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        title: 'Settings',
    },
    {
        title: 'Backup Settings',
    },
];

interface BackupSettings {
    enabled: boolean;
    schedule: string;
    retention_days: number;
    include_database: boolean;
    include_files: boolean;
    include_uploads: boolean;
    compression: boolean;
    email_notifications: boolean;
    notification_email: string;
    backup_location: string;
    max_backups: number;
}

interface BackupFile {
    id: string;
    filename: string;
    size: number;
    created_at: string;
    type: 'full' | 'database' | 'files';
    status: 'completed' | 'in_progress' | 'failed';
}

const BackupSettings: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [settings, setSettings] = useState<BackupSettings>({
        enabled: true,
        schedule: '0 2 * * *', // Daily at 2 AM
        retention_days: 30,
        include_database: true,
        include_files: true,
        include_uploads: true,
        compression: true,
        email_notifications: false,
        notification_email: '',
        backup_location: '/opt/backups/orthodox-metrics',
        max_backups: 50,
    });

    // Safe setter that ensures settings is never null/undefined
    const updateSettings = (newSettings: BackupSettings | null | undefined) => {
        if (!newSettings) {
            console.warn('Attempted to set null/undefined settings, keeping defaults');
            return;
        }
        setSettings(newSettings);
    };

    const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [backupInProgress, setBackupInProgress] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
    const [storageInfo, setStorageInfo] = useState({
        total_space: 0,
        used_space: 0,
        backup_space: 0,
    });

    // Schedule options
    const scheduleOptions = [
        { value: '0 2 * * *', label: 'Daily at 2:00 AM' },
        { value: '0 2 * * 0', label: 'Weekly (Sunday at 2:00 AM)' },
        { value: '0 2 1 * *', label: 'Monthly (1st day at 2:00 AM)' },
        { value: '0 */6 * * *', label: 'Every 6 hours' },
        { value: '0 */12 * * *', label: 'Every 12 hours' },
        { value: 'custom', label: 'Custom Cron Expression' },
    ];

    useEffect(() => {
        loadBackupSettings();
        loadBackupFiles();
        loadStorageInfo();
    }, []);

    const loadBackupSettings = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.backup.getSettings();

            if (response && response.success && response.settings) {
                updateSettings(response.settings);
            } else {
                console.warn('Invalid backup settings response:', response);
                setAlert({ type: 'error', message: 'Failed to load backup settings' });
            }
        } catch (error) {
            console.error('Error loading backup settings:', error);
            setAlert({ type: 'error', message: 'Failed to load backup settings. Please check your permissions.' });
        } finally {
            setLoading(false);
        }
    };

    const loadBackupFiles = async () => {
        try {
            const response = await adminAPI.backup.getFiles();

            if (Array.isArray(response)) {
                setBackupFiles(response);
            } else if (response && Array.isArray(response.files)) {
                setBackupFiles(response.files);
            } else {
                console.warn('Invalid backup files response:', response);
                setBackupFiles([]);
            }
        } catch (error) {
            console.error('Error loading backup files:', error);
            setBackupFiles([]);
        }
    };

    const loadStorageInfo = async () => {
        try {
            const response = await adminAPI.backup.getStorage();

            if (response && response.storage) {
                setStorageInfo(response.storage);
            } else if (response && response.success && response.storage) {
                setStorageInfo(response.storage);
            } else {
                console.warn('Invalid storage info response:', response);
            }
        } catch (error) {
            console.error('Error loading storage info:', error);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            const response = await adminAPI.backup.updateSettings(settings);

            if (response.success) {
                setAlert({ type: 'success', message: 'Backup settings saved successfully' });
                // Only update settings if response contains valid data
                if (response.data) {
                    updateSettings(response.data);
                }
            } else {
                setAlert({ type: 'error', message: response.message || 'Failed to save settings' });
            }
        } catch (error: any) {
            setAlert({ type: 'error', message: error.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const runBackup = async (type: string) => {
        try {
            setBackupInProgress(true);
            const response = await adminAPI.backup.run();

            if (response.success) {
                setAlert({ type: 'success', message: 'Backup started successfully' });
                loadBackupFiles();
                loadStorageInfo();
            } else {
                setAlert({ type: 'error', message: response.message || 'Failed to start backup' });
            }
        } catch (error: any) {
            setAlert({ type: 'error', message: error.message || 'Failed to start backup' });
        } finally {
            setBackupInProgress(false);
        }
    };

    const downloadBackup = async (backupId: string) => {
        try {
            const response = await adminAPI.backup.download(backupId);

            if (response.url) {
                const a = document.createElement('a');
                a.href = response.url;
                a.download = `backup-${backupId}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                setAlert({ type: 'error', message: 'Failed to download backup' });
            }
        } catch (error: any) {
            setAlert({ type: 'error', message: error.message || 'Failed to download backup' });
        }
    };

    const deleteBackup = async (backupId: string) => {
        try {
            const response = await adminAPI.backup.delete(backupId);

            const data = response;

            if (data.success) {
                setAlert({ type: 'success', message: 'Backup deleted successfully' });
                loadBackupFiles();
                loadStorageInfo();
            } else {
                setAlert({ type: 'error', message: data.message || 'Failed to delete backup' });
            }
        } catch (error) {
            console.error('Error deleting backup:', error);
            setAlert({ type: 'error', message: 'Failed to delete backup' });
        } finally {
            setDeleteDialogOpen(false);
            setSelectedBackup(null);
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
        return new Date(dateString).toLocaleString();
    };

    const getBackupTypeColor = (type: string) => {
        switch (type) {
            case 'full': return 'primary';
            case 'database': return 'secondary';
            case 'files': return 'info';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return '✅';
            case 'in_progress': return '⏳';
            case 'failed': return '❌';
            default: return '❓';
        }
    };

    const usagePercentage = storageInfo.total_space > 0
        ? (storageInfo.used_space / storageInfo.total_space) * 100
        : 0;

    const backupPercentage = storageInfo.total_space > 0
        ? (storageInfo.backup_space / storageInfo.total_space) * 100
        : 0;

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const renderBackupSettingsTab = () => (
        <Grid container spacing={3}>
            {/* Storage Information */}
            <Grid item xs={12}>
                <BlankCard>
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                            <StorageIcon color="primary" />
                            <Typography variant="h6">Storage Information</Typography>
                            <IconButton size="small" onClick={loadStorageInfo}>
                                <RefreshIcon />
                            </IconButton>
                        </Stack>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="body2" color="textSecondary">Total Storage</Typography>
                                    <Typography variant="h6">{formatFileSize(storageInfo.total_space)}</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="body2" color="textSecondary">Used Space</Typography>
                                    <Typography variant="h6">{formatFileSize(storageInfo.used_space)}</Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={usagePercentage}
                                        sx={{ mt: 1 }}
                                        color={usagePercentage > 80 ? 'error' : 'primary'}
                                    />
                                    <Typography variant="caption">{usagePercentage.toFixed(1)}% used</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="body2" color="textSecondary">Backup Space</Typography>
                                    <Typography variant="h6">{formatFileSize(storageInfo.backup_space)}</Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={backupPercentage}
                                        sx={{ mt: 1 }}
                                        color="secondary"
                                    />
                                    <Typography variant="caption">{backupPercentage.toFixed(1)}% of total</Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </BlankCard>
            </Grid>

            {/* Backup Settings */}
            <Grid item xs={12} lg={6}>
                <BlankCard>
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                            <SettingsIcon color="primary" />
                            <Typography variant="h6">Backup Configuration</Typography>
                        </Stack>

                        <Stack spacing={3}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.enabled}
                                        onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                                    />
                                }
                                label="Enable Automatic Backups"
                            />

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <FormControl sx={{ minWidth: 200, flex: 1 }}>
                                    <InputLabel>Backup Schedule</InputLabel>
                                    <Select
                                        value={settings.schedule}
                                        label="Backup Schedule"
                                        onChange={(e) => setSettings({ ...settings, schedule: e.target.value })}
                                    >
                                        {scheduleOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    sx={{ minWidth: 150, flex: 1 }}
                                    type="number"
                                    label="Retention Period (days)"
                                    value={settings.retention_days}
                                    onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value) })}
                                    helperText="How long to keep backup files"
                                />

                                <TextField
                                    sx={{ minWidth: 150, flex: 1 }}
                                    type="number"
                                    label="Maximum Backups"
                                    value={settings.max_backups}
                                    onChange={(e) => setSettings({ ...settings, max_backups: parseInt(e.target.value) })}
                                    helperText="Maximum backup files to keep"
                                />
                            </Stack>

                            {settings.schedule === 'custom' && (
                                <TextField
                                    fullWidth
                                    label="Custom Cron Expression"
                                    value={settings.schedule}
                                    onChange={(e) => setSettings({ ...settings, schedule: e.target.value })}
                                    helperText="Format: minute hour day month weekday (e.g., 0 2 * * * for daily at 2 AM)"
                                />
                            )}

                            <Divider />

                            <Typography variant="subtitle2">Backup Content</Typography>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.include_database}
                                            onChange={(e) => setSettings({ ...settings, include_database: e.target.checked })}
                                        />
                                    }
                                    label="Include Database"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.include_files}
                                            onChange={(e) => setSettings({ ...settings, include_files: e.target.checked })}
                                        />
                                    }
                                    label="Include Application Files"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.include_uploads}
                                            onChange={(e) => setSettings({ ...settings, include_uploads: e.target.checked })}
                                        />
                                    }
                                    label="Include User Uploads"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.compression}
                                            onChange={(e) => setSettings({ ...settings, compression: e.target.checked })}
                                        />
                                    }
                                    label="Enable Compression"
                                />
                            </Stack>

                            <Divider />

                            <Typography variant="subtitle2">Notifications</Typography>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.email_notifications}
                                            onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                                        />
                                    }
                                    label="Email Notifications"
                                />

                                {settings.email_notifications && (
                                    <TextField
                                        sx={{ flex: 1 }}
                                        type="email"
                                        label="Notification Email"
                                        value={settings.notification_email}
                                        onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                                        helperText="Email address to receive backup notifications"
                                    />
                                )}
                            </Stack>

                            <TextField
                                fullWidth
                                label="Backup Location"
                                value={settings.backup_location}
                                onChange={(e) => setSettings({ ...settings, backup_location: e.target.value })}
                                helperText="Server path where backup files are stored"
                            />

                            <Box sx={{ pt: 2 }}>
                                <Button
                                    variant="contained"
                                    onClick={saveSettings}
                                    disabled={saving}
                                    startIcon={saving ? <CircularProgress size={20} /> : <SettingsIcon />}
                                >
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </Box>
                        </Stack>
                    </CardContent>
                </BlankCard>
            </Grid>

            {/* Manual Backup Actions */}
            <Grid item xs={12} lg={6}>
                <BlankCard>
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                            <BackupIcon color="primary" />
                            <Typography variant="h6">Manual Backup</Typography>
                        </Stack>

                        <Stack spacing={2}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => runBackup('full')}
                                disabled={backupInProgress}
                                startIcon={backupInProgress ? <CircularProgress size={20} /> : <BackupIcon />}
                                fullWidth
                            >
                                {backupInProgress ? 'Creating Full Backup...' : 'Create Full Backup'}
                            </Button>

                            <Button
                                variant="outlined"
                                onClick={() => runBackup('database')}
                                disabled={backupInProgress}
                                startIcon={<DatabaseIcon />}
                                fullWidth
                            >
                                Database Only
                            </Button>

                            <Button
                                variant="outlined"
                                onClick={() => runBackup('files')}
                                disabled={backupInProgress}
                                startIcon={<FolderIcon />}
                                fullWidth
                            >
                                Files Only
                            </Button>

                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    Full backups include database, application files, and user uploads.
                                    Large backups may take several minutes to complete.
                                </Typography>
                            </Alert>
                        </Stack>
                    </CardContent>
                </BlankCard>
            </Grid>
        </Grid>
    );

    const renderYourBackupsTab = () => (
        <Grid container spacing={3}>
            {/* Backup Files List */}
            <Grid item xs={12}>
                <BlankCard>
                    <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <ExportIcon color="primary" />
                                <Typography variant="h6">Your Backup Files</Typography>
                            </Stack>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={loadBackupFiles}
                                size="small"
                            >
                                Refresh
                            </Button>
                        </Stack>

                        {loading ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : backupFiles.length === 0 ? (
                            <Alert severity="info">
                                No backup files found. Create your first backup using the manual backup options in the Backup Settings tab.
                            </Alert>
                        ) : (
                            <List>
                                {backupFiles.map((backup) => (
                                    <ListItem key={backup.id} divider>
                                        <ListItemText
                                            primary={
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Typography variant="body1">{backup.filename}</Typography>
                                                    <Chip
                                                        label={backup.type}
                                                        size="small"
                                                        color={getBackupTypeColor(backup.type) as any}
                                                    />
                                                    <Typography variant="body2">
                                                        {getStatusIcon(backup.status)}
                                                    </Typography>
                                                </Stack>
                                            }
                                            secondary={
                                                <Stack direction="row" spacing={2}>
                                                    <Typography variant="caption">
                                                        Size: {formatFileSize(backup.size)}
                                                    </Typography>
                                                    <Typography variant="caption">
                                                        Created: {formatDate(backup.created_at)}
                                                    </Typography>
                                                </Stack>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Stack direction="row" spacing={1}>
                                                <Tooltip title="Download Backup">
                                                    <IconButton
                                                        onClick={() => downloadBackup(backup.id)}
                                                        disabled={backup.status !== 'completed'}
                                                    >
                                                        <DownloadIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Backup">
                                                    <IconButton
                                                        onClick={() => {
                                                            setSelectedBackup(backup.id);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        color="error"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </CardContent>
                </BlankCard>
            </Grid>
        </Grid>
    );

    return (
        <PageContainer title="Backup Settings" description="Manage system backups and data protection">
            <Breadcrumb title="Backup Settings" items={BCrumb} />

            {alert && (
                <Alert
                    severity={alert.type}
                    sx={{ mb: 2 }}
                    onClose={() => setAlert(null)}
                >
                    {alert.message}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Main Content */}
                <Grid item xs={12} lg={user?.role === 'super_admin' ? 8 : 12}>
                    <BlankCard>
                        <CardContent>
                            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
                                <Tab label="Backup Settings" />
                                <Tab label="Your Backups" />
                                {user?.role === 'super_admin' && <Tab label="NFS Remote Backup" />}
                            </Tabs>

                            {activeTab === 0 && renderBackupSettingsTab()}
                            {activeTab === 1 && renderYourBackupsTab()}
                            {activeTab === 2 && user?.role === 'super_admin' && <NFSBackupConfig />}
                        </CardContent>
                    </BlankCard>
                </Grid>
            </Grid>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this backup? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => selectedBackup && deleteBackup(selectedBackup)}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};

export default BackupSettings;
