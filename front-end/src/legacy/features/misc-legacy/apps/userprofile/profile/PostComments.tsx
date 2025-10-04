// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
  Stack,
  Avatar,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import { IconThumbUp, IconMessage2, IconShare, IconDots } from '@tabler/icons-react';
import { Comment as CommentType } from '@/types/apps/userProfile';

interface Props {
  comments: CommentType[];
  onAddComment: (content: string) => void;
  onLikeComment: (commentId: number) => void;
  onReplyToComment: (commentId: number, content: string) => void;
}

const PostComments = ({ comments, onAddComment, onLikeComment, onReplyToComment }: Props) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleReply = (commentId: number) => {
    if (replyContent.trim()) {
      onReplyToComment(commentId, replyContent.trim());
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleReplyKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (replyingTo) {
        handleReply(replyingTo);
      }
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Add Comment Section */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar
            src="/images/profile/user-1.jpg"
            alt="User"
            sx={{ width: 32, height: 32 }}
          />
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="contained"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                sx={{ borderRadius: 2 }}
              >
                Comment
              </Button>
            </Box>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Comments List */}
      <Stack spacing={2}>
        {comments.map((comment) => (
          <Box key={comment.id}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar
                src={comment.avatar || "/images/profile/user-1.jpg"}
                alt={comment.name}
                sx={{ width: 32, height: 32 }}
              />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ 
                  bgcolor: 'grey.50', 
                  p: 2, 
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {comment.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {comment.time}
                    </Typography>
                  </Stack>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {comment.content}
                  </Typography>

                  {/* Comment Actions */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton
                      size="small"
                      onClick={() => onLikeComment(comment.id)}
                      color={comment.liked ? 'primary' : 'default'}
                    >
                      <IconThumbUp size={16} />
                    </IconButton>
                    <Typography variant="caption" color="textSecondary">
                      {comment.likes}
                    </Typography>
                    
                    <IconButton
                      size="small"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    >
                      <IconMessage2 size={16} />
                    </IconButton>
                    
                    <IconButton size="small">
                      <IconShare size={16} />
                    </IconButton>
                    
                    <IconButton size="small">
                      <IconDots size={16} />
                    </IconButton>
                  </Stack>
                </Box>

                {/* Reply Section */}
                {replyingTo === comment.id && (
                  <Box sx={{ mt: 2, ml: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar
                        src="/images/profile/user-1.jpg"
                        alt="User"
                        sx={{ width: 24, height: 24 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          fullWidth
                          multiline
                          maxRows={2}
                          placeholder={`Reply to ${comment.name}...`}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyPress={handleReplyKeyPress}
                          variant="outlined"
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleReply(comment.id)}
                            disabled={!replyContent.trim()}
                          >
                            Reply
                          </Button>
                        </Box>
                      </Box>
                    </Stack>
                  </Box>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <Box sx={{ mt: 1, ml: 2 }}>
                    <Stack spacing={1}>
                      {comment.replies.map((reply) => (
                        <Box key={reply.id}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Avatar
                              src={reply.avatar || "/images/profile/user-1.jpg"}
                              alt={reply.name}
                              sx={{ width: 24, height: 24 }}
                            />
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 1.5, 
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'grey.200',
                              flex: 1
                            }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight={600} fontSize="0.75rem">
                                  {reply.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                                  {reply.time}
                                </Typography>
                              </Stack>
                              
                              <Typography variant="body2" fontSize="0.8rem" sx={{ mb: 1 }}>
                                {reply.content}
                              </Typography>

                              <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton
                                  size="small"
                                  onClick={() => onLikeComment(reply.id)}
                                  color={reply.liked ? 'primary' : 'default'}
                                  sx={{ p: 0.5 }}
                                >
                                  <IconThumbUp size={12} />
                                </IconButton>
                                <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                                  {reply.likes}
                                </Typography>
                                
                                <IconButton
                                  size="small"
                                  onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                                  sx={{ p: 0.5 }}
                                >
                                  <IconMessage2 size={12} />
                                </IconButton>
                              </Stack>
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* Load More Comments */}
      {comments.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="text" size="small" color="primary">
            Load more comments
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PostComments;
