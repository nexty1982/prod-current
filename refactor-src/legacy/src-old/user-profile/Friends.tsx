import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Avatar, Button, Chip } from '@mui/material';
import { IconUser, IconUserPlus } from '@tabler/icons-react';

const Friends = () => {
  // Mock data for friends
  const friends = [
    {
      id: 1,
      name: 'Alice Johnson',
      username: '@alicejohnson',
      avatar: '/images/profile/user-1.jpg',
      mutualFriends: 5,
      lastActive: '2 hours ago'
    },
    {
      id: 2,
      name: 'Bob Smith',
      username: '@bobsmith',
      avatar: '/images/profile/user-2.jpg',
      mutualFriends: 12,
      lastActive: '1 day ago'
    },
    {
      id: 3,
      name: 'Carol Davis',
      username: '@caroldavis',
      avatar: '/images/profile/user-3.jpg',
      mutualFriends: 3,
      lastActive: '3 hours ago'
    },
    {
      id: 4,
      name: 'David Wilson',
      username: '@davidwilson',
      avatar: '/images/profile/user-4.jpg',
      mutualFriends: 8,
      lastActive: '1 week ago'
    }
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Friends
      </Typography>
      
      <Grid container spacing={3}>
        {friends.map((friend) => (
          <Grid item xs={12} sm={6} md={4} key={friend.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar
                    src={friend.avatar}
                    alt={friend.name}
                    sx={{ width: 56, height: 56, mr: 2 }}
                  >
                    <IconUser size={24} />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6">{friend.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {friend.username}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Last active: {friend.lastActive}
                    </Typography>
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Chip 
                    label={`${friend.mutualFriends} mutual friends`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </Box>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<IconUserPlus size={16} />}
                >
                  Message
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Friends;
