import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Avatar,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Visibility as VisibilityIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  meta_description: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'internal' | 'church-only';
  author_name: string;
  author_email: string;
  created_at: string;
  updated_at: string;
  published_at: string;
}

interface BlogFeedProps {
  visibility?: 'public' | 'internal' | 'church-only';
  showInternalPosts?: boolean;
}

const BlogFeed: React.FC<BlogFeedProps> = ({ 
  visibility = 'public',
  showInternalPosts = false 
}) => {
  const navigate = useNavigate();
  
  // State management
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const postsPerPage = 6;

  // Load blog posts
  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: 'published',
        visibility: showInternalPosts ? 'all' : visibility,
        page: currentPage.toString(),
        limit: postsPerPage.toString(),
        sort: sortBy,
        order: sortOrder
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await axios.get(`/api/blogs?${params}`);
      setPosts(response.data.blogs);
      setTotalPages(response.data.pagination.totalPages);
      setTotalPosts(response.data.pagination.total);
    } catch (error: any) {
      console.error('Error loading blog posts:', error);
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  // Load posts when filters change
  useEffect(() => {
    loadPosts();
  }, [currentPage, sortBy, sortOrder, searchTerm, visibility, showInternalPosts]);

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  // Navigate to blog post
  const handleReadMore = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  // Extract text content from HTML
  const getTextContent = (html: string, maxLength: number = 150) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get visibility chip color
  const getVisibilityColor = (vis: string) => {
    switch (vis) {
      case 'public': return 'success';
      case 'internal': return 'warning';
      case 'church-only': return 'info';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Blog Posts
        </Typography>
        <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Discover insights, updates, and stories from our community
        </Typography>

        {/* Search and Filters */}
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search blog posts..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <MenuItem value="created_at">Date Created</MenuItem>
                <MenuItem value="published_at">Date Published</MenuItem>
                <MenuItem value="title">Title</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Order</InputLabel>
              <Select
                value={sortOrder}
                label="Order"
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="DESC">Newest First</MenuItem>
                <MenuItem value="ASC">Oldest First</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Posts Grid */}
      {!loading && !error && (
        <>
          {posts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ArticleIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                No blog posts found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Check back later for new content.'}
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                {totalPosts} post{totalPosts !== 1 ? 's' : ''} found
              </Typography>
              
              <Grid container spacing={4}>
                {posts.map((post) => (
                  <Grid item xs={12} md={6} lg={4} key={post.id}>
                    <Card 
                      sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: (theme) => theme.shadows[8]
                        }
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        {/* Author and Date */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {post.author_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(post.published_at || post.created_at)}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Title */}
                        <Typography variant="h6" component="h2" gutterBottom>
                          {post.title}
                        </Typography>

                        {/* Meta Description or Content Preview */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {post.meta_description || getTextContent(post.content)}
                        </Typography>

                        {/* Visibility Chip */}
                        {showInternalPosts && (
                          <Chip
                            label={post.visibility.replace('-', ' ')}
                            size="small"
                            color={getVisibilityColor(post.visibility) as any}
                            sx={{ mb: 1 }}
                          />
                        )}
                      </CardContent>

                      <Divider />

                      <CardActions sx={{ p: 2 }}>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleReadMore(post.slug)}
                          sx={{ ml: 'auto' }}
                        >
                          Read More
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default BlogFeed; 