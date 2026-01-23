import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Box, Typography, keyframes, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  IconHome,
  IconUserPlus,
  IconQuestionMark,
  IconBuildingChurch,
  IconRocket,
} from '@tabler/icons-react';

// Subtle hover animation
const hoverPulse = keyframes`
  0%, 100% {
    box-shadow: 0 4px 15px rgba(200, 162, 75, 0.3);
  }
  50% {
    box-shadow: 0 6px 25px rgba(200, 162, 75, 0.5);
  }
`;

// Pulsating gold glow animation for the central bulb
const goldPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 6px 2px rgba(212, 175, 55, 0.5),
                0 0 12px 4px rgba(212, 175, 55, 0.3),
                0 0 20px 8px rgba(212, 175, 55, 0.15),
                inset 0 0 4px rgba(255, 215, 0, 0.4);
  }
  50% {
    box-shadow: 0 0 10px 4px rgba(245, 184, 0, 0.7),
                0 0 20px 8px rgba(245, 184, 0, 0.4),
                0 0 30px 12px rgba(245, 184, 0, 0.2),
                inset 0 0 6px rgba(255, 223, 0, 0.6);
  }
`;

// Container that holds the circular arrangement
const CircularContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'leftPosition',
})<{ leftPosition: number }>(({ theme, leftPosition }) => ({
  position: 'absolute',
  top: '50%',
  left: `${leftPosition}%`,
  transform: 'translate(-50%, -50%)',
  width: 400,
  height: 250,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  pointerEvents: 'none',
  transition: 'left 0.1s ease-out',
  '& > *': {
    pointerEvents: 'auto',
  },
  [theme.breakpoints.down('lg')]: {
    width: 350,
    height: 220,
  },
  [theme.breakpoints.down('md')]: {
    width: 300,
    height: 200,
  },
  [theme.breakpoints.down('sm')]: {
    width: 250,
    height: 180,
  },
}));

// Central glowing cross - using image instead of SVG
const GlowingCrossBase = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isExpanded' && prop !== 'isDragging',
})<{ isExpanded: boolean; isDragging: boolean }>(({ isExpanded, isDragging }) => ({
  cursor: isDragging ? 'grabbing' : 'grab',
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 10,
  transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  width: isExpanded ? '32px' : '40px',
  height: isExpanded ? '32px' : '40px',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: isExpanded 
      ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))'
      : 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.5)) drop-shadow(0 0 12px rgba(212, 175, 55, 0.3))',
    animation: isExpanded ? 'none' : `${goldPulse} 2s ease-in-out infinite`,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  '&:hover': {
    transform: isExpanded 
      ? 'translate(-50%, -50%) scale(1.1)' 
      : 'translate(-50%, -50%) scale(1.2)',
    '& img': {
      filter: 'drop-shadow(0 0 10px rgba(245, 184, 0, 0.7)) drop-shadow(0 0 20px rgba(245, 184, 0, 0.4))',
    },
  },
  '&:active': {
    transform: 'translate(-50%, -50%) scale(0.9)',
  },
}));

// Wrap with forwardRef to accept ref
const GlowingCross = forwardRef<HTMLDivElement, { isExpanded: boolean; isDragging: boolean; onClick: (e: React.MouseEvent) => void; onMouseDown: (e: React.MouseEvent) => void; title: string }>(
  ({ isExpanded, isDragging, onClick, onMouseDown, title, ...props }, ref) => (
    <GlowingCrossBase
      ref={ref}
      isExpanded={isExpanded}
      isDragging={isDragging}
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      {...props}
    >
      <img 
        src="/images/incode/cross-gold.png" 
        alt="Cross menu" 
        draggable="false"
      />
    </GlowingCrossBase>
  )
);
GlowingCross.displayName = 'GlowingCross';

// Individual menu button
const MenuButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'angle' && prop !== 'radius' && prop !== 'isExpanded' && prop !== 'delay',
})<{ angle: number; radius: number; isExpanded: boolean; delay: number }>(
  ({ angle, radius, isExpanded, delay }) => {
    const radians = (angle * Math.PI) / 180;
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;
    
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: isExpanded 
        ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
        : 'translate(-50%, -50%) scale(0)',
      opacity: isExpanded ? 1 : 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      cursor: 'pointer',
      transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
      '&:hover': {
        transform: isExpanded 
          ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1.12)`
          : 'translate(-50%, -50%) scale(0)',
        '& .menu-icon-wrapper': {
          boxShadow: '0 4px 20px rgba(212, 175, 55, 0.7), 0 0 30px rgba(245, 184, 0, 0.5)',
          border: '2px solid rgba(245, 184, 0, 1)',
          background: 'rgba(46, 15, 70, 0.6)',
          animation: `${hoverPulse} 1s ease-in-out infinite`,
        },
      },
    };
  }
);

