// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useContext } from 'react';
import { CardContent, Grid, Typography, MenuItem, Box, Avatar, Button, Stack, Alert, CircularProgress } from '@mui/material';

// components
import BlankCard from '../../shared/BlankCard';
import CustomTextField from '../../forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../forms/theme-elements/CustomFormLabel';
import CustomSelect from '../../forms/theme-elements/CustomSelect';

// context
import { useAuth } from '../../../context/AuthContext';

// images
import user1 from 'src/assets/images/profile/user-1.jpg';

interface locationType {
  value: string;
  label: string;
}

// languages
const languages: locationType[] = [
  {
    value: 'en',
    label: 'English',
  },
  {
    value: 'gr',
    label: 'Greek',
  },
  {
    value: 'ru',
    label: 'Russian',
  },
  {
    value: 'ro',
    label: 'Romanian',
  },
];

// timezones
const timezones: locationType[] = [
  {
    value: 'America/New_York',
    label: 'Eastern Time (US)',
  },
  {
    value: 'America/Chicago',
    label: 'Central Time (US)',
  },
  {
    value: 'America/Denver',
    label: 'Mountain Time (US)',
  },
  {
    value: 'America/Los_Angeles',
    label: 'Pacific Time (US)',
  },
  {
    value: 'Europe/London',
    label: 'GMT (London)',
  },
  {
    value: 'Europe/Athens',
    label: 'Athens',
  },
  {
    value: 'Europe/Moscow',
    label: 'Moscow',
  },
];

