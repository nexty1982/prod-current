import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Visibility as ViewIcon,
  CloudDownload as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { templateService } from '../../services/templateService';

interface Field {
  field: string;
  label: string;
  type: string;
}

interface Template {
  id: number;
  name: string;
  slug: string;
  record_type: string;
  description: string;
  fields: Field[];
  grid_type: string;
  theme: string;
  layout_type: string;
  language_support: object;
  is_editable: boolean;
  is_global: boolean;
  church_id: number | null;
  church_name: string | null;
  scope: string;
  created_at: string;
  updated_at: string;
  exists: boolean;
}

interface Church {
  id: number;
  name: string;
}

interface RecordTemplateManagerProps {
  currentChurch?: Church;
  isGlobalAdmin?: boolean;
}

const RecordTemplateManager: React.FC<RecordTemplateManagerProps> = ({
  currentChurch,
  isGlobalAdmin = false
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [globalTemplates, setGlobalTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  
  // Form states
  const [templateName, setTemplateName] = useState('');
  const [recordType, setRecordType] = useState('custom');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<Field[]>([{ field: '', label: '', type: 'string' }]);
  const [includeGlobal, setIncludeGlobal] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedGlobalTemplate, setSelectedGlobalTemplate] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState('');

  const recordTypes = [
    { value: 'baptism', label: 'Baptism Records' },
    { value: 'marriage', label: 'Marriage Records' },
    { value: 'funeral', label: 'Funeral Records' },
    { value: 'custom', label: 'Custom Records' }
  ];

  const fieldTypes = ['string', 'number', 'date', 'email', 'phone', 'text'];

  // Load templates on component mount and when church changes
  useEffect(() => {
    loadTemplates();
    if (isGlobalAdmin) {
      loadGlobalTemplates();
    }
  }, [currentChurch, includeGlobal]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await templateService.getAllTemplates(
        currentChurch?.id,
        includeGlobal
      );
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalTemplates = async () => {
    try {
      const data = await templateService.getGlobalTemplates();
      setGlobalTemplates(data);
    } catch (err) {
      console.error('Failed to load global templates:', err);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName || fields.some(f => !f.field || !f.label)) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await templateService.createTemplate({
        templateName,
        fields: fields.filter(f => f.field && f.label),
        churchId: currentChurch?.id,
        options: {
          recordType,
          description,
          isGlobal: isGlobalAdmin && !currentChurch?.id
        }
      });

      setCreateDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate || !templateName) return;

    try {
      await templateService.updateTemplate(
        selectedTemplate.name,
        {
          fields: fields.filter(f => f.field && f.label),
          description
        },
        currentChurch?.id
      );

      setEditDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return;
    }

    try {
      await templateService.deleteTemplate(template.name, currentChurch?.id);
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleDuplicateGlobalTemplate = async () => {
    if (!selectedGlobalTemplate || !newTemplateName) {
      setError('Please select a template and provide a new name');
      return;
    }

    if (!currentChurch?.id) {
      setError('Church context required for duplication');
      return;
    }

    try {
      await templateService.duplicateGlobalTemplate(
        selectedGlobalTemplate,
        currentChurch.id,
        newTemplateName,
        { description }
      );

      setDuplicateDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template');
    }
  };

  const openEditDialog = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setRecordType(template.record_type);
    setDescription(template.description);
    setFields(template.fields);
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setTemplateName('');
    setRecordType('custom');
    setDescription('');
    setFields([{ field: '', label: '', type: 'string' }]);
    setSelectedTemplate(null);
    setSelectedGlobalTemplate('');
    setNewTemplateName('');
  };

  const addField = () => {
    setFields([...fields, { field: '', label: '', type: 'string' }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof Field, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const getTemplatesByScope = () => {
    const churchTemplates = templates.filter(t => !t.is_global);
    const globalTemplates = templates.filter(t => t.is_global);
    return { churchTemplates, globalTemplates };
  };

  const { churchTemplates, globalTemplates: globalTemplatesInList } = getTemplatesByScope();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Record Template Manager
          {currentChurch && (
            <Typography variant="subtitle1" color="text.secondary">
              {currentChurch.name}
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={includeGlobal}
                onChange={(e) => setIncludeGlobal(e.target.checked)}
              />
            }
            label="Include Global Templates"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadTemplates}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Template
          </Button>
          {currentChurch && globalTemplatesInList.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={() => setDuplicateDialogOpen(true)}
            >
              Duplicate Global
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label={`Church Templates (${churchTemplates.length})`} />
        <Tab label={`Global Templates (${globalTemplatesInList.length})`} disabled={!includeGlobal} />
      </Tabs>

      {/* Templates Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Fields</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(currentTab === 0 ? churchTemplates : globalTemplatesInList).map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <Typography variant="subtitle2">{template.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {template.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={template.record_type}
                    size="small"
                    color={template.record_type === 'custom' ? 'default' : 'primary'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{template.description}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{template.fields.length} fields</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={template.scope}
                    size="small"
                    color={template.is_global ? 'secondary' : 'primary'}
                    variant={template.is_global ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={template.exists ? 'File Exists' : 'File Missing'}
                    size="small"
                    color={template.exists ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {template.is_editable && !template.is_global && (
                      <>
                        <Tooltip title="Edit Template">
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(template)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Template">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTemplate(template)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="View Fields">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., BaptismRecords"
                helperText="Must be in PascalCase format"
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
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Fields</Typography>
              {fields.map((field, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Field Name"
                      value={field.field}
                      onChange={(e) => updateField(index, 'field', e.target.value)}
                      placeholder="e.g., first_name"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Label"
                      value={field.label}
                      onChange={(e) => updateField(index, 'label', e.target.value)}
                      placeholder="e.g., First Name"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={field.type}
                        onChange={(e) => updateField(index, 'type', e.target.value)}
                        label="Type"
                      >
                        {fieldTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton
                      color="error"
                      onClick={() => removeField(index)}
                      disabled={fields.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button onClick={addField} startIcon={<AddIcon />}>
                Add Field
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained">
            Create Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Template: {selectedTemplate?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Fields</Typography>
              {fields.map((field, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Field Name"
                      value={field.field}
                      onChange={(e) => updateField(index, 'field', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Label"
                      value={field.label}
                      onChange={(e) => updateField(index, 'label', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={field.type}
                        onChange={(e) => updateField(index, 'type', e.target.value)}
                        label="Type"
                      >
                        {fieldTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton
                      color="error"
                      onClick={() => removeField(index)}
                      disabled={fields.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button onClick={addField} startIcon={<AddIcon />}>
                Add Field
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateTemplate} variant="contained">
            Update Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Global Template Dialog */}
      <Dialog open={duplicateDialogOpen} onClose={() => setDuplicateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Duplicate Global Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Global Template</InputLabel>
                <Select
                  value={selectedGlobalTemplate}
                  onChange={(e) => setSelectedGlobalTemplate(e.target.value)}
                  label="Global Template"
                >
                  {globalTemplates.map((template) => (
                    <MenuItem key={template.name} value={template.name}>
                      {template.name} ({template.record_type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Template Name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., CustomBaptismRecords"
                helperText="Must be in PascalCase format"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                placeholder="Optional description for the duplicated template"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDuplicateGlobalTemplate} variant="contained">
            Duplicate Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecordTemplateManager;
