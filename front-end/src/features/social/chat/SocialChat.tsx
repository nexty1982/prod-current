import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  TextField,
  IconButton,
  Stack,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Paper,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Skeleton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  IconSend,
  IconMoodSmile,
  IconPaperclip,
  IconDots,
  IconEdit,
  IconTrash,
  IconReply,
  IconCheck,
  IconX,
  IconSearch,
  IconPlus,
  IconMessage,
  IconUsers,
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useWebSocket } from '../../../context/WebSocketContext';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { socialAPI } from '../../../api/social.api';

interface Conversation {
  id: number;
  type: 'direct' | 'group';
  name?: string;
  avatar_url?: string;
  last_activity: string;
  last_message_content?: string;
  last_message_time?: string;
  last_message_sender_id?: number;
  last_message_sender_name?: string;
  last_read_at?: string;
  unread_count: number;
  other_participant?: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_image_url?: string;
    is_online: boolean;
    last_seen: string;
  };
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'image' | 'file';
  reply_to_id?: number;
  reactions?: Record<string, number>;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_image_url?: string;
  };
  reply_to?: Message;
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

const SocialChat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isConnected,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    onNewMessage,
    onUserTyping,
    onFriendPresenceUpdate,
  } = useWebSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message actions
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [reactionMenuAnchor, setReactionMenuAnchor] = useState<{
    element: HTMLElement;
    messageId: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Social' },
    { title: 'Chat' },
  ];

  useEffect(() => {
    fetchConversations();
    
    // Handle conversation ID from navigation state (from FriendsList)
    const conversationId = location.state?.conversationId;
    if (conversationId) {
      selectConversationById(conversationId);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      markConversationAsRead();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join/leave WebSocket conversation rooms
  useEffect(() => {
    if (!selectedConversation || !isConnected) return;

    joinConversation(selectedConversation.id);

    return () => {
      leaveConversation(selectedConversation.id);
    };
  }, [selectedConversation?.id, isConnected, joinConversation, leaveConversation]);

  // Listen for incoming messages via WebSocket
  useEffect(() => {
    const cleanup = onNewMessage((message: any) => {
      const currentConv = selectedConversationRef.current;

      // Update conversation list with latest message
      setConversations(prev => prev.map(conv =>
        conv.id === message.conversation_id
          ? {
              ...conv,
              last_message_content: message.content,
              last_message_time: message.created_at,
              last_message_sender_id: message.sender_id,
              last_message_sender_name: message.sender?.display_name || `${message.sender?.first_name || ''} ${message.sender?.last_name || ''}`.trim(),
              last_activity: message.created_at,
              unread_count: currentConv?.id === message.conversation_id ? conv.unread_count : conv.unread_count + 1,
            }
          : conv
      ));

      // If this message is for the currently selected conversation, add it
      if (currentConv && message.conversation_id === currentConv.id) {
        // Don't add duplicates (e.g. if we sent it ourselves via REST)
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Clear typing indicator for this sender
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(message.sender_id);
          return next;
        });
      }
    });

    return cleanup;
  }, [onNewMessage]);

  // Listen for typing indicators
  useEffect(() => {
    const cleanup = onUserTyping((data: any) => {
      const currentConv = selectedConversationRef.current;
      if (!currentConv || data.conversationId !== currentConv.id) return;
      if (data.userId === user?.id) return;

      setTypingUsers(prev => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.userId, data.displayName || 'Someone');
          // Auto-clear after 5s in case stop event is missed
          setTimeout(() => {
            setTypingUsers(p => {
              const n = new Map(p);
              n.delete(data.userId);
              return n;
            });
          }, 5000);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    return cleanup;
  }, [onUserTyping, user?.id]);

  // Listen for friend presence updates
  useEffect(() => {
    const cleanup = onFriendPresenceUpdate((data: any) => {
      setConversations(prev => prev.map(conv => {
        if (conv.other_participant?.id === data.userId) {
          return {
            ...conv,
            other_participant: {
              ...conv.other_participant,
              is_online: data.isOnline,
              last_seen: data.lastSeen || conv.other_participant.last_seen,
            },
          };
        }
        return conv;
      }));

      // Also update selected conversation
      setSelectedConversation(prev => {
        if (prev?.other_participant?.id === data.userId) {
          return {
            ...prev,
            other_participant: {
              ...prev.other_participant,
              is_online: data.isOnline,
              last_seen: data.lastSeen || prev.other_participant.last_seen,
            },
          };
        }
        return prev;
      });
    });

    return cleanup;
  }, [onFriendPresenceUpdate]);

  // Handle typing emission
  const handleTypingStart = useCallback(() => {
    if (!selectedConversation || !isConnected) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(selectedConversation.id);
    }

    // Reset the stop-typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConversation) {
        stopTyping(selectedConversation.id);
      }
      isTypingRef.current = false;
    }, 2000);
  }, [selectedConversation, isConnected, startTyping, stopTyping]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await socialAPI.chat.getConversations();
      setConversations(response.conversations || []);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    try {
      const response = await socialAPI.chat.getMessages(selectedConversation.id);
      setMessages(response.messages || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
    }
  };

  const selectConversationById = async (conversationId: number) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
    } else {
      // Fetch conversation details if not in list
      try {
        const response = await socialAPI.chat.getConversation(conversationId);
        const conv = response.conversation;
        setSelectedConversation(conv);
        setConversations(prev => [conv, ...prev.filter(c => c.id !== conversationId)]);
      } catch (err) {
        console.error('Error fetching conversation:', err);
      }
    }
  };

  const markConversationAsRead = async () => {
    if (!selectedConversation) return;

    try {
      await socialAPI.chat.markAsRead(selectedConversation.id);
      
      // Update local state
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, unread_count: 0, last_read_at: new Date().toISOString() }
          : conv
      ));
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !messageText.trim()) return;

    // Stop typing indicator when sending
    if (isTypingRef.current) {
      stopTyping(selectedConversation.id);
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }

    try {
      setSendingMessage(true);

      const response = await socialAPI.chat.sendMessage(selectedConversation.id, {
        content: messageText.trim(),
        message_type: 'text'
      });

      const newMessage = response.message;
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
      
      // Update conversation list
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { 
              ...conv, 
              last_message_content: messageText.trim(),
              last_message_time: new Date().toISOString(),
              last_message_sender_id: user?.id,
              last_activity: new Date().toISOString()
            }
          : conv
      ));
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const editMessage = async (messageId: number, newContent: string) => {
    try {
      await socialAPI.chat.editMessage(messageId, {
        content: newContent
      });

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent, is_edited: true }
          : msg
      ));
      
      setEditingMessage(null);
      setEditText('');
    } catch (err: any) {
      console.error('Error editing message:', err);
      setError(err.response?.data?.message || 'Failed to edit message');
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      await socialAPI.chat.deleteMessage(messageId);
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: 'This message was deleted', is_deleted: true }
          : msg
      ));
    } catch (err: any) {
      console.error('Error deleting message:', err);
      setError(err.response?.data?.message || 'Failed to delete message');
    }
  };

  const reactToMessage = async (messageId: number, reactionType: string) => {
    try {
      await socialAPI.chat.reactToMessage(messageId, {
        reaction_type: reactionType
      });

      // Update local state (simplified - in real app you'd track user reactions)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              reactions: { 
                ...msg.reactions, 
                [reactionType]: (msg.reactions?.[reactionType] || 0) + 1 
              }
            }
          : msg
      ));
      
      setReactionMenuAnchor(null);
    } catch (err: any) {
      console.error('Error reacting to message:', err);
      setError(err.response?.data?.message || 'Failed to react to message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getConversationDisplayName = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    if (conversation.other_participant) {
      const participant = conversation.other_participant;
      return participant.display_name || `${participant.first_name} ${participant.last_name}`;
    }
    
    return 'Direct Chat';
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.avatar_url;
    }
    
    return conversation.other_participant?.profile_image_url;
  };

  const getMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd HH:mm');
    }
  };

  const getLastActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    searchQuery === '' || 
    getConversationDisplayName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer title="Chat" description="Chat with friends">
      <Breadcrumb title="Chat" items={BCrumb} />
      
      <Card sx={{ height: 'calc(100vh - 200px)', display: 'flex' }}>
        {/* Conversations Sidebar */}
        <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          {/* Search Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <IconSearch size={18} style={{ marginRight: 8 }} />,
              }}
            />
          </Box>

          {/* Conversations List */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {loading ? (
              <List>
                {[...Array(5)].map((_, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Skeleton variant="circular" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Skeleton variant="text" width="60%" />}
                      secondary={<Skeleton variant="text" width="80%" />}
                    />
                  </ListItem>
                ))}
              </List>
            ) : filteredConversations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <IconMessage size={48} color="lightgray" />
                <Typography variant="body2" color="text.secondary" mt={2}>
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </Typography>
                {!searchQuery && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconUsers size={16} />}
                    onClick={() => navigate('/social/friends')}
                    sx={{ mt: 2 }}
                  >
                    Find Friends
                  </Button>
                )}
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredConversations.map((conversation) => (
                  <ListItemButton
                    key={conversation.id}
                    selected={selectedConversation?.id === conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    sx={{ py: 2, px: 2 }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          conversation.other_participant?.is_online && (
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: 'success.main',
                                border: '2px solid white',
                              }}
                            />
                          )
                        }
                      >
                        <Avatar
                          src={getConversationAvatar(conversation)}
                          sx={{ width: 48, height: 48 }}
                        >
                          {getConversationDisplayName(conversation)[0]}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" noWrap>
                            {getConversationDisplayName(conversation)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {conversation.last_message_time && getLastActivityTime(conversation.last_message_time)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ flexGrow: 1 }}>
                            {conversation.last_message_content || 'No messages yet'}
                          </Typography>
                          {conversation.unread_count > 0 && (
                            <Chip
                              label={conversation.unread_count}
                              size="small"
                              color="primary"
                              sx={{ ml: 1, minWidth: 20, height: 20, fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={getConversationAvatar(selectedConversation)}
                    sx={{ width: 40, height: 40 }}
                  >
                    {getConversationDisplayName(selectedConversation)[0]}
                  </Avatar>
                  <Box flexGrow={1}>
                    <Typography variant="h6">
                      {getConversationDisplayName(selectedConversation)}
                    </Typography>
                    {selectedConversation.other_participant && (
                      <Typography variant="caption" color="text.secondary">
                        {selectedConversation.other_participant.is_online 
                          ? 'Online' 
                          : `Last seen ${formatDistanceToNow(new Date(selectedConversation.other_participant.last_seen))} ago`
                        }
                      </Typography>
                    )}
                  </Box>
                  <IconButton>
                    <IconDots size={20} />
                  </IconButton>
                </Stack>
              </Box>

              {/* Messages Area */}
              <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <Stack spacing={2}>
                  {messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Box sx={{ maxWidth: '70%' }}>
                        {message.sender_id !== user?.id && (
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Avatar
                              src={message.sender.profile_image_url}
                              sx={{ width: 24, height: 24 }}
                            >
                              {message.sender.first_name[0]}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {message.sender.display_name || `${message.sender.first_name} ${message.sender.last_name}`}
                            </Typography>
                          </Stack>
                        )}
                        
                        <Paper
                          sx={{
                            p: 1.5,
                            bgcolor: message.sender_id === user?.id ? 'primary.main' : 'grey.100',
                            color: message.sender_id === user?.id ? 'primary.contrastText' : 'text.primary',
                            position: 'relative',
                          }}
                        >
                          {editingMessage === message.id ? (
                            <Stack spacing={1}>
                              <TextField
                                fullWidth
                                multiline
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                size="small"
                              />
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setEditingMessage(null);
                                    setEditText('');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => editMessage(message.id, editText)}
                                >
                                  Save
                                </Button>
                              </Stack>
                            </Stack>
                          ) : (
                            <>
                              <Typography variant="body2">
                                {message.is_deleted ? (
                                  <em style={{ opacity: 0.7 }}>This message was deleted</em>
                                ) : (
                                  message.content
                                )}
                                {message.is_edited && !message.is_deleted && (
                                  <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                                    (edited)
                                  </Typography>
                                )}
                              </Typography>
                              
                              <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5}>
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                  {getMessageTime(message.created_at)}
                                </Typography>
                                
                                {message.sender_id === user?.id && !message.is_deleted && (
                                  <Stack direction="row" spacing={0.5}>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setEditingMessage(message.id);
                                        setEditText(message.content);
                                      }}
                                    >
                                      <IconEdit size={14} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => deleteMessage(message.id)}
                                    >
                                      <IconTrash size={14} />
                                    </IconButton>
                                  </Stack>
                                )}
                              </Stack>

                              {/* Reactions */}
                              {message.reactions && Object.keys(message.reactions).length > 0 && (
                                <Stack direction="row" spacing={0.5} mt={1}>
                                  {Object.entries(message.reactions).map(([type, count]) => (
                                    <Chip
                                      key={type}
                                      label={`${REACTION_EMOJIS[type as keyof typeof REACTION_EMOJIS]} ${count}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                </Stack>
                              )}
                            </>
                          )}

                          {/* Message Actions Menu */}
                          {!message.is_deleted && (
                            <IconButton
                              size="small"
                              sx={{ position: 'absolute', top: 4, right: 4, opacity: 0.7 }}
                              onClick={(e) => setReactionMenuAnchor({ element: e.currentTarget, messageId: message.id })}
                            >
                              <IconMoodSmile size={14} />
                            </IconButton>
                          )}
                        </Paper>
                      </Box>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Stack>
              </Box>

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <Box sx={{ px: 2, py: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </Typography>
                </Box>
              )}

              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} alignItems="flex-end">
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      if (e.target.value.trim()) {
                        handleTypingStart();
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    disabled={sendingMessage}
                    ref={messageInputRef}
                  />
                  <IconButton
                    color="primary"
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <CircularProgress size={20} />
                    ) : (
                      <IconSend size={20} />
                    )}
                  </IconButton>
                </Stack>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                p: 4,
              }}
            >
              <IconMessage size={64} color="lightgray" />
              <Typography variant="h6" mt={2} color="text.secondary">
                Select a conversation to start chatting
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose from your existing conversations or start a new one
              </Typography>
            </Box>
          )}
        </Box>

        {/* Reaction Menu */}
        <Menu
          anchorEl={reactionMenuAnchor?.element}
          open={Boolean(reactionMenuAnchor)}
          onClose={() => setReactionMenuAnchor(null)}
        >
          {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
            <MenuItem
              key={type}
              onClick={() => reactionMenuAnchor && reactToMessage(reactionMenuAnchor.messageId, type)}
            >
              <Typography variant="body2">
                {emoji} {type.charAt(0).toUpperCase() + type.slice(1)}
              </Typography>
            </MenuItem>
          ))}
        </Menu>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
        >
          {error}
        </Alert>
      )}
    </PageContainer>
  );
};

export default SocialChat; 