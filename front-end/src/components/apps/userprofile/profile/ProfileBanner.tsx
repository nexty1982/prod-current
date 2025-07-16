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

// Default images
import profilecover from 'src/assets/images/backgrounds/profilebg.jpg';
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
  const [coverPhoto, setCoverPhoto] = useState(profilecover);
  const [avatarImage, setAvatarImage] = useState(userimg);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null);
  const [coverUploadOpen, setCoverUploadOpen] = useState(false);
  const [avatarUploadOpen, setAvatarUploadOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // User profile data state - Load from localStorage or use defaults
  const getInitialProfile = () => {
    try {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        return JSON.parse(savedProfile);
      }
    } catch (error) {
      console.error('Failed to load initial profile:', error);
    }
    
    // Default values only if no saved profile exists
    return {
      full_name: 'Your Name',
      introduction: 'Orthodox Christian dedicated to preserving church traditions and serving the community.',
      institute_name: 'St. Nicholas Orthodox Seminary',
      website_url: 'https://orthodoxfaith.com',
      location: 'New York, NY'
    };
  };
  
  const [userProfile, setUserProfile] = useState(getInitialProfile());
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({ ...userProfile });
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Load user profile data from local storage
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Get profile from local storage
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
          const profileData = JSON.parse(savedProfile);
          // Only update if the current profile is different (prevents reset to defaults)
          setUserProfile(profileData);
          setEditedProfile({ ...profileData });
        }
        
        // Get selected avatar ID from local storage
        const savedAvatarId = localStorage.getItem('selectedAvatarId');
        if (savedAvatarId) {
          setSelectedAvatarId(parseInt(savedAvatarId));
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };
    
    loadUserProfile();
  }, []);

  // Save profile changes to local storage
  const handleSaveProfile = async () => {
    try {
      // Save profile data to local storage
      localStorage.setItem('userProfile', JSON.stringify(editedProfile));
      
      // Save avatar selection
      if (selectedAvatarId) {
        localStorage.setItem('selectedAvatarId', selectedAvatarId.toString());
      } else {
        localStorage.removeItem('selectedAvatarId');
      }
      
      setUserProfile({ ...editedProfile });
      setIsEditing(false);
      setSnackbarMessage('Profile updated successfully!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSnackbarMessage('Failed to update profile. Please try again.');
      setSnackbarOpen(true);
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditedProfile({ ...userProfile });
    setIsEditing(false);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setEditedProfile(prev => ({
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

  const handleCoverPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPhoto(e.target?.result as string);
        setSnackbarMessage('Cover photo updated successfully!');
        setSnackbarOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarImage(e.target?.result as string);
        setSelectedAvatarId(null); // Reset Orthodox avatar selection
        setAvatarUploadOpen(false);
        setSnackbarMessage('Profile picture updated successfully!');
        setSnackbarOpen(true);
      };
      reader.readAsDataURL(file);
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
      const selectedAvatar = orthodoxAvatars.find(avatar => avatar.id === selectedAvatarId);
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
            sx={{ 
              width: "100%", 
              height: "300px", 
              objectFit: "cover",
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
              onClick={() => setCoverUploadOpen(true)}
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
                  {userProfile.introduction && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Introduction
                      </Typography>
                      <Typography variant="body1">
                        {userProfile.introduction}
                      </Typography>
                    </Box>
                  )}
                  
                  {userProfile.institute_name && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Institute/Organization
                      </Typography>
                      <Typography variant="body1">
                        {userProfile.institute_name}
                      </Typography>
                    </Box>
                  )}
                  
                  {userProfile.website_url && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Website
                      </Typography>
                      <Typography 
                        variant="body1" 
                        component="a" 
                        href={userProfile.website_url.startsWith('http') ? userProfile.website_url : `https://${userProfile.website_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {userProfile.website_url}
                      </Typography>
                    </Box>
                  )}
                  
                  {userProfile.location && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Location
                      </Typography>
                      <Typography variant="body1">
                        {userProfile.location}
                      </Typography>
                    </Box>
                  )}
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
                          onClick={() => setAvatarUploadOpen(true)}
                        >
                          <IconEdit size={16} />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    {renderCurrentAvatar(100, {
                      borderRadius: '50%',
                      border: '4px solid #fff'
                    }, () => setAvatarUploadOpen(true))}
                  </Badge>
                </ProfileImage>
                <Box mt={1}>
                  {!isEditing ? (
                    <>
                      <Typography fontWeight={600} variant="h5">
                        {userProfile.full_name}
                      </Typography>
                      <Typography color="textSecondary" variant="h6" fontWeight={400}>
                        Orthodox Faithful
                      </Typography>
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
              {userProfile.website_url && (
                <Button 
                  color="primary" 
                  variant="outlined"
                  href={userProfile.website_url.startsWith('http') ? userProfile.website_url : `https://${userProfile.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit Website
                </Button>
              )}
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
            
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverPhotoUpload}
            />
            
            <Button
              variant="contained"
              startIcon={<IconUpload />}
              onClick={() => coverInputRef.current?.click()}
              size="large"
              fullWidth
            >
              Upload New Cover Photo
            </Button>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Recommended size: 1200x300 pixels. JPG, PNG, or GIF files only.
            </Typography>
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
                {userProfile.full_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Orthodox Faithful
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

            {/* Orthodox Character Avatars */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                  Choose Orthodox Character Avatar
                </Typography>
                
                {/* Debug: Show avatar count */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
                  {orthodoxAvatars.length} Orthodox avatars available
                </Typography>
                
                {/* Test: Direct avatar rendering */}
                <Box sx={{ textAlign: 'center', mb: 2, p: 2, border: '1px dashed #ccc' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Test Avatar (Direct Render):
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, gap: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <YoungPriest1 size={60} />
                      <Typography variant="caption" display="block">SVG Test</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <TestAvatar size={60} />
                      <Typography variant="caption" display="block">Simple SVG</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', width: 60, height: 60, backgroundColor: 'primary.main', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Typography variant="caption">Fallback</Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Clergy Section */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Orthodox Clergy ({orthodoxAvatars.filter(avatar => avatar.type === 'clergy').length} available)
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                    gap: 2 
                  }}>
                    {orthodoxAvatars.filter(avatar => avatar.type === 'clergy').map((avatar) => (
                      <OrthodoxAvatarSelector
                        key={avatar.id}
                        avatar={avatar}
                        isSelected={selectedAvatarId === avatar.id}
                        onClick={() => handlePresetAvatarSelect(avatar)}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Laity Section */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
                    Orthodox Faithful ({orthodoxAvatars.filter(avatar => avatar.type === 'laity').length} available)
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                    gap: 2 
                  }}>
                    {orthodoxAvatars.filter(avatar => avatar.type === 'laity').map((avatar) => (
                      <OrthodoxAvatarSelector
                        key={avatar.id}
                        avatar={avatar}
                        isSelected={selectedAvatarId === avatar.id}
                        onClick={() => handlePresetAvatarSelect(avatar)}
                      />
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
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
          severity="success" 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProfileBanner;
