import C2a from '@/components/frontend-pages/shared/c2a';
import SharedFooter from '@/components/frontend-pages/shared/footer';
import HeaderAlert from '@/components/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import QuickContactSidebar from '@/features/devel-tools/contactbar/QuickContactSidebar';
import {
    Box,
    Button,
    Card,
    Container,
    Divider,
    Grid,
    keyframes,
    Menu,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    Typography,
    useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconArchive,
    IconArrowLeft,
    IconArrowRight,
    IconCheck,
    IconChevronDown,
    IconDatabase,
    IconDownload,
    IconEye,
    IconFile,
    IconHistory,
    IconPlus,
    IconSearch,
    IconSettings,
    IconShield,
    IconSparkles,
    IconTrash,
    IconUsers,
    IconEye as IconView,
    IconWorld,
} from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LeftSideMenu from './LeftSideMenu';

// Add keyframes to the global styles
const GlobalStyles = styled('style')(`
  @keyframes rayFlow1 {
    0% { transform: translateX(-100%) rotate(15deg); opacity: 0; }
    10% { opacity: 1; }
    40% { opacity: 1; }
    50% { transform: translateX(100%) rotate(15deg); opacity: 0; }
    100% { transform: translateX(100%) rotate(15deg); opacity: 0; }
  }
  
  @keyframes rayFlow2 {
    0% { transform: translateX(100%) rotate(-10deg); opacity: 0; }
    10% { opacity: 1; }
    40% { opacity: 1; }
    50% { transform: translateX(-100%) rotate(-10deg); opacity: 0; }
    100% { transform: translateX(-100%) rotate(-10deg); opacity: 0; }
  }
  
  @keyframes rayFlow3 {
    0% { transform: translateX(-100%) rotate(25deg); opacity: 0; }
    10% { opacity: 1; }
    40% { opacity: 1; }
    50% { transform: translateX(100%) rotate(25deg); opacity: 0; }
    100% { transform: translateX(100%) rotate(25deg); opacity: 0; }
  }
  
  @keyframes rayFlow4 {
    0% { transform: translateX(100%) rotate(-5deg); opacity: 0; }
    10% { opacity: 1; }
    40% { opacity: 1; }
    50% { transform: translateX(-100%) rotate(-5deg); opacity: 0; }
    100% { transform: translateX(-100%) rotate(-5deg); opacity: 0; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 5px rgba(245, 184, 0, 0.3); }
    50% { box-shadow: 0 0 20px rgba(245, 184, 0, 0.6), 0 0 30px rgba(245, 184, 0, 0.4); }
  }


  @keyframes wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-2deg); }
    75% { transform: rotate(2deg); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  /* Footer Animation Keyframes */
  @keyframes footerSweepLeft {
    0% { transform: translateX(-100%) rotate(15deg); opacity: 0; }
    10% { opacity: 0.8; }
    40% { opacity: 0.8; }
    50% { transform: translateX(100%) rotate(15deg); opacity: 0; }
    100% { transform: translateX(100%) rotate(15deg); opacity: 0; }
  }

  @keyframes footerSweepRight {
    0% { transform: translateX(100%) rotate(-10deg); opacity: 0; }
    10% { opacity: 0.6; }
    40% { opacity: 0.6; }
    50% { transform: translateX(-100%) rotate(-10deg); opacity: 0; }
    100% { transform: translateX(-100%) rotate(-10deg); opacity: 0; }
  }

  @keyframes footerPulse {
    0% { transform: scale(0.8) rotate(0deg); opacity: 0; }
    20% { opacity: 0.4; }
    50% { transform: scale(1.2) rotate(180deg); opacity: 0.2; }
    80% { opacity: 0.4; }
    100% { transform: scale(1.6) rotate(360deg); opacity: 0; }
  }

  @keyframes footerShimmer {
    0% { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
    10% { opacity: 0.3; }
    40% { opacity: 0.3; }
    50% { transform: translateX(100%) skewX(-15deg); opacity: 0; }
    100% { transform: translateX(100%) skewX(-15deg); opacity: 0; }
  }

  @keyframes footerRadialPulse {
    0% { transform: scale(0) rotate(0deg); opacity: 0; }
    20% { opacity: 0.3; }
    50% { transform: scale(1) rotate(180deg); opacity: 0.1; }
    80% { opacity: 0.3; }
    100% { transform: scale(1.5) rotate(360deg); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
`);

// Light Ray Animation Components for Banner
const LightRay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
  pointerEvents: 'none',
});

const RayLayer1 = styled(Box)({
  position: 'absolute',
  top: '-50%',
  left: '-100%',
  width: '200%',
  height: '200%',
  background: 'linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.15) 50%, transparent 70%)',
  animation: 'rayFlow1 16s infinite linear',
  transform: 'rotate(15deg)',
});

const RayLayer2 = styled(Box)({
  position: 'absolute',
  top: '-50%',
  left: '-100%',
  width: '200%',
  height: '200%',
  background: 'linear-gradient(45deg, transparent 30%, rgba(138, 43, 226, 0.12) 50%, transparent 70%)',
  animation: 'rayFlow2 16s infinite linear',
  transform: 'rotate(-10deg)',
  animationDelay: '-4s',
});

const RayLayer3 = styled(Box)({
  position: 'absolute',
  top: '-50%',
  left: '-100%',
  width: '200%',
  height: '200%',
  background: 'linear-gradient(45deg, transparent 30%, rgba(100, 149, 237, 0.1) 50%, transparent 70%)',
  animation: 'rayFlow3 16s infinite linear',
  transform: 'rotate(25deg)',
  animationDelay: '-8s',
});

const RayLayer4 = styled(Box)({
  position: 'absolute',
  top: '-50%',
  left: '-100%',
  width: '200%',
  height: '200%',
  background: 'linear-gradient(45deg, transparent 30%, rgba(255, 182, 193, 0.08) 50%, transparent 70%)',
  animation: 'rayFlow4 16s infinite linear',
  transform: 'rotate(-5deg)',
  animationDelay: '-12s',
});

// Footer Animation Components
const FooterAnimationContainer = styled(Box)({
  position: 'relative',
  overflow: 'hidden',
});

const FooterRayLayer = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: -1,
  pointerEvents: 'none',
});

const FooterSweepLayer1 = styled(Box)({
  position: 'absolute',
  top: '-50%',
  left: '-100%',
  width: '200%',
  height: '200%',
  background: 'linear-gradient(45deg, transparent 20%, rgba(255, 215, 0, 0.15) 40%, rgba(255, 165, 0, 0.12) 60%, transparent 80%)',
  animation: 'footerSweepLeft 24s infinite linear',
  transform: 'rotate(15deg)',
  mixBlendMode: 'overlay',
});

const FooterSweepLayer2 = styled(Box)({
  position: 'absolute',
  top: '-50%',
  left: '-100%',
  width: '200%',
  height: '200%',
  background: 'linear-gradient(45deg, transparent 20%, rgba(138, 43, 226, 0.12) 40%, rgba(255, 20, 147, 0.1) 60%, transparent 80%)',
  animation: 'footerSweepRight 24s infinite linear',
  transform: 'rotate(-10deg)',
  mixBlendMode: 'soft-light',
  animationDelay: '-8s',
});

const FooterShimmerLayer = styled(Box)({
  position: 'absolute',
  top: '-50%',
  left: '-100%',
  width: '200%',
  height: '200%',
  background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%)',
  animation: 'footerShimmer 24s infinite linear',
  transform: 'skewX(-15deg)',
  mixBlendMode: 'screen',
  animationDelay: '-16s',
});

const FooterPulseLayer = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '100px',
  height: '100px',
  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(100, 149, 237, 0.08) 50%, transparent 100%)',
  transform: 'translate(-50%, -50%)',
  animation: 'footerPulse 24s infinite ease-out',
  mixBlendMode: 'overlay',
});

const FooterRadialLayer = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '200px',
  height: '200px',
  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(100, 149, 237, 0.03) 50%, transparent 100%)',
  transform: 'translate(-50%, -50%)',
  animation: 'footerRadialPulse 24s infinite ease-out',
  mixBlendMode: 'soft-light',
  animationDelay: '-12s',
});

const FeatureCard = styled(Card)(({ theme }) => ({
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: theme.palette.mode === 'dark' 
    ? '0 4px 24px rgba(0,0,0,0.3)' 
    : '0 4px 24px rgba(0,0,0,0.08)',
  border: theme.palette.mode === 'dark' 
    ? '1px solid rgba(255,255,255,0.1)' 
    : '1px solid #f0f0f0',
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : '#ffffff',
  height: '100%',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.palette.mode === 'dark' 
      ? '0 8px 32px rgba(0,0,0,0.4)' 
      : '0 8px 32px rgba(0,0,0,0.12)',
  },
}));

const FeatureIcon = styled(Box)({
  width: '64px',
  height: '64px',
  borderRadius: '16px',
  backgroundColor: '#FFF9E6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '1.5rem',
});

const CustomRecordsSection = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  padding: '5rem 0',
}));


// Welcome Card Styled Components
const WelcomeCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: '12px',
  padding: '2rem',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  maxWidth: '800px',
  margin: '0 auto',
}));

const WelcomeTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.75rem',
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
  marginBottom: '1rem',
  textAlign: 'left',
}));

const WelcomeIntro = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#333',
  lineHeight: 1.6,
  marginBottom: '1.5rem',
  textAlign: 'left',
}));

const SectionHeading = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
  marginBottom: '0.75rem',
  textAlign: 'left',
}));

const FeatureList = styled('ul')(({ theme }) => ({
  marginBottom: '1.5rem',
  margin: 0,
  paddingLeft: '1.5rem',
  listStyleType: 'disc',
  '& li': {
    fontSize: '1rem',
    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333',
    lineHeight: 1.8,
    marginBottom: '0.5rem',
  },
}));

const AboutDesignBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#E3F2FD',
  borderRadius: '8px',
  padding: '1.5rem',
  marginTop: '1.5rem',
  border: `1px solid ${theme.palette.divider}`,
}));

const AboutDesignTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.1rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
  marginBottom: '0.75rem',
  textAlign: 'left',
}));

const AboutDesignText = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#333',
  lineHeight: 1.6,
  textAlign: 'left',
}));

// Light traveling animation from left to right
const lightTravel = keyframes`
  0% {
    transform: translateX(-100%) skewX(-20deg);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(200%) skewX(-20deg);
    opacity: 0;
  }
`;

const SectionHeaderBox = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 90,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 32px',
  borderRadius: '12px',
  position: 'relative',
  overflow: 'hidden',
  // Solid background color - gradient removed
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : '#faf8f4',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04)',
  border: '2px solid rgba(212, 175, 55, 0.4)',
  borderBottom: '3px solid rgba(212, 175, 55, 0.5)',
  gap: theme.spacing(2),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect x='21' y='6' width='6' height='36' fill='%23C8A24B' fill-opacity='0.06'/%3E%3Crect x='10' y='14' width='28' height='5' fill='%23C8A24B' fill-opacity='0.06'/%3E%3C/svg%3E")`,
    backgroundSize: '48px 48px',
    backgroundRepeat: 'repeat',
    zIndex: 0,
  },
  // Light traveling effect overlay
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '30%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
    animation: `${lightTravel} 3s ease-in-out infinite`,
    zIndex: 1,
    pointerEvents: 'none',
  },
  '& > *': {
    position: 'relative',
    zIndex: 2,
  },
  [theme.breakpoints.down('md')]: {
    height: 80,
    padding: '0 24px',
  },
  [theme.breakpoints.down('sm')]: {
    height: 70,
    padding: '0 20px',
  },
}));

const SectionHeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: '26px',
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a2e',
  fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  letterSpacing: '0.5px',
  lineHeight: 1.3,
  textTransform: 'none',
  fontStyle: 'normal',
  textShadow: theme.palette.mode === 'dark' 
    ? '0 1px 2px rgba(0, 0, 0, 0.5), 0 1px 1px rgba(0, 0, 0, 0.3)' 
    : '0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 1px rgba(255, 255, 255, 0.9)',
  '@media (max-width: 900px)': {
    fontSize: '22px',
    letterSpacing: '0.3px',
  },
  '@media (max-width: 600px)': {
    fontSize: '18px',
    letterSpacing: '0.2px',
  },
}));

