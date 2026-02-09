/**
 * BaptismRecordEntryPage Component
 * 
 * Form page for creating and editing baptism records.
 * Supports both create (new) and edit (edit/:id) modes.
 * 
 * Routes: 
 *   /apps/records/baptism/new?church_id={id}
 *   /apps/records/baptism/edit/:id?church_id={id}
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';

interface BaptismRecordFormData {
  first_name: string;
  last_name: string;
  birth_date: string;
  reception_date: string;
  clergy: string;
  birthplace: string;
  parents: string;
  sponsors: string;
  entry_type: string;
  notes: string;
}

const BaptismRecordEntryPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isEditMode = !!id;
  const churchId = searchParams.get('church_id') || user?.church_id?.toString() || '';
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<BaptismRecordFormData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    reception_date: '',
    clergy: '',
    birthplace: '',
    parents: '',
    sponsors: '',
    entry_type: '',
    notes: ''
  });

  // Load record data for edit mode
  useEffect(() => {
    if (isEditMode && id && churchId) {
      const loadRecord = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const params = new URLSearchParams({ church_id: churchId });
          const response = await fetch(`/api/baptism-records/${id}?${params.toString()}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error('Failed to load record');
          }
          
          const data = await response.json();
          if (data.success && data.record) {
            const record = data.record;
            setFormData({
              first_name: record.first_name || '',
              last_name: record.last_name || '',
              birth_date: record.birth_date || '',
              reception_date: record.reception_date || '',
              clergy: record.clergy || '',
              birthplace: record.birthplace || '',
              parents: record.parents || '',
              sponsors: record.sponsors || '',
              entry_type: record.entry_type || '',
              notes: record.notes || ''
            });
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load record');
        } finally {
          setLoading(false);
        }
      };
      
      loadRecord();
    }
  }, [isEditMode, id, churchId]);

  const handleChange = (field: keyof BaptismRecordFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!churchId) {
      setError('Church ID is required');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const url = isEditMode 
        ? `/api/baptism-records/${id}`
        : '/api/baptism-records';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const params = new URLSearchParams({ church_id: churchId });
      const response = await fetch(`${url}?${params.toString()}`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          church_id: parseInt(churchId)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save record');
      }
      
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        // Redirect to list page after a short delay
        setTimeout(() => {
          navigate(`/apps/records/baptism?church_id=${churchId}`);
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to save record');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/apps/records/baptism?church_id=${churchId}`);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Edit Baptism Record' : 'New Baptism Record'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Record {isEditMode ? 'updated' : 'created'} successfully. Redirecting...
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={handleChange('first_name')}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={handleChange('last_name')}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Birth Date"
                type="date"
                value={formData.birth_date}
                onChange={handleChange('birth_date')}
                InputLabelProps={{ shrink: true }}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Reception Date (Baptism Date)"
                type="date"
                value={formData.reception_date}
                onChange={handleChange('reception_date')}
                InputLabelProps={{ shrink: true }}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Clergy"
                value={formData.clergy}
                onChange={handleChange('clergy')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Birthplace"
                value={formData.birthplace}
                onChange={handleChange('birthplace')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Parents"
                value={formData.parents}
                onChange={handleChange('parents')}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sponsors (Godparents)"
                value={formData.sponsors}
                onChange={handleChange('sponsors')}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Entry Type"
                value={formData.entry_type}
                onChange={handleChange('entry_type')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={handleChange('notes')}
                margin="normal"
                multiline
                rows={4}
              />
            </Grid>
          </Grid>
          
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<IconCheck size={18} />}
              disabled={saving}
            >
              {saving ? 'Saving...' : (isEditMode ? 'Update Record' : 'Create Record')}
            </Button>
            <Button
              type="button"
              variant="outlined"
              startIcon={<IconX size={18} />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default BaptismRecordEntryPage;
