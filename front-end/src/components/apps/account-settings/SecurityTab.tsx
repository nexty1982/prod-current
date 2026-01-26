import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  Switch,
  Grid,
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  IconShield,
  IconLock,
  IconDevices,
  IconKey,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconFingerprint
} from '@tabler/icons-react';

const SecurityTab = ({ 
  securitySettings, 
  onSecurityUpdate,
  onPasswordChange,
  userActivity = []
}) => {
  const [settings, setSettings] = useState({
    two_factor_enabled: securitySettings?.two_factor_enabled ?? false,
    two_factor_method: securitySettings?.two_factor_method || 'email',
    login_alerts: securitySettings?.login_alerts ?? true,
    suspicious_activity_alerts: securitySettings?.suspicious_activity_alerts ?? true,
    max_concurrent_sessions: securitySettings?.max_concurrent_sessions || 5,
    session_timeout_minutes: securitySettings?.session_timeout_minutes || 480,
    auto_logout_enabled: securitySettings?.auto_logout_enabled ?? false
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateError, setUpdateError] = useState('');

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setUpdateError('');
      await onSecurityUpdate(settings);
      setUpdateMessage('Security settings updated successfully');
      setTimeout(() => setUpdateMessage(''), 3000);
    } catch (error) {
      setUpdateError('Failed to update security settings');
    }
  };

  const handlePasswordSubmit = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setUpdateError('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setUpdateError('New password must be at least 8 characters long');
      return;
    }

    try {
      setUpdateError('');
      await onPasswordChange({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setUpdateMessage('Password changed successfully');
      setTimeout(() => setUpdateMessage(''), 3000);
    } catch (error) {
      setUpdateError('Failed to change password');
    }
  };

  const toggleTwoFactor = async () => {
    if (!settings.two_factor_enabled) {
      setTwoFactorDialogOpen(true);
    } else {
      handleSettingChange('two_factor_enabled', false);
      await handleSave();
    }
  };

  const enableTwoFactor = async () => {
    handleSettingChange('two_factor_enabled', true);
    setTwoFactorDialogOpen(false);
    await handleSave();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const getSessionTimeoutLabel = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const SecuritySection = ({ title, icon, children }) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography variant="h6">
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {updateMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {updateMessage}
        </Alert>
      )}
      {updateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {updateError}
        </Alert>
      )}

      {/* Two-Factor Authentication */}
      <SecuritySection
        title="Two-Factor Authentication"
        icon={<IconShield size={24} />}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1">
              Two-Factor Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add an extra layer of security to your account
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {settings.two_factor_enabled && (
              <Chip
                icon={<IconCheck size={16} />}
                label="Enabled"
                color="success"
                size="small"
              />
            )}
            <Switch
              checked={settings.two_factor_enabled}
              onChange={toggleTwoFactor}
            />
          </Box>
        </Box>

        {settings.two_factor_enabled && (
          <Box sx={{ ml: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Method</InputLabel>
              <Select
                value={settings.two_factor_method}
                label="Method"
                onChange={(e) => handleSettingChange('two_factor_method', e.target.value)}
              >
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
                <MenuItem value="app">Authenticator App</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </SecuritySection>

      {/* Login Security */}
      <SecuritySection
        title="Login Security"
        icon={<IconLock size={24} />}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.login_alerts}
                  onChange={(e) => handleSettingChange('login_alerts', e.target.checked)}
                />
              }
              label="Email me when someone logs into my account"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.suspicious_activity_alerts}
                  onChange={(e) => handleSettingChange('suspicious_activity_alerts', e.target.checked)}
                />
              }
              label="Alert me about suspicious activity"
            />
          </Grid>
        </Grid>
      </SecuritySection>

      {/* Session Management */}
      <SecuritySection
        title="Session Management"
        icon={<IconDevices size={24} />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Max Concurrent Sessions</InputLabel>
              <Select
                value={settings.max_concurrent_sessions}
                label="Max Concurrent Sessions"
                onChange={(e) => handleSettingChange('max_concurrent_sessions', e.target.value)}
              >
                <MenuItem value={1}>1 session</MenuItem>
                <MenuItem value={3}>3 sessions</MenuItem>
                <MenuItem value={5}>5 sessions</MenuItem>
                <MenuItem value={10}>10 sessions</MenuItem>
                <MenuItem value={-1}>Unlimited</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Session Timeout</InputLabel>
              <Select
                value={settings.session_timeout_minutes}
                label="Session Timeout"
                onChange={(e) => handleSettingChange('session_timeout_minutes', e.target.value)}
              >
                <MenuItem value={30}>30 minutes</MenuItem>
                <MenuItem value={60}>1 hour</MenuItem>
                <MenuItem value={120}>2 hours</MenuItem>
                <MenuItem value={240}>4 hours</MenuItem>
                <MenuItem value={480}>8 hours</MenuItem>
                <MenuItem value={1440}>24 hours</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.auto_logout_enabled}
                  onChange={(e) => handleSettingChange('auto_logout_enabled', e.target.checked)}
                />
              }
              label={`Auto-logout after ${getSessionTimeoutLabel(settings.session_timeout_minutes)} of inactivity`}
            />
          </Grid>
        </Grid>
      </SecuritySection>

      {/* Password Change */}
      <SecuritySection
        title="Change Password"
        icon={<IconKey size={24} />}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type={showPasswords.current ? 'text' : 'password'}
              label="Current Password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    edge="end"
                  >
                    {showPasswords.current ? <IconEyeOff /> : <IconEye />}
                  </IconButton>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type={showPasswords.new ? 'text' : 'password'}
              label="New Password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    edge="end"
                  >
                    {showPasswords.new ? <IconEyeOff /> : <IconEye />}
                  </IconButton>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type={showPasswords.confirm ? 'text' : 'password'}
              label="Confirm New Password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    edge="end"
                  >
                    {showPasswords.confirm ? <IconEyeOff /> : <IconEye />}
                  </IconButton>
                )
              }}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handlePasswordSubmit}
            disabled={!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
          >
            Change Password
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Password requirements:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • At least 8 characters long
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Mix of uppercase and lowercase letters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • At least one number or special character
          </Typography>
        </Box>
      </SecuritySection>

      {/* Recent Activity */}
      <SecuritySection
        title="Recent Activity"
        icon={<IconClock size={24} />}
      >
        {userActivity.length > 0 ? (
          <List>
            {userActivity.slice(0, 10).map((activity, index) => (
              <ListItem key={index} divider={index < userActivity.length - 1}>
                <ListItemText
                  primary={activity.action.replace('_', ' ').toUpperCase()}
                  secondary={`${formatDate(activity.created_at)} • ${activity.ip_address}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">
            No recent activity to display
          </Typography>
        )}
      </SecuritySection>

      {/* Save Button */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          sx={{ minWidth: 200 }}
        >
          Save Security Settings
        </Button>
      </Box>

      {/* Two-Factor Setup Dialog */}
      <Dialog open={twoFactorDialogOpen} onClose={() => setTwoFactorDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconFingerprint />
            Enable Two-Factor Authentication
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Two-factor authentication adds an extra layer of security to your account by requiring
            a second form of verification when you sign in.
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Choose Method</InputLabel>
              <Select
                value={settings.two_factor_method}
                label="Choose Method"
                onChange={(e) => handleSettingChange('two_factor_method', e.target.value)}
              >
                <MenuItem value="email">
                  <Box>
                    <Typography variant="subtitle2">Email</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive codes via email
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="sms">
                  <Box>
                    <Typography variant="subtitle2">SMS</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive codes via text message
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="app">
                  <Box>
                    <Typography variant="subtitle2">Authenticator App</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use Google Authenticator or similar app
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTwoFactorDialogOpen(false)}>Cancel</Button>
          <Button onClick={enableTwoFactor} variant="contained">
            Enable Two-Factor Authentication
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityTab;