// Tab button styled component
const TabButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ theme, active }) => ({
  padding: theme.spacing(1.5, 3),
  cursor: 'pointer',
  fontSize: '18px',
  fontWeight: active ? 700 : 500,
  color: theme.palette.mode === 'dark' 
    ? (active ? '#ffffff' : '#cccccc')
    : (active ? '#2E0F46' : '#666666'),
  fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  letterSpacing: '0.3px',
  position: 'relative',
  transition: 'all 0.3s ease',
  borderBottom: active ? '3px solid #C8A24B' : '3px solid transparent',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  '&:hover': {
    color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
    backgroundColor: 'rgba(200, 162, 75, 0.1)',
  },
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(1, 2),
    fontSize: '16px',
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.75, 1.5),
    fontSize: '14px',
  },
}));

// ============================================================================
// HOMEPAGE COMPONENT
// ============================================================================
// Main homepage component featuring:
// - Two-tier header with navigation and utilities
// - About Us section with paginated content (book-like pages)
// - 3D rotating gallery of multilingual parish records
// - Features section highlighting platform capabilities
// - Call-to-action section
// - Footer with animation effects
// ============================================================================
const HomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // ====================================================================
  // STATE MANAGEMENT
  // ====================================================================
  
  
  // Language Section State
  // Tracks which language section is currently active (English, Greek, Russian, Romanian, Georgian)
  const [activeLanguage, setActiveLanguage] = useState<'English' | 'Greek' | 'Russian' | 'Romanian' | 'Georgian'>('English');
  
  // Track language changes to trigger smooth transition
  const [isLanguageChanging, setIsLanguageChanging] = useState(false);
  
  // Sacrament Selection State
  const [activeSacrament, setActiveSacrament] = useState<'Baptism' | 'Marriage' | 'Funeral' | null>(null);
  
  // Track which card is selected/clicked to show data
  const [selectedCard, setSelectedCard] = useState<{ language: string; title: string } | null>(null);
  
  // Track which card is flipped (key: `${language}-${title}`)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // FAQ State
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Section Tab State - tracks which main section is active
  const [activeSection, setActiveSection] = useState<'about-orthodox-christianity' | 'custom-records' | 'sample-data' | 'powerful-features' | 'graphical-analysis'>('graphical-analysis');
  
  // Header collapse state - tracks if header is collapsed into tabbed view
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  
  // Ref for FAQ section to scroll to it
  const faqSectionRef = useRef<HTMLDivElement>(null);
  
  // Sample Data submenu state
  const [sampleDataMenuAnchor, setSampleDataMenuAnchor] = useState<null | HTMLElement>(null);
  const sampleDataMenuOpen = Boolean(sampleDataMenuAnchor);

  // About Orthodox Christianity submenu state
  const [aboutOrthodoxMenuAnchor, setAboutOrthodoxMenuAnchor] = useState<null | HTMLElement>(null);
  const aboutOrthodoxMenuOpen = Boolean(aboutOrthodoxMenuAnchor);


  // FAQ Data
  const faqData = [
    {
      question: 'How secure are our parish records?',
      answer: 'Your data is protected with strong encryption and stored securely. Only authorized users can access it. We use bank-level security protocols, encrypted data transmission, and secure cloud storage to ensure your parish records remain private and protected at all times.'
    },
    {
      question: 'Which languages does OrthodoxMetrics support?',
      answer: 'We support English, Greek, Russian, Romanian, and more for both viewing and record processing. Our advanced OCR technology can recognize text in multiple Orthodox languages, including Church Slavonic script, ensuring accurate digitization of historical documents.'
    },
    {
      question: 'Who owns the data and can we export it?',
      answer: 'You always own your data. You can export your records anytime in various formats including PDF, CSV, and XML. There are no restrictions on data portability, and you maintain complete control over your parish information.'
    },
    {
      question: 'How accurate is the OCR technology?',
      answer: 'Our AI-powered OCR is highly accurate and improves with every batch. You can review and correct results as needed. The system achieves over 95% accuracy on clear documents and includes built-in verification tools to ensure data integrity.'
    },
    {
      question: "What's the onboarding process like?",
      answer: "It's quick and guided. We help you upload, set up your account, and start managing your records right away. Our dedicated support team provides personalized training and assistance to ensure a smooth transition to digital record management."
    },
    {
      question: 'Can we integrate with our existing church management system?',
      answer: 'Yes. We offer integration options and export features compatible with most systems. Our API allows seamless data synchronization with popular church management software, ensuring your workflow remains uninterrupted.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  
  // 3D Gallery Rotation State
  // Tracks the current rotation angle (in degrees) for the 3D records gallery
  // Continuously increments when hovering or clicked to create rotation effect
  const [currentRotation, setCurrentRotation] = useState(0);
  
  // Hover State for 3D Gallery
  // Indicates whether user is hovering over the 3D gallery
  // When true, auto-rotation is active
  const [isHovering, setIsHovering] = useState(false);
  
  // Click State for 3D Gallery
  // Indicates whether user has clicked on the 3D gallery
  // When true, auto-rotation is active
  const [isClicked, setIsClicked] = useState(false);
  
  // Drag State for 3D Gallery
  // Tracks mouse position during drag to rotate cards manually
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartRotation, setDragStartRotation] = useState(0);
  
  // Book Page Navigation State
  // Tracks which page (0-3) is currently displayed in the "About Us" book section
  // Pages: 0=About Us, 1=What We Offer, 2=Why Orthodox Metrics?, 3=Looking Forward
  const [currentPage, setCurrentPage] = useState(0);
  
  // Typed Text State
  // Stores the progressively typed text content for the current book page
  // Used to create typing animation effect when pages change
  const [pageTypedText, setPageTypedText] = useState('');
  
  // Scroll detection for heading underline effect
  const [isHeadingInView, setIsHeadingInView] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for heading scroll detection
  useEffect(() => {
    // Reset underline state when page changes
    setIsHeadingInView(false);
    
    // Small delay to allow the new heading to render before observing
    const timer = setTimeout(() => {
      if (headingRef.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setIsHeadingInView(true);
              }
            });
          },
          {
            threshold: 0.3, // Trigger when 30% of the element is visible
            rootMargin: '-50px 0px', // Start animation slightly before element is fully in view
          }
        );
        observer.observe(headingRef.current);
        
        return () => {
          observer.disconnect();
        };
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [currentPage]); // Re-observe when page changes

  // ====================================================================
  // DATA ARRAYS
  // ====================================================================
  
  // Book Pages Data
  // Content for the paginated "About Us" section
  // Each page contains a title, image, and full content text describing Orthodox Metrics
  const bookPages = [
    {
      title: 'About Us',
      image: '/images/sections/about.png',
      crossesImage: '/images/incode/dune-crosses.png',
      content: 'Orthodox Metrics LLC. is an Orthodox-grown solution built to serve communities across the world with full multilingual support. Our platform seamlessly adapts to English, Greek, Russian, Church Slavonic, Georgian, Romanian, Latin, and Chinese, ensuring that every record, interface, and report can be read and managed in the language of your church\'s tradition. Whether you are a large parish or a small mission, Orthodox Metrics was built with care to honor the unique heritage of every Orthodox community.'
    },
    {
      title: 'What We Offer',
      image: '/images/sections/what-we-offer.png',
      crossesImage: '/images/incode/dune-crosses.png',
      content: 'At Orthodox Metrics, we provide a complete ecosystem designed to organize and simplify how churches manage their records, communications, and digital presence. From baptism, marriage, and funeral records to parish directories, donation management, and multilingual reports, our platform brings clarity and organization to the most essential areas of church life. We also assist with website integration, secure data hosting, and tailored solutions for each jurisdiction and language — all while maintaining the reverence and integrity of Orthodox tradition.'
    },
    {
      title: 'Why Orthodox Metrics?',
      image: '/images/sections/why-orthodox-metrics.png',
      crossesImage: '/images/incode/dune-crosses.png',
      content: 'Our mission is simple: to help Orthodox parishes thrive in the modern age without losing their timeless roots. Unlike generic church management tools, Orthodox Metrics was created by Orthodox Christians for Orthodox Christians — with an understanding of how cultural, linguistic, and liturgical nuances shape parish life. We believe that technology should strengthen the bonds of faith and community, not complicate them. Every feature we build is guided by that principle, ensuring reliability, privacy, and ease of use for clergy, staff, and faithful alike.'
    },
    {
      title: 'Looking Forward to Speaking With You',
      image: '/images/sections/looking-forward.png',
      crossesImage: '/images/incode/dune-crosses.png',
      content: 'We are located in Phillipsburg, New Jersey, and are humbled to serve the growing needs of Orthodox Churches both locally and around the world. Having recently launched, we are eager to connect with parishes, monasteries, and missions seeking to bring their administrative and archival work into a unified, beautiful, and spiritually mindful digital space. We warmly invite our brothers and sisters in Christ to reach out — whether you are just beginning your digital journey or ready to expand your existing systems — and let us walk alongside you in building a stronger, more connected Orthodox future.'
    }
  ];

  // 3D Gallery Items Array - All Languages
  // Contains multilingual parish record samples for the 3D rotating gallery
  // Each item includes: flag country, language label, record type title, sample data, and date fields
  const allItems = {
    English: [
      { flag: 'USA', label: 'English', title: 'Baptism Records', sampleData: 'First Name\nLast Name\nDate of Birth\nDate of Baptism\nBirthplace\nSponsors\nParents Names\nClergy Name', fields: '' },
      { flag: 'USA', label: 'English', title: 'Marriage Records', sampleData: 'Date Married\nGroom\nBride\nGrooms Parents\nBrides Parents\nWitnesses\nMarriage License\nClergy', fields: '' },
      { flag: 'USA', label: 'English', title: 'Funeral Records', sampleData: 'Date Deceased\nBurial Date\nAge\nBurial Location\nFirst Name\nLast Name\nClergy', fields: '' },
    ],
    Greek: [
      { flag: 'Greece', label: 'Ελληνικά', title: 'Βάπτιση', sampleData: 'Όνομα\nΕπώνυμο\nΗμ. Γέννησης\nΗμ. Βάπτισης\nΤόπος Γέννησης\nΑνάδοχοι\nΓονείς\nΙερέας', fields: '' },
      { flag: 'Greece', label: 'Ελληνικά', title: 'Γάμος', sampleData: 'Ημ. Γάμου\nΓαμπρός\nΝύφη\nΓονείς Γαμπρού\nΓονείς Νύφης\nΜάρτυρες\nΆδεια Γάμου\nΙερέας', fields: '' },
      { flag: 'Greece', label: 'Ελληνικά', title: 'Κηδεία', sampleData: 'Ημ. Θανάτου\nΗμ. Κηδείας\nΗλικία\nΤόπος Κηδείας\nΌνομα\nΕπώνυμο\nΙερέας', fields: '' },
    ],
    Russian: [
      { flag: 'Russia', label: 'Русский', title: 'Крещение', sampleData: 'Имя\nФамилия\nДата рождения\nДата крещения\nМесто рождения\nВосприемники\nРодители\nСвященник', fields: '' },
      { flag: 'Russia', label: 'Русский', title: 'Брак', sampleData: 'Дата брака\nЖених\nНевеста\nРодители жениха\nРодители невесты\nСвидетели\nСвидетельство о браке\nСвященник', fields: '' },
      { flag: 'Russia', label: 'Русский', title: 'Похороны', sampleData: 'Дата смерти\nДата похорон\nВозраст\nМесто захоронения\nИмя\nФамилия\nСвященник', fields: '' },
    ],
    Romanian: [
      { flag: 'Romania', label: 'Română', title: 'Botez', sampleData: 'Prenume\nNume de familie\nData nașterii\nData botezului\nLocul nașterii\nNași\nPărinți\nPreot', fields: '' },
      { flag: 'Romania', label: 'Română', title: 'Căsătorie', sampleData: 'Data căsătoriei\nMire\nMireasă\nPărinții mirelui\nPărinții miresei\nMartori\nLicență de căsătorie\nPreot', fields: '' },
      { flag: 'Romania', label: 'Română', title: 'Înmormântare', sampleData: 'Data decesului\nData înmormântării\nVârsta\nLocul înmormântării\nPrenume\nNume de familie\nPreot', fields: '' },
    ],
    Georgian: [
      { flag: 'Georgia', label: 'ქართული', title: 'ნათლობის ჩანაწერები', sampleData: 'სახელი\nგვარი\nდაბადების თარიღი\nნათლობის თარიღი\nდაბადების ადგილი\nნათლიები\nმშობლების სახელები\nმღვდლის სახელი', fields: '' },
      { flag: 'Georgia', label: 'ქართული', title: 'ქორწინების ჩანაწერები', sampleData: 'ქორწინების თარიღი\nსიძე\nპატარძალი\nსიძის მშობლები\nპატარძლის მშობლები\nმოწმეები\nქორწინების მოწმობა\nმღვდელი', fields: '' },
      { flag: 'Georgia', label: 'ქართული', title: 'დასაფლავების ჩანაწერები', sampleData: 'გარდაცვალების თარიღი\nდასაფლავების თარიღი\nასაკი\nდასაფლავების ადგილი\nსახელი\nგვარი\nმღვდელი', fields: '' },
    ],
  };

  // Get items for currently active language
  const items = allItems[activeLanguage];
  
  // Sample data for English Baptism Records
  const englishBaptismData = {
    firstName: 'Mary Alice',
    lastName: 'Kulina',
    dateOfBirth: '9/27/1951',
    dateOfBaptism: '10/27/1951',
    birthplace: 'Somerville NJ',
    sponsors: 'Michael Kulina Doris Kateles',
    parentsNames: 'Joseph Kulina & Alice Mae Hortzog',
    clergyName: 'Rev. Nicholas Kiryluk',
  };

  // Sample data for Greek Baptism Records
  const greekBaptismData = {
    firstName: 'Αναστασία',
    lastName: 'Αναγνωστόπουλος',
    dateOfBirth: '1987-03-06',
    dateOfBaptism: '1987-09-19',
    birthplace: 'Ιωάννινα',
    sponsors: 'Ειρήνη Ιωάννου, Παναγιώτης Νικολάου',
    parentsNames: 'Ιωάννης & Φωτεινή Αναγνωστόπουλος',
    clergyName: 'Π. Παύλος Λαμπρόπουλος',
  };

  // Sample data for Georgian Baptism Records
  const georgianBaptismData = {
    firstName: 'გიორგი',
    lastName: 'მელაძე',
    dateOfBirth: '2018-04-12',
    dateOfBaptism: '2018-05-06',
    birthplace: 'თბილისი, საქართველო',
    sponsors: 'ლევან ქავთარაძე, ნინო მაისურაძე',
    parentsNames: 'ირაკლი მელაძე და ქეთევან გუგუშვილი',
    clergyName: 'მამა დავით კვიწინაძე',
  };

  // Sample data for English Marriage Records
  const englishMarriageData = {
    dateMarried: '6/11/2005',
    groom: 'John Parsells',
    bride: 'Emily Joyce Straut',
    groomsParents: 'James & Daria',
    bridesParents: 'David & Donna',
    witnesses: 'Gregory Parsells Anna Straut',
    marriageLicense: '',
    clergyName: 'Bishop Tikhon',
  };

  // Sample data for Georgian Marriage Records
  const georgianMarriageData = {
    dateMarried: '2021-09-18',
    groom: 'თორნიკე ბერიძე',
    bride: 'ანასტასია დოლიძე',
    groomsParents: 'დავით ბერიძე და ნანა ბარამიძე',
    bridesParents: 'გიორგი დოლიძე და მაკა კაპანაძე',
    witnesses: 'გიგა გიორგაძე, თამარ შალამბერიძე',
    marriageLicense: 'GE-2021-49127',
    clergyName: 'მამა იოანე მიქელაძე',
  };

  // Sample data for English Funeral Records
  const englishFuneralData = {
    dateDeceased: '7/14/2025',
    burialDate: '7/31/2025',
    age: '88',
    burialLocation: 'Ss. Peter & Paul Cemetery',
    firstName: 'Kathyrn',
    lastName: 'Motoviloff',
    clergyName: 'Rev. James Parsells',
  };

  // Sample data for Georgian Funeral Records
  const georgianFuneralData = {
    dateDeceased: '2023-11-02',
    burialDate: '2023-11-05',
    age: '78',
    burialLocation: 'მუხათგვერდის სასაფლაო, თბილისი',
    firstName: 'მერაბ',
    lastName: 'ჭანტურია',
    clergyName: 'მამა ზაქარია თანდილაშვილი',
  };

  // Sample data for Greek Marriage Records
  const greekMarriageData = {
    dateMarried: '15/06/2010',
    groom: 'Γιάννης Παπαδόπουλος',
    bride: 'Μαρία Νικολάου',
    groomsParents: 'Δημήτρης & Ελένη Παπαδόπουλος',
    bridesParents: 'Νίκος & Σοφία Νικολάου',
    witnesses: 'Κώστας Παπαδόπουλος, Άννα Νικολάου',
    marriageLicense: 'Αριθμός 12345',
    clergyName: 'Π. Παύλος Λαμπρόπουλος',
  };

  // Sample data for Greek Funeral Records
  const greekFuneralData = {
    dateDeceased: '2021-11-14',
    burialDate: '2021-11-16',
    age: '78',
    burialLocation: 'Κοιμητήριο Αγίου Νικολάου',
    firstName: 'Σπυρίδων',
    lastName: 'Γεωργίου',
    clergyName: 'Π. Δημήτριος Παπαδόπουλος',
  };

  // Sample data for Russian Baptism Records
  const russianBaptismData = {
    firstName: 'Александр',
    lastName: 'Иванов',
    dateOfBirth: '2016-03-12',
    dateOfBaptism: '2016-05-08',
    birthplace: 'Москва',
    sponsors: 'Мария Петрова; Дмитрий Волков',
    parentsNames: 'Иван Иванов и Ольга Николаева',
    clergyName: 'Свящ. Михаил Сидоров',
  };

  // Sample data for Russian Marriage Records
  const russianMarriageData = {
    dateMarried: '2019-09-22',
    groom: 'Павел Георгиев',
    bride: 'Екатерина Морозова',
    groomsParents: 'Сергей Георгиев и Наталья Георгиева',
    bridesParents: 'Алексей Морозов и Татьяна Морозова',
    witnesses: 'Иван Орлов; Полина Фёдорова',
    marriageLicense: 'БР-482915',
    clergyName: 'Свящ. Николай Александров',
  };

  // Sample data for Russian Funeral Records
  const russianFuneralData = {
    dateDeceased: '2021-11-03',
    burialDate: '2021-11-06',
    age: '74',
    burialLocation: 'Никольское кладбище, Санкт-Петербург',
    firstName: 'Александр',
    lastName: 'Иванов',
    clergyName: 'протоиерей Сергий Петров',
  };

  // Sample data for Romanian Baptism Records
  const romanianBaptismData = {
    firstName: 'Andrei',
    lastName: 'Popescu',
    dateOfBirth: '2017-04-19',
    dateOfBaptism: '2017-06-11',
    birthplace: 'București',
    sponsors: 'Elena Ionescu; Gabriel Tudor',
    parentsNames: 'Ion Popescu și Maria Popescu',
    clergyName: 'Pr. Nicolae Munteanu',
  };

  // Sample data for Romanian Marriage Records
  const romanianMarriageData = {
    dateMarried: '2020-08-29',
    groom: 'Cristian Dumitrescu',
    bride: 'Alexandra Stan',
    groomsParents: 'Vasile Dumitrescu și Adriana Dumitrescu',
    bridesParents: 'Gheorghe Stan și Mihaela Stan',
    witnesses: 'Radu Enache; Bianca Iliescu',
    marriageLicense: 'CT-593821',
    clergyName: 'Pr. Ioan Popescu',
  };

  // Sample data for Romanian Funeral Records
  const romanianFuneralData = {
    dateDeceased: '2021-03-17',
    burialDate: '2021-03-20',
    age: '76',
    burialLocation: 'Cimitirul Sfânta Treime',
    firstName: 'Mihai',
    lastName: 'Georgescu',
    clergyName: 'Pr. Petru Ionescu',
  };

  // ====================================================================
  // EFFECT HOOKS
  // ====================================================================
  
  // Auto-Rotation Effect for 3D Gallery
  // Continuously rotates the 3D records gallery when user is hovering or has clicked
  // Rotation speed: 0.1 degrees per frame at ~60fps (16ms interval) = ~6 degrees per second
  // Only rotates when isHovering or isClicked is true, and not dragging
  useEffect(() => {
    if ((!isHovering && !isClicked) || isDragging) {
      // Don't rotate when not hovering/clicked or when dragging
      return;
    }

    // Auto-rotate continuously for dynamic visual effect
    const rotationInterval = setInterval(() => {
      setCurrentRotation(prev => prev + 0.1); // Smooth rotation increment (1 full rotation every ~60 seconds)
    }, 16); // ~60fps animation rate

    // Cleanup: clear interval when component unmounts or state changes
    return () => clearInterval(rotationInterval);
  }, [isHovering, isClicked, isDragging]);

  // Global mouse move handler for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const rotationDelta = deltaX * 0.5; // Adjust sensitivity
      setCurrentRotation(dragStartRotation + rotationDelta);
    };

    const handleMouseUp = () => {
      setIsClicked(false);
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartX, dragStartRotation]);

  // Typing Effect for Book Pages
  // Creates a typing animation effect when book pages change
  // Types out the page content character by character for visual appeal
  // Note: Currently shows text immediately but includes typing logic for future enhancement
  useEffect(() => {
    const currentPageData = bookPages[currentPage];
    if (!currentPageData) return; // Guard against invalid page index

    // Show text immediately for faster loading (can be changed to progressive typing)
    setPageTypedText(currentPageData.content);

    // Optional: Progressive typing effect (currently disabled for performance)
    // Types 5 characters at a time every 5ms for smooth animation
    let currentIndex = 0;
    setPageTypedText(''); // Reset text

    const typeInterval = setInterval(() => {
      if (currentIndex < currentPageData.content.length) {
        setPageTypedText(currentPageData.content.slice(0, currentIndex + 5));
        currentIndex += 5; // Increment by 5 characters per interval
      } else {
        clearInterval(typeInterval); // Stop when content is fully typed
      }
    }, 5); // Very fast typing with 5 characters at a time

    // Cleanup: clear interval when component unmounts or page changes
    return () => clearInterval(typeInterval);
  }, [currentPage]); // Re-run when page changes

  // ====================================================================
  // EVENT HANDLERS
  // ====================================================================
  
  // Book Page Navigation Handlers
  // Navigate between book pages (forward and backward)
  const handleNextPage = () => {
    // Move to next page if not already on last page
    if (currentPage < bookPages.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    // Move to previous page if not already on first page
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  // Handle arrow click - collapse header and show FAQ at top
  const handleArrowClick = () => {
    setIsHeaderCollapsed(!isHeaderCollapsed);
  };
  
  // FAQ Section Component - reusable
  const renderFAQSection = () => (
    <Box ref={faqSectionRef} sx={{ backgroundColor: theme.palette.background.default, padding: '5rem 0' }}>
      <Container maxWidth="md">
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontWeight: 600,
            color: '#7B4F9E',
            textAlign: 'center',
            mb: 1,
            fontSize: { xs: '1.75rem', md: '2.25rem' },
          }}
        >
          Frequently Asked Questions
        </Typography>
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h6"
            sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}
          >
            Common questions about OrthodoxMetrics and how it can help your parish.
          </Typography>
        </Box>
        
        <Box sx={{ maxWidth: '100%' }}>
          {faqData.map((faq, index) => (
            <Box
              key={index}
              sx={{
                marginBottom: '1rem',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#F5B800',
                  boxShadow: '0 4px 12px rgba(245, 184, 0, 0.1)',
                },
              }}
            >
              <Box
                onClick={() => toggleFAQ(index)}
                sx={{
                  padding: '1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: openFAQ === index 
                    ? (theme.palette.mode === 'dark' ? 'rgba(255, 249, 230, 0.1)' : '#FFF9E6')
                    : theme.palette.background.paper,
                  transition: 'background-color 0.3s ease',
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#6B46C1',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    flex: 1,
                    marginRight: '1rem',
                  }}
                >
                  {faq.question}
                </Typography>
                <IconChevronDown 
                  size={24} 
                  color={theme.palette.mode === 'dark' ? '#ffffff' : '#666666'}
                  style={{
                    transform: openFAQ === index ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                  }}
                />
              </Box>
              {openFAQ === index && (
                <Box
                    sx={{
                      padding: '0 1.5rem 1.5rem 1.5rem',
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? theme.palette.background.default 
                        : '#FAFAFA',
                      borderTop: `1px solid ${theme.palette.divider}`,
                    animation: 'fadeIn 0.3s ease',
                    '@keyframes fadeIn': {
                      from: { opacity: 0, transform: 'translateY(-10px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                  }}
                >
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666',
                      lineHeight: 1.7,
                      fontSize: '1rem' 
                    }}
                  >
                    {faq.answer}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
  
  // Map section names to tab indices
  const sectionToTabIndex: Record<string, number> = {
    'custom-records': 0,
    'sample-data': 1,
    'powerful-features': 2,
    'graphical-analysis': 3,
  };
  
  const tabIndexToSection: Record<number, string> = {
    0: 'custom-records',
    1: 'sample-data',
    2: 'powerful-features',
    3: 'graphical-analysis',
  };
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSection(tabIndexToSection[newValue] as typeof activeSection);
  };
  
  // Sample Data menu handlers
  const handleSampleDataMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSampleDataMenuAnchor(event.currentTarget);
  };
  
  const handleSampleDataMenuClose = () => {
    setSampleDataMenuAnchor(null);
  };
  
  const handleSampleDataMenuItemClick = (path: string) => {
    handleSampleDataMenuClose();
    navigate(path);
  };

  // About Orthodox Christianity menu handlers
  const handleAboutOrthodoxMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAboutOrthodoxMenuAnchor(event.currentTarget);
  };

  const handleAboutOrthodoxMenuClose = () => {
    setAboutOrthodoxMenuAnchor(null);
  };

  const handleAboutOrthodoxMenuItemClick = (path: string) => {
    handleAboutOrthodoxMenuClose();
    navigate(path);
  };

  const handleSubmenuItemClick = (path: string) => {
    // Ensure path is absolute and prevent duplication
    const absolutePath = path.startsWith('/') ? path : `/${path}`;
    // Only navigate if we're not already on that path
    if (location.pathname !== absolutePath) {
      navigate(absolutePath, { replace: false });
    }
  };
  

  return (
    <Box>
      {/* Shared Header */}
      <HeaderAlert />
      <HpHeader />

      {/* Left Side Popout Menu */}
      <LeftSideMenu
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSubmenuItemClick={handleSubmenuItemClick}
      />

      {/* Orthodox Metrics Welcome Section */}
      <Box
        sx={{
          background: theme.palette.background.default,
          padding: { xs: '3rem 0', sm: '4rem 0', md: '5rem 0' },
          position: 'relative',
        }}
      >
        {/* Logo positioned on the left side */}
        <Box
          component="img"
          src="/images/logos/om-logo.png"
          alt="Orthodox Metrics"
          sx={{
            position: 'absolute',
            left: { xs: 16, sm: 32, md: 48 },
            top: { xs: '3rem', sm: '4rem', md: '5rem' },
            width: { xs: 60, sm: 70, md: 80 },
            height: { xs: 60, sm: 70, md: 80 },
            borderRadius: '50%',
            objectFit: 'cover',
            opacity: 0.85,
            display: { xs: 'none', md: 'block' },
          }}
        />
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: '900px', mx: 'auto' }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                fontWeight: 700,
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
                mb: 3,
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
              }}
            >
              Orthodox Metrics
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#666666',
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.15rem' },
                lineHeight: 1.8,
                mb: 2,
              }}
            >
              Welcome to Orthodox Metrics, LLC, your gateway to modern, beautifully organized Orthodox Church record management. We're honored to support your parish with tools that make history, sacraments, and data come alive with clarity and reverence.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#666666',
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.15rem' },
                lineHeight: 1.8,
              }}
            >
              To get started quickly, we recommend visiting the{' '}
              <Box
                component="span"
                onClick={() => navigate('/samples')}
                sx={{
                  color: '#C8A24B',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: '#E6A600',
                  },
                }}
              >
                Samples page
              </Box>
              {' '}to explore real examples of how records and analytics will look in your system.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ============================================================ */}
      {/* SECTION: See OrthodoxMetrics in Action (Screenshot 1)        */}
      {/* ============================================================ */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.default }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 600,
              color: '#7B4F9E',
              textAlign: 'center',
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            See OrthodoxMetrics in Action
          </Typography>
          <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', mb: 6 }}>
            Experience the interface in your preferred language
          </Typography>

          <Grid container spacing={4} alignItems="flex-start">
            {/* Language selector */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2}>
                {[
                  { lang: 'English', desc: 'Full English interface for North American and global parishes', color: '#D4AF37' },
                  { lang: 'Greek (\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC)', desc: 'Full Greek interface with proper Orthodox terminology', color: '#4CAF50' },
                  { lang: 'Russian (\u0420\u0443\u0441\u0441\u043A\u0438\u0439)', desc: 'Complete Russian localization for Slavic Orthodox communities', color: '#4CAF50' },
                  { lang: 'Romanian (Rom\u00E2n\u0103)', desc: 'Romanian interface for Orthodox parishes in Romania and diaspora', color: '#4CAF50' },
                  { lang: 'Georgian (\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8)', desc: 'Georgian language support for the Georgian Orthodox Church', color: '#4CAF50' },
                ].map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 2,
                      borderRadius: '10px',
                      border: i === 0 ? '2px solid #D4AF37' : '1px solid',
                      borderColor: i === 0 ? '#D4AF37' : 'divider',
                      backgroundColor: i === 0 ? 'rgba(212,175,55,0.06)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.04)' },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
                      <Typography variant="subtitle2" fontWeight={600}>{item.lang}</Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', ml: 2.5 }}>{item.desc}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>

            {/* Mock dashboard preview */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Box
                sx={{
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: theme.palette.background.paper,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                }}
              >
                {/* Browser bar */}
                <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#28c840' }} />
                  <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>dashboard.orthodoxmetrics.com</Typography>
                </Box>
                {/* Dashboard content */}
                <Box sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>OrthodoxMetrics</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>EL</Typography>
                  </Stack>
                  <Grid container spacing={2} mb={3}>
                    {[
                      { label: 'Records', value: '1,247' },
                      { label: 'Pending', value: '23' },
                      { label: 'Recent', value: '45' },
                    ].map((stat, i) => (
                      <Grid key={i} size={{ xs: 4 }}>
                        <Box sx={{ p: 1.5, borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                          <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconUsers size={16} color="#999" />
                      <Typography variant="body2" color="text.secondary">New baptism record added</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconFile size={16} color="#e74c3c" />
                      <Typography variant="body2" color="text.secondary">Marriage certificate uploaded</Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Box>
              {/* Try Interactive Demo button */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  href="/samples"
                  sx={{
                    background: 'linear-gradient(135deg, #D4AF37, #F4D03F)',
                    color: '#1a0a2e',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 4,
                    borderRadius: '24px',
                    '&:hover': { background: 'linear-gradient(135deg, #c9a430, #e6c52e)' },
                  }}
                >
                  <IconEye size={18} style={{ marginRight: 8 }} /> Try Interactive Demo
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================ */}
      {/* SECTION: Built for Orthodox Communities (Screenshot 2)        */}
      {/* ============================================================ */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.paper }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 600,
              color: '#7B4F9E',
              textAlign: 'center',
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            Built for Orthodox Communities
          </Typography>
          <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', mb: 6 }}>
            Every feature designed with Orthodox tradition and practicality in mind
          </Typography>

          {/* Support for All Orthodox Church Records */}
          <Grid container spacing={6} alignItems="center" mb={8}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="h5" sx={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: '#7B4F9E', fontWeight: 600, mb: 1.5 }}>
                Support for All Record Types
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Baptisms, Marriages, Funerals, Chrismations, and any custom sacramental record your parish needs — all managed from one unified interface with full control over how your data is displayed.
              </Typography>
              {['Define your own table headers and column order', 'Weighted search sorting across all record fields', 'Theme Studio for colors, fonts, and row styling', 'Dark mode and light mode with one click'].map((item, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center" mb={0.8}>
                  <IconCheck size={16} color="#4CAF50" />
                  <Typography variant="body2">{item}</Typography>
                </Stack>
              ))}
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: theme.palette.background.default }}>
                <Typography variant="subtitle2" fontWeight={600} mb={2}>Custom Table Headers</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Stack direction="row" spacing={0} sx={{ minWidth: 420 }}>
                    {[
                      { label: 'Last Name', weight: 12 },
                      { label: 'First Name', weight: 8 },
                      { label: 'Date of Baptism', weight: 5 },
                      { label: 'Sponsors', weight: 3 },
                      { label: 'Clergy', weight: 2 },
                    ].map((col, i) => (
                      <Box
                        key={i}
                        sx={{
                          flex: 1,
                          py: 1,
                          px: 1.5,
                          textAlign: 'left',
                          backgroundColor: i === 0 ? '#7B4F9E' : 'rgba(123, 79, 158, 0.08)',
                          color: i === 0 ? '#fff' : 'text.primary',
                          borderRight: i < 4 ? '1px solid' : 'none',
                          borderColor: 'divider',
                          borderTopLeftRadius: i === 0 ? '8px' : 0,
                          borderTopRightRadius: i === 4 ? '8px' : 0,
                        }}
                      >
                        <Typography variant="caption" fontWeight={600} display="block">{col.label}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>weight: {col.weight}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  {[
                    ['Kulina', 'Mary Alice', '10/27/1951', 'M. Kulina', 'Fr. Kiryluk'],
                    ['Parsells', 'John', '06/15/1980', 'G. Parsells', 'Fr. Tkachuk'],
                  ].map((row, ri) => (
                    <Stack key={ri} direction="row" spacing={0} sx={{ minWidth: 420 }}>
                      {row.map((cell, ci) => (
                        <Box
                          key={ci}
                          sx={{
                            flex: 1,
                            py: 0.8,
                            px: 1.5,
                            borderRight: ci < 4 ? '1px solid' : 'none',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            backgroundColor: ri % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                          }}
                        >
                          <Typography variant="caption">{cell}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  ))}
                </Box>
                <Stack direction="row" spacing={2} mt={2} alignItems="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconSettings size={14} color="#7B4F9E" />
                    <Typography variant="caption" color="text.secondary">Theme Studio</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconSearch size={14} color="#D4AF37" />
                    <Typography variant="caption" color="text.secondary">Weighted Search</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconDownload size={14} color="#4CAF50" />
                    <Typography variant="caption" color="text.secondary">XLSX Export</Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          </Grid>

          {/* Multilingual OCR Recognition */}
          <Grid container spacing={6} alignItems="center" mb={8}>
            <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 1, md: 2 } }}>
              <Typography variant="h5" sx={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: '#7B4F9E', fontWeight: 600, mb: 1.5 }}>
                Multilingual OCR Recognition
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Advanced text recognition that understands Orthodox terminology in Greek, Cyrillic, and Latin scripts.
              </Typography>
              {['Greek text recognition', 'Cyrillic script support', 'Orthodox terminology detection', 'Historical document processing'].map((item, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center" mb={0.8}>
                  <IconCheck size={16} color="#4CAF50" />
                  <Typography variant="body2">{item}</Typography>
                </Stack>
              ))}
            </Grid>
            <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 2, md: 1 } }}>
              <Box sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: theme.palette.background.default }}>
                <Typography variant="subtitle2" fontWeight={600} mb={2}>OCR Processing</Typography>
                <Box sx={{ fontFamily: '"Fira Code", "Consolas", monospace', fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.6, p: 2, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px', overflowX: 'auto', whiteSpace: 'pre' }}>
{`{
  "status": "complete",
  "confidence": 0.96,
  "language": "el",
  "record_type": "baptism",
  "extracted_fields": {
    "first_name": "Μαρία",
    "last_name": "Γεωργίου",
    "date_of_baptism": "15 Αυγούστου 2023",
    "birthplace": "Αθήνα, Ελλάδα",
    "sponsors": "Ελένη Παπαδοπούλου",
    "parents": "Ιωάννης & Φωτεινή Γεωργίου",
    "priest": "π. Δημήτριος Παπαδόπουλος"
  },
  "pages_processed": 1,
  "processing_time_ms": 2340
}`}
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Smart Record Linking */}
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="h5" sx={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: '#7B4F9E', fontWeight: 600, mb: 1.5 }}>
                Smart Record Linking
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Automatically connect related sacramental records across a person's spiritual journey in your parish.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: theme.palette.background.default }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <IconUsers size={18} color="#7B4F9E" />
                  <Typography variant="subtitle2" fontWeight={600}>Family Connections</Typography>
                </Stack>
                <Stack spacing={1} sx={{ pl: 1 }}>
                  <Typography variant="body2">&bull; Maria Georgiadou (Baptism)</Typography>
                  <Typography variant="body2">&bull; Nikolaos Georgiadou (Marriage)</Typography>
                  <Typography variant="body2">&bull; Anna Georgiadou (Chrismation)</Typography>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================ */}
      {/* SECTION: Trusted by Orthodox Clergy (Screenshot 3)           */}
      {/* ============================================================ */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.default }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 600,
              color: theme.palette.mode === 'dark' ? '#fff' : '#1a1a1a',
              textAlign: 'center',
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            Trusted by Orthodox Clergy Worldwide
          </Typography>
          <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', mb: 3 }}>
            Built by Orthodox Christians, for Orthodox Christians
          </Typography>
        </Container>
      </Box>

      {/* ============================================================ */}
      {/* SECTION: Free for Most Parishes (Screenshot 4)               */}
      {/* ============================================================ */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#faf8f5' }}>
        <Container maxWidth="md">
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 600,
              color: '#7B4F9E',
              textAlign: 'center',
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            Affordable Pricing
          </Typography>
          <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', mb: 5 }}>
            Certain churches may qualify for eligibility of free records management
          </Typography>

          <Box
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: '16px',
              backgroundColor: theme.palette.background.paper,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <IconCheck size={22} color="#4CAF50" style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#2E7D32' }}>
                        Complete access to all features at no cost for parishes under 500 active members
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <IconShield size={20} color="#D4AF37" style={{ marginTop: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Supported by voluntary donations from parishes who can contribute
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <IconDatabase size={20} color="#5C6BC0" style={{ marginTop: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Special diocesan licensing available for administrative oversight
                    </Typography>
                  </Stack>
                  <Button
                    variant="contained"
                    size="large"
                    href="/auth/register"
                    sx={{
                      mt: 1,
                      background: 'linear-gradient(135deg, #D4AF37, #F4D03F)',
                      color: '#1a0a2e',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: '8px',
                      '&:hover': { background: 'linear-gradient(135deg, #c9a430, #e6c52e)' },
                    }}
                  >
                    Get Started Free &rarr;
                  </Button>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={2}>Included Features:</Typography>
                {[
                  'Unlimited sacramental records',
                  'All language interfaces',
                  'OCR document processing',
                  'Certificate generation',
                  'Liturgical calendar',
                  'Email support',
                  'Data export tools',
                  'Secure cloud storage',
                ].map((feature, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center" mb={0.8}>
                    <IconCheck size={16} color="#4CAF50" />
                    <Typography variant="body2" fontWeight={500}>{feature}</Typography>
                  </Stack>
                ))}
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* ============================================================ */}
      {/* SECTION: Ready to Preserve Your Parish Records? (Screenshot 5) */}
      {/* ============================================================ */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: theme.palette.background.default }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <SectionHeaderBox sx={{ mb: 4 }}>
            <SectionHeaderTitle component="h3">
              Ready to Preserve Your Parish Records?
            </SectionHeaderTitle>
          </SectionHeaderBox>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
            Let us help you get started with a personalized onboarding session
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mb: 4, fontSize: '0.85rem' }}>
            Our team will guide you through setting up OrthodoxMetrics for your parish, including data migration from existing records and training for your staff.
          </Typography>

          <Button
            variant="contained"
            size="large"
            href="/frontend-pages/contact"
            fullWidth
            sx={{
              background: 'linear-gradient(135deg, #D4AF37, #F4D03F)',
              color: '#1a0a2e',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '8px',
              py: 1.5,
              mb: 4,
              '&:hover': { background: 'linear-gradient(135deg, #c9a430, #e6c52e)' },
            }}
          >
            Schedule Free Consultation
          </Button>

          <Grid container spacing={4} justifyContent="center">
            {[
              { icon: '\u2709', label: 'Email Support', value: 'info@orthodoxmetrics.com' },
            ].map((contact, i) => (
              <Grid key={i} size={{ xs: 12 }}>
                <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>{contact.icon}</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{contact.label}</Typography>
                <Typography variant="caption" color="text.secondary">{contact.value}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Combined Section Header with Tabs - Hidden, replaced by LeftSideMenu */}
      {/* This section is now hidden as the menu has been moved to the left side */}
      {false && (
      <Box
        sx={{
          background: theme.palette.background.default,
          paddingTop: 0,
          paddingBottom: 0,
          display: 'none', // Hide the old menu bar
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10, mb: 4 }}>
          {!isHeaderCollapsed ? (
            <>
              <SectionHeaderBox>
                <TabButton 
                  active={activeSection === 'about-orthodox-christianity'}
                  onClick={(e) => {
                    setActiveSection('about-orthodox-christianity');
                    handleAboutOrthodoxMenuOpen(e);
                  }}
                  onMouseEnter={handleAboutOrthodoxMenuOpen}
                  sx={{ position: 'relative' }}
                >
                  About Orthodox Christianity
                </TabButton>
                <Menu
                  anchorEl={aboutOrthodoxMenuAnchor}
                  open={aboutOrthodoxMenuOpen}
                  onClose={handleAboutOrthodoxMenuClose}
                  MenuListProps={{
                    onMouseLeave: handleAboutOrthodoxMenuClose,
                  }}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 320,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '8px',
                    },
                  }}
                >
                  <MenuItem 
                    onClick={() => handleAboutOrthodoxMenuItemClick('/about/history')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        History of Eastern Orthodox
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        The Ancient times
                      </Typography>
                    </Box>
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem 
                    onClick={() => handleAboutOrthodoxMenuItemClick('/about/church-records/history')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Church Records
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        History of church records importance
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleAboutOrthodoxMenuItemClick('/about/church-records/explore')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Explore Orthodox Church Records
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Explore Orthodox church records using any device that supports Java.
                      </Typography>
                    </Box>
                  </MenuItem>
                </Menu>
                <TabButton 
                  active={activeSection === 'custom-records'}
                  onClick={() => setActiveSection('custom-records')}
                >
                  Custom Records
                </TabButton>
                <TabButton 
                  active={activeSection === 'sample-data'}
                  onClick={(e) => {
                    setActiveSection('sample-data');
                    handleSampleDataMenuOpen(e);
                  }}
                  onMouseEnter={handleSampleDataMenuOpen}
                  sx={{ position: 'relative' }}
                >
                  Sample Data
                </TabButton>
                <Menu
                  anchorEl={sampleDataMenuAnchor}
                  open={sampleDataMenuOpen}
                  onClose={handleSampleDataMenuClose}
                  MenuListProps={{
                    onMouseLeave: handleSampleDataMenuClose,
                  }}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 320,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '8px',
                    },
                  }}
                >
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=baptism')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Baptism Records
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        English, Greek, Russian, Romanian, Georgian sample sets.
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=marriage')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Marriage Records
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        All languages, downloadable JSON examples.
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=funeral')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Funeral Records
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Full multilingual samples + clergy variations.
                      </Typography>
                    </Box>
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=census')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Parish Census Samples
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Population counts, peak growth/decline snapshots.
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=analytics')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Analytics & Graph Examples
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Preview of charts OM will generate—line, bar, heatmap, timelines.
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=templates')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Multi-Language Templates
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Side-by-side record layouts (EN / GR / RU / RO / GE).
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=clergy')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Clergy Tenure Samples
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Demo data for clergy timelines and tenure charts.
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=spousal')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Spousal Survival Dataset
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Widow/widower survival lengths for analytics demo.
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleSampleDataMenuItemClick('/samples?type=trends')}
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(212, 175, 55, 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Parish Growth & Decline Trends
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Synthetic example datasets showing 10–20 years of parish metrics.
                      </Typography>
                    </Box>
                  </MenuItem>
                </Menu>
                <TabButton 
                  active={activeSection === 'powerful-features'}
                  onClick={() => setActiveSection('powerful-features')}
                >
                  Powerful Features
                </TabButton>
                <TabButton 
                  active={activeSection === 'graphical-analysis'}
                  onClick={() => setActiveSection('graphical-analysis')}
                >
                  Graphical Analysis
                </TabButton>
              </SectionHeaderBox>
              {/* Arrow positioned outside the box on the right */}
              <Box
                onClick={handleArrowClick}
                sx={{
                  position: 'absolute',
                  right: { xs: '-40px', sm: '-50px', md: '-60px' },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: 11,
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.7,
                  },
                }}
              >
                <IconArrowLeft 
                  size={32}
                  style={{ 
                    color: '#2E0F46',
                  }} 
                />
              </Box>
            </>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  backgroundColor: '#faf8f4',
                  borderRadius: '12px',
                  border: '2px solid rgba(212, 175, 55, 0.4)',
                  borderBottom: '3px solid rgba(212, 175, 55, 0.5)',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Tabs
                  value={sectionToTabIndex[activeSection]}
                  onChange={handleTabChange}
                  sx={{
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#C8A24B',
                      height: 3,
                    },
                    '& .MuiTab-root': {
                      fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                      fontSize: '18px',
                      fontWeight: 500,
                      color: '#666666',
                      textTransform: 'none',
                      minHeight: 70,
                      '&.Mui-selected': {
                        color: '#2E0F46',
                        fontWeight: 700,
                      },
                      '&:hover': {
                        color: '#2E0F46',
                        backgroundColor: 'rgba(200, 162, 75, 0.1)',
                      },
                    },
                  }}
                >
                  <Tab label="Custom Records" />
                  <Tab label="Sample Data" />
                  <Tab label="Powerful Features" />
                  <Tab label="Graphical Analysis" />
                </Tabs>
              </Box>
              {/* Expand button - right arrow to expand back */}
              <Box
                onClick={handleArrowClick}
                sx={{
                  position: 'absolute',
                  right: { xs: '-40px', sm: '-50px', md: '-60px' },
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: 11,
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.7,
                  },
                }}
              >
                <IconArrowRight 
                  size={32}
                  style={{ 
                    color: '#2E0F46',
                  }} 
                />
              </Box>
            </Box>
          )}
        </Container>
      </Box>
      )}

      {/* FAQ Section - appears at top when header is collapsed */}
      {isHeaderCollapsed && (
        <Box sx={{ mt: 0 }}>
          {renderFAQSection()}
        </Box>
      )}

      {/* Sample Data Section Content */}
      {activeSection === 'sample-data' && (
      <Box
        sx={{
          background: theme.palette.background.default,
          minHeight: '80vh',
          paddingBottom: '5rem',
          paddingTop: '2rem',
          color: '#2f2300',
          fontFamily: 'Inter, "Noto Sans", "Noto Sans Greek", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gallery Header - Left-aligned like About Us */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10, pt: 2, mb: 4 }}>
          <Box
            sx={{
              marginBottom: '30px',
              textAlign: 'left',
              position: 'relative',
              padding: { xs: '12px 16px', sm: '14px 20px', md: '16px 24px' },
              borderRadius: '20px',
              minHeight: { xs: '60px', sm: '70px', md: '80px' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 2, sm: 3, md: 4 },
              width: '100%',
            }}
          >
          </Box>
        </Container>

        {/* 3D Orthodox Records Gallery - Side by Side Layout */}
        <Container maxWidth="lg">
          {activeSacrament && (
            <>
              {/* Language Selection with Flags - Only show when sacrament is selected */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mb: { xs: 3, md: 4 },
                  px: { xs: 2, md: 0 },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    mb: 3,
                    color: '#2E0F46',
                    fontWeight: 600,
                    fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                  }}
                >
                  Select the language
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: { xs: 1.5, sm: 2, md: 2.5 },
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  {([
                    { lang: 'English' as const, flag: 'en_flag.png' },
                    { lang: 'Greek' as const, flag: 'gr_flag.png' },
                    { lang: 'Russian' as const, flag: 'ru_flag.png' },
                    { lang: 'Romanian' as const, flag: 'ro_flag.png' },
                    { lang: 'Georgian' as const, flag: 'ge_flag.png' },
                  ]).map(({ lang, flag }) => {
                    return (
                      <Box
                        key={lang}
                        onClick={() => {
                          if (activeLanguage !== lang) {
                            setIsLanguageChanging(true);
                            setActiveLanguage(lang);
                            setCurrentRotation(0);
                            setSelectedCard(null);
                            setFlippedCards(new Set());
                            setTimeout(() => setIsLanguageChanging(false), 600);
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          padding: { xs: '8px', sm: '10px', md: '12px' },
                          borderRadius: '12px',
                          border: activeLanguage === lang ? '3px solid #2E0F46' : '3px solid transparent',
                          backgroundColor: activeLanguage === lang ? 'rgba(46, 15, 70, 0.1)' : 'transparent',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            borderColor: '#2E0F46',
                            backgroundColor: 'rgba(46, 15, 70, 0.15)',
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={`/images/main/${flag}`}
                          alt={lang}
                          sx={{
                            width: { xs: '60px', sm: '70px', md: '80px' },
                            height: { xs: '40px', sm: '47px', md: '53px' },
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Display cards when a sacrament is selected */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: { xs: 2, sm: 2.5, md: 3 },
                  flexWrap: 'wrap',
                  padding: { xs: '1rem 0', sm: '1.5rem 0', md: '2rem 0' },
                  minHeight: { xs: '400px', sm: '500px', md: '600px' },
                }}
              >
                {items.filter(item => {
                  // Filter items based on selected sacrament
                  const sacramentTitles: Record<string, string[]> = {
                    'Baptism': ['Baptism Records', 'Βάπτιση', 'Крещение', 'Botez', 'ნათლობის ჩანაწერები'],
                    'Marriage': ['Marriage Records', 'Γάμος', 'Брак', 'Căsătorie', 'ქორწინების ჩანაწერები'],
                    'Funeral': ['Funeral Records', 'Κηδεία', 'Похороны', 'Înmormântare', 'დასაფლავების ჩანაწერები'],
                  };
                  return sacramentTitles[activeSacrament]?.includes(item.title);
                }).map((item, i) => (
              <Box
                key={`${activeLanguage}-${i}-${item.title}`}
                onClick={() => {
                  if ((activeLanguage === 'English' && (item.title === 'Baptism Records' || item.title === 'Marriage Records' || item.title === 'Funeral Records')) || (activeLanguage === 'Greek' && (item.title === 'Βάπτιση' || item.title === 'Γάμος' || item.title === 'Κηδεία')) || (activeLanguage === 'Russian' && (item.title === 'Крещение' || item.title === 'Брак' || item.title === 'Похороны')) || (activeLanguage === 'Romanian' && (item.title === 'Botez' || item.title === 'Căsătorie' || item.title === 'Înmormântare')) || (activeLanguage === 'Georgian' && (item.title === 'ნათლობის ჩანაწერები' || item.title === 'ქორწინების ჩანაწერები' || item.title === 'დასაფლავების ჩანაწერები'))) {
                    const cardKey = `${activeLanguage}-${item.title}`;
                    setSelectedCard({ language: activeLanguage, title: item.title });
                    setFlippedCards(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(cardKey)) {
                        newSet.delete(cardKey);
                      } else {
                        newSet.add(cardKey);
                      }
                      return newSet;
                    });
                  }
                }}
                sx={{
                  width: { xs: '100%', sm: '240px', md: '280px' },
                  maxWidth: { xs: '320px', sm: '240px', md: '280px' },
                  height: { xs: '350px', sm: '380px', md: '400px' },
                  perspective: '1000px',
                  transition: isLanguageChanging ? 'opacity 0.6s ease-out, transform 0.6s ease-out' : 'transform 0.3s ease',
                  transform: isLanguageChanging ? 'scale(0.95)' : 'scale(1)',
                  opacity: isLanguageChanging ? 0.7 : 1,
                  cursor: ((activeLanguage === 'English' && (item.title === 'Baptism Records' || item.title === 'Marriage Records' || item.title === 'Funeral Records')) || (activeLanguage === 'Greek' && (item.title === 'Βάπτιση' || item.title === 'Γάμος' || item.title === 'Κηδεία')) || (activeLanguage === 'Russian' && (item.title === 'Крещение' || item.title === 'Брак' || item.title === 'Похороны')) || (activeLanguage === 'Romanian' && (item.title === 'Botez' || item.title === 'Căsătorie' || item.title === 'Înmormântare')) || (activeLanguage === 'Georgian' && (item.title === 'ნათლობის ჩანაწერები' || item.title === 'ქორწინების ჩანაწერები' || item.title === 'დასაფლავების ჩანაწერები'))) ? 'pointer' : 'default',
                  '&:hover': {
                    transform: (((activeLanguage === 'English' && (item.title === 'Baptism Records' || item.title === 'Marriage Records' || item.title === 'Funeral Records')) || (activeLanguage === 'Greek' && (item.title === 'Βάπτιση' || item.title === 'Γάμος' || item.title === 'Κηδεία')) || (activeLanguage === 'Russian' && (item.title === 'Крещение' || item.title === 'Брак' || item.title === 'Похороны')) || (activeLanguage === 'Romanian' && (item.title === 'Botez' || item.title === 'Căsătorie' || item.title === 'Înmormântare')) || (activeLanguage === 'Georgian' && (item.title === 'ნათლობის ჩანაწერები' || item.title === 'ქორწინების ჩანაწერები' || item.title === 'დასაფლავების ჩანაწერები'))) && ((selectedCard?.title === 'Baptism Records' && activeLanguage === 'English') || (selectedCard?.title === 'Marriage Records' && activeLanguage === 'English') || (selectedCard?.title === 'Funeral Records' && activeLanguage === 'English') || (selectedCard?.title === 'Βάπτιση' && activeLanguage === 'Greek') || (selectedCard?.title === 'Γάμος' && activeLanguage === 'Greek') || (selectedCard?.title === 'Κηδεία' && activeLanguage === 'Greek') || (selectedCard?.title === 'Крещение' && activeLanguage === 'Russian') || (selectedCard?.title === 'Брак' && activeLanguage === 'Russian') || (selectedCard?.title === 'Похороны' && activeLanguage === 'Russian') || (selectedCard?.title === 'Botez' && activeLanguage === 'Romanian') || (selectedCard?.title === 'Căsătorie' && activeLanguage === 'Romanian') || (selectedCard?.title === 'Înmormântare' && activeLanguage === 'Romanian') || (selectedCard?.title === 'ნათლობის ჩანაწერები' && activeLanguage === 'Georgian') || (selectedCard?.title === 'ქორწინების ჩანაწერები' && activeLanguage === 'Georgian') || (selectedCard?.title === 'დასაფლავების ჩანაწერები' && activeLanguage === 'Georgian'))) ? 'scale(1)' : 'scale(1.05) translateY(-10px)',
                    zIndex: 10,
                  },
                }}
              >
                {/* Card Container with Flip */}
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.6s',
                    transform: (() => {
                      const cardKey = `${activeLanguage}-${item.title}`;
                      const isThisCardFlipped = flippedCards.has(cardKey);
                      const isClickable = (activeLanguage === 'English' && (item.title === 'Baptism Records' || item.title === 'Marriage Records' || item.title === 'Funeral Records')) || (activeLanguage === 'Greek' && (item.title === 'Βάπτιση' || item.title === 'Γάμος' || item.title === 'Κηδεία')) || (activeLanguage === 'Russian' && (item.title === 'Крещение' || item.title === 'Брак' || item.title === 'Похороны')) || (activeLanguage === 'Romanian' && (item.title === 'Botez' || item.title === 'Căsătorie' || item.title === 'Înmormântare')) || (activeLanguage === 'Georgian' && (item.title === 'ნათლობის ჩანაწერები' || item.title === 'ქორწინების ჩანაწერები' || item.title === 'დასაფლავების ჩანაწერები'));
                      return isClickable && isThisCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
                    })(),
                  }}
                >
                  {/* Front of Card */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      background: 'linear-gradient(180deg, rgba(20,30,55,.92), rgba(12,18,35,.92))',
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,.08)',
                      boxShadow: '0 30px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(175,200,255,.04)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                      {/* Brand Top Bar */}
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: '0 0 auto 0',
                          height: '5px',
                          background: 'linear-gradient(90deg, #C8A24B, #f0d890 60%, #C8A24B)',
                          opacity: 0.9,
                        }}
                      />

                      {/* Badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '14px',
                          right: '14px',
                          width: '38px',
                          height: '38px',
                          borderRadius: '12px',
                          background: 'radial-gradient(120% 120% at 0% 0%, #C8A24B, #f2deaa)',
                          color: '#2f2300',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 900,
                          boxShadow: '0 8px 18px rgba(200,162,75,.35)',
                          '&::before': {
                            content: '"✝"',
                            fontSize: '18px',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      />

                      {/* Flag Banner */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px 8px 14px',
                          borderBottom: '1px solid rgba(255,255,255,.06)',
                          background: 'linear-gradient(180deg, rgba(20,34,60,.45), rgba(10,14,28,.0))',
                        }}
                      >
                        {/* Flag SVG - All English cards show USA flag */}
                        <Box sx={{ width: '64px', height: '42px' }}>
                          {item.flag === 'USA' ? (
                            // USA flag for all English cards
                            <svg width="64" height="42" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
                              <rect width="64" height="42" fill="#B22234" />
                              <g fill="#FFFFFF">
                                <rect x="0" y="0" width="26" height="22" />
                                <rect x="0" y="4" width="64" height="2" />
                                <rect x="0" y="8" width="64" height="2" />
                                <rect x="0" y="12" width="64" height="2" />
                                <rect x="0" y="16" width="64" height="2" />
                                <rect x="0" y="20" width="64" height="2" />
                                <rect x="0" y="24" width="64" height="2" />
                                <rect x="0" y="28" width="64" height="2" />
                                <rect x="0" y="32" width="64" height="2" />
                                <rect x="0" y="36" width="64" height="2" />
                                <rect x="0" y="40" width="64" height="2" />
                              </g>
                              <g fill="#3C3B6E">
                                <circle cx="3" cy="3" r="1" />
                                <circle cx="7" cy="3" r="1" />
                                <circle cx="11" cy="3" r="1" />
                                <circle cx="15" cy="3" r="1" />
                                <circle cx="19" cy="3" r="1" />
                                <circle cx="23" cy="3" r="1" />
                                <circle cx="3" cy="7" r="1" />
                                <circle cx="7" cy="7" r="1" />
                                <circle cx="11" cy="7" r="1" />
                                <circle cx="15" cy="7" r="1" />
                                <circle cx="19" cy="7" r="1" />
                                <circle cx="23" cy="7" r="1" />
                                <circle cx="3" cy="11" r="1" />
                                <circle cx="7" cy="11" r="1" />
                                <circle cx="11" cy="11" r="1" />
                                <circle cx="15" cy="11" r="1" />
                                <circle cx="19" cy="11" r="1" />
                                <circle cx="23" cy="11" r="1" />
                                <circle cx="3" cy="15" r="1" />
                                <circle cx="7" cy="15" r="1" />
                                <circle cx="11" cy="15" r="1" />
                                <circle cx="15" cy="15" r="1" />
                                <circle cx="19" cy="15" r="1" />
                                <circle cx="23" cy="15" r="1" />
                                <circle cx="3" cy="19" r="1" />
                                <circle cx="7" cy="19" r="1" />
                                <circle cx="11" cy="19" r="1" />
                                <circle cx="15" cy="19" r="1" />
                                <circle cx="19" cy="19" r="1" />
                                <circle cx="23" cy="19" r="1" />
                              </g>
                            </svg>
                          ) : item.flag === 'Greece' ? (
                            // Greece flag
                            <svg width="64" height="42" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
                              <rect width="64" height="42" fill="#0D5EAF" />
                              <g fill="#FFFFFF">
                                <rect x="0" y="16" width="64" height="6" />
                                <rect x="0" y="28" width="64" height="6" />
                                <rect x="0" y="4" width="64" height="6" />
                                <rect x="0" y="40" width="64" height="2" />
                              </g>
                              <g>
                                <rect x="0" y="0" width="28" height="24" fill="#0D5EAF" />
                                <rect x="10" y="0" width="6" height="24" fill="#FFFFFF" />
                                <rect x="0" y="9" width="28" height="6" fill="#FFFFFF" />
                              </g>
                            </svg>
                          ) : item.flag === 'Russia' ? (
                            // Russia flag
                            <svg width="64" height="42" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
                              <rect width="64" height="14" y="0" fill="#FFFFFF" />
                              <rect width="64" height="14" y="14" fill="#0D5EAF" />
                              <rect width="64" height="14" y="28" fill="#CE1126" />
                            </svg>
                          ) : item.flag === 'Romania' ? (
                            // Romania flag
                            <svg width="64" height="42" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
                              <rect width="21.33" height="42" x="0" fill="#002B7F" />
                              <rect width="21.33" height="42" x="21.33" fill="#FCD116" />
                              <rect width="21.33" height="42" x="42.66" fill="#CE1126" />
                            </svg>
                          ) : (
                            // Georgia flag
                            <svg width="64" height="42" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
                              <rect width="64" height="42" fill="#FFFFFF" />
                              <rect x="28" y="0" width="8" height="42" fill="#FF0000" />
                              <rect x="0" y="17" width="64" height="8" fill="#FF0000" />
                              <rect x="8" y="8" width="8" height="8" fill="#FF0000" />
                              <rect x="48" y="8" width="8" height="8" fill="#FF0000" />
                              <rect x="8" y="26" width="8" height="8" fill="#FF0000" />
                              <rect x="48" y="26" width="8" height="8" fill="#FF0000" />
                            </svg>
                          )}
                        </Box>

                        {/* Flag Title */}
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography
                            sx={{
                              fontWeight: 900,
                              letterSpacing: '.4px',
                              color: '#eaf2ff',
                              fontSize: '14px',
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '12px',
                              color: '#cbd6ee',
                            }}
                          >
                            {item.title}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Sample Data Snippet */}
                      <Box
                        sx={{
                          background: 'rgba(255,255,255,.045)',
                          border: '1px solid rgba(255,255,255,.07)',
                          margin: '10px 14px 0',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          fontFamily: item.flag === 'USA' ? 'serif' : '"Fira Code","Consolas",monospace',
                          color: '#f3f6ff',
                          fontSize: item.flag === 'USA' ? '14px' : '12px',
                          fontWeight: item.flag === 'USA' ? 600 : 400,
                        }}
                      >
                        {item.sampleData.split('\n').map((line, idx) => {
                          if (item.flag === 'USA') {
                            // For USA card, just show the field label
                            return (
                              <Box key={idx} sx={{ marginBottom: '4px' }}>
                                {line}
                              </Box>
                            );
                          } else {
                            // For other cards, show key-value pairs
                            const parts = line.split(':');
                            return (
                              <Box key={idx}>
                                <span style={{ color: '#9fd0ff' }}>{parts[0]}</span>: <span style={{ color: '#ffe49a' }}>{parts[1]}</span>
                              </Box>
                            );
                          }
                        })}
                      </Box>

                      {/* Title and Fields */}
                      <Box sx={{ padding: '8px 16px 16px' }}>
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: '20px',
                            letterSpacing: '.3px',
                            color: '#e8edff',
                            margin: '12px 0 4px',
                            textShadow: '0 1px 0 rgba(255,255,255,.08)',
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          sx={{
                            margin: '0 0 8px',
                            fontSize: '12px',
                            color: '#b7c2dc',
                          }}
                        >
                          {item.fields}
                        </Typography>
                      </Box>

                      {/* Shine Effect */}
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: '-40% -40%',
                          background: 'linear-gradient(130deg, rgba(255,255,255,0) 42%, rgba(255,255,255,.22) 47%, rgba(255,255,255,0) 52%)',
                          transform: 'translateX(-60%) rotate(10deg)',
                          animation: 'shine 6s ease-in-out infinite',
                          mixBlendMode: 'overlay',
                          pointerEvents: 'none',
                          '@keyframes shine': {
                            '0%': { transform: 'translateX(-60%) rotate(10deg)' },
                            '50%': { transform: 'translateX(60%) rotate(10deg)' },
                            '100%': { transform: 'translateX(160%) rotate(10deg)' },
                          },
                        }}
                      />
                    </Box>
                  {/* Back of Card */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: 'linear-gradient(180deg, rgba(20,30,55,.92), rgba(12,18,35,.92))',
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,.08)',
                      boxShadow: '0 30px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(175,200,255,.04)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '20px',
                    }}
                  >
                    {/* Content Wrapper */}
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                    {/* Back Header */}
                    <Box sx={{ marginBottom: '20px', textAlign: 'center' }}>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: '24px',
                          letterSpacing: '.3px',
                          color: '#e8edff',
                          marginBottom: '8px',
                          textShadow: '0 1px 0 rgba(255,255,255,.08)',
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '14px',
                          color: '#b7c2dc',
                        }}
                      >
                        {activeLanguage === 'Greek' ? 'Λεπτομερείς Πληροφορίες' : activeLanguage === 'Georgian' ? 'დეტალური ინფორმაცია' : 'Detailed Information'}
                      </Typography>
                    </Box>

                    {/* Detailed Data */}
                    {((activeLanguage === 'English' && item.title === 'Baptism Records' && selectedCard?.title === 'Baptism Records') || (activeLanguage === 'Greek' && item.title === 'Βάπτιση' && selectedCard?.title === 'Βάπτιση') || (activeLanguage === 'Georgian' && item.title === 'ნათლობის ჩანაწერები' && selectedCard?.title === 'ნათლობის ჩანაწერები')) ? (
                      (() => {
                        const baptismData = activeLanguage === 'Greek' ? greekBaptismData : activeLanguage === 'Georgian' ? georgianBaptismData : englishBaptismData;
                        const labels = activeLanguage === 'Greek' ? {
                          firstName: 'Όνομα:',
                          lastName: 'Επώνυμο:',
                          dateOfBirth: 'Ημερομηνία Γέννησης:',
                          dateOfBaptism: 'Ημερομηνία Βάπτισης:',
                          birthplace: 'Τόπος Γέννησης:',
                          sponsors: 'Νονοί:',
                          parentsNames: 'Γονείς:',
                          clergyName: 'Κληρικός:',
                        } : activeLanguage === 'Georgian' ? {
                          firstName: 'სახელი:',
                          lastName: 'გვარი:',
                          dateOfBirth: 'დაბადების თარიღი:',
                          dateOfBaptism: 'ნათლობის თარიღი:',
                          birthplace: 'დაბადების ადგილი:',
                          sponsors: 'ნათლიები:',
                          parentsNames: 'მშობლების სახელები:',
                          clergyName: 'მღვდლის სახელი:',
                        } : {
                          firstName: 'First Name:',
                          lastName: 'Last Name:',
                          dateOfBirth: 'Date of Birth:',
                          dateOfBaptism: 'Date of Baptism:',
                          birthplace: 'Birthplace:',
                          sponsors: 'Sponsors:',
                          parentsNames: 'Parents Names:',
                          clergyName: 'Clergy Name:',
                        };
                        return (
                          <Box sx={{ flex: 1, overflowY: 'auto' }}>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.firstName}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {baptismData.firstName}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.lastName}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {baptismData.lastName}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.dateOfBirth}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {baptismData.dateOfBirth}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.dateOfBaptism}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {baptismData.dateOfBaptism}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.birthplace}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {baptismData.birthplace}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.sponsors}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {baptismData.sponsors}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.parentsNames}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {baptismData.parentsNames}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.clergyName}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {baptismData.clergyName}
                              </Box>
                            </Box>
                              </Box>
                            );
                      })()
                    ) : ((activeLanguage === 'English' && item.title === 'Marriage Records' && selectedCard?.title === 'Marriage Records') || (activeLanguage === 'Georgian' && item.title === 'ქორწინების ჩანაწერები' && selectedCard?.title === 'ქორწინების ჩანაწერები')) ? (
                      (() => {
                        const marriageData = activeLanguage === 'Georgian' ? georgianMarriageData : englishMarriageData;
                        const labels = activeLanguage === 'Georgian' ? {
                          dateMarried: 'ქორწინების თარიღი:',
                          groom: 'სიძე:',
                          bride: 'პატარძალი:',
                          groomsParents: 'სიძის მშობლები:',
                          bridesParents: 'პატარძლის მშობლები:',
                          witnesses: 'მოწმეები:',
                          marriageLicense: 'ქორწინების მოწმობა:',
                          clergyName: 'მღვდელი:',
                        } : {
                          dateMarried: 'Date Married:',
                          groom: 'Groom:',
                          bride: 'Bride:',
                          groomsParents: 'Grooms Parents:',
                          bridesParents: 'Brides Parents:',
                          witnesses: 'Witnesses:',
                          marriageLicense: 'Marriage License:',
                          clergyName: 'Clergy Name:',
                        };
                        return (
                          <Box sx={{ flex: 1, overflowY: 'auto' }}>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.dateMarried}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {marriageData.dateMarried}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.groom}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {marriageData.groom}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.bride}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {marriageData.bride}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.groomsParents}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {marriageData.groomsParents}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.bridesParents}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {marriageData.bridesParents}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.witnesses}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {marriageData.witnesses}
                              </Box>
                            </Box>
                            {marriageData.marriageLicense && (
                              <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                                <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.marriageLicense}</Typography>
                                <Box sx={{ 
                                  backgroundColor: theme.palette.background.paper, 
                                  color: '#C8A24B', 
                                  fontWeight: 'bold',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  width: '100%',
                                }}>
                                  {marriageData.marriageLicense}
                                </Box>
                              </Box>
                            )}
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.clergyName}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {marriageData.clergyName}
                              </Box>
                            </Box>
                          </Box>
                        );
                      })()
                    ) : ((activeLanguage === 'English' && item.title === 'Funeral Records' && selectedCard?.title === 'Funeral Records') || (activeLanguage === 'Georgian' && item.title === 'დასაფლავების ჩანაწერები' && selectedCard?.title === 'დასაფლავების ჩანაწერები')) ? (
                      (() => {
                        const funeralData = activeLanguage === 'Georgian' ? georgianFuneralData : englishFuneralData;
                        const labels = activeLanguage === 'Georgian' ? {
                          dateDeceased: 'გარდაცვალების თარიღი:',
                          burialDate: 'დასაფლავების თარიღი:',
                          age: 'ასაკი:',
                          burialLocation: 'დასაფლავების ადგილი:',
                          firstName: 'სახელი:',
                          lastName: 'გვარი:',
                          clergyName: 'მღვდელი:',
                        } : {
                          dateDeceased: 'Date Deceased:',
                          burialDate: 'Burial Date:',
                          age: 'Age:',
                          burialLocation: 'Burial Location:',
                          firstName: 'First Name:',
                          lastName: 'Last Name:',
                          clergyName: 'Clergy Name:',
                        };
                        return (
                          <Box sx={{ flex: 1, overflowY: 'auto' }}>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.dateDeceased}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {funeralData.dateDeceased}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.burialDate}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {funeralData.burialDate}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.age}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {funeralData.age}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.burialLocation}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {funeralData.burialLocation}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.firstName}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {funeralData.firstName}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.lastName}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {funeralData.lastName}
                              </Box>
                            </Box>
                            <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>{labels.clergyName}</Typography>
                              <Box sx={{ 
                                backgroundColor: theme.palette.background.paper, 
                                color: '#C8A24B', 
                                fontWeight: 'bold',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '100%',
                              }}>
                                {funeralData.clergyName}
                              </Box>
                            </Box>
                          </Box>
                        );
                      })()
                    ) : (activeLanguage === 'Greek' && item.title === 'Γάμος' && selectedCard?.title === 'Γάμος') ? (
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Ημερομηνία Γάμου:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekMarriageData.dateMarried}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Γαμπρός:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekMarriageData.groom}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Νύφη:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekMarriageData.bride}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Γονείς Γαμπρού:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekMarriageData.groomsParents}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Γονείς Νύφης:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekMarriageData.bridesParents}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Μάρτυρες:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekMarriageData.witnesses}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Άδεια Γάμου:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekMarriageData.marriageLicense}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Ιερέας:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekMarriageData.clergyName}
                          </Box>
                        </Box>
                      </Box>
                    ) : (activeLanguage === 'Greek' && item.title === 'Κηδεία' && selectedCard?.title === 'Κηδεία') ? (
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Ημερομηνία Θανάτου:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekFuneralData.dateDeceased}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Ημερομηνία Κηδείας:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekFuneralData.burialDate}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Ηλικία:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekFuneralData.age}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Τόπος Κηδείας:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekFuneralData.burialLocation}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Όνομα:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekFuneralData.firstName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Επώνυμο:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekFuneralData.lastName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Ιερέας:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {greekFuneralData.clergyName}
                          </Box>
                        </Box>
                      </Box>
                    ) : (activeLanguage === 'Russian' && item.title === 'Крещение' && selectedCard?.title === 'Крещение') ? (
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Имя:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianBaptismData.firstName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Фамилия:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianBaptismData.lastName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Дата рождения:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianBaptismData.dateOfBirth}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Дата крещения:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianBaptismData.dateOfBaptism}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Место рождения:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianBaptismData.birthplace}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Восприемники:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianBaptismData.sponsors}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Родители:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianBaptismData.parentsNames}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Священник:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianBaptismData.clergyName}
                          </Box>
                        </Box>
                      </Box>
                    ) : (activeLanguage === 'Russian' && item.title === 'Брак' && selectedCard?.title === 'Брак') ? (
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Дата брака:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianMarriageData.dateMarried}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Жених:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianMarriageData.groom}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Невеста:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianMarriageData.bride}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Родители жениха:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianMarriageData.groomsParents}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Родители невесты:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianMarriageData.bridesParents}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Свидетели:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianMarriageData.witnesses}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Свидетельство о браке:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianMarriageData.marriageLicense}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Священник:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianMarriageData.clergyName}
                          </Box>
                        </Box>
                      </Box>
                    ) : (activeLanguage === 'Russian' && item.title === 'Похороны' && selectedCard?.title === 'Похороны') ? (
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Дата смерти:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianFuneralData.dateDeceased}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Дата похорон:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianFuneralData.burialDate}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Возраст:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianFuneralData.age}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Место захоронения:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianFuneralData.burialLocation}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Имя:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianFuneralData.firstName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Фамилия:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianFuneralData.lastName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Священник:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {russianFuneralData.clergyName}
                          </Box>
                        </Box>
                      </Box>
                    ) : (activeLanguage === 'Romanian' && item.title === 'Botez' && selectedCard?.title === 'Botez') ? (
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Prenume:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianBaptismData.firstName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Nume de familie:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianBaptismData.lastName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Data nașterii:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianBaptismData.dateOfBirth}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Data botezului:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianBaptismData.dateOfBaptism}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Locul nașterii:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianBaptismData.birthplace}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Nași:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianBaptismData.sponsors}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Părinți:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianBaptismData.parentsNames}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Preot:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianBaptismData.clergyName}
                          </Box>
                        </Box>
                      </Box>
                    ) : (activeLanguage === 'Romanian' && item.title === 'Căsătorie' && selectedCard?.title === 'Căsătorie') ? (
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Data căsătoriei:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianMarriageData.dateMarried}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Mire:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianMarriageData.groom}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Mireasă:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianMarriageData.bride}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Părinții mirelui:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianMarriageData.groomsParents}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Părinții miresei:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianMarriageData.bridesParents}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Martori:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianMarriageData.witnesses}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Licență de căsătorie:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianMarriageData.marriageLicense}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Preot:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianMarriageData.clergyName}
                          </Box>
                        </Box>
                      </Box>
                    ) : (activeLanguage === 'Romanian' && item.title === 'Înmormântare' && selectedCard?.title === 'Înmormântare') ? (
                      <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Data decesului:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianFuneralData.dateDeceased}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Data înmormântării:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianFuneralData.burialDate}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Vârsta:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianFuneralData.age}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Locul înmormântării:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianFuneralData.burialLocation}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Prenume:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianFuneralData.firstName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Nume de familie:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianFuneralData.lastName}
                          </Box>
                        </Box>
                        <Box sx={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ color: '#f3f6ff', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Preot:</Typography>
                          <Box sx={{ 
                            backgroundColor: theme.palette.background.paper, 
                            color: '#C8A24B', 
                            fontWeight: 'bold',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '100%',
                          }}>
                            {romanianFuneralData.clergyName}
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ flex: 1, overflowY: 'auto', color: '#f3f6ff', fontSize: '14px', lineHeight: '1.6' }}>
                        {item.sampleData.split('\n').map((line, idx) => (
                          <Box key={idx} sx={{ marginBottom: '8px' }}>
                            {line}
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Back Footer */}
                    <Box sx={{ marginTop: 'auto', paddingTop: '15px', textAlign: 'center' }}>
                        <Typography
                          sx={{
                            fontSize: '12px',
                            color: '#b7c2dc',
                          fontStyle: 'italic',
                          }}
                        >
                        {activeLanguage === 'Greek' ? 'Κάντε κλικ για να γυρίσετε πίσω' : 'Click to flip back'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
              ))}
              </Box>
            </>
          )}
        </Container>
      </Box>
      )}

      {/* Custom Records Section */}
      {activeSection === 'custom-records' && (
        <CustomRecordsSection>
          <Container maxWidth="lg" sx={{ pt: 4 }}>
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h6"
              sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666',
                maxWidth: 600, 
                mx: 'auto', 
                lineHeight: 1.6, 
                mb: 4 
              }}
            >
              OrthodoxMetrics supports any record type your parish may need — 
              beyond baptisms, marriages, and funerals. Each community is 
              unique. We're here to help you capture that uniqueness.
            </Typography>
            
            {/* Icon Cards */}
            <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" mb={4}>
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '16px',
                    backgroundColor: '#F5B800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    mx: 'auto',
                  }}
                >
                  <IconFile size={32} color="white" />
                </Box>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}>Documents</Typography>
              </Box>
              
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '16px',
                    backgroundColor: '#6B46C1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    mx: 'auto',
                  }}
                >
                  <IconPlus size={32} color="white" />
                </Box>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}>Add Records</Typography>
              </Box>
              
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '16px',
                    backgroundColor: '#F5B800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    mx: 'auto',
                  }}
                >
                  <IconSettings size={32} color="white" />
                </Box>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}>Customize</Typography>
              </Box>
              
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '16px',
                    backgroundColor: '#F5B800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    mx: 'auto',
                  }}
                >
                  <IconArchive size={32} color="white" />
                </Box>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}>Archives</Typography>
              </Box>
            </Stack>
            
            <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', maxWidth: 700, mx: 'auto' }}>
              From confirmation records to special liturgical events, from community service 
              logs to educational certificates — we adapt to your parish's unique traditions 
              and needs.
            </Typography>
            
            <Typography
              variant="body1"
              fontStyle="italic"
              color="#6B46C1"
              sx={{ mt: 3 }}
            >
              "Every parish tells its own story. Let us help you preserve yours."
            </Typography>
          </Box>
        </Container>
      </CustomRecordsSection>
      )}

      {/* Powerful Features Section */}
      {activeSection === 'powerful-features' && (
      <Box
        sx={{
          backgroundColor: '#fafafa',
          padding: '2rem 0 5rem 0'
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h6"
              color="#666666"
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              Everything you need to digitize, organize, and manage your Orthodox
              parish records with confidence.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, 1fr)',
              },
              gap: 4,
            }}
          >
            {/* Row 1 */}
            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#FFF9E6' }}>
                <IconFile size={32} color="#F5B800" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                OCR Done Right
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Advanced optical character recognition that reads
                handwritten and printed text in multiple Orthodox
                languages with exceptional accuracy.
              </Typography>
            </FeatureCard>

            <FeatureCard>
              <IconShield size={32} color="#6B46C1" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                Enterprise Security
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Bank-level encryption, secure cloud storage, and
                complete data ownership ensure your parish records
                remain private and protected.
              </Typography>
            </FeatureCard>

            <FeatureCard>
              <IconWorld size={32} color="#6B46C1" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                Multilingual Support
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Native support for English, Greek, Russian, and
                Romanian with automatic language detection and
                character recognition.
              </Typography>
            </FeatureCard>

            {/* Row 2 */}
            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#FFF9E6' }}>
                <IconSearch size={32} color="#F5B800" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                Instant Search
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Find any record in seconds with powerful search
                capabilities across names, dates, locations, and custom
                fields.
              </Typography>
            </FeatureCard>

            <FeatureCard>
              <IconUsers size={32} color="#6B46C1" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                Role-Based Access
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Granular permissions system allowing different access
                levels for clergy, staff, and volunteers while maintaining
                security.
              </Typography>
            </FeatureCard>

            <FeatureCard>
              <IconHistory size={32} color="#6B46C1" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                Audit Trail
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
                Complete history of all changes and access to records,
                ensuring accountability and maintaining historical
                integrity.
              </Typography>
            </FeatureCard>
          </Box>
        </Container>
      </Box>
      )}

      {/* How It Works Section */}
      <Box sx={{ backgroundColor: '#fafafa', padding: '5rem 0' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 600,
              color: '#7B4F9E',
              textAlign: 'center',
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            How It Works
          </Typography>
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h6"
              color="#666666"
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              Transform your parish records in five simple steps, from upload to 
              searchable digital archive.
            </Typography>
          </Box>
          
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(5, 1fr)',
              },
              gap: 3,
              justifyContent: 'center',
            }}
          >
            {[
              {
                step: 1,
                title: 'Upload Records',
                description: 'Simply scan or photograph existing records using any device.',
                icon: <IconDownload size={32} color="#F5B800" />
              },
              {
                step: 2,
                title: 'AI Processing',
                description: 'Our advanced OCR technology reads and digitizes text in multiple languages.',
                icon: <IconEye size={32} color="#F5B800" />
              },
              {
                step: 3,
                title: 'Review & Approve',
                description: 'Verify the digitized content and make any necessary corrections.',
                icon: <IconView size={32} color="#F5B800" />
              },
              {
                step: 4,
                title: 'Validate & Store',
                description: 'Confirm accuracy and securely store in your parish database.',
                icon: <IconCheck size={32} color="#F5B800" />
              },
              {
                step: 5,
                title: 'Access & Search',
                description: 'Instantly search and access your digitized records from anywhere.',
                icon: <IconTrash size={32} color="#F5B800" />
              }
            ].map((item, index) => (
              <Box key={index}>
                <Card
                  sx={{
                    padding: '2rem 1rem',
                    borderRadius: '16px',
                    border: '2px solid #F5B800',
                    textAlign: 'center',
                    height: '100%',
                    backgroundColor: 'white',
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      backgroundColor: '#FFF9E6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                    Step {item.step}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#F5B800' }} gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}>
                    {item.description}
                  </Typography>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* FAQ Section - appears at top when header is collapsed */}
      {isHeaderCollapsed && (
        <Box sx={{ mt: 0 }}>
          {renderFAQSection()}
        </Box>
      )}

      {/* Graphical Analysis Section */}
      {activeSection === 'graphical-analysis' && (
      <Box
        sx={{
          backgroundColor: theme.palette.background.default,
          padding: '2rem 0 5rem 0'
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h6"
              sx={{ 
                maxWidth: 600, 
                mx: 'auto', 
                lineHeight: 1.6, 
                mb: 4,
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666'
              }}
            >
              Visualize your parish data with interactive charts, graphs, and analytics. 
              Gain insights into trends, patterns, and statistics across your records.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
              },
              gap: 4,
            }}
          >
            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#E3F2FD' }}>
                <IconSparkles size={32} color="#6B46C1" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                Interactive Charts
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Create dynamic visualizations of your parish records with customizable 
                charts and graphs that update in real-time.
              </Typography>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#FFF9E6' }}>
                <IconDatabase size={32} color="#F5B800" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                Data Analytics
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Analyze trends over time, compare years, and generate comprehensive 
                reports on your parish's historical data.
              </Typography>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#E8F5E9' }}>
                <IconHistory size={32} color="#4CAF50" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                Historical Trends
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Track changes and patterns across decades of parish records, 
                identifying meaningful trends in your community.
              </Typography>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#FCE4EC' }}>
                <IconEye size={32} color="#E91E63" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }} gutterBottom>
                Visual Reports
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666', lineHeight: 1.6 }}>
                Generate beautiful, exportable reports with charts and visualizations 
                perfect for presentations and documentation.
              </Typography>
            </FeatureCard>
          </Box>
        </Container>
      </Box>
      )}

      {/* FAQ Section - original position when header is not collapsed */}
      {!isHeaderCollapsed && renderFAQSection()}

      {/* Shared Call-to-Action + Footer */}
      <C2a />
      <SharedFooter />
      <ScrollToTop />
      
      {/* Quick Contact Sidebar */}
      <QuickContactSidebar />
    </Box>
  );
};

export default HomePage;
