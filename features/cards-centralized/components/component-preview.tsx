/**
 * Component Preview Page - Dynamic component showcase
 * Displays components based on source/category from URL parameters
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Breadcrumb as MuiBreadcrumb,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  IconArrowLeft,
  IconExternalLink,
  IconCode,
  IconEye,
  IconBook,
  IconTag,
  IconComponents,
  IconLayout,
  IconForms,
  IconPalette,
  IconUsers,
  IconApps,
  IconTool,
  IconChartBar,
  IconDatabase
} from '@tabler/icons-react';

import PageContainer from '../../components/container/PageContainer';
import Breadcrumb from '../../layouts/full/shared/breadcrumb/Breadcrumb';
import { scanAllComponents, ComponentSource, ComponentInfo, ComponentCategory } from '../../utils/componentScanner';
import { componentRegistry, categoryLabels, sourceLabels, componentDifficulty, componentStatus } from '../../config/components.registry';

interface ComponentPreviewParams {
  source?: string;
  category?: string;
  component?: string;
}

const getCategoryIcon = (categoryName: string) => {
  switch (categoryName) {
    case 'forms': return <IconForms size={20} />;
    case 'layout': return <IconLayout size={20} />;
    case 'features': return <IconApps size={20} />;
    case 'utilities': return <IconTool size={20} />;
    case 'charts': return <IconChartBar size={20} />;
    case 'data': return <IconDatabase size={20} />;
    default: return <IconComponents size={20} />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'stable': return 'success';
    case 'beta': return 'warning';
    case 'alpha': return 'error';
    case 'deprecated': return 'default';
    default: return 'info';
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Beginner': return 'success';
    case 'Intermediate': return 'info';
    case 'Advanced': return 'warning';
    case 'Expert': return 'error';
    default: return 'default';
  }
};

const ComponentPreview: React.FC = () => {
  const params = useParams<ComponentPreviewParams>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allSources, setAllSources] = useState<ComponentSource[]>([]);
  const [currentSource, setCurrentSource] = useState<ComponentSource | null>(null);
  const [currentCategory, setCurrentCategory] = useState<ComponentCategory | null>(null);
  const [currentComponent, setCurrentComponent] = useState<ComponentInfo | null>(null);

  useEffect(() => {
    const loadComponents = async () => {
      setLoading(true);
      try {
        const sources = scanAllComponents(componentRegistry);
        setAllSources(sources);

        if (params.source) {
          const source = sources.find(s => s.name === params.source);
          setCurrentSource(source || null);

          if (source && params.category) {
            const category = source.categories.find(c => c.name === params.category);
            setCurrentCategory(category || null);

            if (category && params.component) {
              const component = category.components.find(c => 
                c.name.toLowerCase() === params.component.toLowerCase()
              );
              setCurrentComponent(component || null);
            }
          }
        }
      } catch (error) {
        console.error('Error loading components:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComponents();
  }, [params.source, params.category, params.component]);

  const breadcrumbs = [
    { title: 'Site Components' },
    ...(currentSource ? [{ title: sourceLabels[currentSource.name as keyof typeof sourceLabels] || currentSource.label }] : []),
    ...(currentCategory ? [{ title: categoryLabels[currentCategory.name as keyof typeof categoryLabels] || currentCategory.label }] : []),
    ...(currentComponent ? [{ title: currentComponent.name }] : [])
  ];

  if (loading) {
    return (
      <PageContainer title="Component Preview" description="Loading components...">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // Show all sources if no source specified
  if (!params.source) {
    return (
      <PageContainer title="Site Components" description="Browse all available component libraries">
        <Breadcrumb title="Site Components" items={[{ title: 'Site Components' }]} />
        
        <Grid container spacing={3}>
          {allSources.map((source) => (
            <Grid item xs={12} md={6} lg={4} key={source.name}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {sourceLabels[source.name as keyof typeof sourceLabels] || source.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {source.categories.length} categories with {source.categories.reduce((total, cat) => total + cat.components.length, 0)} components
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    {source.categories.map((category) => (
                      <Chip
                        key={category.name}
                        label={`${category.components.length} ${category.label}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                  
                  <Button
                    variant="contained"
                    startIcon={<IconEye />}
                    onClick={() => navigate(`/sandbox/component-preview/${source.name}`)}
                    fullWidth
                  >
                    Browse Components
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </PageContainer>
    );
  }

  // Show categories if source specified but no category
  if (currentSource && !params.category) {
    return (
      <PageContainer title={currentSource.label} description={`Browse ${currentSource.label} components`}>
        <Breadcrumb title={currentSource.label} items={breadcrumbs} />
        
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<IconArrowLeft />}
            onClick={() => navigate('/sandbox/component-preview')}
          >
            Back to All Sources
          </Button>
        </Box>

        <Grid container spacing={3}>
          {currentSource.categories.map((category) => (
            <Grid item xs={12} md={6} lg={4} key={category.name}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getCategoryIcon(category.name)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {categoryLabels[category.name as keyof typeof categoryLabels] || category.label}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {category.components.length} component{category.components.length !== 1 ? 's' : ''} available
                  </Typography>
                  
                  <List dense>
                    {category.components.slice(0, 3).map((component) => (
                      <ListItem key={component.name} sx={{ px: 0 }}>
                        <ListItemText
                          primary={component.name}
                          secondary={component.description?.substring(0, 50) + '...'}
                        />
                      </ListItem>
                    ))}
                    {category.components.length > 3 && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText secondary={`+ ${category.components.length - 3} more components`} />
                      </ListItem>
                    )}
                  </List>
                  
                  <Button
                    variant="contained"
                    startIcon={<IconEye />}
                    onClick={() => navigate(`/sandbox/component-preview/${currentSource.name}/${category.name}`)}
                    fullWidth
                  >
                    View Components
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </PageContainer>
    );
  }

  // Show components if category specified but no component
  if (currentSource && currentCategory && !params.component) {
    return (
      <PageContainer title={currentCategory.label} description={`Browse ${currentCategory.label} from ${currentSource.label}`}>
        <Breadcrumb title={currentCategory.label} items={breadcrumbs} />
        
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<IconArrowLeft />}
            onClick={() => navigate(`/sandbox/component-preview/${currentSource.name}`)}
          >
            Back to {currentSource.label}
          </Button>
        </Box>

        <Grid container spacing={3}>
          {currentCategory.components.map((component) => (
            <Grid item xs={12} md={6} lg={4} key={component.name}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {component.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {component.description || 'No description available'}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    {componentStatus[component.name as keyof typeof componentStatus] && (
                      <Chip
                        label={componentStatus[component.name as keyof typeof componentStatus]}
                        size="small"
                        color={getStatusColor(componentStatus[component.name as keyof typeof componentStatus]) as any}
                      />
                    )}
                    {componentDifficulty[component.name as keyof typeof componentDifficulty] && (
                      <Chip
                        label={componentDifficulty[component.name as keyof typeof componentDifficulty]}
                        size="small"
                        color={getDifficultyColor(componentDifficulty[component.name as keyof typeof componentDifficulty]) as any}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                  
                  {component.tags && (
                    <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                      {component.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  )}
                  
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<IconEye />}
                      onClick={() => navigate(component.path)}
                      size="small"
                    >
                      View Live
                    </Button>
                    <Tooltip title="View Documentation">
                      <IconButton size="small">
                        <IconBook />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Source Code">
                      <IconButton size="small">
                        <IconCode />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </PageContainer>
    );
  }

  // Show individual component (not implemented in this phase)
  if (currentComponent) {
    return (
      <PageContainer title={currentComponent.name} description={currentComponent.description}>
        <Breadcrumb title={currentComponent.name} items={breadcrumbs} />
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Individual component preview pages are not yet implemented. Use the "View Live" button to see the component in action.
        </Alert>
        
        <Button
          variant="contained"
          startIcon={<IconExternalLink />}
          onClick={() => navigate(currentComponent.path)}
        >
          View Live Component
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Component Not Found" description="The requested component could not be found">
      <Alert severity="error" sx={{ mb: 3 }}>
        Component not found. Please check the URL and try again.
      </Alert>
      
      <Button
        variant="contained"
        startIcon={<IconArrowLeft />}
        onClick={() => navigate('/sandbox/component-preview')}
      >
        Back to Site Components
      </Button>
    </PageContainer>
  );
};

export default ComponentPreview;