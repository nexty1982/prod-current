/**
 * Orthodox Metrics - Enhanced Friends List Component
 * Comprehensive friends management with search, requests, and social features
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Typography,
  Button,
  Tabs,
  Tab,
  Badge,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  Skeleton,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Block as BlockIcon,
  PersonRemove as PersonRemoveIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Church as ChurchIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import Scrollbar from '../../custom-scroll/Scrollbar';

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
    bio?: string;
    location?: string;
    church_affiliation?: string;
  };
  created_at: string;
}

interface UserSearchResult {
  id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  is_online: boolean;
  bio?: string;
  location?: string;
  church_affiliation?: string;
  friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked';
}

interface FriendsListProps {
  friends: Friend[];
  onStartConversation: (friendId: number) => void;
  onRefresh: () => void;
}

const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  onStartConversation,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; friend: Friend } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [userDialog, setUserDialog] = useState<{
    open: boolean;
    user: UserSearchResult | null;
  }>({ open: false, user: null });

  // Filter friends by status
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending');
  const blockedUsers = friends.filter(f => f.status === 'blocked');

  // Search users when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleUserSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setError(null);

      const response = await fetch(`/api/social/friends/search?q=${encodeURIComponent(searchQuery)}&limit=20`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.users);
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async (userId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/social/friends/request/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to send friend request');
      }

      const data = await response.json();
      if (data.success) {
        // Update search results to reflect new status
        setSearchResults(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, friendship_status: 'pending_sent' }
            : user
        ));
        onRefresh();
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriendRequest = async (friendshipId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/social/friends/requests/${friendshipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        throw new Error('Failed to accept friend request');
      }

      const data = await response.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError('Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineFriendRequest = async (friendshipId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/social/friends/requests/${friendshipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'decline' }),
      });

      if (!response.ok) {
        throw new Error('Failed to decline friend request');
      }

      const data = await response.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error declining friend request:', err);
      setError('Failed to decline friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendshipId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/social/friends/${friendshipId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove friend');
      }

      const data = await response.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      setError('Failed to remove friend');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (friendshipId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/social/friends/block/${friendshipId}`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to block user');
      }

      const data = await response.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error blocking user:', err);
      setError('Failed to block user');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (friend: Friend) => {
    return friend.friend_info.display_name || 
           `${friend.friend_info.first_name} ${friend.friend_info.last_name}`;
  };

  const getSearchDisplayName = (user: UserSearchResult) => {
    return user.display_name || `${user.first_name} ${user.last_name}`;
  };

  const renderFriendAvatar = (friend: Friend) => (
    <Badge
      color={friend.friend_info.is_online ? 'success' : 'default'}
      variant="dot"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      overlap="circular"
    >
      <Avatar
        src={friend.friend_info.profile_image_url}
        alt={getDisplayName(friend)}
        sx={{ width: 48, height: 48 }}
      >
        {getDisplayName(friend).charAt(0).toUpperCase()}
      </Avatar>
    </Badge>
  );

  const renderUserAvatar = (user: UserSearchResult) => (
    <Badge
      color={user.is_online ? 'success' : 'default'}
      variant="dot"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      overlap="circular"
    >
      <Avatar
        src={user.profile_image_url}
        alt={getSearchDisplayName(user)}
        sx={{ width: 48, height: 48 }}
      >
        {getSearchDisplayName(user).charAt(0).toUpperCase()}
      </Avatar>
    </Badge>
  );

  const renderFriendItem = (friend: Friend) => (
    <ListItem
      key={friend.id}
      divider
      sx={{
        '&:hover': { backgroundColor: 'action.hover' },
        transition: 'background-color 0.2s',
      }}
    >
      <ListItemAvatar>{renderFriendAvatar(friend)}</ListItemAvatar>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {getDisplayName(friend)}
            </Typography>
            {friend.friend_info.church_affiliation && (
              <Chip
                icon={<ChurchIcon />}
                label={friend.friend_info.church_affiliation}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        }
        secondary={
          <Box>
            {friend.friend_info.bio && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {friend.friend_info.bio}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {friend.friend_info.is_online
                ? 'Online now'
                : friend.friend_info.last_seen
                  ? `Last seen ${formatDistanceToNow(new Date(friend.friend_info.last_seen))} ago`
                  : 'Offline'
              }
              {friend.friend_info.location && (
                <span> • {friend.friend_info.location}</span>
              )}
            </Typography>
          </Box>
        }
      />
      
      <ListItemSecondaryAction>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {friend.status === 'accepted' && (
            <Tooltip title="Start Chat">
              <IconButton
                onClick={() => onStartConversation(friend.friend_info.id)}
                size="small"
                color="primary"
              >
                <ChatIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {friend.status === 'pending' && (
            <>
              <Tooltip title="Accept">
                <IconButton
                  onClick={() => handleAcceptFriendRequest(friend.id)}
                  size="small"
                  color="success"
                  disabled={loading}
                >
                  <CheckIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Decline">
                <IconButton
                  onClick={() => handleDeclineFriendRequest(friend.id)}
                  size="small"
                  color="error"
                  disabled={loading}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          
          <Tooltip title="More Options">
            <IconButton
              onClick={(e) => setMenuAnchor({ element: e.currentTarget, friend })}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </ListItemSecondaryAction>
    </ListItem>
  );

  const renderSearchResult = (user: UserSearchResult) => (
    <ListItem
      key={user.id}
      divider
      button
      onClick={() => setUserDialog({ open: true, user })}
      sx={{
        '&:hover': { backgroundColor: 'action.hover' },
        transition: 'background-color 0.2s',
      }}
    >
      <ListItemAvatar>{renderUserAvatar(user)}</ListItemAvatar>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {getSearchDisplayName(user)}
            </Typography>
            {user.church_affiliation && (
              <Chip
                icon={<ChurchIcon />}
                label={user.church_affiliation}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        }
        secondary={
          <Box>
            {user.bio && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.bio}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {user.is_online ? 'Online now' : 'Offline'}
              {user.location && <span> • {user.location}</span>}
            </Typography>
          </Box>
        }
      />
      
      <ListItemSecondaryAction>
        {user.friendship_status === 'none' && (
          <Tooltip title="Send Friend Request">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleSendFriendRequest(user.id);
              }}
              size="small"
              color="primary"
              disabled={loading}
            >
              <PersonAddIcon />
            </IconButton>
          </Tooltip>
        )}
        
        {user.friendship_status === 'pending_sent' && (
          <Chip label="Request Sent" size="small" color="info" />
        )}
        
        {user.friendship_status === 'pending_received' && (
          <Chip label="Pending" size="small" color="warning" />
        )}
        
        {user.friendship_status === 'accepted' && (
          <Chip label="Friends" size="small" color="success" />
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );

  const renderSkeletonItems = (count: number) =>
    Array.from({ length: count }).map((_, index) => (
      <ListItem key={index} divider>
        <ListItemAvatar>
          <Skeleton variant="circular" width={48} height={48} />
        </ListItemAvatar>
        <ListItemText
          primary={<Skeleton variant="text" width="60%" />}
          secondary={<Skeleton variant="text" width="80%" />}
        />
        <ListItemSecondaryAction>
          <Skeleton variant="rectangular" width={80} height={32} />
        </ListItemSecondaryAction>
      </ListItem>
    ));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Bar */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search Orthodox community..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {searching ? (
                  <CircularProgress size={20} />
                ) : (
                  <SearchIcon />
                )}
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            size="small"
          >
            {error}
          </Alert>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          size="small"
        >
          <Tab
            icon={<PersonIcon />}
            label={
              <Badge badgeContent={acceptedFriends.length} color="primary" max={99}>
                Friends
              </Badge>
            }
            iconPosition="start"
          />
          <Tab
            icon={<GroupIcon />}
            label={
              <Badge badgeContent={pendingRequests.length} color="warning" max={99}>
                Requests
              </Badge>
            }
            iconPosition="start"
          />
          {searchQuery && (
            <Tab
              icon={<SearchIcon />}
              label="Search"
              iconPosition="start"
            />
          )}
        </Tabs>
      </Box>

      {/* Refresh Button */}
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Tooltip title="Refresh">
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Scrollbar sx={{ height: '100%' }}>
          <List sx={{ p: 0 }}>
            {/* Friends Tab */}
            {activeTab === 0 && (
              <>
                {acceptedFriends.length > 0 ? (
                  acceptedFriends.map(renderFriendItem)
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No friends yet. Search for Orthodox community members to connect with!
                    </Typography>
                  </Box>
                )}
              </>
            )}

            {/* Requests Tab */}
            {activeTab === 1 && (
              <>
                {pendingRequests.length > 0 ? (
                  pendingRequests.map(renderFriendItem)
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No pending friend requests
                    </Typography>
                  </Box>
                )}
              </>
            )}

            {/* Search Tab */}
            {activeTab === 2 && searchQuery && (
              <>
                {searching ? (
                  renderSkeletonItems(5)
                ) : searchResults.length > 0 ? (
                  searchResults.map(renderSearchResult)
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No users found matching "{searchQuery}"
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </List>
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
        {menuAnchor?.friend.status === 'accepted' && (
          <MenuItem
            onClick={() => {
              onStartConversation(menuAnchor.friend.friend_info.id);
              setMenuAnchor(null);
            }}
          >
            <ChatIcon sx={{ mr: 1 }} /> Start Chat
          </MenuItem>
        )}
        
        <MenuItem
          onClick={() => {
            setUserDialog({ open: true, user: {
              id: menuAnchor!.friend.friend_info.id,
              first_name: menuAnchor!.friend.friend_info.first_name,
              last_name: menuAnchor!.friend.friend_info.last_name,
              display_name: menuAnchor!.friend.friend_info.display_name,
              profile_image_url: menuAnchor!.friend.friend_info.profile_image_url,
              is_online: menuAnchor!.friend.friend_info.is_online,
              bio: menuAnchor!.friend.friend_info.bio,
              location: menuAnchor!.friend.friend_info.location,
              church_affiliation: menuAnchor!.friend.friend_info.church_affiliation,
              friendship_status: 'accepted'
            }});
            setMenuAnchor(null);
          }}
        >
          <PersonIcon sx={{ mr: 1 }} /> View Profile
        </MenuItem>
        
        <Divider />
        
        <MenuItem
          onClick={() => {
            setConfirmDialog({
              open: true,
              title: 'Remove Friend',
              message: `Are you sure you want to remove ${getDisplayName(menuAnchor!.friend)} from your friends?`,
              action: () => handleRemoveFriend(menuAnchor!.friend.id)
            });
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <PersonRemoveIcon sx={{ mr: 1 }} /> Remove Friend
        </MenuItem>
        
        <MenuItem
          onClick={() => {
            setConfirmDialog({
              open: true,
              title: 'Block User',
              message: `Are you sure you want to block ${getDisplayName(menuAnchor!.friend)}? They will not be able to message you.`,
              action: () => handleBlockUser(menuAnchor!.friend.id)
            });
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <BlockIcon sx={{ mr: 1 }} /> Block User
        </MenuItem>
      </Menu>

      {/* User Profile Dialog */}
      <Dialog
        open={userDialog.open}
        onClose={() => setUserDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        {userDialog.user && (
          <>
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
              <Avatar
                src={userDialog.user.profile_image_url}
                sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
              >
                {getSearchDisplayName(userDialog.user).charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h6">
                {getSearchDisplayName(userDialog.user)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {userDialog.user.is_online ? 'Online now' : 'Offline'}
              </Typography>
            </DialogTitle>
            
            <DialogContent>
              {userDialog.user.bio && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    About
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userDialog.user.bio}
                  </Typography>
                </Box>
              )}
              
              {userDialog.user.church_affiliation && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ChurchIcon color="action" />
                  <Typography variant="body2">
                    {userDialog.user.church_affiliation}
                  </Typography>
                </Box>
              )}
              
              {userDialog.user.location && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon color="action" />
                  <Typography variant="body2">
                    {userDialog.user.location}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setUserDialog({ open: false, user: null })}>
                Close
              </Button>
              
              {userDialog.user.friendship_status === 'none' && (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    handleSendFriendRequest(userDialog.user!.id);
                    setUserDialog({ open: false, user: null });
                  }}
                  disabled={loading}
                >
                  Send Friend Request
                </Button>
              )}
              
              {userDialog.user.friendship_status === 'accepted' && (
                <Button
                  variant="contained"
                  startIcon={<ChatIcon />}
                  onClick={() => {
                    onStartConversation(userDialog.user!.id);
                    setUserDialog({ open: false, user: null });
                  }}
                >
                  Start Chat
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <Dialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog(null)}
          maxWidth="sm"
        >
          <DialogTitle>{confirmDialog.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{confirmDialog.message}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog(null);
              }}
              color="error"
              variant="contained"
              disabled={loading}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default FriendsList; 