import React, { useState } from 'react';
import {
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  Typography,
} from '@mui/material';

interface NotificationSetting {
  label: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

const defaultSettings: NotificationSetting[] = [
  { label: 'Order Confirmation', email: true, sms: false, push: true },
  { label: 'Order Status Changed', email: true, sms: true, push: true },
  { label: 'Order Delivered', email: true, sms: false, push: false },
  { label: 'Email Newsletter', email: false, sms: false, push: false },
];

export default function NotificationsTab() {
  const [settings, setSettings] = useState(defaultSettings);
  const [masterEmail, setMasterEmail] = useState(true);
  const [masterSMS, setMasterSMS] = useState(false);
  const [masterPush, setMasterPush] = useState(true);

  const handleToggle = (index: number, channel: 'email' | 'sms' | 'push') => {
    setSettings((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [channel]: !s[channel] } : s))
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Typography variant="subtitle1" gutterBottom>
          Notification Preferences
        </Typography>
      </Grid>

      {/* Master toggles */}
      <Grid size={12}>
        <Stack direction="row" spacing={4}>
          <FormControlLabel
            control={
              <Switch
                checked={masterEmail}
                onChange={() => setMasterEmail(!masterEmail)}
                color="primary"
              />
            }
            label="Email Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={masterSMS}
                onChange={() => setMasterSMS(!masterSMS)}
                color="primary"
              />
            }
            label="SMS Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={masterPush}
                onChange={() => setMasterPush(!masterPush)}
                color="primary"
              />
            }
            label="Push Notifications"
          />
        </Stack>
      </Grid>

      <Grid size={12}>
        <Divider />
      </Grid>

      {/* Per-notification toggles */}
      {settings.map((setting, index) => (
        <Grid size={12} key={setting.label}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="body1" sx={{ minWidth: 200 }}>
              {setting.label}
            </Typography>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setting.email}
                    onChange={() => handleToggle(index, 'email')}
                    size="small"
                  />
                }
                label="Email"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setting.sms}
                    onChange={() => handleToggle(index, 'sms')}
                    size="small"
                  />
                }
                label="SMS"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setting.push}
                    onChange={() => handleToggle(index, 'push')}
                    size="small"
                  />
                }
                label="Push"
              />
            </Stack>
          </Stack>
        </Grid>
      ))}
    </Grid>
  );
}
