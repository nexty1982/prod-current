/**
 * Samples Component
 * 
 * Samples page for OrthodoxMetrics.
 * Displays links to various sample pages and demos.
 * 
 * Routes:
 * - /samples
 * - /frontend-pages/samples
 */

import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import HeaderAlert from '@/components/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import {
    MenuBook as MenuIcon,
    TableChart as TableIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Container,
    Divider,
    Grid,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SampleItem {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: string;
}

const Samples: React.FC = () => {
  const navigate = useNavigate();

  const sampleItems: SampleItem[] = [
    {
      title: 'Greek Baptism Table Demo',
      description: 'View the Greek baptism records table demo',
      path: '/greek_baptism_table_demo.html',
      icon: <TableIcon />,
      category: 'Records',
    },
    {
      title: 'Russian Wedding Table Demo',
      description: 'View the Russian wedding records table demo',
      path: '/russian_wedding_table_demo.html',
      icon: <TableIcon />,
      category: 'Records',
    },
    {
      title: 'Romanian Funeral Table Demo',
      description: 'View the Romanian funeral records table demo',
      path: '/romanian_funeral_table_demo.html',
      icon: <TableIcon />,
      category: 'Records',
    },
    {
      title: 'Frontend Pages Menu',
      description: 'Browse all available frontend pages',
      path: '/frontend-pages/menu',
      icon: <MenuIcon />,
      category: 'Navigation',
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const groupedSamples = sampleItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SampleItem[]>);

  return (
    <Box>
      <HeaderAlert />
      <HpHeader />

      {/* Banner */}
      <Box sx={{ backgroundColor: 'primary.light', py: { xs: 4, lg: 6 }, textAlign: 'center' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" fontWeight={700} mb={1}>
            Samples & Demos
          </Typography>
          <Typography variant="body1" color="text.secondary" fontSize="16px">
            Explore sample pages and demonstrations of Orthodox Metrics
          </Typography>
        </Container>
      </Box>

      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">

        {Object.entries(groupedSamples).map(([category, items]) => (
          <Box key={category} sx={{ mb: 6 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              {category}
            </Typography>
            <Grid container spacing={3}>
              {items.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.path}>
                  <Card
                    sx={{
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleNavigate(item.path)}
                      sx={{ height: '100%' }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 2,
                            color: 'primary.main',
                          }}
                        >
                          {item.icon}
                          <Typography variant="h6" sx={{ ml: 1.5 }}>
                            {item.title}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}

        <Divider sx={{ my: 6 }} />

        <Box>
          <Typography variant="h5" gutterBottom>
            Quick Links
          </Typography>
          <List>
            {sampleItems.map((item, index) => (
              <React.Fragment key={item.path}>
                <ListItem
                  button
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                  />
                  <Chip label={item.category} size="small" />
                </ListItem>
                {index < sampleItems.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Container>
      </Box>

      <C2a />
      <Footer />
      <ScrollToTop />
    </Box>
  );
};

export default Samples;
