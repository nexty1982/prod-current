import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  useTheme,
  useMediaQuery,
  Fab,
  Tooltip,
  Chip,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  Code as CodeIcon,
  ViewModule as ViewModuleIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Image from '@editorjs/image';
import Quote from '@editorjs/quote';
import CodeTool from '@editorjs/code';
import Table from '@editorjs/table';
import Delimiter from '@editorjs/delimiter';
import axios from 'axios';
import DynamicComponentRenderer, { getAvailableComponents } from './DynamicComponentRenderer';
import ContentRenderer from './ContentRenderer';
import './EnhancedPageEditor.css';

// Types
interface PageData {
  id?: number;
  slug: string;
  title: string;
  content: string; // JSON string from Editor.js
  meta_description?: string;
  created_at?: string;
  updated_at?: string;
}

interface EnhancedPageEditorProps {
  slug?: string;
  onSave?: (pageData: PageData) => void;
}

// Custom component block for Editor.js
// Note: This is a simplified version - component insertion will be handled differently
const insertComponentText = (componentId: string) => {
  const component = getAvailableComponents().find(c => c.id === componentId);
  return component ? component.shortcode : '';
};

const EnhancedPageEditor: React.FC<EnhancedPageEditorProps> = ({ 
  slug = 'new-page', 
  onSave 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management
  const [pageData, setPageData] = useState<PageData>({
    slug,
    title: '',
    content: '',
    meta_description: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [componentMenuAnchor, setComponentMenuAnchor] = useState<null | HTMLElement>(null);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Refs
  const editorRef = useRef<EditorJS | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // Editor.js configuration
  const editorConfig: any = {
    holder: 'enhanced-editor',
    placeholder: 'Start writing your page content...',
    tools: {
      header: {
        class: Header,
        config: {
          placeholder: 'Enter a header',
          levels: [1, 2, 3, 4, 5, 6],
          defaultLevel: 2
        }
      },
      list: {
        class: List,
        inlineToolbar: true,
        config: {
          defaultStyle: 'unordered'
        }
      },
      quote: {
        class: Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: 'Enter a quote',
          captionPlaceholder: 'Quote author'
        }
      },
      code: {
        class: CodeTool,
        config: {
          placeholder: 'Enter code'
        }
      },
      image: {
        class: Image,
        config: {
          endpoints: {
            byFile: '/api/uploads/image'
          },
          additionalRequestHeaders: {
            'Content-Type': 'multipart/form-data'
          },
          field: 'image',
          types: 'image/*',
          captionPlaceholder: 'Enter image caption',
          buttonContent: 'Select an image',
          uploader: {
            uploadByFile: async (file: File) => {
              const formData = new FormData();
              formData.append('image', file);
              
              try {
                const response = await axios.post('/api/uploads/image', formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data'
                  }
                });
                
                return {
                  success: 1,
                  file: {
                    url: response.data.url,
                    size: response.data.size,
                    name: response.data.original_name
                  }
                };
              } catch (error) {
                return {
                  success: 0,
                  error: 'Upload failed'
                };
              }
            }
          }
        }
      },
      table: {
        class: Table,
        inlineToolbar: true,
        config: {
          rows: 2,
          cols: 3
        }
      },
      delimiter: Delimiter
    },
    onChange: () => {
      handleContentChange();
    },
    minHeight: 300
  };

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) {
      editorRef.current = new EditorJS(editorConfig);
    }

    // Load page data
    if (slug && slug !== 'new-page') {
      loadPageData();
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [slug]);

  // Auto-save functionality
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleContentChange = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 3000); // Auto-save after 3 seconds of inactivity
  };

  const loadPageData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/pages/${slug}`);
      const data = response.data;
      
      setPageData(data);
      
      // Parse content for Editor.js
      let parsedContent;
      try {
        parsedContent = JSON.parse(data.content || '{}');
      } catch {
        // If content is not JSON, create a basic structure
        parsedContent = {
          blocks: data.content ? [
            {
              type: 'paragraph',
              data: {
                text: data.content
              }
            }
          ] : []
        };
      }
      
      // Load content into editor
      if (editorRef.current) {
        await editorRef.current.render(parsedContent);
      }
      
      lastSavedContentRef.current = JSON.stringify(parsedContent);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        showNotification('Error loading page data', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const autoSave = async () => {
    if (!editorRef.current) return;
    
    try {
      const outputData = await editorRef.current.save();
      const contentString = JSON.stringify(outputData);
      
      // Only save if content has changed
      if (contentString !== lastSavedContentRef.current) {
        await savePage(contentString, true);
        lastSavedContentRef.current = contentString;
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleManualSave = async () => {
    if (!editorRef.current) return;
    
    try {
      const outputData = await editorRef.current.save();
      const contentString = JSON.stringify(outputData);
      await savePage(contentString, false);
      lastSavedContentRef.current = contentString;
    } catch (error) {
      showNotification('Failed to save page', 'error');
    }
  };

  const savePage = async (content: string, isAutoSave: boolean = false) => {
    if (!pageData.title.trim()) {
      showNotification('Please enter a page title', 'warning');
      return;
    }

    try {
      setSaving(true);
      
      const dataToSave = {
        ...pageData,
        content
      };
      
      const response = await axios.put(`/api/pages/${pageData.slug}`, dataToSave);
      
      if (!isAutoSave) {
        setPageData(response.data);
        showNotification('Page saved successfully', 'success');
      }
      
      if (onSave) {
        onSave(response.data);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to save page';
      showNotification(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handlePreview = async () => {
    if (!previewMode && editorRef.current) {
      try {
        const outputData = await editorRef.current.save();
        setPreviewContent(JSON.stringify(outputData));
      } catch (error) {
        console.error('Failed to get editor content for preview:', error);
      }
    }
    setPreviewMode(!previewMode);
  };

  const insertComponent = (componentId: string) => {
    const component = getAvailableComponents().find(c => c.id === componentId);
    if (component && editorRef.current) {
      // Insert component block
      editorRef.current.blocks.insert('component', {
        shortcode: component.shortcode
      });
    }
    setComponentMenuAnchor(null);
  };

  const renderPreview = () => {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {pageData.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {pageData.meta_description}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <ContentRenderer content={previewContent} />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {slug === 'new-page' ? 'Create New Page' : 'Edit Page'}
        </Typography>
        
        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleManualSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Page'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
          >
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={(e) => setComponentMenuAnchor(e.currentTarget)}
          >
            Add Component
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ViewModuleIcon />}
            onClick={() => setTemplateDialog(true)}
          >
            Templates
          </Button>
        </Box>
      </Box>

      {previewMode ? (
        <Paper elevation={1}>
          {renderPreview()}
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', gap: 3, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Main editor */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                {/* Page metadata */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Page Title"
                    value={pageData.title}
                    onChange={(e) => setPageData(prev => ({ ...prev, title: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Slug"
                    value={pageData.slug}
                    onChange={(e) => setPageData(prev => ({ ...prev, slug: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Meta Description"
                    multiline
                    rows={2}
                    value={pageData.meta_description || ''}
                    onChange={(e) => setPageData(prev => ({ ...prev, meta_description: e.target.value }))}
                  />
                </Box>

                {/* Editor */}
                <Box 
                  id="enhanced-editor"
                  sx={{ 
                    minHeight: '400px',
                    '& .ce-toolbar__content': {
                      maxWidth: 'none'
                    },
                    '& .ce-block__content': {
                      maxWidth: 'none'
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Box>

          {/* Sidebar */}
          <Box sx={{ width: isMobile ? '100%' : '300px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Page Tools
                </Typography>
                
                {/* Available components */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Available Components
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {getAvailableComponents().slice(0, 6).map(component => (
                      <Chip
                        key={component.id}
                        label={component.name}
                        size="small"
                        onClick={() => insertComponent(component.id)}
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Page info */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Page Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Auto-save: Every 3 seconds
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last saved: {pageData.updated_at ? new Date(pageData.updated_at).toLocaleString() : 'Never'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Component menu */}
      <Menu
        anchorEl={componentMenuAnchor}
        open={Boolean(componentMenuAnchor)}
        onClose={() => setComponentMenuAnchor(null)}
      >
        {getAvailableComponents().map(component => (
          <MenuItem
            key={component.id}
            onClick={() => insertComponent(component.id)}
          >
            <Box>
              <Typography variant="body2">{component.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {component.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Template dialog */}
      <Dialog
        open={templateDialog}
        onClose={() => setTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Page Templates</DialogTitle>
        <DialogContent>
          <Typography>
            Template functionality coming soon...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Auto-save indicator */}
      {saving && (
        <Fab
          color="secondary"
          size="small"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <CircularProgress size={24} color="inherit" />
        </Fab>
      )}

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EnhancedPageEditor;
