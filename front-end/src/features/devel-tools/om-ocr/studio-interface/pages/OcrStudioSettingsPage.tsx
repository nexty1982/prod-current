import React from 'react';
import { Box, Typography } from '@mui/material';
import { OcrStudioSettingsPanel } from '../../pages/OCRSettingsPage';

export default function OcrStudioSettingsPage() {
  return (
    <Box sx={{ pt: 1 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        OCR Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Document processing, validation rules, clergy, and location mappings for the target church.
      </Typography>
      <OcrStudioSettingsPanel />
    </Box>
  );
}
