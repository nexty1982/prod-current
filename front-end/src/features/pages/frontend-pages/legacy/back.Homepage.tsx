import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  InputBase,
  Avatar,
  Badge,
  Button,
  Card,
} from '@mui/material';
import {
  IconSearch,
  IconMenu2,
  IconMail,
  IconMoon,
  IconBell,
  IconCalendar,
} from '@tabler/icons-react';
import { styled } from '@mui/material/styles';

// ============================================================================
// HEADER COMPONENTS
// ============================================================================
// The header consists of TWO TIERS as shown in the screenshot:
// 
// TIER 1 (Top Utility Row):
//   - Left: Language selector ("English / ქართული / Ελληνικά")
//   - Center: Search bar with magnifying glass icon
//   - Right: Page indicator ("1 2")
//
// TIER 2 (Main Navigation Row):
//   - Left: Orthodox Cross Logo → Brand Name ("Orthodox Metrics, LLC" + tagline) → Nav Links ("Home + Portfolio + How")
//   - Right: Hamburger Menu → Mail (with badge) → Calendar Icon → Chat/Calendar/Email Buttons → Avatar → Dark Mode → Notifications
//
// Both tiers use solid dark purple background (#5040A0) with yellow/gold accents
// ============================================================================

// Top Utility Bar Container
// First tier of the header - contains language selector, search, and page indicator
const TopUtilityBar = styled(Box)({
  width: '100%',
  background: '#5040A0', // Solid dark blue-purple background matching main header
  padding: '0.5rem 2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',
  zIndex: 1001,
});

// Main header container - full width bar with solid dark purple background
const HeaderBar = styled(Box)({
  width: '100%',
  background: '#5040A0', // Solid dark blue-purple background
  padding: '1rem 2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',
  zIndex: 1000,
});

// Left section container - holds logo, brand name, and navigation links
const HeaderLeft = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

// Center section container - for positioning search bar in the top utility row
const HeaderCenter = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1, // Takes up remaining space to center search
});

// Right section container - for utility icons and page indicators
const HeaderRight = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

// Page Indicator Component
const PageIndicator = styled(Typography)({
  color: '#FFFFFF',
  fontSize: '0.85rem',
  fontWeight: 500,
  fontFamily: 'sans-serif',
});

// Orthodox Cross Logo Component
const OrthodoxCrossLogo = styled(Box)({
  position: 'relative',
  width: '60px',
  height: '80px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  
  '& .cross-container': {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  
  '& .vertical-bar': {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '12px',
    height: '100%',
    background: '#FFD700',
    borderRadius: '2px',
  },
  
  '& .top-bar': {
    position: 'absolute',
    top: '25%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50%',
    height: '12px',
    background: '#FFD700',
    borderRadius: '2px',
  },
  
  '& .horizontal-bar': {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '70%',
    height: '12px',
    background: '#FFD700',
    borderRadius: '2px',
  },
  
  '& .bottom-bar': {
    position: 'absolute',
    bottom: '15%',
    left: '50%',
    transform: 'translate(-50%, 0) rotate(-15deg)',
    transformOrigin: 'center center',
    width: '60%',
    height: '12px',
    background: '#FFD700',
    borderRadius: '2px',
  },
});

// Brand Name Container
const BrandName = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  color: '#FFD700',
  fontFamily: 'serif',
  
  '& .brand-line1': {
    fontSize: '1.4rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
});

// Navigation Links Container
const NavLinks = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginLeft: '2rem',
});

// Individual Navigation Link
const NavLink = styled(Typography)({
  color: '#FFD700',
  fontSize: '0.95rem',
  fontWeight: 500,
  fontFamily: 'sans-serif',
  cursor: 'pointer',
  padding: '0.25rem 0.5rem',
  transition: 'all 0.2s ease',
  
  '&:hover': {
    opacity: 0.8,
  },
  
  '&.separator': {
    color: '#FFD700',
    cursor: 'default',
    '&:hover': {
      opacity: 1,
    },
  },
});

// Language Selector
// Styled as a dark purple rectangular button with white text (as shown in screenshot)
const LanguageSelector = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: '#FFFFFF',
  fontSize: '0.85rem',
  fontWeight: 500,
  fontFamily: 'sans-serif',
  cursor: 'pointer',
  padding: '0.5rem 1rem',
  backgroundColor: '#5040A0', // Dark purple background (button style)
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#5a4fb0',
  },
});

// Search Field Container
const SearchField = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  minWidth: '250px',
  maxWidth: '400px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  
  '& .search-input': {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '0.9rem',
    color: '#5040A0',
    backgroundColor: 'transparent',
    
    '&::placeholder': {
      color: '#999',
    },
  },
});

