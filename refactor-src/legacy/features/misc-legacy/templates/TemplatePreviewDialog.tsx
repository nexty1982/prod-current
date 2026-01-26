import React, { useState } from 'react';
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
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Code as CodeIcon,
  TableChart as TableChartIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

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
  created_by: number | null;
  created_at: string;
  updated_at: string;
  filePath: string;
  exists: boolean;
}

interface TemplatePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  template: Template;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preview-tabpanel-${index}`}
      aria-labelledby={`preview-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TemplatePreviewDialog: React.FC<TemplatePreviewDialogProps> = ({
  open,
  onClose,
  template
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Generate sample data for preview
  const generateSampleData = () => {
    const sampleCount = 3;
    const sampleData = [];

    for (let i = 1; i <= sampleCount; i++) {
      const row: any = { id: i };
      
      template.fields.forEach(field => {
        switch (field.type) {
          case 'string':
            row[field.field] = `Sample ${field.label} ${i}`;
            break;
          case 'number':
            row[field.field] = Math.floor(Math.random() * 100) + 1;
            break;
          case 'date':
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 365));
            row[field.field] = date.toISOString().split('T')[0];
            break;
          case 'email':
            row[field.field] = `sample${i}@example.com`;
            break;
          case 'phone':
            row[field.field] = `(555) 123-${1000 + i}`;
            break;
          case 'boolean':
            row[field.field] = Math.random() > 0.5;
            break;
          default:
            row[field.field] = `Sample ${field.label} ${i}`;
        }
      });
      
      sampleData.push(row);
    }

    return sampleData;
  };

  // Generate AG Grid column definitions
  const generateColumnDefs = (): GridColDef[] => {
    return template.fields.map(field => ({
      field: field.field,
      headerName: field.label,
      width: 150,
      sortable: true,
      filter: true,
      ...(field.type === 'date' && {
        type: 'date',
        valueFormatter: (params) => {
          if (params.value) {
            return new Date(params.value).toLocaleDateString();
          }
          return '';
        }
      }),
      ...(field.type === 'number' && {
        type: 'number',
        align: 'right'
      }),
      ...(field.type === 'boolean' && {
        type: 'boolean',
        renderCell: (params) => (
          <Chip
            label={params.value ? 'Yes' : 'No'}
            color={params.value ? 'success' : 'default'}
            size="small"
          />
        )
      })
    }));
  };

  const sampleData = generateSampleData();
  const columnDefs = generateColumnDefs();

  // Generate React component code
  const generateComponentCode = () => {
    const columns = template.fields.map(f => 
      `    { headerName: '${f.label}', field: '${f.field}', sortable: true, filter: true }`
    ).join(',\n');

    return `import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const ${template.name} = () => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = [
${columns}
  ];

  const defaultColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    flex: 1,
    minWidth: 100
  };

  const gridOptions = {
    defaultColDef,
    enableRangeSelection: true,
    enableClipboard: true,
    suppressRowClickSelection: true,
    rowSelection: 'multiple',
    animateRows: true,
    pagination: true,
    paginationPageSize: 50
  };

  // TODO: Implement data loading from API
  useEffect(() => {
    // loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Implementation for loading data from your API
      // const response = await fetch('/api/${template.name.toLowerCase()}');
      // const data = await response.json();
      // setRowData(data);
    } catch (error) {
      console.error('Error loading ${template.name} data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="template-container" style={{ height: '100%', width: '100%' }}>
      <div className="template-header" style={{ marginBottom: '20px' }}>
        <h2>${template.name.replace(/([A-Z])/g, ' $1').trim()}</h2>
        <div className="template-actions">
          <button 
            onClick={loadData} 
            disabled={loading}
            style={{ 
              marginRight: '10px', 
              padding: '8px 16px', 
              backgroundColor: '#1976d2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact 
          rowData={rowData} 
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ${template.name};`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <VisibilityIcon />
          Template Preview: {template.name}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab
              icon={<InfoIcon />}
              label="Information"
              id="preview-tab-0"
              aria-controls="preview-tabpanel-0"
            />
            <Tab
              icon={<TableChartIcon />}
              label="Data Preview"
              id="preview-tab-1"
              aria-controls="preview-tabpanel-1"
            />
            <Tab
              icon={<CodeIcon />}
              label="Generated Code"
              id="preview-tab-2"
              aria-controls="preview-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Template Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Template Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">Name:</Typography>
                    <Typography variant="body1" fontWeight="medium">{template.name}</Typography>
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">Type:</Typography>
                    <Chip 
                      label={template.record_type.charAt(0).toUpperCase() + template.record_type.slice(1)} 
                      size="small" 
                      color="primary"
                    />
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">Description:</Typography>
                    <Typography variant="body1">{template.description || 'No description provided'}</Typography>
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">File Status:</Typography>
                    <Chip 
                      label={template.exists ? 'File Exists' : 'File Missing'} 
                      size="small" 
                      color={template.exists ? 'success' : 'error'}
                    />
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">Editable:</Typography>
                    <Chip 
                      label={template.is_editable ? 'Yes' : 'No'} 
                      size="small" 
                      color={template.is_editable ? 'success' : 'default'}
                    />
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">Created:</Typography>
                    <Typography variant="body1">
                      {new Date(template.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Last Updated:</Typography>
                    <Typography variant="body1">
                      {new Date(template.updated_at).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Field Configuration */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Fields ({template.fields.length})
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Field Name</TableCell>
                          <TableCell>Label</TableCell>
                          <TableCell>Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {template.fields.map((field, index) => (
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Template Settings */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Template Configuration
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Grid Type:</Typography>
                      <Typography variant="body1">{template.grid_type}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Theme:</Typography>
                      <Typography variant="body1">{template.theme}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Layout:</Typography>
                      <Typography variant="body1">{template.layout_type}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">File Path:</Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                        {template.filePath}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This is a preview with sample data. The actual component will load real data from your API.
          </Alert>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {template.name.replace(/([A-Z])/g, ' $1').trim()} - Data Grid Preview
            </Typography>
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={sampleData}
                columns={columnDefs}
                pageSize={5}
                rowsPerPageOptions={[5]}
                disableSelectionOnClick
                density="compact"
                sx={{
                  '& .MuiDataGrid-cell:hover': {
                    color: 'primary.main',
                  },
                }}
              />
            </Box>
          </Paper>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This is the generated React component code. The file is saved to: <code>{template.filePath}</code>
          </Alert>
          
          <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <pre style={{ 
              fontFamily: 'monospace', 
              fontSize: '12px',
              lineHeight: '1.4',
              overflow: 'auto',
              maxHeight: '500px',
              margin: 0
            }}>
              {generateComponentCode()}
            </pre>
          </Paper>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplatePreviewDialog;
