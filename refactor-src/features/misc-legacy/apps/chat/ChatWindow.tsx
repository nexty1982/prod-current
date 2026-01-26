/**
 * Orthodox Metrics - Enhanced Chat Window Component
 * Comprehensive chat interface with messages, reactions, editing, and real-time features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Button,
  TextField,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Zoom,
  Skeleton,
  Alert,
  CircularProgress,
  Popper,
  ClickAwayListener,
  Grow,
  LinearProgress,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  EmojiEmotions as EmojiIcon,
  ThumbUp as ThumbUpIcon,
  Favorite as FavoriteIcon,
  Phone as PhoneIcon,
  VideoCall as VideoCallIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  DoneAll as DoneAllIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import Scrollbar from '@/custom-scroll/Scrollbar';
import MessageInput from './MessageInput';
import { useTheme } from '@/context/ThemeContext';

interface Message {
  id: number;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system' | 'emoji';
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  reply_to?: {
    id: number;
    content: string;
    sender_name: string;
  };
  reactions: Record<string, { count: number; users: string[]; user_reacted: boolean }>;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
  can_delete: boolean;
  metadata?: any;
}

interface Conversation {
  id: number;
  type: 'direct' | 'group';
  name?: string;
  display_name: string;
  avatar_url?: string;
  other_participant?: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_image_url?: string;
    is_online: boolean;
    last_seen?: string;
  };
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
}

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  wsRef: React.MutableRefObject<WebSocket | null>;
  onMessageSent: () => void;
  onClose?: () => void;
}

const REACTION_EMOJIS = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😲',
  sad: '😢',
  angry: '😠',
  pray: '🙏',
  amen: '✝️',
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUser,
  wsRef,
  onMessageSent,
  onClose,
}) => {
  const { themeConfig } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [reactionAnchor, setReactionAnchor] = useState<{ element: HTMLElement; messageId: number } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation) {
      loadMessages();
    }
  }, [conversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!wsRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'new_message':
            if (data.message.conversation_id === conversation.id) {
              setMessages(prev => [...prev, data.message]);
            }
            break;
          case 'message_edited':
            if (data.message.conversation_id === conversation.id) {
              setMessages(prev => prev.map(msg => 
                msg.id === data.message.id ? { ...msg, ...data.message } : msg
              ));
            }
            break;
          case 'message_deleted':
            if (data.conversation_id === conversation.id) {
              setMessages(prev => prev.map(msg => 
                msg.id === data.message_id 
                  ? { ...msg, is_deleted: true, content: '[Message deleted]' }
                  : msg
              ));
            }
            break;
          case 'reaction_added':
            if (data.conversation_id === conversation.id) {
              setMessages(prev => prev.map(msg => 
                msg.id === data.message_id 
                  ? { ...msg, reactions: data.reactions }
                  : msg
              ));
            }
            break;
          case 'user_typing':
            if (data.conversation_id === conversation.id && data.user_id !== currentUser.id) {
              if (data.is_typing) {
                setTypingUsers(prev => [...prev.filter(u => u !== data.user_name), data.user_name]);
              } else {
                setTypingUsers(prev => prev.filter(u => u !== data.user_name));
              }
            }
            break;
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    wsRef.current.addEventListener('message', handleMessage);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.removeEventListener('message', handleMessage);
      }
    };
  }, [conversation.id, currentUser.id, wsRef]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/social/chat/conversations/${conversation.id}/messages?limit=50`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, type: 'text' | 'image' | 'file' = 'text', metadata?: any) => {
    if (!content.trim() && type === 'text') return;

    try {
      setSending(true);
      setError(null);

      const response = await fetch(`/api/social/chat/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content,
          message_type: type,
          reply_to_id: replyingTo?.id,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      if (data.success) {
        setReplyingTo(null);
        onMessageSent();
        
        // Send via WebSocket for real-time delivery
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'send_message',
            conversation_id: conversation.id,
            message_id: data.message_id,
          }));
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const editMessage = async (messageId: number, newContent: string) => {
    try {
      const response = await fetch(`/api/social/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      setEditingMessage(null);
      setEditText('');
      
      // The WebSocket will handle the update
    } catch (err) {
      console.error('Error editing message:', err);
      setError('Failed to edit message');
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/social/chat/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      
      // The WebSocket will handle the update
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    }
  };

  const addReaction = async (messageId: number, reactionType: string) => {
    try {
      const response = await fetch(`/api/social/chat/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reaction_type: reactionType }),
      });

      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }
      
      // The WebSocket will handle the update
    } catch (err) {
      console.error('Error adding reaction:', err);
      setError('Failed to add reaction');
    }
  };

  const removeReaction = async (messageId: number) => {
    try {
      const response = await fetch(`/api/social/chat/messages/${messageId}/react`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }
      
      // The WebSocket will handle the update
    } catch (err) {
      console.error('Error removing reaction:', err);
      setError('Failed to remove reaction');
    }
  };

  const handleTyping = useCallback((isTyping: boolean) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversation.id,
        is_typing: isTyping,
      }));
    }

    if (isTyping) {
      setIsTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'typing',
            conversation_id: conversation.id,
            is_typing: false,
          }));
        }
      }, 3000);
    } else {
      setIsTyping(false);
    }
  }, [conversation.id, wsRef]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const renderMessageAvatar = (message: Message) => (
    <Avatar
      src={message.sender_avatar}
      alt={message.sender_name}
      sx={{ width: 32, height: 32 }}
    >
      {message.sender_name.charAt(0).toUpperCase()}
    </Avatar>
  );

  const renderReactions = (message: Message) => {
    const reactions = Object.entries(message.reactions || {});
    if (reactions.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
        {reactions.map(([type, data]) => (
          <Chip
            key={type}
            label={`${REACTION_EMOJIS[type as keyof typeof REACTION_EMOJIS]} ${data.count}`}
            size="small"
            variant={data.user_reacted ? 'filled' : 'outlined'}
            color={data.user_reacted ? 'primary' : 'default'}
            onClick={() => {
              if (data.user_reacted) {
                removeReaction(message.id);
              } else {
                addReaction(message.id, type);
              }
            }}
            sx={{
              height: 24,
              fontSize: '0.75rem',
              cursor: 'pointer',
              '&:hover': { transform: 'scale(1.05)' },
            }}
          />
        ))}
      </Box>
    );
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.sender_id === currentUser.id;
    const isEditing = editingMessage === message.id;
    const showAvatar = index === 0 || 
                      messages[index - 1]?.sender_id !== message.sender_id ||
                      new Date(message.created_at).getTime() - new Date(messages[index - 1]?.created_at).getTime() > 300000; // 5 minutes

    return (
      <Fade in={true} key={message.id} timeout={300}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: isOwnMessage ? 'row-reverse' : 'row',
            gap: 1,
            mb: 1,
            mx: 1,
          }}
        >
          {/* Avatar */}
          <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
            {showAvatar && !isOwnMessage && renderMessageAvatar(message)}
          </Box>

          {/* Message Content */}
          <Box
            sx={{
              maxWidth: '70%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
            }}
          >
            {/* Sender Name & Time */}
            {showAvatar && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 0.5,
                  flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {isOwnMessage ? 'You' : message.sender_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatMessageTime(message.created_at)}
                </Typography>
              </Box>
            )}

            {/* Reply Reference */}
            {message.reply_to && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  mb: 0.5,
                  backgroundColor: 'action.hover',
                  borderLeft: 3,
                  borderLeftColor: 'primary.main',
                  maxWidth: '100%',
                }}
              >
                <Typography variant="caption" color="primary.main" fontWeight={600}>
                  Replying to {message.reply_to.sender_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {message.reply_to.content}
                </Typography>
              </Paper>
            )}

            {/* Message Bubble */}
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                backgroundColor: isOwnMessage ? 'primary.main' : 'background.paper',
                color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                borderRadius: 2,
                borderTopRightRadius: isOwnMessage ? 0.5 : 2,
                borderTopLeftRadius: isOwnMessage ? 2 : 0.5,
                position: 'relative',
                minWidth: 60,
                '&:hover .message-actions': {
                  opacity: 1,
                },
              }}
            >
              {isEditing ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    size="small"
                    autoFocus
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingMessage(null);
                        setEditText('');
                      }}
                    >
                      <CancelIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => editMessage(message.id, editText)}
                      disabled={!editText.trim()}
                    >
                      <SaveIcon />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <>
                  <Typography variant="body1">
                    {message.is_deleted ? (
                      <em style={{ opacity: 0.6 }}>[Message deleted]</em>
                    ) : (
                      message.content
                    )}
                  </Typography>
                  
                  {message.is_edited && !message.is_deleted && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      (edited)
                    </Typography>
                  )}
                </>
              )}

              {/* Message Actions */}
              {!isEditing && !message.is_deleted && (
                <Box
                  className="message-actions"
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: isOwnMessage ? 'auto' : -40,
                    left: isOwnMessage ? -40 : 'auto',
                    display: 'flex',
                    gap: 0.5,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    backgroundColor: 'background.paper',
                    borderRadius: 1,
                    boxShadow: 1,
                    p: 0.5,
                  }}
                >
                  <Tooltip title="Add Reaction">
                    <IconButton
                      size="small"
                      onClick={(e) => setReactionAnchor({ element: e.currentTarget, messageId: message.id })}
                    >
                      <EmojiIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Reply">
                    <IconButton
                      size="small"
                      onClick={() => setReplyingTo(message)}
                    >
                      <ReplyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="More">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setSelectedMessage(message);
                        setMenuAnchor(e.currentTarget);
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Paper>

            {/* Reactions */}
            {renderReactions(message)}

            {/* Read Receipt */}
            {isOwnMessage && index === messages.length - 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <DoneAllIcon fontSize="small" color="primary" />
                <Typography variant="caption" color="text.secondary">
                  Read
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Fade>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 24, height: 24 }}>
          <Typography variant="caption">...</Typography>
        </Avatar>
        <Typography variant="body2" color="text.secondary">
          {typingUsers.length === 1
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.join(', ')} are typing...`
          }
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: 'text.secondary',
                animation: 'pulse 1.4s infinite',
                animationDelay: `${i * 0.2}s`,
                '@keyframes pulse': {
                  '0%, 60%, 100%': { opacity: 0.3 },
                  '30%': { opacity: 1 },
                },
              }}
            />
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge
            color={conversation.other_participant?.is_online ? 'success' : 'default'}
            variant="dot"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            overlap="circular"
            invisible={conversation.type === 'group'}
          >
            <Avatar
              src={conversation.avatar_url || conversation.other_participant?.profile_image_url}
              sx={{ width: 40, height: 40 }}
            >
              {conversation.display_name.charAt(0).toUpperCase()}
            </Avatar>
          </Badge>
          
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {conversation.display_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {conversation.type === 'direct' && conversation.other_participant?.is_online
                ? 'Online now'
                : conversation.type === 'direct' && conversation.other_participant?.last_seen
                  ? `Last seen ${formatDistanceToNow(new Date(conversation.other_participant.last_seen))} ago`
                  : conversation.type === 'group'
                    ? 'Group conversation'
                    : 'Offline'
              }
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Voice Call">
            <IconButton>
              <PhoneIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Video Call">
            <IconButton>
              <VideoCallIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Conversation Info">
            <IconButton>
              <InfoIcon />
            </IconButton>
          </Tooltip>
          
          {onClose && (
            <Tooltip title="Close">
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Messages Container */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Scrollbar sx={{ flexGrow: 1 }}>
          <Box sx={{ p: 1, minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {loading ? (
              <Box sx={{ p: 2 }}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" height={20} />
                      <Skeleton variant="rectangular" width="80%" height={40} sx={{ borderRadius: 2 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Start the conversation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Send a message to start chatting with your Orthodox community.
                </Typography>
              </Box>
            ) : (
              <>
                {messages.map((message, index) => renderMessage(message, index))}
                {renderTypingIndicator()}
              </>
            )}
            <div ref={messagesEndRef} />
          </Box>
        </Scrollbar>
      </Box>

      {/* Reply Preview */}
      {replyingTo && (
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            mx: 1,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'action.hover',
            borderLeft: 3,
            borderLeftColor: 'primary.main',
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="primary.main" fontWeight={600}>
              Replying to {replyingTo.sender_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {replyingTo.content}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setReplyingTo(null)}
          >
            <CloseIcon />
          </IconButton>
        </Paper>
      )}

      {/* Message Input */}
      <MessageInput
        onSendMessage={sendMessage}
        onTyping={handleTyping}
        disabled={sending}
        placeholder={`Message ${conversation.display_name}...`}
      />

      {/* Message Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor && !!selectedMessage}
        onClose={() => {
          setMenuAnchor(null);
          setSelectedMessage(null);
        }}
      >
        <MenuItem
          onClick={() => {
            setReplyingTo(selectedMessage);
            setMenuAnchor(null);
            setSelectedMessage(null);
          }}
        >
          <ReplyIcon sx={{ mr: 1 }} />
          Reply
        </MenuItem>
        
        <MenuItem
          onClick={() => {
            navigator.clipboard.writeText(selectedMessage?.content || '');
            setMenuAnchor(null);
            setSelectedMessage(null);
          }}
        >
          <CopyIcon sx={{ mr: 1 }} />
          Copy Text
        </MenuItem>
        
        {selectedMessage?.can_edit && (
          <MenuItem
            onClick={() => {
              setEditingMessage(selectedMessage.id);
              setEditText(selectedMessage.content);
              setMenuAnchor(null);
              setSelectedMessage(null);
            }}
          >
            <EditIcon sx={{ mr: 1 }} />
            Edit Message
          </MenuItem>
        )}
        
        {selectedMessage?.can_delete && (
          <MenuItem
            onClick={() => {
              deleteMessage(selectedMessage.id);
              setMenuAnchor(null);
              setSelectedMessage(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Message
          </MenuItem>
        )}
      </Menu>

      {/* Reaction Picker */}
      <Popper
        open={!!reactionAnchor}
        anchorEl={reactionAnchor?.element}
        placement="top"
        transition
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper
              elevation={3}
              sx={{
                p: 1,
                display: 'flex',
                gap: 0.5,
                backgroundColor: 'background.paper',
                borderRadius: 3,
              }}
            >
              <ClickAwayListener onClickAway={() => setReactionAnchor(null)}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                    <IconButton
                      key={type}
                      size="small"
                      onClick={() => {
                        if (reactionAnchor) {
                          addReaction(reactionAnchor.messageId, type);
                        }
                        setReactionAnchor(null);
                      }}
                      sx={{
                        fontSize: '1.2rem',
                        '&:hover': { transform: 'scale(1.2)' },
                      }}
                    >
                      {emoji}
                    </IconButton>
                  ))}
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Box>
  );
};

export default ChatWindow; 