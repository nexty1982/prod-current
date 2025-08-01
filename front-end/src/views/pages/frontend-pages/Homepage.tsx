import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Stack,
  Paper,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  keyframes,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  IconEye,
  IconEyeOff,
  IconShield,
  IconWorld,
  IconDatabase,
  IconArrowRight,
  IconSparkles,
  IconFile,
  IconPlus,
  IconSettings,
  IconArchive,
  IconDownload,
  IconEye as IconView,
  IconCheck,
  IconTrash,
  IconSearch,
  IconUsers,
  IconHistory,
  IconChevronDown,
} from '@tabler/icons-react';
import { styled } from '@mui/material/styles';

// Orthodox Cross component
const OrthodoxCross = styled(Box)({
  position: 'relative',
  width: '80px',
  height: '120px',
  filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))',
  
  '& .cross-bar': {
    background: '#FFD700',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  
  '& .vertical-beam': {
    width: '12px',
    height: '120px',
    top: '0',
  },
  
  '& .top-bar': {
    width: '30px',
    height: '8px',
    top: '20px',
  },
  
  '& .main-bar': {
    width: '70px',
    height: '10px',
    top: '45px',
  },
  
  '& .bottom-bar': {
    width: '50px',
    height: '8px',
    top: '80px',
    transform: 'translateX(-50%) rotate(-20deg)',
  },
});

// Animation for text rotation
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

// Styled components for the Orthodox Metrics design
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#ffffff',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  borderBottom: '1px solid #e0e0e0',
}));

const StyledToolbar = styled(Toolbar)({
  justifyContent: 'space-between',
  padding: '0 2rem',
});

const LogoText = styled(Typography)({
  fontWeight: 700,
  fontSize: '1.5rem',
  color: '#1a1a1a',
  fontFamily: '"Inter", sans-serif',
});

const NavButton = styled(Button)({
  color: '#666666',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '1rem',
  padding: '0.5rem 1rem',
  '&:hover': {
    backgroundColor: 'transparent',
    color: '#F5B800',
  },
});

const GetStartedButton = styled(Button)({
  backgroundColor: '#F5B800',
  color: '#1a1a1a',
  textTransform: 'none',
  fontWeight: 600,
  padding: '0.75rem 2rem',
  borderRadius: '8px',
  '&:hover': {
    backgroundColor: '#E6A600',
  },
});

// Orthodox Banner Section with Light Ray Animation
const BannerSection = styled(Box)({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '3rem 0',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
});

// Light Ray Animation Components
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

const BannerContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2rem',
  flexWrap: 'wrap',
  marginBottom: '1.5rem',
  position: 'relative',
  zIndex: 2,
});

const BannerText = styled(Typography)({
  fontSize: '1.75rem',
  fontWeight: 600,
  textAlign: 'center',
  lineHeight: 1.3,
  minWidth: '250px',
  height: '60px',
  position: 'relative',
});

const RotatingText = styled(Box)({
  position: 'absolute',
  width: '100%',
  opacity: 0,
  transition: 'opacity 1s ease-in-out',
  
  '&.active': {
    opacity: 1,
  },
});

const TaglineText = styled(Typography)({
  textAlign: 'center',
  fontSize: '1.25rem',
  fontStyle: 'italic',
  position: 'relative',
  height: '30px',
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

const HeroSection = styled(Box)({
  backgroundColor: '#ffffff',
  padding: '4rem 0',
  minHeight: '80vh',
  display: 'flex',
  alignItems: 'center',
});

const LoginCard = styled(Card)({
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  border: '1px solid #f0f0f0',
});

const MainHeading = styled(Typography)({
  fontSize: '3.5rem',
  fontWeight: 700,
  color: '#1a1a1a',
  lineHeight: 1.2,
  marginBottom: '1.5rem',
  fontFamily: '"Inter", sans-serif',
});

const SubHeading = styled(Typography)({
  fontSize: '1.25rem',
  color: '#666666',
  lineHeight: 1.6,
  marginBottom: '2rem',
});

const CTAButton = styled(Button)({
  backgroundColor: '#F5B800',
  color: '#1a1a1a',
  textTransform: 'none',
  fontWeight: 600,
  padding: '1rem 2.5rem',
  borderRadius: '12px',
  fontSize: '1.1rem',
  marginRight: '1rem',
  '&:hover': {
    backgroundColor: '#E6A600',
  },
});

const SecondaryButton = styled(Button)({
  color: '#1a1a1a',
  textTransform: 'none',
  fontWeight: 600,
  padding: '1rem 2.5rem',
  border: '2px solid #e0e0e0',
  borderRadius: '12px',
  fontSize: '1.1rem',
  '&:hover': {
    borderColor: '#F5B800',
    backgroundColor: 'transparent',
  },
});

const FeatureCard = styled(Card)({
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  border: '1px solid #f0f0f0',
  height: '100%',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  },
});

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

const SectionTitle = styled(Typography)({
  fontSize: '2.5rem',
  fontWeight: 700,
  color: '#1a1a1a',
  textAlign: 'center',
  marginBottom: '3rem',
  fontFamily: '"Inter", sans-serif',
});

// Sneak Peek Section
const DemoSection = styled(Box)({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '5rem 0',
  color: 'white',
});

const DemoTitle = styled(Typography)({
  fontSize: '2.5rem',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: '1rem',
  fontFamily: '"Inter", sans-serif',
});

const DemoSubtitle = styled(Typography)({
  fontSize: '1.1rem',
  textAlign: 'center',
  marginBottom: '3rem',
  opacity: 0.9,
});

const DemoCard = styled(Card)({
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
});

const DemoHeader = styled(Box)({
  backgroundColor: '#ffffff',
  padding: '1.5rem',
  textAlign: 'center',
  borderBottom: '1px solid #e0e0e0',
});

const TabButtons = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  gap: '0.5rem',
  marginBottom: '1.5rem',
});

