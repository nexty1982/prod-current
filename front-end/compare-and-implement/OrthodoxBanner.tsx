/**
 * Reusable Orthodox Banner Component
 * Updated with Orthodox Metrics LLC branding
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, useTheme } from '@mui/material';

// Language data
const languages = [
  { code: 'en', title: 'Orthodox\nMetrics LLC', tagline: 'Recording the Saints Among Us' },
  { code: 'el', title: 'Ορθόδοξες\nΜετρήσεις LLC', tagline: 'Καταγράφοντας τοὺς Ἁγίους ἀνάμεσά μας' },
  { code: 'ru', title: 'Православные\nМетрики LLC', tagline: 'Записывая святых среди нас' },
  { code: 'ro', title: 'Metrici\nOrtodoxe LLC', tagline: 'Înregistrăm sfinții din mijlocul nostru' },
  { code: 'ka', title: 'მართმადიდებლური\nმეტრიკა LLC', tagline: 'ვაკონწილებთ ჩვენ შორის წმინდანებს' }
];

interface OrthodoxBannerProps {
  title?: string;
  subtitle?: string;
  showGradient?: boolean;
  autoRotate?: boolean;
  initialLanguage?: string;
}

const OrthodoxBanner: React.FC<OrthodoxBannerProps> = ({
  title,
  subtitle,
  showGradient = true,
  autoRotate = true,
  initialLanguage = 'en'
}) => {
  const theme = useTheme();
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

  const isDark = theme.palette.mode === 'dark';
  
  return (
    <Box
      sx={{
        background: isDark
          ? (showGradient 
              ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`
              : theme.palette.background.default)
          : (showGradient 
              ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
              : '#f8f9fa'),
        py: 4,
        mb: 4,
        borderRadius: '0 0 20px 20px',
        boxShadow: isDark 
          ? '0 8px 32px rgba(0,0,0,0.3)'
          : '0 8px 32px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            flexDirection: 'row',
            textAlign: 'center',
            p: 4,
            bgcolor: isDark ? theme.palette.background.paper : 'white',
            borderRadius: 2,
            boxShadow: isDark 
              ? '0 4px 20px rgba(0, 0, 0, 0.3)'
              : '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Orthodox Metrics LLC Complete Logo */}
          <Box
            sx={{
              position: 'relative',
              width: 300,
              height: 200,
              order: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src="/images/incode/orthodox-metrics-logo.svg"
              alt="Orthodox Metrics LLC"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              onError={(e) => {
                // Fallback to text-based layout if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            
            {/* Fallback Text Layout */}
            <Box
              sx={{
                display: 'none',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                width: '100%',
              }}
            >
              {/* Orthodox Cross Icon */}
              <Box
                sx={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  filter: 'drop-shadow(0 4px 8px rgba(246, 201, 14, 0.3))',
                }}
              >
                {/* Fallback CSS Cross */}
                <Box
                  sx={{
                    position: 'absolute',
                    width: 80,
                    height: 80,
                    filter: 'drop-shadow(0 4px 8px rgba(246, 201, 14, 0.3))',
                  }}
                >
                  {/* Vertical beam */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      transform: 'translateX(-50%)',
                      width: 12,
                      height: 80,
                      bgcolor: '#F6C90E',
                    }}
                  />
                  {/* Top bar */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      top: 13,
                      transform: 'translateX(-50%)',
                      width: 30,
                      height: 8,
                      bgcolor: '#F6C90E',
                    }}
                  />
                  {/* Main bar */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      top: 30,
                      transform: 'translateX(-50%)',
                      width: 70,
                      height: 10,
                      bgcolor: '#F6C90E',
                    }}
                  />
                  {/* Bottom bar (angled) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      top: 53,
                      transform: 'translateX(-50%) rotate(-20deg)',
                      width: 50,
                      height: 8,
                      bgcolor: '#F6C90E',
                    }}
                  />
                </Box>
              </Box>

              {/* Company Name - Multilingual */}
              <Box
                sx={{
                  minWidth: 280,
                  textAlign: 'center',
                  position: 'relative',
                  height: 70,
                }}
              >
                {languages.map((lang, index) => (
                  <Typography
                    key={lang.code}
                    variant="h4"
                    sx={{
                      fontFamily: '"Noto Serif", "Times New Roman", serif',
                      fontWeight: 600,
                      color: isDark ? theme.palette.primary.main : '#4C1D95', // Royal purple from branding
                      fontSize: '1.8rem',
                      lineHeight: 1.3,
                      whiteSpace: 'pre-line',
                      position: 'absolute',
                      width: '100%',
                      opacity: index === currentIndex ? 1 : 0,
                      transition: 'opacity 1s ease-in-out',
                      textShadow: isDark 
                        ? '0 2px 4px rgba(0, 0, 0, 0.5)'
                        : '0 2px 4px rgba(76, 29, 149, 0.2)',
                    }}
                  >
                    {lang.title}
                  </Typography>
                ))}
              </Box>

              {/* Tagline - Multilingual */}
              <Box
                sx={{
                  minWidth: 250,
                  textAlign: 'center',
                  position: 'relative',
                  height: 60,
                }}
              >
                {languages.map((lang, index) => (
                  <Typography
                    key={lang.code}
                    variant="h5"
                    sx={{
                      fontFamily: '"Noto Serif", "Times New Roman", serif',
                      fontStyle: 'italic',
                      color: isDark ? theme.palette.secondary.main : '#F6C90E', // Gold from branding
                      fontSize: '1.4rem',
                      position: 'absolute',
                      width: '100%',
                      opacity: index === currentIndex ? 1 : 0,
                      transition: 'opacity 1s ease-in-out',
                      textShadow: isDark 
                        ? '0 2px 4px rgba(0, 0, 0, 0.5)'
                        : '0 2px 4px rgba(246, 201, 14, 0.3)',
                    }}
                  >
                    {lang.tagline}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default OrthodoxBanner;
