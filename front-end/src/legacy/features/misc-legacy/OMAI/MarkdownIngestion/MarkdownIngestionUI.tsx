import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  CloudUpload,
  FilePresent,
  Check,
  Error,
  Description,
  Code,
  Tag,
  Close
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface IngestionResult {
  success: boolean;
  data?: {
    ingestionId: string;
    filename: string;
    fileSize: number;
    contentPreview: string;
    sourceAgent: string;
    tags: string[];
    timestamp: string;
    status: string;
  };
  error?: string;
}

interface MarkdownIngestionUIProps {
  onIngestionComplete?: (result: IngestionResult) => void;
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
      id={`ingestion-tabpanel-${index}`}
      aria-labelledby={`ingestion-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MarkdownIngestionUI: React.FC<MarkdownIngestionUIProps> = ({ onIngestionComplete }) => {
  const [tabValue, setTabValue] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<IngestionResult[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [sourceAgent, setSourceAgent] = useState('user');
  const [manualTags, setManualTags] = useState('');
  const [previewDialog, setPreviewDialog] = useState<{open: boolean; content?: string; filename?: string}>({open: false});
  
  // Text input mode
  const [directContent, setDirectContent] = useState('');
  const [directFilename, setDirectFilename] = useState('manual-input.md');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.type !== 'text/markdown' && !file.name.endsWith('.md')) {
        setResults(prev => [...prev, {
          success: false,
          error: `File ${file.name} is not a markdown file`
        }]);
        continue;
      }

      await uploadFile(file);
    }
  }, [tags, sourceAgent, manualTags]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md'],
      'text/plain': ['.md']
    },
    multiple: true
  });

  const uploadFile = async (file: File) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('mdFile', file);
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }
      formData.append('source_agent', sourceAgent);
      if (manualTags) {
        formData.append('manual_tags', manualTags);
      }

      const response = await fetch('/api/omai/md-ingest', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setResults(prev => [...prev, result]);
      
      if (onIngestionComplete) {
        onIngestionComplete(result);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setResults(prev => [...prev, errorResult]);
    } finally {
      setUploading(false);
    }
  };

  const uploadDirectContent = async () => {
    if (!directContent.trim()) {
      setResults(prev => [...prev, {
        success: false,
        error: 'Content cannot be empty'
      }]);
      return;
    }

    setUploading(true);
    
    try {
      const response = await fetch('/api/omai/md-ingest-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: directContent,
          filename: directFilename,
          tags,
          source_agent: sourceAgent,
          manual_tags: manualTags
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, result]);
      
      if (result.success) {
        setDirectContent('');
        setDirectFilename('manual-input.md');
      }
      
      if (onIngestionComplete) {
        onIngestionComplete(result);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setResults(prev => [...prev, errorResult]);
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      onDrop(Array.from(files));
    }
  };

  const showPreview = (content: string, filename: string) => {
    setPreviewDialog({ open: true, content, filename });
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        📝 OMAI Markdown Ingestion
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload markdown files or paste content directly to add them to OMAI's knowledge base
      </Typography>

      {/* Configuration Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Configuration</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Source Agent"
                value={sourceAgent}
                onChange={(e) => setSourceAgent(e.target.value)}
                helperText="Who or what is ingesting this content"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Manual Tags"
                value={manualTags}
                onChange={(e) => setManualTags(e.target.value)}
                helperText="Comma-separated tags"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <TextField
                  fullWidth
                  label="Add Tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  InputProps={{
                    endAdornment: (
                      <Button onClick={addTag} size="small">Add</Button>
                    )
                  }}
                />
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => removeTag(tag)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Ingestion Methods */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="📁 File Upload" />
            <Tab label="✏️ Direct Input" />
          </Tabs>
        </Box>

        {/* File Upload Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ textAlign: 'center' }}>
            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                backgroundColor: isDragActive ? 'action.hover' : 'transparent',
                cursor: 'pointer',
                mb: 2
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop markdown files here...' : 'Drag & drop markdown files here'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                or click to select files (.md files only)
              </Typography>
              <Button
                variant="contained"
                onClick={handleFileSelect}
                disabled={uploading}
                startIcon={<Description />}
              >
                Choose Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
            </Paper>
          </Box>
        </TabPanel>

        {/* Direct Input Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Filename"
                value={directFilename}
                onChange={(e) => setDirectFilename(e.target.value)}
                helperText="Include .md extension"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={12}
                label="Markdown Content"
                value={directContent}
                onChange={(e) => setDirectContent(e.target.value)}
                placeholder="Paste or type your markdown content here..."
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={uploadDirectContent}
                disabled={uploading || !directContent.trim()}
                startIcon={uploading ? <CircularProgress size={20} /> : <Code />}
                fullWidth
              >
                {uploading ? 'Processing...' : 'Ingest Content'}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Ingestion Results</Typography>
              <Button onClick={clearResults} size="small">Clear</Button>
            </Box>
            <List>
              {results.map((result, index) => (
                <ListItem key={index} sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}>
                  <ListItemIcon>
                    {result.success ? (
                      <Check color="success" />
                    ) : (
                      <Error color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      result.success
                        ? `✅ ${result.data?.filename} ingested successfully`
                        : `❌ ${result.error}`
                    }
                    secondary={
                      result.success && result.data ? (
                        <Box>
                          <Typography variant="caption">
                            ID: {result.data.ingestionId} | Size: {Math.round(result.data.fileSize / 1024)}KB | Agent: {result.data.sourceAgent}
                          </Typography>
                          {result.data.contentPreview && (
                            <Button
                              size="small"
                              onClick={() => showPreview(result.data!.contentPreview, result.data!.filename)}
                              sx={{ ml: 1 }}
                            >
                              Preview
                            </Button>
                          )}
                        </Box>
                      ) : null
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Loading Indicator */}
      {uploading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Processing markdown content...</Typography>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({open: false})}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Preview: {previewDialog.filename}
        </DialogTitle>
        <DialogContent>
          <Typography
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              backgroundColor: 'grey.100',
              p: 2,
              borderRadius: 1,
              maxHeight: 400,
              overflow: 'auto'
            }}
          >
            {previewDialog.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({open: false})}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MarkdownIngestionUI;