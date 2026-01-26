/**
 * Orthodox Metrics - Enhanced Social Chat Application
 * A comprehensive social chat system with friends management, real-time messaging,
 * and rich social features integrated with the Orthodox Metrics platform.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  IconButton,
  Badge,
  Drawer,
  useMediaQuery,
  Theme,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Chat as ChatIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

// Import enhanced chat components
import ChatSidebar from '@/features/misc-legacy/apps/chat/ChatSidebar';
import ChatWindow from '@/features/misc-legacy/apps/chat/ChatWindow';
import FriendsList from '@/features/misc-legacy/apps/chat/FriendsList';
import ChatSettings from '@/features/misc-legacy/apps/chat/ChatSettings';

interface Conversation {
  id: number;
  type: 'direct' | 'group';
  name?: string;
  display_name: string;
  avatar_url?: string;
  last_activity: string;
  last_message_content?: string;
  last_message_time?: string;
  last_message_sender_id?: number;
  last_message_sender_name?: string;
  unread_count: number;
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

interface Friend {
  id: number;
  user_id: number;
  friend_id: number;
  status: 'pending' | 'accepted' | 'blocked';
  friend_info: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_image_url?: string;
    is_online: boolean;
    last_seen?: string;
  };
  created_at: string;
}

interface ChatNotification {
  id: string;
  type: 'message' | 'friend_request' | 'friend_accepted';
  title: string;
  message: string;
  conversation_id?: number;
  friend_id?: number;
  created_at: string;
}

const ChatApp: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { themeConfig } = useTheme();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'settings'>('chats');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // WebSocket ref for real-time features
  const wsRef = useRef<WebSocket | null>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Apps' },
    { title: 'Chat' },
  ];

  // Initialize chat data
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeChatData();
      initializeWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, user]);

  // Handle mobile responsiveness
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const initializeChatData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch conversations
      const conversationsResponse = await fetch('/api/social/chat/conversations', {
        credentials: 'include',
      });

      if (!conversationsResponse.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const conversationsData = await conversationsResponse.json();
      if (conversationsData.success) {
        setConversations(conversationsData.conversations);
        
        // Auto-select first conversation if available
        if (conversationsData.conversations.length > 0 && !selectedConversation) {
          setSelectedConversation(conversationsData.conversations[0]);
        }
      }

      // Fetch friends
      const friendsResponse = await fetch('/api/social/friends', {
        credentials: 'include',
      });

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        if (friendsData.success) {
          setFriends(friendsData.friends);
        }
      }

      // Calculate unread notifications
      const totalUnread = conversationsData.conversations?.reduce(
        (sum: number, conv: Conversation) => sum + conv.unread_count,
        0
      ) || 0;
      setUnreadNotifications(totalUnread);

    } catch (err) {
      console.error('Error initializing chat data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat data');
    } finally {
      setLoading(false);
    }
  };

  const initializeWebSocket = () => {
    if (!user) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Chat WebSocket connected');
        // Send authentication
        wsRef.current?.send(JSON.stringify({
          type: 'auth',
          token: user.id // In a real app, use proper JWT
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('Chat WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (isAuthenticated && user) {
            initializeWebSocket();
          }
        }, 3000);
      };
    } catch (err) {
      console.error('Error initializing WebSocket:', err);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'new_message':
        handleNewMessage(data.message);
        break;
      case 'message_read':
        handleMessageRead(data.conversation_id);
        break;
      case 'user_typing':
        handleUserTyping(data.conversation_id, data.user_id, data.is_typing);
        break;
      case 'user_status':
        handleUserStatusUpdate(data.user_id, data.is_online, data.last_seen);
        break;
      case 'friend_request':
        handleFriendRequest(data.request);
        break;
      case 'friend_accepted':
        handleFriendAccepted(data.friendship);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const handleNewMessage = (message: any) => {
    // Update conversations list with new message
    setConversations(prev => prev.map(conv => {
      if (conv.id === message.conversation_id) {
        return {
          ...conv,
          last_message_content: message.content,
          last_message_time: message.created_at,
          last_message_sender_id: message.sender_id,
          last_activity: message.created_at,
          unread_count: message.sender_id !== user?.id ? conv.unread_count + 1 : conv.unread_count
        };
      }
      return conv;
    }));

    // Update unread count
    if (message.sender_id !== user?.id) {
      setUnreadNotifications(prev => prev + 1);
    }

    // Show notification if not in current conversation
    if (!selectedConversation || selectedConversation.id !== message.conversation_id) {
      showNotification({
        id: Date.now().toString(),
        type: 'message',
        title: 'New Message',
        message: `${message.sender_name}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
        conversation_id: message.conversation_id,
        created_at: message.created_at
      });
    }
  };

  const handleMessageRead = (conversationId: number) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
    ));
  };

  const handleUserTyping = (conversationId: number, userId: number, isTyping: boolean) => {
    // Update typing indicators in the chat window
    // This will be handled by the ChatWindow component
  };

  const handleUserStatusUpdate = (userId: number, isOnline: boolean, lastSeen?: string) => {
    // Update user online status in conversations and friends
    setConversations(prev => prev.map(conv => {
      if (conv.other_participant?.id === userId) {
        return {
          ...conv,
          other_participant: {
            ...conv.other_participant,
            is_online: isOnline,
            last_seen: lastSeen || conv.other_participant.last_seen
          }
        };
      }
      return conv;
    }));

    setFriends(prev => prev.map(friend => {
      if (friend.friend_info.id === userId) {
        return {
          ...friend,
          friend_info: {
            ...friend.friend_info,
            is_online: isOnline,
            last_seen: lastSeen || friend.friend_info.last_seen
          }
        };
      }
      return friend;
    }));
  };

  const handleFriendRequest = (request: any) => {
    showNotification({
      id: Date.now().toString(),
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${request.sender_name} sent you a friend request`,
      friend_id: request.sender_id,
      created_at: request.created_at
    });
  };

  const handleFriendAccepted = (friendship: any) => {
    showNotification({
      id: Date.now().toString(),
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      message: `${friendship.friend_name} accepted your friend request`,
      friend_id: friendship.friend_id,
      created_at: friendship.created_at
    });
  };

  const showNotification = (notification: ChatNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only last 10
  };

  const startConversation = async (friendId: number) => {
    try {
      const response = await fetch(`/api/social/chat/start/${friendId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh conversations to include the new one
        await initializeChatData();
        
        // Find and select the new conversation
        const newConv = conversations.find(conv => 
          conv.other_participant?.id === friendId
        );
        if (newConv) {
          setSelectedConversation(newConv);
        }
        
        setActiveTab('chats');
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
      setError('Failed to start conversation');
    }
  };

  const handleTabChange = (tab: 'chats' | 'friends' | 'settings') => {
    setActiveTab(tab);
    if (isMobile) {
      setSidebarOpen(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer title="Chat" description="Orthodox Metrics Chat Application">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Alert severity="warning">
            Please log in to access the chat application.
          </Alert>
        </Box>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Chat" description="Orthodox Metrics Chat Application">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading chat...
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Orthodox Metrics Chat" description="Social chat application for Orthodox community">
      <Breadcrumb title="Chat Application" items={BCrumb} />
      
      <Paper elevation={3} sx={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Mobile menu button */}
          {isMobile && (
            <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1300 }}>
              <IconButton
                onClick={() => setSidebarOpen(!sidebarOpen)}
                sx={{
                  backgroundColor: 'background.paper',
                  boxShadow: 2,
                  '&:hover': { backgroundColor: 'background.default' }
                }}
              >
                {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            </Box>
          )}

          {/* Sidebar */}
          <Grid item xs={12} md={4} lg={3}>
            <Drawer
              variant={isMobile ? 'temporary' : 'permanent'}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                '& .MuiDrawer-paper': {
                  position: isMobile ? 'fixed' : 'relative',
                  width: isMobile ? '280px' : '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: 'background.default',
                },
              }}
            >
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Sidebar Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" component="h1" gutterBottom>
                    Orthodox Chat
                  </Typography>
                  
                  {/* Tab Navigation */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Chats">
                      <IconButton
                        onClick={() => handleTabChange('chats')}
                        color={activeTab === 'chats' ? 'primary' : 'default'}
                        size="small"
                      >
                        <Badge badgeContent={unreadNotifications} color="error">
                          <ChatIcon />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Friends">
                      <IconButton
                        onClick={() => handleTabChange('friends')}
                        color={activeTab === 'friends' ? 'primary' : 'default'}
                        size="small"
                      >
                        <PeopleIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Settings">
                      <IconButton
                        onClick={() => handleTabChange('settings')}
                        color={activeTab === 'settings' ? 'primary' : 'default'}
                        size="small"
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Sidebar Content */}
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  {activeTab === 'chats' && (
                    <ChatSidebar
                      conversations={conversations}
                      selectedConversation={selectedConversation}
                      onConversationSelect={setSelectedConversation}
                      onRefresh={initializeChatData}
                    />
                  )}
                  
                  {activeTab === 'friends' && (
                    <FriendsList
                      friends={friends}
                      onStartConversation={startConversation}
                      onRefresh={initializeChatData}
                    />
                  )}
                  
                  {activeTab === 'settings' && (
                    <ChatSettings
                      user={user}
                      onNotificationTest={() => showNotification({
                        id: Date.now().toString(),
                        type: 'message',
                        title: 'Test Notification',
                        message: 'This is a test notification',
                        created_at: new Date().toISOString()
                      })}
                    />
                  )}
                </Box>
              </Box>
            </Drawer>
          </Grid>

          {/* Main Chat Area */}
          <Grid item xs={12} md={8} lg={9}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {selectedConversation ? (
                <ChatWindow
                  conversation={selectedConversation}
                  currentUser={user}
                  wsRef={wsRef}
                  onMessageSent={() => {
                    // Refresh conversations to update last message
                    initializeChatData();
                  }}
                  onClose={() => setSelectedConversation(null)}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'text.secondary',
                    textAlign: 'center',
                    p: 4,
                  }}
                >
                  <ChatIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
                  <Typography variant="h5" gutterBottom>
                    Welcome to Orthodox Chat
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    Select a conversation from the sidebar to start chatting with your Orthodox community.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Connect with fellow Orthodox Christians, share your faith journey, and build meaningful relationships.
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Notification Snackbars */}
      {notifications.slice(0, 3).map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={5000}
          onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: 80 + (index * 70) }}
        >
          <Alert
            onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            severity={notification.type === 'message' ? 'info' : 'success'}
            sx={{ width: '100%' }}
          >
            <Typography variant="subtitle2">{notification.title}</Typography>
            <Typography variant="body2">{notification.message}</Typography>
          </Alert>
        </Snackbar>
      ))}
    </PageContainer>
  );
};

export default ChatApp; 