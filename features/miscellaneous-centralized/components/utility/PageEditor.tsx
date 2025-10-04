import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  ImageList,
  ImageListItem,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Save as SaveIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  InsertPhoto as InsertPhotoIcon
} from '@mui/icons-material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';

// Types
interface PageData {
  id?: number;
  slug: string;
  title: string;
  content: string;
  meta_description?: string;
  created_at?: string;
  updated_at?: string;
}

interface ImageItem {
  id: number;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  upload_date: string;
  url: string;
}

interface PageEditorProps {
  slug?: string;
  onSave?: (pageData: PageData) => void;
}

const PageEditor: React.FC<PageEditorProps> = ({ slug = 'new-page', onSave }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management
  const [pageData, setPageData] = useState<PageData>({
    slug,
    title: '',
    content: '',
    meta_description: ''
  });
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
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
  const quillRef = useRef<ReactQuill>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Quill configuration
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        [{ 'color': [] }, { 'background': [] }],
        ['blockquote', 'code-block'],
        ['clean']
      ],
      handlers: {
        image: () => setImageDialogOpen(true)
      }
    },
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent', 'align',
    'link', 'image', 'video', 'color', 'background',
    'blockquote', 'code-block'
  ];

  // Load page data and images on mount
  useEffect(() => {
    if (slug && slug !== 'new-page') {
      loadPageData();
    }
    loadImages();
  }, [slug]);

  // Auto-save functionality
  useEffect(() => {
    if (pageData.title || pageData.content) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [pageData.title, pageData.content, pageData.meta_description]);

  // Load page data from API
  const loadPageData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/pages/${slug}`);
      setPageData(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        showNotification('Error loading page data', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load images from API
  const loadImages = async () => {
    try {
      const response = await axios.get('/api/uploads/list');
      setImages(response.data);
    } catch (error) {
      showNotification('Error loading images', 'error');
    }
  };

  // Auto-save function
  const autoSave = async () => {
    if (!pageData.title && !pageData.content) return;

    try {
      await axios.put(`/api/pages/${pageData.slug}`, {
        title: pageData.title,
        content: pageData.content,
        meta_description: pageData.meta_description
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Manual save function
  const handleSave = async () => {
    if (!pageData.title) {
      showNotification('Please enter a page title', 'warning');
      return;
    }

    try {
      setSaving(true);
      const response = await axios.put(`/api/pages/${pageData.slug}`, {
        title: pageData.title,
        content: pageData.content,
        meta_description: pageData.meta_description
      });
      
      setPageData(response.data);
      showNotification('Page saved successfully!', 'success');
      
      if (onSave) {
        onSave(response.data);
      }
    } catch (error: any) {
      showNotification(
        error.response?.data?.error || 'Error saving page',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploading(true);
      const response = await axios.post('/api/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newImage = response.data;
      setImages(prev => [newImage, ...prev]);
      showNotification('Image uploaded successfully!', 'success');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      showNotification(
        error.response?.data?.error || 'Error uploading image',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  // Insert image into editor
  const insertImage = (imageUrl: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const index = range ? range.index : quill.getLength();
      quill.insertEmbed(index, 'image', imageUrl);
    }
    setImageDialogOpen(false);
  };

  // Show notification
  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Handle input changes
  const handleInputChange = (field: keyof PageData, value: string) => {
    setPageData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Page Editor
            </Typography>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Page'}
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Page Title"
                    value={pageData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Page Slug"
                    value={pageData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                    helperText="URL-friendly identifier for this page"
                  />
                  
                  <TextField
                    fullWidth
                    label="Meta Description"
                    value={pageData.meta_description}
                    onChange={(e) => handleInputChange('meta_description', e.target.value)}
                    variant="outlined"
                    multiline
                    rows={2}
                    sx={{ mb: 2 }}
                    helperText="SEO description for this page"
                  />
                </Box>

                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Content Editor
                  </Typography>
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={pageData.content}
                    onChange={(value) => handleInputChange('content', value)}
                    modules={modules}
                    formats={formats}
                    style={{ minHeight: '300px' }}
                  />
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Page Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Status:</strong> {pageData.id ? 'Published' : 'Draft'}
                  </Typography>
                  {pageData.created_at && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Created:</strong> {new Date(pageData.created_at).toLocaleDateString()}
                    </Typography>
                  )}
                  {pageData.updated_at && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Updated:</strong> {new Date(pageData.updated_at).toLocaleDateString()}
                    </Typography>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<InsertPhotoIcon />}
                    onClick={() => setImageDialogOpen(true)}
                    sx={{ mb: 2 }}
                  >
                    Insert Image
                  </Button>
                  
                  <Typography variant="body2" color="text.secondary">
                    Auto-save is enabled. Changes are saved automatically every 2 seconds.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Image Gallery Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Image Gallery</Typography>
            <IconButton onClick={() => setImageDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <Button
              variant="contained"
              startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              fullWidth
            >
              {uploading ? 'Uploading...' : 'Upload New Image'}
            </Button>
          </Box>

          <ImageList cols={isMobile ? 2 : 3} gap={8}>
            {images.map((image) => (
              <ImageListItem key={image.id}>
                <img
                  src={image.url}
                  alt={image.original_name}
                  loading="lazy"
                  style={{ 
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => insertImage(image.url)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  left: 0, 
                  right: 0, 
                  bgcolor: 'rgba(0,0,0,0.7)', 
                  color: 'white', 
                  p: 1,
                  fontSize: '0.75rem'
                }}>
                  {image.original_name}
                </Box>
              </ImageListItem>
            ))}
          </ImageList>
        </DialogContent>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={notification.severity}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PageEditor;
