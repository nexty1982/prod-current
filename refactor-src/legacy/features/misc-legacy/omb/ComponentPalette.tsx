import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { sampleIcons } from './sample-icons';
import { ComponentPaletteItem } from './types';
// Import discovered components
import discoveredComponents from '@/config/omb-discovered-components.json';

interface ComponentPaletteProps {
  onComponentSelect: (component: ComponentPaletteItem) => void;
  selectedComponent: ComponentPaletteItem | null;
}

const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onComponentSelect,
  selectedComponent
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');

  const categories = [
    { label: 'All', value: 'all' },
    { label: 'Navigation', value: 'navigation' },
    { label: 'Data', value: 'data' },
    { label: 'Action', value: 'action' },
    { label: 'Display', value: 'display' }
  ];

  // Convert discovered components to ComponentPaletteItem format
  const convertedComponents: ComponentPaletteItem[] = React.useMemo(() => {
    if (!discoveredComponents?.components) {
      console.warn('No discovered components found, falling back to sample icons');
      return sampleIcons;
    }

    return discoveredComponents.components.map((comp: any) => ({
      id: comp.id,
      name: comp.name,
      icon: comp.icon || 'Components', // Fallback icon
      type: 'component',
      description: comp.description,
      category: comp.category,
      tags: comp.tags || [],
      props: comp.props || [],
      configurable: comp.configurable || false,
      path: comp.path,
      usage: comp.usage
    }));
  }, []);

  // Filter components based on active tab
  const filteredComponents = React.useMemo(() => {
    const components = convertedComponents.length > 0 ? convertedComponents : sampleIcons;
    
    if (activeTab === 0) {
      return components;
    }
    
    const categoryValue = categories[activeTab].value;
    return components.filter(comp => comp.category === categoryValue);
  }, [activeTab, convertedComponents]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleComponentClick = (component: any) => {
    const paletteItem: ComponentPaletteItem = {
      id: component.id,
      name: component.name,
      icon: component.icon,
      type: component.type || 'component',
      description: component.description,
      category: component.category,
      tags: component.tags || [],
      props: component.props || [],
      configurable: component.configurable || false,
      path: component.path,
      usage: component.usage
    };
    onComponentSelect(paletteItem);
  };

  // Dynamic icon import helper
  const getIconComponent = (iconName: string) => {
    // Try to dynamically import from Material-UI icons
    try {
      // For now, return a default icon component
      const DefaultIcon = () => (
        <div style={{ 
          width: 32, 
          height: 32, 
          backgroundColor: '#1976d2', 
          borderRadius: 4, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {iconName?.substring(0, 2)?.toUpperCase() || 'C'}
        </div>
      );
      return DefaultIcon;
    } catch (error) {
      console.warn(`Could not load icon: ${iconName}`);
      return () => <div>📦</div>;
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          Component Palette
          {convertedComponents.length > 0 && (
            <Chip 
              label={`${convertedComponents.length} components`} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {categories.map((category, index) => (
            <Tab 
              key={category.value} 
              label={`${category.label} ${activeTab === index ? `(${filteredComponents.length})` : ''}`}
            />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            <Grid container spacing={1}>
              {filteredComponents.map((component) => {
                const isSelected = selectedComponent?.id === component.id;
                const IconComponent = typeof component.icon === 'string' 
                  ? getIconComponent(component.icon)
                  : component.icon;
                
                return (
                  <Grid item xs={6} sm={4} key={component.id}>
                    <Paper
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        backgroundColor: isSelected ? 'primary.light' : 'background.paper',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          borderColor: 'primary.main'
                        },
                        minHeight: 90
                      }}
                      onClick={() => handleComponentClick(component)}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <IconComponent />
                        <Typography 
                          variant="caption" 
                          textAlign="center" 
                          sx={{ 
                            fontSize: '0.7rem',
                            mt: 0.5,
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {component.name}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                          <Chip 
                            label={component.category} 
                            size="small" 
                            sx={{ fontSize: '0.6rem', height: 16 }}
                            color={component.category === 'navigation' ? 'primary' : 
                                   component.category === 'data' ? 'success' :
                                   component.category === 'action' ? 'warning' : 'info'}
                          />
                          {component.configurable && (
                            <Chip 
                              label="⚙️" 
                              size="small" 
                              sx={{ fontSize: '0.6rem', height: 16 }}
                              color="secondary"
                            />
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {selectedComponent && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected: {selectedComponent.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedComponent.description}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ComponentPalette; 