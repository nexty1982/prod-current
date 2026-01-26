import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Button, 
  Chip,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Language as LanguageIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { generateSVGThumbnail } from '@/utils/thumbnailGenerator';

interface LanguagePage {
  id: string;
  title: string;
  language: string;
  languageCode: string;
  flag: string;
  description: string;
  url: string;
  thumbnail: string;
  features: string[];
}

const languagePages: LanguagePage[] = [
  {
    id: 'en',
    title: 'Orthodox Church Records Management',
    language: 'English',
    languageCode: 'EN',
    flag: '🇺🇸',
    description: 'Complete digital solution for managing Baptism, Marriage, and Funeral records with liturgical accuracy.',
    url: '/orthodox_records_en.html',
    thumbnail: generateSVGThumbnail('Orthodox Church Records Management', 'English', '🇺🇸', 'EN'),
    features: ['Baptism Records', 'Marriage Records', 'Funeral Records', 'Liturgical Themes']
  },
  {
    id: 'el',
    title: 'Διαχείριση Εκκλησιαστικών Αρχείων',
    language: 'Greek',
    languageCode: 'EL',
    flag: '🇬🇷',
    description: 'Ολοκληρωμένη ψηφιακή λύση για τη διαχείριση αρχείων Βαπτίσεων, Γάμων και Κηδειών.',
    url: '/orthodox_records_el.html',
    thumbnail: generateSVGThumbnail('Διαχείριση Εκκλησιαστικών Αρχείων', 'Greek', '🇬🇷', 'EL'),
    features: ['Αρχεία Βαπτίσεων', 'Αρχεία Γάμων', 'Αρχεία Κηδειών', 'Λειτουργικά Θέματα']
  },
  {
    id: 'ro',
    title: 'Gestionarea Arhivelor Bisericești',
    language: 'Romanian',
    languageCode: 'RO',
    flag: '🇷🇴',
    description: 'Soluție digitală completă pentru gestionarea arhivelor de Botez, Căsătorie și Înmormântare.',
    url: '/orthodox_records_ro.html',
    thumbnail: generateSVGThumbnail('Gestionarea Arhivelor Bisericești', 'Romanian', '🇷🇴', 'RO'),
    features: ['Arhive de Botez', 'Arhive de Căsătorie', 'Arhive de Înmormântare', 'Teme Liturgice']
  },
  {
    id: 'ru',
    title: 'Управление Церковными Архивами',
    language: 'Russian',
    languageCode: 'RU',
    flag: '🇷🇺',
    description: 'Комплексное цифровое решение для управления архивами Крещений, Венчаний и Отпеваний.',
    url: '/orthodox_records_ru.html',
    thumbnail: generateSVGThumbnail('Управление Церковными Архивами', 'Russian', '🇷🇺', 'RU'),
    features: ['Архивы Крещений', 'Архивы Венчаний', 'Архивы Отпеваний', 'Литургические Темы']
  }
];

const MultilingualShowcase: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleOpenPage = (page: LanguagePage) => {
    window.open(page.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box textAlign="center" mb={6}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Typography 
            variant="h3" 
            component="h2" 
            fontWeight="bold" 
            gutterBottom
            sx={{
              background: 'linear-gradient(45deg, #4169E1 30%, #DAA520 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 2
            }}
          >
            <LanguageIcon sx={{ mr: 2, fontSize: 'inherit', color: '#DAA520' }} />
            Multilingual Orthodox Records
          </Typography>
          <Typography variant="h6" color="text.secondary" maxWidth="600px" mx="auto">
            Explore our Orthodox church records management system in multiple languages, 
            each featuring liturgical accuracy and cultural authenticity.
          </Typography>
        </motion.div>
      </Box>

      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)' 
          },
          gap: 4 
        }}
      >
        {languagePages.map((page, index) => (
          <Box key={page.id}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '2px solid transparent',
                  '&:hover': {
                    border: '2px solid #DAA520',
                    boxShadow: theme.shadows[8]
                  }
                }}
                onClick={() => handleOpenPage(page)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={page.thumbnail}
                  alt={`${page.title} thumbnail`}
                  sx={{ 
                    objectFit: 'cover',
                    background: 'linear-gradient(135deg, #4169E1 0%, #DAA520 100%)'
                  }}
                />
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h4" component="span" sx={{ mr: 1 }}>
                      {page.flag}
                    </Typography>
                    <Chip 
                      label={page.languageCode} 
                      size="small" 
                      sx={{ 
                        bgcolor: '#4169E1', 
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                  </Box>
                  
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {page.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {page.description}
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Features:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {page.features.map((feature, idx) => (
                        <Chip
                          key={idx}
                          label={feature}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.65rem',
                            height: 20,
                            borderColor: '#DAA520',
                            color: '#DAA520'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
                
                <Box p={2} pt={0}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<OpenInNewIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPage(page);
                    }}
                    sx={{
                      bgcolor: '#4169E1',
                      '&:hover': { bgcolor: '#1e3a8a' }
                    }}
                  >
                    View Orthodox Records
                  </Button>
                </Box>
              </Card>
            </motion.div>
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default MultilingualShowcase;
