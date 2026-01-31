// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import { Stack, Typography, IconButton, TextField, Button, Box, Snackbar, Alert } from '@mui/material';

import ChildCard from 'src/shared/ui/ChildCard';
import { IconBriefcase, IconDeviceDesktop, IconMail, IconMapPin, IconEdit, IconCheck, IconX } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

interface IntroData {
  introduction: string;
  jobTitle: string;
  company: string;
  email: string;
  website: string;
  location: string;
}

const IntroCard = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const [introData, setIntroData] = useState<IntroData>({
    introduction: '',
    jobTitle: '',
    company: '',
    email: '',
    website: '',
    location: ''
  });
  
  const [editData, setEditData] = useState<IntroData>(introData);

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfileData = async () => {
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
            const settings = data.settings;
            const newData: IntroData = {
              introduction: settings.introduction || settings.bio || '',
              jobTitle: settings.jobTitle || '',
              company: settings.company || '',
              email: settings.email || user.email || '',
              website: settings.website || '',
              location: settings.location || ''
            };
            setIntroData(newData);
            setEditData(newData);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user?.id]);

  const handleEdit = () => {
    setEditData(introData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData(introData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/om/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          introduction: editData.introduction,
          jobTitle: editData.jobTitle,
          company: editData.company,
          website: editData.website,
          location: editData.location
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIntroData(editData);
          setIsEditing(false);
          setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
        } else {
          throw new Error(result.error || 'Failed to save');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to save profile', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof IntroData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (loading) {
    return (
      <ChildCard>
        <Typography>Loading profile...</Typography>
      </ChildCard>
    );
  }

  return (
    <ChildCard>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography fontWeight={600} variant="h4">
          Introduction
        </Typography>
        {!isEditing ? (
          <IconButton size="small" onClick={handleEdit} title="Edit">
            <IconEdit size="18" />
          </IconButton>
        ) : (
          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={handleSave} disabled={saving} color="primary" title="Save">
              <IconCheck size="18" />
            </IconButton>
            <IconButton size="small" onClick={handleCancel} disabled={saving} color="error" title="Cancel">
              <IconX size="18" />
            </IconButton>
          </Stack>
        )}
      </Box>

      {isEditing ? (
        <Stack spacing={2}>
          <TextField
            label="Introduction"
            multiline
            rows={3}
            value={editData.introduction}
            onChange={handleChange('introduction')}
            fullWidth
            size="small"
          />
          <TextField
            label="Job Title"
            value={editData.jobTitle}
            onChange={handleChange('jobTitle')}
            fullWidth
            size="small"
          />
          <TextField
            label="Company/Organization"
            value={editData.company}
            onChange={handleChange('company')}
            fullWidth
            size="small"
          />
          <TextField
            label="Website"
            value={editData.website}
            onChange={handleChange('website')}
            fullWidth
            size="small"
          />
          <TextField
            label="Location"
            value={editData.location}
            onChange={handleChange('location')}
            fullWidth
            size="small"
          />
        </Stack>
      ) : (
        <>
          <Typography color="textSecondary" variant="subtitle2" mb={2}>
            {introData.introduction || 'No introduction yet. Click edit to add one.'}
          </Typography>
          
          {(introData.jobTitle || introData.company) && (
            <Stack direction="row" gap={2} alignItems="center" mb={3}>
              <IconBriefcase size="21" />
              <Typography variant="h6">
                {[introData.jobTitle, introData.company].filter(Boolean).join(' at ')}
              </Typography>
            </Stack>
          )}
          
          {introData.email && (
            <Stack direction="row" gap={2} alignItems="center" mb={3}>
              <IconMail size="21" />
              <Typography variant="h6">{introData.email}</Typography>
            </Stack>
          )}
          
          {introData.website && (
            <Stack direction="row" gap={2} alignItems="center" mb={3}>
              <IconDeviceDesktop size="21" />
              <Typography variant="h6">{introData.website}</Typography>
            </Stack>
          )}
          
          {introData.location && (
            <Stack direction="row" gap={2} alignItems="center" mb={1}>
              <IconMapPin size="21" />
              <Typography variant="h6">{introData.location}</Typography>
            </Stack>
          )}
        </>
      )}

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
    </ChildCard>
  );
};

export default IntroCard;
