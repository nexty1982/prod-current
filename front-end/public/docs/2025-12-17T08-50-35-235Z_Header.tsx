import React from 'react';
import { Box, Stack, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import Language from '@/layouts/full/vertical/header/Language';
import OrthodoxThemeToggle from '@/shared/ui/OrthodoxThemeToggle';
import Notifications from '@/layouts/full/vertical/header/Notification';
import Profile from '@/layouts/full/vertical/header/Profile';

// Royal Purple Button - Based on GoldenGradientButton style
const RoyalPurpleButton = styled(Button)({
  background: '#2E0F46', // Royal Purple
  color: '#FFFFFF', // Bold White
  fontWeight: 'bold',
  padding: '12px 30px',
  borderRadius: '50px', // Rounded pill shape (same as GoldenGradientButton)
  border: 'none',
  fontSize: '1rem',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 5px 10px rgba(0,0,0,0.2)',
  textTransform: 'none', // Keep natural capitalization
  transition: 'transform 0.2s',
  '&:hover': {
    background: '#431866', // Lighter purple on hover
    transform: 'scale(1.05)',
    boxShadow: '0 8px 15px rgba(0,0,0,0.3)',
  },
});

// Updated Container Styles with breathing effect
const HeaderContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  position: 'relative',
  // Responsive height: smaller on mobile, full size on desktop
  height: 200, 
  [theme.breakpoints.up('sm')]: {
    height: 280,
  },
  [theme.breakpoints.up('md')]: {
    height: 350,
  },
  overflow: 'hidden',
  // Royal purple and gold gradient background: 75% purple (left), 25% gold (right)
  background: 'linear-gradient(to right, #2E0F46 0%, #2E0F46 75%, #C5A059 75%, #F2D085 100%)',
  backgroundSize: '100% 100%',
  
  // Optional: Add a subtle shadow at the bottom for depth
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.25)',
  
  // Subtle breathing effect - gentle brightness pulse
  animation: 'breathe 6s ease-in-out infinite',
  '@keyframes breathe': {
    '0%, 100%': {
      opacity: 1,
      filter: 'brightness(1)',
    },
    '50%': {
      opacity: 0.98,
      filter: 'brightness(1.02)',
    },
  },
}));

const IconsContainer = styled(Stack)({
  position: 'absolute',
  top: 16,
  left: '75%', // Position at where royal purple ends (75% from left)
  zIndex: 10, // Ensure icons are always clickable above the logo
});


// Fancy Logo Container with Hallowed Glow effect
const LogoContainer = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: '20px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  backdropFilter: 'blur(10px)',
  border: '2px solid rgba(197, 160, 89, 0.3)', // Gold border
  boxShadow: `
    0 0 0 1px rgba(197, 160, 89, 0.2),
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 4px 16px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1)
  `,
  zIndex: 1,
  pointerEvents: 'none',
  transition: 'all 0.3s ease',
  
  // Hallowed Glow - Golden light pulsing animation
  animation: 'hallowedGlow 4s ease-in-out infinite',
  '@keyframes hallowedGlow': {
    '0%, 100%': {
      boxShadow: `
        0 0 0 1px rgba(197, 160, 89, 0.2),
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 4px 16px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 30px rgba(197, 160, 89, 0.3),
        0 0 60px rgba(197, 160, 89, 0.15)
      `,
      filter: 'brightness(1)',
    },
    '50%': {
      boxShadow: `
        0 0 0 1px rgba(197, 160, 89, 0.3),
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 4px 16px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 50px rgba(197, 160, 89, 0.5),
        0 0 100px rgba(197, 160, 89, 0.25),
        0 0 150px rgba(197, 160, 89, 0.1)
      `,
      filter: 'brightness(1.05)',
    },
  },
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    right: '-2px',
    bottom: '-2px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.4), rgba(197, 160, 89, 0.1))',
    zIndex: -1,
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  '&:hover::before': {
    opacity: 1,
  },
});

const Header: React.FC = () => (
  <>
    <HeaderContainer>
      {/* Center Logo Layer with Fancy Container */}
      <LogoContainer
        sx={{
          // Responsive logo container size
          width: { xs: '220px', sm: '280px', md: '340px' },
          height: { xs: '220px', sm: '280px', md: '340px' },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            backgroundImage: 'url("/images/circular-logo.png")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundSize: 'contain',
            filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.4)) drop-shadow(0px 2px 4px rgba(197, 160, 89, 0.3))',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        />
      </LogoContainer>
      
      <IconsContainer spacing={1} direction="row" alignItems="center">
        <Language />
        <OrthodoxThemeToggle variant="icon" />
        <Notifications />
        <Profile />
      </IconsContainer>
    </HeaderContainer>

    {/* Navigation Buttons - Below Header */}
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: '#ffffff',
      }}
    >
      <RoyalPurpleButton variant="contained" size="small">
        News
      </RoyalPurpleButton>
      <RoyalPurpleButton variant="contained" size="small">
        Portfolio
      </RoyalPurpleButton>
      <RoyalPurpleButton variant="contained" size="small">
        Register
      </RoyalPurpleButton>
      <RoyalPurpleButton variant="contained" size="small">
        FAQ
      </RoyalPurpleButton>
    </Box>
  </>
);

export default Header;