// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Grid2 from '@/components/compat/Grid2';
import { useAuth } from '@/context/AuthContext';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { RoleAvatar, getRoleLabel } from '@/utils/roleAvatars';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
    InputAdornment,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

interface ProfileData {
  display_name: string;
  company: string;
  location: string;
  email: string;
  phone: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfile = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [profileData, setProfileData] = useState<ProfileData>({
    display_name: '',
    company: '',
    location: '',
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Account Settings' },
  ];

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/profile', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profile) {
            const p = data.profile;
            setProfileData({
              display_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
              company: p.company || '',
              location: p.location || '',
              email: p.email || user.email || '',
              phone: p.phone || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleProfileChange = (field: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handlePasswordChange = (field: keyof PasswordData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSnackbar({ open: true, message: 'All password fields are required', severity: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSnackbar({ open: true, message: 'New password and confirm password do not match', severity: 'error' });
      return;
    }

    if (newPassword.length < 8) {
      setSnackbar({ open: true, message: 'Password must be at least 8 characters', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/user/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSnackbar({ open: true, message: 'Password changed successfully', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.message || 'Failed to change password', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to change password', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          display_name: profileData.display_name,
          company: profileData.company,
          location: profileData.location,
          phone: profileData.phone,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSnackbar({ open: true, message: 'Profile saved successfully', severity: 'success' });
      } else {
        throw new Error(data.message || 'Save failed');
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to save profile', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Account Settings" description="Manage your account settings">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Account Settings" description="Manage your account settings">
      <Breadcrumb title="Account Settings" items={BCrumb} />

      <Grid2 container spacing={3}>
        {/* Account Info */}
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight={600} mb={3}>
                Account Info
              </Typography>

              <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                <RoleAvatar role={user?.role} size={80} sx={{ mb: 2 }} />
                <Chip
                  label={getRoleLabel(user?.role)}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                  }}
                />
              </Box>

              <Stack spacing={2}>
                <TextField
                  label="Email"
                  value={profileData.email}
                  disabled
                  fullWidth
                  size="small"
                  helperText="Email cannot be changed"
                />
                <TextField
                  label="Role"
                  value={getRoleLabel(user?.role)}
                  disabled
                  fullWidth
                  size="small"
                />
                {user?.church_name && (
                  <TextField
                    label="Church"
                    value={user.church_name}
                    disabled
                    fullWidth
                    size="small"
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* Change Password */}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight={600} mb={1}>
                Change Password
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                To change your password please confirm here
              </Typography>

              <Stack spacing={2.5}>
                <TextField
                  label="Current Password"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange('currentPassword')}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                          edge="end"
                          size="small"
                        >
                          {showPasswords.current ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="New Password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange('newPassword')}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                          edge="end"
                          size="small"
                        >
                          {showPasswords.new ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Confirm Password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange('confirmPassword')}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                          edge="end"
                          size="small"
                        >
                          {showPasswords.confirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleChangePassword}
                  disabled={saving}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {saving ? <CircularProgress size={20} /> : 'Change Password'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* Personal Details */}
        <Grid2 size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight={600} mb={1}>
                Personal Details
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                To change your personal detail, edit and save from here
              </Typography>

              <Grid2 container spacing={3}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Your Name"
                    value={profileData.display_name}
                    onChange={handleProfileChange('display_name')}
                    fullWidth
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Organization"
                    value={profileData.company}
                    onChange={handleProfileChange('company')}
                    fullWidth
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Location"
                    value={profileData.location}
                    onChange={handleProfileChange('location')}
                    fullWidth
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Phone"
                    value={profileData.phone}
                    onChange={handleProfileChange('phone')}
                    fullWidth
                  />
                </Grid2>
              </Grid2>

              <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'Save'}
                </Button>
                <Button
                  variant="text"
                  color="error"
                  onClick={() => window.location.reload()}
                >
                  Cancel
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default UserProfile;