const TabButton = styled(Chip)(({ active }: { active?: boolean }) => ({
  backgroundColor: active ? '#F5B800' : '#f0f0f0',
  color: active ? '#1a1a1a' : '#666666',
  fontWeight: 600,
  padding: '0.5rem 1rem',
  '&:hover': {
    backgroundColor: active ? '#E6A600' : '#e0e0e0',
  },
}));

const CustomRecordsSection = styled(Box)({
  backgroundColor: '#ffffff',
  padding: '5rem 0',
});

const HomePage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(0);
  const [activeTab, setActiveTab] = useState('Baptism');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [showOriginalImages, setShowOriginalImages] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const languages = [
    { code: 'en', title: 'Orthodox\nMetrics', tagline: 'Recording the Saints Amongst Us!' },
    { code: 'el', title: 'Ορθόδοξες\nΜετρήσεις', tagline: 'Καταγράφοντας τοὺς Ἁγίους ἀνάμεσά μας!' },
    { code: 'ru', title: 'Православные\nМетрики', tagline: 'Записывая святых среди нас!' },
    { code: 'ro', title: 'Metrici\nOrtodoxe', tagline: 'Înregistrăm sfinții din mijlocul nostru!' },
    { code: 'ka', title: 'მართმადიდებლური\nმეტრიკა', tagline: 'ვაკონწილებთ ჩვენ შორის წმინდანებს!' },
  ];

  // Sample records data for all three types
  const baptismRecords = [
    { firstName: 'Maria', lastName: 'Dimitriou', birthDate: 'March 15, 1980', baptismDate: 'April 22, 1980', baptismPlace: 'Athens, Greece', clergy: 'Fr. Nicholas Ioannou' },
    { firstName: 'John', lastName: 'Konstantinos', birthDate: 'July 8, 1982', baptismDate: 'August 16, 1982', baptismPlace: 'Thessaloniki, Greece', clergy: 'Fr. Peter Angelos' },
    { firstName: 'Elena', lastName: 'Papadakis', birthDate: 'December 3, 1979', baptismDate: 'January 9, 1980', baptismPlace: 'Patras, Greece', clergy: 'Fr. Ilias Stavridis' },
    { firstName: 'Alexander', lastName: 'Petrov', birthDate: 'June 12, 1981', baptismDate: 'July 4, 1981', baptismPlace: 'Moscow, Russia', clergy: 'Fr. Sergei Volkov' },
    { firstName: 'Sophia', lastName: 'Georgios', birthDate: 'September 21, 1984', baptismDate: 'October 18, 1984', baptismPlace: 'Patros, Greece', clergy: 'Fr. Michael Demos' },
    { firstName: 'Dimitri', lastName: 'Alexandrou', birthDate: 'February 14, 1986', baptismDate: 'March 25, 1986', baptismPlace: 'Cyprus', clergy: 'Fr. Andreas Christos' },
    { firstName: 'Anna', lastName: 'Radu', birthDate: 'May 30, 1984', baptismDate: 'June 24, 1984', baptismPlace: 'Cluj, Romania', clergy: 'Fr. Stefan Vasile' },
    { firstName: 'Theodoros', lastName: 'Nikolaou', birthDate: 'November 11, 1983', baptismDate: 'December 8, 1983', baptismPlace: 'Crete, Greece', clergy: 'Fr. Emmanuel Manos' },
    { firstName: 'Ekaterina', lastName: 'Fedorov', birthDate: 'April 7, 1985', baptismDate: 'May 1, 1985', baptismPlace: 'St. Petersburg, Russia', clergy: 'Fr. Maxim Petrov' },
    { firstName: 'Georgios', lastName: 'Vassiliou', birthDate: 'October 25, 1986', baptismDate: 'November 21, 1986', baptismPlace: 'Nicosia, Cyprus', clergy: 'Fr. John Papadakis' },
  ];

  const marriageRecords = [
    { groomFirst: 'Alexander', groomLast: 'Dimitriou', brideFirst: 'Maria', brideLast: 'Konstantinos', marriageDate: 'June 15, 2018', clergy: 'Fr. Nicholas Stavros' },
    { groomFirst: 'Petros', groomLast: 'Angelis', brideFirst: 'Elena', brideLast: 'Popescu', marriageDate: 'September 22, 2019', clergy: 'Fr. Ioan Marianescu' },
    { groomFirst: 'Mikhail', groomLast: 'Petrov', brideFirst: 'Sophia', brideLast: 'Georgios', marriageDate: 'May 8, 2020', clergy: 'Fr. Sergei Volkov' },
    { groomFirst: 'Dimitri', groomLast: 'Alexandrou', brideFirst: 'Anna', brideLast: 'Radu', marriageDate: 'August 14, 2021', clergy: 'Fr. Andreas Christou' },
    { groomFirst: 'Theodoros', groomLast: 'Nikolaou', brideFirst: 'Ekaterina', brideLast: 'Fedorov', marriageDate: 'October 30, 2022', clergy: 'Fr. Emmanuel Manos' },
    { groomFirst: 'Georgios', groomLast: 'Vasquez', brideFirst: 'Christina', brideLast: 'Kostas', marriageDate: 'April 17, 2021', clergy: 'Fr. John Papadakis' },
    { groomFirst: 'Stefan', groomLast: 'Vasile', brideFirst: 'Mirela', brideLast: 'Ionescu', marriageDate: 'July 3, 2020', clergy: 'Fr. Stefan Vasile' },
    { groomFirst: 'Vladimir', groomLast: 'Petrov', brideFirst: 'Anastasia', brideLast: 'Volkov', marriageDate: 'December 12, 2019', clergy: 'Fr. Vladimir Petrov' },
    { groomFirst: 'Michael', groomLast: 'Kostas', brideFirst: 'Irene', brideLast: 'Manos', marriageDate: 'February 28, 2023', clergy: 'Fr. Michael Kostas' },
    { groomFirst: 'Andreas', groomLast: 'Christou', brideFirst: 'Despina', brideLast: 'Papadakis', marriageDate: 'November 19, 2022', clergy: 'Fr. Andreas Christou' },
  ];

  const funeralRecords = [
    { firstName: 'Constantine', lastName: 'Dimitriou', dateOfDeath: 'March 20, 2023', funeralDate: 'March 23, 2023', age: 89, burialLocation: 'St. Nicholas Cemetery', clergy: 'Fr. Nicholas Stavros' },
    { firstName: 'Vasiliki', lastName: 'Konstantinos', dateOfDeath: 'July 15, 2023', funeralDate: 'July 18, 2023', age: 76, burialLocation: 'Holy Trinity Cemetery', clergy: 'Fr. Peter Angelis' },
    { firstName: 'Dimitri', lastName: 'Popescu', dateOfDeath: 'November 8, 2023', funeralDate: 'November 11, 2023', age: 82, burialLocation: 'Orthodox Memorial Gardens', clergy: 'Fr. Ioan Marianescu' },
    { firstName: 'Anastasia', lastName: 'Petrov', dateOfDeath: 'February 2, 2023', funeralDate: 'February 5, 2023', age: 94, burialLocation: 'St. Sergius Cemetery', clergy: 'Fr. Sergei Volkov' },
    { firstName: 'Nikolaos', lastName: 'Georgios', dateOfDeath: 'June 30, 2023', funeralDate: 'July 3, 2023', age: 71, burialLocation: 'Holy Cross Cemetery', clergy: 'Fr. Michael Kostas' },
    { firstName: 'Fotini', lastName: 'Alexandrou', dateOfDeath: 'September 14, 2023', funeralDate: 'September 17, 2023', age: 88, burialLocation: 'St. Andreas Cemetery', clergy: 'Fr. Andreas Christou' },
    { firstName: 'Ioanna', lastName: 'Radu', dateOfDeath: 'December 25, 2023', funeralDate: 'December 28, 2023', age: 79, burialLocation: 'Memorial Park Orthodox', clergy: 'Fr. Stefan Vasile' },
    { firstName: 'Panagiotis', lastName: 'Nikolaou', dateOfDeath: 'April 12, 2023', funeralDate: 'April 15, 2023', age: 85, burialLocation: 'St. Emmanuel Cemetery', clergy: 'Fr. Emmanuel Manos' },
    { firstName: 'Paraskevi', lastName: 'Fedorov', dateOfDeath: 'August 7, 2023', funeralDate: 'August 10, 2023', age: 73, burialLocation: 'St. Vladimir Cemetery', clergy: 'Fr. Vladimir Petrov' },
    { firstName: 'Stephanos', lastName: 'Vasquez', dateOfDeath: 'October 1, 2023', funeralDate: 'October 4, 2023', age: 91, burialLocation: 'St. John Cemetery', clergy: 'Fr. John Papadakis' },
  ];

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

  const getRecordData = () => {
    switch (activeTab) {
      case 'Marriage':
        return marriageRecords;
      case 'Funeral':
        return funeralRecords;
      default:
        return baptismRecords;
    }
  };

  const getTableHeaders = () => {
    switch (activeTab) {
      case 'Marriage':
        return ['GROOM FIRST', 'GROOM LAST', 'BRIDE FIRST', 'BRIDE LAST', 'MARRIAGE DATE', 'CLERGY'];
      case 'Funeral':
        return ['FIRST NAME', 'LAST NAME', 'DATE OF DEATH', 'FUNERAL DATE', 'AGE', 'BURIAL LOCATION', 'CLERGY'];
      default:
        return ['FIRST NAME', 'LAST NAME', 'BIRTH DATE', 'BAPTISM DATE', 'BAPTISM PLACE', 'CLERGY'];
    }
  };

  const getTableTitle = () => {
    switch (activeTab) {
      case 'Marriage':
        return 'Parish Marriage Records - St. Nicholas Cathedral';
      case 'Funeral':
        return 'Parish Funeral Records - St. Nicholas Cathedral';
      default:
        return 'Parish Baptismal Records - St. Nicholas Cathedral';
    }
  };

  const getTotalRecords = () => {
    switch (activeTab) {
      case 'Marriage':
        return '10 of 542 total records';
      case 'Funeral':
        return '10 of 318 total records';
      default:
        return '10 of 1,247 total records';
    }
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const startProcessing = () => {
    setIsProcessing(true);
    setShowOriginalImages(false);
    setProcessingComplete(false);
    
    // Simulate processing time
    setTimeout(() => {
      setIsProcessing(false);
      setProcessingComplete(true);
    }, 6000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLanguage((prev) => (prev + 1) % languages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

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
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <Box>


      {/* Orthodox Multilingual Banner */}
      <BannerSection>
        <GlobalStyles />
        <LightRay>
          <RayLayer1 />
          <RayLayer2 />
          <RayLayer3 />
          <RayLayer4 />
        </LightRay>
        <Container maxWidth="lg">
          <BannerContainer>
            <Typography
              variant="h4"
              fontWeight={600}
              textAlign="right"
              lineHeight={1.3}
            >
              Orthodox<br />Metrics
            </Typography>
            
            <OrthodoxCross>
              <Box className="cross-bar vertical-beam" />
              <Box className="cross-bar top-bar" />
              <Box className="cross-bar main-bar" />
              <Box className="cross-bar bottom-bar" />
            </OrthodoxCross>
            
            <BannerText>
              {languages.map((lang, index) => (
                <RotatingText
                  key={lang.code}
                  className={index === currentLanguage ? 'active' : ''}
                  dangerouslySetInnerHTML={{ __html: lang.title }}
                />
              ))}
            </BannerText>
          </BannerContainer>
          
          <TaglineText>
            {languages.map((lang, index) => (
              <RotatingText
                key={`tagline-${lang.code}`}
                className={index === currentLanguage ? 'active' : ''}
              >
                {lang.tagline}
              </RotatingText>
            ))}
          </TaglineText>
        </Container>
      </BannerSection>

      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                lg: '5fr 7fr',
              },
              gap: 6,
              alignItems: 'center',
            }}
          >
            {/* Left Side - Login Form */}
            <Box>
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
                  <Typography variant="body2" color="#666666">
                    Don't have access?{' '}
                    <Button variant="text" sx={{ textTransform: 'none', color: '#F5B800' }}>
                      Contact Administrator
                    </Button>
                  </Typography>
                </Box>
              </LoginCard>
            </Box>

            {/* Right Side - Main Content */}
            <Box sx={{ pl: { lg: 4 } }}>
              <MainHeading>
                Digitizing Orthodox Records.
                <br />
                Empowering the Church.
              </MainHeading>
              
              <SubHeading>
                Transform your parish record-keeping with our comprehensive digital platform. 
                Securely digitize baptisms, marriages, funerals, and more while preserving 
                Orthodox traditions for future generations.
              </SubHeading>
              
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <CTAButton endIcon={<IconArrowRight />}>
                  Start Free Trial
                </CTAButton>
                <SecondaryButton>
                  Schedule Demo
                </SecondaryButton>
              </Stack>
            </Box>
          </Box>
        </Container>
      </HeroSection>

      {/* Sneak Peek Section */}
      <DemoSection>
        <Container maxWidth="lg">
          <DemoTitle>Sneak Peek</DemoTitle>
          <DemoSubtitle>
            Experience how OrthodoxMetrics processes and organizes your parish records from scanned historical documents.
            Click "Process Records" to see our AI technology extract data from authentic Orthodox parish records dating back to the 1970s and 1980s.
          </DemoSubtitle>
          
          {showOriginalImages && !isProcessing && !processingComplete && (
            <DemoCard>
              <DemoHeader>
                <Typography variant="h6" color="#6B46C1" fontWeight={600}>
                  Historical Parish Records - Ready for Processing
                </Typography>
                <Button
                  variant="contained"
                  onClick={startProcessing}
                  startIcon={<IconSparkles />}
                  sx={{
                    backgroundColor: '#F5B800',
                    color: '#1a1a1a',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: '#E6A600',
                    },
                  }}
                >
                  Process Records
                </Button>
              </DemoHeader>
              
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                gap: 3,
                mt: 3 
              }}>
                {/* Marriage Record Image */}
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: '#fafafa',
                  border: '2px solid #F5B800',
                  borderRadius: '12px'
                }}>
                  <Typography variant="subtitle1" fontWeight={600} color="#6B46C1" gutterBottom>
                    Marriage Records - 1971
                  </Typography>
                  <Box sx={{
                    width: '100%',
                    height: '300px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    mb: 2,
                    border: '2px solid #d4af37',
                    position: 'relative',
                    backgroundColor: '#f8f8f8',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255,215,0,0.1) 50%, transparent 70%)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }
                  }}>
                    <img 
                      src="/images/marriages.png"
                      alt="Historical Marriage Register from 1971 with Orthodox formatting"
                      style={{
                        width: '100%',
                        height: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="#666">
                    Historical marriage register with decorative religious icons, bilingual entries (English/Cyrillic), and detailed witness information
                  </Typography>
                </Paper>

                {/* Death Record Image */}
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: '#fafafa',
                  border: '2px solid #F5B800',
                  borderRadius: '12px'
                }}>
                  <Typography variant="subtitle1" fontWeight={600} color="#6B46C1" gutterBottom>
                    Death Records - 1988
                  </Typography>
                  <Box sx={{
                    width: '100%',
                    height: '300px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    mb: 2,
                    border: '2px solid #d4af37',
                    position: 'relative',
                    backgroundColor: '#f8f8f8',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255,215,0,0.1) 50%, transparent 70%)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }
                  }}>
                    <img 
                      src="/images/funerals.png"
                      alt="Historical Death Register from 1988 with Orthodox formatting"
                      style={{
                        width: '100%',
                        height: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="#666">
                    Two-page death register with ornate religious symbols, bilingual headers, and detailed burial information including cemetery plots
                  </Typography>
                </Paper>

                {/* Baptism Record Image */}
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: '#fafafa',
                  border: '2px solid #F5B800',
                  borderRadius: '12px'
                }}>
                  <Typography variant="subtitle1" fontWeight={600} color="#6B46C1" gutterBottom>
                    Baptism Records - 1972-1973
                  </Typography>
                  <Box sx={{
                    width: '100%',
                    height: '300px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    mb: 2,
                    border: '2px solid #d4af37',
                    position: 'relative',
                    backgroundColor: '#f8f8f8',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255,215,0,0.1) 50%, transparent 70%)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }
                  }}>
                    <img 
                      src="/images/baptisms.png"
                      alt="Historical Birth/Baptism Register from 1972-1973"
                      style={{
                        width: '100%',
                        height: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="#666">
                    Birth register with blue ink handwritten entries, bilingual column headers, and detailed genealogical information including sponsors
                  </Typography>
                </Paper>
              </Box>
            </DemoCard>
          )}

          {isProcessing && (
            <DemoCard>
              <DemoHeader>
                <Typography variant="h6" color="#6B46C1" fontWeight={600}>
                  AI Processing Engine
                </Typography>
              </DemoHeader>
              
              {/* VS Code Style Terminal */}
              <Box sx={{
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                p: 3,
                mt: 2,
                fontFamily: '"Fira Code", "Consolas", monospace',
                fontSize: '14px',
                color: '#d4d4d4'
              }}>
                {/* Terminal Header */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  borderBottom: '1px solid #333',
                  pb: 1 
                }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f56' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#27ca3f' }} />
                  </Box>
                  <Typography sx={{ ml: 2, color: '#888', fontSize: '12px' }}>
                    OrthodoxMetrics OCR Terminal
                  </Typography>
                </Box>

                {/* Processing Output */}
                <Box sx={{ '& > div': { mb: 1 } }}>
                  <Box sx={{ color: '#569cd6' }}>
                    <Box component="span" sx={{ color: '#4fc1ff' }}>$</Box> orthodox-metrics process --batch
                  </Box>
                  <Box sx={{ color: '#d7ba7d', display: 'flex', alignItems: 'center', gap: 1 }}>
                    📄 Recognizing document IMG_2024_10_22...
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      backgroundColor: '#d7ba7d', 
                      animation: 'blink 1s infinite'
                    }} />
                  </Box>
                  <Box sx={{ color: '#4ec9b0' }}>
                    🔍 Matching format: MARRIAGE RECORD - 1971
                  </Box>
                  <Box sx={{ color: '#9cdcfe' }}>
                    ✅ Extracted: Groom - George Oliver, Bride - Anna Max, Witnesses: Mr. & Mrs. George Grabania
                  </Box>
                  <Box sx={{ color: '#ce9178' }}>
                    🌐 Language detected: English, Church Slavonic headers identified
                  </Box>
                  <Box sx={{ color: '#d7ba7d' }}>
                    📄 Recognizing document IMG_2024_10_23...
                  </Box>
                  <Box sx={{ color: '#4ec9b0' }}>
                    🔍 Matching format: DEATH RECORD - 1988
                  </Box>
                  <Box sx={{ color: '#9cdcfe' }}>
                    ✅ Extracted: John Macinko, Anna Karel, John Suseck Sr., David James Riegler, Carolyn E. Frenther...
                  </Box>
                  <Box sx={{ color: '#ce9178' }}>
                    🌐 Language detected: English, Cyrillic headers, burial plot details
                  </Box>
                  <Box sx={{ color: '#d7ba7d' }}>
                    📄 Recognizing document IMG_2024_10_24...
                  </Box>
                  <Box sx={{ color: '#4ec9b0' }}>
                    🔍 Matching format: BAPTISM RECORD - 1972-1973
                  </Box>
                  <Box sx={{ color: '#9cdcfe' }}>
                    ✅ Extracted: Tamara Ann Stibitz, James Antony Allegretto, Brian Christopher Verrilli, Jeffrey Nicholas Gerhard
                  </Box>
                  <Box sx={{ color: '#ce9178' }}>
                    🎯 Processing complete: 12 death records, 3 marriage records, 11 baptism records extracted
                  </Box>
                  <Box sx={{ color: '#569cd6' }}>
                    📊 Accuracy: 98.7% | Ready for review and certificate generation
                  </Box>
                </Box>
              </Box>
            </DemoCard>
          )}

          {processingComplete && (
            <DemoCard>
              <DemoHeader>
                <TabButtons>
                  {['Baptism', 'Marriage', 'Funeral'].map((tab) => (
                    <TabButton
                      key={tab}
                      label={tab}
                      onClick={() => setActiveTab(tab)}
                      active={activeTab === tab}
                      clickable
                    />
                  ))}
                </TabButtons>
                
                <Typography variant="h6" color="#6B46C1" fontWeight={600}>
                  {getTableTitle()}
                </Typography>
              </DemoHeader>
              
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#6B46C1' }}>
                      {getTableHeaders().map((header, index) => (
                        <TableCell
                          key={index}
                          sx={{ backgroundColor: '#6B46C1', color: 'white', fontWeight: 600 }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeTab === 'Baptism' && baptismRecords.map((record, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{record.firstName}</TableCell>
                        <TableCell>{record.lastName}</TableCell>
                        <TableCell>{record.birthDate}</TableCell>
                        <TableCell>{record.baptismDate}</TableCell>
                        <TableCell>{record.baptismPlace}</TableCell>
                        <TableCell>{record.clergy}</TableCell>
                      </TableRow>
                    ))}
                    {activeTab === 'Marriage' && marriageRecords.map((record, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{record.groomFirst}</TableCell>
                        <TableCell>{record.groomLast}</TableCell>
                        <TableCell>{record.brideFirst}</TableCell>
                        <TableCell>{record.brideLast}</TableCell>
                        <TableCell>{record.marriageDate}</TableCell>
                        <TableCell>{record.clergy}</TableCell>
                      </TableRow>
                    ))}
                    {activeTab === 'Funeral' && funeralRecords.map((record, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{record.firstName}</TableCell>
                        <TableCell>{record.lastName}</TableCell>
                        <TableCell>{record.dateOfDeath}</TableCell>
                        <TableCell>{record.funeralDate}</TableCell>
                        <TableCell>{record.age}</TableCell>
                        <TableCell>{record.burialLocation}</TableCell>
                        <TableCell>{record.clergy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ backgroundColor: '#FFF9E6', padding: '1rem', textAlign: 'center' }}>
                <Typography variant="body2" color="#8B5A00">
                  Showing {getTotalRecords()}
                  <Button
                    variant="text"
                    sx={{ ml: 2, color: '#F5B800', textTransform: 'none' }}
                  >
                    + Live Data
                  </Button>
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowOriginalImages(true);
                    setIsProcessing(false);
                    setProcessingComplete(false);
                  }}
                  sx={{
                    mt: 2,
                    borderColor: '#6B46C1',
                    color: '#6B46C1',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#5A2FC2',
                      backgroundColor: 'rgba(107, 70, 193, 0.04)',
                    },
                  }}
                >
                  ↻ Restart Demo
                </Button>
              </Box>
            </DemoCard>
          )}
        </Container>
      </DemoSection>

      {/* Why Orthodox Metrics Section */}
      <Box sx={{ backgroundColor: '#fafafa', padding: '5rem 0' }}>
        <Container maxWidth="lg">
          <SectionTitle>
            Why Orthodox Metrics?
          </SectionTitle>
          
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
            {/* Digitize Records */}
            <FeatureCard>
              <FeatureIcon>
                <IconDatabase size={32} color="#F5B800" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                Digitize Records
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
                Convert physical church records into searchable digital archives. 
                Our OCR technology automatically extracts data from historical documents 
                while maintaining accuracy and Orthodox formatting standards.
              </Typography>
            </FeatureCard>

            {/* Multilingual Interface */}
            <FeatureCard>
              <FeatureIcon>
                <IconWorld size={32} color="#F5B800" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                Multilingual Interface
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
                Support for Greek, English, Romanian, Russian, and other Orthodox languages. 
                Switch seamlessly between languages while maintaining proper liturgical 
                terminology and cultural context.
              </Typography>
            </FeatureCard>

            {/* Secure & Private */}
            <FeatureCard>
              <FeatureIcon>
                <IconShield size={32} color="#F5B800" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                Secure & Private
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
                Enterprise-grade security with encrypted data storage and role-based access. 
                Your parish data remains private and accessible only to authorized clergy 
                and administrators.
              </Typography>
            </FeatureCard>
          </Box>
        </Container>
      </Box>

      {/* Custom Records Section */}
      <CustomRecordsSection>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h3"
              fontWeight={700}
              color="#6B46C1"
              gutterBottom
              fontFamily='"Inter", sans-serif'
            >
              Custom Records — Built Around Your Parish
            </Typography>
            <Typography
              variant="h6"
              color="#666666"
              sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6, mb: 4 }}
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
                <Typography variant="body2" color="#666666">Documents</Typography>
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
                <Typography variant="body2" color="#666666">Add Records</Typography>
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
                <Typography variant="body2" color="#666666">Customize</Typography>
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
                <Typography variant="body2" color="#666666">Archives</Typography>
              </Box>
            </Stack>
            
            <Typography variant="body1" color="#666666" sx={{ maxWidth: 700, mx: 'auto' }}>
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

      {/* How It Works Section */}
      <Box sx={{ backgroundColor: '#fafafa', padding: '5rem 0' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h3"
              fontWeight={700}
              color="#6B46C1"
              gutterBottom
              fontFamily='"Inter", sans-serif'
            >
              How It Works
            </Typography>
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
                  <Typography variant="h6" fontWeight={600} color="#1a1a1a" gutterBottom>
                    Step {item.step}
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="#F5B800" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="#666666">
                    {item.description}
                  </Typography>
                </Card>
              </Box>
            ))}
          </Box>
          
          <Box textAlign="center" mt={6}>
            <Button
              variant="contained"
              size="large"
              startIcon={<IconSparkles />}
              onClick={() => window.open('/demo', '_blank')}
              sx={{
                backgroundColor: '#F5B800',
                color: '#1a1a1a',
                textTransform: 'none',
                fontWeight: 600,
                padding: '1rem 2.5rem',
                borderRadius: '12px',
                fontSize: '1.1rem',
                '&:hover': {
                  backgroundColor: '#E6A600',
                },
              }}
            >
              Try Full Demo
            </Button>
            <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
              See how easy it is to manage thousands of records and thousands of automations.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Powerful Features Section */}
      <Box sx={{ backgroundColor: '#fafafa', padding: '5rem 0' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h3"
              fontWeight={700}
              color="#6B46C1"
              gutterBottom
              fontFamily='"Inter", sans-serif'
            >
              Powerful Features
            </Typography>
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
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                AI-Powered OCR
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
                Advanced optical character recognition that reads 
                handwritten and printed text in multiple Orthodox 
                languages with exceptional accuracy.
              </Typography>
            </FeatureCard>
            
            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#F3E8FF' }}>
                <IconShield size={32} color="#6B46C1" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                Enterprise Security
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
                Bank-level encryption, secure cloud storage, and 
                complete data ownership ensure your parish records 
                remain private and protected.
              </Typography>
            </FeatureCard>
            
            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#F3E8FF' }}>
                <IconWorld size={32} color="#6B46C1" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                Multilingual Support
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
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
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                Instant Search
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
                Find any record in seconds with powerful search 
                capabilities across names, dates, locations, and custom 
                fields.
              </Typography>
            </FeatureCard>
            
            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#F3E8FF' }}>
                <IconUsers size={32} color="#6B46C1" />
              </FeatureIcon>
              <Typography variant="h5" fontWeight={600} color="#1a1a1a" gutterBottom>
                Role-Based Access
              </Typography>
              <Typography variant="body1" color="#666666" lineHeight={1.6}>
                Granular permissions system allowing different access 
                levels for clergy, staff, and volunteers while maintaining 
                security.
              </Typography>
            </FeatureCard>
            
            <FeatureCard>
              <FeatureIcon sx={{ backgroundColor: '#F3E8FF' }}>
                <IconHistory size={32} color="#6B46C1" />
              </FeatureIcon>
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

      {/* FAQ Section */}
      <Box sx={{ backgroundColor: 'white', padding: '5rem 0' }}>
        <Container maxWidth="md">
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h3"
              fontWeight={700}
              color="#6B46C1"
              gutterBottom
              fontFamily='"Inter", sans-serif'
            >
              Frequently Asked Questions
            </Typography>
            <Typography
              variant="h6"
              color="#666666"
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
                    backgroundColor: openFAQ === index ? '#FFF9E6' : 'white',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  <Typography 
                    variant="h6" 
                    color="#6B46C1" 
                    fontWeight={600}
                    sx={{ 
                      fontSize: '1.1rem',
                      flex: 1,
                      marginRight: '1rem',
                    }}
                  >
                    {faq.question}
                  </Typography>
                  <IconChevronDown 
                    size={24} 
                    color="#666666"
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
                      backgroundColor: '#FAFAFA',
                      borderTop: '1px solid #e0e0e0',
                      animation: 'fadeIn 0.3s ease',
                      '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'translateY(-10px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <Typography 
                      variant="body1" 
                      color="#666666" 
                      lineHeight={1.7}
                      sx={{ fontSize: '1rem' }}
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

      {/* Final CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2D1B69 0%, #1A1A2E 100%)',
          padding: '5rem 0',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Golden circles for decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #F5B800 0%, transparent 70%)',
            opacity: 0.3,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '20%',
            right: '10%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #F5B800 0%, transparent 70%)',
            opacity: 0.2,
          }}
        />
        
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography
              variant="h2"
              fontWeight={700}
              gutterBottom
              fontFamily='"Inter", sans-serif'
              sx={{ mb: 2 }}
            >
              Start today with your{' '}
              <span style={{ color: '#F5B800' }}>parish</span>.
              <br />
              We'll handle the{' '}
              <span style={{ color: '#F5B800' }}>records</span>.
            </Typography>
            
            <Typography
              variant="h6"
              sx={{ mb: 4, maxWidth: 600, mx: 'auto', opacity: 0.9 }}
            >
              Join hundreds of Orthodox parishes who trust OrthodoxMetrics to preserve 
              their sacred history for future generations.
            </Typography>
            
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: '#F5B800',
                  color: '#1a1a1a',
                  textTransform: 'none',
                  fontWeight: 600,
                  padding: '1rem 2.5rem',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  '&:hover': {
                    backgroundColor: '#E6A600',
                  },
                }}
              >
                Get Started Free
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: '#F5B800',
                  color: '#F5B800',
                  textTransform: 'none',
                  fontWeight: 600,
                  padding: '1rem 2.5rem',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  '&:hover': {
                    borderColor: '#E6A600',
                    backgroundColor: 'rgba(245, 184, 0, 0.1)',
                  },
                }}
              >
                Request Demo
              </Button>
            </Stack>
            
            <Typography variant="body2" sx={{ mt: 3, opacity: 0.7 }}>
              30-day free trial • No credit card required • Setup in minutes
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <FooterAnimationContainer
        sx={{
          backgroundColor: '#2D1B69',
          color: 'white',
          padding: '3rem 0 2rem',
          position: 'relative',
        }}
      >
        <FooterRayLayer>
          <FooterSweepLayer1 />
          <FooterSweepLayer2 />
          <FooterShimmerLayer />
          <FooterPulseLayer />
          <FooterRadialLayer />
        </FooterRayLayer>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(4, 1fr)',
              },
              gap: 4,
            }}
          >
            <Box>
              <Box display="flex" alignItems="center" mb={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: '#F5B800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <Typography variant="body1" fontWeight={700} color="#1a1a1a">
                    OM
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  OrthodoxMetrics
                </Typography>
              </Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" mb={2}>
                Digitizing Orthodox records and empowering the 
                Church with secure, multilingual record-keeping 
                solutions.
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <Typography variant="body2">𝕏</Typography>
                </IconButton>
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <Typography variant="body2">🐦</Typography>
                </IconButton>
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <Typography variant="body2">💼</Typography>
                </IconButton>
              </Stack>
            </Box>
            
            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>
                About
              </Typography>
              <Stack spacing={1}>
                {['Our Mission', 'How It Works', 'Security', 'Careers'].map((link) => (
                  <Typography
                    key={link}
                    variant="body2"
                    color="rgba(255,255,255,0.7)"
                    sx={{ cursor: 'pointer', '&:hover': { color: '#F5B800' } }}
                  >
                    {link}
                  </Typography>
                ))}
              </Stack>
            </Box>
            
            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Support
              </Typography>
              <Stack spacing={1}>
                {['Documentation', 'Help Center', 'Contact Us', 'System Status'].map((link) => (
                  <Typography
                    key={link}
                    variant="body2"
                    color="rgba(255,255,255,0.7)"
                    sx={{ cursor: 'pointer', '&:hover': { color: '#F5B800' } }}
                  >
                    {link}
                  </Typography>
                ))}
              </Stack>
            </Box>
            
            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Legal
              </Typography>
              <Stack spacing={1}>
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map((link) => (
                  <Typography
                    key={link}
                    variant="body2"
                    color="rgba(255,255,255,0.7)"
                    sx={{ cursor: 'pointer', '&:hover': { color: '#F5B800' } }}
                  >
                    {link}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Box>
          
          <Box
            sx={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              mt: 3,
              pt: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              © 2024 OrthodoxMetrics. All rights reserved.
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              Made with ❤️ for the Orthodox Community
            </Typography>
          </Box>
        </Container>
      </FooterAnimationContainer>
    </Box>
  );
};

export default HomePage;