const AccountTab = () => {
  const { user, refreshAuth } = useAuth();

  // Form state - extended with profile fields
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    website: '',
    bio: '',
    introduction: '',
    jobTitle: '',
    company: '',
    language: user?.preferred_language || 'en',
    timezone: user?.timezone || 'UTC'
  });
  
  const [loading, setLoading] = useState(true);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch profile settings on mount
  React.useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/om/profile/${user.id}/settings`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            const s = data.settings;
            setFormData({
              firstName: s.firstName || '',
              lastName: s.lastName || '',
              email: s.email || '',
              phone: s.phone || '',
              location: s.location || '',
              website: s.website || '',
              bio: s.bio || '',
              introduction: s.introduction || '',
              jobTitle: s.jobTitle || '',
              company: s.company || '',
              language: s.language || s.preferredLanguage || 'en',
              timezone: s.timezone || 'UTC'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [user?.id]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handlePasswordChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/om/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        // Refresh user data in context
        await refreshAuth();
      } else {
        setMessage({ type: 'error', text: data.message || data.error || 'Failed to update profile. Please try again.' });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating your profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    setIsPasswordLoading(true);
    setPasswordMessage(null);

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      setIsPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      setIsPasswordLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
        // Clear password fields
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordMessage({ type: 'error', text: data.message || 'Failed to update password. Please try again.' });
      }
    } catch (error) {
      console.error('Password update error:', error);
      setPasswordMessage({ type: 'error', text: 'An error occurred while updating your password.' });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    (<Grid container spacing={3}>
      {/* Change Profile */}
      <Grid
        size={{
          xs: 12,
          lg: 6
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Change Profile
            </Typography>
            <Typography color="textSecondary" mb={3}>Change your profile picture from here</Typography>
            <Box textAlign="center" display="flex" justifyContent="center">
              <Box>
                <Avatar
                  src={user1}
                  alt={user ? `${user.first_name} ${user.last_name}` : 'User'}
                  sx={{ width: 120, height: 120, margin: '0 auto' }}
                >
                  {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : 'U'}
                </Avatar>
                <Stack direction="row" justifyContent="center" spacing={2} my={3}>
                  <Button variant="contained" color="primary" component="label">
                    Upload
                    <input hidden accept="image/*" multiple type="file" />
                  </Button>
                  <Button variant="outlined" color="error">
                    Reset
                  </Button>
                </Stack>
                <Typography variant="subtitle1" color="textSecondary" mb={4}>
                  Allowed JPG, GIF or PNG. Max size of 800K
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </BlankCard>
      </Grid>
      {/*  Change Password */}
      <Grid
        size={{
          xs: 12,
          lg: 6
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Change Password
            </Typography>
            <Typography color="textSecondary" mb={3}>To change your password please confirm here</Typography>
            
            {passwordMessage && (
              <Alert severity={passwordMessage.type} sx={{ mb: 2 }}>
                {passwordMessage.text}
              </Alert>
            )}
            
            <form>
              <CustomFormLabel
                sx={{
                  mt: 0,
                }}
                htmlFor="text-cpwd"
              >
                Current Password
              </CustomFormLabel>
              <CustomTextField
                id="text-cpwd"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange('currentPassword')}
                variant="outlined"
                fullWidth
                type="password"
                placeholder="Enter current password"
              />
              {/* 2 */}
              <CustomFormLabel htmlFor="text-npwd">New Password</CustomFormLabel>
              <CustomTextField
                id="text-npwd"
                value={passwordData.newPassword}
                onChange={handlePasswordChange('newPassword')}
                variant="outlined"
                fullWidth
                type="password"
                placeholder="Enter new password"
              />
              {/* 3 */}
              <CustomFormLabel htmlFor="text-conpwd">Confirm Password</CustomFormLabel>
              <CustomTextField
                id="text-conpwd"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange('confirmPassword')}
                variant="outlined"
                fullWidth
                type="password"
                placeholder="Confirm new password"
              />
              
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'end' }} mt={3}>
                <Button
                  size="large"
                  variant="contained"
                  color="primary"
                  onClick={handlePasswordSave}
                  disabled={isPasswordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {isPasswordLoading ? <CircularProgress size={20} /> : 'Change Password'}
                </Button>
                <Button
                  size="large"
                  variant="text"
                  color="error"
                  onClick={() => {
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setPasswordMessage(null);
                  }}
                >
                  Clear
                </Button>
              </Stack>
            </form>
          </CardContent>
        </BlankCard>
      </Grid>
      {/* Edit Details */}
      <Grid size={12}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Personal Details
            </Typography>
            <Typography color="textSecondary" mb={3}>To change your personal detail, edit and save from here</Typography>

            {message && (
              <Alert severity={message.type} sx={{ mb: 2 }}>
                {message.text}
              </Alert>
            )}
            <form>
              <Grid container spacing={3}>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-first-name"
                  >
                    First Name
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-first-name"
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    variant="outlined"
                    fullWidth
                    placeholder="Enter your first name"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  {/* 2 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-last-name"
                  >
                    Last Name
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-last-name"
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    variant="outlined"
                    fullWidth
                    placeholder="Enter your last name"
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  {/* 3 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-language"
                  >
                    Preferred Language
                  </CustomFormLabel>
                  <CustomSelect
                    fullWidth
                    id="text-language"
                    variant="outlined"
                    value={formData.language}
                    onChange={handleInputChange('language')}
                  >
                    {languages.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  {/* 4 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-timezone"
                  >
                    Timezone
                  </CustomFormLabel>
                  <CustomSelect
                    fullWidth
                    id="text-timezone"
                    variant="outlined"
                    value={formData.timezone}
                    onChange={handleInputChange('timezone')}
                  >
                    {timezones.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  {/* 5 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-email"
                  >
                    Email Address
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    variant="outlined"
                    fullWidth
                    type="email"
                    placeholder="Enter your email"
                  />
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </BlankCard>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'end' }} mt={3}>
          <Button
            size="large"
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
          <Button
            size="large"
            variant="text"
            color="error"
            onClick={() => {
              setFormData({
                firstName: user?.first_name || '',
                lastName: user?.last_name || '',
                email: user?.email || '',
                phone: '',
                location: '',
                website: '',
                bio: '',
                introduction: '',
                jobTitle: '',
                company: '',
                language: user?.preferred_language || 'en',
                timezone: user?.timezone || 'UTC'
              });
              setMessage(null);
            }}
          >
            Reset
          </Button>
        </Stack>
      </Grid>
    </Grid>)
  );
};

export default AccountTab;
