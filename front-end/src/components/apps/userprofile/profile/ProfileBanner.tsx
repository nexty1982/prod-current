import React, { useState, useRef, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  CardMedia,
  styled,
  Fab,
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
  IconFileDescription,
  IconUserCheck,
  IconUserCircle,
  IconCamera,
  IconEdit,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import ProfileTab from './ProfileTab';
import BlankCard from '../../../shared/BlankCard';
import OrthodoxAvatarSelector from './OrthodoxAvatarSelector';
import { useAuth } from 'src/context/AuthContext';
import { useProfileSync } from '../../../../lib/useProfileSync';

// Default images - with fallback handling
const profilecover = '/images/incode/profilebg.png';
const defaultGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
import userimg from 'src/assets/images/profile/user-1.jpg';

// Import Orthodox avatars
import { orthodoxAvatars, YoungPriest1 } from '../../../avatars/OrthodoxAvatars';

// Simple test avatar component
const TestAvatar: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ border: '1px solid red' }}>
    <circle cx="50" cy="50" r="40" fill="blue" />
    <text x="50" y="55" textAnchor="middle" fill="white" fontSize="12">TEST</text>
  </svg>
);

// Debug logging
console.log('ProfileBanner - orthodoxAvatars imported:', {
  count: orthodoxAvatars?.length || 0,
  avatars: orthodoxAvatars,
  firstAvatar: orthodoxAvatars?.[0],
  testComponent: YoungPriest1
});

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

  const [coverPhoto, setCoverPhoto] = useState(profilecover);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null);
  const [coverUploadOpen, setCoverUploadOpen] = useState(false);
  const [avatarUploadOpen, setAvatarUploadOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [globalImages, setGlobalImages] = useState<any[]>([]);
  const [showGlobalImages, setShowGlobalImages] = useState(false);
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [orthodoxAvatars, setOrthodoxAvatars] = useState<string[]>([]);
  const [orthodoxBanners, setOrthodoxBanners] = useState<string[]>([]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync with profile data from the hook
  useEffect(() => {
    if (profileData) {
      setEditedProfile({ ...profileData });

      // Set cover photo from database if available
      if (profileData.cover_image_url) {
        setCoverPhoto(profileData.cover_image_url);
        console.log('📸 Cover photo loaded from profile data:', profileData.cover_image_url);
      }
    }

    // Load global images
    fetchGlobalImages();
    // Load orthodox images
    fetchOrthodoxAvatars();
    fetchOrthodoxBanners();
  }, [profileData]);

  // Fetch all available profile images from the backend
  useEffect(() => {
    const fetchProfileImages = async () => {
      try {
        const response = await fetch('/api/global-images/public');
        const data = await response.json();
        if (data && data.images) {
          setProfileImages(data.images.map((img: any) => img.url || img.path || img));
        }
      } catch (error) {
        console.error('Failed to fetch profile images:', error);
      }
    };
    fetchProfileImages();
  }, []);

  // Fetch all global images (both profile and banner)
  const fetchGlobalImages = async () => {
    try {
      console.log('📸 Fetching public global images...');
      const response = await fetch('/api/admin/global-images/public');
      if (response.ok) {
        const data = await response.json();
        console.log('📸 Public global images response:', data);
        setGlobalImages(data.images || []);
        console.log('📸 Set global images:', data.images?.length || 0, 'images');
      } else {
        console.error('📸 Failed to fetch global images, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch global images:', error);
    }
  };

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

  // Fetch orthodox banners from public directory
  const fetchOrthodoxBanners = async () => {
    try {
      console.log('📸 Fetching orthodox banners...');
      const response = await fetch('/api/images/list?directory=orthodox/banners');
      if (response.ok) {
        const data = await response.json();
        if (data.files && Array.isArray(data.files)) {
          const bannerPaths = data.files.map((file: string) => `/images/orthodox/banners/${file}`);
          setOrthodoxBanners(bannerPaths);
          console.log('📸 Loaded orthodox banners:', bannerPaths.length);
        }
      } else {
        console.log('📸 API not available, trying alternative method...');
      }
    } catch (error) {
      console.error('Failed to fetch orthodox banners:', error);
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
        });

        if (response.ok) {
          const result = await response.json();
          const imageUrl = `/images/profile/${fileName}`;

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
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={coverPhoto}
            alt="Cover Photo"
            onError={(e) => {
              // Fallback to gradient if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.fallback-gradient')) {
                const gradient = document.createElement('div');
                gradient.className = 'fallback-gradient';
                gradient.style.cssText = `
                  width: 100%;
                  height: 300px;
                  background: ${defaultGradient};
                  cursor: pointer;
                `;
                gradient.onclick = () => setCoverUploadOpen(true);
                parent.appendChild(gradient);
              }
            }}
            sx={{
              width: "100%",
              height: "300px",
              objectFit: "contain",
              cursor: 'pointer'
            }}
            onClick={() => setCoverUploadOpen(true)}
          />

          {/* Cover Photo Edit Button */}
          <Tooltip title="Change Cover Photo">
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
              onClick={() => {
                fetchOrthodoxBanners(); // Refresh banners when opening dialog
                setCoverUploadOpen(true);
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
                    label="Introduction"
                    multiline
                    rows={3}
                    fullWidth
                    value={editedProfile.introduction || ''}
                    onChange={(e) => handleInputChange('introduction', e.target.value)}
                    placeholder="Tell us about yourself..."
                  />

                  <TextField
                    label="Institute/Organization"
                    fullWidth
                    value={editedProfile.institute_name || ''}
                    onChange={(e) => handleInputChange('institute_name', e.target.value)}
                    placeholder="Your church, seminary, or organization"
                  />

                  <TextField
                    label="Website URL"
                    fullWidth
                    value={editedProfile.website_url || ''}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
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

      {/* Cover Photo Upload Dialog */}
      <Dialog
        open={coverUploadOpen}
        onClose={() => setCoverUploadOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Change Cover Photo
          <IconButton onClick={() => setCoverUploadOpen(false)}>
            <IconX />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ mb: 3 }}>
              <img
                src={coverPhoto}
                alt="Current Cover"
                style={{
                  width: '100%',
                  maxHeight: '200px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select a banner image from the available options below
            </Typography>

            {/* Orthodox Banners from public directory */}
            {orthodoxBanners.length > 0 && (
              <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                  Orthodox Banners
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                  Choose from available banner images
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 2
                }}>
                  {orthodoxBanners.map((bannerPath, index) => (
                    <Box
                      key={index}
                      sx={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        p: 1,
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: coverPhoto === bannerPath ? 'primary.main' : 'transparent',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'action.hover'
                        }
                      }}
                      onClick={async () => {
                        try {
                          const updateResponse = await fetch('/api/user/profile/images', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify({ cover_image_url: bannerPath })
                          });

                          if (updateResponse.ok) {
                            setCoverPhoto(bannerPath);
                            localStorage.setItem('userBannerImage', bannerPath);
                            setSnackbarMessage('Banner image updated and saved!');
                            setSnackbarOpen(true);
                            setCoverUploadOpen(false);
                            console.log('📸 Banner image saved to database:', bannerPath);
                          } else {
                            throw new Error('Failed to save banner to database');
                          }
                        } catch (error) {
                          console.error('Failed to save banner:', error);
                          setSnackbarMessage('Failed to save banner image');
                          setSnackbarOpen(true);
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: 80,
                          borderRadius: 1,
                          backgroundImage: `url(${bannerPath})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          mb: 1
                        }}
                      />
                      <Typography variant="caption" display="block" noWrap>
                        Banner {index + 1}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Banner Images */}
            {globalImages.length > 0 ? (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                  Global Banner Images
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                  Choose from admin-uploaded global banner images
                </Typography>

                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 2
                }}>
                  {globalImages.filter(img => img.type === 'banner').map((image) => (
                    <Box
                      key={image.id}
                      sx={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        p: 1,
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: coverPhoto === image.url ? 'primary.main' : 'transparent',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'action.hover'
                        }
                      }}
                      onClick={async () => {
                        try {
                          // Save to database immediately
                          const updateResponse = await fetch('/api/user/profile/images', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify({ cover_image_url: image.url })
                          });

                          if (updateResponse.ok) {
                            setCoverPhoto(image.url);
                            localStorage.setItem('userBannerImage', image.url);
                            setSnackbarMessage('Banner image updated and saved!');
                            setSnackbarOpen(true);
                            console.log('📸 Banner image saved to database:', image.url);
                          } else {
                            throw new Error('Failed to save banner to database');
                          }
                        } catch (error) {
                          console.error('Failed to save banner:', error);
                          setSnackbarMessage('Failed to save banner image');
                          setSnackbarOpen(true);
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: 80,
                          borderRadius: 1,
                          backgroundImage: `url(${image.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          mb: 1
                        }}
                      />
                      <Typography variant="caption" display="block" noWrap>
                        {image.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  No Banner Images Available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Contact your administrator to upload banner images.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
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

            {/* Uploaded Profile Images Section */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                  Choose from Uploaded Profile Images
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                  {profileImages.map((img: string) => (
                    <Box
                      key={img}
                      sx={{
                        border: avatarImage === img ? '3px solid #1976d2' : '2px solid #eee',
                        borderRadius: '50%',
                        p: 1,
                        cursor: 'pointer',
                        width: 80,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fff',
                      }}
                      onClick={async () => {
                        try {
                          // Use the sync hook to update profile image
                          await updateProfileImage(img);
                          setSelectedAvatarId(null);
                          setSnackbarMessage('Profile image updated and saved!');
                          setSnackbarOpen(true);
                          console.log('📸 Profile image saved using sync hook:', img);
                        } catch (error) {
                          console.error('Failed to save profile image:', error);
                          setSnackbarMessage('Failed to save profile image');
                          setSnackbarOpen(true);
                        }
                      }}
                    >
                      <Avatar src={img} sx={{ width: 60, height: 60 }} />
                    </Box>
                  ))}
                </Box>
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

            {/* Global Images Section */}
            {globalImages.length > 0 && (
              <Card sx={{ mt: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                    Global Profile Images
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                    Choose from admin-uploaded global profile images
                  </Typography>

                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 2
                  }}>
                    {globalImages.filter(img => img.type === 'profile').map((image) => (
                      <Box
                        key={image.id}
                        sx={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          p: 1,
                          borderRadius: 1,
                          border: '2px solid',
                          borderColor: avatarImage === image.url ? 'primary.main' : 'transparent',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'action.hover'
                          }
                        }}
                        onClick={async () => {
                          try {
                            // Use the sync hook to update profile image
                            await updateProfileImage(image.url);
                            setSelectedAvatarId(null);
                            setSnackbarMessage('Profile image updated and saved!');
                            setSnackbarOpen(true);
                            console.log('📸 Global profile image saved using sync hook:', image.url);
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
                            backgroundImage: `url(${image.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            mx: 'auto',
                            mb: 1
                          }}
                        />
                        <Typography variant="caption" display="block" noWrap>
                          {image.name}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
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
