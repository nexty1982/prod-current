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
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon,
  AutoFixHigh as AutoFixIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const AutoFixDemo: React.FC = () => {
  const { user } = useAuth();
  const [textValue, setTextValue] = useState('');
  const [switchValue, setSwitchValue] = useState(false);
  const [selectedChip, setSelectedChip] = useState('React');
  const [showIssues, setShowIssues] = useState(false);

  // Mock users for list demonstration
  const mockUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Moderator' }
  ];

  const handleButtonClick = () => {
    alert('Button clicked! This is a test component for the autonomous fix system.');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
        🤖 Autonomous Fix System Demo
      </Typography>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body1">
          <strong>Instructions:</strong> This demo page contains components with intentional issues 
          to test the autonomous fix system. As a super_admin, you can:
        </Typography>
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          <li>Hover over components to see the Site Editor overlay</li>
          <li>Click components to open the Inspector Panel</li>
          <li>Use the Autonomous Fix System to detect and fix issues</li>
          <li>Test rollback functionality for applied fixes</li>
        </Box>
      </Alert>

      {/* Issue Overview */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugIcon />
            <Typography variant="h6">Known Issues on This Page</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, border: '1px solid #ff9800' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningIcon color="warning" />
                  <Typography variant="subtitle2" color="warning.main">
                    Zero Dimensions Issue
                  </Typography>
                </Box>
                <Typography variant="body2">
                  The "Hidden Component" below has zero dimensions and will be detected by the system.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, border: '1px solid #f44336' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ErrorIcon color="error" />
                  <Typography variant="subtitle2" color="error.main">
                    Missing Props Issue
                  </Typography>
                </Box>
                <Typography variant="body2">
                  Some components are missing required props like "id" and "className".
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, border: '1px solid #2196f3' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon color="info" />
                  <Typography variant="subtitle2" color="info.main">
                    Accessibility Issue
                  </Typography>
                </Box>
                <Typography variant="body2">
                  Interactive elements may be missing ARIA labels for accessibility.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, border: '1px solid #9c27b0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AutoFixIcon color="secondary" />
                  <Typography variant="subtitle2" color="secondary.main">
                    CSS Conflicts
                  </Typography>
                </Box>
                <Typography variant="body2">
                  Some components have conflicting CSS classes that can be automatically resolved.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {/* Component with Zero Dimensions (Issue) */}
        <Grid item xs={12} md={6}>
          <Card data-testid="zero-dimensions-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hidden Component (Zero Dimensions)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This component has zero dimensions and will be detected as an issue.
              </Typography>
              <Box 
                sx={{ 
                  width: 0, 
                  height: 0, 
                  backgroundColor: '#ffebee',
                  border: '1px dashed #f44336',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                data-testid="hidden-component"
              >
                <Typography variant="caption" color="error">
                  Hidden content
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Component with Missing Props (Issue) */}
        <Grid item xs={12} md={6}>
          <Card data-testid="missing-props-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Component with Missing Props
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This component is missing required props like "id" and "className".
              </Typography>
              <TextField
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Enter text..."
                fullWidth
                sx={{ mb: 2 }}
                // Missing id and className props intentionally
              />
              <Button 
                variant="contained" 
                onClick={handleButtonClick}
                // Missing id prop intentionally
              >
                Test Button
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Component with Accessibility Issues */}
        <Grid item xs={12} md={6}>
          <Card data-testid="accessibility-issues-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Accessibility Issues
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Interactive elements without proper labels.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <IconButton 
                  // Missing aria-label intentionally
                  onClick={() => alert('Icon clicked!')}
                >
                  <BugIcon />
                </IconButton>
                <IconButton 
                  // Missing aria-label intentionally
                  onClick={() => alert('Settings clicked!')}
                >
                  <AutoFixIcon />
                </IconButton>
              </Box>
              <FormControlLabel
                control={
                  <Switch 
                    checked={switchValue}
                    onChange={(e) => setSwitchValue(e.target.checked)}
                    // Missing aria-label intentionally
                  />
                }
                label="Toggle Switch"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Component with CSS Conflicts */}
        <Grid item xs={12} md={6}>
          <Card data-testid="css-conflicts-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CSS Conflicts
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Component with conflicting CSS classes.
              </Typography>
              <Box 
                sx={{ 
                  p: 2, 
                  border: '1px solid #ccc',
                  borderRadius: 1
                }}
                className="hidden display-block flex" // Conflicting classes
                data-testid="conflicting-css-component"
              >
                <Typography variant="body2">
                  This element has conflicting display classes: hidden, display-block, and flex.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* List with Missing Keys (Issue) */}
        <Grid item xs={12}>
          <Card data-testid="missing-keys-list-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                List with Missing Keys
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This list has items without proper key props.
              </Typography>
              <List>
                {mockUsers.map((user) => (
                  <ListItem 
                    // Missing key prop intentionally
                    sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}
                  >
                    <ListItemAvatar>
                      <Avatar>{user.name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.name}
                      secondary={`${user.email} - ${user.role}`}
                    />
                    <Chip label={user.role} size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Working Component (No Issues) */}
        <Grid item xs={12}>
          <Card data-testid="working-component-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Working Component (No Issues)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This component has all required props and should not trigger any issues.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  id="working-text-field"
                  className="working-input"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Working text field"
                  label="Working Input"
                  variant="outlined"
                />
                <Button 
                  id="working-button"
                  className="working-button"
                  variant="contained" 
                  onClick={handleButtonClick}
                  aria-label="Working test button"
                >
                  Working Button
                </Button>
                <FormControlLabel
                  control={
                    <Switch 
                      id="working-switch"
                      className="working-switch"
                      checked={switchValue}
                      onChange={(e) => setSwitchValue(e.target.checked)}
                      aria-label="Working toggle switch"
                    />
                  }
                  label="Working Switch"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Testing Instructions */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          🧪 Testing Instructions
        </Typography>
        <Box component="ol" sx={{ pl: 2 }}>
          <li>
            <strong>Enable Site Edit Mode:</strong> Click the floating edit button to activate the Site Editor overlay
          </li>
          <li>
            <strong>Inspect Components:</strong> Hover over any component and click to open the Inspector Panel
          </li>
          <li>
            <strong>View Detected Issues:</strong> In the Inspector Panel, expand the "Autonomous Fix System" section
          </li>
          <li>
            <strong>Configure Auto-Fix:</strong> Adjust confidence thresholds and enable/disable features
          </li>
          <li>
            <strong>Apply Auto-Fixes:</strong> Click "Auto-Fix Issues" to automatically resolve detected problems
          </li>
          <li>
            <strong>Test Rollback:</strong> Use the rollback buttons in the fix history to undo changes
          </li>
          <li>
            <strong>Monitor Results:</strong> Check the fix history and statistics to see the system's performance
          </li>
        </Box>
      </Paper>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          🎯 Try hovering over the components above and using the Autonomous Fix System to detect and resolve issues!
        </Typography>
      </Box>
    </Box>
  );
};

export default AutoFixDemo; 