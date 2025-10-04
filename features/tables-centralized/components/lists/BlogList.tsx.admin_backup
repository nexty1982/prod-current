import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Grid,
  Pagination,
  TextField,
  InputAdornment,
  Fab,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  IconSearch,
  IconPlus,
  IconHeart,
  IconMessage,
  IconEye,
  IconEdit,
  IconShare,
  IconCalendar,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PageContainer from '../../../components/container/PageContainer';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import { format } from 'date-fns';
import { socialAPI } from '../../../api/social.api';

interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  featured_image?: string;
  visibility: 'public' | 'private' | 'friends_only';
  tags: string[];
  views_count: number;
  likes_count: number;
  comments_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    first_name: string;
    last_name: string;
    profile_image?: string;
  };
}

const BlogList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'my' | 'friends'>('all');

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Social' },
    { title: 'Blog' },
  ];

  useEffect(() => {
    fetchPosts();
  }, [page, searchQuery, filter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '12',
      };
      
      if (searchQuery) params.search = searchQuery;
      if (filter !== 'all') params.filter = filter;

      const response = await socialAPI.blog.getPosts(params);
      setPosts(response.posts);
      setTotalPages(Math.ceil(response.total / 12));
      setError(null);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.response?.data?.message || 'Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      await socialAPI.blog.likePost(postId);
      // Update the post likes count
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes_count: post.likes_count + 1 }
          : post
      ));
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    const textContent = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'success';
      case 'private': return 'error';
      case 'friends_only': return 'warning';
      default: return 'default';
    }
  };

  if (loading && posts.length === 0) {
    return (
      <PageContainer title="Blog" description="Social Blog Posts">
        <Breadcrumb title="Blog" items={BCrumb} />
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Blog" description="Social Blog Posts">
      <Breadcrumb title="Blog" items={BCrumb} />
      
      <Box>
        {/* Header with search and filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <TextField
                placeholder="Search posts..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1 }}
              />
              
              <Stack direction="row" spacing={1}>
                <Button
                  variant={filter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setFilter('all')}
                  size="small"
                >
                  All Posts
                </Button>
                <Button
                  variant={filter === 'my' ? 'contained' : 'outlined'}
                  onClick={() => setFilter('my')}
                  size="small"
                >
                  My Posts
                </Button>
                <Button
                  variant={filter === 'friends' ? 'contained' : 'outlined'}
                  onClick={() => setFilter('friends')}
                  size="small"
                >
                  Friends
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Blog posts grid */}
        <Grid container spacing={3}>
          {posts.map((post) => (
            <Grid item xs={12} md={6} lg={4} key={post.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  }
                }}
                onClick={() => navigate(`/social/blog/post/${post.id}`)}
              >
                {post.featured_image && (
                  <Box
                    component="img"
                    src={post.featured_image}
                    alt={post.title}
                    sx={{
                      height: 200,
                      objectFit: 'cover',
                    }}
                  />
                )}
                
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Post header */}
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <Avatar
                      src={post.author.profile_image}
                      sx={{ width: 32, height: 32 }}
                    >
                      {post.author.first_name[0]}
                    </Avatar>
                    <Box flexGrow={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {post.author.first_name} {post.author.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <IconCalendar size={14} style={{ marginRight: 4 }} />
                        {format(new Date(post.created_at), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                    <Chip
                      label={post.visibility.replace('_', ' ')}
                      size="small"
                      color={getVisibilityColor(post.visibility) as any}
                    />
                  </Stack>

                  {/* Post title and content */}
                  <Typography variant="h6" gutterBottom>
                    {post.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {truncateContent(post.excerpt || post.content)}
                  </Typography>

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={2}>
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {post.tags.length > 3 && (
                        <Chip
                          label={`+${post.tags.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Post stats */}
                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Button
                      size="small"
                      startIcon={<IconHeart size={16} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(post.id);
                      }}
                    >
                      {post.likes_count}
                    </Button>
                    <Button size="small" startIcon={<IconMessage size={16} />}>
                      {post.comments_count}
                    </Button>
                    <Button size="small" startIcon={<IconEye size={16} />}>
                      {post.views_count}
                    </Button>
                    {user?.id === post.author.id && (
                      <Button
                        size="small"
                        startIcon={<IconEdit size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/social/blog/edit/${post.id}`);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty state */}
        {posts.length === 0 && !loading && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" mb={2}>
                No blog posts found
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {searchQuery ? 'Try adjusting your search criteria' : 'Be the first to share your thoughts!'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<IconPlus />}
                onClick={() => navigate('/social/blog/create')}
              >
                Create Post
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        )}

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="create post"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={() => navigate('/social/blog/create')}
        >
          <IconPlus />
        </Fab>
      </Box>
    </PageContainer>
  );
};

export default BlogList; 