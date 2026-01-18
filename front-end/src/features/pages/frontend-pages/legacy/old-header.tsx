import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  InputBase,
  Avatar,
  Badge,
  Menu,
  MenuItem,
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
// First tier of the header - contains search and page indicator
// Uses flexbox to position elements: search (center), page numbers (right)
const TopUtilityBar = styled(Box)({
  width: '100%',
  background: '#5040A0', // Solid dark blue-purple background matching main header
  padding: '0.5rem 2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',
  zIndex: 1001, // Slightly above main header bar
});

// Main header container - full width bar with solid dark purple background
// Second tier of the header - contains logo, branding, navigation, and utility icons
// Uses flexbox layout to separate left (branding/navigation) and right (utility icons) sections
const HeaderBar = styled(Box)({
  width: '100%',
  background: '#5040A0',
  display: 'grid',
  alignItems: 'center', // Solid dark blue-purple background (no gradient)
  gridTemplateColumns:  '1fr auto 1fr',
  position: 'relative',
  zIndex: 1000, // Ensures header stays on top of other content
});

// Left section container - holds logo, brand name, and navigation links
// Aligns all items horizontally with consistent spacing
const HeaderLeft = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  gridColumn: '2',
  justifyContent: 'center',
});

// Center section container - for positioning search bar in the top utility row
// Used only in the top tier to center the search field
const HeaderCenter = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1, // Takes up remaining space to center search
});

// Right section container - for utility icons and page indicators
// Used in both tiers: top tier for page numbers, bottom tier for action icons
const HeaderRight = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

// Page Indicator Component
// Displays page numbers (e.g., "1 2") on the right side of the top utility bar
// White text on dark purple background for visibility
const PageIndicator = styled(Typography)({
  color: '#FFFFFF', // White text for contrast
  fontSize: '0.85rem',
  fontWeight: 500,
  fontFamily: 'sans-serif',
});

// Orthodox Cross Logo Component
// Creates a traditional Eastern Orthodox cross with three horizontal bars
// The cross consists of a vertical bar and three horizontal bars:
// - Top bar: smaller, for inscription above
// - Middle bar: main horizontal bar (for arms)
// - Bottom bar: slanted footrest
const OrthodoxCrossLogo = styled(Box)({
  position: 'relative',
  width: '60px',
  height: '80px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  
  // Container for all cross elements
  '& .cross-container': {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  
  // Vertical bar of the cross - runs full height, centered
  '& .vertical-bar': {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '12px',
    height: '100%',
    background: '#FFD700', // Golden yellow color
    borderRadius: '2px',
  },
  
  // Top horizontal bar - smaller bar above the middle (for inscription)
  '& .top-bar': {
    position: 'absolute',
    top: '25%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50%',
    height: '12px',
    background: '#FFD700', // Golden yellow color
    borderRadius: '2px',
  },
  
  // Middle horizontal bar of the cross - intersects vertical bar at center (for arms)
  '& .horizontal-bar': {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '70%',
    height: '12px',
    background: '#FFD700', // Golden yellow color
    borderRadius: '2px',
  },
  
  // Bottom horizontal bar - slanted footrest (left end up, right end down)
  '& .bottom-bar': {
    position: 'absolute',
    bottom: '15%',
    left: '50%',
    transform: 'translate(-50%, 0) rotate(-15deg)', // Slanted with left side higher
    transformOrigin: 'center center',
    width: '60%',
    height: '12px',
    background: '#FFD700', // Golden yellow color
    borderRadius: '2px',
  },
});

// Brand Name Container - "Orthodox Metrics LLC" in two lines
// Uses serif font for traditional, elegant appearance
// Yellow/gold color (#FFD700) matching the cross
// Two lines: "Orthodox Metrics" (larger) and "LLC" (smaller)
const BrandName = styled(Box)({
  display: 'flex',
  flexDirection: 'column', // Stack two lines vertically
  color: '#FFD700', // Golden yellow
  fontFamily: 'serif', // Traditional serif font
  
  // First line: "Orthodox Metrics" - larger, bold text
  '& .brand-line1': {
    fontSize: '1.4rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  
  // Second line: "LLC" - slightly smaller but still prominent
  '& .brand-line2': {
    fontSize: '1.15rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
});

// Navigation Links Container
// Horizontal flexbox layout for main navigation items
// Spaced with gaps between items (links and + separators)
const NavLinks = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem', // Space between nav items
  marginLeft: '2rem', // Space from brand name
});

const NavFlashyButton = styled(Button)(({ theme }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 999,
  padding: "8px 18px",
  gap: 8,
  fontWeight: 700,
  letterSpacing: 0.2,
  textTransform: "none",
  color: "#4F3FA8",
  background:
    "linear-gradient(135deg, #FFE27A 0%, #FFD54A 30%, #FFC533 60%, #FFB300 100%)",
  boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
  transition: "transform .18s ease, box-shadow .18s ease, filter .18s ease",
  "&:before": {
    content: '""',
    position: "absolute",
    top: -120,
    left: -40,
    width: 60,
    height: 300,
    background: "rgba(255,255,255,.28)",
    transform: "rotate(25deg)",
    filter: "blur(3px)",
    transition: "left .6s ease",
  },
  "&:hover": {
    transform: "translateY(-1px)",
    filter: "saturate(1.1)",
    boxShadow: "0 10px 28px rgba(255,213,74,.35)",
  },
  "&:hover:before": { left: 260 },
  "&:active": {
    transform: "translateY(0) scale(.99)",
    boxShadow: "0 6px 18px rgba(0,0,0,.25)",
  },
}));

