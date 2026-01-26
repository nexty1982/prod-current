/**
 * Orthodox Metrics - Form Builder
 * Visual form builder for creating and editing dynamic forms
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  DragDropContext,
  Droppable,
  Draggable,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

// Import unified hooks
import {
  useFieldDefinitions,
  useTableSchema,
  getCurrentTemplate,
} from '@/core';

// Import types
import { FieldDefinition, FormSection, RecordData } from '@/core/types/RecordsTypes';

interface FormBuilderProps {
  churchId: number;
  tableName: string;
  open: boolean;
  onClose: () => void;
  onSave?: (sections: FormSection[]) => void;
  initialSections?: FormSection[];
}

export function FormBuilder({
  churchId,
  tableName,
  open,
  onClose,
  onSave,
  initialSections = [],
}: FormBuilderProps) {
  const [sections, setSections] = useState<FormSection[]>(initialSections);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [editingSection, setEditingSection] = useState<FormSection | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Get field definitions
  const {
    fields,
    loading: fieldsLoading,
  } = useFieldDefinitions(churchId, tableName);

  // Get table schema
  const {
    schema,
    loading: schemaLoading,
  } = useTableSchema(churchId, tableName);

  // Available field types
  const fieldTypes = [
    { value: 'text', label: 'Text Input', icon: '📝' },
    { value: 'number', label: 'Number Input', icon: '🔢' },
    { value: 'email', label: 'Email Input', icon: '📧' },
    { value: 'phone', label: 'Phone Input', icon: '📞' },
    { value: 'url', label: 'URL Input', icon: '🔗' },
    { value: 'password', label: 'Password Input', icon: '🔒' },
    { value: 'date', label: 'Date Picker', icon: '📅' },
    { value: 'time', label: 'Time Picker', icon: '⏰' },
    { value: 'datetime', label: 'Date & Time Picker', icon: '📅⏰' },
    { value: 'select', label: 'Select Dropdown', icon: '📋' },
    { value: 'autocomplete', label: 'Autocomplete', icon: '🔍' },
    { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
    { value: 'radio', label: 'Radio Buttons', icon: '🔘' },
    { value: 'textarea', label: 'Text Area', icon: '📄' },
    { value: 'slider', label: 'Slider', icon: '🎚️' },
    { value: 'rating', label: 'Rating', icon: '⭐' },
    { value: 'switch', label: 'Switch', icon: '🔄' },
  ];

  // Event handlers
  const handleAddSection = useCallback(() => {
    const newSection: FormSection = {
      title: `Section ${sections.length + 1}`,
      fields: [],
      order: sections.length,
      description: '',
      collapsible: false,
    };
    setSections(prev => [...prev, newSection]);
    setEditingSection(newSection);
  }, [sections.length]);

  const handleEditSection = useCallback((section: FormSection) => {
    setEditingSection(section);
  }, []);

  const handleDeleteSection = useCallback((sectionIndex: number) => {
    setSections(prev => prev.filter((_, index) => index !== sectionIndex));
  }, []);

  const handleAddField = useCallback((sectionIndex: number, fieldType: string) => {
    const newField: FieldDefinition = {
      column_name: `field_${Date.now()}`,
      display_name: `New ${fieldType} Field`,
      field_type: fieldType,
      display_order: sections[sectionIndex].fields.length,
      is_hidden: false,
      is_required: false,
      is_editable: true,
      is_sortable: true,
      is_filterable: true,
      column_width: 150,
      placeholder: `Enter ${fieldType}...`,
      help_text: '',
      validation_rules: {},
      options: fieldType === 'select' || fieldType === 'radio' || fieldType === 'autocomplete' ? [] : undefined,
      min_value: fieldType === 'number' || fieldType === 'slider' ? 0 : undefined,
      max_value: fieldType === 'number' || fieldType === 'slider' ? 100 : undefined,
      step: fieldType === 'number' || fieldType === 'slider' ? 1 : undefined,
      rows: fieldType === 'textarea' ? 4 : undefined,
      multiline: fieldType === 'textarea',
      max_length: fieldType === 'text' || fieldType === 'textarea' ? 255 : undefined,
    };

    setSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { ...section, fields: [...section.fields, newField] }
        : section
    ));
    setEditingField(newField);
  }, [sections]);

  const handleEditField = useCallback((field: FieldDefinition) => {
    setEditingField(field);
  }, []);

  const handleDeleteField = useCallback((sectionIndex: number, fieldIndex: number) => {
    setSections(prev => prev.map((section, index) => 
      index === sectionIndex 
        ? { ...section, fields: section.fields.filter((_, fIndex) => fIndex !== fieldIndex) }
        : section
    ));
  }, []);

  const handleFieldDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceSectionIndex = parseInt(source.droppableId);
    const destSectionIndex = parseInt(destination.droppableId);
    const sourceFieldIndex = source.index;
    const destFieldIndex = destination.index;

    if (sourceSectionIndex === destSectionIndex && sourceFieldIndex === destFieldIndex) return;

    setSections(prev => {
      const newSections = [...prev];
      const sourceSection = newSections[sourceSectionIndex];
      const field = sourceSection.fields[sourceFieldIndex];

      // Remove field from source
      sourceSection.fields.splice(sourceFieldIndex, 1);

      if (sourceSectionIndex === destSectionIndex) {
        // Same section, just reorder
        sourceSection.fields.splice(destFieldIndex, 0, field);
      } else {
        // Different section, move field
        const destSection = newSections[destSectionIndex];
        destSection.fields.splice(destFieldIndex, 0, field);
      }

      // Update display orders
      newSections.forEach(section => {
        section.fields.forEach((field, index) => {
          field.display_order = index;
        });
      });

      return newSections;
    });
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(sections);
    onClose();
  }, [sections, onSave, onClose]);

  // Render field editor
  const renderFieldEditor = () => {
    if (!editingField) return null;

    return (
      <Dialog open={!!editingField} onClose={() => setEditingField(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Field</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Field Name"
                value={editingField.display_name}
                onChange={(e) => setEditingField(prev => prev ? { ...prev, display_name: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Field Type</InputLabel>
                <Select
                  value={editingField.field_type}
                  onChange={(e) => setEditingField(prev => prev ? { ...prev, field_type: e.target.value } : null)}
                  label="Field Type"
                >
                  {fieldTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Placeholder"
                value={editingField.placeholder || ''}
                onChange={(e) => setEditingField(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Help Text"
                value={editingField.help_text || ''}
                onChange={(e) => setEditingField(prev => prev ? { ...prev, help_text: e.target.value } : null)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingField.is_required || false}
                    onChange={(e) => setEditingField(prev => prev ? { ...prev, is_required: e.target.checked } : null)}
                  />
                }
                label="Required"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingField.is_editable !== false}
                    onChange={(e) => setEditingField(prev => prev ? { ...prev, is_editable: e.target.checked } : null)}
                  />
                }
                label="Editable"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingField.is_sortable !== false}
                    onChange={(e) => setEditingField(prev => prev ? { ...prev, is_sortable: e.target.checked } : null)}
                  />
                }
                label="Sortable"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingField(null)}>Cancel</Button>
          <Button
            onClick={() => {
              // Update field in sections
              setSections(prev => prev.map(section => ({
                ...section,
                fields: section.fields.map(field => 
                  field.column_name === editingField.column_name ? editingField : field
                )
              })));
              setEditingField(null);
            }}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Render section editor
  const renderSectionEditor = () => {
    if (!editingSection) return null;

    return (
      <Dialog open={!!editingSection} onClose={() => setEditingSection(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Section</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Section Title"
                value={editingSection.title}
                onChange={(e) => setEditingSection(prev => prev ? { ...prev, title: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={editingSection.description || ''}
                onChange={(e) => setEditingSection(prev => prev ? { ...prev, description: e.target.value } : null)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingSection.collapsible || false}
                    onChange={(e) => setEditingSection(prev => prev ? { ...prev, collapsible: e.target.checked } : null)}
                  />
                }
                label="Collapsible"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingSection(null)}>Cancel</Button>
          <Button
            onClick={() => {
              // Update section in sections
              setSections(prev => prev.map(section => 
                section.order === editingSection.order ? editingSection : section
              ));
              setEditingSection(null);
            }}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Render field list
  const renderFieldList = (section: FormSection, sectionIndex: number) => (
    <Droppable droppableId={sectionIndex.toString()}>
      {(provided, snapshot) => (
        <List
          ref={provided.innerRef}
          {...provided.droppableProps}
          sx={{
            minHeight: 100,
            bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
            borderRadius: 1,
            border: '2px dashed',
            borderColor: snapshot.isDraggingOver ? 'primary.main' : 'transparent',
          }}
        >
          {section.fields.map((field, fieldIndex) => (
            <Draggable key={field.column_name} draggableId={field.column_name} index={fieldIndex}>
              {(provided, snapshot) => (
                <ListItem
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  sx={{
                    bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                    borderRadius: 1,
                    mb: 1,
                    boxShadow: 1,
                  }}
                >
                  <DragIcon {...provided.dragHandleProps} sx={{ mr: 1 }} />
                  <ListItemText
                    primary={field.display_name}
                    secondary={`${field.field_type} • ${field.is_required ? 'Required' : 'Optional'}`}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Edit Field">
                      <IconButton onClick={() => handleEditField(field)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Field">
                      <IconButton onClick={() => handleDeleteField(sectionIndex, fieldIndex)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </List>
      )}
    </Droppable>
  );

  // Render field type palette
  const renderFieldTypePalette = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Field Types
      </Typography>
      <Grid container spacing={1}>
        {fieldTypes.map(type => (
          <Grid item xs={6} sm={4} md={3} key={type.value}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<span>{type.icon}</span>}
              onClick={() => {
                // Add field to first section or create new section
                if (sections.length === 0) {
                  handleAddSection();
                }
                handleAddField(0, type.value);
              }}
              sx={{ justifyContent: 'flex-start' }}
            >
              {type.label}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  // Loading state
  if (fieldsLoading || schemaLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading form builder...</Typography>
      </Box>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Form Builder - {schema?.displayName || tableName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={currentTemplate.toUpperCase()} color="primary" size="small" />
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2}>
          {/* Field Type Palette */}
          <Grid item xs={12} md={3}>
            {renderFieldTypePalette()}
          </Grid>

          {/* Form Sections */}
          <Grid item xs={12} md={showPreview ? 6 : 9}>
            <DragDropContext onDragEnd={handleFieldDragEnd}>
              {sections.map((section, sectionIndex) => (
                <Accordion key={section.title} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Typography variant="h6">{section.title}</Typography>
                      <Chip label={`${section.fields.length} fields`} size="small" />
                      <Box sx={{ ml: 'auto' }}>
                        <Tooltip title="Edit Section">
                          <IconButton onClick={(e) => { e.stopPropagation(); handleEditSection(section); }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Section">
                          <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteSection(sectionIndex); }}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {renderFieldList(section, sectionIndex)}
                    <Button
                      fullWidth
                      variant="dashed"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddField(sectionIndex, 'text')}
                      sx={{ mt: 1 }}
                    >
                      Add Field
                    </Button>
                  </AccordionDetails>
                </Accordion>
              ))}
            </DragDropContext>

            {sections.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No sections created yet. Add a section to get started.
              </Alert>
            )}

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddSection}
              sx={{ mt: 2 }}
            >
              Add Section
            </Button>
          </Grid>

          {/* Preview */}
          {showPreview && (
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Preview
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {sections.map((section, index) => (
                    <Card key={section.title} sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {section.title}
                        </Typography>
                        {section.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {section.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {section.fields.map(field => (
                            <TextField
                              key={field.column_name}
                              label={field.display_name}
                              placeholder={field.placeholder}
                              disabled
                              size="small"
                              required={field.is_required}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
        >
          Save Form
        </Button>
      </DialogActions>

      {/* Field Editor */}
      {renderFieldEditor()}

      {/* Section Editor */}
      {renderSectionEditor()}
    </Dialog>
  );
}

export default FormBuilder;
