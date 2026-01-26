import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
  Avatar,
  Box,
  CardContent,
  IconButton,
  Typography,
  Button,
  Divider,
  Stack,
  TextField,
  Alert
} from '@mui/material';

const Grid = Grid2;

// components
import BlankCard from '../../shared/BlankCard.tsx';
import CustomTextField from '../../forms/theme-elements/CustomTextField.tsx';
import CustomFormLabel from '../../forms/theme-elements/CustomFormLabel.tsx';
import { IconDeviceLaptop, IconDeviceMobile, IconDotsVertical } from '@tabler/icons-react';

// API helpers
import { changePassword } from '@/account';

const SecurityTab = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      const success = await changePassword(1, passwordData.currentPassword, passwordData.newPassword);
      if (success) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error changing password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Grid2 container spacing={3} justifyContent="center">
        {/* Change Password Section */}
        <Grid2 size={12}>
          <BlankCard>
            <CardContent>
              <Typography variant="h4" mb={2}>
                Change Password
              </Typography>
              {message && (
                <Alert severity={message.type} sx={{ mb: 2 }}>
                  {message.text}
                </Alert>
              )}
              <Grid2 container spacing={3}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <CustomFormLabel htmlFor="current-password">Current Password</CustomFormLabel>
                  <CustomTextField
                    id="current-password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="Enter current password"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <CustomFormLabel htmlFor="new-password">New Password</CustomFormLabel>
                  <CustomTextField
                    id="new-password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="Enter new password"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <CustomFormLabel htmlFor="confirm-password">Confirm New Password</CustomFormLabel>
                  <CustomTextField
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="Confirm new password"
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'end', height: '100%' }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={handleChangePassword}
                      disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    >
                      {loading ? 'Changing...' : 'Change Password'}
                    </Button>
                  </Box>
                </Grid2>
              </Grid2>
            </CardContent>
          </BlankCard>
        </Grid2>

        <Grid
          size={{
            xs: 12,
            lg: 8
          }}>
          <BlankCard>
            <CardContent>
              <Typography variant="h4" mb={2}>
                Two-factor Authentication
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="subtitle1" color="textSecondary">
                  Lorem ipsum, dolor sit amet consectetur adipisicing elit. Corporis sapiente sunt
                  earum officiis laboriosam ut.
                </Typography>
                <Button variant="contained" color="primary">
                  Enable
                </Button>
              </Stack>

              <Divider />

              {/* list 1 */}
              <Stack direction="row" spacing={2} py={2} alignItems="center">
                <Box>
                  <Typography variant="h6">Authentication App</Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Google auth app
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto !important' }}>
                  <Button variant="text" color="primary">
                    Setup
                  </Button>
                </Box>
              </Stack>
              <Divider />
              {/* list 2 */}
              <Stack direction="row" spacing={2} py={2} alignItems="center">
                <Box>
                  <Typography variant="h6">Another e-mail</Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    E-mail to send verification link
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto !important' }}>
                  <Button variant="text" color="primary">
                    Setup
                  </Button>
                </Box>
              </Stack>
              <Divider />
              {/* list 3 */}
              <Stack direction="row" spacing={2} py={2} alignItems="center">
                <Box>
                  <Typography variant="h6">SMS Recovery</Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Your phone number or something
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto !important' }}>
                  <Button variant="text" color="primary">
                    Setup
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid2>

        <Grid
          size={{
            xs: 12,
            lg: 4
          }}>
          <BlankCard>
            <CardContent>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}
              >
                <IconDeviceLaptop size="26" />
              </Avatar>

              <Typography variant="h5" mt={2}>
                Devices
              </Typography>
              <Typography color="textSecondary" mt={1} mb={2}>
                Lorem ipsum dolor sit amet consectetur adipisicing elit Rem.
              </Typography>
              <Button variant="contained" color="primary">
                Sign out from all devices
              </Button>

              {/* list 1 */}
              <Stack direction="row" spacing={2} py={2} mt={3} alignItems="center">
                <IconDeviceMobile size="26" />

                <Box>
                  <Typography variant="h6">iPhone 14</Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    London UK, Oct 23 at 1:15 AM
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto !important' }}>
                  <IconButton>
                    <IconDotsVertical size="22" />
                  </IconButton>
                </Box>
              </Stack>
              <Divider />
              {/* list 2 */}
              <Stack direction="row" spacing={2} py={2} alignItems="center">
                <IconDeviceLaptop size="26" />

                <Box>
                  <Typography variant="h6">Macbook Air </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Gujarat India, Oct 24 at 3:15 AM
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto !important' }}>
                  <IconButton>
                    <IconDotsVertical size="22" />
                  </IconButton>
                </Box>
              </Stack>
              <Stack>
                <Button variant="text" color="primary">
                  Need Help ?
                </Button>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid2>
      </Grid2>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'end' }} mt={3}>
        <Button size="large" variant="contained" color="primary">
          Save
        </Button>
        <Button size="large" variant="text" color="error">
          Cancel
        </Button>
      </Stack>
    </>
  );
};

export default SecurityTab;
