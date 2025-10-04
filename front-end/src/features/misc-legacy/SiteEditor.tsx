import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import SiteEditorOverlay from './SiteEditorOverlay';
import SiteEditorErrorBoundary from './SiteEditorErrorBoundary';

const SiteEditor: React.FC = () => {
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

  // Add console log to confirm component mounts
  useEffect(() => {
    console.log('🔧 SiteEditor component mounted');
    console.log('User role:', user?.role);
    console.log('Is super admin:', user?.role === 'super_admin');
  }, [user]);

  return (
    <SiteEditorErrorBoundary>
      <SiteEditorOverlay>
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h3" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
          🛠️ Site Editor
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
                    Switches & Chips
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
                    <Chip
                      data-testid="sample-chip"
                      label={selectedChip}
                      color="primary"
                      onClick={() => setSelectedChip(selectedChip === 'React' ? 'TypeScript' : 'React')}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* User List Section */}
          <Grid item xs={12} md={6}>
            <Card data-testid="user-list-card">
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  User Management
                </Typography>
                
                <List>
                  {mockUsers.map((user, index) => (
                    <ListItem
                      key={user.id}
                      data-testid={`user-item-${index}`}
                      secondaryAction={
                        <IconButton edge="end" aria-label="more">
                          <MoreVertIcon />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                            <Chip
                              size="small"
                              label={user.status}
                              color={user.status === 'Active' ? 'success' : 'default'}
                              sx={{ mt: 0.5 }}
                            />
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
            <Card data-testid="interactive-components-card">
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Interactive Components
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <IconButton
                        data-testid="notification-button"
                        color="primary"
                        size="large"
                      >
                        <Badge badgeContent={4} color="error">
                          <NotificationsIcon />
                        </Badge>
                      </IconButton>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Notifications
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <IconButton
                        data-testid="favorite-button"
                        color="secondary"
                        size="large"
                      >
                        <FavoriteIcon />
                      </IconButton>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Favorites
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <IconButton
                        data-testid="settings-button"
                        color="default"
                        size="large"
                      >
                        <SettingsIcon />
                      </IconButton>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Settings
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      </SiteEditorOverlay>
    </SiteEditorErrorBoundary>
  );
};

export default SiteEditor; 