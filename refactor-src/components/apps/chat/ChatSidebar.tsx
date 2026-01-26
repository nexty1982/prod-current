/**
 * Orthodox Metrics - Enhanced Chat Sidebar Component
 * Modern conversations list with real-time updates and rich UI
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Badge,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  Skeleton,
  Alert,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  MoreVert as MoreVertIcon,
  PushPin as PinIcon,
  Delete as DeleteIcon,
  VolumeOff as MuteIcon,
  VolumeUp as UnmuteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import Scrollbar from '../../custom-scroll/Scrollbar.tsx';
import { useTheme } from '@/context/ThemeContext';

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

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  onRefresh: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedConversation,
  onConversationSelect,
  onRefresh,
}) => {
  const { themeConfig } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; conversation: Conversation } | null>(null);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>(conversations);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [muted, setMuted] = useState<Set<number>>(new Set());

  // Filter conversations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message_content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.other_participant && 
          `${conv.other_participant.first_name} ${conv.other_participant.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery]);

  // Sort conversations: favorites first, then by last activity
  const sortedConversations = React.useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      // Favorites first
      const aFav = favorites.has(a.id);
      const bFav = favorites.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      // Then by unread count
      if (a.unread_count !== b.unread_count) {
        return b.unread_count - a.unread_count;
      }
      
      // Finally by last activity
      return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
    });
  }, [filteredConversations, favorites]);

  const handleToggleFavorite = (conversationId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(conversationId)) {
        newFavorites.delete(conversationId);
      } else {
        newFavorites.add(conversationId);
      }
      return newFavorites;
    });
  };

  const handleToggleMute = (conversationId: number) => {
    setMuted(prev => {
      const newMuted = new Set(prev);
      if (newMuted.has(conversationId)) {
        newMuted.delete(conversationId);
      } else {
        newMuted.add(conversationId);
      }
      return newMuted;
    });
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'direct' && conversation.other_participant) {
      return conversation.other_participant.profile_image_url || conversation.avatar_url;
    }
    return conversation.avatar_url;
  };

  const getConversationInitials = (conversation: Conversation) => {
    const name = conversation.display_name;
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const renderConversationAvatar = (conversation: Conversation) => {
    const isOnline = conversation.type === 'direct' && 
                    conversation.other_participant?.is_online;
    
    return (
      <Badge
        color={isOnline ? 'success' : 'default'}
        variant="dot"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        overlap="circular"
        invisible={conversation.type === 'group'}
      >
        <Avatar
          src={getConversationAvatar(conversation)}
          alt={conversation.display_name}
          sx={{ 
            width: 48, 
            height: 48,
            border: selectedConversation?.id === conversation.id ? 2 : 0,
            borderColor: 'primary.main',
          }}
        >
          {conversation.type === 'group' ? (
            <GroupIcon />
          ) : (
            getConversationInitials(conversation)
          )}
        </Avatar>
      </Badge>
    );
  };

  const renderLastMessage = (conversation: Conversation) => {
    if (!conversation.last_message_content) {
      return (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          No messages yet
        </Typography>
      );
    }

    const isFromSelf = conversation.last_message_sender_id;
    const senderName = conversation.last_message_sender_name;
    const maxLength = 40;
    const truncatedMessage = conversation.last_message_content.length > maxLength
      ? `${conversation.last_message_content.substring(0, maxLength)}...`
      : conversation.last_message_content;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {conversation.type === 'group' && senderName && (
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
            {senderName}:
          </Typography>
        )}
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            fontWeight: conversation.unread_count > 0 ? 600 : 400,
            flex: 1,
          }}
          noWrap
        >
          {truncatedMessage}
        </Typography>
      </Box>
    );
  };

  const renderConversationItem = (conversation: Conversation) => {
    const isSelected = selectedConversation?.id === conversation.id;
    const isFavorite = favorites.has(conversation.id);
    const isMuted = muted.has(conversation.id);
    const hasUnread = conversation.unread_count > 0;

    return (
      <Fade in={true} key={conversation.id} timeout={300}>
        <ListItem
          button
          selected={isSelected}
          onClick={() => onConversationSelect(conversation)}
          sx={{
            mb: 0.5,
            mx: 1,
            borderRadius: 2,
            '&:hover': { 
              backgroundColor: 'action.hover',
              transform: 'translateX(4px)',
              transition: 'all 0.2s ease-in-out',
            },
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '& .MuiTypography-root': {
                color: 'inherit',
              },
            },
            position: 'relative',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {/* Unread indicator */}
          {hasUnread && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 4,
                height: 24,
                backgroundColor: 'primary.main',
                borderRadius: '0 2px 2px 0',
              }}
            />
          )}

          <ListItemAvatar sx={{ ml: hasUnread ? 1 : 0 }}>
            {renderConversationAvatar(conversation)}
          </ListItemAvatar>

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: hasUnread ? 600 : 500,
                    flex: 1,
                  }}
                  noWrap
                >
                  {conversation.display_name}
                </Typography>
                
                {/* Status indicators */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {isFavorite && (
                    <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                  )}
                  {isMuted && (
                    <MuteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  )}
                  {conversation.type === 'group' && (
                    <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  )}
                </Box>
              </Box>
            }
            secondary={
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {renderLastMessage(conversation)}
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, ml: 1 }}>
                  {conversation.last_message_time && (
                    <Typography variant="caption" color="text.secondary">
                      {formatLastMessageTime(conversation.last_message_time)}
                    </Typography>
                  )}
                  
                  {hasUnread && (
                    <Zoom in={true}>
                      <Badge
                        badgeContent={conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '0.7rem',
                            height: 18,
                            minWidth: 18,
                          },
                        }}
                      />
                    </Zoom>
                  )}
                </Box>
              </Box>
            }
          />

          {/* Menu button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchor({ element: e.currentTarget, conversation });
            }}
            sx={{ 
              opacity: 0,
              transition: 'opacity 0.2s',
              '.MuiListItem-root:hover &': {
                opacity: 1,
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </ListItem>
      </Fade>
    );
  };

  const renderSkeletonItems = (count: number) =>
    Array.from({ length: count }).map((_, index) => (
      <ListItem key={`skeleton-${index}`} sx={{ mx: 1, mb: 0.5 }}>
        <ListItemAvatar>
          <Skeleton variant="circular" width={48} height={48} />
        </ListItemAvatar>
        <ListItemText
          primary={<Skeleton variant="text" width="70%" height={20} />}
          secondary={<Skeleton variant="text" width="90%" height={16} />}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          <Skeleton variant="text" width={40} height={14} />
          <Skeleton variant="circular" width={20} height={20} />
        </Box>
      </ListItem>
    ));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Bar */}
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          fullWidth
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setSearchQuery('')}
                  size="small"
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              backgroundColor: 'background.default',
            },
          }}
        />
      </Box>

      {/* Conversations List */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Scrollbar sx={{ height: '100%' }}>
          {sortedConversations.length === 0 && searchQuery ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No conversations found for "{searchQuery}"
              </Typography>
            </Box>
          ) : sortedConversations.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No conversations yet. Start chatting with your Orthodox community!
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {sortedConversations.map(renderConversationItem)}
            </List>
          )}
        </Scrollbar>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              handleToggleFavorite(menuAnchor.conversation.id);
            }
            setMenuAnchor(null);
          }}
        >
          {favorites.has(menuAnchor?.conversation.id || 0) ? (
            <>
              <StarBorderIcon sx={{ mr: 1 }} />
              Remove from Favorites
            </>
          ) : (
            <>
              <StarIcon sx={{ mr: 1 }} />
              Add to Favorites
            </>
          )}
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              handleToggleMute(menuAnchor.conversation.id);
            }
            setMenuAnchor(null);
          }}
        >
          {muted.has(menuAnchor?.conversation.id || 0) ? (
            <>
              <UnmuteIcon sx={{ mr: 1 }} />
              Unmute Conversation
            </>
          ) : (
            <>
              <MuteIcon sx={{ mr: 1 }} />
              Mute Conversation
            </>
          )}
        </MenuItem>

        {menuAnchor?.conversation.unread_count > 0 && (
          <MenuItem
            onClick={() => {
              // Mark as read functionality would go here
              setMenuAnchor(null);
            }}
          >
            <CircleIcon sx={{ mr: 1 }} />
            Mark as Read
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            // Delete conversation functionality would go here
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Conversation
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChatSidebar; 