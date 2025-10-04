/**
 * Orthodox Metrics - Chat Settings Component
 * User preferences and settings for the chat application
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  Button,
  Divider,
  Alert,
  Paper,
  Slider,
  TextField,
  Avatar,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Badge,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  VolumeUp as SoundIcon,
  Visibility as VisibilityIcon,
  Palette as ThemeIcon,
  TextFields as FontIcon,
  Download as DownloadIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  PhotoCamera as CameraIcon,
  NotificationsActive as TestIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Scrollbar from '../../custom-scroll/Scrollbar';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  bio?: string;
  location?: string;
  church_affiliation?: string;
}

interface ChatSettingsProps {
  user: User;
  onNotificationTest: () => void;
}

interface Settings {
  enable_notifications: boolean;
  enable_sound: boolean;
  enable_typing_indicators: boolean;
  enable_read_receipts: boolean;
  theme: 'light' | 'dark' | 'auto';
  font_size: 'small' | 'medium' | 'large';
  auto_download_media: boolean;
  message_preview: boolean;
  online_status_visible: boolean;
  last_seen_visible: boolean;
}

const ChatSettings: React.FC<ChatSettingsProps> = ({
  user,
  onNotificationTest,
}) => {
  const [settings, setSettings] = useState<Settings>({
    enable_notifications: true,
    enable_sound: true,
    enable_typing_indicators: true,
    enable_read_receipts: true,
    theme: 'auto',
    font_size: 'medium',
    auto_download_media: true,
    message_preview: true,
    online_status_visible: true,
    last_seen_visible: true,
  });

  const [profile, setProfile] = useState({
    display_name: user.display_name || `${user.first_name} ${user.last_name}`,
    bio: user.bio || '',
    location: user.location || '',
    church_affiliation: user.church_affiliation || '',
  });

  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 100 });

  useEffect(() => {
    loadSettings();
    loadBlockedUsers();
    loadStorageUsage();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/social/chat/settings', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const response = await fetch('/api/social/friends?status=blocked', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBlockedUsers(data.friends || []);
        }
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  const loadStorageUsage = async () => {
    try {
      const response = await fetch('/api/social/chat/storage-usage', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStorageUsage(data.usage);
        }
      }
    } catch (error) {
      console.error('Error loading storage usage:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/social/chat/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save profile');
      }
      
      setEditingProfile(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const unblockUser = async (friendshipId: number) => {
    try {
      const response = await fetch(`/api/social/friends/unblock/${friendshipId}`, {
        method: 'PUT',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to unblock user');
      }
      
      loadBlockedUsers();
      setSuccess('User unblocked successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error unblocking user:', error);
      setError('Failed to unblock user');
    }
  };

  const clearChatData = async () => {
    if (!confirm('Are you sure you want to clear all chat data? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/social/chat/clear-data', {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear chat data');
      }
      
      setSuccess('Chat data cleared successfully');
      setTimeout(() => setSuccess(null), 3000);
      loadStorageUsage();
    } catch (error) {
      console.error('Error clearing chat data:', error);
      setError('Failed to clear chat data');
    }
  };

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={600}>
          Chat Settings
        </Typography>
      </Box>

      {/* Error/Success Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 1 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mx: 2, mt: 1 }}>
          {success}
        </Alert>
      )}

      <Scrollbar sx={{ flexGrow: 1 }}>
        <Box sx={{ p: 2, pb: 4 }}>
          {/* Profile Section */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Profile
              </Typography>
              <IconButton
                onClick={() => setEditingProfile(!editingProfile)}
                color={editingProfile ? 'primary' : 'default'}
              >
                <EditIcon />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <IconButton size="small" sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                    <CameraIcon fontSize="small" />
                  </IconButton>
                }
              >
                <Avatar
                  src={user.profile_image_url}
                  sx={{ width: 80, height: 80 }}
                >
                  {user.first_name.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">
                  {user.first_name} {user.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  @{user.display_name || `${user.first_name.toLowerCase()}_${user.last_name.toLowerCase()}`}
                </Typography>
              </Box>
            </Box>

            {editingProfile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Display Name"
                  value={profile.display_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                  fullWidth
                  size="small"
                />
                
                <TextField
                  label="Bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                />
                
                <TextField
                  label="Location"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  fullWidth
                  size="small"
                />
                
                <TextField
                  label="Church Affiliation"
                  value={profile.church_affiliation}
                  onChange={(e) => setProfile(prev => ({ ...prev, church_affiliation: e.target.value }))}
                  fullWidth
                  size="small"
                />
                
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => setEditingProfile(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={saveProfile}
                    disabled={saving}
                    startIcon={<SaveIcon />}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {profile.bio && (
                  <Typography variant="body2">{profile.bio}</Typography>
                )}
                {profile.location && (
                  <Typography variant="body2" color="text.secondary">
                    📍 {profile.location}
                  </Typography>
                )}
                {profile.church_affiliation && (
                  <Typography variant="body2" color="text.secondary">
                    ⛪ {profile.church_affiliation}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>

          {/* Notifications */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <NotificationsIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Notifications
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enable_notifications}
                    onChange={(e) => handleSettingChange('enable_notifications', e.target.checked)}
                  />
                }
                label="Enable notifications"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enable_sound}
                    onChange={(e) => handleSettingChange('enable_sound', e.target.checked)}
                    disabled={!settings.enable_notifications}
                  />
                }
                label="Sound notifications"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.message_preview}
                    onChange={(e) => handleSettingChange('message_preview', e.target.checked)}
                    disabled={!settings.enable_notifications}
                  />
                }
                label="Show message previews"
              />
              
              <Button
                variant="outlined"
                onClick={onNotificationTest}
                startIcon={<TestIcon />}
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Test Notification
              </Button>
            </Box>
          </Paper>

          {/* Privacy */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Privacy
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enable_read_receipts}
                    onChange={(e) => handleSettingChange('enable_read_receipts', e.target.checked)}
                  />
                }
                label="Send read receipts"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enable_typing_indicators}
                    onChange={(e) => handleSettingChange('enable_typing_indicators', e.target.checked)}
                  />
                }
                label="Show typing indicators"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.online_status_visible}
                    onChange={(e) => handleSettingChange('online_status_visible', e.target.checked)}
                  />
                }
                label="Show online status"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.last_seen_visible}
                    onChange={(e) => handleSettingChange('last_seen_visible', e.target.checked)}
                    disabled={!settings.online_status_visible}
                  />
                }
                label="Show last seen"
              />
            </Box>
          </Paper>

          {/* Appearance */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <ThemeIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Appearance
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl>
                <FormLabel>Theme</FormLabel>
                <RadioGroup
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  row
                >
                  <FormControlLabel value="light" control={<Radio />} label="Light" />
                  <FormControlLabel value="dark" control={<Radio />} label="Dark" />
                  <FormControlLabel value="auto" control={<Radio />} label="Auto" />
                </RadioGroup>
              </FormControl>
              
              <FormControl>
                <FormLabel>Font Size</FormLabel>
                <RadioGroup
                  value={settings.font_size}
                  onChange={(e) => handleSettingChange('font_size', e.target.value)}
                  row
                >
                  <FormControlLabel value="small" control={<Radio />} label="Small" />
                  <FormControlLabel value="medium" control={<Radio />} label="Medium" />
                  <FormControlLabel value="large" control={<Radio />} label="Large" />
                </RadioGroup>
              </FormControl>
            </Box>
          </Paper>

          {/* Media & Storage */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <DownloadIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Media & Storage
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auto_download_media}
                    onChange={(e) => handleSettingChange('auto_download_media', e.target.checked)}
                  />
                }
                label="Auto-download media"
              />
              
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Storage Usage
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Slider
                      value={(storageUsage.used / storageUsage.total) * 100}
                      disabled
                      sx={{ color: storageUsage.used > storageUsage.total * 0.8 ? 'error.main' : 'primary.main' }}
                    />
                  </Box>
                  <Typography variant="body2">
                    {formatFileSize(storageUsage.used)} / {formatFileSize(storageUsage.total)}
                  </Typography>
                </Box>
              </Box>
              
              <Button
                variant="outlined"
                color="error"
                onClick={clearChatData}
                startIcon={<DeleteIcon />}
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear Chat Data
              </Button>
            </Box>
          </Paper>

          {/* Blocked Users */}
          {blockedUsers.length > 0 && (
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <BlockIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Blocked Users
                </Typography>
              </Box>

              <List dense>
                {blockedUsers.map((blockedUser) => (
                  <ListItem key={blockedUser.id}>
                    <ListItemIcon>
                      <Avatar
                        src={blockedUser.friend_info.profile_image_url}
                        sx={{ width: 32, height: 32 }}
                      >
                        {blockedUser.friend_info.first_name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={`${blockedUser.friend_info.first_name} ${blockedUser.friend_info.last_name}`}
                      secondary={blockedUser.friend_info.display_name}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        onClick={() => unblockUser(blockedUser.id)}
                      >
                        Unblock
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              onClick={saveSettings}
              disabled={saving}
              size="large"
              startIcon={saving ? <RefreshIcon /> : <SaveIcon />}
              sx={{ minWidth: 150 }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Box>
      </Scrollbar>
    </Box>
  );
};

export default ChatSettings; 