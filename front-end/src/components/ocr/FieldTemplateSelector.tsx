import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  TextField,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  DragIndicator
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Default field templates
const DEFAULT_TEMPLATES = {
  baptism: [
    'child_name',
    'baptism_date',
    'birth_date',
    'father_name',
    'mother_name',
    'godfather_name',
    'godmother_name',
    'priest_name',
    'church_location',
    'notes'
  ],
  marriage: [
    'groom_name',
    'bride_name',
    'marriage_date',
    'groom_age',
    'bride_age',
    'witness_1',
    'witness_2',
    'priest_name',
    'church_location',
    'notes'
  ],
  funeral: [
    'deceased_name',
    'death_date',
    'burial_date',
    'age',
    'cause_of_death',
    'priest_administered',
    'priest_officiated',
    'burial_location',
    'notes'
  ]
};

interface CustomTemplate {
  id: string;
  name: string;
  fields: string[];
  created: string;
  modified: string;
}

interface FieldTemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (templateKey: string, fields: string[]) => void;
  churchId?: string;
}

interface SortableFieldProps {
  field: string;
  index: number;
  onEdit: (index: number, newValue: string) => void;
  onDelete: (index: number) => void;
}

const SortableField: React.FC<SortableFieldProps> = ({ field, index, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `field-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editValue.trim() && editValue !== field) {
      onEdit(index, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(field);
    setIsEditing(false);
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 1,
        mb: 1,
        bgcolor: 'white',
        '&:hover': {
          borderColor: 'primary.main'
        }
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          mr: 1,
          '&:active': { cursor: 'grabbing' }
        }}
      >
        <DragIndicator sx={{ color: 'grey.400' }} />
      </Box>
      
      {isEditing ? (
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 1 }}>
          <TextField
            size="small"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            sx={{ flex: 1 }}
          />
          <IconButton size="small" onClick={handleSave} color="primary">
            <SaveIcon />
          </IconButton>
          <IconButton size="small" onClick={handleCancel}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ) : (
        <>
          <ListItemText
            primary={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            secondary={field}
          />
          <ListItemSecondaryAction>
            <IconButton
              size="small"
              onClick={() => setIsEditing(true)}
              sx={{ mr: 1 }}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDelete(index)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </>
      )}
    </ListItem>
  );
};

export const FieldTemplateSelector: React.FC<FieldTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateChange,
  churchId
}) => {
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentFields, setCurrentFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Load custom templates from localStorage on component mount
  useEffect(() => {
    const stored = localStorage.getItem(`ocr-templates-${churchId || 'default'}`);
    if (stored) {
      try {
        setCustomTemplates(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load custom templates:', error);
      }
    }
  }, [churchId]);

  // Save custom templates to localStorage
  const saveCustomTemplates = (templates: CustomTemplate[]) => {
    localStorage.setItem(`ocr-templates-${churchId || 'default'}`, JSON.stringify(templates));
    setCustomTemplates(templates);
  };

  const openTemplateEditor = (templateKey: string) => {
    setIsCreatingNew(false);
    setTemplateName(templateKey);
    
    if (DEFAULT_TEMPLATES[templateKey as keyof typeof DEFAULT_TEMPLATES]) {
      setCurrentFields([...DEFAULT_TEMPLATES[templateKey as keyof typeof DEFAULT_TEMPLATES]]);
    } else {
      const customTemplate = customTemplates.find(t => t.id === templateKey);
      if (customTemplate) {
        setCurrentFields([...customTemplate.fields]);
        setTemplateName(customTemplate.name);
      }
    }
    setEditDialogOpen(true);
  };

  const createNewTemplate = () => {
    setIsCreatingNew(true);
    setTemplateName('');
    setCurrentFields(['name', 'date', 'location', 'notes']);
    setEditDialogOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const activeIndex = parseInt(active.id.toString().replace('field-', ''));
      const overIndex = parseInt(over?.id.toString().replace('field-', '') || '0');
      
      const newFields = [...currentFields];
      const [removed] = newFields.splice(activeIndex, 1);
      newFields.splice(overIndex, 0, removed);
      setCurrentFields(newFields);
    }
  };

  const addNewField = () => {
    if (newFieldName.trim() && !currentFields.includes(newFieldName.trim().toLowerCase().replace(/\s+/g, '_'))) {
      const fieldName = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
      setCurrentFields([...currentFields, fieldName]);
      setNewFieldName('');
    }
  };

  const editField = (index: number, newValue: string) => {
    const fieldName = newValue.toLowerCase().replace(/\s+/g, '_');
    if (!currentFields.includes(fieldName) || currentFields[index] === fieldName) {
      const newFields = [...currentFields];
      newFields[index] = fieldName;
      setCurrentFields(newFields);
    }
  };

  const deleteField = (index: number) => {
    setCurrentFields(currentFields.filter((_, i) => i !== index));
  };

  const saveTemplate = () => {
    if (isCreatingNew && templateName.trim()) {
      const newTemplate: CustomTemplate = {
        id: `custom_${Date.now()}`,
        name: templateName.trim(),
        fields: currentFields,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      const updatedTemplates = [...customTemplates, newTemplate];
      saveCustomTemplates(updatedTemplates);
      onTemplateChange(newTemplate.id, currentFields);
    } else if (!isCreatingNew) {
      // Update existing custom template or apply changes to current selection
      if (selectedTemplate.startsWith('custom_')) {
        const templateIndex = customTemplates.findIndex(t => t.id === selectedTemplate);
        if (templateIndex >= 0) {
          const updatedTemplates = [...customTemplates];
          updatedTemplates[templateIndex] = {
            ...updatedTemplates[templateIndex],
            fields: currentFields,
            modified: new Date().toISOString()
          };
          saveCustomTemplates(updatedTemplates);
        }
      }
      onTemplateChange(selectedTemplate, currentFields);
    }
    
    setEditDialogOpen(false);
  };

  const restoreDefaults = () => {
    if (DEFAULT_TEMPLATES[selectedTemplate as keyof typeof DEFAULT_TEMPLATES]) {
      setCurrentFields([...DEFAULT_TEMPLATES[selectedTemplate as keyof typeof DEFAULT_TEMPLATES]]);
    }
  };

  const deleteCustomTemplate = (templateId: string) => {
    const updatedTemplates = customTemplates.filter(t => t.id !== templateId);
    saveCustomTemplates(updatedTemplates);
    
    if (selectedTemplate === templateId) {
      onTemplateChange('baptism', DEFAULT_TEMPLATES.baptism);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Field Template Configuration
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Template Type</InputLabel>
            <Select
              value={selectedTemplate}
              onChange={(e) => {
                const templateKey = e.target.value;
                if (DEFAULT_TEMPLATES[templateKey as keyof typeof DEFAULT_TEMPLATES]) {
                  onTemplateChange(templateKey, DEFAULT_TEMPLATES[templateKey as keyof typeof DEFAULT_TEMPLATES]);
                } else {
                  const customTemplate = customTemplates.find(t => t.id === templateKey);
                  if (customTemplate) {
                    onTemplateChange(templateKey, customTemplate.fields);
                  }
                }
              }}
              label="Template Type"
            >
              <MenuItem value="baptism">Baptism Record</MenuItem>
              <MenuItem value="marriage">Marriage Record</MenuItem>
              <MenuItem value="funeral">Funeral Record</MenuItem>
              <Divider />
              {customTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>{template.name}</span>
                    <Chip label="Custom" size="small" color="secondary" />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => openTemplateEditor(selectedTemplate)}
          >
            Edit Fields
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={createNewTemplate}
            color="secondary"
          >
            New Template
          </Button>
        </Box>

        {/* Current Template Preview */}
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Template Fields:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(DEFAULT_TEMPLATES[selectedTemplate as keyof typeof DEFAULT_TEMPLATES] || 
              customTemplates.find(t => t.id === selectedTemplate)?.fields || []).map((field, index) => (
              <Chip
                key={index}
                label={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>

        {/* Custom Templates Management */}
        {customTemplates.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Manage Custom Templates:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {customTemplates.map((template) => (
                <Chip
                  key={template.id}
                  label={template.name}
                  onDelete={() => deleteCustomTemplate(template.id)}
                  deleteIcon={<DeleteIcon />}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Template Editor Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { 
              maxHeight: '90vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle>
            {isCreatingNew ? 'Create New Template' : `Edit Template: ${templateName}`}
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
            {isCreatingNew && (
              <TextField
                fullWidth
                label="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                sx={{ mb: 3 }}
              />
            )}
            
            <Typography variant="subtitle2" gutterBottom>
              Field Order (drag to reorder):
            </Typography>
            
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={currentFields.map((_, index) => `field-${index}`)}
                strategy={verticalListSortingStrategy}
              >
                <List sx={{ 
                  maxHeight: 300, 
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
                  {currentFields.map((field, index) => (
                    <SortableField
                      key={`field-${index}`}
                      field={field}
                      index={index}
                      onEdit={editField}
                      onDelete={deleteField}
                    />
                  ))}
                </List>
              </SortableContext>
            </DndContext>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                size="small"
                label="Add new field"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNewField()}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                onClick={addNewField}
                disabled={!newFieldName.trim()}
              >
                Add
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            {!isCreatingNew && DEFAULT_TEMPLATES[selectedTemplate as keyof typeof DEFAULT_TEMPLATES] && (
              <Button
                startIcon={<RestoreIcon />}
                onClick={restoreDefaults}
                color="secondary"
              >
                Restore Defaults
              </Button>
            )}
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={saveTemplate}
              disabled={isCreatingNew && !templateName.trim()}
            >
              {isCreatingNew ? 'Create Template' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};
