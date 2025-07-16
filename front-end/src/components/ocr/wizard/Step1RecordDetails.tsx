/**
 * Step 1: Record Details Configuration
 * 
 * Features:
 * - Record type selection (baptism, marriage, funeral)
 * - Language selection (English, Greek, Russian, Romanian)
 * - OCR quality mode (fast, balanced, high accuracy)
 * - Auto-insert toggle with confidence threshold
 */

import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Slider,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Description as Document,
  Language,
  Speed as Gauge,
  AutoMode
} from '@mui/icons-material';

import { WizardFormData } from '../WizardUpload';

interface Step1RecordDetailsProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const recordTypes = [
  {
    value: 'baptism' as const,
    label: 'Baptism Records',
    description: 'Orthodox baptism certificates and registry entries',
    icon: '⛪'
  },
  {
    value: 'marriage' as const,
    label: 'Marriage Records',
    description: 'Wedding certificates and marriage registry entries',
    icon: '💒'
  },
  {
    value: 'funeral' as const,
    label: 'Funeral Records',
    description: 'Memorial services and burial registry entries',
    icon: '🕊️'
  }
];

const languages = [
  {
    value: 'en' as const,
    label: 'English',
    description: 'Primary language for most records',
    flag: '🇺🇸'
  },
  {
    value: 'gr' as const,
    label: 'Greek',
    description: 'Traditional Orthodox Greek documents',
    flag: '🇬🇷'
  },
  {
    value: 'ru' as const,
    label: 'Russian',
    description: 'Russian Orthodox church records',
    flag: '🇷🇺'
  },
  {
    value: 'ro' as const,
    label: 'Romanian',
    description: 'Romanian Orthodox documents',
    flag: '🇷🇴'
  }
];

const qualityModes = [
  {
    value: 'fast' as const,
    label: 'Fast Processing',
    description: 'Quick OCR with standard accuracy',
    time: '~30 seconds per page',
    accuracy: '85-90%'
  },
  {
    value: 'balanced' as const,
    label: 'Balanced Quality',
    description: 'Good balance of speed and accuracy',
    time: '~60 seconds per page',
    accuracy: '90-95%'
  },
  {
    value: 'high_accuracy' as const,
    label: 'High Accuracy',
    description: 'Maximum precision for complex documents',
    time: '~120 seconds per page',
    accuracy: '95-99%'
  }
];

export const Step1RecordDetails: React.FC<Step1RecordDetailsProps> = ({
  formData,
  updateFormData
}) => {
  const handleRecordTypeChange = (value: string) => {
    updateFormData({ recordType: value as WizardFormData['recordType'] });
  };

  const handleLanguageChange = (value: string) => {
    updateFormData({ language: value as WizardFormData['language'] });
  };

  const handleQualityChange = (value: string) => {
    updateFormData({ quality: value as WizardFormData['quality'] });
  };

  const handleAutoInsertChange = (checked: boolean) => {
    updateFormData({ autoInsert: checked });
  };

  const handleConfidenceThresholdChange = (value: number) => {
    updateFormData({ confidenceThreshold: value });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Configure OCR Processing
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Set up the processing parameters for your Orthodox church records
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Record Type Selection */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            Record Type
          </Typography>
          <Grid container spacing={2}>
            {recordTypes.map((type) => (
              <Grid item xs={12} md={4} key={type.value}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: formData.recordType === type.value ? 2 : 1,
                    borderColor: formData.recordType === type.value ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => handleRecordTypeChange(type.value)}
                >
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ mb: 1 }}>
                      {type.icon}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {type.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {type.description}
                    </Typography>
                    {formData.recordType === type.value && (
                      <Chip 
                        label="Selected" 
                        size="small" 
                        color="primary" 
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Language Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Document Language</InputLabel>
            <Select
              value={formData.language}
              label="Document Language"
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {languages.map((lang) => (
                <MenuItem key={lang.value} value={lang.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span>{lang.flag}</span>
                    <Box>
                      <Typography variant="body1">{lang.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {lang.description}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Quality Mode Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>OCR Quality Mode</InputLabel>
            <Select
              value={formData.quality}
              label="OCR Quality Mode"
              onChange={(e) => handleQualityChange(e.target.value)}
            >
              {qualityModes.map((mode) => (
                <MenuItem key={mode.value} value={mode.value}>
                  <Box>
                    <Typography variant="body1">{mode.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mode.description} • {mode.time} • {mode.accuracy}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Auto-Insert Settings */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'grey.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <AutoMode color="primary" />
                <Typography variant="subtitle1" fontWeight="medium">
                  Auto-Insert Settings
                </Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoInsert}
                    onChange={(e) => handleAutoInsertChange(e.target.checked)}
                    color="primary"
                  />
                }
                label="Automatically insert high-confidence results into database"
                sx={{ mb: formData.autoInsert ? 3 : 0 }}
              />

              {formData.autoInsert && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Confidence Threshold: {formData.confidenceThreshold}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Only results above this confidence level will be auto-inserted
                  </Typography>
                  <Slider
                    value={formData.confidenceThreshold}
                    onChange={(_, value) => handleConfidenceThresholdChange(value as number)}
                    min={50}
                    max={99}
                    step={5}
                    marks={[
                      { value: 50, label: '50%' },
                      { value: 75, label: '75%' },
                      { value: 90, label: '90%' },
                      { value: 99, label: '99%' }
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ mt: 2 }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration Summary */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Configuration Summary
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  icon={<Document />}
                  label={recordTypes.find(t => t.value === formData.recordType)?.label || 'Not selected'}
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  icon={<Language />}
                  label={languages.find(l => l.value === formData.language)?.label || 'Not selected'}
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  icon={<Gauge />}
                  label={qualityModes.find(q => q.value === formData.quality)?.label || 'Not selected'}
                  variant="outlined"
                  size="small"
                />
                {formData.autoInsert && (
                  <Chip 
                    icon={<AutoMode />}
                    label={`Auto-insert at ${formData.confidenceThreshold}%`}
                    variant="outlined"
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
