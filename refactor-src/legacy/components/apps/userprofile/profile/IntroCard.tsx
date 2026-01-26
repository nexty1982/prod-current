// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useState, useEffect } from 'react';
import { 
  Stack, 
  Typography, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box 
} from '@mui/material';

import ChildCard from '@/shared/ui/ChildCard';
import { 
  IconBriefcase, 
  IconDeviceDesktop, 
  IconMail, 
  IconMapPin, 
  IconEdit 
} from '@tabler/icons-react';
import { UserDataContext } from '@/context/UserDataContext';

const IntroCard = () => {
  const context = useContext(UserDataContext);
  const profileData = context?.profileData;
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    introduction: profileData?.introduction || 'Hello, I am an Orthodox Christian. I love our faith community and traditions.',
    workplace: profileData?.workplace || 'Orthodox Community',
    email: profileData?.email || 'user@orthodox.example',
    website: profileData?.website || 'www.orthodox-community.org',
    location: profileData?.location || 'Orthodox Parish, City',
  });

  // Sync form with profile data changes from localStorage
  useEffect(() => {
    setEditForm({
      introduction: profileData?.introduction || 'Hello, I am an Orthodox Christian. I love our faith community and traditions.',
      workplace: profileData?.workplace || 'Orthodox Community',
      email: profileData?.email || 'user@orthodox.example',
      website: profileData?.website || 'www.orthodox-community.org',
      location: profileData?.location || 'Orthodox Parish, City',
    });
  }, [profileData]);

  const handleEdit = () => {
    setEditForm({
      introduction: profileData?.introduction || 'Hello, I am an Orthodox Christian. I love our faith community and traditions.',
      workplace: profileData?.workplace || 'Orthodox Community',
      email: profileData?.email || 'user@orthodox.example',
      website: profileData?.website || 'www.orthodox-community.org',
      location: profileData?.location || 'Orthodox Parish, City',
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    // Update the context with new values
    if (context?.updateProfileData) {
      context.updateProfileData({
        introduction: editForm.introduction,
        workplace: editForm.workplace,
        email: editForm.email,
        website: editForm.website,
        location: editForm.location,
      });
    }
    setEditDialogOpen(false);
  };

  return (
    <>
      <ChildCard>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography fontWeight={600} variant="h4">
            Introduction
          </Typography>
          <IconButton
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
            onClick={handleEdit}
          >
            <IconEdit size={16} />
          </IconButton>
        </Box>
        <Typography color="textSecondary" variant="subtitle2" mb={2}>
          {profileData?.introduction || 'Hello, I am an Orthodox Christian. I love our faith community and traditions.'}
        </Typography>
        <Stack direction="row" gap={2} alignItems="center" mb={3}>
          <IconBriefcase size="21" />
          <Typography variant="h6">{profileData?.workplace || 'Orthodox Community'}</Typography>
        </Stack>
        <Stack direction="row" gap={2} alignItems="center" mb={3}>
          <IconMail size="21" />
          <Typography variant="h6">{profileData?.email || 'user@orthodox.example'}</Typography>
        </Stack>
        <Stack direction="row" gap={2} alignItems="center" mb={3}>
          <IconDeviceDesktop size="21" />
          <Typography variant="h6">{profileData?.website || 'www.orthodox-community.org'}</Typography>
        </Stack>
        <Stack direction="row" gap={2} alignItems="center" mb={1}>
          <IconMapPin size="21" />
          <Typography variant="h6">{profileData?.location || 'Orthodox Parish, City'}</Typography>
        </Stack>
      </ChildCard>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Introduction</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Introduction"
              value={editForm.introduction}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setEditForm({ ...editForm, introduction: e.target.value })}
              margin="normal"
              variant="outlined"
              multiline
              rows={4}
            />
            <TextField
              fullWidth
              label="Workplace/Organization"
              value={editForm.workplace}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setEditForm({ ...editForm, workplace: e.target.value })}
              margin="normal"
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Email"
              value={editForm.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setEditForm({ ...editForm, email: e.target.value })}
              margin="normal"
              variant="outlined"
              type="email"
            />
            <TextField
              fullWidth
              label="Website"
              value={editForm.website}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setEditForm({ ...editForm, website: e.target.value })}
              margin="normal"
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Location"
              value={editForm.location}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setEditForm({ ...editForm, location: e.target.value })}
              margin="normal"
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default IntroCard;
