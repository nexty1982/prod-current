import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { socialAPI } from '@/api/social.api';

interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  visibility: 'public' | 'private' | 'friends_only';
  status: 'draft' | 'published';
  tags: string[];
  featured_image_url?: string;
  is_pinned: boolean;
  user_id: number;
}

const BlogEdit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    visibility: 'public',
    status: 'draft',
    tags: [] as string[],
    featured_image_url: '',
    is_pinned: false,
  });
  
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Social' },
    { to: '/social/blog', title: 'Blog' },
    { title: 'Edit Post' },
  ];

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await socialAPI.blog.getPost(Number(id));
      const postData = response.post;
      
      // Check if user can edit this post
      if (postData.user_id !== user?.id) {
        setError('You can only edit your own blog posts');
        return;
      }
      
      setPost(postData);
      setFormData({
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt,
        visibility: postData.visibility,
        status: postData.status,
        tags: postData.tags || [],
        featured_image_url: postData.featured_image_url || '',
        is_pinned: postData.is_pinned,
      });
    } catch (err: any) {
      console.error('Error fetching post:', err);
      if (err.response?.status === 404) {
        setError('Blog post not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to edit this post');
      } else {
        setError(err.response?.data?.message || 'Failed to load blog post');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await socialAPI.blog.updatePost(Number(id), formData);
      navigate('/social/blog');
    } catch (err: any) {
      console.error('Error updating post:', err);
      setError(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await socialAPI.blog.deletePost(Number(id));
      navigate('/social/blog');
    } catch (err: any) {
      console.error('Error deleting post:', err);
      setError(err.response?.data?.message || 'Failed to delete post');
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (loading) {
    return (
      <PageContainer title="Edit Blog Post" description="Edit your blog post">
        <Breadcrumb title="Edit Blog Post" items={BCrumb} />
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Skeleton variant="text" height={40} />
              <Skeleton variant="rectangular" height={300} />
              <Skeleton variant="rectangular" height={120} />
              <Stack direction="row" spacing={2}>
                <Skeleton variant="rectangular" width={120} height={40} />
                <Skeleton variant="rectangular" width={100} height={40} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (error && !post) {
    return (
      <PageContainer title="Edit Blog Post" description="Edit your blog post">
        <Breadcrumb title="Edit Blog Post" items={BCrumb} />
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/social/blog')}>
          Back to Blog
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Edit Blog Post" description="Edit your blog post">
      <Breadcrumb title="Edit Blog Post" items={BCrumb} />
      
      <Card>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Title */}
              <TextField
                fullWidth
                label="Post Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                disabled={saving}
              />

              {/* Content */}
              <TextField
                fullWidth
                label="Content"
                multiline
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                required
                disabled={saving}
                helperText="Write your blog post content here"
              />

              {/* Excerpt */}
              <TextField
                fullWidth
                label="Excerpt (Optional)"
                multiline
                rows={3}
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                disabled={saving}
                helperText="A brief summary of your post"
              />

              {/* Visibility and Status */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Visibility</InputLabel>
                  <Select
                    value={formData.visibility}
                    label="Visibility"
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    disabled={saving}
                  >
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="friends_only">Friends Only</MenuItem>
                    <MenuItem value="private">Private</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    disabled={saving}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              {/* Featured Image URL */}
              <TextField
                fullWidth
                label="Featured Image URL (Optional)"
                value={formData.featured_image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
                disabled={saving}
                helperText="URL to an image for this post"
              />

              {/* Tags */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Tags
                </Typography>
                <Stack direction="row" spacing={1} mb={2}>
                  <TextField
                    size="small"
                    placeholder="Add a tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    disabled={saving}
                  />
                  <Button 
                    onClick={handleAddTag} 
                    variant="outlined" 
                    size="small"
                    disabled={saving}
                  >
                    Add
                  </Button>
                </Stack>
                
                {formData.tags.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {formData.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        size="small"
                        disabled={saving}
                      />
                    ))}
                  </Stack>
                )}
              </Box>

              {/* Featured */}
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
                    disabled={saving}
                  />
                }
                label="Pin this post (Featured)"
              />

              {/* Submit Buttons */}
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Stack direction="row" spacing={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} /> : null}
                  >
                    {saving ? 'Updating...' : 'Update Post'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/social/blog')}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </Stack>
                
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete Post
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default BlogEdit; 