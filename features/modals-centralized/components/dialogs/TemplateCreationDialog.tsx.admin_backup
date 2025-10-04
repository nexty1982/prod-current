import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Grid,
  Chip,
  IconButton,
  Alert,
  Divider,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { templateService } from '../../services/templateService';

interface Field {
  field: string;
  label: string;
  type: string;
}

interface Template {
  id?: number;
  name: string;
  slug?: string;
  record_type: string;
  description: string;
  fields: Field[];
  grid_type?: string;
  theme?: string;
  layout_type?: string;
  language_support?: object;
  is_editable?: boolean;
}

interface TemplateCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onTemplateCreated: () => void;
  editTemplate?: Template | null;
}

const steps = ['Template Info', 'Field Mapping', 'Preview & Create'];

const fieldTypes = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'text', label: 'Long Text' },
  { value: 'boolean', label: 'Yes/No' }
];

const recordTypes = [
  { value: 'baptism', label: 'Baptism Records' },
  { value: 'marriage', label: 'Marriage Records' },
  { value: 'funeral', label: 'Funeral Records' },
  { value: 'custom', label: 'Custom Records' }
];

const TemplateCreationDialog: React.FC<TemplateCreationDialogProps> = ({
  open,
  onClose,
  onTemplateCreated,
  editTemplate
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template form data
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [recordType, setRecordType] = useState('custom');
  const [fields, setFields] = useState<Field[]>([
    { field: '', label: '', type: 'string' }
  ]);

  // File upload for CSV/JSON
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [predefinedTemplates, setPredefinedTemplates] = useState<any>(null);

  useEffect(() => {
    if (editTemplate) {
      setTemplateName(editTemplate.name);
      setDescription(editTemplate.description);
      setRecordType(editTemplate.record_type);
      setFields(editTemplate.fields || [{ field: '', label: '', type: 'string' }]);
    } else {
      resetForm();
    }
  }, [editTemplate, open]);

  useEffect(() => {
    if (open) {
      loadPredefinedTemplates();
    }
  }, [open]);

  const resetForm = () => {
    setTemplateName('');
    setDescription('');
    setRecordType('custom');
    setFields([{ field: '', label: '', type: 'string' }]);
    setActiveStep(0);
    setError(null);
    setUploadedFile(null);
  };

  const loadPredefinedTemplates = async () => {
    try {
      const predefined = await templateService.getPredefinedTemplates();
      setPredefinedTemplates(predefined);
    } catch (err) {
      console.error('Failed to load predefined templates:', err);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleFieldChange = (index: number, key: keyof Field, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const addField = () => {
    setFields([...fields, { field: '', label: '', type: 'string' }]);
  };

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await templateService.uploadFile(file);
      setFields(result.fields);
      if (result.suggestedTemplateName && !templateName) {
        setTemplateName(result.suggestedTemplateName);
      }
      setUploadedFile(file);
    } catch (err: any) {
      setError(err.message || 'Failed to process uploaded file');
    } finally {
      setLoading(false);
    }
  };

  const loadPredefinedTemplate = (templateKey: string) => {
    const template = predefinedTemplates[templateKey];
    if (template) {
      setTemplateName(template.name);
      setDescription(template.description);
      setRecordType(template.recordType);
      setFields(template.fields);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const templateData = {
        templateName,
        fields: fields.filter(f => f.field && f.label),
        options: {
          recordType,
          description,
          gridType: 'aggrid',
          theme: 'liturgicalBlueGold',
          layoutType: 'table',
          languageSupport: { en: true },
          isEditable: true
        }
      };

      if (editTemplate) {
        await templateService.updateTemplate(editTemplate.name, templateData.fields);
      } else {
        await templateService.createTemplate(templateData);
      }

      onTemplateCreated();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return templateName.trim() !== '' && recordType !== '';
      case 1:
        return fields.some(f => f.field && f.label);
      case 2:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Template Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Template Name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., BaptismRecords, CustomAttendance"
                  helperText="Use PascalCase naming (e.g., MyCustomRecords)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Record Type</InputLabel>
                  <Select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                    label="Record Type"
                  >
                    {recordTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this template is used for..."
                />
              </Grid>
            </Grid>

            {/* Predefined Templates */}
            {predefinedTemplates && (
              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  Use Predefined Template
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(predefinedTemplates).map(([key, template]: [string, any]) => (
                    <Grid item xs={12} md={4} key={key}>
                      <Card 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => loadPredefinedTemplate(key)}
                      >
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {template.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {template.description}
                          </Typography>
                          <Typography variant="caption">
                            {template.fields.length} fields
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* File Upload */}
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Import from File
              </Typography>
              <input
                accept=".csv,.json"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  disabled={loading}
                >
                  Upload CSV or JSON
                </Button>
              </label>
              {uploadedFile && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  ✓ Loaded fields from: {uploadedFile.name}
                </Typography>
              )}
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Field Mapping ({fields.length} fields)
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addField}
                size="small"
              >
                Add Field
              </Button>
            </Box>

            <Box maxHeight={400} overflow="auto">
              {fields.map((field, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Field Name"
                        value={field.field}
                        onChange={(e) => handleFieldChange(index, 'field', e.target.value)}
                        placeholder="e.g., first_name"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Display Label"
                        value={field.label}
                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                        placeholder="e.g., First Name"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={field.type}
                          onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                          label="Type"
                        >
                          {fieldTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <IconButton
                        color="error"
                        onClick={() => removeField(index)}
                        disabled={fields.length === 1}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Preview & Confirm
            </Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Template Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Name:</Typography>
                  <Typography variant="body1">{templateName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Type:</Typography>
                  <Chip label={recordType.charAt(0).toUpperCase() + recordType.slice(1)} size="small" />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Description:</Typography>
                  <Typography variant="body1">{description || 'No description'}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Fields ({fields.filter(f => f.field && f.label).length})
              </Typography>
              <Grid container spacing={1}>
                {fields.filter(f => f.field && f.label).map((field, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Box display="flex" alignItems="center" gap={1} p={1} border={1} borderColor="divider" borderRadius={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {field.label}
                      </Typography>
                      <Chip label={field.type} size="small" variant="outlined" />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CodeIcon />
          {editTemplate ? 'Edit Template' : 'Create New Template'}
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepValid() || loading}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!isStepValid() || loading}
          >
            {editTemplate ? 'Update Template' : 'Create Template'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TemplateCreationDialog;
