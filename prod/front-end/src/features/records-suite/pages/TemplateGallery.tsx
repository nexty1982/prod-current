import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  IconTemplate,
  IconEye,
  IconDownload,
  IconPlus,
  IconEdit
} from '@tabler/icons-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'orthodox_classic' | 'minimal_clean' | 'custom';
  preview: string;
  themeVars: {
    primaryColor: string;
    railColor: string;
    headerStyle: string;
  };
  version: string;
  isPublished: boolean;
  createdAt: string;
}

const TemplateGallery: React.FC = () => {
  const [templates] = useState<Template[]>([
    {
      id: 'orthodox-classic',
      name: 'Orthodox Classic',
      description: 'Traditional Orthodox styling with gold accents, decorative rails, and liturgical iconography.',
      category: 'orthodox_classic',
      preview: '/records-suite/previews/orthodox-classic.png',
      themeVars: {
        primaryColor: '#D4AF37',
        railColor: '#8B7355',
        headerStyle: 'ornate'
      },
      version: '1.0.0',
      isPublished: true,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'minimal-clean',
      name: 'Minimal Clean',
      description: 'Clean, modern interface with subtle rails and minimal decorative elements.',
      category: 'minimal_clean',
      preview: '/records-suite/previews/minimal-clean.png',
      themeVars: {
        primaryColor: '#2563EB',
        railColor: '#E5E7EB',
        headerStyle: 'simple'
      },
      version: '1.0.0',
      isPublished: true,
      createdAt: '2024-01-01T00:00:00Z'
    }
  ]);

  const [createDialog, setCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'custom' as const
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'orthodox_classic': return 'warning';
      case 'minimal_clean': return 'primary';
      case 'custom': return 'secondary';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'orthodox_classic': return 'Orthodox Classic';
      case 'minimal_clean': return 'Minimal Clean';
      case 'custom': return 'Custom';
      default: return category;
    }
  };

  const handleCreateTemplate = () => {
    console.log('Creating template:', newTemplate);
    setCreateDialog(false);
    setNewTemplate({ name: '', description: '', category: 'custom' });
  };

  const handlePreviewTemplate = (template: Template) => {
    console.log('Previewing template:', template.id);
  };

  const handleDownloadTemplate = (template: Template) => {
    console.log('Downloading template:', template.id);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconTemplate size={32} style={{ marginRight: 16 }} />
            <Typography variant="h4" component="h1">
              Template Gallery
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<IconPlus />}
            onClick={() => setCreateDialog(true)}
          >
            Create Template
          </Button>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Browse and manage display templates for records. Each template defines the visual style, layout, 
          and theming for parish record displays.
        </Typography>

        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 200,
                    background: `linear-gradient(45deg, ${template.themeVars.primaryColor}22, ${template.themeVars.railColor}22)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h6" color="text.secondary">
                    Template Preview
                  </Typography>
                </CardMedia>
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3">
                      {template.name}
                    </Typography>
                    <Chip
                      label={getCategoryLabel(template.category)}
                      color={getCategoryColor(template.category) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip 
                      label={`v${template.version}`} 
                      size="small" 
                      variant="outlined" 
                    />
                    {template.isPublished && (
                      <Chip 
                        label="Published" 
                        size="small" 
                        color="success" 
                        variant="outlined" 
                      />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(template.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<IconEye />}
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="small"
                    startIcon={<IconDownload />}
                    onClick={() => handleDownloadTemplate(template)}
                  >
                    Use
                  </Button>
                  <Button
                    size="small"
                    startIcon={<IconEdit />}
                    color="secondary"
                  >
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Create Template Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            variant="outlined"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newTemplate.description}
            onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={newTemplate.category}
              label="Category"
              onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
            >
              <MenuItem value="orthodox_classic">Orthodox Classic</MenuItem>
              <MenuItem value="minimal_clean">Minimal Clean</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateTemplate}
            disabled={!newTemplate.name.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateGallery;