import React from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Typography, Divider, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';

const MenuContainer = styled(Paper)({
  padding: '2rem',
  margin: '2rem auto',
  maxWidth: '800px',
  backgroundColor: '#ffffff',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
});

const MenuTitle = styled(Typography)({
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '1.5rem',
  textAlign: 'center',
});

const SectionTitle = styled(Typography)({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#C8A24B',
  marginTop: '1.5rem',
  marginBottom: '0.75rem',
  paddingLeft: '1rem',
});

const StyledListItem = styled(ListItem)({
  padding: 0,
  marginBottom: '0.25rem',
});

const StyledListItemButton = styled(ListItemButton)({
  borderRadius: '8px',
  padding: '12px 16px',
  '&:hover': {
    backgroundColor: '#FFF9E6',
    transform: 'translateX(4px)',
  },
  transition: 'all 0.2s ease',
});

const PagesMenu: React.FC = () => {
  // TSX Pages - React components
  const tsxPages = [
    { name: 'Homepage', path: '/frontend-pages/homepage', file: 'Homepage.tsx' },
    { name: 'About', path: '/frontend-pages/about', file: 'About.tsx' },
    { name: 'Contact', path: '/frontend-pages/contact', file: 'Contact.tsx' },
    { name: 'Blog', path: '/frontend-pages/blog', file: 'Blog.tsx' },
    { name: 'Blog Post', path: '/frontend-pages/blog/detail/1', file: 'BlogPost.tsx' },
    { name: 'Portfolio', path: '/frontend-pages/portfolio', file: 'Portfolio.tsx' },
    { name: 'Pricing', path: '/frontend-pages/pricing', file: 'Pricing.tsx' },
    { name: 'Orthodox Metrics Demo', path: '/demo', file: 'OrthodoxMetricsDemo.tsx' },
    { name: 'Upload Demo', path: '/frontend-pages/upload-demo', file: 'upload-demo.tsx' },
  ];

  // HTML Pages - Static HTML files (located in src/features/pages/frontend-pages/)
  // Note: These files may need to be moved to public/ directory to be directly accessible
  const htmlPages = [
    { name: 'Greek Baptism Table Demo', path: '/images/greek_baptism_table_demo.html', file: 'greek_baptism_table_demo.html' },
    { name: 'Russian Wedding Table Demo', path: '/images/russian_wedding_table_demo.html', file: 'russian_wedding_table_demo.html' },
    { name: 'Romanian Funeral Table Demo', path: '/images/romanian_funeral_table_demo.html', file: 'romanian_funeral_table_demo.html' },
    { name: 'Orthodox Records 3D Brand Grid', path: '/images/orthodox_records_3d_brand_grid.html', file: 'orthodox_records_3d_brand_grid.html' },
  ];

  return (
    <MenuContainer>
      <MenuTitle>Frontend Pages Menu</MenuTitle>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
        Navigate to all available pages in the frontend-pages directory
      </Typography>

      <Divider sx={{ my: 2 }} />

      <SectionTitle>React Components (.tsx)</SectionTitle>
      <List>
        {tsxPages.map((page) => (
          <StyledListItem key={page.path}>
            <StyledListItemButton component={Link} to={page.path}>
              <ListItemText
                primary={page.name}
                secondary={page.file}
                primaryTypographyProps={{
                  fontWeight: 500,
                  color: '#1a1a1a',
                }}
                secondaryTypographyProps={{
                  fontSize: '0.875rem',
                  color: '#666',
                }}
              />
            </StyledListItemButton>
          </StyledListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      <SectionTitle>HTML Pages (.html)</SectionTitle>
      <List>
        {htmlPages.map((page) => (
          <StyledListItem key={page.path}>
            <StyledListItemButton component="a" href={page.path} target="_blank" rel="noopener noreferrer">
              <ListItemText
                primary={page.name}
                secondary={page.file}
                primaryTypographyProps={{
                  fontWeight: 500,
                  color: '#1a1a1a',
                }}
                secondaryTypographyProps={{
                  fontSize: '0.875rem',
                  color: '#666',
                }}
              />
            </StyledListItemButton>
          </StyledListItem>
        ))}
      </List>
    </MenuContainer>
  );
};

export default PagesMenu;

