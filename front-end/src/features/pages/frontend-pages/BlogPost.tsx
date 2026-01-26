/**
 * BlogPost Component
 * 
 * Blog post detail page for OrthodoxMetrics.
 * Displays a single blog post based on slug or id parameter.
 * 
 * Routes:
 * - /blog/:slug
 * - /frontend-pages/blog/detail/:id
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CalendarToday as CalendarIcon, Person as PersonIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';

interface BlogPostData {
  id: number;
  slug?: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
}

const BlogPost: React.FC = () => {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with actual API call to fetch blog post
    // For now, using mock data
    const fetchPost = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock blog post data
        const mockPost: BlogPostData = {
          id: id ? parseInt(id) : 1,
          slug: slug || `post-${id || 1}`,
          title: 'Getting Started with OrthodoxMetrics',
          content: `
            <p>Welcome to OrthodoxMetrics! This comprehensive guide will help you get started with managing your church records.</p>
            
            <h2>Setting Up Your Account</h2>
            <p>First, you'll need to create an account and set up your church profile. Navigate to the settings page and fill in your church information.</p>
            
            <h2>Adding Records</h2>
            <p>Once your account is set up, you can start adding records. Use the "Add Record" button to create new entries for baptisms, marriages, and other important events.</p>
            
            <h2>Using OCR</h2>
            <p>OrthodoxMetrics includes powerful OCR (Optical Character Recognition) technology that can help you digitize paper records. Simply upload scanned documents and let the system extract the information automatically.</p>
            
            <h2>Best Practices</h2>
            <ul>
              <li>Keep records organized by date</li>
              <li>Use consistent naming conventions</li>
              <li>Regularly back up your data</li>
              <li>Review records for accuracy</li>
            </ul>
            
            <p>For more information, please contact our support team or check out our other blog posts.</p>
          `,
          excerpt: 'Learn how to set up your church on OrthodoxMetrics and start managing records.',
          author: 'Admin',
          date: '2024-01-15',
          category: 'Getting Started',
        };
        
        setPost(mockPost);
        setError(null);
      } catch (err) {
        setError('Failed to load blog post. Please try again later.');
        console.error('Error fetching blog post:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Blog post not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="md">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 4 }}
        >
          Back to Blog
        </Button>

        <Paper sx={{ p: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Chip
              label={post.category}
              size="small"
              color="primary"
              sx={{ mb: 2 }}
            />
            <Typography variant="h3" gutterBottom>
              {post.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {post.author}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
          </Box>

          <Box
            sx={{
              '& h2': {
                mt: 4,
                mb: 2,
                fontSize: '1.75rem',
                fontWeight: 600,
              },
              '& h3': {
                mt: 3,
                mb: 1.5,
                fontSize: '1.5rem',
                fontWeight: 600,
              },
              '& p': {
                mb: 2,
                lineHeight: 1.8,
              },
              '& ul, & ol': {
                mb: 2,
                pl: 3,
              },
              '& li': {
                mb: 1,
                lineHeight: 1.8,
              },
            }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </Paper>
      </Container>
    </Box>
  );
};

export default BlogPost;