// Individual Navigation Link
// Styled with yellow/gold color matching header theme
// Uses sans-serif font for clean, modern appearance (contrast with serif brand)
// Includes hover effect for interactivity
// Separators (+) are non-interactive but styled similarly
const NavLink = styled(Typography)({
  color: '#FFD700', // Golden yellow matching header theme
  fontSize: '0.95rem',
  fontWeight: 500,
  fontFamily: 'sans-serif', // Clean sans-serif (contrasts with serif brand)
  cursor: 'pointer',
  padding: '0.25rem 0.5rem',
  transition: 'all 0.2s ease', // Smooth hover transitions
  
  // Hover effect - slight opacity change for feedback
  '&:hover': {
    opacity: 0.8,
  },
  
  // Separator styling (the "+" symbols between links)
  // Same color but non-interactive (cursor: default, no hover change)
  '&.separator': {
    color: '#FFD700',
    cursor: 'default', // Not clickable
    '&:hover': {
      opacity: 1, // No change on hover
    },
  },
});

// Search Field Container
// White background input field positioned in the CENTER of the top utility bar
// Contains the search input and magnifying glass icon
// Clean, minimal design with subtle border and shadow
const SearchField = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#ffffff', // White background
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  border: '1px solid rgba(255, 255, 255, 0.3)', // Subtle border
  minWidth: '250px', // Minimum width for usability
  maxWidth: '400px', // Maximum width to prevent it from getting too wide
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', // Subtle shadow for depth
  
  // Search input styling - text field for user input
  '& .search-input': {
    flex: 1, // Takes remaining space
    border: 'none',
    outline: 'none',
    fontSize: '0.9rem',
    color: '#5040A0', // Dark purple text matching header background
    backgroundColor: 'transparent',
    
    // Placeholder text styling (if placeholder is added)
    '&::placeholder': {
      color: '#999', // Light gray for placeholder
    },
  },
});

