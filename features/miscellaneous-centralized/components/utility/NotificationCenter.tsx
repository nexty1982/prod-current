import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  IconButton,
  Stack,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Tab,
  Tabs,
  Badge,
  Chip,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Skeleton,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  IconBell,
  IconBellOff,
  IconCheck,
  IconCheckbox,
  IconX,
  IconDots,
  IconSettings,
  IconTrash,
  IconMail,
  IconMessage,
  IconUserPlus,
  IconHeart,
  IconWriting,
  IconRefresh,
  IconMarkdown,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PageContainer from '../../../components/container/PageContainer';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { socialAPI } from '../../../api/social.api';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  action_url?: string;
  sender_id?: number;
  sender?: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_image_url?: string;
  };
  created_at: string;
  expires_at?: string;
}

interface NotificationSettings {
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  custom_settings: {
    friend_requests: boolean;
    blog_comments: boolean;
    blog_likes: boolean;
    chat_messages: boolean;
    mentions: boolean;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const NOTIFICATION_ICONS = {
  friend_request: IconUserPlus,
  friend_accepted: IconUserPlus,
  blog_comment: IconMessage,
  blog_like: IconHeart,
  chat_message: IconMessage,
  mention: IconMarkdown,
  system: IconBell,
  default: IconBell,
};

const NOTIFICATION_COLORS = {
  friend_request: 'primary',
  friend_accepted: 'success',
  blog_comment: 'info',
  blog_like: 'error',
  chat_message: 'info',
  mention: 'warning',
  system: 'default',
  default: 'default',
};

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tabValue, setTabValue] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Filters
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<{
    element: HTMLElement;
    notificationId: number;
  } | null>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Social' },
    { title: 'Notifications' },
  ];

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, [tabValue]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let filters: Record<string, string> = { limit: '50' };
      if (tabValue === 1) filters.is_read = 'false'; // Unread
      if (tabValue === 2) filters.type = 'friend_request'; // Friend Requests
      if (tabValue === 3) filters.type = 'blog_comment,blog_like'; // Blog Activity
      
      const response = await socialAPI.notifications.getAll(filters);
      setNotifications(response.notifications || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await socialAPI.notifications.getSettings();
      setSettings(response.settings);
    } catch (err: any) {
      console.error('Error fetching notification settings:', err);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await socialAPI.notifications.markAsRead(notificationId);
      
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true }
          : notif
      ));
    } catch (err: any) {
      console.error('Error marking as read:', err);
      setError(err.response?.data?.message || 'Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await socialAPI.notifications.markAllAsRead();
      
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    } catch (err: any) {
      console.error('Error marking all as read:', err);
      setError(err.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await socialAPI.notifications.delete(notificationId);
      
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const deleteSelected = async () => {
    try {
      await Promise.all(
        selectedNotifications.map(id => socialAPI.notifications.delete(id))
      );
      
      setNotifications(prev => prev.filter(notif => !selectedNotifications.includes(notif.id)));
      setSelectedNotifications([]);
    } catch (err: any) {
      console.error('Error deleting notifications:', err);
      setError(err.response?.data?.message || 'Failed to delete notifications');
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      setSettingsLoading(true);
      
      await socialAPI.notifications.updateSettings(newSettings);
      
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      navigate(notification.action_url);
    } else {
      // Default navigation based on type
      switch (notification.type) {
        case 'friend_request':
          navigate('/social/friends', { state: { tab: 1 } });
          break;
        case 'blog_comment':
        case 'blog_like':
          if (notification.data?.post_id) {
            navigate(`/social/blog/post/${notification.data.post_id}`);
          }
          break;
        case 'chat_message':
          if (notification.data?.conversation_id) {
            navigate('/social/chat', { state: { conversationId: notification.data.conversation_id } });
          }
          break;
        default:
          break;
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    const IconComponent = NOTIFICATION_ICONS[type as keyof typeof NOTIFICATION_ICONS] || NOTIFICATION_ICONS.default;
    return <IconComponent size={18} />;
  };

  const getNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getFilteredNotifications = () => {
    switch (tabValue) {
      case 1: return notifications.filter(n => !n.is_read);
      case 2: return notifications.filter(n => n.type === 'friend_request');
      case 3: return notifications.filter(n => ['blog_comment', 'blog_like'].includes(n.type));
      default: return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <PageContainer title="Notifications" description="Manage your notifications">
      <Breadcrumb title="Notifications" items={BCrumb} />
      
      <Card>
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              Notifications
              {unreadCount > 0 && (
                <Badge badgeContent={unreadCount} color="primary" sx={{ ml: 2 }} />
              )}
            </Typography>
            
            <Stack direction="row" spacing={1}>
              {selectedNotifications.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<IconTrash size={16} />}
                  onClick={deleteSelected}
                >
                  Delete ({selectedNotifications.length})
                </Button>
              )}
              
              {unreadCount > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<IconCheck size={16} />}
                  onClick={markAllAsRead}
                >
                  Mark All Read
                </Button>
              )}
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconRefresh size={16} />}
                onClick={fetchNotifications}
                disabled={loading}
              >
                Refresh
              </Button>
              
              <IconButton
                onClick={() => setSettingsOpen(true)}
                size="small"
              >
                <IconSettings size={20} />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label={`All (${notifications.length})`} />
            <Tab label={`Unread (${unreadCount})`} />
            <Tab label="Friend Requests" />
            <Tab label="Blog Activity" />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {/* Notifications List */}
        <TabPanel value={tabValue} index={tabValue}>
          <Box>
            {loading ? (
              <List>
                {[...Array(5)].map((_, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Skeleton variant="circular" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Skeleton variant="text" width="60%" />}
                      secondary={<Skeleton variant="text" width="80%" />}
                    />
                  </ListItem>
                ))}
              </List>
            ) : filteredNotifications.length === 0 ? (
              <Box sx={{ p: 8, textAlign: 'center' }}>
                <IconBell size={64} color="lightgray" />
                <Typography variant="h6" mt={2} color="text.secondary">
                  No notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tabValue === 1 ? "You're all caught up!" : "No notifications to show"}
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredNotifications.map((notification) => (
                  <ListItemButton
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      py: 2,
                      px: 3,
                      bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                      borderLeft: 4,
                      borderColor: notification.is_read ? 'transparent' : 'primary.main',
                    }}
                  >
                    <ListItemAvatar>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            bgcolor: `${NOTIFICATION_COLORS[notification.type as keyof typeof NOTIFICATION_COLORS] || 'default'}.light`,
                            color: `${NOTIFICATION_COLORS[notification.type as keyof typeof NOTIFICATION_COLORS] || 'default'}.main`,
                          }}
                        >
                          {getNotificationIcon(notification.type)}
                        </Box>
                        
                        {notification.sender && (
                          <Avatar
                            src={notification.sender.profile_image_url}
                            sx={{ width: 32, height: 32 }}
                          >
                            {notification.sender.first_name[0]}
                          </Avatar>
                        )}
                      </Stack>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="subtitle2" fontWeight={notification.is_read ? 'normal' : 'bold'}>
                            {notification.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getNotificationTime(notification.created_at)}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {notification.message}
                          </Typography>
                          
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={notification.type.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                              color={NOTIFICATION_COLORS[notification.type as keyof typeof NOTIFICATION_COLORS] as any}
                            />
                            
                            {notification.priority !== 'normal' && (
                              <Chip
                                label={notification.priority}
                                size="small"
                                color={getPriorityColor(notification.priority) as any}
                              />
                            )}
                          </Stack>
                        </Box>
                      }
                    />
                    
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isSelected = selectedNotifications.includes(notification.id);
                          if (isSelected) {
                            setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
                          } else {
                            setSelectedNotifications(prev => [...prev, notification.id]);
                          }
                        }}
                        color={selectedNotifications.includes(notification.id) ? 'primary' : 'default'}
                      >
                        <IconCheckbox size={16} />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAnchor({ element: e.currentTarget, notificationId: notification.id });
                        }}
                      >
                        <IconDots size={16} />
                      </IconButton>
                    </Stack>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor?.element}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              if (menuAnchor) {
                const notification = notifications.find(n => n.id === menuAnchor.notificationId);
                if (notification && !notification.is_read) {
                  markAsRead(menuAnchor.notificationId);
                }
              }
              setMenuAnchor(null);
            }}
          >
            <IconCheck size={16} style={{ marginRight: 8 }} />
            Mark as Read
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (menuAnchor) {
                deleteNotification(menuAnchor.notificationId);
              }
              setMenuAnchor(null);
            }}
          >
            <IconTrash size={16} style={{ marginRight: 8 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Settings Dialog */}
        <Dialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconSettings size={24} />
              Notification Settings
            </Stack>
          </DialogTitle>
          
          <DialogContent>
            {settings && (
              <Stack spacing={3}>
                {/* General Settings */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    General
                  </Typography>
                  
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notifications_enabled}
                          onChange={(e) =>
                            updateSettings({ notifications_enabled: e.target.checked })
                          }
                          disabled={settingsLoading}
                        />
                      }
                      label="Enable notifications"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.email_notifications}
                          onChange={(e) =>
                            updateSettings({ email_notifications: e.target.checked })
                          }
                          disabled={settingsLoading || !settings.notifications_enabled}
                        />
                      }
                      label="Email notifications"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.push_notifications}
                          onChange={(e) =>
                            updateSettings({ push_notifications: e.target.checked })
                          }
                          disabled={settingsLoading || !settings.notifications_enabled}
                        />
                      }
                      label="Browser notifications"
                    />
                  </Stack>
                </Box>

                <Divider />

                {/* Specific Notifications */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Notification Types
                  </Typography>
                  
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.custom_settings.friend_requests}
                          onChange={(e) =>
                            updateSettings({
                              custom_settings: {
                                ...settings.custom_settings,
                                friend_requests: e.target.checked,
                              },
                            })
                          }
                          disabled={settingsLoading || !settings.notifications_enabled}
                        />
                      }
                      label="Friend requests"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.custom_settings.blog_comments}
                          onChange={(e) =>
                            updateSettings({
                              custom_settings: {
                                ...settings.custom_settings,
                                blog_comments: e.target.checked,
                              },
                            })
                          }
                          disabled={settingsLoading || !settings.notifications_enabled}
                        />
                      }
                      label="Blog comments"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.custom_settings.blog_likes}
                          onChange={(e) =>
                            updateSettings({
                              custom_settings: {
                                ...settings.custom_settings,
                                blog_likes: e.target.checked,
                              },
                            })
                          }
                          disabled={settingsLoading || !settings.notifications_enabled}
                        />
                      }
                      label="Blog reactions"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.custom_settings.chat_messages}
                          onChange={(e) =>
                            updateSettings({
                              custom_settings: {
                                ...settings.custom_settings,
                                chat_messages: e.target.checked,
                              },
                            })
                          }
                          disabled={settingsLoading || !settings.notifications_enabled}
                        />
                      }
                      label="Chat messages"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.custom_settings.mentions}
                          onChange={(e) =>
                            updateSettings({
                              custom_settings: {
                                ...settings.custom_settings,
                                mentions: e.target.checked,
                              },
                            })
                          }
                          disabled={settingsLoading || !settings.notifications_enabled}
                        />
                      }
                      label="Mentions"
                    />
                  </Stack>
                </Box>
              </Stack>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </PageContainer>
  );
};

export default NotificationCenter; 