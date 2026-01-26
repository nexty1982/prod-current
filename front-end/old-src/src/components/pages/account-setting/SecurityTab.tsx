// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
  Avatar,
  Box,
  CardContent,
  Grid,
  IconButton,
  Typography,
  Button,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Switch
} from '@mui/material';

// components
import BlankCard from '../../shared/BlankCard';
import CustomFormLabel from '../../forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../forms/theme-elements/CustomTextField';
import { IconDeviceLaptop, IconDeviceMobile, IconDotsVertical, IconLock, IconKey, IconShield } from '@tabler/icons-react';

// context
import { useAuth } from '../../../context/AuthContext';

const SecurityTab = () => {
  const { user } = useAuth();

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Admin password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [adminResetDialogOpen, setAdminResetDialogOpen] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [adminResetLoading, setAdminResetLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Two-factor authentication state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const handlePasswordFormChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handlePasswordChange = async () => {
    setLoading(true);
    setMessage(null);

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Password change error:', error);
      setMessage({ type: 'error', text: 'An error occurred while changing your password' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminPasswordReset = async () => {
    setAdminResetLoading(true);
    setAdminMessage(null);

    if (!resetEmail) {
      setAdminMessage({ type: 'error', text: 'Email address is required' });
      setAdminResetLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/admin-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: resetEmail
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAdminMessage({ type: 'success', text: `Password reset successfully! New password: ${data.tempPassword}` });
        setResetEmail('');
      } else {
        setAdminMessage({ type: 'error', text: data.message || 'Failed to reset password' });
      }
    } catch (error) {
      console.error('Admin password reset error:', error);
      setAdminMessage({ type: 'error', text: 'An error occurred while resetting the password' });
    } finally {
      setAdminResetLoading(false);
    }
  };

  return (<>
    <Grid container spacing={3}>
      {/* Change Password Section */}
      <Grid size={{ xs: 12, lg: 6 }}>
        <BlankCard>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
              <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main', width: 48, height: 48 }}>
                <IconLock size="24" />
              </Avatar>
              <Box>
                <Typography variant="h5">Change Password</Typography>
                <Typography color="textSecondary">Update your account password</Typography>
              </Box>
            </Stack>

            {message && (
              <Alert severity={message.type} sx={{ mb: 2 }}>
                {message.text}
              </Alert>
            )}

            <Box component="form" noValidate>
              <CustomFormLabel htmlFor="current-password">Current Password</CustomFormLabel>
              <CustomTextField
                id="current-password"
                type="password"
                fullWidth
                value={passwordForm.currentPassword}
                onChange={handlePasswordFormChange('currentPassword')}
                placeholder="Enter your current password"
                margin="normal"
              />

              <CustomFormLabel htmlFor="new-password">New Password</CustomFormLabel>
              <CustomTextField
                id="new-password"
                type="password"
                fullWidth
                value={passwordForm.newPassword}
                onChange={handlePasswordFormChange('newPassword')}
                placeholder="Enter new password (min 8 characters)"
                margin="normal"
              />

              <CustomFormLabel htmlFor="confirm-password">Confirm New Password</CustomFormLabel>
              <CustomTextField
                id="confirm-password"
                type="password"
                fullWidth
                value={passwordForm.confirmPassword}
                onChange={handlePasswordFormChange('confirmPassword')}
                placeholder="Confirm your new password"
                margin="normal"
              />

              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3 }}
                onClick={handlePasswordChange}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <IconKey size="20" />}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </Box>
          </CardContent>
        </BlankCard>
      </Grid>

      {/* Admin Password Reset Section */}
      {isAdmin && (
        <Grid size={{ xs: 12, lg: 6 }}>
          <BlankCard>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main', width: 48, height: 48 }}>
                  <IconShield size="24" />
                </Avatar>
                <Box>
                  <Typography variant="h5">Admin: Reset User Password</Typography>
                  <Typography color="textSecondary">Reset any user's password (Admin only)</Typography>
                </Box>
              </Stack>

              {adminMessage && (
                <Alert severity={adminMessage.type} sx={{ mb: 2 }}>
                  {adminMessage.text}
                </Alert>
              )}

              <Box component="form" noValidate>
                <CustomFormLabel htmlFor="reset-email">User Email Address</CustomFormLabel>
                <CustomTextField
                  id="reset-email"
                  type="email"
                  fullWidth
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter user's email address"
                  margin="normal"
                />

                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={() => setAdminResetDialogOpen(true)}
                  disabled={adminResetLoading || !resetEmail}
                  startIcon={<IconShield size="20" />}
                >
                  Reset User Password
                </Button>
              </Box>
            </CardContent>
          </BlankCard>
        </Grid>
      )}

      {/* Two-Factor Authentication Section */}
      <Grid size={{ xs: 12 }}>
        <BlankCard>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
              <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}>
                <IconShield size="24" />
              </Avatar>
              <Box>
                <Typography variant="h5">Two-Factor Authentication</Typography>
                <Typography color="textSecondary">Add an extra layer of security to your account</Typography>
              </Box>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
              <Box>
                <Typography variant="h6">Enable Two-Factor Authentication</Typography>
                <Typography variant="body2" color="textSecondary">
                  Protect your account with an additional security layer using authentication apps
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorEnabled}
                    onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                    color="primary"
                  />
                }
                label=""
              />
            </Stack>

            <Divider />

            {twoFactorEnabled && (
              <Box mt={3}>
                <Typography variant="h6" mb={2}>Authentication Methods</Typography>

                <Stack direction="row" spacing={2} py={2} alignItems="center">
                  <IconDeviceMobile size="24" />
                  <Box flexGrow={1}>
                    <Typography variant="body1">Authentication App</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Google Authenticator, Authy, or similar apps
                    </Typography>
                  </Box>
                  <Button variant="outlined" size="small">
                    Configure
                  </Button>
                </Stack>
              </Box>
            )}
          </CardContent>
        </BlankCard>
      </Grid>

      {/* Active Devices Section */}
      <Grid size={{ xs: 12 }}>
        <BlankCard>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
              <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', width: 48, height: 48 }}>
                <IconDeviceLaptop size="24" />
              </Avatar>
              <Box>
                <Typography variant="h5">Active Devices</Typography>
                <Typography color="textSecondary">Manage devices that have access to your account</Typography>
              </Box>
            </Stack>

            <Button variant="outlined" color="error" sx={{ mb: 3 }}>
              Sign out from all devices
            </Button>

            {/* Device List */}
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} py={2} alignItems="center">
                <IconDeviceMobile size="26" />
                <Box flexGrow={1}>
                  <Typography variant="h6">iPhone 14</Typography>
                  <Typography variant="body2" color="textSecondary">
                    London UK, Oct 23 at 1:15 AM
                  </Typography>
                </Box>
                <IconButton>
                  <IconDotsVertical size="22" />
                </IconButton>
              </Stack>

              <Divider />

              <Stack direction="row" spacing={2} py={2} alignItems="center">
                <IconDeviceLaptop size="26" />
                <Box flexGrow={1}>
                  <Typography variant="h6">MacBook Air</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Gujarat India, Oct 24 at 3:15 AM
                  </Typography>
                </Box>
                <IconButton>
                  <IconDotsVertical size="22" />
                </IconButton>
              </Stack>
            </Stack>
          </CardContent>
        </BlankCard>
      </Grid>
    </Grid>

    {/* Admin Reset Confirmation Dialog */}
    <Dialog
      open={adminResetDialogOpen}
      onClose={() => setAdminResetDialogOpen(false)}
    >
      <DialogTitle>Reset User Password</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to reset the password for <strong>{resetEmail}</strong>?
          <br /><br />
          This will generate a new temporary password that the user must change on their next login.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAdminResetDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={() => {
            setAdminResetDialogOpen(false);
            handleAdminPasswordReset();
          }}
          color="error"
          variant="contained"
          disabled={adminResetLoading}
        >
          {adminResetLoading ? <CircularProgress size={20} /> : 'Reset Password'}
        </Button>
      </DialogActions>
    </Dialog>
  </>);
};

export default SecurityTab;
