import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Badge,
  Avatar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Category as CategoryIcon,
  Assessment as AssessmentIcon,
  Extension as ExtensionIcon,
  Menu as MenuIcon,
  Router as RouterIcon,
  Widgets as WidgetsIcon
} from '@mui/icons-material';

interface ComponentInfo {
  name: string;
  displayName: string;
  filePath: string;
  relativePath: string;
  directory: string;
  category: string;
  icon: string;
  description: string;
  tags: string[];
  props: Array<{
    name: string;
    optional: boolean;
    type: string;
    description: string;
  }>;
  usage: {
    inMenu: boolean;
    inRoutes: boolean;
    menuContext: string | null;
    routeContext: string | null;
  };
  hasHooks: boolean;
  hasJSX: boolean;
  isDefault: boolean;
  dependencies: string[];
  size: number;
  lines: number;
}

interface DiscoveryResult {
  components: ComponentInfo[];
  summary: {
    totalComponents: number;
    categories: Record<string, number>;
    directories: Record<string, number>;
    inMenu: number;
    inRoutes: number;
    withProps: number;
    withHooks: number;
    extensions: Record<string, number>;
  };
  timestamp: string;
}

interface ComponentDiscoveryPanelProps {
  onComponentsDiscovered?: (components: ComponentInfo[]) => void;
}

