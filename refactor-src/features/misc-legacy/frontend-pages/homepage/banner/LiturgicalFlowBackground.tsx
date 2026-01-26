import React from 'react';
import { Box, Typography, Container, styled, keyframes } from '@mui/material';

// Liturgical color flow animation
const colorflow = keyframes`
  0% {
    background-position: 0% 50%;
  }
  14.3% {
    background-position: 25% 50%;
  }
  28.6% {
    background-position: 50% 50%;
  }
  42.9% {
    background-position: 75% 50%;
  }
  57.2% {
    background-position: 100% 50%;
  }
  71.5% {
    background-position: 75% 50%;
  }
  85.8% {
    background-position: 50% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// Styled animated background container
const LiturgicalBackground = styled(Box)(({ theme }) => ({
  position: 'relative',
  minHeight: '400px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  
  // Animated liturgical color background
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(
      135deg,
      #6B21A8 0%,     /* Purple - Lent */
      #FFD700 14.3%,  /* Gold - Resurrection */
      #DC2626 28.6%,  /* Red - Martyrs */
      #059669 42.9%,  /* Green - Ordinary Time */
      #2563EB 57.2%,  /* Blue - Theotokos */
      #F9FAFB 71.5%,  /* White - Feasts */
      #1F2937 85.8%,  /* Black - Good Friday */
      #6B21A8 100%    /* Purple - Complete cycle */
    )`,
    backgroundSize: '400% 400%',
    animation: `${colorflow} 20s ease-in-out infinite`,
    opacity: 0.1,
    filter: 'blur(60px)',
    zIndex: -2,
  },
  
  // Subtle overlay for better text contrast
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    zIndex: -1,
  }
}));

// Main content container
const ContentContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(6),
  flexWrap: 'wrap',
  padding: theme.spacing(6),
  background: 'rgba(255, 255, 255, 0.95)',
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  maxWidth: '900px',
  width: '100%',
  
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
    gap: theme.spacing(4),
    padding: theme.spacing(4),
  },
}));

// Orthodox Cross with golden glow
const OrthodoxCross = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: 100,
  height: 140,
  filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))',
  
  [theme.breakpoints.down('sm')]: {
    width: 80,
    height: 120,
    order: -1,
  },
}));

const CrossBar = styled(Box)({
  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  borderRadius: '2px',
  boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
});

// Text styling for left and right sides
const VerticalText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Noto Serif Georgian", "Noto Serif", "Times New Roman", serif',
  fontWeight: 700,
  color: '#6B21A8',
  fontSize: '2rem',
  lineHeight: 1.3,
  textAlign: 'center',
  whiteSpace: 'pre-line',
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  
  [theme.breakpoints.down('md')]: {
    fontSize: '1.75rem',
  },
  
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.5rem',
  },
}));

// Georgian tagline styling
const GeorgianTagline = styled(Typography)(({ theme }) => ({
  fontFamily: '"Noto Serif Georgian", "Noto Serif", "Times New Roman", serif',
  fontStyle: 'italic',
  color: '#6B21A8',
  fontSize: '1.5rem',
  textAlign: 'center',
  marginTop: theme.spacing(4),
  opacity: 0.9,
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  
  [theme.breakpoints.down('md')]: {
    fontSize: '1.25rem',
    marginTop: theme.spacing(3),
  },
  
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
    marginTop: theme.spacing(2),
  },
}));

const LiturgicalFlowBackground: React.FC = () => {
  return (
    <LiturgicalBackground>
      <Container maxWidth="lg">
        <ContentContainer>
          {/* Left Text - English */}
          <VerticalText>
            Orthodox{'\n'}Metrics
          </VerticalText>

          {/* Center - Orthodox Cross */}
          <OrthodoxCross>
            {/* Vertical beam */}
            <CrossBar
              sx={{
                width: 16,
                height: 140,
                top: 0,
              }}
            />
            {/* Top bar (INRI bar) */}
            <CrossBar
              sx={{
                width: 40,
                height: 10,
                top: 25,
              }}
            />
            {/* Main crossbar */}
            <CrossBar
              sx={{
                width: 85,
                height: 12,
                top: 55,
              }}
            />
            {/* Bottom slanted bar */}
            <CrossBar
              sx={{
                width: 65,
                height: 10,
                top: 95,
                transform: 'translateX(-50%) rotate(-20deg)',
              }}
            />
          </OrthodoxCross>

          {/* Right Text - Georgian */}
          <VerticalText>
            მართმადიდებლური{'\n'}მეტრიკა
          </VerticalText>
        </ContentContainer>

        {/* Georgian Tagline */}
        <GeorgianTagline>
          ვკავდებით წმინდა შრომის ჩანაწერებით!
        </GeorgianTagline>
      </Container>
    </LiturgicalBackground>
  );
};

export default LiturgicalFlowBackground;
