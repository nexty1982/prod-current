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
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import PersonOutlineTwoToneIcon from '@mui/icons-material/PersonOutlineTwoTone';
import VpnKeyTwoToneIcon from '@mui/icons-material/VpnKeyTwoTone';
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const tabLabels = [
  { label: 'User Profile', icon: <PersonOutlineTwoToneIcon />, caption: 'Profile Settings' },
  { label: 'Change Password', icon: <VpnKeyTwoToneIcon />, caption: 'Update Profile Security' },
];

const UserProfile = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

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

      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Account Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* Left side: Vertical tabs */}
            <Grid size={{ xs: 12, md: 4, lg: 3 }}>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                orientation="vertical"
                variant="scrollable"
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 'auto',
                    py: 1.5,
                    px: 2,
                    mr: 2,
                    mb: 1,
                    borderRadius: 1.5,
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                  },
                  '& .Mui-selected': {
                    bgcolor:
                      theme.palette.mode === 'dark'
                        ? 'primary.dark'
                        : 'primary.light',
                    color: 'primary.main',
                  },
                  '& .MuiTabs-indicator': {
                    display: 'none',
                  },
                }}
              >
                {tabLabels.map((tab, idx) => (
                  <Tab
                    key={idx}
                    icon={tab.icon}
                    iconPosition="start"
                    label={
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: tabValue === idx ? 600 : 400 }}>
                          {tab.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tab.caption}
                        </Typography>
                      </Box>
                    }
                    sx={{ textTransform: 'none' }}
                  />
                ))}
              </Tabs>
            </Grid>

            {/* Right side: Tab content */}
            <Grid size={{ xs: 12, md: 8, lg: 9 }}>
              {/* ── Tab 0: User Profile ── */}
              <TabPanel value={tabValue} index={0}>
                {/* Account overview */}
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <RoleAvatar role={user?.role} size={80} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {profileData.display_name || profileData.email}
                    </Typography>
                    <Chip
                      label={getRoleLabel(user?.role)}
                      size="small"
                      sx={{ fontWeight: 600, mt: 0.5 }}
                    />
                    {user?.church_name && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {user.church_name}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Editable fields */}
                <Grid2 container spacing={3}>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Email Address"
                      value={profileData.email}
                      disabled
                      fullWidth
                      helperText="Email cannot be changed"
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Display Name"
                      value={profileData.display_name}
                      onChange={handleProfileChange('display_name')}
                      fullWidth
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Organization"
                      value={profileData.company}
                      onChange={handleProfileChange('company')}
                      fullWidth
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Phone Number"
                      value={profileData.phone}
                      onChange={handleProfileChange('phone')}
                      fullWidth
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Location"
                      value={profileData.location}
                      onChange={handleProfileChange('location')}
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
              </TabPanel>

              {/* ── Tab 1: Change Password ── */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" fontWeight={600} mb={1}>
                  Change Password
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  To change your password please confirm here
                </Typography>

                <Stack spacing={2.5} sx={{ maxWidth: 500 }}>
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
              </TabPanel>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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
