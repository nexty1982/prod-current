import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { IconRefresh, IconSearch, IconSettings } from '@tabler/icons-react';

interface RegistryEntry {
  id: string;
  name: string;
  route: string;
  menuPath: string;
  apis: string[];
  db: string[];
  owner: string;
  status: 'active' | 'inactive' | 'development';
  description: string;
  created: string;
}

interface RegistryData {
  version: string;
  lastUpdated: string;
  components: RegistryEntry[];
}

const RegistryAdmin: React.FC = () => {
  const [registry, setRegistry] = useState<RegistryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [patchDialog, setPatchDialog] = useState(false);
  const [patchResult, setPatchResult] = useState<string>('');
  const [patchLoading, setPatchLoading] = useState(false);

  const loadRegistry = async () => {
    try {
      setLoading(true);
      // Load local registry.json for now
      const response = await fetch('/src/features/om-os/registry/registry.json');
      const data = await response.json();
      setRegistry(data);
    } catch (error) {
      console.error('Failed to load registry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatchRouterMenu = async () => {
    setPatchLoading(true);
    setPatchResult('');
    
    try {
      const response = await fetch('/api/om-os/patch-router-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPatchResult(`✅ Successfully patched Router and Menu:\n${result.message}`);
      } else {
        setPatchResult(`❌ Patch failed: ${result.error}`);
      }
    } catch (error) {
      setPatchResult(`❌ Network error: ${error}`);
    } finally {
      setPatchLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  const filteredComponents = registry?.components.filter(comp =>
    comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'development': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            OM OS Registry Admin
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<IconRefresh />}
              onClick={loadRegistry}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<IconSettings />}
              onClick={() => setPatchDialog(true)}
            >
              Patch Router + Menu
            </Button>
          </Box>
        </Box>

        {registry && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Registry Version: {registry.version} | Last Updated: {new Date(registry.lastUpdated).toLocaleString()}
          </Alert>
        )}

        <TextField
          fullWidth
          placeholder="Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <IconSearch size={20} style={{ marginRight: 8 }} />
          }}
          sx={{ mb: 3 }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Menu Path</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>APIs</TableCell>
                <TableCell>Owner</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredComponents.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{component.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {component.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {component.route}
                    </Typography>
                  </TableCell>
                  <TableCell>{component.menuPath}</TableCell>
                  <TableCell>
                    <Chip 
                      label={component.status}
                      color={getStatusColor(component.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {component.apis.map((api, index) => (
                        <Typography 
                          key={index}
                          variant="caption" 
                          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                        >
                          {api}
                        </Typography>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>{component.owner}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Patch Dialog */}
      <Dialog open={patchDialog} onClose={() => setPatchDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Patch Router and Menu Items</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will automatically update Router.tsx and MenuItems.ts to include all registered components under the "Devel Tools" section.
          </Typography>
          
          {patchResult && (
            <Alert severity={patchResult.includes('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{patchResult}</pre>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPatchDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePatchRouterMenu}
            disabled={patchLoading}
            startIcon={patchLoading ? <CircularProgress size={16} /> : null}
          >
            {patchLoading ? 'Patching...' : 'Patch Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RegistryAdmin;