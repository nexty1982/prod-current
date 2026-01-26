import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';

const PermissionDebugger: React.FC = () => {
  const { user, userRoles, userPermissions, hasPermission, hasRole } = useAuth();

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Permission Debugger</Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Current User:</Typography>
        <Typography>Email: {user?.email}</Typography>
        <Typography>ID: {user?.uid}</Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">User Roles:</Typography>
        <List dense>
          {userRoles.map((role, index) => (
            <ListItem key={index}>
              <ListItemText primary={role} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">User Permissions:</Typography>
        <List dense>
          {userPermissions.map((permission, index) => (
            <ListItem key={index}>
              <ListItemText primary={permission} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Permission Checks:</Typography>
        <Typography>Has "manage_churches": {hasPermission('manage_churches') ? 'YES' : 'NO'}</Typography>
        <Typography>Has admin role: {hasRole(['admin']) ? 'YES' : 'NO'}</Typography>
        <Typography>Has super_admin role: {hasRole(['super_admin']) ? 'YES' : 'NO'}</Typography>
        <Typography>Has supervisor role: {hasRole(['supervisor']) ? 'YES' : 'NO'}</Typography>
      </Paper>
    </Box>
  );
};

export default PermissionDebugger;
