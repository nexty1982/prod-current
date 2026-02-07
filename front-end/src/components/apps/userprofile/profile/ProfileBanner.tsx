import React, { useState, useRef, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  styled,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Tooltip,
  Badge,
  Alert,
  Snackbar,
  TextField,
  Paper
} from '@mui/material';
import {
  IconCamera,
  IconEdit,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import ProfileTab from './ProfileTab';
import BlankCard from '@/shared/ui/BlankCard';
import OrthodoxAvatarSelector from './OrthodoxAvatarSelector';
import { useAuth } from 'src/context/AuthContext';
import { useProfileSync } from '../../../../lib/useProfileSync';

// Banner gradient options
const BANNER_GRADIENTS = [
  { key: 'purple-blue', label: 'Purple Blue', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { key: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { key: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { key: 'forest', label: 'Forest', css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { key: 'midnight', label: 'Midnight', css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { key: 'warm', label: 'Warm', css: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
  { key: 'rose', label: 'Rose', css: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)' },
  { key: 'slate', label: 'Slate', css: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)' },
];

const getGradientCss = (theme?: string) => {
  const found = BANNER_GRADIENTS.find(g => g.key === theme);
  return found ? found.css : BANNER_GRADIENTS[0].css;
};

const defaultGradient = BANNER_GRADIENTS[0].css;
import userimg from 'src/assets/images/profile/user-1.jpg';

const ProfileBanner = () => {
  const { user } = useAuth();
  const {
    profileImage: avatarImage,
    profileData,
    updateProfileImage,
    updateProfile,
    refreshProfile,
    isLoading: profileLoading
  } = useProfileSync(userimg);

  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [avatarUploadOpen, setAvatarUploadOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [orthodoxAvatars, setOrthodoxAvatars] = useState<string[]>([]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync with profile data from the hook
  useEffect(() => {
    if (profileData) {
      setEditedProfile({ ...profileData });
    }

    // Load orthodox avatar images
    fetchOrthodoxAvatars();
  }, [profileData]);

  // Fetch orthodox avatars from public directory
  const fetchOrthodoxAvatars = async () => {
    try {
      console.log('📸 Fetching orthodox avatars...');
      const response = await fetch('/api/images/list?directory=orthodox/avatars');
      if (response.ok) {
        const data = await response.json();
        if (data.files && Array.isArray(data.files)) {
          const avatarPaths = data.files.map((file: string) => `/images/orthodox/avatars/${file}`);
          setOrthodoxAvatars(avatarPaths);
          console.log('📸 Loaded orthodox avatars:', avatarPaths.length);
        }
      } else {
        // Fallback: try to fetch from a manifest or use common image extensions
        console.log('📸 API not available, trying alternative method...');
        // We'll handle this in the dialog by trying common filenames
      }
    } catch (error) {
      console.error('Failed to fetch orthodox avatars:', error);
    }
  };

  // Handle banner gradient selection
  const handleBannerSelect = async (gradientKey: string) => {
    try {
      await updateProfile({ profile_theme: gradientKey });
      setBannerDialogOpen(false);
      setSnackbarMessage('Banner color updated!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating banner:', error);
      setSnackbarMessage('Failed to update banner color');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Save profile changes to database using the sync hook
  const handleSaveProfile = async () => {
    try {
      await updateProfile(editedProfile);
      setIsEditing(false);
      setSnackbarMessage('Profile updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      console.log('📸 Profile saved using sync hook');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSnackbarMessage('Failed to update profile. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditedProfile({ ...user });
    setIsEditing(false);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setEditedProfile((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const ProfileImage = styled(Box)(() => ({
    backgroundImage: 'linear-gradient(#50b2fc,#f44c66)',
    borderRadius: '50%',
    width: '110px',
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    position: 'relative'
  }));



  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Create a unique filename
        const timestamp = Date.now();
        const fileName = `profile_${timestamp}_${file.name}`;

        // Create FormData to send the file
        const formData = new FormData();
        formData.append('profile', file);
        formData.append('fileName', fileName);

        // Send to server to save in shared directory
        const response = await fetch('/api/upload/profile', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          // Use the URL from server response (includes correct path)
          const imageUrl = result.imageUrl || result.profile_image_url;

          // Use the sync hook to update profile image
          await updateProfileImage(imageUrl);

          setSelectedAvatarId(null); // Reset Orthodox avatar selection
          setAvatarUploadOpen(false);

          setSnackbarMessage('Profile picture updated and saved!');
          setSnackbarOpen(true);
          console.log('📸 Profile image saved using sync hook:', imageUrl);
        } else {
          throw new Error('Failed to upload profile image');
        }
      } catch (error) {
        console.error('Error uploading profile:', error);
        setSnackbarMessage('Failed to upload profile picture. Please try again.');
        setSnackbarOpen(true);
      }
    }
  };

  const handlePresetAvatarSelect = (avatar: any) => {
    setSelectedAvatarId(avatar.id);
    setAvatarUploadOpen(false);
    setSnackbarMessage(`Profile picture changed to ${avatar.name}!`);
    setSnackbarOpen(true);
  };

  // Function to render the current avatar (either uploaded image or Orthodox SVG)
  const renderCurrentAvatar = (size: number = 100, sx: any = {}, onClick?: () => void) => {
    if (selectedAvatarId) {
      const selectedAvatar = orthodoxAvatars.find(avatar => String(avatar.id) === String(selectedAvatarId));
      if (selectedAvatar) {
        const AvatarComponent = selectedAvatar.component;
        return (
          <Box
            sx={{
              width: size,
              height: size,
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: onClick ? 'pointer' : 'default',
              ...sx
            }}
            onClick={onClick}
          >
            <AvatarComponent size={size * 0.9} />
          </Box>
        );
      }
    }

    // Fallback to uploaded image
    console.log('Rendering avatar with image:', avatarImage);
    return (
      <Avatar
        src={avatarImage}
        alt="Profile Picture"
        sx={{
          width: size,
          height: size,
          cursor: onClick ? 'pointer' : 'default',
          ...sx
        }}
        onClick={onClick}
      />
    );
  };

  return (
    <>
      <BlankCard>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '300px',
            background: getGradientCss(profileData?.profile_theme),
            cursor: 'pointer'
          }}
          onClick={() => setBannerDialogOpen(true)}
        >
          {/* Banner Color Change Button */}
          <Tooltip title="Change Banner Color">
            <IconButton
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                setBannerDialogOpen(true);
              }}
            >
              <IconCamera size={20} />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={0} justifyContent="center" alignItems="center">
          {/* Editable Profile Information */}
          <Grid
            sx={{
              order: {
                xs: '2',
                sm: '2',
                lg: '1',
              },
            }}
            size={{
              lg: 4,
              sm: 12,
              md: 5,
              xs: 12
            }}>
            <Paper sx={{ p: 3, m: 2, backgroundColor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="600">
                  Profile Information
                </Typography>
                {!isEditing ? (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconEdit />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveProfile}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>

              {!isEditing ? (
                <Stack spacing={2}>
                  {/* No extra fields available on User object. Only name, email, role, etc. */}
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {user?.email}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <TextField
                    label="Display Name"
                    fullWidth
                    value={editedProfile.display_name || ''}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    placeholder="Your display name"
                  />

                  <TextField
                    label="Bio"
                    multiline
                    rows={3}
                    fullWidth
                    value={editedProfile.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                  />

                  <TextField
                    label="Job Title"
                    fullWidth
                    value={editedProfile.job_title || ''}
                    onChange={(e) => handleInputChange('job_title', e.target.value)}
                    placeholder="Your job title"
                  />

                  <TextField
                    label="Company/Organization"
                    fullWidth
                    value={editedProfile.company || ''}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="Your church, seminary, or organization"
                  />

                  <TextField
                    label="Phone"
                    fullWidth
                    value={editedProfile.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Your phone number"
                  />

                  <TextField
                    label="Website"
                    fullWidth
                    value={editedProfile.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://your-website.com"
                  />

                  <TextField
                    label="Location"
                    fullWidth
                    value={editedProfile.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="City, State/Province, Country"
                  />
                </Stack>
              )}
            </Paper>
          </Grid>

          {/* about profile */}
          <Grid
            sx={{
              order: {
                xs: '1',
                sm: '1',
                lg: '2',
              },
            }}
            size={{
              lg: 4,
              sm: 12,
              xs: 12
            }}>
            <Box
              display="flex"
              alignItems="center"
              textAlign="center"
              justifyContent="center"
              sx={{
                mt: '-85px',
              }}
            >
              <Box>
                <ProfileImage>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Tooltip title="Change Profile Picture">
                        <IconButton
                          size="small"
                          sx={{
                            backgroundColor: 'primary.main',
                            color: 'white',
                            width: 32,
                            height: 32,
                            '&:hover': {
                              backgroundColor: 'primary.dark',
                            }
                          }}
                          onClick={() => {
                            fetchOrthodoxAvatars(); // Refresh avatars when opening dialog
                            setAvatarUploadOpen(true);
                          }}
                        >
                          <IconEdit size={16} />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    {renderCurrentAvatar(100, {
                      borderRadius: '50%',
                      border: '4px solid #fff'
                    }, () => {
                      fetchOrthodoxAvatars(); // Refresh avatars when opening dialog
                      setAvatarUploadOpen(true);
                    })}
                  </Badge>
                </ProfileImage>
                <Box mt={1}>
                  {!isEditing ? (
                    <>
                      <Typography fontWeight={600} variant="h5">{user?.first_name} {user?.last_name}</Typography>
                      <Typography color="textSecondary" variant="h6" fontWeight={400}>{user?.role || 'Orthodox Faithful'}</Typography>
                      <Typography variant="body1">{user?.email}</Typography>
                    </>
                  ) : (
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        label="Full Name"
                        fullWidth
                        value={editedProfile.full_name || ''}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Your full name"
                        size="small"
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>
          {/* Profile Actions */}
          <Grid
            sx={{
              order: {
                xs: '3',
                sm: '3',
                lg: '3',
              },
            }}
            size={{
              lg: 4,
              sm: 12,
              xs: 12
            }}>
            <Stack direction={'row'} gap={2} alignItems="center" justifyContent="center" my={2}>
              <Button color="primary" variant="contained">
                Contact
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {/**TabbingPart**/}
        <ProfileTab />
      </BlankCard>

      {/* Banner Color Picker Dialog */}
      <Dialog
        open={bannerDialogOpen}
        onClose={() => setBannerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Choose Banner Color
          <IconButton onClick={() => setBannerDialogOpen(false)}>
            <IconX />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 1 }}>
            {BANNER_GRADIENTS.map((g) => (
              <Box
                key={g.key}
                onClick={() => handleBannerSelect(g.key)}
                sx={{
                  height: 80,
                  borderRadius: 2,
                  background: g.css,
                  cursor: 'pointer',
                  border: profileData?.profile_theme === g.key ? '3px solid' : '3px solid transparent',
                  borderColor: profileData?.profile_theme === g.key ? 'primary.main' : 'transparent',
                  transition: 'transform 0.15s, border-color 0.15s',
                  '&:hover': { transform: 'scale(1.05)' },
                  display: 'flex',
                  alignItems: 'flex-end',
                  p: 0.5
                }}
              >
                <Typography variant="caption" sx={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                  {g.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBannerDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Avatar Upload Dialog */}
      <Dialog
        open={avatarUploadOpen}
        onClose={() => setAvatarUploadOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Change Profile Picture
          <IconButton onClick={() => setAvatarUploadOpen(false)}>
            <IconX />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}>
          <Box sx={{ py: 2 }}>
            {/* Current Avatar */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h6" gutterBottom>Current Profile Picture</Typography>
              {renderCurrentAvatar(120, {
                mx: 'auto',
                mb: 2,
                border: '4px solid',
                borderColor: 'primary.main'
              })}
              <Typography variant="h5" fontWeight={600} sx={{ mt: 2 }}>
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.role || 'Orthodox Faithful'}
              </Typography>
            </Box>

            {/* Upload Custom Image */}
            <Card sx={{ mb: 4 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>Upload Custom Image</Typography>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />

                <Button
                  variant="contained"
                  startIcon={<IconUpload />}
                  onClick={() => avatarInputRef.current?.click()}
                  size="large"
                  sx={{ mb: 2 }}
                >
                  Upload Your Photo
                </Button>

                <Typography variant="body2" color="text.secondary">
                  Recommended: Square image, at least 200x200 pixels
                </Typography>
              </CardContent>
            </Card>

            {/* Orthodox Avatars from public directory */}
            {orthodoxAvatars.length > 0 && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                    Orthodox Avatars
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                    Choose from available avatar images
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 2
                  }}>
                    {orthodoxAvatars.map((avatarPath, index) => (
                      <Box
                        key={index}
                        sx={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          p: 1,
                          borderRadius: 1,
                          border: '2px solid',
                          borderColor: avatarImage === avatarPath ? 'primary.main' : 'transparent',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'action.hover'
                          }
                        }}
                        onClick={async () => {
                          try {
                            await updateProfileImage(avatarPath);
                            setSelectedAvatarId(null);
                            setSnackbarMessage('Profile image updated and saved!');
                            setSnackbarOpen(true);
                            setAvatarUploadOpen(false);
                            console.log('📸 Orthodox avatar saved using sync hook:', avatarPath);
                          } catch (error) {
                            console.error('Failed to save profile image:', error);
                            setSnackbarMessage('Failed to save profile image');
                            setSnackbarOpen(true);
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundImage: `url(${avatarPath})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            mx: 'auto',
                            mb: 1
                          }}
                        />
                        <Typography variant="caption" display="block" noWrap>
                          Avatar {index + 1}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Global images section removed - using direct upload and orthodox avatars */}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProfileBanner;
