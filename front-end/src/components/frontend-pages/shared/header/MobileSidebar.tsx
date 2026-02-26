import { CustomizerContext } from '@/context/CustomizerContext';
import { useAuth } from '@/context/AuthContext';
import { Chip, Divider, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLinks } from './Navigations';

const UPLOAD_ROLES = ['super_admin', 'admin', 'church_admin', 'priest'];

const portalMobileLinks = [
  { title: 'Portal', to: '/portal' },
  { title: 'Records', to: '/portal/records/baptism' },
  { title: 'Certificates', to: '/portal/certificates' },
  { title: 'Upload Records', to: '/portal/upload', roles: UPLOAD_ROLES },
  { title: 'Help', to: '/portal/guide' },
  { title: 'My Profile', to: '/portal/profile' },
];

interface MobileSidebarProps {
  isPortal?: boolean;
}

const MobileSidebar = ({ isPortal = false }: MobileSidebarProps) => {
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toggleMode = () => setActiveMode(activeMode === 'light' ? 'dark' : 'light');
  const role = user?.role || '';

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const visiblePortalLinks = portalMobileLinks.filter(
    (link) => !link.roles || link.roles.includes(role),
  );

  return (
    <>
      <Box px={3} py={2}>
        <Box
          component="img"
          src="/images/logos/om-logo.png"
          alt="Orthodox Metrics"
          sx={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
        />
      </Box>
      <Box p={3}>
        <Stack direction="column" spacing={2}>
          {isPortal ? (
            <>
              {visiblePortalLinks.map((link, i) => (
                <Button
                  color="inherit"
                  key={i}
                  href={link.to}
                  sx={{ justifyContent: 'start' }}
                >
                  {link.title}
                </Button>
              ))}
              <Button color="error" variant="outlined" onClick={handleLogout}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              {NavLinks.map((navlink, i) => (
                <Button
                  color="inherit"
                  key={i}
                  href={navlink.to}
                  sx={{ justifyContent: 'start' }}
                >
                  {navlink.title}
                  {navlink.new ? (
                    <Chip
                      label="New"
                      size="small"
                      sx={{
                        ml: '6px',
                        borderRadius: '8px',
                        color: 'primary.main',
                        backgroundColor: 'rgba(200, 162, 75, 0.12)',
                      }}
                    />
                  ) : null}
                </Button>
              ))}
              <Button color="primary" variant="contained" href="/auth/login">
                Church Login
              </Button>
            </>
          )}
          <Divider />
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={toggleMode} size="small" sx={{ color: 'text.primary' }}>
              {activeMode === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {activeMode === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </>
  );
};

export default MobileSidebar;