// Welcome Card Styled Components
const WelcomeCard = styled(Card)({
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '2rem',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  maxWidth: '800px',
  margin: '0 auto',
});

const WelcomeTitle = styled(Typography)({
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '1rem',
  textAlign: 'left',
});

const SectionHeading = styled(Typography)({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: '0.75rem',
  textAlign: 'left',
});

const FeatureList = styled('ul')({
  marginBottom: '1.5rem',
  margin: 0,
  paddingLeft: '1.5rem',
  listStyleType: 'disc',
  '& li': {
    fontSize: '1rem',
    color: '#333',
    lineHeight: 1.8,
    marginBottom: '0.5rem',
  },
});

const AboutDesignBox = styled(Box)({
  backgroundColor: '#E3F2FD',
  borderRadius: '8px',
  padding: '1.5rem',
  marginTop: '1.5rem',
  border: '1px solid #BBDEFB',
});

const AboutDesignTitle = styled(Typography)({
  fontSize: '1.1rem',
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: '0.75rem',
  textAlign: 'left',
});

const AboutDesignText = styled(Typography)({
  fontSize: '1rem',
  color: '#333',
  lineHeight: 1.6,
  textAlign: 'left',
});

// ============================================================================
// HOMEPAGE COMPONENT (Screenshot Version)
// ============================================================================
// Simplified version matching the screenshot layout:
// - Two-tier header with navigation and utilities
// - About Us section with welcome card content
// ============================================================================
const HomePage: React.FC = () => {
  // Header Menu States
  const [newMailCount] = useState(1); // Mail notification badge count

  return (
    <Box>
      {/* ====================================================================
          HEADER - Two-Tier Navigation Component
          ==================================================================== */}
      
      {/* TIER 1: Top Utility Bar */}
      <TopUtilityBar>
        {/* Left: Language Selector */}
        <LanguageSelector>
          <Typography sx={{ fontSize: '0.85rem', fontFamily: 'sans-serif', color: '#FFFFFF' }}>
            English / ქართული / Ελληνικά
          </Typography>
        </LanguageSelector>

        {/* Center: Search Field */}
        <HeaderCenter>
          <SearchField>
            <InputBase
              placeholder=""
              className="search-input"
              autoFocus={false}
              sx={{
                fontSize: '0.9rem',
                color: '#5040A0',
                fontFamily: 'sans-serif',
                caretColor: '#5040A0',
              }}
            />
            <IconButton size="small" sx={{ padding: '0.25rem', color: '#5040A0' }}>
              <IconSearch size={18} />
            </IconButton>
          </SearchField>
        </HeaderCenter>

        {/* Right: Page Indicator */}
        <PageIndicator>
          1 2
        </PageIndicator>
      </TopUtilityBar>

      {/* TIER 2: Main Navigation Bar */}
      <HeaderBar>
        {/* LEFT SECTION: Cross Logo, Branding and Navigation */}
        <HeaderLeft>
          {/* Orthodox Cross Logo */}
          <OrthodoxCrossLogo>
            <Box className="cross-container">
              <Box className="vertical-bar" />
              <Box className="top-bar" />
              <Box className="horizontal-bar" />
              <Box className="bottom-bar" />
            </Box>
          </OrthodoxCrossLogo>

          {/* Brand Name */}
          <BrandName>
            <Typography className="brand-line1">Orthodox Metrics, LLC</Typography>
            <Typography
              component="a"
              href="https://orthodoxmetrics.com/auth/login/"
              className="brand-tagline"
              sx={{
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: '#FFFFFF',
                textDecoration: 'none',
                marginTop: '0.25rem',
                display: 'block',
                '&:hover': {
                  textDecoration: 'none',
                  color: '#FFFFFF',
                },
                '&:visited': {
                  color: '#FFFFFF',
                },
              }}
            >
              Recording the Saints Amongst Us!
            </Typography>
          </BrandName>

          {/* Main Navigation Links */}
          <NavLinks>
            <NavLink>Home</NavLink>
            <NavLink className="separator">+</NavLink>
            <NavLink>Portfolio</NavLink>
            <NavLink className="separator">+</NavLink>
            <NavLink>How</NavLink>
          </NavLinks>
        </HeaderLeft>

        {/* RIGHT SECTION: Utility Icons and Actions */}
        <HeaderRight>
          {/* Menu Button */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ 
              color: '#FFD700',
              padding: '0.5rem',
              '&:hover': { 
                backgroundColor: 'rgba(255, 215, 0, 0.1)' 
              } 
            }}
          >
            <IconMenu2 size={20} />
          </IconButton>

          {/* Mail Button with Badge */}
          <IconButton
            color="inherit"
            aria-label="show new mails"
            sx={{ 
              color: '#FFD700',
              padding: '0.5rem',
              '&:hover': { 
                backgroundColor: 'rgba(255, 215, 0, 0.1)' 
              } 
            }}
          >
            <Badge badgeContent={newMailCount} color="error">
              <IconMail size={20} />
            </Badge>
          </IconButton>

          {/* Calendar Icon */}
          <IconButton
            href="/apps/liturgical-calendar"
            color="inherit"
            aria-label="calendar"
            sx={{ 
              color: '#FFD700',
              padding: '0.5rem',
              '&:hover': { 
                backgroundColor: 'rgba(255, 215, 0, 0.1)' 
              } 
            }}
          >
            <IconCalendar size={20} />
          </IconButton>

          {/* Chat Button */}
          <Button
            href="/apps/chats"
            data-discover="true"
            sx={{ 
              color: '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              textTransform: 'none',
              fontFamily: 'sans-serif',
              fontSize: '0.875rem',
              padding: '0.25rem 0.75rem',
              border: '1px dashed rgba(255, 255, 255, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
              },
            }}
          >
            Chat
          </Button>

          {/* Calendar Button */}
          <Button
            href="/apps/liturgical-calendar"
            data-discover="true"
            sx={{ 
              color: '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              textTransform: 'none',
              fontFamily: 'sans-serif',
              fontSize: '0.875rem',
              padding: '0.25rem 0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
              },
            }}
          >
            Calendar
          </Button>

          {/* Email Button */}
          <Button
            href="/apps/email"
            data-discover="true"
            sx={{ 
              color: '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              textTransform: 'none',
              fontFamily: 'sans-serif',
              fontSize: '0.875rem',
              padding: '0.25rem 0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
              },
            }}
          >
            Email
          </Button>

          {/* Avatar Button */}
          <IconButton
            aria-label="profile"
            sx={{ 
              color: '#FFD700',
              padding: '0.5rem',
              '&:hover': { 
                backgroundColor: 'rgba(255, 215, 0, 0.1)' 
              } 
            }}
          >
            <Avatar 
              sx={{ 
                width: 28, 
                height: 28, 
                bgcolor: '#FFD700',
                color: '#5040A0',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              P
            </Avatar>
          </IconButton>

          {/* Dark Mode Toggle */}
          <IconButton
            aria-label="Switch to dark mode"
            sx={{ 
              color: '#FFD700',
              padding: '0.5rem',
              '&:hover': { 
                backgroundColor: 'rgba(255, 215, 0, 0.1)' 
              } 
            }}
          >
            <IconMoon size={20} />
          </IconButton>

          {/* Notifications Button */}
          <IconButton
            aria-label="notifications"
            sx={{ 
              color: '#FFD700',
              padding: '0.5rem',
              '&:hover': { 
                backgroundColor: 'rgba(255, 215, 0, 0.1)' 
              } 
            }}
          >
            <Badge badgeContent={0} color="error">
              <IconBell size={20} />
            </Badge>
          </IconButton>
        </HeaderRight>
      </HeaderBar>

      {/* ====================================================================
          MAIN CONTENT - About Us Section
          ==================================================================== */}
      <Box
        sx={{
          background: '#ffffff',
          padding: '5rem 0',
          color: '#2f2300',
          minHeight: '60vh',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2rem 0',
            }}
          >
            <Box
              sx={{
                maxWidth: '1000px',
                width: '100%',
                padding: '60px',
              }}
            >
              {/* About Us Header */}
              <Box
                sx={{
                  borderBottom: '3px solid #C8A24B',
                  paddingBottom: '20px',
                  marginBottom: '30px',
                  textAlign: 'center',
                }}
              >
                <Typography
                  component="h2"
                  sx={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: '#2f2300',
                    fontFamily: 'serif',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  About Us
                </Typography>
              </Box>

              {/* Welcome Card Content */}
              <WelcomeCard>
                <WelcomeTitle>Welcome to Orthodox Metrics LLC</WelcomeTitle>
                
                <SectionHeading>The header features:</SectionHeading>
                <FeatureList>
                  <Typography component="li"></Typography>
                  <Typography component="li"></Typography>
                  <Typography component="li"></Typography>
                  <Typography component="li">
                    Multi-language support (English, Sinhala, Greek)
                  </Typography>
                  <Typography component="li"></Typography>
                  <Typography component="li"></Typography>
                </FeatureList>

                <AboutDesignBox>
                  <AboutDesignTitle>About the Design</AboutDesignTitle>
                  <AboutDesignText>
                    The header incorporates traditional Eastern Orthodox Christian symbolism with the IC XC NI KA (Jesus Christ Conquers) cross, rendered in golden tones against a rich purple-blue gradient background. The animated radiant waves create a sense of divine light and spiritual movement.
                  </AboutDesignText>
                </AboutDesignBox>
              </WelcomeCard>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;

