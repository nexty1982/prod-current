import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { sampleIcons } from './sample-icons';
import { BoundComponent, ComponentPaletteItem } from './types';

interface ComponentPreviewProps {
  selectedComponent: ComponentPaletteItem | null;
  boundComponents: BoundComponent[];
  currentFormData: any;
}

const ComponentPreview: React.FC<ComponentPreviewProps> = ({
  selectedComponent,
  boundComponents,
  currentFormData
}) => {
  const getIconComponent = (iconId: string) => {
    const icon = sampleIcons.find(i => i.id === iconId);
    return icon ? icon.icon : null;
  };

  const renderComponentPreview = () => {
    if (!selectedComponent) {
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: 200,
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2
        }}>
          <Typography variant="body1" color="text.secondary">
            Select a component from the palette to preview
          </Typography>
        </Box>
      );
    }

    const IconComponent = getIconComponent(selectedComponent.icon);

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Component Preview
        </Typography>
        
        <Paper sx={{ p: 3, mb: 2, textAlign: 'center' }}>
          {IconComponent && <IconComponent sx={{ fontSize: 64, mb: 2 }} />}
          <Typography variant="h5" gutterBottom>
            {currentFormData.name || selectedComponent.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {currentFormData.description || selectedComponent.description}
          </Typography>
          
          {currentFormData.size && (
            <Chip 
              label={`Size: ${currentFormData.size}`} 
              size="small" 
              sx={{ mr: 1 }}
            />
          )}
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CodeIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2">API Route</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {currentFormData.route || 'Not specified'}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StorageIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2">Database Table</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {currentFormData.dbTable || 'Not specified'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {currentFormData.roles && currentFormData.roles.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Access Roles
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {currentFormData.roles.map((role: string) => (
                <Chip key={role} label={role} size="small" />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderBoundComponents = () => {
    if (boundComponents.length === 0) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Saved Components
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No components saved yet
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Saved Components ({boundComponents.length})
        </Typography>
        <Grid container spacing={1}>
          {boundComponents.map((component) => {
            const IconComponent = getIconComponent(component.icon);
            
            return (
              <Grid item xs={6} sm={4} key={component.id}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  {IconComponent && <IconComponent sx={{ fontSize: 24, mb: 1 }} />}
                  <Typography variant="caption" display="block">
                    {component.name}
                  </Typography>
                  <Chip 
                    label={component.type} 
                    size="small" 
                    sx={{ mt: 0.5, fontSize: '0.6rem' }}
                  />
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {renderComponentPreview()}
        <Divider sx={{ my: 2 }} />
        {renderBoundComponents()}
      </CardContent>
    </Card>
  );
};

export default ComponentPreview; 