// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  CardMedia,
  styled,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardActionArea,
  TextField,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import Grid2 from '@mui/material/Grid2';
import {
  IconCamera,
  IconEdit,
  IconCheck,
} from '@tabler/icons-react';
import ProfileTab from './ProfileTab.tsx';
import BlankCard from '../../../shared/BlankCard.tsx';
import { UserDataContext } from '@/context/UserDataContext';

const ProfileBanner = () => {
  // Orthodox default assets
  const defaultBanner = '/orthodox/banners/default.svg';
  const defaultAvatar = '/assets/avatars/orthodox-priest-1.png';
  
  // Get user data from context
  const context = useContext(UserDataContext);
  const profileData = context?.profileData;

  // State for image selection dialogs
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(profileData?.avatar || defaultAvatar);
  const [selectedBanner, setSelectedBanner] = useState(profileData?.coverImage || defaultBanner);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: profileData?.name || '',
    role: profileData?.role || '',
  });

  // Sync selected images with profile data changes
  useEffect(() => {
    setSelectedAvatar(profileData?.avatar || defaultAvatar);
    setSelectedBanner(profileData?.coverImage || defaultBanner);
    setEditForm({
      name: profileData?.name || '',
      role: profileData?.role || '',
    });
  }, [profileData?.avatar, profileData?.coverImage, profileData?.name, profileData?.role, defaultAvatar, defaultBanner]);

  // Predefined avatar options
  // Orthodox character avatar options
  const orthodoxAvatars = [
    // Clergy
    { path: '/assets/avatars/orthodox-priest-1.png', title: 'Orthodox Priest', category: 'Clergy' },
    { path: '/assets/avatars/orthodox-priest-2.png', title: 'Orthodox Priest (Alternative)', category: 'Clergy' },
    { path: '/assets/avatars/orthodox-bishop-1.png', title: 'Orthodox Bishop', category: 'Clergy' },
    { path: '/assets/avatars/orthodox-deacon-1.png', title: 'Orthodox Deacon', category: 'Clergy' },
    { path: '/assets/avatars/orthodox-monk-1.png', title: 'Orthodox Monk', category: 'Clergy' },
    { path: '/assets/avatars/orthodox-nun-1.png', title: 'Orthodox Nun', category: 'Clergy' },
    { path: '/assets/avatars/orthodox-elder-1.png', title: 'Orthodox Elder', category: 'Clergy' },
    
    // Laity
    { path: '/assets/avatars/orthodox-man-1.png', title: 'Orthodox Man', category: 'Laity' },
    { path: '/assets/avatars/orthodox-man-2.png', title: 'Orthodox Man (Alternative)', category: 'Laity' },
    { path: '/assets/avatars/orthodox-woman-1.png', title: 'Orthodox Woman', category: 'Laity' },
    { path: '/assets/avatars/orthodox-father.png', title: 'Orthodox Father', category: 'Laity' },
    { path: '/assets/avatars/orthodox-young-man.png', title: 'Orthodox Young Man', category: 'Laity' },
  ];

  // Avatar paths for selection
  const avatarOptions = orthodoxAvatars.map(avatar => avatar.path);

  // Predefined banner options
  const bannerOptions = [
    '/orthodox/banners/default.svg',
    '/orthodox/banners/default.jpg',
    '/orthodox/banners/1.png',
    '/orthodox/banners/2.png',
    '/orthodox/banners/3.png',
    '/orthodox/banners/4.png',
    '/orthodox/banners/5.png',
    '/orthodox/banners/6.png',
    '/orthodox/banners/7.png',
    '/orthodox/banners/8.png',
    '/orthodox/banners/9.png',
  ];

  // Handle avatar selection
  const handleAvatarSelect = (avatarPath: string) => {
    setSelectedAvatar(avatarPath);
    setAvatarDialogOpen(false);
    // Update context with new avatar
    if (context?.updateProfileData) {
      context.updateProfileData({ avatar: avatarPath });
    }
    console.log('Selected avatar:', avatarPath);
  };

  // Handle banner selection
  const handleBannerSelect = (bannerPath: string) => {
    setSelectedBanner(bannerPath);
    setBannerDialogOpen(false);
    // Update context with new cover image
    if (context?.updateProfileData) {
      context.updateProfileData({ coverImage: bannerPath });
    }
    console.log('Selected banner:', bannerPath);
  };

  const handleNameEdit = () => {
    setEditForm({
      name: profileData?.name || '',
      role: profileData?.role || '',
    });
    setEditNameDialogOpen(true);
  };

  const handleSaveNameEdit = () => {
    // Update the context with new values
    if (context?.updateProfileData) {
      context.updateProfileData({
        ...profileData,
        name: editForm.name,
        role: editForm.role,
      });
    }
    setEditNameDialogOpen(false);
  };
  
  const ProfileImage = styled(Box)(() => ({
    backgroundImage: 'linear-gradient(#50b2fc,#f44c66)',
    borderRadius: '50%',
    width: '110px',
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto'
  }));

  return (<>
    <BlankCard>
      <Box sx={{ position: 'relative' }}>
        <CardMedia 
          component="img" 
          image={selectedBanner} 
          alt="Orthodox Metrics Banner" 
          width="100%" 
          sx={{ height: '200px', objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Banner Edit Button */}
        <IconButton
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
          onClick={() => setBannerDialogOpen(true)}
        >
          <IconCamera size={20} />
        </IconButton>
      </Box>
      <Grid2 container spacing={0} justifyContent="center" alignItems="center">
        {/* about profile */}
        <Grid2
          sx={{
            order: {
              xs: '1',
              sm: '1',
              lg: '1',
            },
          }}
          size={{
            lg: 12,
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
              <Box sx={{ position: 'relative' }}>
                <ProfileImage>
                  <Avatar
                    src={selectedAvatar}
                    alt="Orthodox Metrics Avatar"
                    sx={{
                      borderRadius: '50%',
                      width: '100px',
                      height: '100px',
                      border: '4px solid #fff',
                    }}
                  />
                  <Typography variant="caption" sx={{ mt: 1, display: "block", textAlign: "center" }}>
                    Orthodox Profile
                  </Typography>
                </ProfileImage>
                {/* Avatar Edit Button */}
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                  onClick={() => setAvatarDialogOpen(true)}
                >
                  <IconCamera size={16} />
                </IconButton>
              </Box>
              <Box mt={1} sx={{ position: 'relative' }}>
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <Box textAlign="center">
                    <Typography fontWeight={600} variant="h5">
                      {profileData?.name || 'User Profile'}
                    </Typography>
                    <Typography color="textSecondary" variant="h6" fontWeight={400}>
                      {profileData?.role || 'Orthodox Member'}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    sx={{
                      ml: 1,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                    onClick={handleNameEdit}
                  >
                    <IconEdit size={16} />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid2>
      </Grid2>
      {/**TabbingPart**/}
      <ProfileTab />
    </BlankCard>

    {/* Avatar Selection Dialog */}
    <Dialog open={avatarDialogOpen} onClose={() => setAvatarDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Choose Your Orthodox Character Avatar</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {orthodoxAvatars.map((avatarInfo, index) => (
            <Card key={index} sx={{ width: 120 }}>
              <CardActionArea onClick={() => handleAvatarSelect(avatarInfo.path)}>
                <Box sx={{ p: 1, textAlign: 'center' }}>
                  <Avatar
                    src={avatarInfo.path}
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      margin: '0 auto',
                      border: selectedAvatar === avatarInfo.path ? '3px solid' : 'none',
                      borderColor: selectedAvatar === avatarInfo.path ? 'primary.main' : 'transparent'
                    }}
                  />
                  <Typography variant="caption" sx={{ mt: 1, display: "block", textAlign: "center" }}>
                    {avatarInfo.title}
                  </Typography>
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAvatarDialogOpen(false)}>Cancel</Button>
      </DialogActions>
    </Dialog>

    {/* Banner Selection Dialog */}
    <Dialog open={bannerDialogOpen} onClose={() => setBannerDialogOpen(false)} maxWidth="lg" fullWidth>
      <DialogTitle>Choose Your Banner</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {bannerOptions.map((banner, index) => (
            <Card key={index} sx={{ width: 280 }}>
              <CardActionArea onClick={() => handleBannerSelect(banner)}>
                <Box 
                  sx={{ 
                    position: 'relative',
                    border: selectedBanner === banner ? '3px solid' : 'none',
                    borderColor: selectedBanner === banner ? 'primary.main' : 'transparent'
                  }}
                >
                  <CardMedia
                    component="img"
                    height="120"
                    image={banner}
                    alt={`Banner ${index + 1}`}
                    sx={{ objectFit: 'cover' }}
                  />
                  <Typography variant="caption" sx={{ mt: 1, display: "block", textAlign: "center" }}>
                    Banner {index + 1}
                  </Typography>
                  {selectedBanner === banner && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'primary.main',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <IconCheck size={16} color="white" />
                    </Box>
                  )}
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setBannerDialogOpen(false)}>Cancel</Button>
      </DialogActions>
    </Dialog>

    {/* Name/Role Edit Dialog */}
    <Dialog open={editNameDialogOpen} onClose={() => setEditNameDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Profile Information</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Full Name"
            value={editForm.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, name: e.target.value })}
            margin="normal"
            variant="outlined"
          />
          <TextField
            fullWidth
            label="Role/Title"
            value={editForm.role}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, role: e.target.value })}
            margin="normal"
            variant="outlined"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditNameDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveNameEdit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  </>);
};

export default ProfileBanner;
