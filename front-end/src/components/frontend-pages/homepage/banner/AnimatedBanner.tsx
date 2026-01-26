import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  useTheme,
  styled,
  keyframes,
} from '@mui/material';
import { motion } from 'framer-motion';

// Language data
const languages = [
  {
    code: 'en',
    title: 'Orthodox\nMetrics',
    tagline: 'Recording the Saints Amongst Us!'
  },
  {
    code: 'el',
    title: 'Ορθόδοξες\nΜετρήσεις',
    tagline: 'Καταγράφοντας τοὺς Ἁγίους ἀνάμεσά μας!'
  },
  {
    code: 'ru',
    title: 'Православные\nМетрики',
    tagline: 'Записывая святых среди нас!'
  },
  {
    code: 'ro',
    title: 'Metrici\nOrtodoxe',
    tagline: 'Înregistrăm sfinții din mijlocul nostru!'
  },
  {
    code: 'ka',
    title: 'მართმადიდებლური\nმეტრიკა',
    tagline: 'ვაკონწილებთ ჩვენ შორის წმინდანებს!'
  }
];

// Keyframes for the liturgical color wave animation
const liturgicalWave = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// Styled components
const BannerContainer = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  padding: theme.spacing(4, 2),
  borderRadius: '0 0 20px 20px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
  minHeight: '40vh',
  width: '100%',
  [theme.breakpoints.down('sm')]: {
    minHeight: '35vh',
    padding: theme.spacing(3, 1),
  },
}));

const LiturgicalWave = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '-50%',
  left: '-50%',
  right: '-50%',
  bottom: '-50%',
  background: `linear-gradient(
    90deg,
    #6B46C1 0%,
    #DC2626 14.28%,
    #059669 28.56%,
    #FFD700 42.84%,
    #2563EB 57.12%,
    #000000 71.4%,
    #FFFFFF 85.68%,
    #6B46C1 100%
  )`,
  backgroundSize: '300% 300%',
  animation: `${liturgicalWave} 45s ease-in-out infinite`,
  opacity: 0.2,
  filter: 'blur(48px)',
  mixBlendMode: 'soft-light',
  zIndex: 0,
  pointerEvents: 'none',
}));

const MainContent = styled(Box)(({ theme }) => ({
  background: 'white',
  padding: theme.spacing(3),
  borderRadius: theme.spacing(1.25),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  maxWidth: '800px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(3),
  flexWrap: 'wrap',
  position: 'relative',
  zIndex: 1,
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
  },
}));

const OrthodoxCross = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: 50,
  height: 75,
  filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.4))',
  [theme.breakpoints.down('sm')]: {
    order: -1,
    width: 40,
    height: 60,
  },
}));

const CrossBar = styled(Box)({
  background: '#FFD700',
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
});

const TextTransition = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  width: '100%',
  opacity: 0,
  transition: 'opacity 1s ease-in-out',
  fontFamily: '"Noto Serif", "Times New Roman", serif',
  fontWeight: 600,
  color: '#6B46C1',
  fontSize: '1rem',
  lineHeight: 1.3,
  whiteSpace: 'pre-line',
  [theme.breakpoints.up('sm')]: {
    fontSize: '1.25rem',
  },
  '&.active': {
    opacity: 1,
  },
}));

const AnimatedBanner = () => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const rotateText = () => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % languages.length);
    };

    const intervalId = setInterval(rotateText, 4000);
    const initialTimeout = setTimeout(() => {
      rotateText();
    }, 3000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initialTimeout);
    };
  }, []);

  return (
    <Box>
      <BannerContainer>
        <LiturgicalWave />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <MainContent>
            <Typography
              variant="h4"
              sx={{
                fontFamily: '"Noto Serif", "Times New Roman", serif',
                fontWeight: 600,
                color: '#6B46C1',
                fontSize: { xs: '1rem', sm: '1.25rem' },
                lineHeight: 1.3,
                textAlign: { xs: 'center', sm: 'right' },
                whiteSpace: 'pre-line',
              }}
            >
              Orthodox{'\n'}Metrics
            </Typography>

            <OrthodoxCross>
              <CrossBar sx={{ width: 7, height: 75, top: 0 }} />
              <CrossBar sx={{ width: 18, height: 5, top: 12 }} />
              <CrossBar sx={{ width: 42, height: 6, top: 28 }} />
              <CrossBar sx={{ width: 32, height: 5, top: 50, transform: 'translateX(-50%) rotate(-20deg)' }} />
            </OrthodoxCross>

            <Box
              sx={{
                minWidth: 180,
                textAlign: { xs: 'center', sm: 'left' },
                position: 'relative',
                height: 45,
              }}
            >
              {languages.map((lang, index) => (
                <TextTransition
                  key={lang.code}
                  className={index === currentIndex ? 'active' : ''}
                  variant="h4"
                >
                  {lang.title}
                </TextTransition>
              ))}
            </Box>
          </MainContent>

          <Box sx={{ textAlign: 'center', mt: 1.5, position: 'relative', height: 30 }}>
            {languages.map((lang, index) => (
              <Typography
                key={`tagline-${lang.code}`}
                variant="h6"
                sx={{
                  fontFamily: '"Noto Serif", "Times New Roman", serif',
                  fontStyle: 'italic',
                  color: '#6B46C1',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
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
        </Container>
      </BannerContainer>
    </Box>
  );
};

export default AnimatedBanner;
