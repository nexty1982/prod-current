import React, { useState, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, CellEditingStoppedEvent, GridReadyEvent, ICellEditorParams, RowClassParams } from 'ag-grid-community';
import { 
  Button, 
  TextField, 
  Modal, 
  Box, 
  Stack, 
  Chip, 
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Typography,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { IconDownload, IconDeviceFloppy, IconPlus, IconTrash, IconSettings } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Enhanced data interface for Orthodox records
interface OCRRecord {
  id?: string | number;
  confidence_score: number;
  imageUrl?: string;
  // Dynamic fields based on record type
  [key: string]: any;
}

// Field type definitions for Orthodox records
interface FieldDefinition {
  field: string;
  headerName: string;
  type: 'text' | 'dropdown' | 'date' | 'number';
  editable: boolean;
  required?: boolean;
  options?: string[];
  description?: string;
  category: 'baptism' | 'marriage' | 'funeral' | 'common';
}

// Predefined Orthodox record field templates
const ORTHODOX_FIELD_TEMPLATES: FieldDefinition[] = [
  // Common fields
  { field: 'first_name', headerName: 'First Name', type: 'text', editable: true, required: true, category: 'common' },
  { field: 'last_name', headerName: 'Last Name', type: 'text', editable: true, required: true, category: 'common' },
  { field: 'clergy', headerName: 'Clergy', type: 'text', editable: true, category: 'common', description: 'Priest or bishop performing the sacrament' },
  { field: 'parish_church', headerName: 'Parish/Church', type: 'text', editable: true, category: 'common' },
  { field: 'language', headerName: 'Language', type: 'dropdown', editable: true, category: 'common', options: ['English', 'Greek', 'Russian', 'Serbian', 'Bulgarian', 'Romanian', 'Arabic', 'Church Slavonic'] },
  
  // Baptism specific fields
  { field: 'date_of_birth', headerName: 'Date of Birth', type: 'date', editable: true, category: 'baptism' },
  { field: 'date_of_baptism', headerName: 'Date of Baptism', type: 'date', editable: true, required: true, category: 'baptism' },
  { field: 'gender', headerName: 'Gender', type: 'dropdown', editable: true, category: 'baptism', options: ['Male', 'Female'] },
  { field: 'place_of_birth', headerName: 'Place of Birth', type: 'text', editable: true, category: 'baptism' },
  { field: 'sponsors_godparents', headerName: 'Sponsors/Godparents', type: 'text', editable: true, category: 'baptism' },
  { field: 'parents_names', headerName: 'Parents Names', type: 'text', editable: true, category: 'baptism' },
  { field: 'entry_type', headerName: 'Entry Type', type: 'dropdown', editable: true, category: 'baptism', options: ['Infant Baptism', 'Adult Convert', 'Conditional Baptism', 'Emergency Baptism'] },
  
  // Marriage specific fields
  { field: 'groom_full_name', headerName: 'Groom Full Name', type: 'text', editable: true, required: true, category: 'marriage' },
  { field: 'bride_full_name', headerName: 'Bride Full Name', type: 'text', editable: true, required: true, category: 'marriage' },
  { field: 'date_of_marriage', headerName: 'Date of Marriage', type: 'date', editable: true, required: true, category: 'marriage' },
  { field: 'place_of_marriage', headerName: 'Place of Marriage', type: 'text', editable: true, category: 'marriage' },
  { field: 'groom_parents', headerName: 'Groom Parents', type: 'text', editable: true, category: 'marriage' },
  { field: 'bride_parents', headerName: 'Bride Parents', type: 'text', editable: true, category: 'marriage' },
  { field: 'witnesses', headerName: 'Witnesses', type: 'text', editable: true, category: 'marriage', description: 'Best man/koumbaros/koumbara etc.' },
  { field: 'baptism_status', headerName: 'Baptism Status', type: 'dropdown', editable: true, category: 'marriage', options: ['Both Orthodox', 'Mixed Marriage', 'Groom Orthodox', 'Bride Orthodox'] },
  { field: 'dispensation_noted', headerName: 'Dispensation Noted', type: 'dropdown', editable: true, category: 'marriage', options: ['Yes', 'No', 'Pending'] },
  { field: 'previous_marriages', headerName: 'Previous Marriages', type: 'text', editable: true, category: 'marriage' },
  
  // Funeral specific fields
  { field: 'deceased_full_name', headerName: 'Deceased Full Name', type: 'text', editable: true, required: true, category: 'funeral' },
  { field: 'date_of_death', headerName: 'Date of Death', type: 'date', editable: true, required: true, category: 'funeral' },
  { field: 'date_of_funeral', headerName: 'Date of Funeral', type: 'date', editable: true, category: 'funeral' },
  { field: 'place_of_death', headerName: 'Place of Death', type: 'text', editable: true, category: 'funeral' },
  { field: 'place_of_burial', headerName: 'Place of Burial', type: 'text', editable: true, category: 'funeral' },
  { field: 'age_at_death', headerName: 'Age at Death', type: 'number', editable: true, category: 'funeral' },
  { field: 'family_next_of_kin', headerName: 'Family/Next of Kin', type: 'text', editable: true, category: 'funeral' },
  { field: 'cause_of_death', headerName: 'Cause of Death', type: 'text', editable: true, category: 'funeral' },
  { field: 'sacraments_received', headerName: 'Sacraments Received', type: 'dropdown', editable: true, category: 'funeral', options: ['Last Rites', 'Confession', 'Communion', 'All Sacraments', 'None Recorded'] },
  { field: 'parish_community', headerName: 'Parish/Community', type: 'text', editable: true, category: 'funeral' },
  
  // Universal fields
  { field: 'notes_remarks', headerName: 'Notes/Remarks', type: 'text', editable: true, category: 'common' }
];

interface OCRPreviewTableProps {
  data: OCRRecord[];
  recordType?: 'baptism' | 'marriage' | 'funeral' | 'custom';
  customFields?: FieldDefinition[];
  onSave?: (editedRows: OCRRecord[]) => void;
  onFieldsChange?: (fields: FieldDefinition[]) => void;
  className?: string;
}

// Custom dropdown cell editor component
class DropdownCellEditor {
  eInput: HTMLSelectElement;
  
  constructor() {
    this.eInput = document.createElement('select');
    this.eInput.style.width = '100%';
    this.eInput.style.height = '100%';
    this.eInput.className = 'ag-cell-editor';
  }

  init(params: ICellEditorParams) {
    // Clear existing options
    this.eInput.innerHTML = '';
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.text = '';
    this.eInput.appendChild(emptyOption);
    
    // Add dropdown options
    const fieldDef = params.colDef as any;
    if (fieldDef.cellEditorParams?.options) {
      fieldDef.cellEditorParams.options.forEach((option: string) => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.text = option;
        this.eInput.appendChild(optionElement);
      });
    }
    
    // Set current value
    this.eInput.value = params.value || '';
    
    // Focus and select
    setTimeout(() => {
      this.eInput.focus();
    });
  }

  getGui() {
    return this.eInput;
  }

  getValue() {
    return this.eInput.value;
  }

  isPopup() {
    return false;
  }

  isCancelAfterEnd() {
    return false;
  }
}

