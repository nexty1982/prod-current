import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Box,
  Stack,
  Divider,
  Button,
  Paper
} from '@mui/material';
import {
  IconBell,
  IconMail,
  IconDeviceFloppy,
  IconBellRinging,
  IconSettings
} from '@tabler/icons-react';

interface NotificationSettings {
  email_enabled: boolean;
  email_messages: boolean;
  email_friend_requests: boolean;
  email_posts: boolean;
  email_events: boolean;
  email_reminders: boolean;
  email_newsletters: boolean;
  email_announcements: boolean;
  email_security: boolean;
  push_enabled: boolean;
  push_messages: boolean;
  push_events: boolean;
  push_reminders: boolean;
  sms_enabled: boolean;
  sms_reminders: boolean;
  sms_security: boolean;
}

interface NotificationTabProps {
  settings?: Partial<NotificationSettings>;
  onSettingsUpdate?: (settings: Partial<NotificationSettings>) => void;
}

const NotificationTab: React.FC<NotificationTabProps> = ({ 
  settings: initialSettings = {}, 
  onSettingsUpdate = () => {} 
}) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    email_messages: true,
    email_friend_requests: true,
    email_posts: false,
    email_events: true,
    email_reminders: true,
    email_newsletters: false,
    email_announcements: true,
    email_security: true,
    push_enabled: true,
    push_messages: true,
    push_events: true,
    push_reminders: true,
    sms_enabled: false,
    sms_reminders: false,
    sms_security: true,
    ...initialSettings
  });

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsUpdate(newSettings);
  };

  const handleSaveChanges = () => {
    onSettingsUpdate(settings);
  };

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>Notification Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage how you receive notifications and updates
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<IconDeviceFloppy />} onClick={handleSaveChanges}>
          Save Changes
        </Button>
      </Box>

      <Stack spacing={3}>
        {/* Email Notifications */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <IconMail size={24} />
              <Typography variant="h6">Email Notifications</Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.email_enabled}
                  onChange={(e) => handleSettingChange('email_enabled', e.target.checked)}
                />
              }
              label="Enable email notifications"
              sx={{ mb: 2 }}
            />
            
            {settings.email_enabled && (
              <Stack spacing={2} sx={{ mt: 2, pl: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_messages}
                      onChange={(e) => handleSettingChange('email_messages', e.target.checked)}
                    />
                  }
                  label="New messages"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_friend_requests}
                      onChange={(e) => handleSettingChange('email_friend_requests', e.target.checked)}
                    />
                  }
                  label="Friend requests"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_posts}
                      onChange={(e) => handleSettingChange('email_posts', e.target.checked)}
                    />
                  }
                  label="New posts from friends"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_events}
                      onChange={(e) => handleSettingChange('email_events', e.target.checked)}
                    />
                  }
                  label="Church events"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_reminders}
                      onChange={(e) => handleSettingChange('email_reminders', e.target.checked)}
                    />
                  }
                  label="Event reminders"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_newsletters}
                      onChange={(e) => handleSettingChange('email_newsletters', e.target.checked)}
                    />
                  }
                  label="Newsletters"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_announcements}
                      onChange={(e) => handleSettingChange('email_announcements', e.target.checked)}
                    />
                  }
                  label="Church announcements"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email_security}
                      onChange={(e) => handleSettingChange('email_security', e.target.checked)}
                    />
                  }
                  label="Security alerts"
                />
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <IconBellRinging size={24} />
              <Typography variant="h6">Push Notifications</Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.push_enabled}
                  onChange={(e) => handleSettingChange('push_enabled', e.target.checked)}
                />
              }
              label="Enable push notifications"
              sx={{ mb: 2 }}
            />
            
            {settings.push_enabled && (
              <Stack spacing={2} sx={{ mt: 2, pl: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.push_messages}
                      onChange={(e) => handleSettingChange('push_messages', e.target.checked)}
                    />
                  }
                  label="New messages"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.push_events}
                      onChange={(e) => handleSettingChange('push_events', e.target.checked)}
                    />
                  }
                  label="Upcoming events"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.push_reminders}
                      onChange={(e) => handleSettingChange('push_reminders', e.target.checked)}
                    />
                  }
                  label="Event reminders"
                />
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* SMS Notifications */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <IconBell size={24} />
              <Typography variant="h6">SMS Notifications</Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.sms_enabled}
                  onChange={(e) => handleSettingChange('sms_enabled', e.target.checked)}
                />
              }
              label="Enable SMS notifications"
              sx={{ mb: 2 }}
            />
            
            {settings.sms_enabled && (
              <Stack spacing={2} sx={{ mt: 2, pl: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sms_reminders}
                      onChange={(e) => handleSettingChange('sms_reminders', e.target.checked)}
                    />
                  }
                  label="Event reminders"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sms_security}
                      onChange={(e) => handleSettingChange('sms_security', e.target.checked)}
                    />
                  }
                  label="Security alerts"
                />
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Notification Schedule */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <IconSettings size={24} />
              <Typography variant="h6">Notification Schedule</Typography>
            </Box>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Quiet hours: 10:00 PM - 7:00 AM
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Non-urgent notifications will be delayed during these hours
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default NotificationTab;
