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
  useMediaQuery,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  InsertPhoto as InsertPhotoIcon,
  Preview as PreviewIcon,
  Article as ArticleIcon,
  Create as CreateIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

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

interface BlogData {
  id?: number;
  author_id?: number;
  title: string;
  slug: string;
  meta_description?: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'internal' | 'church-only';
  created_at?: string;
  updated_at?: string;
  published_at?: string;
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
  contentType?: 'page' | 'blog';
  onSave?: (data: PageData | BlogData) => void;
}

const PageEditor: React.FC<PageEditorProps> = ({ 
  slug = 'new-page', 
  contentType: initialContentType = 'page',
  onSave 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  
  // State management
  const [contentType, setContentType] = useState<'page' | 'blog'>(initialContentType);
  const [activeTab, setActiveTab] = useState(0);
  
  // Page data
  const [pageData, setPageData] = useState<PageData>({
    slug,
    title: '',
    content: '',
    meta_description: ''
  });

  // Blog data
  const [blogData, setBlogData] = useState<BlogData>({
    author_id: user?.id,
    title: '',
    slug: slug === 'new-page' ? 'new-blog-post' : slug,
    meta_description: '',
    content: '',
    status: 'draft',
    visibility: 'public'
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
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

  // Get current data based on content type
  const getCurrentData = () => contentType === 'page' ? pageData : blogData;
  const setCurrentData = (field: string, value: any) => {
    if (contentType === 'page') {
      setPageData(prev => ({ ...prev, [field]: value }));
    } else {
      setBlogData(prev => ({ ...prev, [field]: value }));
    }
  };

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

  // Load data on mount
  useEffect(() => {
    if (slug && slug !== 'new-page' && slug !== 'new-blog-post') {
      loadData();
    }
    loadImages();
  }, [slug, contentType]);

  // Auto-save functionality
  useEffect(() => {
    const currentData = getCurrentData();
    if (currentData.title || currentData.content) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 3000); // Auto-save after 3 seconds
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [pageData.title, pageData.content, pageData.meta_description, blogData.title, blogData.content, blogData.meta_description, blogData.status, blogData.visibility]);

  // Load data from API
  const loadData = async () => {
    try {
      setLoading(true);
      const endpoint = contentType === 'page' ? `/api/pages/${slug}` : `/api/blogs/${slug}`;
      const response = await axios.get(endpoint);
      
      if (contentType === 'page') {
        setPageData(response.data);
      } else {
        setBlogData(response.data);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        showNotification(`Error loading ${contentType} data`, 'error');
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
    const currentData = getCurrentData();
    if (!currentData.title && !currentData.content) return;

    try {
      const endpoint = contentType === 'page' ? `/api/pages/${currentData.slug}` : `/api/blogs/${currentData.slug}`;
      await axios.put(endpoint, currentData);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Manual save function
  const handleSave = async () => {
    const currentData = getCurrentData();
    if (!currentData.title) {
      showNotification(`Please enter a ${contentType} title`, 'warning');
      return;
    }

    try {
      setSaving(true);
      const endpoint = contentType === 'page' ? `/api/pages/${currentData.slug}` : `/api/blogs/${currentData.slug}`;
      const response = await axios.put(endpoint, currentData);
      
      if (contentType === 'page') {
        setPageData(response.data);
      } else {
        setBlogData(response.data);
      }
      
      showNotification(`${contentType === 'page' ? 'Page' : 'Blog post'} saved successfully!`, 'success');
      
      if (onSave) {
        onSave(response.data);
      }
    } catch (error: any) {
      showNotification(
        error.response?.data?.error || `Error saving ${contentType}`,
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle publish for blogs
  const handlePublish = async () => {
    if (contentType !== 'blog') return;
    
    const updatedBlogData = {
      ...blogData,
      status: 'published',
      published_at: new Date().toISOString()
    };
    
    setBlogData(updatedBlogData);
    await handleSave();
    showNotification('Blog post published!', 'success');
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

  // Handle content type change
  const handleContentTypeChange = (event: React.MouseEvent<HTMLElement>, newContentType: 'page' | 'blog' | null) => {
    if (newContentType !== null) {
      setContentType(newContentType);
    }
  };

  const currentData = getCurrentData();

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          {/* Header with Content Type Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" component="h1">
                Content Editor
              </Typography>
              <ToggleButtonGroup
                value={contentType}
                exclusive
                onChange={handleContentTypeChange}
                aria-label="content type"
              >
                <ToggleButton value="page" aria-label="page">
                  <ArticleIcon sx={{ mr: 1 }} />
                  Page
                </ToggleButton>
                <ToggleButton value="blog" aria-label="blog">
                  <CreateIcon sx={{ mr: 1 }} />
                  Blog Post
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {contentType === 'blog' && blogData.status === 'draft' && (
                <Button
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={handlePublish}
                  disabled={saving}
                >
                  Publish
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                {/* Basic Information */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label={`${contentType === 'page' ? 'Page' : 'Blog Post'} Title`}
                    value={currentData.title}
                    onChange={(e) => setCurrentData('title', e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label={`${contentType === 'page' ? 'Page' : 'Blog Post'} Slug`}
                    value={currentData.slug}
                    onChange={(e) => setCurrentData('slug', e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                    helperText={`URL: /${contentType === 'page' ? 'pages' : 'blog'}/${currentData.slug}`}
                  />
                  
                  <TextField
                    fullWidth
                    label="Meta Description"
                    value={currentData.meta_description}
                    onChange={(e) => setCurrentData('meta_description', e.target.value)}
                    variant="outlined"
                    multiline
                    rows={2}
                    sx={{ mb: 2 }}
                    helperText="SEO description for this content"
                  />

                  {/* Blog-specific fields */}
                  {contentType === 'blog' && (
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={blogData.status}
                            label="Status"
                            onChange={(e) => setBlogData(prev => ({ ...prev, status: e.target.value as any }))}
                          >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="published">Published</MenuItem>
                            <MenuItem value="archived">Archived</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Visibility</InputLabel>
                          <Select
                            value={blogData.visibility}
                            label="Visibility"
                            onChange={(e) => setBlogData(prev => ({ ...prev, visibility: e.target.value as any }))}
                          >
                            <MenuItem value="public">Public</MenuItem>
                            <MenuItem value="internal">Internal</MenuItem>
                            <MenuItem value="church-only">Church Only</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  )}
                </Box>

                {/* Content Editor */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Content Editor
                  </Typography>
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={currentData.content}
                    onChange={(value) => setCurrentData('content', value)}
                    modules={modules}
                    formats={formats}
                    style={{ minHeight: '300px' }}
                  />
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                {/* Information Panel */}
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {contentType === 'page' ? 'Page' : 'Blog Post'} Information
                  </Typography>
                  
                  {contentType === 'blog' && (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Author:</strong> {user?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Status:</strong> 
                        <Chip 
                          label={blogData.status} 
                          size="small" 
                          color={blogData.status === 'published' ? 'success' : blogData.status === 'draft' ? 'warning' : 'default'}
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Visibility:</strong> {blogData.visibility}
                      </Typography>
                    </>
                  )}
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Status:</strong> {currentData.id ? 'Saved' : 'Draft'}
                  </Typography>
                  
                  {currentData.created_at && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Created:</strong> {new Date(currentData.created_at).toLocaleDateString()}
                    </Typography>
                  )}
                  {currentData.updated_at && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Updated:</strong> {new Date(currentData.updated_at).toLocaleDateString()}
                    </Typography>
                  )}
                  
                  {contentType === 'blog' && 'published_at' in currentData && currentData.published_at && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Published:</strong> {new Date(currentData.published_at).toLocaleDateString()}
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
                    Auto-save is enabled. Changes are saved automatically every 3 seconds.
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