// ============================================================================
// HEADER COMPONENT
// ============================================================================
const Header: React.FC = () => {
  // Header Menu States
  // Manages open/closed state for dropdown menus in the header
  const [anchorElMore, setAnchorElMore] = useState<null | HTMLElement>(null); // For avatar/profile menu
  const [anchorElMail, setAnchorElMail] = useState<null | HTMLElement>(null); // For mail/email menu
  const [newMailCount] = useState(1); // Mail notification badge count (static for now, can be dynamic)

  // Header Menu Handlers
  // Control open/close state for dropdown menus in the header
  
  // Opens the "More" menu (profile/settings menu) when avatar is clicked
  // Stores the anchor element (button) to position the dropdown menu
  const handleMoreMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElMore(event.currentTarget);
  };

  // Closes the "More" menu by clearing the anchor element
  const handleMoreMenuClose = () => {
    setAnchorElMore(null);
  };

  // Opens the Mail menu when mail icon is clicked
  // Stores the anchor element (button) to position the dropdown menu
  const handleMailMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElMail(event.currentTarget);
  };

  // Closes the Mail menu by clearing the anchor element
  const handleMailMenuClose = () => {
    setAnchorElMail(null);
  };

  return (
    <>
      {/* ====================================================================
          HEADER - Two-Tier Navigation Component
          ====================================================================
          The header is a TWO-TIER navigation system spanning full page width.
          It features a solid dark purple background (#5040A0) with glowing
          yellow/gold Orthodox-themed elements.
          
          TIER 1 (Top Utility Bar):
          - Center: Search bar with magnifying glass icon
          - Right: Page indicator ("1 2")
          
          TIER 2 (Main Navigation Bar):
          - Left: Orthodox Cross Logo → Brand Name ("Orthodox Metrics, LLC" + tagline) → Nav Links ("Home + Portfolio + How")
          - Right: Hamburger Menu → Mail (with badge) → Calendar → Chat/Calendar/Email Buttons → Avatar → Dark Mode → Notifications
          ==================================================================== */}
      
      {/* ====================================================================
          TIER 1: Top Utility Bar
          ==================================================================== */}
      <TopUtilityBar>
        {/* Center: Search Field */}
        {/* White input field with search icon for site-wide search functionality */}
        {/* Contains InputBase component for text input and IconButton with magnifying glass icon */}
        {/* Text color matches header background (#5040A0) for good contrast */}
        <HeaderCenter>
          <SearchField>
            <InputBase
              placeholder=""
              className="search-input"
              autoFocus={false}
              sx={{
                fontSize: '0.9rem',
                color: '#5040A0', // Dark purple text matching header background
                fontFamily: 'sans-serif',
                caretColor: '#5040A0', // Cursor color matches text
              }}
            />
            {/* Search icon button - magnifying glass for visual search indication */}
            <IconButton size="small" sx={{ padding: '0.25rem', color: '#5040A0' }}>
              <IconSearch size={18} />
            </IconButton>
          </SearchField>
        </HeaderCenter>

        {/* Right: Page Indicator */}
        {/* Displays page numbers (e.g., "1 2") indicating current page or navigation state */}
        {/* White text on dark purple background */}
        <PageIndicator>
          1 2
        </PageIndicator>
      </TopUtilityBar>

      {/* ====================================================================
          TIER 2: Main Navigation Bar
          ==================================================================== */}
      <HeaderBar>
        {/* LEFT SECTION: Cross Logo, Branding and Navigation */}
        {/* Contains the Orthodox cross logo, company name, and main navigation links */}
        <HeaderLeft>
          {/* Orthodox Cross Logo with IC XC NI KA Inscription */}
          {/* The cross is built with vertical bar and three horizontal bars:
              - Top bar: smaller, for inscription above
              - Middle bar: main horizontal bar (for arms)
              - Bottom bar: slanted footrest
              Sacred letters positioned in each quadrant: IC (ΙΣ - Jesus) top-left, 
              XC (ΧΣ - Christ) top-right, NI (ΝΙ - Conquers) bottom-left, KA (ΚΑ - victory) bottom-right */}
          <OrthodoxCrossLogo>
            <Box className="cross-container">
              {/* Main cross structure - vertical bar with three horizontal bars */}
              <Box className="vertical-bar" />
              <Box className="top-bar" />
              <Box className="horizontal-bar" />
              <Box className="bottom-bar" />
            </Box>
          </OrthodoxCrossLogo>

          {/* Brand Name: "Orthodox Metrics LLC" */}
          {/* Two-line display with glowing yellow/gold serif text */}
          {/* Positioned immediately to the right of the cross logo */}
          <BrandName>
            <Typography className="brand-line1">Orthodox Metrics.. </Typography>
            <Typography className="brand-line2">LLC</Typography>
            {/* Tagline with hidden login link */}
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
          {/* Horizontal navigation menu with "+" separators between items */}
          {/* Links: Home, Portfolio, How (matching screenshot - simplified from original) */}
          {/* All links styled with glowing yellow/gold effect matching header theme */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '2rem' }}>
  <NavFlashyButton href="/">Home</NavFlashyButton>
  <NavFlashyButton href="/portfolio">Portfolio</NavFlashyButton>
  <NavFlashyButton href="/how-it-works">How We Work?</NavFlashyButton>
  </Box>
  </HeaderLeft>

        {/* RIGHT SECTION: Utility Icons and Actions */}
        {/* Contains all action buttons and icons: menu, mail, calendar, chat buttons, avatar, dark mode, notifications */}
        {/* All items right-aligned at the top-right corner of the main header bar */}
        <HeaderRight>
          {/* Menu Button (Hamburger) */}
          {/* Opens navigation menu/drawer for mobile or additional navigation options */}
          {/* Golden yellow color (#FFD700) matching header theme */}
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

          {/* Dark Mode Toggle */}
          {/* Toggle button for switching between light and dark themes */}
          {/* Crescent moon icon indicating dark mode functionality */}
          {/* Golden yellow color matching header theme */}
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

          {/* Notifications Button with Badge */}
          {/* Displays notification bell icon with badge count */}
          {/* Currently showing 0 notifications (badge would appear if count > 0) */}
          {/* Golden yellow color matching header theme */}
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
          MENU POPOVERS
          ====================================================================
          Dropdown menus that appear when clicking on certain header buttons
          (More Menu and Mail Menu)
          ==================================================================== */}

      {/* More Menu Popover */}
      {/* Dropdown menu that appears when clicking the Avatar button */}
      {/* Contains user account options: Profile, Settings, Logout */}
      {/* White background with subtle shadow for elevation */}
      <Menu
        id="long-menu"
        anchorEl={anchorElMore}
        open={Boolean(anchorElMore)}
        onClose={handleMoreMenuClose}
        MenuListProps={{
          'aria-labelledby': 'long-button',
        }}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: '#ffffff',
            boxShadow: '0 9px 17.5px rgb(0,0,0,0.05)',
          },
        }}
      >
        <MenuItem onClick={handleMoreMenuClose}>Profile</MenuItem>
        <MenuItem onClick={handleMoreMenuClose}>Settings</MenuItem>
        <MenuItem onClick={handleMoreMenuClose}>Logout</MenuItem>
      </Menu>

      {/* Mail Menu Popover */}
      {/* Dropdown menu that appears when clicking the Mail icon */}
      {/* Contains email folder options: Inbox, Sent, Drafts, Trash */}
      {/* White background with subtle shadow for elevation */}
      <Menu
        id="mail-menu"
        anchorEl={anchorElMail}
        open={Boolean(anchorElMail)}
        onClose={handleMailMenuClose}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: '#ffffff',
            boxShadow: '0 9px 17.5px rgb(0,0,0,0.05)',
          },
        }}
      >
        <MenuItem onClick={handleMailMenuClose}>Inbox</MenuItem>
        <MenuItem onClick={handleMailMenuClose}>Sent</MenuItem>
        <MenuItem onClick={handleMailMenuClose}>Drafts</MenuItem>
        <MenuItem onClick={handleMailMenuClose}>Trash</MenuItem>
      </Menu>
    </>
  );
};

export default Header;