// Notification helper (since we don't have Mantine notifications)
const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
  console.log(`${title}: ${message}`);
  // You can replace this with your preferred notification system
};

// Custom cell renderer for confidence score with color coding
const ConfidenceCellRenderer = (params: any) => {
  const confidence = params.value;
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div 
      className={`px-2 py-1 rounded text-center font-medium ${getConfidenceColor(confidence)}`}
      title={`Confidence: ${confidence}%`}
    >
      {confidence}%
    </div>
  );
};

// Custom cell renderer for image thumbnail
const ImageCellRenderer = (params: any) => {
  if (!params.value) return null;
  
  return (
    <div className="flex justify-center items-center h-full">
      <img 
        src={params.value} 
        alt="Record thumbnail"
        className="w-8 h-8 object-cover rounded border border-gray-200"
        title="Click to view full image"
      />
    </div>
  );
};

const OCRPreviewTable: React.FC<OCRPreviewTableProps> = ({ 
  data, 
  recordType = 'custom',
  customFields = [],
  onSave, 
  onFieldsChange,
  className = '' 
}) => {
  const [editedRows, setEditedRows] = useState<Set<string | number>>(new Set());
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [activeFields, setActiveFields] = useState<FieldDefinition[]>([]);
  const gridRef = useRef<AgGridReact>(null);

  // Get field definitions based on record type
  const getFieldsForRecordType = useCallback((type: string): FieldDefinition[] => {
    if (type === 'custom') return customFields;
    
    const commonFields = ORTHODOX_FIELD_TEMPLATES.filter(f => f.category === 'common');
    const specificFields = ORTHODOX_FIELD_TEMPLATES.filter(f => f.category === type);
    
    return [...commonFields, ...specificFields];
  }, [customFields]);

  // Initialize active fields
  React.useEffect(() => {
    const fields = getFieldsForRecordType(recordType);
    setActiveFields(fields);
  }, [recordType, getFieldsForRecordType]);

  // Create a unique ID for each row if not provided
  const dataWithIds = useMemo(() => {
    return data.map((row, index) => ({
      ...row,
      id: row.id || `row_${index}`
    }));
  }, [data]);

  // Column definitions based on active fields
  const columnDefs: ColDef[] = useMemo(() => {
    const baseColumns: ColDef[] = activeFields.map(fieldDef => {
      const colDef: ColDef = {
        headerName: fieldDef.headerName,
        field: fieldDef.field,
        editable: fieldDef.editable,
        filter: fieldDef.type === 'number' ? 'agNumberColumnFilter' : 'agTextColumnFilter',
        sortable: true,
        flex: 1,
        minWidth: 120,
        tooltipField: fieldDef.field,
        headerTooltip: fieldDef.description || fieldDef.headerName
      };

      // Add dropdown editor for dropdown fields
      if (fieldDef.type === 'dropdown' && fieldDef.options) {
        colDef.cellEditor = DropdownCellEditor;
        colDef.cellEditorParams = {
          options: fieldDef.options
        };
      }

      // Special formatting for dates
      if (fieldDef.type === 'date') {
        colDef.filter = 'agDateColumnFilter';
        colDef.valueFormatter = (params) => {
          if (params.value) {
            try {
              return new Date(params.value).toLocaleDateString();
            } catch {
              return params.value;
            }
          }
          return '';
        };
      }

      return colDef;
    });

    // Always add confidence score column
    baseColumns.push({
      headerName: 'Confidence',
      field: 'confidence_score',
      editable: false,
      filter: 'agNumberColumnFilter',
      sortable: true,
      width: 120,
      cellRenderer: ConfidenceCellRenderer,
      tooltipValueGetter: (params) => `Confidence: ${params.value}%`
    });

    // Add image column if any row has imageUrl
    if (data.some(row => row.imageUrl)) {
      baseColumns.unshift({
        headerName: 'Image',
        field: 'imageUrl',
        editable: false,
        sortable: false,
        filter: false,
        width: 80,
        cellRenderer: ImageCellRenderer,
        tooltipValueGetter: () => 'Click to view full image'
      });
    }

    return baseColumns;
  }, [activeFields, data]);

  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  }, []);

  // Handle cell editing
  const onCellEditingStopped = useCallback((event: CellEditingStoppedEvent) => {
    if (event.oldValue !== event.newValue) {
      const rowId = event.data.id;
      setEditedRows(prev => new Set([...prev, rowId]));
    }
  }, []);

  // Get row style for low confidence rows
  const getRowStyle = useCallback((params: RowClassParams) => {
    if (params.data.confidence_score < 75) {
      return { backgroundColor: '#fef2f2' };
    }
    return undefined;
  }, []);

  // Export functions
  const exportToCSV = useCallback(() => {
    if (!gridApi) return;
    
    const allRows: OCRRecord[] = [];
    gridApi.forEachNode(node => allRows.push(node.data));
    
    const worksheet = XLSX.utils.json_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OCR_Data');
    
    XLSX.writeFile(workbook, `ocr_data_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Export Successful', 'Data exported to CSV successfully!');
  }, [gridApi]);

  const exportToXLSX = useCallback(() => {
    if (!gridApi) return;
    
    const allRows: OCRRecord[] = [];
    gridApi.forEachNode(node => allRows.push(node.data));
    
    const worksheet = XLSX.utils.json_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OCR_Data');
    
    XLSX.writeFile(workbook, `ocr_data_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export Successful', 'Data exported to Excel successfully!');
  }, [gridApi]);

  // Save changes
  const handleSave = useCallback(() => {
    if (!gridApi || !onSave) return;

    const changedRows: OCRRecord[] = [];
    gridApi.forEachNode(node => {
      if (editedRows.has(node.data.id)) {
        changedRows.push(node.data);
      }
    });

    onSave(changedRows);
    setEditedRows(new Set());
    
    showNotification('Changes Saved', `Successfully saved ${changedRows.length} edited records!`);
  }, [gridApi, editedRows, onSave]);

  // Handle field configuration
  const handleFieldToggle = (field: FieldDefinition) => {
    const newFields = activeFields.some(f => f.field === field.field)
      ? activeFields.filter(f => f.field !== field.field)
      : [...activeFields, field];
    
    setActiveFields(newFields);
    if (onFieldsChange) {
      onFieldsChange(newFields);
    }
  };

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true,
    editable: false,
    suppressMenu: false
  }), []);

  return (
    <div className={`w-full ${className}`}>
      {/* Header with controls */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<IconDownload />}
                onClick={exportToCSV}
                size="small"
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconDownload />}
                onClick={exportToXLSX}
                size="small"
              >
                Export Excel
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconSettings />}
                onClick={() => setShowFieldConfig(true)}
                size="small"
              >
                Configure Fields
              </Button>
            </Stack>
          </Grid>
          
          <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {editedRows.size > 0 && onSave && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<IconDeviceFloppy />}
                onClick={handleSave}
                size="small"
                sx={{ animation: 'pulse 2s infinite' }}
              >
                Save Changes ({editedRows.size})
              </Button>
            )}
          </Grid>
        </Grid>
        
        {/* Record type indicator */}
        <Box sx={{ mt: 1 }}>
          <Chip 
            label={`${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Record Fields`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {activeFields.length} active fields • {editedRows.size} rows edited
          </Typography>
        </Box>
      </Box>

      {/* AG Grid Table */}
      <Box sx={{ width: '100%', height: '600px' }}>
        <div className="ag-theme-alpine" style={{ width: '100%', height: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={dataWithIds}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            onCellEditingStopped={onCellEditingStopped}
            getRowStyle={getRowStyle}
            editType="fullRow"
            suppressRowClickSelection={true}
            rowSelection="multiple"
            animateRows={true}
            enableRangeSelection={true}
            undoRedoCellEditing={true}
            stopEditingWhenCellsLoseFocus={true}
            tooltipShowDelay={500}
            domLayout="normal"
            suppressSizeToFit={false}
            suppressHorizontalScroll={false}
            alwaysShowHorizontalScroll={false}
            suppressColumnVirtualisation={false}
          />
        </div>
      </Box>

      {/* Summary stats */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Grid container spacing={3} textAlign="center">
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="text.primary">{data.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total Records</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="success.main">
                {data.filter(row => row.confidence_score >= 90).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">High Confidence (≥90%)</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="warning.main">
                {data.filter(row => row.confidence_score >= 75 && row.confidence_score < 90).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Medium Confidence (75-89%)</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="error.main">
                {data.filter(row => row.confidence_score < 75).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Low Confidence (&lt;75%)</Typography>
            </Grid>
          </Grid>
          
          {editedRows.size > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {editedRows.size} row{editedRows.size !== 1 ? 's' : ''} edited
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Changes will be lost unless saved
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Field Configuration Modal */}
      <Modal
        open={showFieldConfig}
        onClose={() => setShowFieldConfig(false)}
        aria-labelledby="field-config-modal"
      >
        <Box sx={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 600 },
          maxHeight: '80vh',
          overflow: 'auto',
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
        }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Configure {recordType.charAt(0).toUpperCase() + recordType.slice(1)} Record Fields
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Select which fields to display in the table. Required fields are marked and cannot be disabled.
          </Typography>
          
          <Grid container spacing={1}>
            {getFieldsForRecordType(recordType).map((field) => {
              const isActive = activeFields.some(f => f.field === field.field);
              const isRequired = field.required;
              
              return (
                <Grid item xs={12} sm={6} key={field.field}>
                  <Box
                    onClick={() => !isRequired && handleFieldToggle(field)}
                    sx={{
                      p: 1,
                      border: 1,
                      borderColor: isActive ? 'primary.main' : 'grey.300',
                      borderRadius: 1,
                      cursor: isRequired ? 'not-allowed' : 'pointer',
                      bgcolor: isActive ? 'primary.50' : 'transparent',
                      opacity: isRequired ? 0.7 : 1,
                      '&:hover': !isRequired ? { bgcolor: 'grey.100' } : {}
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          border: 1,
                          borderColor: isActive ? 'primary.main' : 'grey.400',
                          borderRadius: 0.5,
                          bgcolor: isActive ? 'primary.main' : 'transparent'
                        }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={isActive ? 600 : 400}>
                          {field.headerName}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip label={field.type} size="small" variant="outlined" />
                          {isRequired && <Chip label="required" size="small" color="error" />}
                        </Stack>
                        {field.description && (
                          <Typography variant="caption" color="text.secondary">
                            {field.description}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setShowFieldConfig(false)}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default OCRPreviewTable;
