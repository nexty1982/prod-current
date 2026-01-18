import React, { useState } from 'react';
import { Box, Button, Container, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FuneralRecordForm, FuneralRecordFormData } from './FuneralRecordForm';

const initialFormData: FuneralRecordFormData = {
  deceased_first_name: '',
  deceased_last_name: '',
  date_of_death: '',
  burial_date: '',
  age: '',
  cause_of_death: '',
  place_of_burial: '',
  officiating_priest: '',
  next_of_kin: '',
  notes: '',
};

export const FuneralRecordEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FuneralRecordFormData>(initialFormData);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleChange = (field: keyof FuneralRecordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      // TODO: Implement API call to save record
      console.log('Submitting funeral record:', formData);
      setSnackbar({ open: true, message: 'Funeral record saved successfully', severity: 'success' });
      setTimeout(() => {
        navigate('/apps/records/funeral');
      }, 1500);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save record', severity: 'error' });
    }
  };

  const handleCancel = () => {
    navigate('/apps/records/funeral');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <FuneralRecordForm
        formData={formData}
        onChange={handleChange}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
        <Button variant="outlined" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} color="primary">
          Save Record
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};
