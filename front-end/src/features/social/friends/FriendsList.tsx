import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Grid,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Stack,
  IconButton,
  Badge,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  IconSearch,
  IconUserPlus,
  IconUserMinus,
  IconMessage,
  IconDots,
  IconCheck,
  IconX,
  IconClock,
  IconUsers,
  IconUserCheck,
  IconMail,
  IconPhone,
  IconMapPin,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import { format } from 'date-fns';
import { socialAPI } from '../../../api/social.api';

interface Friend {
  friend_id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  is_online: boolean;
  last_seen: string;
  friends_since: string;
  bio?: string;
  location?: string;
}

interface FriendRequest {
  id: number;
  direction: 'sent' | 'received';
  status: 'pending' | 'accepted' | 'declined';
  requested_at: string;
  responded_at?: string;
  notes?: string;
  user_id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  is_online: boolean;
  can_accept: boolean;
  can_decline: boolean;
  can_cancel: boolean;
}

interface SearchUser {
  id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  bio?: string;
  location?: string;
  is_online: boolean;
  friendship_status?: 'pending' | 'accepted' | 'declined';
  friendship_direction?: 'sent' | 'received';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`friends-tabpanel-${index}`}
      aria-labelledby={`friends-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const FriendsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tabValue, setTabValue] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for friend actions
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: '', message: '', action: () => {} });

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Social' },
    { title: 'Friends' },
  ];

  useEffect(() => {
    if (tabValue === 0) {
      fetchFriends();
    } else if (tabValue === 1) {
      fetchRequests();
    }
  }, [tabValue]);

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchQuery.trim() && tabValue === 2) {
        searchUsers();
      } else if (tabValue === 2) {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, tabValue]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await socialAPI.friends.getAll();
      setFriends(response.friends || []);
    } catch (err: any) {
      console.error('Error fetching friends:', err);
      setError(err.response?.data?.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await socialAPI.friends.getRequests();
      setRequests(response.requests || []);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError(err.response?.data?.message || 'Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await socialAPI.friends.search(searchQuery);
      setSearchResults(response.users || []);
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError(err.response?.data?.message || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId: number) => {
    try {
      setActionLoading(userId);
      await socialAPI.friends.sendRequest(userId);
      
      // Update search results to reflect the new request status
      setSearchResults(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, friendship_status: 'pending', friendship_direction: 'sent' }
          : user
      ));
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      setError(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setActionLoading(null);
    }
  };

  const respondToRequest = async (requestId: number, action: 'accept' | 'decline') => {
    try {
      setActionLoading(requestId);
      await socialAPI.friends.respondToRequest(requestId, { action });
      
      // Refresh requests
      await fetchRequests();
      
      // If accepted, also refresh friends list
      if (action === 'accept') {
        await fetchFriends();
      }
    } catch (err: any) {
      console.error('Error responding to request:', err);
      setError(err.response?.data?.message || 'Failed to respond to friend request');
    } finally {
      setActionLoading(null);
    }
  };

  const removeFriend = async (friendId: number) => {
    try {
      setActionLoading(friendId);
      await socialAPI.friends.remove(friendId);
      
      // Remove from friends list
      setFriends(prev => prev.filter(friend => friend.friend_id !== friendId));
    } catch (err: any) {
      console.error('Error removing friend:', err);
      setError(err.response?.data?.message || 'Failed to remove friend');
    } finally {
      setActionLoading(null);
    }
  };

  const startConversation = async (friendId: number) => {
    try {
      const response = await socialAPI.chat.startConversation(friendId);
      navigate('/social/chat', { state: { conversationId: response.conversation_id } });
    } catch (err: any) {
      console.error('Error starting conversation:', err);
      setError(err.response?.data?.message || 'Failed to start conversation');
    }
  };

  const getDisplayName = (user: Friend | FriendRequest | SearchUser) => {
    return user.display_name || `${user.first_name} ${user.last_name}`;
  };

  const getOnlineStatus = (isOnline: boolean, lastSeen?: string) => {
    if (isOnline) return 'Online';
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60));
      
      if (diffHours < 1) return 'Recently active';
      if (diffHours < 24) return `Active ${diffHours}h ago`;
      return `Last seen ${format(lastSeenDate, 'MMM dd')}`;
    }
    return 'Offline';
  };

  const renderFriendCard = (friend: Friend) => (
    <Grid item xs={12} sm={6} md={4} key={friend.friend_id}>
      <Card sx={{ height: '100%', position: 'relative' }}>
        <CardContent>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" spacing={2}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: friend.is_online ? 'success.main' : 'grey.400',
                      border: '2px solid white',
                    }}
                  />
                }
              >
                <Avatar
                  src={friend.profile_image_url}
                  sx={{ width: 64, height: 64 }}
                >
                  {friend.first_name[0]}
                </Avatar>
              </Badge>
              <Box flexGrow={1} ml={2}>
                <Typography variant="h6">
                  {getDisplayName(friend)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getOnlineStatus(friend.is_online, friend.last_seen)}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  Friends since {format(new Date(friend.friends_since), 'MMM yyyy')}
                </Typography>
              </Box>
            </Box>

            {friend.bio && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {friend.bio}
              </Typography>
            )}

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<IconMessage size={16} />}
                onClick={() => startConversation(friend.friend_id)}
                variant="contained"
                fullWidth
              >
                Chat
              </Button>
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    title: 'Remove Friend',
                    message: `Are you sure you want to remove ${getDisplayName(friend)} from your friends?`,
                    action: () => removeFriend(friend.friend_id),
                  })
                }
                disabled={actionLoading === friend.friend_id}
              >
                <IconUserMinus size={16} />
              </IconButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderRequestCard = (request: FriendRequest) => (
    <Paper key={request.id} sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: request.is_online ? 'success.main' : 'grey.400',
                border: '2px solid white',
              }}
            />
          }
        >
          <Avatar src={request.profile_image_url} sx={{ width: 48, height: 48 }}>
            {request.first_name[0]}
          </Avatar>
        </Badge>
        
        <Box flexGrow={1}>
          <Typography variant="h6">
            {getDisplayName(request)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {request.direction === 'received' ? 'Sent you a friend request' : 'You sent a friend request'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(request.requested_at), 'MMM dd, yyyy HH:mm')}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {request.can_accept && (
            <Button
              size="small"
              startIcon={<IconCheck size={16} />}
              onClick={() => respondToRequest(request.id, 'accept')}
              disabled={actionLoading === request.id}
              variant="contained"
              color="success"
            >
              Accept
            </Button>
          )}
          {request.can_decline && (
            <Button
              size="small"
              startIcon={<IconX size={16} />}
              onClick={() => respondToRequest(request.id, 'decline')}
              disabled={actionLoading === request.id}
              variant="outlined"
              color="error"
            >
              Decline
            </Button>
          )}
          {request.can_cancel && (
            <Button
              size="small"
              onClick={() => respondToRequest(request.id, 'decline')}
              disabled={actionLoading === request.id}
              variant="outlined"
            >
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );

  const renderSearchCard = (user: SearchUser) => (
    <Grid item xs={12} sm={6} md={4} key={user.id}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" spacing={2}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: user.is_online ? 'success.main' : 'grey.400',
                      border: '2px solid white',
                    }}
                  />
                }
              >
                <Avatar src={user.profile_image_url} sx={{ width: 48, height: 48 }}>
                  {user.first_name[0]}
                </Avatar>
              </Badge>
              <Box flexGrow={1} ml={2}>
                <Typography variant="h6">
                  {getDisplayName(user)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getOnlineStatus(user.is_online)}
                </Typography>
              </Box>
            </Box>

            {user.bio && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.bio}
              </Typography>
            )}

            {user.location && (
              <Typography variant="caption" color="text.secondary">
                <IconMapPin size={14} style={{ marginRight: 4 }} />
                {user.location}
              </Typography>
            )}

            <Box>
              {user.friendship_status === 'accepted' ? (
                <Chip label="Friends" color="success" size="small" />
              ) : user.friendship_status === 'pending' ? (
                <Chip 
                  label={user.friendship_direction === 'sent' ? 'Request Sent' : 'Request Received'} 
                  color="warning" 
                  size="small" 
                />
              ) : (
                <Button
                  size="small"
                  startIcon={<IconUserPlus size={16} />}
                  onClick={() => sendFriendRequest(user.id)}
                  disabled={actionLoading === user.id}
                  variant="contained"
                  fullWidth
                >
                  {actionLoading === user.id ? <CircularProgress size={16} /> : 'Add Friend'}
                </Button>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <PageContainer title="Friends" description="Manage your friends">
      <Breadcrumb title="Friends" items={BCrumb} />
      
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <IconUsers size={18} />
                  Friends ({friends.length})
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <IconUserCheck size={18} />
                  Requests ({requests.filter(r => r.status === 'pending').length})
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <IconSearch size={18} />
                  Find Friends
                </Box>
              }
            />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {/* Friends List Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box p={3}>
            {loading ? (
              <Grid container spacing={3}>
                {[...Array(6)].map((_, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardContent>
                        <Stack spacing={2}>
                          <Box display="flex" alignItems="center" spacing={2}>
                            <Skeleton variant="circular" width={64} height={64} />
                            <Box ml={2}>
                              <Skeleton variant="text" width={120} />
                              <Skeleton variant="text" width={80} />
                            </Box>
                          </Box>
                          <Skeleton variant="rectangular" height={32} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : friends.length === 0 ? (
              <Box textAlign="center" py={8}>
                <IconUsers size={64} color="lightgray" />
                <Typography variant="h6" mt={2} color="text.secondary">
                  No friends yet
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Start building your network by finding and adding friends
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setTabValue(2)}
                  startIcon={<IconSearch size={18} />}
                >
                  Find Friends
                </Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {friends.map(renderFriendCard)}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Friend Requests Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box p={3}>
            {loading ? (
              <Stack spacing={2}>
                {[...Array(3)].map((_, index) => (
                  <Paper key={index} sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Skeleton variant="circular" width={48} height={48} />
                      <Box flexGrow={1}>
                        <Skeleton variant="text" width={150} />
                        <Skeleton variant="text" width={200} />
                      </Box>
                      <Skeleton variant="rectangular" width={80} height={32} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : requests.filter(r => r.status === 'pending').length === 0 ? (
              <Box textAlign="center" py={8}>
                <IconUserCheck size={64} color="lightgray" />
                <Typography variant="h6" mt={2} color="text.secondary">
                  No pending friend requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You're all caught up!
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {requests
                  .filter(request => request.status === 'pending')
                  .map(renderRequestCard)}
              </Stack>
            )}
          </Box>
        </TabPanel>

        {/* Find Friends Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box p={3}>
            <TextField
              fullWidth
              placeholder="Search for friends by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            {loading ? (
              <Grid container spacing={3}>
                {[...Array(6)].map((_, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardContent>
                        <Stack spacing={2}>
                          <Box display="flex" alignItems="center">
                            <Skeleton variant="circular" width={48} height={48} />
                            <Box ml={2}>
                              <Skeleton variant="text" width={120} />
                              <Skeleton variant="text" width={80} />
                            </Box>
                          </Box>
                          <Skeleton variant="rectangular" height={32} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : searchQuery && searchResults.length === 0 ? (
              <Box textAlign="center" py={8}>
                <IconSearch size={64} color="lightgray" />
                <Typography variant="h6" mt={2} color="text.secondary">
                  No users found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try searching with different keywords
                </Typography>
              </Box>
            ) : searchResults.length > 0 ? (
              <Grid container spacing={3}>
                {searchResults.map(renderSearchCard)}
              </Grid>
            ) : (
              <Box textAlign="center" py={8}>
                <IconUserPlus size={64} color="lightgray" />
                <Typography variant="h6" mt={2} color="text.secondary">
                  Discover new friends
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Search for people by name or email to connect with them
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              confirmDialog.action();
              setConfirmDialog(prev => ({ ...prev, open: false }));
            }}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FriendsList; 