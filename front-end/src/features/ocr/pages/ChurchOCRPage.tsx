/**
 * ChurchOCRPage Component
 * 
 * Church-specific OCR processing page.
 * Allows churches to process their own documents with OCR.
 * 
 * Route: /apps/ocr/church
 */

import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { EnhancedOCRUploader } from '../../devel-tools/om-ocr/EnhancedOCRUploader';

const ChurchOCRPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Church OCR Processing
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Process church documents with OCR to extract records and data.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Upload images or PDFs of church records to automatically extract text and data.
          The OCR system will process your documents and help you import records into the system.
        </Alert>

        <EnhancedOCRUploader />
      </Paper>
    </Box>
  );
};

export default ChurchOCRPage;
