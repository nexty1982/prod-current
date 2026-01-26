import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Switch,
  FormControlLabel,
  Alert,
  Grid,
  Paper,
  Divider,
  IconButton,
  Badge
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Smartphone as PhoneIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const SiteEditorDemo: React.FC = () => {
  const { user } = useAuth();
  const [textValue, setTextValue] = useState('Sample text for editing');
  const [switchValue, setSwitchValue] = useState(false);
  const [selectedChip, setSelectedChip] = useState('React');

  const mockUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager', status: 'Active' },
  ];

  const handleButtonClick = () => {
    alert('Button clicked! This is a test component for the site editor.');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
        🛠️ Site Editor Demo
      </Typography>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body1">
          <strong>Instructions:</strong> As a super_admin, you can now hover over any component on this page 
          and click to inspect it. The site editor overlay will show component details, props, and allow editing.
        </Typography>
      </Alert>

      <Grid container spacing={4}>
        {/* Basic Components Section */}
        <Grid item xs={12} md={6}>
          <Card data-testid="basic-components-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Basic Components
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Text Input
                </Typography>
                <TextField
                  data-testid="sample-text-field"
                  fullWidth
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Edit this text..."
                  sx={{ mb: 2 }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Buttons
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    data-testid="primary-button"
                    variant="contained"
                    onClick={handleButtonClick}
                  >
                    Primary Button
                  </Button>
                  <Button
                    data-testid="secondary-button"
                    variant="outlined"
                    onClick={handleButtonClick}
                  >
                    Secondary Button
                  </Button>
                  <Button
                    data-testid="text-button"
                    variant="text"
                    onClick={handleButtonClick}
                  >
                    Text Button
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Switch
                </Typography>
                <FormControlLabel
                  data-testid="sample-switch"
                  control={
                    <Switch
                      checked={switchValue}
                      onChange={(e) => setSwitchValue(e.target.checked)}
                    />
                  }
                  label="Toggle Switch"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Chips
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {['React', 'TypeScript', 'Material-UI', 'OrthodoxMetrics'].map((chip) => (
                    <Chip
                      key={chip}
                      data-testid={`chip-${chip.toLowerCase()}`}
                      label={chip}
                      color={selectedChip === chip ? 'primary' : 'default'}
                      onClick={() => setSelectedChip(chip)}
                      clickable
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* User Profile Section */}
        <Grid item xs={12} md={6}>
          <Card data-testid="user-profile-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                User Profile
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  data-testid="user-avatar"
                  sx={{ width: 80, height: 80, mr: 2 }}
                >
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" data-testid="user-name">
                    {user?.first_name} {user?.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" data-testid="user-email">
                    {user?.email}
                  </Typography>
                  <Chip
                    data-testid="user-role-chip"
                    label={user?.role}
                    color="primary"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" data-testid="contact-email">
                    {user?.email}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" data-testid="contact-phone">
                    +1 (555) 123-4567
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" data-testid="contact-location">
                    New York, NY
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* User List Section */}
        <Grid item xs={12}>
          <Card data-testid="user-list-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                User Management
              </Typography>
              
              <List>
                {mockUsers.map((user) => (
                  <ListItem
                    key={user.id}
                    data-testid={`user-list-item-${user.id}`}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          data-testid={`favorite-button-${user.id}`}
                          edge="end"
                          aria-label="favorite"
                        >
                          <FavoriteIcon />
                        </IconButton>
                        <IconButton
                          data-testid={`share-button-${user.id}`}
                          edge="end"
                          aria-label="share"
                        >
                          <ShareIcon />
                        </IconButton>
                        <IconButton
                          data-testid={`more-button-${user.id}`}
                          edge="end"
                          aria-label="more"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar data-testid={`user-avatar-${user.id}`}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography data-testid={`user-name-${user.id}`}>
                          {user.name}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" data-testid={`user-email-${user.id}`}>
                            {user.email}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip
                              data-testid={`user-role-${user.id}`}
                              label={user.role}
                              size="small"
                              color="primary"
                            />
                            <Chip
                              data-testid={`user-status-${user.id}`}
                              label={user.status}
                              size="small"
                              color={user.status === 'Active' ? 'success' : 'default'}
                            />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Interactive Components */}
        <Grid item xs={12}>
          <Paper data-testid="interactive-components-paper" sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Interactive Components
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge
                data-testid="notification-badge"
                badgeContent={4}
                color="error"
              >
                <IconButton data-testid="notifications-button">
                  <NotificationsIcon />
                </IconButton>
              </Badge>

              <IconButton data-testid="settings-button">
                <SettingsIcon />
              </IconButton>

              <Button
                data-testid="star-button"
                startIcon={<StarIcon />}
                variant="outlined"
                onClick={handleButtonClick}
              >
                Rate this page
              </Button>

              <TextField
                data-testid="search-field"
                placeholder="Search components..."
                size="small"
                sx={{ minWidth: 200 }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Hover over any component above and click to inspect it with the Site Editor!
        </Typography>
      </Box>
    </Box>
  );
};

export default SiteEditorDemo; 