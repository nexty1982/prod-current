import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Avatar, Button, Chip } from '@mui/material';
import { IconUser, IconPlus } from '@tabler/icons-react';

const Followers = () => {
  // Mock data for followers
  const followers = [
    {
      id: 1,
      name: 'John Doe',
      username: '@johndoe',
      avatar: '/images/profile/user-1.jpg',
      isFollowing: true,
      followersCount: 1200,
      followingCount: 500
    },
    {
      id: 2,
      name: 'Jane Smith',
      username: '@janesmith',
      avatar: '/images/profile/user-2.jpg',
      isFollowing: false,
      followersCount: 800,
      followingCount: 300
    },
    {
      id: 3,
      name: 'Mike Johnson',
      username: '@mikejohnson',
      avatar: '/images/profile/user-3.jpg',
      isFollowing: true,
      followersCount: 1500,
      followingCount: 200
    },
    {
      id: 4,
      name: 'Sarah Wilson',
      username: '@sarahwilson',
      avatar: '/images/profile/user-4.jpg',
      isFollowing: false,
      followersCount: 900,
      followingCount: 400
    }
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Followers
      </Typography>
      
      <Grid container spacing={3}>
        {followers.map((follower) => (
          <Grid item xs={12} sm={6} md={4} key={follower.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar
                    src={follower.avatar}
                    alt={follower.name}
                    sx={{ width: 56, height: 56, mr: 2 }}
                  >
                    <IconUser size={24} />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6">{follower.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {follower.username}
                    </Typography>
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Box textAlign="center">
                    <Typography variant="h6">{follower.followersCount}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Followers
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6">{follower.followingCount}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Following
                    </Typography>
                  </Box>
                </Box>
                
                <Button
                  variant={follower.isFollowing ? "outlined" : "contained"}
                  fullWidth
                  startIcon={<IconPlus size={16} />}
                >
                  {follower.isFollowing ? 'Following' : 'Follow'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Followers;
