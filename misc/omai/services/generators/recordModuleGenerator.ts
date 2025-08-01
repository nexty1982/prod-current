import { BoundComponent } from '../../../front-end/src/pages/omb/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as ejs from 'ejs';

export interface ModuleGenerationRequest {
  prompt: string;
  recordType: string;
  fields?: string[];
  roles?: string[];
  icon?: string;
  description?: string;
  user: string;
}

export interface GeneratedModule {
  component: BoundComponent;
  files: {
    tsx: string[];
    api: string[];
    db: string[];
    docs: string[];
  };
  metadata: {
    generatedAt: string;
    generatedBy: string;
    prompt: string;
  };
}

export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'text' | 'select';
  required: boolean;
  label: string;
  options?: string[]; // For select fields
  validation?: string;
}

export async function generateModuleFromPrompt(request: ModuleGenerationRequest): Promise<GeneratedModule> {
  try {
    // Parse the prompt to extract information
    const parsed = await parsePrompt(request.prompt);
    
    // Generate field definitions if not provided
    const fields = request.fields || await inferFields(request.recordType);
    
    // Create the component definition
    const component: BoundComponent = {
      id: generateComponentId(request.recordType),
      name: request.recordType,
      icon: request.icon || inferIcon(request.recordType),
      type: 'card',
      route: `/api/records/${generateRouteSlug(request.recordType)}`,
      dbTable: generateTableName(request.recordType),
      roles: request.roles || ['admin'],
      description: request.description || `Manage ${request.recordType.toLowerCase()} records`,
      size: 'medium',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: request.user,
        generatedFromPrompt: request.prompt
      }
    };

    // Generate all files
    const files = await generateAllFiles(component, fields, request);

    // Create the generated module object
    const generatedModule: GeneratedModule = {
      component,
      files,
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: request.user,
        prompt: request.prompt
      }
    };

    // Log the generation
    await logModuleGeneration(generatedModule);

    return generatedModule;

  } catch (error) {
    console.error('Module generation failed:', error);
    throw new Error(`Failed to generate module: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function parsePrompt(prompt: string): Promise<{ recordType: string; fields?: string[] }> {
  // Simple prompt parsing - in a real implementation, this would use NLP
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract record type
  let recordType = '';
  if (lowerPrompt.includes('module for')) {
    recordType = prompt.split('module for')[1]?.trim() || '';
  } else if (lowerPrompt.includes('record type:')) {
    recordType = prompt.split('record type:')[1]?.trim() || '';
  } else if (lowerPrompt.includes('create')) {
    // Extract after "create" and before any common words
    const afterCreate = prompt.split('create')[1]?.trim() || '';
    recordType = afterCreate.split(' ').slice(0, 3).join(' '); // Take first 3 words
  }

  return { recordType: recordType || 'Custom Record' };
}

async function inferFields(recordType: string): Promise<FieldDefinition[]> {
  // Common field patterns based on record type
  const commonFields: FieldDefinition[] = [
    {
      name: 'id',
      type: 'number',
      required: true,
      label: 'ID'
    },
    {
      name: 'created_at',
      type: 'date',
      required: true,
      label: 'Created Date'
    },
    {
      name: 'updated_at',
      type: 'date',
      required: true,
      label: 'Updated Date'
    },
    {
      name: 'created_by',
      type: 'string',
      required: true,
      label: 'Created By'
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      label: 'Status',
      options: ['active', 'inactive', 'pending']
    }
  ];

  // Add type-specific fields
  const lowerType = recordType.toLowerCase();
  
  if (lowerType.includes('marriage') || lowerType.includes('wedding')) {
    commonFields.push(
      { name: 'bride_name', type: 'string', required: true, label: 'Bride Name' },
      { name: 'groom_name', type: 'string', required: true, label: 'Groom Name' },
      { name: 'wedding_date', type: 'date', required: true, label: 'Wedding Date' },
      { name: 'officiant', type: 'string', required: true, label: 'Officiant' }
    );
  } else if (lowerType.includes('baptism')) {
    commonFields.push(
      { name: 'child_name', type: 'string', required: true, label: 'Child Name' },
      { name: 'parents', type: 'string', required: true, label: 'Parents' },
      { name: 'baptism_date', type: 'date', required: true, label: 'Baptism Date' },
      { name: 'godparents', type: 'string', required: false, label: 'Godparents' }
    );
  } else if (lowerType.includes('clergy') || lowerType.includes('ordination')) {
    commonFields.push(
      { name: 'clergy_name', type: 'string', required: true, label: 'Clergy Name' },
      { name: 'ordination_date', type: 'date', required: true, label: 'Ordination Date' },
      { name: 'rank', type: 'select', required: true, label: 'Rank', options: ['Deacon', 'Priest', 'Bishop'] },
      { name: 'diocese', type: 'string', required: true, label: 'Diocese' }
    );
  } else {
    // Generic fields for unknown record types
    commonFields.push(
      { name: 'title', type: 'string', required: true, label: 'Title' },
      { name: 'description', type: 'text', required: false, label: 'Description' },
      { name: 'date', type: 'date', required: true, label: 'Date' }
    );
  }

  return commonFields;
}

function generateComponentId(recordType: string): string {
  return recordType
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

function generateRouteSlug(recordType: string): string {
  return recordType
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

function generateTableName(recordType: string): string {
  return recordType
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_') + '_records';
}

function inferIcon(recordType: string): string {
  const lowerType = recordType.toLowerCase();
  
  if (lowerType.includes('marriage') || lowerType.includes('wedding')) return 'favorite';
  if (lowerType.includes('baptism')) return 'water_drop';
  if (lowerType.includes('clergy') || lowerType.includes('ordination')) return 'church';
  if (lowerType.includes('counseling')) return 'psychology';
  if (lowerType.includes('donation')) return 'monetization_on';
  if (lowerType.includes('event')) return 'event';
  if (lowerType.includes('member')) return 'person';
  
  return 'description'; // Default icon
}

async function generateAllFiles(
  component: BoundComponent, 
  fields: FieldDefinition[], 
  request: ModuleGenerationRequest
): Promise<GeneratedModule['files']> {
  const files = {
    tsx: [],
    api: [],
    db: [],
    docs: []
  };

  try {
    // Load templates
    const templates = await loadTemplates();

    // Generate TSX files
    const editComponent = await generateEditComponent(component, fields, templates);
    const viewComponent = await generateViewComponent(component, fields, templates);
    
    files.tsx.push(
      `src/pages/auto/${component.id}/Edit${component.name.replace(/\s+/g, '')}.tsx`,
      `src/pages/auto/${component.id}/View${component.name.replace(/\s+/g, '')}.tsx`
    );

    // Generate API route
    const apiRoute = await generateApiRoute(component, fields, templates);
    files.api.push(`src/api/auto/${component.id}.ts`);

    // Generate database migration
    const dbMigration = await generateDbMigration(component, fields, templates);
    files.db.push(`migrations/${component.dbTable}_table.sql`);

    // Generate documentation
    const documentation = await generateDocumentation(component, fields, templates);
    files.docs.push(`docs/OM-BigBook/pages/components/${component.id}.md`);

    // Write files (in preview mode, we'll return the content instead)
    if (request.previewOnly !== true) {
      await writeGeneratedFiles({
        editComponent,
        viewComponent,
        apiRoute,
        dbMigration,
        documentation
      }, component);
    }

    return files;

  } catch (error) {
    console.error('File generation failed:', error);
    throw error;
  }
}

async function loadTemplates(): Promise<any> {
  const templateDir = path.join(__dirname, 'templates');
  
  try {
    const editTemplate = await fs.readFile(path.join(templateDir, 'tsx', 'editable-record.ejs'), 'utf8');
    const viewTemplate = await fs.readFile(path.join(templateDir, 'tsx', 'view-grid.ejs'), 'utf8');
    const apiTemplate = await fs.readFile(path.join(templateDir, 'api', 'route.ejs'), 'utf8');
    const dbTemplate = await fs.readFile(path.join(templateDir, 'db', 'schema.sql.ejs'), 'utf8');
    const docTemplate = await fs.readFile(path.join(templateDir, 'doc', 'component.md.ejs'), 'utf8');

    return {
      editTemplate,
      viewTemplate,
      apiTemplate,
      dbTemplate,
      docTemplate
    };
  } catch (error) {
    // If templates don't exist, use default templates
    return getDefaultTemplates();
  }
}

function getDefaultTemplates() {
  return {
    editTemplate: `import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Chip
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

interface <%= componentName %>Data {
  <% fields.forEach(field => { %>
  <%= field.name %>: <%= getTypeScriptType(field.type) %>;
  <% }); %>
}

export default function Edit<%= componentName %>({ mode = 'create' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<<%= componentName %>Data>({
    <% fields.forEach(field => { %>
    <%= field.name %>: <%= getDefaultValue(field.type) %>,
    <% }); %>
  });

  useEffect(() => {
    if (mode === 'edit' && id) {
      loadRecord();
    }
  }, [id, mode]);

  const loadRecord = async () => {
    setLoading(true);
    try {
      const response = await fetch(\`<%= component.route %>/\${id}\`);
      if (response.ok) {
        const record = await response.json();
        setData(record.data);
      }
    } catch (error) {
      setError('Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = mode === 'edit' ? \`<%= component.route %>/\${id}\` : '<%= component.route %>';
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        navigate('/<%= component.id %>');
      } else {
        setError('Failed to save record');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && mode === 'edit') {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box p={3}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            {mode === 'create' ? 'Create New <%= component.name %>' : 'Edit <%= component.name %>'}
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <% fields.forEach(field => { %>
              <Grid item xs={12} md={6}>
                <% if (field.type === 'select') { %>
                <FormControl fullWidth required={<%= field.required %>}>
                  <InputLabel><%= field.label %></InputLabel>
                  <Select
                    value={data.<%= field.name %>}
                    onChange={(e) => setData({ ...data, <%= field.name %>: e.target.value })}
                    label="<%= field.label %>"
                  >
                    <% field.options?.forEach(option => { %>
                    <MenuItem value="<%= option.toLowerCase() %>"><%= option %></MenuItem>
                    <% }); %>
                  </Select>
                </FormControl>
                <% } else if (field.type === 'date') { %>
                <DatePicker
                  label="<%= field.label %>"
                  value={data.<%= field.name %>}
                  onChange={(newValue) => setData({ ...data, <%= field.name %>: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth required={<%= field.required %>} />}
                />
                <% } else if (field.type === 'text') { %>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="<%= field.label %>"
                  value={data.<%= field.name %>}
                  onChange={(e) => setData({ ...data, <%= field.name %>: e.target.value })}
                  required={<%= field.required %>}
                />
                <% } else { %>
                <TextField
                  fullWidth
                  label="<%= field.label %>"
                  value={data.<%= field.name %>}
                  onChange={(e) => setData({ ...data, <%= field.name %>: e.target.value })}
                  required={<%= field.required %>}
                  type={getInputType(field.type)}
                />
                <% } %>
              </Grid>
              <% }); %>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/<%= component.id %>')}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}`,

    viewTemplate: `import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Chip, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, InputAdornment, Alert
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface <%= componentName %>Record {
  id: number;
  <% fields.forEach(field => { %>
  <%= field.name %>: <%= getTypeScriptType(field.type) %>;
  <% }); %>
}

export default function View<%= componentName %>() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<<%= componentName %>Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('<%= component.route %>');
      if (response.ok) {
        const result = await response.json();
        setRecords(result.data || []);
      } else {
        setError('Failed to load records');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(\`<%= component.route %>/\${id}\`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadRecords(); // Reload the list
      } else {
        setError('Failed to delete record');
      }
    } catch (error) {
      setError('Network error');
    }
  };

  const filteredRecords = records.filter(record =>
    Object.values(record).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const paginatedRecords = filteredRecords.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">
            <%= component.name %> Records
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/<%= component.id %>/create')}
          >
            Add New
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <% fields.forEach(field => { %>
                <TableCell><%= field.label %></TableCell>
                <% }); %>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRecords.map((record) => (
                <TableRow key={record.id}>
                  <% fields.forEach(field => { %>
                  <TableCell>
                    <% if (field.type === 'date') { %>
                    {record.<%= field.name %> ? format(new Date(record.<%= field.name %>), 'MMM dd, yyyy') : '-'}
                    <% } else if (field.type === 'select') { %>
                    <Chip 
                      label={record.<%= field.name %>} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                    <% } else { %>
                    {record.<%= field.name %> || '-'}
                    <% } %>
                  </TableCell>
                  <% }); %>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => navigate(\`/<%= component.id %>/edit/\${record.id}\`)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(record.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredRecords.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
}`,

    apiTemplate: `const express = require('express');
const router = express.Router();
const { promisePool } = require('../../../config/db');

// <%= component.name %> API Routes
// Generated from OMAI prompt: <%= prompt %>

// GET <%= component.route %> - Get all <%= component.name.toLowerCase() %> records
router.get('<%= component.route %>', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT * FROM <%= component.dbTable %> ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching <%= component.name.toLowerCase() %>:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch <%= component.name.toLowerCase() %> data'
    });
  }
});

// GET <%= component.route %>/:id - Get single <%= component.name.toLowerCase() %> record
router.get('<%= component.route %>/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await promisePool.query(
      'SELECT * FROM <%= component.dbTable %> WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '<%= component.name %> not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching <%= component.name.toLowerCase() %>:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch <%= component.name.toLowerCase() %> data'
    });
  }
});

// POST <%= component.route %> - Create new <%= component.name.toLowerCase() %> record
router.post('<%= component.route %>', async (req, res) => {
  try {
    const { <% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %><%= field.name %><%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %> } = req.body;

    const [result] = await promisePool.query(
      \`INSERT INTO <%= component.dbTable %> (<% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %><%= field.name %><%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %>) VALUES (<% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %>?<%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %>)\`,
      [<% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %><%= field.name %><%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %>]
    );

    res.status(201).json({
      success: true,
      message: '<%= component.name %> created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating <%= component.name.toLowerCase() %>:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create <%= component.name.toLowerCase() %>'
    });
  }
});

// PUT <%= component.route %>/:id - Update <%= component.name.toLowerCase() %> record
router.put('<%= component.route %>/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { <% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %><%= field.name %><%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %> } = req.body;

    const [result] = await promisePool.query(
      \`UPDATE <%= component.dbTable %> SET <% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %><%= field.name %> = ?<%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %> WHERE id = ?\`,
      [<% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %><%= field.name %><%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %>, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: '<%= component.name %> not found'
      });
    }

    res.json({
      success: true,
      message: '<%= component.name %> updated successfully'
    });
  } catch (error) {
    console.error('Error updating <%= component.name.toLowerCase() %>:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update <%= component.name.toLowerCase() %>'
    });
  }
});

// DELETE <%= component.route %>/:id - Delete <%= component.name.toLowerCase() %> record
router.delete('<%= component.route %>/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await promisePool.query(
      'DELETE FROM <%= component.dbTable %> WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: '<%= component.name %> not found'
      });
    }

    res.json({
      success: true,
      message: '<%= component.name %> deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting <%= component.name.toLowerCase() %>:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete <%= component.name.toLowerCase() %>'
    });
  }
});

module.exports = router;`,

    dbTemplate: `-- Migration for <%= component.dbTable %> table
-- Generated by OMAI from prompt: <%= prompt %>
-- Generated on: <%= new Date().toISOString() %>

CREATE TABLE IF NOT EXISTS <%= component.dbTable %> (
  <% fields.forEach((field, index) => { %>
  <%= field.name %> <%= getSqlType(field.type) %><%= field.required ? ' NOT NULL' : '' %><%= index < fields.length - 1 ? ',' : '' %>
  <% }); %>
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance
<% fields.filter(f => f.name === 'id' || f.name === 'created_at' || f.name === 'status').forEach(field => { %>
CREATE INDEX idx_<%= component.dbTable %>_<%= field.name %> ON <%= component.dbTable %>(<%= field.name %>);
<% }); %>

-- Insert sample data (optional)
-- INSERT INTO <%= component.dbTable %> (<% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %><%= field.name %><%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %>) VALUES 
-- (<% fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').forEach((field, index) => { %>'<%= getSampleValue(field.type) %>'<%= index < fields.filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at').length - 1 ? ', ' : '' %><% }); %>);`,

    docTemplate: `# <%= component.name %>

**Type**: <%= component.type.charAt(0).toUpperCase() + component.type.slice(1) %>  
**Route**: \`<%= component.route %>\`  
**DB Table**: \`<%= component.dbTable %>\`  
**Roles**: \`<%= JSON.stringify(component.roles) %>\`  
**Description**: <%= component.description %>

---

✅ Linked from dashboard  
📡 Binds to \`GET <%= component.route %>\`

## 🔍 Generated Fields

<% fields.forEach(field => { %>
### <%= field.label %>
- **Name**: \`<%= field.name %>\`
- **Type**: <%= field.type.charAt(0).toUpperCase() + field.type.slice(1) %>
- **Required**: <%= field.required ? 'Yes' : 'No' %>
<% if (field.options) { %>
- **Options**: <%= field.options.join(', ') %>
<% } %>
<% if (field.validation) { %>
- **Validation**: <%= field.validation %>
<% } %>

<% }); %>

## 💻 Usage

This component was automatically generated by OMAI from the prompt: **"<%= prompt %>"**

### API Integration
- **Endpoint**: \`<%= component.route %>\`
- **Methods**: GET, POST, PUT, DELETE
- **Authentication**: Required
- **Roles**: <%= component.roles.join(', ') %>

### Database Schema
- **Table**: \`<%= component.dbTable %>\`
- **Access**: <%= component.roles.includes('admin') ? 'Admin only' : 'Role-based' %>

## 🚀 Generated Files

This component generates the following files:

- **Edit Component**: \`src/pages/auto/<%= component.id %>/Edit<%= component.name.replace(/\s+/g, '') %>.tsx\`
- **View Component**: \`src/pages/auto/<%= component.id %>/View<%= component.name.replace(/\s+/g, '') %>.tsx\`
- **API Route**: \`src/api/auto/<%= component.id %>.ts\`
- **Database Migration**: \`migrations/<%= component.dbTable %>_table.sql\`
- **Documentation**: \`docs/OM-BigBook/pages/components/<%= component.id %>.md\`

## 🔧 Development

### Edit Component
\`\`\`typescript
// src/pages/auto/<%= component.id %>/Edit<%= component.name.replace(/\s+/g, '') %>.tsx
export default function Edit<%= component.name.replace(/\s+/g, '') %>({ mode = 'create' }) {
  // Auto-generated form component
}
\`\`\`

### View Component
\`\`\`typescript
// src/pages/auto/<%= component.id %>/View<%= component.name.replace(/\s+/g, '') %>.tsx
export default function View<%= component.name.replace(/\s+/g, '') %>() {
  // Auto-generated table view component
}
\`\`\`

### API Route
\`\`\`typescript
// src/api/auto/<%= component.id %>.ts
router.get('<%= component.route %>', async (req, res) => {
  // Auto-generated API endpoints
});
\`\`\`

## 📊 Statistics

- **Generated**: <%= new Date().toISOString() %>
- **Component Type**: <%= component.type %>
- **Access Roles**: <%= component.roles.length %> roles
- **Database Fields**: <%= fields.length %> fields
- **Generated From**: OMAI Prompt

---

*This documentation is automatically maintained by the OM-AI system.*`
  };
}

async function generateEditComponent(component: BoundComponent, fields: FieldDefinition[], templates: any): Promise<string> {
  const componentName = component.name.replace(/\s+/g, '');
  
  return ejs.render(templates.editTemplate, {
    component,
    fields,
    componentName,
    getTypeScriptType: (type: string) => {
      switch (type) {
        case 'string': return 'string';
        case 'number': return 'number';
        case 'date': return 'Date | null';
        case 'boolean': return 'boolean';
        case 'text': return 'string';
        case 'select': return 'string';
        default: return 'string';
      }
    },
    getDefaultValue: (type: string) => {
      switch (type) {
        case 'string': return "''";
        case 'number': return '0';
        case 'date': return 'null';
        case 'boolean': return 'false';
        case 'text': return "''";
        case 'select': return "''";
        default: return "''";
      }
    },
    getInputType: (type: string) => {
      switch (type) {
        case 'number': return 'number';
        case 'date': return 'date';
        default: return 'text';
      }
    }
  });
}

async function generateViewComponent(component: BoundComponent, fields: FieldDefinition[], templates: any): Promise<string> {
  const componentName = component.name.replace(/\s+/g, '');
  
  return ejs.render(templates.viewTemplate, {
    component,
    fields,
    componentName,
    getTypeScriptType: (type: string) => {
      switch (type) {
        case 'string': return 'string';
        case 'number': return 'number';
        case 'date': return 'string';
        case 'boolean': return 'boolean';
        case 'text': return 'string';
        case 'select': return 'string';
        default: return 'string';
      }
    }
  });
}

async function generateApiRoute(component: BoundComponent, fields: FieldDefinition[], templates: any): Promise<string> {
  return ejs.render(templates.apiTemplate, {
    component,
    fields,
    prompt: 'Generated by OMAI'
  });
}

async function generateDbMigration(component: BoundComponent, fields: FieldDefinition[], templates: any): Promise<string> {
  return ejs.render(templates.dbTemplate, {
    component,
    fields,
    prompt: 'Generated by OMAI',
    getSqlType: (type: string) => {
      switch (type) {
        case 'string': return 'VARCHAR(255)';
        case 'number': return 'INT';
        case 'date': return 'DATE';
        case 'boolean': return 'BOOLEAN';
        case 'text': return 'TEXT';
        case 'select': return 'VARCHAR(100)';
        default: return 'VARCHAR(255)';
      }
    },
    getSampleValue: (type: string) => {
      switch (type) {
        case 'string': return 'Sample Text';
        case 'number': return '1';
        case 'date': return '2024-01-01';
        case 'boolean': return 'true';
        case 'text': return 'Sample description';
        case 'select': return 'active';
        default: return 'Sample';
      }
    }
  });
}

async function generateDocumentation(component: BoundComponent, fields: FieldDefinition[], templates: any): Promise<string> {
  return ejs.render(templates.docTemplate, {
    component,
    fields,
    prompt: 'Generated by OMAI'
  });
}

async function writeGeneratedFiles(files: any, component: BoundComponent): Promise<void> {
  // Ensure directories exist
  const dirs = [
    `src/pages/auto/${component.id}`,
    'src/api/auto',
    'migrations',
    'docs/OM-BigBook/pages/components'
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Write files
  await fs.writeFile(`src/pages/auto/${component.id}/Edit${component.name.replace(/\s+/g, '')}.tsx`, files.editComponent);
  await fs.writeFile(`src/pages/auto/${component.id}/View${component.name.replace(/\s+/g, '')}.tsx`, files.viewComponent);
  await fs.writeFile(`src/api/auto/${component.id}.ts`, files.apiRoute);
  await fs.writeFile(`migrations/${component.dbTable}_table.sql`, files.dbMigration);
  await fs.writeFile(`docs/OM-BigBook/pages/components/${component.id}.md`, files.documentation);
}

async function logModuleGeneration(module: GeneratedModule): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: 'module_generation',
    componentId: module.component.id,
    componentName: module.component.name,
    generatedBy: module.metadata.generatedBy,
    prompt: module.metadata.prompt,
    filesGenerated: Object.values(module.files).flat().length
  };

  const logFile = 'logs/omai-module-generation.log';
  
  try {
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to log module generation:', error);
  }
}

export async function previewModuleGeneration(request: ModuleGenerationRequest): Promise<GeneratedModule> {
  return generateModuleFromPrompt({ ...request, previewOnly: true });
} 