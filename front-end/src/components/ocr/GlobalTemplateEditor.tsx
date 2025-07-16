/**
 * Global Template Editor Component
 * Allows superadmin to edit the permanent field configurations for baptism, marriage, and funeral templates
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Paper,
  Tooltip,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';

interface TemplateField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'text' | 'boolean' | 'select';
  required?: boolean;
  options?: string[];
  validation?: string;
  placeholder?: string;
  helpText?: string;
}

interface GlobalTemplate {
  name: string;
  recordType: 'baptism' | 'marriage' | 'funeral';
  description: string;
  fields: TemplateField[];
}

interface GlobalTemplateEditorProps {
  churchId: string;
  userEmail: string;
}

export const GlobalTemplateEditor: React.FC<GlobalTemplateEditorProps> = ({ 
  churchId, 
  userEmail 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [templates, setTemplates] = useState<{ [key: string]: GlobalTemplate }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<GlobalTemplate | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  
  const templateTypes = ['baptism', 'marriage', 'funeral'] as const;
  const fieldTypes = ['string', 'number', 'date', 'email', 'phone', 'text', 'boolean', 'select'] as const;

  // Load current global templates
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/templates/global/predefined');
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.status}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates || {});
    } catch (err) {
      console.error('Failed to load global templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Save global template changes
  const saveTemplate = async (recordType: string) => {
    if (!templates[recordType]) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/templates/global/predefined/${recordType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: templates[recordType],
          userEmail
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save template: ${response.status}`);
      }
      
      const result = await response.json();
      setSuccess(`✅ ${recordType.charAt(0).toUpperCase() + recordType.slice(1)} template saved successfully!`);
      
      // Remove from unsaved changes
      setUnsavedChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordType);
        return newSet;
      });
      
      // Reload to get updated data
      await loadTemplates();
      
    } catch (err) {
      console.error(`Failed to save ${recordType} template:`, err);
      setError(err instanceof Error ? err.message : `Failed to save ${recordType} template`);
    } finally {
      setSaving(false);
    }
  };

  // Add new field to template
  const addField = (recordType: string) => {
    const newField: TemplateField = {
      field: '',
      label: '',
      type: 'string'
    };
    
    setTemplates(prev => ({
      ...prev,
      [recordType]: {
        ...prev[recordType],
        fields: [...(prev[recordType]?.fields || []), newField]
      }
    }));
    
    setUnsavedChanges(prev => new Set(prev).add(recordType));
  };

  // Remove field from template
  const removeField = (recordType: string, fieldIndex: number) => {
    setTemplates(prev => ({
      ...prev,
      [recordType]: {
        ...prev[recordType],
        fields: prev[recordType]?.fields?.filter((_, index) => index !== fieldIndex) || []
      }
    }));
    
    setUnsavedChanges(prev => new Set(prev).add(recordType));
  };

  // Update field in template
  const updateField = (recordType: string, fieldIndex: number, updates: Partial<TemplateField>) => {
    setTemplates(prev => ({
      ...prev,
      [recordType]: {
        ...prev[recordType],
        fields: prev[recordType]?.fields?.map((field, index) => 
          index === fieldIndex ? { ...field, ...updates } : field
        ) || []
      }
    }));
    
    setUnsavedChanges(prev => new Set(prev).add(recordType));
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Preview template
  const handlePreview = (recordType: string) => {
    setPreviewTemplate(templates[recordType] || null);
    setPreviewOpen(true);
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Check if user is superadmin
  const isSuperAdmin = userEmail === 'superadmin@orthodoxmetrics.com';

  if (!isSuperAdmin) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Access denied. Only superadmin can edit global templates.
      </Alert>
    );
  }

  const renderFieldEditor = (recordType: string, field: TemplateField, index: number) => (
    <Card key={index} sx={{ mb: 2, p: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Field Name"
            value={field.field}
            onChange={(e) => updateField(recordType, index, { field: e.target.value })}
            size="small"
            sx={{ minWidth: 150, flex: 1 }}
            placeholder="field_name"
          />
          
          <TextField
            label="Display Label"
            value={field.label}
            onChange={(e) => updateField(recordType, index, { label: e.target.value })}
            size="small"
            sx={{ minWidth: 150, flex: 1 }}
            placeholder="Display Name"
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Field Type</InputLabel>
            <Select
              value={field.type}
              onChange={(e) => updateField(recordType, index, { type: e.target.value as TemplateField['type'] })}
              label="Field Type"
            >
              {fieldTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Placeholder"
            value={field.placeholder || ''}
            onChange={(e) => updateField(recordType, index, { placeholder: e.target.value })}
            size="small"
            sx={{ minWidth: 150, flex: 1 }}
            placeholder="Enter placeholder..."
          />
          
          <Tooltip title="Delete field">
            <IconButton 
              color="error" 
              size="small"
              onClick={() => removeField(recordType, index)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <TextField
          label="Help Text"
          value={field.helpText || ''}
          onChange={(e) => updateField(recordType, index, { helpText: e.target.value })}
          size="small"
          fullWidth
          placeholder="Help text for users..."
        />

        {field.type === 'select' && (
          <TextField
            label="Select Options (comma-separated)"
            value={field.options?.join(', ') || ''}
            onChange={(e) => updateField(recordType, index, { 
              options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0)
            })}
            size="small"
            fullWidth
            placeholder="Option 1, Option 2, Option 3"
            helperText="Separate options with commas"
          />
        )}
      </Box>
    </Card>
  );

  const renderTemplateEditor = (recordType: string) => {
    const template = templates[recordType];
    const hasUnsavedChanges = unsavedChanges.has(recordType);
    
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {recordType.charAt(0).toUpperCase() + recordType.slice(1)} Record Template
              {hasUnsavedChanges && (
                <Chip 
                  label="Unsaved changes" 
                  color="warning" 
                  size="small" 
                  sx={{ ml: 2 }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure the global field template for {recordType} records across all churches
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={() => handlePreview(recordType)}
              disabled={!template}
            >
              Preview
            </Button>
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => saveTemplate(recordType)}
              disabled={saving || !hasUnsavedChanges}
              color={hasUnsavedChanges ? "primary" : "inherit"}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>

        {!template ? (
          <Alert severity="info">
            No template found for {recordType}. Click "Add Field" to create one.
          </Alert>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Template Description"
                value={template.description || ''}
                onChange={(e) => {
                  setTemplates(prev => ({
                    ...prev,
                    [recordType]: {
                      ...prev[recordType],
                      description: e.target.value
                    }
                  }));
                  setUnsavedChanges(prev => new Set(prev).add(recordType));
                }}
                fullWidth
                multiline
                rows={2}
                placeholder="Describe this template..."
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Template Fields ({template.fields?.length || 0})
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addField(recordType)}
                  size="small"
                >
                  Add Field
                </Button>
              </Box>

              {template.fields?.map((field, index) => 
                renderFieldEditor(recordType, field, index)
              )}

              {(!template.fields || template.fields.length === 0) && (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" color="text.secondary">
                    No fields defined. Click "Add Field" to create the first field.
                  </Typography>
                </Paper>
              )}
            </Box>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Global Template Editor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Edit permanent field configurations for baptism, marriage, and funeral record templates
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadTemplates}
              disabled={loading}
            >
              Reload Templates
            </Button>
          </Box>
        </Box>

        {unsavedChanges.size > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon fontSize="small" />
              You have unsaved changes in: {Array.from(unsavedChanges).join(', ')}
            </Box>
          </Alert>
        )}
      </Box>

      {/* Loading */}
      {loading && <LinearProgress />}

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {templateTypes.map((type, index) => (
            <Tab 
              key={type}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)} Records
                  {unsavedChanges.has(type) && (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {templateTypes.map((type, index) => (
            <Box
              key={type}
              hidden={activeTab !== index}
              sx={{ height: '100%' }}
            >
              {activeTab === index && renderTemplateEditor(type)}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle>
          Template Preview: {previewTemplate?.name}
        </DialogTitle>
        <DialogContent sx={{
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}>
          {previewTemplate && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {previewTemplate.description}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Fields ({previewTemplate.fields?.length || 0}):
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {previewTemplate.fields?.map((field, index) => (
                    <Card key={index} variant="outlined" sx={{ p: 2, minWidth: 250, flex: '1 1 300px' }}>
                      <Typography variant="body2" fontWeight="medium">
                        {field.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {field.field} ({field.type})
                      </Typography>
                      {field.placeholder && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          Placeholder: {field.placeholder}
                        </Typography>
                      )}
                      {field.helpText && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          Help: {field.helpText}
                        </Typography>
                      )}
                    </Card>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Box>
  );
};
