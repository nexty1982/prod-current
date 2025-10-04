import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Divider,
  TextField,
  Stack,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Skeleton,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  IconHeart,
  IconHeartFilled,
  IconMessage,
  IconEye,
  IconEdit,
  IconShare,
  IconCalendar,
  IconDots,
  IconFlag,
  IconBookmark,
  IconBookmarkFilled,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { format } from 'date-fns';
import { socialAPI } from '@/social.api';

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
  view_count: number;
  like_count: number;
  comment_count: number;
  user_id: number;
  user_reaction?: string;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_image_url?: string;
    bio?: string;
  };
  comments: Comment[];
}

interface Comment {
  id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  can_edit: boolean;
  can_delete: boolean;
}

const REACTION_EMOJIS = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😲',
  sad: '😢',
  angry: '😠',
  pray: '🙏',
  amen: '✝️'
};

const BlogView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [reactionMenuAnchor, setReactionMenuAnchor] = useState<null | HTMLElement>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Social' },
    { to: '/social/blog', title: 'Blog' },
    { title: 'View Post' },
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
      setPost(response.post);
    } catch (err: any) {
      console.error('Error fetching post:', err);
      if (err.response?.status === 404) {
        setError('Blog post not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this post');
      } else {
        setError(err.response?.data?.message || 'Failed to load blog post');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user || !post) return;

    try {
      if (post.user_reaction === reactionType) {
        // Remove reaction if it's the same
        await socialAPI.blog.removeReaction(Number(id));
        setPost(prev => prev ? { ...prev, user_reaction: undefined } : null);
      } else {
        // Add new reaction
        await socialAPI.blog.reactToPost(Number(id), { reaction_type: reactionType });
        setPost(prev => prev ? { ...prev, user_reaction: reactionType } : null);
      }
    } catch (err) {
      console.error('Error updating reaction:', err);
    }
    
    setReactionMenuAnchor(null);
  };

  const handleAddComment = async () => {
    if (!user || !post || !commentText.trim()) return;

    try {
      setAddingComment(true);
      await socialAPI.blog.addComment(Number(id), {
        content: commentText.trim()
      });
      
      setCommentText('');
      // Refetch post to get updated comments
      await fetchPost();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  const getAuthorDisplayName = (author: BlogPost['author']) => {
    return author.display_name || `${author.first_name} ${author.last_name}`;
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'success';
      case 'private': return 'error';
      case 'friends_only': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <PageContainer title="View Blog Post" description="View blog post">
        <Breadcrumb title="View Blog Post" items={BCrumb} />
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Skeleton variant="text" height={60} />
              <Stack direction="row" spacing={2} alignItems="center">
                <Skeleton variant="circular" width={48} height={48} />
                <Box flexGrow={1}>
                  <Skeleton variant="text" width="30%" />
                  <Skeleton variant="text" width="20%" />
                </Box>
              </Stack>
              <Skeleton variant="rectangular" height={400} />
              <Skeleton variant="text" height={100} />
            </Stack>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (error || !post) {
    return (
      <PageContainer title="View Blog Post" description="View blog post">
        <Breadcrumb title="View Blog Post" items={BCrumb} />
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Post not found'}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/social/blog')}>
          Back to Blog
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={post.title} description={post.excerpt}>
      <Breadcrumb title="View Blog Post" items={BCrumb} />
      
      <Stack spacing={3}>
        {/* Main Blog Post */}
        <Card>
          <CardContent>
            {/* Post Header */}
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <Chip
                    label={post.visibility.replace('_', ' ')}
                    size="small"
                    color={getVisibilityColor(post.visibility) as any}
                  />
                  {post.is_pinned && (
                    <Chip label="Featured" size="small" color="primary" />
                  )}
                  <Chip label={post.status} size="small" variant="outlined" />
                </Stack>
                
                <Typography variant="h3" gutterBottom>
                  {post.title}
                </Typography>
              </Box>

              {/* Author and Meta Info */}
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={post.author.profile_image_url}
                  sx={{ width: 48, height: 48 }}
                >
                  {post.author.first_name[0]}
                </Avatar>
                <Box flexGrow={1}>
                  <Typography variant="h6">
                    {getAuthorDisplayName(post.author)}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      <IconCalendar size={14} style={{ marginRight: 4 }} />
                      {format(new Date(post.created_at), 'MMMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <IconEye size={14} style={{ marginRight: 4 }} />
                      {post.view_count} views
                    </Typography>
                  </Stack>
                </Box>
                
                {/* Action Buttons */}
                <Stack direction="row" spacing={1}>
                  {user?.id === post.user_id && (
                    <Tooltip title="Edit Post">
                      <IconButton onClick={() => navigate(`/social/blog/edit/${post.id}`)}>
                        <IconEdit size={20} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Share">
                    <IconButton onClick={handleShare}>
                      <IconShare size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Bookmark">
                    <IconButton onClick={() => setIsBookmarked(!isBookmarked)}>
                      {isBookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {/* Featured Image */}
              {post.featured_image_url && (
                <Box
                  component="img"
                  src={post.featured_image_url}
                  alt={post.title}
                  sx={{
                    width: '100%',
                    maxHeight: 400,
                    objectFit: 'cover',
                    borderRadius: 1,
                  }}
                />
              )}

              {/* Post Content */}
              <Typography 
                variant="body1" 
                component="div"
                sx={{ 
                  lineHeight: 1.8,
                  '& p': { mb: 2 },
                  '& h1, & h2, & h3': { mt: 3, mb: 2 },
                }}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Tags */}
              {post.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {post.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={`#${tag}`}
                      size="small"
                      variant="outlined"
                      clickable
                    />
                  ))}
                </Stack>
              )}

              <Divider />

              {/* Reactions and Actions */}
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  startIcon={
                    post.user_reaction ? 
                    <span>{REACTION_EMOJIS[post.user_reaction as keyof typeof REACTION_EMOJIS]}</span> :
                    <IconHeart size={18} />
                  }
                  onClick={(e) => setReactionMenuAnchor(e.currentTarget)}
                  variant={post.user_reaction ? 'contained' : 'outlined'}
                  size="small"
                >
                  React
                </Button>
                
                <Button
                  startIcon={<IconMessage size={18} />}
                  variant="outlined"
                  size="small"
                  onClick={() => document.getElementById('comment-section')?.scrollIntoView()}
                >
                  {post.comments.length} Comments
                </Button>
                
                <Typography variant="body2" color="text.secondary">
                  {post.view_count} views
                </Typography>

                {/* Reaction Menu */}
                <Menu
                  anchorEl={reactionMenuAnchor}
                  open={Boolean(reactionMenuAnchor)}
                  onClose={() => setReactionMenuAnchor(null)}
                >
                  {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                    <MenuItem
                      key={type}
                      onClick={() => handleReaction(type)}
                      selected={post.user_reaction === type}
                    >
                      <Typography variant="body2">
                        {emoji} {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card id="comment-section">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Comments ({post.comments.length})
            </Typography>

            {/* Add Comment */}
            {user && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Stack direction="row" spacing={2}>
                  <Avatar src={user.profile_image_url} sx={{ width: 32, height: 32 }}>
                    {user.first_name?.[0]}
                  </Avatar>
                  <Box flexGrow={1}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      disabled={addingComment}
                    />
                    <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setCommentText('')}
                        disabled={addingComment}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || addingComment}
                        startIcon={addingComment ? <CircularProgress size={16} /> : null}
                      >
                        {addingComment ? 'Adding...' : 'Comment'}
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* Comments List */}
            <Stack spacing={2}>
              {post.comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                  No comments yet. Be the first to comment!
                </Typography>
              ) : (
                post.comments.map((comment) => (
                  <Paper key={comment.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2}>
                      <Avatar 
                        src={comment.profile_image_url} 
                        sx={{ width: 36, height: 36 }}
                      >
                        {comment.first_name[0]}
                      </Avatar>
                      <Box flexGrow={1}>
                        <Typography variant="body2" fontWeight={600}>
                          {comment.display_name || `${comment.first_name} ${comment.last_name}`}
                          <Typography component="span" variant="caption" color="text.secondary" ml={1}>
                            {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </Typography>
                        <Typography variant="body2" mt={1}>
                          {comment.content}
                        </Typography>
                      </Box>
                      {(comment.can_edit || comment.can_delete) && (
                        <IconButton size="small">
                          <IconDots size={16} />
                        </IconButton>
                      )}
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
};

export default BlogView; 