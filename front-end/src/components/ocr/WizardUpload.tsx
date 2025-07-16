/**
 * OCR Upload Wizard - Multi-step guided upload process
 * 
 * Features:
 * - Step 1: Record Info (type, language, quality settings)
 * - Step 2: File Upload (drag-drop with validation)
 * - Step 3: File Review (thumbnails, validation warnings)
 * - Step 4: Confirmation and submission
 */

import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { 
  ArrowBack,
  ArrowForward,
  CheckCircle
} from '@mui/icons-material';

import { Step1RecordDetails } from './wizard/Step1RecordDetails';
import { Step2FileUploader } from './wizard/Step2FileUploader';
import { Step3FileReview } from './wizard/Step3FileReview';
import { Step4Confirmation } from './wizard/Step4Confirmation';

// Types for wizard state
export interface UploadFileMetadata {
  id: string;
  name: string;
  url: string;
  fileType: 'pdf' | 'jpg' | 'png' | 'tiff' | 'gif';
  fileSize: number;
  width: number;
  height: number;
  uploadedAt: Date;
  valid: boolean;
  error?: string;
  file: File;
}

export interface WizardFormData {
  recordType: 'baptism' | 'marriage' | 'funeral';
  language: 'en' | 'gr' | 'ru' | 'ro';
  quality: 'fast' | 'balanced' | 'high_accuracy';
  autoInsert: boolean;
  confidenceThreshold: number;
  files: UploadFileMetadata[];
}

interface OcrWizardUploadProps {
  churchId: string;
  onComplete?: (data: WizardFormData) => void;
  onCancel?: () => void;
}

const steps = [
  'Record Details',
  'Upload Files', 
  'Review Files',
  'Confirm & Submit'
];

export const OcrWizardUpload: React.FC<OcrWizardUploadProps> = ({
  churchId,
  onComplete,
  onCancel
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<WizardFormData>({
    recordType: 'baptism',
    language: 'en',
    quality: 'balanced',
    autoInsert: false,
    confidenceThreshold: 85,
    files: []
  });

  // Update form data
  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Record Details
        return !!(formData.recordType && formData.language && formData.quality);
      case 1: // File Upload
        return formData.files.length > 0;
      case 2: // File Review
        return formData.files.every(file => file.valid);
      case 3: // Confirmation
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid(activeStep)) {
      setActiveStep(prev => prev + 1);
      setError(null);
    } else {
      setError('Please complete all required fields before proceeding.');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!isStepValid(3)) {
      setError('Please review all files and ensure they are valid.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('recordType', formData.recordType);
      uploadData.append('language', formData.language);
      uploadData.append('quality', formData.quality);
      uploadData.append('autoInsert', formData.autoInsert.toString());
      uploadData.append('confidenceThreshold', formData.confidenceThreshold.toString());
      uploadData.append('churchId', churchId);

      // Add all files
      formData.files.forEach((fileMetadata, index) => {
        uploadData.append(`files`, fileMetadata.file);
        uploadData.append(`metadata_${index}`, JSON.stringify({
          id: fileMetadata.id,
          name: fileMetadata.name,
          fileType: fileMetadata.fileType,
          fileSize: fileMetadata.fileSize,
          width: fileMetadata.width,
          height: fileMetadata.height
        }));
      });

      const response = await fetch(`/api/church/${churchId}/ocr/upload`, {
        method: 'POST',
        body: uploadData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Call completion callback
      if (onComplete) {
        onComplete(formData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Step1RecordDetails
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 1:
        return (
          <Step2FileUploader
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 2:
        return (
          <Step3FileReview
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 3:
        return (
          <Step4Confirmation
            formData={formData}
            onSubmit={handleSubmit}
            loading={loading}
          />
        );
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {steps[activeStep]}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Step {activeStep + 1} of {steps.length}
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label} completed={index < activeStep}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Error Alert */}
      {error && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Alert severity="error">
            {error}
          </Alert>
        </Box>
      )}

      {/* Step Content */}
      <Box sx={{ minHeight: 500, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1 }}>
          {renderStepContent(activeStep)}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {onCancel && (
              <Button
                onClick={onCancel}
                disabled={loading}
                color="inherit"
              >
                Cancel
              </Button>
            )}

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!isStepValid(activeStep) || loading}
                startIcon={loading ? undefined : <CheckCircle />}
              >
                {loading ? 'Submitting...' : 'Start Processing'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepValid(activeStep) || loading}
                endIcon={<ArrowForward />}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>

        {/* Progress Summary */}
        <Box sx={{ px: 3, pb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            {formData.files.length > 0 && (
              <span>{formData.files.length} file(s) selected • </span>
            )}
            {formData.recordType} • {formData.language} • {formData.quality}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default OcrWizardUpload;
