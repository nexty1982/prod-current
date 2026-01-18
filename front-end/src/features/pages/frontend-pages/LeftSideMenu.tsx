import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  useTheme,
} from '@mui/material';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconArrowUp,
  IconArrowDown,
  IconMenu2,
} from '@tabler/icons-react';
import { styled } from '@mui/material/styles';

const MenuContainer = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isExpanded' && prop !== 'verticalOffset',
})<{ isExpanded: boolean; verticalOffset: number }>(({ theme, isExpanded, verticalOffset }) => ({
  position: 'fixed',
  left: 0,
  top: `calc(50% + ${verticalOffset}px)`,
  transform: 'translateY(-50%)',
  zIndex: 1000,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  width: isExpanded ? '280px' : '60px',
  maxHeight: '80vh',
  overflowY: 'auto',
  overflowX: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  border: '2px solid rgba(212, 175, 55, 0.3)',
  borderLeft: 'none',
  borderRadius: '0 12px 12px 0',
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : '#faf8f4',
  // Ensure menu doesn't overlap with header on small screens
  [theme.breakpoints.down('md')]: {
    top: `calc(45% + ${verticalOffset}px)`,
    maxHeight: '70vh',
  },
  [theme.breakpoints.down('sm')]: {
    top: `calc(40% + ${verticalOffset}px)`,
    maxHeight: '60vh',
    width: isExpanded ? '240px' : '50px',
  },
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(212, 175, 55, 0.3)',
    borderRadius: '4px',
    '&:hover': {
      background: 'rgba(212, 175, 55, 0.5)',
    },
  },
}));

const ToggleButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: '8px',
  top: '16px',
  backgroundColor: 'rgba(212, 175, 55, 0.1)',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
  width: '36px',
  height: '36px',
  '&:hover': {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  transition: 'all 0.3s ease',
}));

const TriggerButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'verticalOffset',
})<{ verticalOffset: number }>(({ theme, verticalOffset }) => ({
  position: 'fixed',
  left: 0,
  top: `calc(50% + ${verticalOffset}px)`,
  transform: 'translateY(-50%)',
  zIndex: 999,
  backgroundColor: 'rgba(212, 175, 55, 0.9)',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
  width: '48px',
  height: '48px',
  borderRadius: '0 12px 12px 0',
  border: '2px solid rgba(212, 175, 55, 0.3)',
  borderLeft: 'none',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  '&:hover': {
    backgroundColor: 'rgba(212, 175, 55, 1)',
  },
  transition: 'all 0.3s ease',
}));

