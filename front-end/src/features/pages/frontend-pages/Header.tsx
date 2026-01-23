import React, { useState, useRef, useEffect } from 'react';
import { Box, Stack, Button, Menu, MenuItem, Container, Dialog, TextField, InputAdornment, IconButton, Typography, Card } from '@mui/material';
import { styled } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { useNavigate } from 'react-router-dom';
import { IconEye, IconEyeOff, IconHome, IconUserPlus, IconMessageQuestion, IconBuildingChurch } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import Language from '@/layouts/full/vertical/header/Language';
import OrthodoxThemeToggle from '@/shared/ui/OrthodoxThemeToggle';
import Notifications from '@/layouts/full/vertical/header/Notification';
import Profile from '@/layouts/full/vertical/header/Profile';
import LastLoggedIn from '@/layouts/full/vertical/header/LastLoggedIn';
import SessionTimer from './SessionTimer';
import CircularMenu from './CircularMenu';

// Procession Sweep Animation
// Logo float animation - gentle up and down movement
const logoFloat = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
`;

// Gradient sweep animation - diagonal gold-to-purple gradient moving across
const processionSweep = keyframes`
  0% {
    backgroundPosition: -200% -200%;
  }
  100% {
    backgroundPosition: 200% 200%;
  }
`;

// Purple button with geometric pattern background, white icons and text - matching screenshot
const GradientButton = styled(Button)(({ theme }) => ({
  backgroundImage: 'url(/images/incode/buttons_bg.png)',
  backgroundRepeat: 'repeat',
  backgroundPosition: 'center',
  backgroundSize: 'auto',
  backgroundColor: '#6B46C1', // Purple background
  color: '#FFFFFF', // White text
  fontWeight: 'bold', // Bold text
  padding: theme.spacing(1.5, 2), // Vertical and horizontal padding
  borderRadius: '12px', // Rounded corners
  border: 'none', // No border
  fontSize: '0.75rem',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)', // Subtle shadow
  textTransform: 'uppercase', // Uppercase text
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  position: 'relative',
  overflow: 'hidden',
  minWidth: '100px',
  fontFamily: 'sans-serif', // Clear sans-serif font
  textShadow: '0 1px 2px rgba(0,0,0,0.2)', // Subtle text shadow for readability
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(1.75, 2.5),
    fontSize: '0.8rem',
    minWidth: '120px',
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(2, 3),
    fontSize: '0.85rem',
    minWidth: '140px',
  },
  '&:hover': {
    backgroundColor: '#7C3AED', // Lighter purple on hover
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transform: 'translateY(-2px)',
    color: '#FFFFFF', // Keep white text on hover
  },
  '&:active': {
    backgroundColor: '#5B21B6', // Darker purple when pressed
    transform: 'translateY(0)',
    color: '#FFFFFF', // Keep white text when pressed
  },
  '& .MuiButton-startIcon': {
    margin: 0,
  },
}));

// Updated Container Styles - background will be set dynamically
const HeaderContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'backgroundImage',
})<{ backgroundImage: string }>(({ theme, backgroundImage }) => ({
  width: '100%', // Full width of parent container
  maxWidth: '100%', // Ensure it doesn't exceed page width
  position: 'relative',
  top: 0,
  left: 0,
  right: 0,
  margin: 0,
  marginBottom: theme.spacing(3), // Add bottom margin to push content down
  padding: 0,
  // Responsive height: set to accommodate buttons and logo at top, with enough space for full logo including cross
  height: 200,
  overflow: 'hidden', // Changed to hidden to prevent cut-off and black bars
  background: `url(${backgroundImage}) repeat top left`,
  display: 'block', // Ensure it's displayed
  zIndex: 1, // Ensure it's above other content
  boxSizing: 'border-box',
  pointerEvents: 'none', // Allow clicks to pass through to buttons
  [theme.breakpoints.up('sm')]: {
    height: 240,
    marginBottom: theme.spacing(4),
  },
  [theme.breakpoints.up('md')]: {
    height: 280,
    marginBottom: theme.spacing(5),
  },
  [theme.breakpoints.up('lg')]: {
    height: 320,
    marginBottom: theme.spacing(6),
  },
  '& > *': {
    pointerEvents: 'auto', // Re-enable pointer events for child elements
  },
}));

const IconsContainer = styled(Stack)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
}));





// Circular Navigation Button with ornate borders
const CircularNavButton = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: { xs: '80px', sm: '90px', md: '100px', lg: '110px' },
  height: { xs: '80px', sm: '90px', md: '100px', lg: '110px' },
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  backgroundColor: '#1a237e', // Dark navy blue
  border: 'none',
  padding: 0,
  transition: 'all 0.3s ease-in-out',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  MozUserSelect: 'none',
  msUserSelect: 'none',
  // Outer border with cross pattern (silver)
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-8px',
    left: '-8px',
    right: '-8px',
    bottom: '-8px',
    borderRadius: '50%',
    border: '5px solid #C0C0C0', // Metallic silver
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 0 L8 6 M0 8 L6 8 M10 8 L16 8 M8 10 L8 16' stroke='%23A0A0A0' stroke-width='1.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '14px 14px',
    zIndex: 0,
    opacity: 0.95,
  },
  // Inner border (gold)
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '-3px',
    left: '-3px',
    right: '-3px',
    bottom: '-3px',
    borderRadius: '50%',
    border: '2px solid #d4af37', // Metallic gold
    zIndex: 1,
  },
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    backgroundColor: '#283593', // Slightly lighter navy on hover
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
}));

// Logo Container - positioned 25% to the left of center
const LogoContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%', // Center vertically in header
  left: '25%', // Position 25% from left (moved 25% left from center)
  transform: 'translate(-50%, -50%)', // Center both horizontally and vertically
  zIndex: 0, // Same as VideoContainer - let children control their own z-index
  pointerEvents: 'auto', // Allow pointer events for clicking
  paddingTop: 0,
  paddingLeft: 0,
  overflow: 'visible', // Ensure nothing is clipped, especially the top of the cross
  display: 'flex',
  alignItems: 'center', // Center logo vertically
  visibility: 'visible', // Ensure it's visible
  opacity: 1, // Ensure it's not transparent
  backgroundColor: 'transparent', // Ensure container background is transparent
  [theme.breakpoints.up('sm')]: {
    top: '50%',
    left: '25%',
    transform: 'translate(-50%, -50%)',
  },
  [theme.breakpoints.up('md')]: {
    top: '50%',
    left: '25%',
    transform: 'translate(-50%, -50%)',
  },
  [theme.breakpoints.up('lg')]: {
    top: '50%',
    left: '25%',
    transform: 'translate(-50%, -50%)',
  },
}));

// Video Container - positioned 25% to the left (same as logo)
const VideoContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%', // Center vertically
  left: '25%', // Position 25% from left (same as logo)
  transform: 'translate(-50%, -50%)', // Perfect centering
  zIndex: 2, // Above logo (zIndex: 0) but below text (zIndex: 3)
  width: '270px',
  height: '270px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto', // Allow clicks on video section
  cursor: 'pointer', // Show pointer cursor
  isolation: 'isolate', // Create new stacking context to keep separate from text
  overflow: 'hidden', // Clip videos to container
  borderRadius: '50%', // Circular clip
  [theme.breakpoints.up('sm')]: {
    width: '330px',
    height: '330px',
  },
  [theme.breakpoints.up('md')]: {
    width: '390px',
    height: '390px',
  },
  [theme.breakpoints.up('lg')]: {
    width: '450px',
    height: '450px',
  },
}));

const LoginCard = styled(Card)({
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  border: '1px solid #f0f0f0',
});

// Multilingual Text Container - positioned to the right of video circle
// All language pairs will be positioned absolutely in the same location
const MultilingualTextContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: 'calc(25% + 225px)', // Position to the right of logo/video at 25%
  transform: 'translateY(-50%)',
  zIndex: 3, // Above video circle (zIndex: 0) to ensure text is always visible
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  pointerEvents: 'none',
  width: 'auto',
  minWidth: '300px',
  isolation: 'isolate', // Create new stacking context separate from video
  backgroundColor: 'transparent', // Ensure no background
  [theme.breakpoints.down('lg')]: {
    left: 'calc(25% + 195px)',
    minWidth: '280px',
  },
  [theme.breakpoints.down('md')]: {
    left: 'calc(25% + 165px)',
    minWidth: '260px',
  },
  [theme.breakpoints.down('sm')]: {
    left: 'calc(25% + 135px)',
    minWidth: '240px',
  },
}));

// Container for each language pair - positioned absolutely to overlap
const LanguagePairContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVisible',
})<{ isVisible: boolean }>(({ isVisible }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  opacity: isVisible ? 1 : 0,
  transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
  transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
  pointerEvents: isVisible ? 'auto' : 'none',
}));

// Text item with colorful gradient background and animations
const MultilingualTextItem = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>(({ theme, isActive }) => {
  return {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
    backgroundSize: '200% 200%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    padding: theme.spacing(1, 2),
    borderRadius: '8px',
    fontSize: '36px !important',
    fontWeight: 700,
    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    whiteSpace: 'nowrap',
    width: 'fit-content',
    display: 'block',
    textShadow: '0 0 30px rgba(255, 255, 255, 0.6), 0 0 60px rgba(102, 126, 234, 0.4)',
    opacity: isActive ? 1 : 0,
    transform: isActive ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
    transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
    animation: isActive ? 'gradientShift 3s ease infinite, textGlow 2s ease-in-out infinite' : 'none',
    [theme.breakpoints.down('lg')]: {
      fontSize: '32px !important',
    },
    [theme.breakpoints.down('md')]: {
      fontSize: '28px !important',
    },
    [theme.breakpoints.down('sm')]: {
      fontSize: '24px !important',
    },
    '@keyframes gradientShift': {
      '0%': {
        backgroundPosition: '0% 50%',
      },
      '50%': {
        backgroundPosition: '100% 50%',
      },
      '100%': {
        backgroundPosition: '0% 50%',
      },
    },
    '@keyframes textGlow': {
      '0%, 100%': {
        textShadow: '0 0 30px rgba(255, 255, 255, 0.6), 0 0 60px rgba(102, 126, 234, 0.4)',
      },
      '50%': {
        textShadow: '0 0 40px rgba(255, 255, 255, 0.8), 0 0 80px rgba(102, 126, 234, 0.6), 0 0 120px rgba(118, 75, 162, 0.4)',
      },
    },
  };
});

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [samplesAnchorEl, setSamplesAnchorEl] = useState<null | HTMLElement>(null);
  const samplesMenuOpen = Boolean(samplesAnchorEl);
  const [samplesButtonRef, setSamplesButtonRef] = useState<HTMLElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Login state
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [logoFlipped, setLogoFlipped] = useState(false);
  const [logoState, setLogoState] = useState<'default' | 'active'>('default');
  const [isScrolled, setIsScrolled] = useState(false);
  
  // State to control which language pair is visible (0=English, 1=Greek, 2=Russian, 3=Romanian, 4=Georgian)
  const [visibleLanguageIndex, setVisibleLanguageIndex] = useState(0);
  
  // Header visibility state - load from localStorage
  const [isHeaderVisible, setIsHeaderVisible] = useState(() => {
    const saved = localStorage.getItem('headerVisible');
    return saved !== null ? saved === 'true' : true;
  });
  
  // State to control which message within the language pair (0=first message, 1=second message)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  // State for header background image (0=bgtiled1.png, 1=bgtiled2.png, 2=bgtiled3.png, 3=bgtiled4.png, 4=bgtiled5.png, 5=bgtiled6.png)
  const [headerBackgroundIndex, setHeaderBackgroundIndex] = useState(() => {
    // Load from localStorage or default to 0 (bgtiled1.png - background 1)
    const saved = localStorage.getItem('headerBackgroundIndex');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const headerBackgrounds = [
    '/images/incode/bgtiled1.png',
    '/images/incode/bgtiled2.png',
    '/images/incode/bgtiled3.png',
    '/images/bgtiled4.png',
    '/images/bgtiled5.png',
    '/images/incode/bgtiled6.png',
  ];
  
  const handleBackgroundChange = (index: number) => {
    setHeaderBackgroundIndex(index);
    localStorage.setItem('headerBackgroundIndex', index.toString());
  };
  

  // Multilingual text pairs - organized by language in display order
  // Each language has 2 messages that cycle: message 1 (3s) → message 2 (3s)
  const multilingualTexts = [
    // English (0-1)
    'Welcome to Orthodox Metrics!',
    'Digital Records have finally arrived!',
    // Greek (2-3)
    'Καλώς ήρθατε στο Orthodox Metrics!',
    'Τα Ψηφιακά Αρχεία έφτασαν επιτέλους!',
    // Russian (4-5)
    'Добро пожаловать в Orthodox Metrics!',
    'Цифровые записи наконец-то здесь!',
    // Romanian (6-7)
    'Bun venit la Orthodox Metrics!',
    'Înregistrările Digitale au sosit în sfârșit!',
    // Georgian (8-9)
    'მოგესალმებით Orthodox Metrics-ში!',
    'ციფრული ჩანაწერები საბოლოოდ ჩამოვიდა!',
  ];


  // Text cycling effect - cycles through messages and languages
  useEffect(() => {
    if (logoState !== 'default') return; // Only cycle when logo is in default state
    
    // First message shows for 3 seconds, then second message for 3 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev === 0) {
          // Switch to second message
          return 1;
        } else {
          // Switch to next language and reset to first message
          setVisibleLanguageIndex((prevLang) => (prevLang + 1) % 5);
          return 0;
        }
      });
    }, 3000); // Change every 3 seconds

    return () => clearInterval(messageInterval);
  }, [logoState]);


  // Scroll detection effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || window.pageYOffset;
      setIsScrolled(scrollPosition > 100); // Show logo after scrolling 100px
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Logo click no longer cycles through sections - just toggle logo state
    setLogoState(logoState === 'active' ? 'default' : 'active');
  };

  const handleNimbusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to homepage and do a hard refresh
    navigate('/frontend-pages/homepage');
    // Use setTimeout to ensure navigation happens before reload
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };



  // Ensure videos play when logoState is default
  useEffect(() => {
    if (!logoState || logoState === 'default') {
      // Force videos to play when they become visible
      const videos = document.querySelectorAll('video[src*="/images/header/"]');
      videos.forEach((video) => {
        const v = video as HTMLVideoElement;
        if (v.paused) {
          v.play().catch(() => {
            // Auto-play might be blocked, but will retry
          });
        }
      });
    }
  }, [logoState]);

  const handleSamplesClick = () => {
    navigate('/samples');
  };

  const handleSamplesMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setSamplesButtonRef(event.currentTarget);
    setSamplesAnchorEl(event.currentTarget);
  };

  const handleSamplesMouseLeave = () => {
    // Delay closing to allow moving to menu
    hoverTimeoutRef.current = setTimeout(() => {
      setSamplesAnchorEl(null);
    }, 200);
  };

  const handleMenuMouseEnter = () => {
    // Keep menu open when hovering over it
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (samplesButtonRef) {
      setSamplesAnchorEl(samplesButtonRef);
    }
  };

  const handleMenuMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setSamplesAnchorEl(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleSamplesClose = () => {
    setSamplesAnchorEl(null);
  };
  
  // Toggle header visibility
  const handleToggleHeader = () => {
    const newVisibility = !isHeaderVisible;
    setIsHeaderVisible(newVisibility);
    localStorage.setItem('headerVisible', String(newVisibility));
  };
  

  const handleGreekRecords = () => {
    handleSamplesClose();
    navigate('/greek_baptism_table_demo.html');
  };

  const handleRussianRecords = () => {
    handleSamplesClose();
    navigate('/russian_wedding_table_demo.html');
  };

  const handleRomanianRecords = () => {
    handleSamplesClose();
    navigate('/romanian_funeral_table_demo.html');
  };

  const handleSampleRecords = () => {
    handleSamplesClose();
    navigate('/samples');
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');

    try {
      await login(email, password);
      
      // Check if user has @ssppoc.org domain
      if (email.match(/@ssppoc\.org$/)) {
        // Redirect SSPPOC users to their specific records page using relative path
        navigate('/saints-peter-and-paul-Records');
      } else {
        // Regular redirect for other users
        navigate('/');
      }
      setOpenLoginDialog(false);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOpenLoginDialog = () => {
    setOpenLoginDialog(true);
    setEmail('');
    setPassword('');
    setLoginError('');
  };

  const handleCloseLoginDialog = () => {
    setOpenLoginDialog(false);
    setEmail('');
    setPassword('');
    setLoginError('');
  };

  // Don't render header if hidden
  if (!isHeaderVisible) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 1000,
          p: 1,
        }}
      >
        <IconButton
          onClick={handleToggleHeader}
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
          aria-label="Show header"
        >
          <IconEye size={20} />
        </IconButton>
      </Box>
    );
  }

  return (
    <>
      <HeaderContainer backgroundImage={headerBackgrounds[headerBackgroundIndex] || headerBackgrounds[0]}>

        {/* Logo positioned on the left of buttons */}
        <LogoContainer
          data-logo-container
          onClick={handleLogoClick}
          sx={{
            // Size to fit within header height (header: xs:200px, sm:240px, md:280px, lg:320px)
            // Leave some margin, so logo is slightly smaller than header height
            height: { xs: '180px', sm: '220px', md: '260px', lg: '300px' },
            width: { xs: '180px', sm: '220px', md: '260px', lg: '300px' }, // Square to maintain aspect ratio
            backgroundColor: 'transparent', // Ensure transparent background
            cursor: 'pointer',
            overflow: 'visible', // Ensure nothing is clipped
            position: 'relative',
            '&:hover': {
              opacity: 0.9,
            },
          }}
        >



        </LogoContainer>

        {/* Video Circle - centered in header, always separate from text */}
        {(!logoState || logoState === 'default') && (
          <VideoContainer onClick={handleLogoClick}>
            {/* Nimbus border - wraps around the video circle as a decorative border */}
            <Box
              component="img"
              src="/images/incode/nimbus.png"
              alt="Nimbus"
              onClick={handleNimbusClick}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', // Full container size - will show as border around 75% videos
                height: '100%',
                objectFit: 'contain',
                zIndex: 2, // Above videos (zIndex: 1) to show as border frame
                pointerEvents: 'auto', // Allow clicks on nimbus
                cursor: 'pointer', // Show pointer cursor
                borderRadius: '50%',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                '&:hover': {
                  transform: 'translate(-50%, -50%) scale(1.05)',
                  opacity: 0.9,
                },
                // If nimbus.png has transparent center, it will frame the video
                // If it's a full circle, it may need adjustment based on the actual image
              }}
            />
            <video
              autoPlay
              loop
              muted
              playsInline
              src="/images/header/1.mp4"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '50%',
                height: '50%',
                objectFit: 'cover',
                borderRadius: '50%',
                zIndex: 1,
                clipPath: 'circle(50% at center)',
                opacity: 1,
                animation: 'videoCycle1 9s infinite',
              }}
              onLoadedData={(e) => {
                // Ensure video plays
                const video = e.target as HTMLVideoElement;
                video.play().catch(() => {
                  // Auto-play might be blocked, but video will play when visible
                });
              }}
            />
            <video
              autoPlay
              loop
              muted
              playsInline
              src="/images/header/2.mp4"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '50%',
                height: '50%',
                objectFit: 'cover',
                borderRadius: '50%',
                zIndex: 1,
                clipPath: 'circle(50% at center)',
                opacity: 0,
                animation: 'videoCycle2 9s infinite',
              }}
              onLoadedData={(e) => {
                const video = e.target as HTMLVideoElement;
                video.play().catch(() => {});
              }}
            />
            <video
              autoPlay
              loop
              muted
              playsInline
              src="/images/header/3.mp4"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '50%',
                height: '50%',
                objectFit: 'cover',
                borderRadius: '50%',
                zIndex: 1,
                clipPath: 'circle(50% at center)',
                opacity: 0,
                animation: 'videoCycle3 9s infinite',
              }}
              onLoadedData={(e) => {
                const video = e.target as HTMLVideoElement;
                video.play().catch(() => {});
              }}
            />
            <style>{`
              @keyframes videoCycle1 {
                0%, 30% { opacity: 1; }
                33.33%, 100% { opacity: 0; }
              }
              @keyframes videoCycle2 {
                0%, 30% { opacity: 0; }
                33.33%, 63.33% { opacity: 1; }
                66.66%, 100% { opacity: 0; }
              }
              @keyframes videoCycle3 {
                0%, 63.33% { opacity: 0; }
                66.66%, 96.66% { opacity: 1; }
                100% { opacity: 0; }
              }
            `}</style>
          </VideoContainer>
        )}

        {/* Multilingual Text Pairs - positioned to the right of video circle */}
        {(!logoState || logoState === 'default') && (
          <MultilingualTextContainer>
            {/* Render each language pair in the same location, overlapping */}
            {[0, 1, 2, 3, 4].map((pairIndex) => {
              const isVisible = pairIndex === visibleLanguageIndex;
              const firstTextIndex = pairIndex * 2;
              const secondTextIndex = pairIndex * 2 + 1;
              
              return (
                <LanguagePairContainer
                  key={pairIndex}
                  isVisible={isVisible}
                >
                  <MultilingualTextItem 
                    variant="inherit"
                    isActive={isVisible && currentMessageIndex === 0}
                    sx={{ fontSize: { xs: '24px', sm: '28px', md: '32px', lg: '36px' } }}
                  >
                    {multilingualTexts[firstTextIndex]}
                  </MultilingualTextItem>
                  <MultilingualTextItem 
                    variant="inherit"
                    isActive={isVisible && currentMessageIndex === 1}
                    sx={{ fontSize: { xs: '24px', sm: '28px', md: '32px', lg: '36px' } }}
                  >
                    {multilingualTexts[secondTextIndex]}
                  </MultilingualTextItem>
                </LanguagePairContainer>
              );
            })}
          </MultilingualTextContainer>
        )}



        {/* Utility Icons and Search - Top Right */}
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 8, sm: 12, md: 16 },
            right: { xs: 8, sm: 16, md: 24 },
            zIndex: 10,
            display: 'flex',
            gap: { xs: 0.5, sm: 1 },
            alignItems: 'center',
            flexDirection: 'row',
          }}
        >
          <IconsContainer spacing={1} direction="row" alignItems="center">
            <Language />
            <Box
              sx={{
                '& .orthodox-theme-toggle': {
                  color: '#FFFFFF !important',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#F5B800 !important',
                  },
                  '& svg': {
                    color: '#FFFFFF',
                  },
                },
              }}
            >
              <OrthodoxThemeToggle variant="icon" />
            </Box>
            <Box
              sx={{
                '& .MuiIconButton-root': {
                  color: '#FFFFFF !important',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#F5B800 !important',
                  },
                  '& svg': {
                    color: '#FFFFFF',
                  },
                },
              }}
            >
              <Notifications />
            </Box>
            <Profile />
            {/* Hide Header Button */}
            <IconButton
              onClick={handleToggleHeader}
              sx={{
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
              aria-label="Hide header"
              title="Hide header"
            >
              <IconEyeOff size={20} />
            </IconButton>
          </IconsContainer>
        </Box>

        {/* Circular Navigation Menu - positioned 3/4 to the right */}
        <CircularMenu />

        {/* Session Timer and Last Logged In - Bottom Left */}
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 8, sm: 12, md: 16 },
            left: { xs: 8, sm: 16, md: 24 },
            zIndex: 10,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '20px',
            padding: '4px 12px',
            backdropFilter: 'blur(4px)',
            flexWrap: 'wrap',
            maxWidth: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 32px)', md: 'auto' },
          }}
        >
          <SessionTimer />
          <LastLoggedIn />
        </Box>

        {/* Background Switcher - Bottom Left (moved below session info) */}
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 48, sm: 56, md: 64 },
            left: { xs: 8, sm: 16, md: 24 },
            zIndex: 10,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '20px',
            padding: '4px 8px',
            backdropFilter: 'blur(4px)',
            flexWrap: 'wrap',
            maxWidth: { xs: '200px', sm: '240px', md: '280px' },
          }}
        >
          {[0, 1].map((index) => (
            <IconButton
              key={index}
              onClick={() => handleBackgroundChange(index)}
              size="small"
              sx={{
                width: { xs: '28px', sm: '32px', md: '36px' },
                height: { xs: '28px', sm: '32px', md: '36px' },
                backgroundColor: headerBackgroundIndex === index 
                  ? 'rgba(212, 175, 55, 0.9)' 
                  : 'rgba(255, 255, 255, 0.2)',
                color: headerBackgroundIndex === index ? '#1a1a1a' : '#FFFFFF',
                border: headerBackgroundIndex === index 
                  ? '2px solid rgba(212, 175, 55, 1)' 
                  : '2px solid rgba(255, 255, 255, 0.3)',
                fontSize: { xs: '12px', sm: '14px', md: '16px' },
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: headerBackgroundIndex === index 
                    ? 'rgba(212, 175, 55, 1)' 
                    : 'rgba(255, 255, 255, 0.3)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
              aria-label={`Switch to background ${index + 1}`}
            >
            </IconButton>
          ))}
        </Box>

      </HeaderContainer>

      {/* Church Portal Login Dialog */}
      <Dialog
        open={openLoginDialog}
        onClose={handleCloseLoginDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: 0,
          },
        }}
      >
        <LoginCard>
          <Typography
            variant="h5"
            fontWeight={600}
            color="#1a1a1a"
            gutterBottom
            textAlign="center"
          >
            Church Portal
          </Typography>
          
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              variant="outlined"
              error={!!loginError}
            />
            
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              variant="outlined"
              error={!!loginError}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {loginError && (
              <Typography 
                variant="body2" 
                color="error" 
                sx={{ mb: 2, textAlign: 'center' }}
              >
                {loginError}
              </Typography>
            )}
            
            <Button
              fullWidth
              type="submit"
              disabled={loginLoading}
              sx={{
                backgroundColor: '#F5B800',
                color: '#1a1a1a',
                textTransform: 'none',
                fontWeight: 600,
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '1rem',
                '&:hover': {
                  backgroundColor: '#E6A600',
                },
                '&:disabled': {
                  backgroundColor: '#ccc',
                  color: '#666',
                },
              }}
            >
              {loginLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>
          
          <Box textAlign="center" mt={2}>
            <Typography variant="body2" color="#666666" component="span">
              Don't have access?{' '}
            </Typography>
            <Button variant="text" sx={{ textTransform: 'none', color: '#F5B800' }}>
              Contact Administrator
            </Button>
          </Box>
        </LoginCard>
      </Dialog>

    </>
  );
};

export default Header;