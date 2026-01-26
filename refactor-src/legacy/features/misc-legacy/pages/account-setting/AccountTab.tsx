import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import { CardContent, Typography, MenuItem, Box, Avatar, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
const Grid = Grid2;

// components
import BlankCard from '@/shared/BlankCard';
import CustomTextField from '@/features/records-centralized/shared/ui/legacy/forms/theme-elements/CustomTextField';
import CustomFormLabel from '@/features/records-centralized/shared/ui/legacy/forms/theme-elements/CustomFormLabel';
import CustomSelect from '@/shared/ui/forms/theme-elements/CustomSelect';

// API helpers
import { getProfile, updateProfile, uploadAvatar, setAvatarFromLibrary, setBannerFromLibrary, ProfileData } from '@/account';

interface locationType {
  value: string;
  label: string;
}

// locations
const locations: locationType[] = [
  {
    value: 'us',
    label: 'United States',
  },
  {
    value: 'uk',
    label: 'United Kingdom',
  },
  {
    value: 'india',
    label: 'India',
  },
  {
    value: 'russia',
    label: 'Russia',
  },
];

// currency
const currencies: locationType[] = [
  {
    value: 'us',
    label: 'US Dollar ($)',
  },
  {
    value: 'uk',
    label: 'United Kingdom (Pound)',
  },
  {
    value: 'india',
    label: 'India (INR)',
  },
  {
    value: 'russia',
    label: 'Russia (Ruble)',
  },
];

const AccountTab = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showAvatarLibrary, setShowAvatarLibrary] = useState(false);
  const [showBannerLibrary, setShowBannerLibrary] = useState(false);
  const [avatarLibrary, setAvatarLibrary] = useState<Array<{file: string, label: string}>>([]);
  const [bannerLibrary, setBannerLibrary] = useState<Array<{file: string, label: string}>>([]);
  
  const [location, setLocation] = useState('india');
  const [currency, setCurrency] = useState('india');

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    website: '',
    location: '',
    bannerUrl: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadProfile();
      loadImageLibraries();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      const profileData = await getProfile(user.id);
      if (profileData) {
        setProfile(profileData);
        setFormData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          location: profileData.location || '',
          bannerUrl: profileData.bannerUrl || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadImageLibraries = async () => {
    try {
      // Load avatar library
      const avatarResponse = await fetch('/images/profile/manifest.json');
      const avatarData = await avatarResponse.json();
      setAvatarLibrary(avatarData.images || []);

      // Load banner library
      const bannerResponse = await fetch('/images/banner/manifest.json');
      const bannerData = await bannerResponse.json();
      setBannerLibrary(bannerData.images || []);
    } catch (error) {
      console.error('Error loading image libraries:', error);
    }
  };

  const handleChange1 = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(event.target.value);
  };

  const handleChange2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrency(event.target.value);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    
    setLoading(true);
    try {
      const url = await uploadAvatar(1, avatarFile);
      if (url) {
        setProfile(prev => prev ? { ...prev, avatarUrl: url } : null);
        setAvatarFile(null);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFromLibrary = async (url: string) => {
    setLoading(true);
    try {
      const success = await setAvatarFromLibrary(1, url);
      if (success) {
        setProfile(prev => prev ? { ...prev, avatarUrl: url } : null);
        setShowAvatarLibrary(false);
      }
    } catch (error) {
      console.error('Error setting avatar from library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerFromLibrary = async (url: string) => {
    setLoading(true);
    try {
      const success = await setBannerFromLibrary(1, url);
      if (success) {
        setProfile(prev => prev ? { ...prev, bannerUrl: url } : null);
        setFormData(prev => ({ ...prev, bannerUrl: url }));
        setShowBannerLibrary(false);
      }
    } catch (error) {
      console.error('Error setting banner from library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const success = await updateProfile(user.id, formData);
      if (success) {
        await loadProfile(); // Reload to get updated data
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    (<Grid2 container spacing={3}>
      {/* Change Profile */}
      <Grid2
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
                  src={profile?.avatarUrl || '/orthodox/avatars/default.png'}
                  alt="Profile Avatar"
                  sx={{ width: 120, height: 120, margin: '0 auto' }}
                />
                <Stack direction="row" justifyContent="center" spacing={2} my={3}>
                  <Button variant="contained" color="primary" component="label">
                    Upload
                    <input 
                      hidden 
                      accept="image/*" 
                      type="file" 
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => setShowAvatarLibrary(true)}
                  >
                    Choose from Library
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => setAvatarFile(null)}
                  >
                    Reset
                  </Button>
                </Stack>
                {avatarFile && (
                  <Stack direction="row" justifyContent="center" spacing={2} mb={2}>
                    <Button 
                      variant="contained" 
                      color="success" 
                      onClick={handleAvatarUpload}
                      disabled={loading}
                    >
                      {loading ? 'Uploading...' : 'Save Avatar'}
                    </Button>
                    <IconButton 
                      size="small" 
                      onClick={() => setAvatarFile(null)}
                      color="error"
                    >
                      <IconX />
                    </IconButton>
                  </Stack>
                )}
                <Typography variant="subtitle1" color="textSecondary" mb={4}>
                  Allowed JPG, GIF or PNG. Max size of 800K
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </BlankCard>
      </Grid2>

      {/* Banner Section */}
      <Grid2
        size={{
          xs: 12,
          lg: 6
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Profile Banner
            </Typography>
            <Typography color="textSecondary" mb={3}>Choose your profile banner from the library</Typography>
            <Box textAlign="center" display="flex" justifyContent="center">
              <Box>
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 120, 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    border: '2px dashed grey.300',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2
                  }}
                >
                  {formData.bannerUrl ? (
                    <img 
                      src={formData.bannerUrl} 
                      alt="Profile Banner"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography color="textSecondary">No banner selected</Typography>
                  )}
                </Box>
                <Stack direction="row" justifyContent="center" spacing={2} my={3}>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => setShowBannerLibrary(true)}
                  >
                    Choose from Library
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleFormChange('bannerUrl', '')}
                  >
                    Remove
                  </Button>
                </Stack>
              </Box>
            </Box>
          </CardContent>
        </BlankCard>
      </Grid2>

      {/*  Change Password */}
      <Grid2
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
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
              {/* 2 */}
              <CustomFormLabel htmlFor="text-npwd">New Password</CustomFormLabel>
              <CustomTextField
                id="text-npwd"
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
              {/* 3 */}
              <CustomFormLabel htmlFor="text-conpwd">Confirm Password</CustomFormLabel>
              <CustomTextField
                id="text-conpwd"
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
            </form>
          </CardContent>
        </BlankCard>
      </Grid2>
      {/* Edit Details */}
      <Grid2 size={12}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Personal Details
            </Typography>
            <Typography color="textSecondary" mb={3}>To change your personal detail , edit and save from here</Typography>
            <form>
              <Grid2 container spacing={3}>
                <Grid2
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-name"
                  >
                    Your Name
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-name"
                    value={formData.first_name}
                    onChange={(e) => handleFormChange('first_name', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="First Name"
                  />
                </Grid2>
                <Grid2
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  {/* 2 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-store-name"
                  >
                    Store Name
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-store-name"
                    value={formData.last_name}
                    onChange={(e) => handleFormChange('last_name', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="Last Name"
                  />
                </Grid2>
                <Grid2
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  {/* 3 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-location"
                  >
                    Location
                  </CustomFormLabel>
                  <CustomSelect
                    fullWidth
                    id="text-location"
                    variant="outlined"
                    value={location}
                    onChange={handleChange1}
                  >
                    {locations.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid2>
                <Grid2
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  {/* 4 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-currency"
                  >
                    Currency
                  </CustomFormLabel>
                  <CustomSelect
                    fullWidth
                    id="text-currency"
                    variant="outlined"
                    value={currency}
                    onChange={handleChange2}
                  >
                    {currencies.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid2>
                <Grid2
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
                    Email
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="Email"
                  />
                </Grid2>
                <Grid2
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  {/* 6 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-phone"
                  >
                    Phone
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-phone"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="Phone"
                  />
                </Grid2>
                <Grid2 size={12}>
                  {/* 7 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-address"
                  >
                    Address
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-address"
                    value={formData.bio}
                    onChange={(e) => handleFormChange('bio', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="Bio/Description"
                    multiline
                    rows={3}
                  />
                </Grid2>
              </Grid2>
            </form>
          </CardContent>
        </BlankCard>
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
      </Grid2>

      {/* Avatar Library Dialog */}
      <Dialog 
        open={showAvatarLibrary} 
        onClose={() => setShowAvatarLibrary(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Choose Avatar from Library
          <IconButton
            onClick={() => setShowAvatarLibrary(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <IconX />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid2 container spacing={2}>
            {avatarLibrary.map((image) => (
              <Grid2 key={image.file} size={{ xs: 6, sm: 4, md: 3 }}>
                <Box 
                  sx={{ 
                    cursor: 'pointer', 
                    border: '2px solid transparent',
                    borderRadius: 1,
                    p: 1,
                    '&:hover': { border: '2px solid primary.main' }
                  }}
                  onClick={() => handleAvatarFromLibrary(`/images/profile/${image.file}`)}
                >
                  <img 
                    src={`/images/profile/${image.file}`} 
                    alt={image.label}
                    style={{ width: '100%', height: 'auto', borderRadius: 4 }}
                  />
                  <Typography variant="caption" display="block" textAlign="center" mt={1}>
                    {image.label}
                  </Typography>
                </Box>
              </Grid2>
            ))}
          </Grid2>
        </DialogContent>
      </Dialog>

      {/* Banner Library Dialog */}
      <Dialog 
        open={showBannerLibrary} 
        onClose={() => setShowBannerLibrary(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Choose Banner from Library
          <IconButton
            onClick={() => setShowBannerLibrary(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <IconX />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid2 container spacing={2}>
            {bannerLibrary.map((image) => (
              <Grid2 key={image.file} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box 
                  sx={{ 
                    cursor: 'pointer', 
                    border: '2px solid transparent',
                    borderRadius: 1,
                    p: 1,
                    '&:hover': { border: '2px solid primary.main' }
                  }}
                  onClick={() => handleBannerFromLibrary(`/images/banner/${image.file}`)}
                >
                  <img 
                    src={`/images/banner/${image.file}`} 
                    alt={image.label}
                    style={{ width: '100%', height: 'auto', borderRadius: 4 }}
                  />
                  <Typography variant="caption" display="block" textAlign="center" mt={1}>
                    {image.label}
                  </Typography>
                </Box>
              </Grid2>
            ))}
          </Grid2>
        </DialogContent>
      </Dialog>
    </Grid2>)
  );
};

export default AccountTab;
