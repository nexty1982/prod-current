import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  Avatar,
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  IconCamera,
  IconEdit,
  IconMapPin,
  IconLink,
  IconBrandFacebook,
  IconBrandTwitter,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandYoutube,
  IconPhone,
  IconMail,
  IconCalendar,
  IconBriefcase,
  IconBuilding,
  IconCheck,
  IconUpload
} from '@tabler/icons-react';

const ProfileBanner = ({ 
  profile, 
  isOwnProfile = false, 
  onProfileUpdate, 
  onImageUpload 
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [imageUploadDialogOpen, setImageUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState('profile'); // 'profile' or 'cover'
  const [editForm, setEditForm] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    website: profile?.website || '',
    phone: profile?.phone || '',
    job_title: profile?.job_title || '',
    company: profile?.company || ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleEditSubmit = async () => {
    try {
      await onProfileUpdate(editForm);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append(uploadType === 'profile' ? 'profileImage' : 'coverImage', file);

      const response = await fetch(`/api/user/images/upload/${uploadType}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        onImageUpload(uploadType, data.imageUrl);
        setImageUploadDialogOpen(false);
      } else {
        setUploadError(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openImageUpload = (type) => {
    setUploadType(type);
    setUploadError('');
    setImageUploadDialogOpen(true);
  };

  const getSocialIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <IconBrandFacebook size={18} />;
      case 'twitter': return <IconBrandTwitter size={18} />;
      case 'instagram': return <IconBrandInstagram size={18} />;
      case 'linkedin': return <IconBrandLinkedin size={18} />;
      case 'youtube': return <IconBrandYoutube size={18} />;
      default: return <IconLink size={18} />;
    }
  };

  const socialLinks = profile?.social_links ? JSON.parse(profile.social_links) : [];

  return (
    <>
      <Card>
        {/* Cover Image */}
        <Box
          sx={{
            height: 240,
            background: profile?.cover_image_url 
              ? `url(${profile.cover_image_url})` 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            p: 2
          }}
        >
          {isOwnProfile && (
            <IconButton
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' }
              }}
              onClick={() => openImageUpload('cover')}
            >
              <IconCamera size={20} />
            </IconButton>
          )}

          {/* Profile Avatar */}
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={profile?.profile_image_url}
              sx={{
                width: 120,
                height: 120,
                border: '4px solid white',
                boxShadow: 3
              }}
            >
              {profile?.profile_image ? (
                <img 
                  src={profile.profile_image} 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (profile?.display_name?.charAt(0) || 
                 profile?.first_name?.charAt(0) || 
                 profile?.last_name?.charAt(0) || 
                 'U')
              )}
            </Avatar>
            
            {isOwnProfile && (
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  width: 32,
                  height: 32,
                  '&:hover': { backgroundColor: 'primary.dark' }
                }}
                onClick={() => openImageUpload('profile')}
              >
                <IconCamera size={16} />
              </IconButton>
            )}
          </Box>
        </Box>

        <CardContent>
          <Grid container spacing={3}>
            {/* Profile Info */}
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h4" component="h1">
                  {profile?.display_name || 
                   (profile?.first_name || profile?.last_name ? 
                     `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() : 
                     'User Profile')}
                </Typography>
                {profile?.verification_status === 'verified' && (
                  <Tooltip title="Verified Profile">
                    <IconCheck size={20} color="primary" />
                  </Tooltip>
                )}
                {isOwnProfile && (
                  <IconButton
                    size="small"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <IconEdit size={16} />
                  </IconButton>
                )}
              </Box>

              {profile?.job_title && (
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {profile.job_title}
                  {profile?.company && ` at ${profile.company}`}
                </Typography>
              )}

              {profile?.bio && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {profile.bio}
                </Typography>
              )}

              {/* Contact Info */}
              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
                {profile?.location && (
                  <Chip
                    icon={<IconMapPin size={16} />}
                    label={profile.location}
                    variant="outlined"
                    size="small"
                  />
                )}
                {profile?.phone && (
                  <Chip
                    icon={<IconPhone size={16} />}
                    label={profile.phone}
                    variant="outlined"
                    size="small"
                  />
                )}
                {profile?.email && (
                  <Chip
                    icon={<IconMail size={16} />}
                    label={profile.email}
                    variant="outlined"
                    size="small"
                  />
                )}
                {profile?.website && (
                  <Chip
                    icon={<IconLink size={16} />}
                    label={profile.website}
                    variant="outlined"
                    size="small"
                    component="a"
                    href={profile.website}
                    target="_blank"
                    clickable
                  />
                )}
              </Stack>

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <Stack direction="row" spacing={1}>
                  {socialLinks.map((link, index) => (
                    <IconButton
                      key={index}
                      component="a"
                      href={link.url}
                      target="_blank"
                      size="small"
                      sx={{ 
                        border: 1, 
                        borderColor: 'divider',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      {getSocialIcon(link.platform)}
                    </IconButton>
                  ))}
                </Stack>
              )}
            </Grid>

            {/* Stats */}
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={4} justifyContent={{ xs: 'center', md: 'flex-end' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {profile?.posts_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Posts
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {profile?.followers_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Followers
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {profile?.following_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Following
                  </Typography>
                </Box>
              </Stack>

              {profile?.church_affiliation && (
                <Box sx={{ mt: 2, textAlign: { xs: 'center', md: 'right' } }}>
                  <Chip
                    icon={<IconBuilding size={16} />}
                    label={profile.church_affiliation}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Display Name"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={editForm.job_title}
                onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Website"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                multiline
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={imageUploadDialogOpen} onClose={() => setImageUploadDialogOpen(false)}>
        <DialogTitle>
          Upload {uploadType === 'profile' ? 'Profile Picture' : 'Cover Image'}
        </DialogTitle>
        <DialogContent>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {uploadError}
            </Alert>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          
          <Button
            variant="outlined"
            startIcon={<IconUpload />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            fullWidth
            sx={{ mt: 2 }}
          >
            {uploading ? 'Uploading...' : 'Choose Image'}
          </Button>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageUploadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProfileBanner;
