/**
 * Reusable Orthodox Banner Component
 * Multilingual rotating banner with Orthodox cross
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container } from '@mui/material';

// Language data
const languages = [
  { code: 'en', title: 'Orthodox\nMetrics', tagline: 'Recording the Saints Amongst Us!' },
  { code: 'el', title: 'Ορθόδοξες\nΜετρήσεις', tagline: 'Καταγράφοντας τοὺς Ἁγίους ἀνάμεσά μας!' },
  { code: 'ru', title: 'Православные\nМетрики', tagline: 'Записывая святых среди нас!' },
  { code: 'ro', title: 'Metrici\nOrtodoxe', tagline: 'Înregistrăm sfinții din mijlocul nostru!' },
  { code: 'ka', title: 'მართმადიდებლური\nმეტრიკა', tagline: 'ვაკონწილებთ ჩვენ შორის წმინდანებს!' }
];

interface OrthodoxBannerProps {
  title?: string;
  subtitle?: string;
  showGradient?: boolean;
  compact?: boolean;
  autoRotate?: boolean;
  initialLanguage?: string;
}
const OrthodoxBanner: React.FC<OrthodoxBannerProps> = ({
  title,
  subtitle,
  showGradient = true,
  compact = false,
  autoRotate = true,
  initialLanguage = 'en'
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    languages.findIndex(lang => lang.code === initialLanguage) || 0
  );

  useEffect(() => {
    if (!autoRotate) return;

    const rotateText = () => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % languages.length);
    };

    // Start rotation after 3 seconds, then every 4 seconds
    const initialTimeout = setTimeout(() => {
      rotateText();
      const interval = setInterval(rotateText, 4000);
      
      return () => clearInterval(interval);
    }, 3000);

    return () => clearTimeout(initialTimeout);
  }, [autoRotate]);

  const currentLanguage = languages[currentIndex];

  return (
    <Box
      sx={{
        background: showGradient 
          ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
          : '#f8f9fa',
        py: compact ? 2 : 4,
        mb: compact ? 2 : 4,
        borderRadius: '0 0 20px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Container maxWidth={compact ? 'sm' : 'md'}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 2, sm: 4, md: 6 },
            flexDirection: { xs: 'column', sm: 'row' },
            textAlign: 'center',
            p: compact ? 2 : 4,
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Left Text */}
          <Typography
            variant={compact ? 'h5' : 'h4'}
            sx={{
              fontFamily: '"Noto Serif", "Times New Roman", serif',
              fontWeight: 600,
              color: '#6B46C1',
              fontSize: compact 
                ? { xs: '1.2rem', sm: '1.5rem' }
                : { xs: '1.5rem', sm: '2rem' },
              lineHeight: 1.3,
              textAlign: { xs: 'center', sm: 'right' },
              order: { xs: 1, sm: 0 },
              whiteSpace: 'pre-line',
            }}
          >
            {title || 'Orthodox\nMetrics'}
          </Typography>

          {/* Orthodox Cross */}
          <Box
            sx={{
              position: 'relative',
              width: compact ? 60 : 80,
              height: compact ? 90 : 120,
              filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))',
              order: { xs: 0, sm: 1 },
            }}
          >
            {/* Vertical beam */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: 0,
                transform: 'translateX(-50%)',
                width: compact ? 9 : 12,
                height: compact ? 90 : 120,
                bgcolor: '#FFD700',
              }}
            />
            {/* Top bar */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: compact ? 15 : 20,
                transform: 'translateX(-50%)',
                width: compact ? 22 : 30,
                height: compact ? 6 : 8,
                bgcolor: '#FFD700',
              }}
            />
            {/* Main bar */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: compact ? 34 : 45,
                transform: 'translateX(-50%)',
                width: compact ? 52 : 70,
                height: compact ? 7 : 10,
                bgcolor: '#FFD700',
              }}
            />
            {/* Bottom bar (angled) */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: compact ? 60 : 80,
                transform: 'translateX(-50%) rotate(-20deg)',
                width: compact ? 37 : 50,
                height: compact ? 6 : 8,
                bgcolor: '#FFD700',
              }}
            />
          </Box>

          {/* Right Text - Multilingual */}
          <Box
            sx={{
              minWidth: compact ? 180 : 250,
              textAlign: { xs: 'center', sm: 'left' },
              position: 'relative',
              height: compact ? 45 : 60,
              order: { xs: 2, sm: 2 },
            }}
          >
            {languages.map((lang, index) => (
              <Typography
                key={lang.code}
                variant={compact ? 'h6' : 'h4'}
                sx={{
                  fontFamily: '"Noto Serif", "Times New Roman", serif',
                  fontWeight: 600,
                  color: '#6B46C1',
                  fontSize: compact 
                    ? { xs: '1rem', sm: '1.25rem' }
                    : { xs: '1.5rem', sm: '2rem' },
                  lineHeight: 1.3,
                  whiteSpace: 'pre-line',
                  position: 'absolute',
                  width: '100%',
                  opacity: index === currentIndex ? 1 : 0,
                  transition: 'opacity 1s ease-in-out',
                }}
              >
                {lang.title}
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Tagline */}
        <Box sx={{ textAlign: 'center', mt: compact ? 2 : 3 }}>
          <Box sx={{ position: 'relative', height: compact ? 20 : 30 }}>
            {languages.map((lang, index) => (
              <Typography
                key={lang.code}
                variant={compact ? 'body1' : 'h6'}
                sx={{
                  fontFamily: '"Noto Serif", "Times New Roman", serif',
                  fontStyle: 'italic',
                  color: '#6B46C1',
                  fontSize: compact 
                    ? { xs: '0.9rem', sm: '1rem' }
                    : { xs: '1rem', sm: '1.25rem' },
                  position: 'absolute',
                  width: '100%',
                  opacity: index === currentIndex ? 1 : 0,
                  transition: 'opacity 1s ease-in-out',
                }}
              >
                {lang.tagline}
              </Typography>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default OrthodoxBanner;