// Icon wrapper with circular styling
const IconWrapper = styled(Box)({
  width: 50,
  height: 50,
  borderRadius: '50%',
  background: 'rgba(46, 15, 70, 0.4)', // Dark purple with transparency to blend with header
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
  border: '2px solid rgba(212, 175, 55, 0.8)', // Golden border - more visible
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 2,
    borderRadius: '50%',
    border: '1px solid rgba(245, 184, 0, 0.4)', // Inner golden border
    pointerEvents: 'none',
  },
});

// Label below button
const MenuLabel = styled(Typography)({
  marginTop: 6,
  fontSize: '10px',
  fontWeight: 600,
  color: '#FFFFFF', // White text to match screenshot
  fontFamily: 'Georgia, serif',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5), 0 0 8px rgba(212, 175, 55, 0.3)', // Dark shadow with golden glow
});

// Decorative circle line with subtle gold glow - only visible when expanded
const ArcDecoration = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isExpanded',
})<{ isExpanded: boolean }>(({ isExpanded }) => ({
  position: 'absolute',
  width: 180,
  height: 180,
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  border: '1px dashed rgba(212, 175, 55, 0.5)', // More visible golden dotted line
  borderRadius: '50%',
  pointerEvents: 'none',
  boxShadow: '0 0 20px rgba(212, 175, 55, 0.2), inset 0 0 20px rgba(212, 175, 55, 0.15)',
  opacity: isExpanded ? 1 : 0,
  transition: 'opacity 0.4s ease 0.1s',
}));

// Menu items data with angles for circular arrangement
const menuItems = [
  { label: 'Home', icon: IconHome, angle: 180, href: '/', requiresAuth: false },
  { label: 'Get Started', icon: IconRocket, angle: 252, href: '/get-started', requiresAuth: true },
  { label: 'Register', icon: IconUserPlus, angle: 324, href: '/register', requiresAuth: false },
  { label: 'FAQ', icon: IconQuestionMark, angle: 36, href: '/faq', requiresAuth: false },
  { label: 'Church Portal', icon: IconBuildingChurch, angle: 108, href: '/auth/login2', requiresAuth: false },
];

const CircularMenu: React.FC = () => {
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
  const containerRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<number>(() => {
    // Load saved position from localStorage, default to 75%
    const saved = localStorage.getItem('circularMenuPosition');
    return saved ? parseFloat(saved) : 75;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; startPosition: number } | null>(null);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('circularMenuPosition', position.toString());
  }, [position]);

  const handleBulbClick = (e: React.MouseEvent) => {
    // Only toggle if not dragging
    if (!isDragging) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleItemClick = (href: string, requiresAuth: boolean = false) => {
    // Check if route requires authentication
    if (requiresAuth && !authenticated) {
      // Redirect to login page if not authenticated
      navigate('/auth/login2');
      return;
    }
    
    // Navigate to the route
    navigate(href);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag on left click
    if (e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        startPosition: position,
      };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;

      const container = containerRef.current.parentElement;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      // Calculate new position, constrained between 10% and 90%
      let newPosition = dragStartRef.current.startPosition + deltaPercent;
      newPosition = Math.max(10, Math.min(90, newPosition));
      
      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  return (
    <CircularContainer 
      ref={containerRef} 
      leftPosition={position}
    >
      {/* Decorative circle - only visible when expanded */}
      <ArcDecoration isExpanded={isExpanded} />
      
      {/* Menu buttons arranged in a circle */}
      {menuItems.map((item, index) => (
        <MenuButton
          key={item.label}
          angle={item.angle}
          radius={85}
          isExpanded={isExpanded}
          delay={index * 50}
          onClick={() => handleItemClick(item.href, item.requiresAuth)}
        >
          <IconWrapper className="menu-icon-wrapper">
            <item.icon 
              size={22} 
              color="#D4AF37" 
              stroke={2} 
            />
          </IconWrapper>
          <MenuLabel>
            {item.label}
          </MenuLabel>
        </MenuButton>
      ))}

      {/* Central glowing cross */}
      <GlowingCross 
        ref={crossRef}
        isExpanded={isExpanded}
        isDragging={isDragging}
        onMouseDown={handleMouseDown}
        onClick={handleBulbClick}
        title={isDragging ? 'Dragging...' : (isExpanded ? 'Close menu (drag to reposition)' : 'Open menu (drag to reposition)')}
      />
    </CircularContainer>
  );
};

export default CircularMenu;