const ComponentDiscoveryPanel: React.FC<ComponentDiscoveryPanelProps> = ({
  onComponentsDiscovered
}) => {
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing discovery results on mount
  useEffect(() => {
    loadDiscoveryResults();
  }, []);

  const loadDiscoveryResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/components/list');
      const data = await response.json();
      
      if (data.success) {
        setDiscoveryResult(data.data);
        if (onComponentsDiscovered) {
          onComponentsDiscovered(data.data.components);
        }
      } else {
        setError(data.error || 'Failed to load components');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load discovery results');
    } finally {
      setLoading(false);
    }
  };

  const runDiscovery = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/components/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDiscoveryResult(data.data);
        if (onComponentsDiscovered) {
          onComponentsDiscovered(data.data.components);
        }
      } else {
        setError(data.error || 'Discovery failed');
      }
    } catch (err: any) {
      setError(err.message || 'Discovery failed');
    } finally {
      setLoading(false);
    }
  };

  const refreshDiscovery = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/components/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDiscoveryResult(data.data);
        if (onComponentsDiscovered) {
          onComponentsDiscovered(data.data.components);
        }
      } else {
        setError(data.error || 'Refresh failed');
      }
    } catch (err: any) {
      setError(err.message || 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!discoveryResult) return;
    
    const dataStr = JSON.stringify(discoveryResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'auto-discovered-components.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openComponentDetails = (component: ComponentInfo) => {
    setSelectedComponent(component);
    setDetailsDialogOpen(true);
  };

  const getFilteredComponents = () => {
    if (!discoveryResult) return [];
    
    let filtered = discoveryResult.components;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.relativePath.toLowerCase().includes(query) ||
        c.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }
    
    return filtered;
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      navigation: <RouterIcon />,
      data: <ExtensionIcon />,
      display: <WidgetsIcon />,
      action: <SettingsIcon />
    };
    
    return iconMap[category] || <ExtensionIcon />;
  };

  const getCategoryColor = (category: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    const colorMap: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
      navigation: 'primary',
      data: 'info',
      display: 'success',
      action: 'warning'
    };
    
    return colorMap[category] || 'default';
  };

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h6" gutterBottom>
          Component Discovery
        </Typography>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Scanning frontend codebase for React components...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h5" gutterBottom>
          🔍 Component Discovery
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshDiscovery}
            disabled={loading}
          >
            Refresh
          </Button>
          {!discoveryResult && (
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={runDiscovery}
              disabled={loading}
            >
              Discover Components
            </Button>
          )}
          {discoveryResult && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadResults}
            >
              Download
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!discoveryResult && !loading && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Discover Frontend Components
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Automatically scan the frontend codebase to identify all React components and populate the OMB palette.
            </Typography>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={runDiscovery}
              size="large"
            >
              Start Discovery
            </Button>
          </CardContent>
        </Card>
      )}

      {discoveryResult && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Components
                  </Typography>
                  <Typography variant="h4">
                    {discoveryResult.summary.totalComponents}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    In Menu System
                  </Typography>
                  <Typography variant="h4">
                    {discoveryResult.summary.inMenu}
                  </Typography>
                  <Typography variant="body2">
                    {Math.round((discoveryResult.summary.inMenu / discoveryResult.summary.totalComponents) * 100)}% coverage
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    With Props
                  </Typography>
                  <Typography variant="h4">
                    {discoveryResult.summary.withProps}
                  </Typography>
                  <Typography variant="body2">
                    Configurable components
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Using Hooks
                  </Typography>
                  <Typography variant="h4">
                    {discoveryResult.summary.withHooks}
                  </Typography>
                  <Typography variant="body2">
                    Modern React components
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
                <Tab label="Components" icon={<WidgetsIcon />} />
                <Tab label="Categories" icon={<CategoryIcon />} />
                <Tab label="Statistics" icon={<AssessmentIcon />} />
              </Tabs>
            </Box>

            <TabPanel value={selectedTab} index={0}>
              {/* Search and Filter */}
              <Box p={2} display="flex" gap={2} alignItems="center">
                <TextField
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                  sx={{ flexGrow: 1 }}
                />
                <TextField
                  select
                  label="Category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  size="small"
                  SelectProps={{ native: true }}
                  sx={{ minWidth: 120 }}
                >
                  <option value="all">All</option>
                  <option value="navigation">Navigation</option>
                  <option value="data">Data</option>
                  <option value="display">Display</option>
                  <option value="action">Action</option>
                </TextField>
              </Box>

              {/* Components List */}
              <Grid container spacing={2} p={2}>
                {getFilteredComponents().map((component) => (
                  <Grid item xs={12} md={6} lg={4} key={component.name}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 4 }
                      }}
                      onClick={() => openComponentDetails(component)}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Avatar sx={{ mr: 1, bgcolor: getCategoryColor(component.category) }}>
                            {getCategoryIcon(component.category)}
                          </Avatar>
                          <Box flexGrow={1}>
                            <Typography variant="h6" noWrap>
                              {component.displayName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {component.relativePath}
                            </Typography>
                          </Box>
                          <Box display="flex" gap={1}>
                            {component.usage.inMenu && (
                              <Tooltip title="In Menu">
                                <MenuIcon color="primary" fontSize="small" />
                              </Tooltip>
                            )}
                            {component.usage.inRoutes && (
                              <Tooltip title="In Routes">
                                <RouterIcon color="success" fontSize="small" />
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {component.description}
                        </Typography>
                        
                        <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                          <Chip 
                            label={component.category} 
                            size="small" 
                            color={getCategoryColor(component.category)}
                          />
                          {component.hasHooks && (
                            <Chip label="hooks" size="small" variant="outlined" />
                          )}
                          {component.props.length > 0 && (
                            <Chip 
                              label={`${component.props.length} props`} 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary">
                          {component.lines} lines • {Math.round(component.size / 1024)}KB
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </TabPanel>

            <TabPanel value={selectedTab} index={1}>
              <Box p={2}>
                <Grid container spacing={2}>
                  {Object.entries(discoveryResult.summary.categories).map(([category, count]) => (
                    <Grid item xs={12} md={6} key={category}>
                      <Card>
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={1}>
                            {getCategoryIcon(category)}
                            <Typography variant="h6" ml={1}>
                              {category}
                            </Typography>
                          </Box>
                          <Typography variant="h4" color={getCategoryColor(category)}>
                            {count}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {Math.round((count / discoveryResult.summary.totalComponents) * 100)}% of total
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>

            <TabPanel value={selectedTab} index={2}>
              <Box p={2}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Directory Distribution</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Directory</TableCell>
                            <TableCell align="right">Components</TableCell>
                            <TableCell align="right">Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(discoveryResult.summary.directories)
                            .sort(([,a], [,b]) => b - a)
                            .map(([directory, count]) => (
                              <TableRow key={directory}>
                                <TableCell>{directory}</TableCell>
                                <TableCell align="right">{count}</TableCell>
                                <TableCell align="right">
                                  {Math.round((count / discoveryResult.summary.totalComponents) * 100)}%
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">File Extensions</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {Object.entries(discoveryResult.summary.extensions).map(([ext, count]) => (
                        <Chip 
                          key={ext}
                          label={`${ext} (${count})`}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </TabPanel>
          </Card>
        </>
      )}

      {/* Component Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedComponent && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ mr: 2, bgcolor: getCategoryColor(selectedComponent.category) }}>
                  {getCategoryIcon(selectedComponent.category)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedComponent.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedComponent.relativePath}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box mb={2}>
                <Typography variant="body1" paragraph>
                  {selectedComponent.description}
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                  {selectedComponent.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>

              {selectedComponent.props.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Props ({selectedComponent.props.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Required</TableCell>
                            <TableCell>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedComponent.props.map(prop => (
                            <TableRow key={prop.name}>
                              <TableCell>
                                <code>{prop.name}</code>
                              </TableCell>
                              <TableCell>
                                <code>{prop.type}</code>
                              </TableCell>
                              <TableCell>
                                {!prop.optional ? (
                                  <Chip label="Required" size="small" color="error" />
                                ) : (
                                  <Chip label="Optional" size="small" variant="outlined" />
                                )}
                              </TableCell>
                              <TableCell>{prop.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              )}

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Technical Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">File Size</Typography>
                      <Typography>{Math.round(selectedComponent.size / 1024)}KB</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Lines of Code</Typography>
                      <Typography>{selectedComponent.lines}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Uses Hooks</Typography>
                      <Typography>{selectedComponent.hasHooks ? 'Yes' : 'No'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Has JSX</Typography>
                      <Typography>{selectedComponent.hasJSX ? 'Yes' : 'No'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Default Export</Typography>
                      <Typography>{selectedComponent.isDefault ? 'Yes' : 'No'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Dependencies</Typography>
                      <Typography>{selectedComponent.dependencies.length}</Typography>
                    </Grid>
                  </Grid>

                  {selectedComponent.dependencies.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Dependencies:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {selectedComponent.dependencies.map(dep => (
                          <Chip key={dep} label={dep} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Usage</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">In Menu System</Typography>
                      <Typography>
                        {selectedComponent.usage.inMenu ? (
                          <Chip label="Yes" size="small" color="success" />
                        ) : (
                          <Chip label="No" size="small" color="default" />
                        )}
                      </Typography>
                      {selectedComponent.usage.menuContext && (
                        <Typography variant="caption" display="block">
                          Context: {selectedComponent.usage.menuContext}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">In Routes</Typography>
                      <Typography>
                        {selectedComponent.usage.inRoutes ? (
                          <Chip label="Yes" size="small" color="success" />
                        ) : (
                          <Chip label="No" size="small" color="default" />
                        )}
                      </Typography>
                      {selectedComponent.usage.routeContext && (
                        <Typography variant="caption" display="block">
                          Context: {selectedComponent.usage.routeContext}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ComponentDiscoveryPanel; 