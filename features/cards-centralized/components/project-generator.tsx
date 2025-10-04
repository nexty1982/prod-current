import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert, CircularProgress,
  Grid, Card, CardContent, Chip, Divider, Accordion, AccordionSummary,
  AccordionDetails, IconButton, Tooltip, Snackbar
} from '@mui/material';
import {
  Add as AddIcon, ExpandMore as ExpandMoreIcon, Code as CodeIcon,
  Storage as StorageIcon, Description as DocIcon, Preview as PreviewIcon,
  CheckCircle as CheckCircleIcon, Error as ErrorIcon
} from '@mui/icons-material';

interface GeneratedModule {
  component: {
    id: string;
    name: string;
    icon: string;
    type: string;
    route: string;
    dbTable: string;
    roles: string[];
    description: string;
  };
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

const ProjectGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedModule, setGeneratedModule] = useState<GeneratedModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const examplePrompts = [
    "Create a module for recording chrismations",
    "Create record type: Clergy Ordination",
    "Create management system for clergy certifications",
    "Add feedback submission to church portal",
    "Create module for Marriage Counseling records"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedModule(null);

    try {
      const response = await fetch('/api/omai/generate-module', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          user: 'current_user', // This would come from auth context
          previewOnly: previewMode
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedModule(result);
        setSuccess(previewMode ? 'Module preview generated successfully!' : 'Module generated successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate module');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate module');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateModule = async () => {
    if (!generatedModule) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/omai/generate-module', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: generatedModule.metadata.prompt,
          user: 'current_user',
          previewOnly: false
        }),
      });

      if (response.ok) {
        setSuccess('Module created and files generated successfully!');
        setGeneratedModule(null);
        setPrompt('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create module');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create module');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'tsx': return <CodeIcon />;
      case 'api': return <StorageIcon />;
      case 'db': return <StorageIcon />;
      case 'docs': return <DocIcon />;
      default: return <CodeIcon />;
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🚀 OMAI Project Generator
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Create complete record modules from natural language prompts. OMAI will generate all necessary files including React components, API routes, database schemas, and documentation.
      </Typography>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Input Section */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              📝 Module Generation
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Describe the module you want to create"
              placeholder="e.g., Create a module for recording chrismations"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Example prompts:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {examplePrompts.map((example, index) => (
                  <Chip
                    key={index}
                    label={example}
                    size="small"
                    variant="outlined"
                    onClick={() => handleExampleClick(example)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setPreviewMode(!previewMode)}
                startIcon={<PreviewIcon />}
              >
                {previewMode ? 'Preview Mode' : 'Generate Mode'}
              </Button>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              startIcon={isGenerating ? <CircularProgress size={20} /> : <AddIcon />}
            >
              {isGenerating ? 'Generating...' : (previewMode ? 'Preview Module' : 'Generate Module')}
            </Button>
          </Paper>
        </Grid>

        {/* Generated Module Preview */}
        <Grid item xs={12} md={6}>
          {generatedModule ? (
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {previewMode ? '📋 Module Preview' : '✅ Generated Module'}
                </Typography>
                <Chip
                  label={previewMode ? 'Preview' : 'Generated'}
                  color={previewMode ? 'warning' : 'success'}
                  size="small"
                />
              </Box>

              {/* Component Info */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {generatedModule.component.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {generatedModule.component.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Route: ${generatedModule.component.route}`} size="small" variant="outlined" />
                    <Chip label={`Table: ${generatedModule.component.dbTable}`} size="small" variant="outlined" />
                    <Chip label={`Type: ${generatedModule.component.type}`} size="small" variant="outlined" />
                  </Box>
                </CardContent>
              </Card>

              {/* Generated Files */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    📁 Generated Files ({Object.values(generatedModule.files).flat().length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(generatedModule.files).map(([type, files]) => (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getFileIcon(type)}
                        {type.toUpperCase()} Files ({files.length})
                      </Typography>
                      {files.map((file, index) => (
                        <Chip
                          key={index}
                          label={file}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>

              {/* Action Buttons */}
              {previewMode && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleCreateModule}
                    disabled={isGenerating}
                    startIcon={isGenerating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  >
                    {isGenerating ? 'Creating...' : 'Create Module'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setGeneratedModule(null)}
                  >
                    Clear Preview
                  </Button>
                </Box>
              )}
            </Paper>
          ) : (
            <Paper elevation={2} sx={{ p: 3, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom>
                🎯 Generated Output
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter a prompt and click "Generate Module" to see the preview here.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Features Section */}
      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          ✨ What OMAI Generates
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon color="primary" />
                  React Components
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Edit and View components with full CRUD functionality
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StorageIcon color="primary" />
                  API Routes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Complete REST API with GET, POST, PUT, DELETE endpoints
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StorageIcon color="primary" />
                  Database Schema
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  SQL migration files with proper indexes and constraints
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DocIcon color="primary" />
                  Documentation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Auto-generated Big Book documentation with usage examples
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      />
    </Box>
  );
};

export default ProjectGenerator; 