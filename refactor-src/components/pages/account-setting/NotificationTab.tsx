import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import Grid2 from '@/mui/Grid2';
import { Avatar, Box, CardContent, IconButton, Typography, Tooltip, Button, Stack, Alert } from '@mui/material';
const Grid = Grid2;

// components
import BlankCard from '../../shared/BlankCard.tsx';
import CustomTextField from '../../forms/theme-elements/CustomTextField.tsx';
import CustomFormLabel from '../../forms/theme-elements/CustomFormLabel.tsx';
import CustomSwitch from '../../forms/theme-elements/CustomSwitch.tsx';
import {
  IconArticle,
  IconCheckbox,
  IconClock,
  IconDownload,
  IconMail,
  IconPlayerPause,
  IconTruckDelivery,
} from '@tabler/icons-react';

// API helpers
import { getNotifications, saveNotifications, NotificationPrefs } from '@/api/account';

const NotificationTab = () => {
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    marketing_email: false,
    product_updates: true,
    security_alerts: true,
    weekly_digest: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const prefs = await getNotifications(1); // TODO: Get from auth context
      if (prefs) {
        setNotifications(prefs);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleNotificationChange = (field: keyof NotificationPrefs, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const success = await saveNotifications(1, notifications);
      if (success) {
        setMessage({ type: 'success', text: 'Notification preferences saved successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save notification preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving notification preferences' });
    } finally {
      setLoading(false);
    }
  };

  return (<>
    <Grid2 container spacing={3} justifyContent="center">
      {message && (
        <Grid2 size={12}>
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        </Grid2>
      )}
      <Grid2
        size={{
          xs: 12,
          lg: 9
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h4" mb={2}>
              Notification Preferences
            </Typography>
            <Typography color="textSecondary">
              Select the notificaitons ou would like to receive via email. Please note that you
              cannot opt out of receving service messages, such as payment, security or legal
              notifications.
            </Typography>

            <CustomFormLabel htmlFor="text-email">Email Address*</CustomFormLabel>
            <CustomTextField id="text-email" variant="outlined" fullWidth />
            <Typography color="textSecondary">Required for notificaitons.</Typography>

            {/* list 1 */}
            <Stack direction="row" spacing={2} mt={4}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconArticle size="22" />
              </Avatar>
              <Box>
                <Typography variant="h6" mb={1}>
                  Marketing Emails
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Receive promotional emails and special offers
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <CustomSwitch 
                  checked={notifications.marketing_email}
                  onChange={(e) => handleNotificationChange('marketing_email', e.target.checked)}
                />
              </Box>
            </Stack>

            {/* list 2 */}
            <Stack direction="row" spacing={2} mt={3}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconCheckbox size="22" />
              </Avatar>
              <Box>
                <Typography variant="h6" mb={1}>
                  Product Updates
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Get notified about new features and updates
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <CustomSwitch 
                  checked={notifications.product_updates}
                  onChange={(e) => handleNotificationChange('product_updates', e.target.checked)}
                />
              </Box>
            </Stack>

            {/* list 3 */}
            <Stack direction="row" spacing={2} mt={3}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconClock size="22" />
              </Avatar>
              <Box>
                <Typography variant="h6" mb={1}>
                  Security Alerts
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Important security notifications and alerts
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <CustomSwitch 
                  checked={notifications.security_alerts}
                  onChange={(e) => handleNotificationChange('security_alerts', e.target.checked)}
                />
              </Box>
            </Stack>

            {/* list 4 */}
            <Stack direction="row" spacing={2} mt={3}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconTruckDelivery size="22" />
              </Avatar>
              <Box>
                <Typography variant="h6" mb={1}>
                  Weekly Digest
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Weekly summary of activities and updates
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <CustomSwitch 
                  checked={notifications.weekly_digest}
                  onChange={(e) => handleNotificationChange('weekly_digest', e.target.checked)}
                />
              </Box>
            </Stack>

            {/* list 5 */}
            <Stack direction="row" spacing={2} mt={3}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconMail size="22" />
              </Avatar>
              <Box>
                <Typography variant="h6" mb={1}>
                  Email Notification
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Turn on email notificaiton to get updates through email
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <CustomSwitch checked />
              </Box>
            </Stack>
          </CardContent>
        </BlankCard>
      </Grid2>

      {/* 2 */}
      <Grid2
        size={{
          xs: 12,
          lg: 9
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h4" mb={2}>
              Date & Time
            </Typography>
            <Typography color="textSecondary">
              Time zones and calendar display settings.
            </Typography>

            {/* list 1 */}
            <Stack direction="row" spacing={2} mt={4}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconClock size="22" />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Time zone
                </Typography>
                <Typography variant="h6" mb={1}>
                  (UTC + 02:00) Athens, Bucharet
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <Tooltip title="Download">
                  <IconButton>
                    <IconDownload size="22" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Stack>
          </CardContent>
        </BlankCard>
      </Grid2>

      {/* 3 */}
      <Grid2
        size={{
          xs: 12,
          lg: 9
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h4" mb={2}>
              Ignore Tracking
            </Typography>

            {/* list 1 */}
            <Stack direction="row" spacing={2} mt={4}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconPlayerPause size="22" />
              </Avatar>
              <Box>
                <Typography variant="h6" mb={1}>
                  Ignore Browser Tracking
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Browser Cookie
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <CustomSwitch />
              </Box>
            </Stack>
          </CardContent>
        </BlankCard>
      </Grid2>
    </Grid2>
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'end' }} mt={3}>
      <Button 
        size="large" 
        variant="contained" 
        color="primary"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save'}
      </Button>
      <Button size="large" variant="text" color="error">
        Cancel
      </Button>
    </Stack>
  </>);
};

export default NotificationTab;
