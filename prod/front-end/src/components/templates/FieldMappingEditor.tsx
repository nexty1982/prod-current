import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

interface Field {
  field: string;
  label: string;
  type: string;
  required?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  width?: number;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: string;
  };
  display?: {
    format?: string;
    prefix?: string;
    suffix?: string;
    precision?: number;
  };
}

interface FieldMappingEditorProps {
  open: boolean;
  onClose: () => void;
  fields: Field[];
  onSave: (fields: Field[]) => void;
  title?: string;
  mode?: 'edit' | 'create';
}

const FIELD_TYPES = [
  'string', 'number', 'date', 'datetime', 'boolean', 
  'email', 'phone', 'url', 'text', 'select', 'currency'
];

const FieldMappingEditor: React.FC<FieldMappingEditorProps> = ({
  open,
  onClose,
  fields: initialFields,
  onSave,
  title = 'Field Mapping Editor',
  mode = 'edit'
}) => {
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [editingField, setEditingField] = useState<number | null>(null);
  const [expandedField, setExpandedField] = useState<string | false>(false);

  useEffect(() => {
    setFields(initialFields);
  }, [initialFields]);

  const handleFieldChange = (index: number, property: keyof Field, value: any) => {
    const updatedFields = [...fields];
    updatedFields[index] = {
      ...updatedFields[index],
      [property]: value
    };
    setFields(updatedFields);
  };

  const handleValidationChange = (index: number, property: string, value: any) => {
    const updatedFields = [...fields];
    updatedFields[index] = {
      ...updatedFields[index],
      validation: {
        ...updatedFields[index].validation,
        [property]: value
      }
    };
    setFields(updatedFields);
  };

  const handleDisplayChange = (index: number, property: string, value: any) => {
    const updatedFields = [...fields];
    updatedFields[index] = {
      ...updatedFields[index],
      display: {
        ...updatedFields[index].display,
        [property]: value
      }
    };
    setFields(updatedFields);
  };

  const addNewField = () => {
    const newField: Field = {
      field: `field_${fields.length + 1}`,
      label: `New Field ${fields.length + 1}`,
      type: 'string',
      required: false,
      sortable: true,
      filterable: true,
      hidden: false,
      width: 150
    };
    setFields([...fields, newField]);
    setEditingField(fields.length);
    setExpandedField(`field-${fields.length}`);
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    if (editingField === index) {
      setEditingField(null);
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const updatedFields = [...fields];
    [updatedFields[index], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[index]];
    setFields(updatedFields);
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedField(isExpanded ? panel : false);
  };

  const handleSave = () => {
    onSave(fields);
  };

  const handleCancel = () => {
    setFields(initialFields);
    setEditingField(null);
    setExpandedField(false);
    onClose();
  };

  const renderBasicProperties = (field: Field, index: number) => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Field Name"
          value={field.field}
          onChange={(e) => handleFieldChange(index, 'field', e.target.value)}
          placeholder="field_name"
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Display Label"
          value={field.label}
          onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
          placeholder="Display Label"
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth size="small">
          <InputLabel>Field Type</InputLabel>
          <Select
            value={field.type}
            label="Field Type"
            onChange={(e: SelectChangeEvent) => handleFieldChange(index, 'type', e.target.value)}
          >
            {FIELD_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Width (px)"
          type="number"
          value={field.width || ''}
          onChange={(e) => handleFieldChange(index, 'width', parseInt(e.target.value) || undefined)}
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Default Value"
          value={field.defaultValue || ''}
          onChange={(e) => handleFieldChange(index, 'defaultValue', e.target.value)}
          variant="outlined"
          size="small"
        />
      </Grid>
    </Grid>
  );

  const renderFieldOptions = (field: Field, index: number) => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <FormControlLabel
          control={
            <Switch
              checked={field.required || false}
              onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
            />
          }
          label="Required"
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <FormControlLabel
          control={
            <Switch
              checked={field.sortable !== false}
              onChange={(e) => handleFieldChange(index, 'sortable', e.target.checked)}
            />
          }
          label="Sortable"
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <FormControlLabel
          control={
            <Switch
              checked={field.filterable !== false}
              onChange={(e) => handleFieldChange(index, 'filterable', e.target.checked)}
            />
          }
          label="Filterable"
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <FormControlLabel
          control={
            <Switch
              checked={field.hidden || false}
              onChange={(e) => handleFieldChange(index, 'hidden', e.target.checked)}
            />
          }
          label="Hidden"
        />
      </Grid>
    </Grid>
  );

  const renderValidationRules = (field: Field, index: number) => (
    <Grid container spacing={2}>
      {(field.type === 'string' || field.type === 'text') && (
        <>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Min Length"
              type="number"
              value={field.validation?.minLength || ''}
              onChange={(e) => handleValidationChange(index, 'minLength', parseInt(e.target.value) || undefined)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Max Length"
              type="number"
              value={field.validation?.maxLength || ''}
              onChange={(e) => handleValidationChange(index, 'maxLength', parseInt(e.target.value) || undefined)}
              variant="outlined"
              size="small"
            />
          </Grid>
        </>
      )}
      
      {field.type === 'number' && (
        <>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Minimum Value"
              type="number"
              value={field.validation?.min || ''}
              onChange={(e) => handleValidationChange(index, 'min', parseFloat(e.target.value) || undefined)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Maximum Value"
              type="number"
              value={field.validation?.max || ''}
              onChange={(e) => handleValidationChange(index, 'max', parseFloat(e.target.value) || undefined)}
              variant="outlined"
              size="small"
            />
          </Grid>
        </>
      )}
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Pattern (Regex)"
          value={field.validation?.pattern || ''}
          onChange={(e) => handleValidationChange(index, 'pattern', e.target.value)}
          placeholder="^[A-Za-z0-9]+$"
          variant="outlined"
          size="small"
          helperText="Regular expression pattern for validation"
        />
      </Grid>
    </Grid>
  );

  const renderDisplaySettings = (field: Field, index: number) => (
    <Grid container spacing={2}>
      {(field.type === 'number' || field.type === 'currency') && (
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Decimal Places"
            type="number"
            value={field.display?.precision || ''}
            onChange={(e) => handleDisplayChange(index, 'precision', parseInt(e.target.value) || undefined)}
            variant="outlined"
            size="small"
          />
        </Grid>
      )}
      
      <Grid item xs={4}>
        <TextField
          fullWidth
          label="Prefix"
          value={field.display?.prefix || ''}
          onChange={(e) => handleDisplayChange(index, 'prefix', e.target.value)}
          placeholder="$, #, etc."
          variant="outlined"
          size="small"
        />
      </Grid>
      
      <Grid item xs={4}>
        <TextField
          fullWidth
          label="Suffix"
          value={field.display?.suffix || ''}
          onChange={(e) => handleDisplayChange(index, 'suffix', e.target.value)}
          placeholder="%, units, etc."
          variant="outlined"
          size="small"
        />
      </Grid>
      
      {(field.type === 'date' || field.type === 'datetime') && (
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Date Format"
            value={field.display?.format || ''}
            onChange={(e) => handleDisplayChange(index, 'format', e.target.value)}
            placeholder="MM/DD/YYYY, DD-MM-YYYY, etc."
            variant="outlined"
            size="small"
            helperText="Date display format"
          />
        </Grid>
      )}
    </Grid>
  );

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon />
            {title}
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={addNewField}
          >
            Add Field
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {fields.length === 0 ? (
          <Alert severity="info">
            No fields defined. Click "Add Field" to create your first field.
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Configure your template fields. Click on a field to expand its configuration options.
            </Alert>

            {/* Field Summary Table */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Field Summary ({fields.length} fields)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Field</TableCell>
                        <TableCell>Label</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Width</TableCell>
                        <TableCell>Options</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {field.field}
                            </Typography>
                          </TableCell>
                          <TableCell>{field.label}</TableCell>
                          <TableCell>
                            <Chip label={field.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{field.width || 'Auto'}</TableCell>
                          <TableCell>
                            <Box display="flex" gap={0.5}>
                              {field.required && <Chip label="Req" size="small" color="error" />}
                              {field.hidden && <Chip label="Hidden" size="small" color="default" />}
                              {!field.sortable && <Chip label="No Sort" size="small" color="warning" />}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={0.5}>
                              <IconButton
                                size="small"
                                onClick={() => moveField(index, 'up')}
                                disabled={index === 0}
                              >
                                <DragIndicatorIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => removeField(index)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Detailed Field Configuration */}
            <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
              {fields.map((field, index) => (
                <Accordion
                  key={index}
                  expanded={expandedField === `field-${index}`}
                  onChange={handleAccordionChange(`field-${index}`)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <DragIndicatorIcon color="action" />
                      <Box flex={1}>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {field.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {field.field} • {field.type}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        {field.hidden && <VisibilityOffIcon color="action" fontSize="small" />}
                        {!field.hidden && <VisibilityIcon color="action" fontSize="small" />}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(index);
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    <Box sx={{ p: 2 }}>
                      {/* Basic Properties */}
                      <Typography variant="subtitle2" gutterBottom>
                        Basic Properties
                      </Typography>
                      {renderBasicProperties(field, index)}
                      
                      <Divider sx={{ my: 2 }} />
                      
                      {/* Field Options */}
                      <Typography variant="subtitle2" gutterBottom>
                        Field Options
                      </Typography>
                      {renderFieldOptions(field, index)}
                      
                      <Divider sx={{ my: 2 }} />
                      
                      {/* Validation Rules */}
                      <Typography variant="subtitle2" gutterBottom>
                        Validation Rules
                      </Typography>
                      {renderValidationRules(field, index)}
                      
                      <Divider sx={{ my: 2 }} />
                      
                      {/* Display Settings */}
                      <Typography variant="subtitle2" gutterBottom>
                        Display Settings
                      </Typography>
                      {renderDisplaySettings(field, index)}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleCancel} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          startIcon={<SaveIcon />}
          disabled={fields.length === 0}
        >
          Save Fields
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldMappingEditor;
