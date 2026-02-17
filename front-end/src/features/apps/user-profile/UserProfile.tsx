// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Grid2 from '@/components/compat/Grid2';
import { useAuth } from '@/context/AuthContext';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

interface ProfileData {
  display_name: string;
  first_name: string;
  last_name: string;
  company: string;
  location: string;
  currency: string;
  email: string;
  phone: string;
  avatar_url: string | null;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'United States (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'United Kingdom (GBP)' },
  { value: 'CAD', label: 'Canada (CAD)' },
  { value: 'AUD', label: 'Australia (AUD)' },
  { value: 'INR', label: 'India (INR)' },
];

// Available preset avatars
const AVATAR_OPTIONS = [
  '/assets/images/orthodox/avatars/avatar-1.png',
  '/assets/images/orthodox/avatars/avatar-2.png',
  '/assets/images/orthodox/avatars/avatar-3.png',
  '/assets/images/orthodox/avatars/avatar-4.png',
  '/assets/images/orthodox/avatars/avatar-5.png',
  '/assets/images/orthodox/avatars/avatar-6.png',
  '/assets/images/orthodox/avatars/avatar-7.png',
  '/assets/images/orthodox/avatars/avatar-8.png',
  '/assets/images/orthodox/avatars/avatar-9.png',
  '/assets/images/orthodox/avatars/avatar-10.png',
  '/assets/images/orthodox/avatars/avatar-11.png',
  '/assets/images/orthodox/avatars/avatar-12.png',
  '/assets/images/orthodox/avatars/avatar-13.png',
  '/assets/images/orthodox/avatars/avatar-14.png',
  '/assets/images/orthodox/avatars/avatar-15.png',
  '/assets/images/orthodox/avatars/avatar-16.png',
  '/assets/images/orthodox/avatars/avatar-17.png',
];
const DEFAULT_AVATAR = '/assets/images/orthodox/avatars/default.png';

const UserProfile = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const [profileData, setProfileData] = useState<ProfileData>({
    display_name: '',
    first_name: '',
    last_name: '',
    company: '',
    location: '',
    currency: 'USD',
    email: '',
    phone: '',
    avatar_url: null,
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
              first_name: p.first_name || '',
              last_name: p.last_name || '',
              company: p.company || '',
              location: p.location || '',
              currency: p.currency || 'USD',
              email: p.email || user.email || '',
              phone: p.phone || '',
              avatar_url: p.profile_image_url || p.avatar_url || null,
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

  const handleProfileChange = (field: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
    const value = (e.target as HTMLInputElement).value;
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: keyof PasswordData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectAvatar = async (avatarPath: string) => {
    setSavingAvatar(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profile_image_url: avatarPath }),
      });

      if (response.ok) {
        setProfileData(prev => ({ ...prev, avatar_url: avatarPath }));
        setSnackbar({ open: true, message: 'Avatar updated successfully', severity: 'success' });
      } else {
        throw new Error('Failed to update avatar');
      }
    } catch (error) {
      console.error('Error selecting avatar:', error);
      setSnackbar({ open: true, message: 'Failed to update avatar', severity: 'error' });
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleResetAvatar = async () => {
    setSavingAvatar(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profile_image_url: DEFAULT_AVATAR }),
      });
      
      setProfileData(prev => ({ ...prev, avatar_url: DEFAULT_AVATAR }));
      setSnackbar({ open: true, message: 'Avatar reset to default', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to reset avatar', severity: 'error' });
    } finally {
      setSavingAvatar(false);
    }
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
          currency: profileData.currency,
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
        {/* Change Profile & Change Password Row */}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight={600} mb={1}>
                Change profile
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Change your profile picture from here
              </Typography>
              
              <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                <Avatar
                  src={profileData.avatar_url || DEFAULT_AVATAR}
                  sx={{ width: 100, height: 100, mb: 2, border: '3px solid', borderColor: 'primary.main' }}
                >
                  {profileData.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Select an avatar below:
                </Typography>
                
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(6, 1fr)', 
                  gap: 1, 
                  maxWidth: 360,
                  mb: 2 
                }}>
                  {AVATAR_OPTIONS.map((avatarPath) => (
                    <Avatar
                      key={avatarPath}
                      src={avatarPath}
                      sx={{ 
                        width: 50, 
                        height: 50, 
                        cursor: savingAvatar ? 'wait' : 'pointer',
                        border: profileData.avatar_url === avatarPath ? '3px solid' : '2px solid transparent',
                        borderColor: profileData.avatar_url === avatarPath ? 'primary.main' : 'transparent',
                        opacity: savingAvatar ? 0.6 : 1,
                        transition: 'all 0.2s',
                        '&:hover': { 
                          transform: 'scale(1.1)',
                          borderColor: 'primary.light',
                        }
                      }}
                      onClick={() => !savingAvatar && handleSelectAvatar(avatarPath)}
                    />
                  ))}
                </Box>
                
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={handleResetAvatar}
                  disabled={savingAvatar || profileData.avatar_url === DEFAULT_AVATAR}
                >
                  {savingAvatar ? <CircularProgress size={16} /> : 'Reset to Default'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
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
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={profileData.currency}
                      label="Currency"
                      onChange={(e) => setProfileData(prev => ({ ...prev, currency: e.target.value }))}
                    >
                      {CURRENCY_OPTIONS.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Email"
                    value={profileData.email}
                    disabled
                    fullWidth
                    helperText="Email cannot be changed"
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