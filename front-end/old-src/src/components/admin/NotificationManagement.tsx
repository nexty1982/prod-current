import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Stack,
    Grid,
    Switch,
    FormControlLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Divider,
    FormControl,
    InputLabel,
    Select,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    CircularProgress,
    Badge,
    Tab,
    Tabs
} from '@mui/material';
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconSend,
    IconClock,
    IconUsers,
    IconMail,
    IconBell,
    IconSettings,
    IconChevronDown,
    IconEye,
    IconAlertTriangle,
    IconCheck,
    IconX
} from '@tabler/icons-react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

interface NotificationType {
    id: number;
    name: string;
    description: string;
    category: string;
    default_enabled: boolean;
    is_active: boolean;
}

interface CustomNotification {
    id?: number;
    title: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    scheduled_at: Date | null;
    target_audience: 'all' | 'admins' | 'users' | 'church_specific';
    church_id?: number;
    icon?: string;
    action_url?: string;
    action_text?: string;
    is_draft: boolean;
}

interface NotificationQueue {
    id: number;
    title: string;
    message: string;
    priority: string;
    scheduled_at: string;
    target_audience: string;
    status: 'pending' | 'sent' | 'failed';
    created_at: string;
    user_count: number;
}

const NotificationManagement: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
    const [customNotifications, setCustomNotifications] = useState<NotificationQueue[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [viewQueueDialogOpen, setViewQueueDialogOpen] = useState(false);
    const [newNotification, setNewNotification] = useState<CustomNotification>({
        title: '',
        message: '',
        priority: 'normal',
        scheduled_at: null,
        target_audience: 'all',
        icon: '📢',
        action_url: '',
        action_text: '',
        is_draft: false
    });

    useEffect(() => {
        fetchNotificationTypes();
        fetchNotificationQueue();
    }, []);

    const fetchNotificationTypes = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/notifications/types', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setNotificationTypes(data.types || []);
            }
        } catch (err) {
            setError('Failed to load notification types');
        } finally {
            setLoading(false);
        }
    };

    const fetchNotificationQueue = async () => {
        try {
            const response = await fetch('/api/admin/notifications/queue', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setCustomNotifications(data.queue || []);
            }
        } catch (err) {
            console.error('Failed to load notification queue:', err);
        }
    };

    const handleToggleNotificationType = async (typeId: number, enabled: boolean) => {
        try {
            const response = await fetch(`/api/admin/notifications/types/${typeId}/toggle`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ enabled })
            });

            if (response.ok) {
                setNotificationTypes(prev =>
                    prev.map(type =>
                        type.id === typeId ? { ...type, default_enabled: enabled } : type
                    )
                );
                setSuccess(`Notification type ${enabled ? 'enabled' : 'disabled'} system-wide`);
            } else {
                throw new Error('Failed to update notification type');
            }
        } catch (err) {
            setError('Failed to update notification type');
        }
    };

    const handleCreateCustomNotification = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/notifications/custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newNotification)
            });

            if (response.ok) {
                const data = await response.json();
                setSuccess(`Custom notification ${newNotification.is_draft ? 'saved as draft' : 'scheduled'} successfully`);
                setCreateDialogOpen(false);
                setNewNotification({
                    title: '',
                    message: '',
                    priority: 'normal',
                    scheduled_at: null,
                    target_audience: 'all',
                    icon: '📢',
                    action_url: '',
                    action_text: '',
                    is_draft: false
                });
                fetchNotificationQueue();
            } else {
                throw new Error('Failed to create notification');
            }
        } catch (err) {
            setError('Failed to create custom notification');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'system': return '⚙️';
            case 'security': return '🔒';
            case 'backup': return '💾';
            case 'billing': return '💳';
            case 'user': return '👤';
            case 'admin': return '👑';
            case 'certificates': return '📜';
            case 'reminders': return '⏰';
            default: return '📢';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'error';
            case 'high': return 'warning';
            case 'normal': return 'primary';
            case 'low': return 'default';
            default: return 'default';
        }
    };

    const groupedNotificationTypes = notificationTypes.reduce((acc, type) => {
        if (!acc[type.category]) {
            acc[type.category] = [];
        }
        acc[type.category].push(type);
        return acc;
    }, {} as Record<string, NotificationType[]>);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
                        {success}
                    </Alert>
                )}

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                        <Tab icon={<IconSettings />} label="System-wide Settings" />
                        <Tab icon={<IconPlus />} label="Custom Notifications" />
                        <Tab icon={<IconClock />} label="Notification Queue" />
                    </Tabs>
                </Box>

                {/* System-wide Notification Settings */}
                {tabValue === 0 && (
                    <Box>
                        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                            <Typography variant="h6">
                                System-wide Notification Types
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Control which notification types are enabled for all users
                            </Typography>
                        </Box>

                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Stack spacing={2}>
                                {Object.entries(groupedNotificationTypes).map(([category, types]) => (
                                    <Accordion key={category} defaultExpanded>
                                        <AccordionSummary expandIcon={<IconChevronDown />}>
                                            <Box display="flex" alignItems="center">
                                                <Typography sx={{ mr: 1 }}>{getCategoryIcon(category)}</Typography>
                                                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                                                    {category}
                                                </Typography>
                                                <Chip
                                                    label={`${types.filter(t => t.default_enabled).length}/${types.length} enabled`}
                                                    size="small"
                                                    sx={{ ml: 2 }}
                                                />
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Grid container spacing={2}>
                                                {types.map((type) => (
                                                    <Grid item xs={12} md={6} key={type.id}>
                                                        <Card variant="outlined">
                                                            <CardContent>
                                                                <Box display="flex" justifyContent="between" alignItems="flex-start">
                                                                    <Box flex={1}>
                                                                        <Typography variant="subtitle1" fontWeight={600}>
                                                                            {type.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                                        </Typography>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {type.description}
                                                                        </Typography>
                                                                    </Box>
                                                                    <FormControlLabel
                                                                        control={
                                                                            <Switch
                                                                                checked={type.default_enabled}
                                                                                onChange={(e) => handleToggleNotificationType(type.id, e.target.checked)}
                                                                                size="small"
                                                                            />
                                                                        }
                                                                        label=""
                                                                        sx={{ ml: 1 }}
                                                                    />
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Stack>
                        )}
                    </Box>
                )}

                {/* Custom Notifications */}
                {tabValue === 1 && (
                    <Box>
                        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                            <Typography variant="h6">
                                Create Custom Notifications
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<IconPlus />}
                                onClick={() => setCreateDialogOpen(true)}
                            >
                                Create Notification
                            </Button>
                        </Box>

                        <Alert severity="info" sx={{ mb: 3 }}>
                            Create custom notifications that will be sent to all users or specific groups. You can schedule them for future delivery or send immediately.
                        </Alert>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={2}>
                                            <IconUsers style={{ marginRight: 8 }} />
                                            <Typography variant="h6">Broadcast to All</Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" mb={2}>
                                            Send notifications to all registered users in the system.
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => {
                                                setNewNotification(prev => ({ ...prev, target_audience: 'all' }));
                                                setCreateDialogOpen(true);
                                            }}
                                        >
                                            Create Broadcast
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={2}>
                                            <IconMail style={{ marginRight: 8 }} />
                                            <Typography variant="h6">Admin Alert</Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" mb={2}>
                                            Send important notifications to administrators only.
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => {
                                                setNewNotification(prev => ({ ...prev, target_audience: 'admins' }));
                                                setCreateDialogOpen(true);
                                            }}
                                        >
                                            Create Admin Alert
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={2}>
                                            <IconClock style={{ marginRight: 8 }} />
                                            <Typography variant="h6">Scheduled Message</Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" mb={2}>
                                            Schedule notifications for future delivery at specific times.
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => {
                                                setNewNotification(prev => ({ 
                                                    ...prev, 
                                                    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
                                                }));
                                                setCreateDialogOpen(true);
                                            }}
                                        >
                                            Schedule Message
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* Notification Queue */}
                {tabValue === 2 && (
                    <Box>
                        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                            <Typography variant="h6">
                                Notification Queue & History
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<IconEye />}
                                onClick={() => setViewQueueDialogOpen(true)}
                            >
                                View Details
                            </Button>
                        </Box>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Title</TableCell>
                                        <TableCell>Audience</TableCell>
                                        <TableCell>Priority</TableCell>
                                        <TableCell>Scheduled</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Recipients</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {customNotifications.map((notification) => (
                                        <TableRow key={notification.id}>
                                            <TableCell>
                                                <Typography variant="subtitle2">
                                                    {notification.title}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {notification.message.slice(0, 50)}...
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={notification.target_audience}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={notification.priority}
                                                    size="small"
                                                    color={getPriorityColor(notification.priority) as any}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(notification.scheduled_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={notification.status}
                                                    size="small"
                                                    color={notification.status === 'sent' ? 'success' : notification.status === 'failed' ? 'error' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Badge badgeContent={notification.user_count} color="primary">
                                                    <IconUsers size={20} />
                                                </Badge>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="View Details">
                                                    <IconButton size="small">
                                                        <IconEye />
                                                    </IconButton>
                                                </Tooltip>
                                                {notification.status === 'pending' && (
                                                    <Tooltip title="Cancel">
                                                        <IconButton size="small" color="error">
                                                            <IconX />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* Create Custom Notification Dialog */}
                <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Create Custom Notification</DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                fullWidth
                                label="Notification Title"
                                value={newNotification.title}
                                onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter a clear, descriptive title"
                            />
                            
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Message"
                                value={newNotification.message}
                                onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                                placeholder="Write your notification message here..."
                            />

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Priority</InputLabel>
                                        <Select
                                            value={newNotification.priority}
                                            label="Priority"
                                            onChange={(e) => setNewNotification(prev => ({ ...prev, priority: e.target.value as any }))}
                                        >
                                            <MenuItem value="low">Low</MenuItem>
                                            <MenuItem value="normal">Normal</MenuItem>
                                            <MenuItem value="high">High</MenuItem>
                                            <MenuItem value="urgent">Urgent</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Target Audience</InputLabel>
                                        <Select
                                            value={newNotification.target_audience}
                                            label="Target Audience"
                                            onChange={(e) => setNewNotification(prev => ({ ...prev, target_audience: e.target.value as any }))}
                                        >
                                            <MenuItem value="all">All Users</MenuItem>
                                            <MenuItem value="admins">Administrators Only</MenuItem>
                                            <MenuItem value="users">Regular Users Only</MenuItem>
                                            <MenuItem value="church_specific">Specific Church</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <DateTimePicker
                                label="Schedule Delivery (Optional)"
                                value={newNotification.scheduled_at}
                                onChange={(newValue) => setNewNotification(prev => ({ ...prev, scheduled_at: newValue }))}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        helperText: "Leave empty to send immediately"
                                    }
                                }}
                            />

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Icon (Optional)"
                                        value={newNotification.icon}
                                        onChange={(e) => setNewNotification(prev => ({ ...prev, icon: e.target.value }))}
                                        placeholder="📢, 🔔, ⚠️, etc."
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Action Text (Optional)"
                                        value={newNotification.action_text}
                                        onChange={(e) => setNewNotification(prev => ({ ...prev, action_text: e.target.value }))}
                                        placeholder="View Details, Learn More, etc."
                                    />
                                </Grid>
                            </Grid>

                            <TextField
                                fullWidth
                                label="Action URL (Optional)"
                                value={newNotification.action_url}
                                onChange={(e) => setNewNotification(prev => ({ ...prev, action_url: e.target.value }))}
                                placeholder="/some-page, https://example.com, etc."
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setNewNotification(prev => ({ ...prev, is_draft: true }));
                                handleCreateCustomNotification();
                            }}
                            disabled={!newNotification.title || !newNotification.message}
                        >
                            Save as Draft
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setNewNotification(prev => ({ ...prev, is_draft: false }));
                                handleCreateCustomNotification();
                            }}
                            disabled={!newNotification.title || !newNotification.message}
                            startIcon={newNotification.scheduled_at ? <IconClock /> : <IconSend />}
                        >
                            {newNotification.scheduled_at ? 'Schedule' : 'Send Now'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
};

export default NotificationManagement; 