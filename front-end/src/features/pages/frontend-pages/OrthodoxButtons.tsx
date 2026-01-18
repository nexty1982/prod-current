import React from 'react';
import { Button, Box, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

// --- 1. The Imperial Standard (Solid Purple & Gold) ---
// Best for: Primary Actions (e.g., "Login", "Save Record")
const ImperialButton = styled(Button)({
  backgroundColor: '#2E0F46', // Deep Royal Purple
  color: '#C5A059', // Muted Gold
  border: '2px solid #C5A059',
  padding: '10px 24px',
  fontSize: '1rem',
  fontFamily: '"Times New Roman", serif',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  borderRadius: '2px', // Sharp corners for a rigid, traditional look
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: '#431866',
    boxShadow: '0 0 15px rgba(197, 160, 89, 0.5)', // Gold glow
    transform: 'translateY(-2px)',
  },
});

// --- 2. The Golden Gradient (High Visibility) ---
// Best for: Call to Actions (e.g., "New Baptism", "Donate")
const GoldenGradientButton = styled(Button)({
  background: 'linear-gradient(135deg, #C5A059 0%, #F2D085 50%, #C5A059 100%)',
  color: '#2E0F46',
  fontWeight: 'bold',
  padding: '12px 30px',
  borderRadius: '50px', // Rounded pill shape
  border: 'none',
  fontSize: '1rem',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 5px 10px rgba(0,0,0,0.2)',
  textTransform: 'none', // Keep natural capitalization
  transition: 'transform 0.2s',
  '&:hover': {
    background: 'linear-gradient(135deg, #F2D085 0%, #FFECB3 50%, #F2D085 100%)',
    transform: 'scale(1.05)',
    boxShadow: '0 8px 15px rgba(0,0,0,0.3)',
  },
});

// --- 3. The Liturgical Outline (Ghost Button) ---
// Best for: Secondary Actions (e.g., "Cancel", "Back", "More Info")
const LiturgicalGhostButton = styled(Button)({
  backgroundColor: 'transparent',
  color: '#fff', // Assuming dark background, or use #2E0F46 for light bg
  border: '1px solid rgba(197, 160, 89, 0.6)', // Faint gold
  padding: '8px 20px',
  fontFamily: 'serif',
  fontStyle: 'italic',
  fontSize: '1.1rem',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(197, 160, 89, 0.1)',
    transform: 'translateX(-100%)',
    transition: 'transform 0.4s ease',
  },
  '&:hover': {
    borderColor: '#C5A059',
    color: '#F2D085',
    '&::before': {
      transform: 'translateX(0)',
    },
  },
});

// --- 4. The Parchment Scroll (Paper Texture) ---
// Best for: Exporting data, Certificates, History
const ParchmentButton = styled(Button)({
  backgroundColor: '#F5F5DC', // Beige/Parchment
  color: '#3E2723', // Dark Brown ink color
  border: '1px solid #D7CCC8',
  padding: '10px 25px',
  fontFamily: '"Courier New", serif', // Typewriter/Old print feel
  fontWeight: 600,
  boxShadow: '2px 2px 0px #8D6E63', // Hard shadow
  borderRadius: '0',
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: '#FFF8E1',
    transform: 'translate(1px, 1px)',
    boxShadow: '1px 1px 0px #8D6E63',
  },
});

// --- 5. The Mosaic Tile (Inset 3D) ---
// Best for: Settings, Tools, Toggles
const MosaicTileButton = styled(Button)({
  background: '#311B4B',
  color: '#E0E0E0',
  padding: '15px',
  minWidth: '150px',
  borderTop: '2px solid #5E3C78',
  borderLeft: '2px solid #5E3C78',
  borderBottom: '2px solid #1A0B2E',
  borderRight: '2px solid #1A0B2E',
  borderRadius: '4px',
  fontWeight: 'bold',
  letterSpacing: '1.5px',
  textShadow: '0 2px 0 #000',
  transition: 'all 0.1s',
  '&:active': {
    borderTop: '2px solid #1A0B2E',
    borderLeft: '2px solid #1A0B2E',
    borderBottom: '2px solid #5E3C78',
    borderRight: '2px solid #5E3C78',
    transform: 'translateY(2px)',
  },
  '&:hover': {
    background: '#3E225E',
  },
});

// --- Usage Example Component ---
const ButtonShowcase = () => {
  return (
    <Box sx={{ 
      p: 5, 
      backgroundColor: '#1a1a1a', // Dark bg to show off the gold/light buttons
      display: 'flex', 
      justifyContent: 'center' 
    }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h6" sx={{color:'grey'}}>Button Styles</Typography>
        
        {/* 1. Imperial Standard */}
        <ImperialButton variant="contained">
          Save Metric
        </ImperialButton>

        {/* 2. Golden Gradient */}
        <GoldenGradientButton variant="contained">
          New Record +
        </GoldenGradientButton>

        {/* 3. Liturgical Ghost */}
        <LiturgicalGhostButton variant="outlined">
          View Archives
        </LiturgicalGhostButton>

        {/* 4. Parchment Scroll */}
        <ParchmentButton variant="contained">
          Export CSV
        </ParchmentButton>

        {/* 5. Mosaic Tile */}
        <MosaicTileButton>
          SETTINGS
        </MosaicTileButton>

      </Stack>
    </Box>
  );
};

export default ButtonShowcase;
export { ImperialButton, GoldenGradientButton, LiturgicalGhostButton, ParchmentButton, MosaicTileButton };

