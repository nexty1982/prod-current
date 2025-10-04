import React from 'react';
import { Box, Typography, Grid, Card, CardMedia, IconButton, Chip } from '@mui/material';
import { IconHeart, IconShare, IconDownload } from '@tabler/icons-react';

const Gallery = () => {
  // Mock data for gallery images
  const galleryImages = [
    {
      id: 1,
      src: '/images/gallery/gallery-1.jpg',
      title: 'Sunset at the Beach',
      likes: 24,
      downloads: 8,
      tags: ['nature', 'sunset', 'beach']
    },
    {
      id: 2,
      src: '/images/gallery/gallery-2.jpg',
      title: 'Mountain View',
      likes: 18,
      downloads: 12,
      tags: ['nature', 'mountain', 'landscape']
    },
    {
      id: 3,
      src: '/images/gallery/gallery-3.jpg',
      title: 'City Lights',
      likes: 32,
      downloads: 15,
      tags: ['city', 'night', 'lights']
    },
    {
      id: 4,
      src: '/images/gallery/gallery-4.jpg',
      title: 'Forest Path',
      likes: 15,
      downloads: 6,
      tags: ['nature', 'forest', 'path']
    },
    {
      id: 5,
      src: '/images/gallery/gallery-5.jpg',
      title: 'Ocean Waves',
      likes: 28,
      downloads: 10,
      tags: ['ocean', 'waves', 'blue']
    },
    {
      id: 6,
      src: '/images/gallery/gallery-6.jpg',
      title: 'Urban Architecture',
      likes: 21,
      downloads: 9,
      tags: ['architecture', 'urban', 'building']
    }
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Gallery
      </Typography>
      
      <Grid container spacing={2}>
        {galleryImages.map((image) => (
          <Grid item xs={12} sm={6} md={4} key={image.id}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image={image.src}
                alt={image.title}
                sx={{ 
                  objectFit: 'cover',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    transition: 'transform 0.3s ease-in-out'
                  }
                }}
              />
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {image.title}
                </Typography>
                
                <Box display="flex" gap={1} mb={2}>
                  {image.tags.map((tag, index) => (
                    <Chip 
                      key={index}
                      label={tag} 
                      size="small" 
                      variant="outlined"
                    />
                  ))}
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" gap={1}>
                    <IconButton size="small" color="error">
                      <IconHeart size={16} />
                    </IconButton>
                    <Typography variant="body2" color="textSecondary">
                      {image.likes}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" gap={1}>
                    <IconButton size="small">
                      <IconShare size={16} />
                    </IconButton>
                    <IconButton size="small">
                      <IconDownload size={16} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Gallery;
