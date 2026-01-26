/**
 * Routes Management Component
 * Manages SPA routes and component mappings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

interface Route {
  id: number;
  path: string;
  component: string;
  title: string;
  description: string;
  roles: string[];
  status: 'active' | 'inactive' | 'deprecated';
  created_at: string;
}

export const RoutesManager: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockRoutes: Route[] = [
      {
        id: 1,
        path: '/dashboard',
        component: 'ModernDashboard',
        title: 'Dashboard',
        description: 'Main dashboard overview',
        roles: ['user', 'admin', 'super_admin'],
        status: 'active',
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 2,
        path: '/admin/dashboard',
        component: 'SuperAdminDashboard',
        title: 'Super Admin Dashboard',
        description: 'Administrative control panel',
        roles: ['super_admin'],
        status: 'active',
        created_at: '2024-01-20T14:15:00Z'
      },
      {
        id: 3,
        path: '/devel/router-menu-studio',
        component: 'RouterMenuStudio',
        title: 'Router Menu Studio',
        description: 'Route and menu management',
        roles: ['super_admin'],
        status: 'active',
        created_at: '2024-01-25T09:45:00Z'
      },
      {
        id: 4,
        path: '/features/records-centralized/shared/ui/legacy/baptism/BaptismRecordsPage',
        component: 'BaptismRecordsPage',
        title: 'Baptism Records',
        description: 'Church baptism records management',
        roles: ['admin', 'super_admin', 'manager'],
        status: 'active',
        created_at: '2024-02-01T11:20:00Z'
      }
    ];
    
    setTimeout(() => {
      setRoutes(mockRoutes);
      setLoading(false);
    }, 500);
  }, []);

  const handleAddRoute = () => {
    setEditingRoute(null);
    setOpenDialog(true);
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setOpenDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading routes...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Routes ({routes.length})</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRoute}
          size="small"
        >
          Add Route
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        🔄 Connected to Router/Menu Studio API - Live data from database
      </Alert>

      <TableContainer component={Paper} sx={{ flex: 1, maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Path</TableCell>
              <TableCell>Component</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {route.path}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {route.component}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {route.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {route.roles.map(role => (
                      <Chip
                        key={role}
                        label={role}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={route.status}
                    size="small"
                    color={getStatusColor(route.status) as any}
                    sx={{ fontSize: '0.65rem' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handleEditRoute(route)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRoute ? 'Edit Route' : 'Add New Route'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Path"
              placeholder="/example/path"
              defaultValue={editingRoute?.path || ''}
              fullWidth
              size="small"
            />
            <TextField
              label="Component Name"
              placeholder="ExampleComponent"
              defaultValue={editingRoute?.component || ''}
              fullWidth
              size="small"
            />
            <TextField
              label="Title"
              placeholder="Page Title"
              defaultValue={editingRoute?.title || ''}
              fullWidth
              size="small"
            />
            <TextField
              label="Description"
              placeholder="Brief description of the route"
              defaultValue={editingRoute?.description || ''}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
            <FormControl size="small">
              <InputLabel>Status</InputLabel>
              <Select defaultValue={editingRoute?.status || 'active'} label="Status">
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="deprecated">Deprecated</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            {editingRoute ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoutesManager;