const MenuTitle = styled(Typography)(({ theme }) => ({
  fontSize: '18px',
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
  fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  padding: '16px 16px 8px 16px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));

const MenuItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'isExpanded',
})<{ active: boolean; isExpanded: boolean }>(({ theme, active, isExpanded }) => ({
  minHeight: '48px',
  padding: '12px 16px',
  borderRadius: '8px',
  margin: '4px 8px',
  backgroundColor: active 
    ? 'rgba(212, 175, 55, 0.15)' 
    : 'transparent',
  color: active 
    ? (theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46')
    : (theme.palette.mode === 'dark' ? '#cccccc' : '#666666'),
  fontWeight: active ? 600 : 500,
  borderLeft: active ? '3px solid #C8A24B' : '3px solid transparent',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderLeft: '3px solid rgba(200, 162, 75, 0.5)',
  },
  '& .MuiListItemText-primary': {
    fontSize: '15px',
    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    whiteSpace: isExpanded ? 'normal' : 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

const SubMenuItem = styled(ListItemButton)(({ theme }) => ({
  minHeight: '40px',
  padding: '8px 16px 8px 32px',
  borderRadius: '6px',
  margin: '2px 8px',
  fontSize: '14px',
  color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
  '&:hover': {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  '& .MuiListItemText-primary': {
    fontSize: '14px',
    fontWeight: 500,
  },
  '& .MuiListItemText-secondary': {
    fontSize: '12px',
    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
  },
}));

interface SubMenuItemData {
  title: string;
  description: string;
  path: string;
}

interface MenuItemData {
  id: string;
  label: string;
  submenu?: SubMenuItemData[];
  onClick?: () => void;
  path?: string; // For top-level navigation links
}

interface LeftSideMenuProps {
  activeSection: 'gallery-of-images' | 'graphical-analysis' | 'om-magic-image' | 'records-systems';
  onSectionChange: (section: 'gallery-of-images' | 'graphical-analysis' | 'om-magic-image' | 'records-systems') => void;
  onSubmenuItemClick: (path: string) => void;
}

const LeftSideMenu: React.FC<LeftSideMenuProps> = ({
  activeSection,
  onSectionChange,
  onSubmenuItemClick,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false); // Hidden by default
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSubmenus, setExpandedSubmenus] = useState<Set<string>>(new Set());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [verticalOffset, setVerticalOffset] = useState(() => {
    // Load vertical offset from localStorage or default to 0
    const saved = localStorage.getItem('leftSideMenuVerticalOffset');
    return saved ? parseInt(saved, 10) : 0;
  });

  const menuItems: MenuItemData[] = [
    {
      id: 'gallery-of-images',
      label: 'Gallery of Images',
      path: '/apps/gallery',
    },
    {
      id: 'graphical-analysis',
      label: 'Graphical Analysis',
    },
    {
      id: 'om-magic-image',
      label: 'OM Magic Image',
      path: '/devel-tools/om-magic-image',
    },
    {
      id: 'records-systems',
      label: 'Records Systems',
      submenu: [
        {
          title: 'Church Metric Records',
          description: 'Manage baptism, marriage, and funeral records',
          path: '/apps/records/baptism',
        },
      ],
    },
  ];

  // Reset inactivity timer on any interaction
  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Set new timer to collapse submenus after 4 seconds
    inactivityTimerRef.current = setTimeout(() => {
      setExpandedSubmenus(new Set());
    }, 4000);
  };

  // Reset auto-hide timer on any interaction
  const resetAutoHideTimer = () => {
    // Clear existing auto-hide timer
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    
    // Only set timer if menu is visible
    if (isVisible) {
      // Set new timer to hide menu after 5 seconds
      autoHideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    }
  };

  const toggleSubmenu = (itemId: string) => {
    setExpandedSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      // Reset timers when submenu is toggled
      resetInactivityTimer();
      resetAutoHideTimer();
      return newSet;
    });
  };

  const handleMenuItemClick = (item: MenuItemData) => {
    if (item.submenu && item.submenu.length > 0) {
      onSectionChange(item.id as typeof activeSection);
      toggleSubmenu(item.id);
    } else if (item.path) {
      // Navigate to the path if it's a top-level link
      // Ensure path is absolute and prevent duplication
      const absolutePath = item.path.startsWith('/') ? item.path : `/${item.path}`;
      navigate(absolutePath, { replace: false });
      resetInactivityTimer();
      resetAutoHideTimer();
    } else {
      // Reset timers on menu item click
      onSectionChange(item.id as typeof activeSection);
      resetInactivityTimer();
      resetAutoHideTimer();
    }
  };

  const handleVerticalAdjust = (direction: 'up' | 'down') => {
    const step = 60; // Adjust by 60px per click
    const newOffset = direction === 'up' 
      ? verticalOffset - step 
      : verticalOffset + step;
    
    // Limit the offset to reasonable bounds (e.g., -200px to +200px)
    const clampedOffset = Math.max(-200, Math.min(200, newOffset));
    setVerticalOffset(clampedOffset);
    localStorage.setItem('leftSideMenuVerticalOffset', clampedOffset.toString());
    // Reset auto-hide timer when adjusting position
    resetAutoHideTimer();
  };

  // Auto-expand submenu when section becomes active
  useEffect(() => {
    const activeItem = menuItems.find((item) => item.id === activeSection);
    if (activeItem && activeItem.submenu) {
      setExpandedSubmenus((prev) => {
        const newSet = new Set(prev).add(activeItem.id);
        // Reset timers when submenu auto-expands
        resetInactivityTimer();
        resetAutoHideTimer();
        return newSet;
      });
    }
  }, [activeSection]);

  // Initialize inactivity timer on mount and when submenus change
  useEffect(() => {
    // Only start timer if there are expanded submenus
    if (expandedSubmenus.size > 0) {
      resetInactivityTimer();
    }

    // Cleanup timers on unmount
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [expandedSubmenus.size]);

  // Auto-hide timer: start when menu becomes visible, reset on interactions
  useEffect(() => {
    if (isVisible) {
      // Start auto-hide timer when menu becomes visible
      resetAutoHideTimer();
    } else {
      // Clear auto-hide timer when menu is hidden
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [isVisible]);

  // Reset menu state when user exits the site or navigates away
  useEffect(() => {
    const resetMenuState = () => {
      // Reset to default state: hidden menu, expanded when shown, no submenus open
      setIsVisible(false);
      setIsExpanded(true);
      setExpandedSubmenus(new Set());
    };

    const handlePageHide = () => {
      // Reset when page is being unloaded or hidden
      resetMenuState();
    };

    const handleVisibilityChange = () => {
      // Reset state when page becomes hidden (user switches tabs, minimizes, navigates away)
      // Also reset when page becomes visible again (user returns to the site)
      resetMenuState();
    };

    // Listen for page unload/hide events
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup listeners on component unmount
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!isVisible) {
    return (
      <TriggerButton
        verticalOffset={verticalOffset}
        onClick={() => {
          setIsVisible(true);
          // Timer will start automatically via useEffect when isVisible becomes true
        }}
        title="Show Navigation Menu"
      >
        <IconMenu2 size={24} />
      </TriggerButton>
    );
  }

  return (
    <MenuContainer 
      isExpanded={isExpanded} 
      verticalOffset={verticalOffset} 
      elevation={8}
      onMouseEnter={resetAutoHideTimer}
      onMouseMove={resetAutoHideTimer}
    >
      <Box sx={{ position: 'relative', minHeight: '100%' }}>
        {/* Only show toggle button and adjustment buttons when expanded */}
        {isExpanded && (
          <>
            <ToggleButton
              onClick={() => {
                // Only toggle expand/collapse, do not hide the menu
                setIsExpanded(!isExpanded);
                resetInactivityTimer();
                resetAutoHideTimer();
              }}
              size="small"
              sx={{
                position: 'absolute',
                right: '8px',
                top: '16px',
                zIndex: 10,
              }}
            >
              <IconChevronLeft size={20} />
            </ToggleButton>

            {/* Vertical Position Adjustment Buttons */}
            <Box
              sx={{
                position: 'absolute',
                right: '8px',
                bottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                zIndex: 10,
              }}
            >
              <IconButton
                onClick={() => handleVerticalAdjust('up')}
                size="small"
                sx={{
                  backgroundColor: 'rgba(212, 175, 55, 0.1)',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
                  width: '28px',
                  height: '28px',
                  '&:hover': {
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                  },
                }}
                title="Move menu up"
              >
                <IconArrowUp size={16} />
              </IconButton>
              <IconButton
                onClick={() => handleVerticalAdjust('down')}
                size="small"
                sx={{
                  backgroundColor: 'rgba(212, 175, 55, 0.1)',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
                  width: '28px',
                  height: '28px',
                  '&:hover': {
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                  },
                }}
                title="Move menu down"
              >
                <IconArrowDown size={16} />
              </IconButton>
            </Box>
          </>
        )}

        {isExpanded && (
          <MenuTitle>Navigation</MenuTitle>
        )}

        {!isExpanded ? (
          // When collapsed, show just the menu icon button
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '16px',
            }}
          >
            <IconButton
              onClick={() => setIsExpanded(true)}
              onMouseEnter={resetAutoHideTimer}
              sx={{
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#2E0F46',
                width: '48px',
                height: '48px',
                '&:hover': {
                  backgroundColor: 'rgba(212, 175, 55, 0.2)',
                },
              }}
              title="Expand Navigation Menu"
            >
              <IconMenu2 size={24} />
            </IconButton>
          </Box>
        ) : (
          <List sx={{ paddingTop: '8px', paddingBottom: '16px' }}>
            {menuItems.map((item) => {
              const isActive = activeSection === item.id;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isSubmenuExpanded = expandedSubmenus.has(item.id);

              return (
                <React.Fragment key={item.id}>
                  <ListItem disablePadding>
                    <MenuItemButton
                      active={isActive}
                      isExpanded={isExpanded}
                      onMouseEnter={resetAutoHideTimer}
                      onClick={() => {
                        handleMenuItemClick(item);
                      }}
                      sx={{
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      {hasSubmenu && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSubmenu(item.id);
                          }}
                          sx={{
                            padding: '4px',
                            color: 'inherit',
                          }}
                        >
                          {isSubmenuExpanded ? (
                            <IconChevronUp size={16} />
                          ) : (
                            <IconChevronDown size={16} />
                          )}
                        </IconButton>
                      )}
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          sx: {
                            fontSize: '15px',
                            fontWeight: isActive ? 700 : 500,
                          },
                        }}
                      />
                    </MenuItemButton>
                  </ListItem>

                  {hasSubmenu && (
                    <Collapse in={isSubmenuExpanded} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu!.map((subItem, index) => (
                          <SubMenuItem
                            key={index}
                            onMouseEnter={resetAutoHideTimer}
                            onClick={() => {
                              onSubmenuItemClick(subItem.path);
                              resetInactivityTimer();
                              resetAutoHideTimer();
                            }}
                          >
                            <ListItemText
                              primary={subItem.title}
                              secondary={subItem.description}
                            />
                          </SubMenuItem>
                        ))}
                      </List>
                    </Collapse>
                  )}

                  <Divider sx={{ my: 0.5, mx: 2 }} />
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
    </MenuContainer>
  );
};

export default LeftSideMenu;

