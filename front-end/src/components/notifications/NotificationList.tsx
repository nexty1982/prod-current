import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    ListItemIcon,
    Avatar,
    IconButton,
    Chip,
    Paper,
    Tabs,
    Tab,
    Button,
    Stack,
    Divider,
    Alert,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    InputAdornment,
    Badge,
    Card,
    CardContent,
    Menu,
    Tooltip,
    CircularProgress,
    Fade,
    Collapse
} from '@mui/material';
import {
    Check,
    Delete,
    DeleteSweep,
    FilterList,
    Search,
    Refresh,
    MoreVert,
    Launch,
    Archive,
    Unarchive,
    PriorityHigh,
    Schedule,
    Settings,
    Person,
    AdminPanelSettings,
    Receipt,
    Backup,
    Security,
    VerifiedUser,
    Info,
    Warning,
    Error as ErrorIcon,
    CheckCircle,
    NotificationsActive,
    NotificationsOff,
    ExpandLess,
    ExpandMore
} from '@mui/icons-material';
import { useNotifications, NotificationType } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
);

const NotificationList: React.FC = () => {
    const {
        notifications,
        counts,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        getNotificationsByCategory,
        getNotificationsByPriority
    } = useNotifications();

    const [activeTab, setActiveTab] = useState(0);
    const [filteredNotifications, setFilteredNotifications] = useState<NotificationType[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [bulkActionAnchor, setBulkActionAnchor] = useState<null | HTMLElement>(null);
    const [refreshing, setRefreshing] = useState(false);

    const itemsPerPage = 20;

    // Filter and sort notifications
    useEffect(() => {
        let filtered = [...notifications];

        // Tab filtering
        switch (activeTab) {
            case 1: // Unread
                filtered = filtered.filter(n => !n.is_read);
                break;
            case 2: // Priority
                filtered = filtered.filter(n => n.priority === 'high' || n.priority === 'urgent');
                break;
            case 3: // System
                filtered = filtered.filter(n => n.category === 'system');
                break;
            case 4: // User
                filtered = filtered.filter(n => n.category === 'user');
                break;
        }

        // Search filtering
        if (searchTerm) {
            filtered = filtered.filter(n =>
                n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                n.message.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Category filtering
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(n => n.category === categoryFilter);
        }

        // Priority filtering
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(n => n.priority === priorityFilter);
        }

        // Sorting
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                break;
            case 'priority':
                const priorityOrder = { 'urgent': 4, 'high': 3, 'normal': 2, 'low': 1 };
                filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
                break;
            case 'unread':
                filtered.sort((a, b) => (a.is_read ? 1 : 0) - (b.is_read ? 1 : 0));
                break;
        }

        setFilteredNotifications(filtered);
        setPage(1); // Reset to first page when filters change
    }, [notifications, activeTab, searchTerm, categoryFilter, priorityFilter, sortBy]);

    // Pagination
    const paginatedNotifications = filteredNotifications.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        setSelectedNotifications([]);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const handleMarkAsRead = async (id: number) => {
        await markAsRead(id);
        setSelectedNotifications(prev => prev.filter(nId => nId !== id));
    };

    const handleDismiss = async (id: number) => {
        await dismissNotification(id);
        setSelectedNotifications(prev => prev.filter(nId => nId !== id));
    };

    const handleBulkAction = async (action: string) => {
        setBulkActionAnchor(null);

        switch (action) {
            case 'mark_read':
                for (const id of selectedNotifications) {
                    await markAsRead(id);
                }
                break;
            case 'dismiss':
                for (const id of selectedNotifications) {
                    await dismissNotification(id);
                }
                break;
        }

        setSelectedNotifications([]);
    };

    const handleSelectNotification = (id: number) => {
        setSelectedNotifications(prev =>
            prev.includes(id)
                ? prev.filter(nId => nId !== id)
                : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === paginatedNotifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(paginatedNotifications.map(n => n.id));
        }
    };

    const getNotificationIcon = (notification: NotificationType) => {
        const iconProps = { fontSize: 'small' as const };

        switch (notification.category) {
            case 'system':
                return <Settings {...iconProps} />;
            case 'user':
                return <Person {...iconProps} />;
            case 'admin':
                return <AdminPanelSettings {...iconProps} />;
            case 'billing':
                return <Receipt {...iconProps} />;
            case 'backup':
                return <Backup {...iconProps} />;
            case 'security':
                return <Security {...iconProps} />;
            case 'certificates':
                return <VerifiedUser {...iconProps} />;
            case 'reminders':
                return <Schedule {...iconProps} />;
            default:
                return <Info {...iconProps} />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'error';
            case 'high':
                return 'warning';
            case 'normal':
                return 'info';
            case 'low':
                return 'default';
            default:
                return 'default';
        }
    };

    const formatNotificationTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch (error) {
            return 'Unknown';
        }
    };

    const categories = ['all', 'system', 'user', 'admin', 'billing', 'backup', 'security', 'certificates', 'reminders'];
    const priorities = ['all', 'urgent', 'high', 'normal', 'low'];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Notifications
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Header Actions */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    Filters
                </Button>

                {counts.unread > 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<CheckCircle />}
                        onClick={markAllAsRead}
                    >
                        Mark All Read
                    </Button>
                )}

                {selectedNotifications.length > 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<MoreVert />}
                        onClick={(e) => setBulkActionAnchor(e.currentTarget)}
                    >
                        Actions ({selectedNotifications.length})
                    </Button>
                )}

                <Box sx={{ flexGrow: 1 }} />

                <Badge badgeContent={counts.unread} color="error">
                    <Typography variant="body2" color="text.secondary">
                        {filteredNotifications.length} notifications
                    </Typography>
                </Badge>
            </Stack>

            {/* Filters */}
            <Collapse in={showFilters}>
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <TextField
                            size="small"
                            placeholder="Search notifications..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 250 }}
                        />

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={categoryFilter}
                                label="Category"
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                {categories.map(cat => (
                                    <MenuItem key={cat} value={cat}>
                                        {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={priorityFilter}
                                label="Priority"
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                {priorities.map(priority => (
                                    <MenuItem key={priority} value={priority}>
                                        {priority === 'all' ? 'All Priorities' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Sort By</InputLabel>
                            <Select
                                value={sortBy}
                                label="Sort By"
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="newest">Newest First</MenuItem>
                                <MenuItem value="oldest">Oldest First</MenuItem>
                                <MenuItem value="priority">Priority</MenuItem>
                                <MenuItem value="unread">Unread First</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </Paper>
            </Collapse>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label={`All (${notifications.length})`} />
                <Tab label={`Unread (${counts.unread})`} />
                <Tab label={`Priority (${counts.high + counts.urgent})`} />
                <Tab label="System" />
                <Tab label="User" />
            </Tabs>

            {/* Notifications List */}
            <TabPanel value={activeTab} index={activeTab}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredNotifications.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <NotificationsOff sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No notifications found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'You\'ll see notifications here when they arrive'}
                        </Typography>
                    </Paper>
                ) : (
                    <Paper>
                        {paginatedNotifications.length > 0 && (
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Button
                                        size="small"
                                        onClick={handleSelectAll}
                                        startIcon={selectedNotifications.length === paginatedNotifications.length ? <CheckCircle /> : <Check />}
                                    >
                                        {selectedNotifications.length === paginatedNotifications.length ? 'Deselect All' : 'Select All'}
                                    </Button>
                                    <Typography variant="body2" color="text.secondary">
                                        Showing {paginatedNotifications.length} of {filteredNotifications.length} notifications
                                    </Typography>
                                </Stack>
                            </Box>
                        )}

                        <List>
                            {paginatedNotifications.map((notification, index) => (
                                <React.Fragment key={notification.id}>
                                    <ListItem
                                        sx={{
                                            backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                                            '&:hover': { backgroundColor: 'action.selected' },
                                            py: 2,
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Badge
                                                color={getPriorityColor(notification.priority) as any}
                                                variant="dot"
                                                invisible={notification.is_read}
                                            >
                                                <Avatar
                                                    sx={{
                                                        bgcolor: `${getPriorityColor(notification.priority)}.light`,
                                                        color: `${getPriorityColor(notification.priority)}.main`,
                                                    }}
                                                >
                                                    {getNotificationIcon(notification)}
                                                </Avatar>
                                            </Badge>
                                        </ListItemAvatar>

                                        <ListItemText
                                            primary={
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: notification.is_read ? 'normal' : 'medium',
                                                            flex: 1,
                                                        }}
                                                    >
                                                        {notification.title}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <Chip
                                                            size="small"
                                                            label={notification.category}
                                                            color={getPriorityColor(notification.priority) as any}
                                                            variant="outlined"
                                                            sx={{ height: 20, fontSize: '0.625rem' }}
                                                        />
                                                        {notification.priority !== 'normal' && (
                                                            <Chip
                                                                size="small"
                                                                label={notification.priority}
                                                                color={getPriorityColor(notification.priority) as any}
                                                                sx={{ height: 20, fontSize: '0.625rem' }}
                                                            />
                                                        )}
                                                    </Stack>
                                                </Stack>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ mb: 0.5 }}
                                                    >
                                                        {notification.message}
                                                    </Typography>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatNotificationTime(notification.created_at)}
                                                        </Typography>
                                                        {notification.action_url && (
                                                            <Chip
                                                                size="small"
                                                                label={notification.action_text || 'View'}
                                                                icon={<Launch />}
                                                                variant="outlined"
                                                                sx={{ height: 20, fontSize: '0.625rem' }}
                                                                onClick={() => window.open(notification.action_url, '_blank')}
                                                            />
                                                        )}
                                                    </Stack>
                                                </Box>
                                            }
                                        />

                                        <ListItemSecondaryAction>
                                            <Stack direction="row" spacing={1}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleSelectNotification(notification.id)}
                                                    color={selectedNotifications.includes(notification.id) ? 'primary' : 'default'}
                                                >
                                                    <Check />
                                                </IconButton>
                                                {!notification.is_read && (
                                                    <Tooltip title="Mark as read">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleMarkAsRead(notification.id)}
                                                        >
                                                            <CheckCircle />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Dismiss">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDismiss(notification.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    {index < paginatedNotifications.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>

                        {/* Pagination */}
                        {filteredNotifications.length > itemsPerPage && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <Pagination
                                    count={Math.ceil(filteredNotifications.length / itemsPerPage)}
                                    page={page}
                                    onChange={(e, value) => setPage(value)}
                                    color="primary"
                                />
                            </Box>
                        )}
                    </Paper>
                )}
            </TabPanel>

            {/* Bulk Actions Menu */}
            <Menu
                anchorEl={bulkActionAnchor}
                open={Boolean(bulkActionAnchor)}
                onClose={() => setBulkActionAnchor(null)}
            >
                <MenuItem onClick={() => handleBulkAction('mark_read')}>
                    <ListItemIcon>
                        <CheckCircle />
                    </ListItemIcon>
                    <ListItemText>Mark as Read</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleBulkAction('dismiss')}>
                    <ListItemIcon>
                        <DeleteSweep />
                    </ListItemIcon>
                    <ListItemText>Dismiss All</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default NotificationList;
