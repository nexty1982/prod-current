import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import { styled } from '@mui/material/styles';
import { IconUser, IconLogout } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

const StyledButton = styled(Button)(({ theme }) => ({
  fontSize: '15px',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  '&.active': {
    backgroundColor: 'rgba(200, 162, 75, 0.12)',
    color: theme.palette.primary.main,
  },
}));

const UPLOAD_ROLES = ['super_admin', 'admin', 'church_admin', 'priest'];

interface PortalNavLink {
  title: string;
  to: string;
  roles?: string[];
}

const portalLinks: PortalNavLink[] = [
  { title: 'Portal', to: '/portal' },
  { title: 'Records', to: '/portal/records/baptism' },
  { title: 'Upload', to: '/portal/upload', roles: UPLOAD_ROLES },
  { title: 'Help', to: '/portal/guide' },
];

const PortalNavigations: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const role = user?.role || '';

  const visibleLinks = portalLinks.filter(
    (link) => !link.roles || link.roles.includes(role),
  );

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/auth/login');
  };

  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || '?'
    : '?';

  return (
    <>
      {visibleLinks.map((link) => (
        <StyledButton
          key={link.to}
          className={pathname.startsWith(link.to) && (link.to === '/portal' ? pathname === '/portal' : true) ? 'active' : ''}
          variant="text"
          component={NavLink}
          to={link.to}
        >
          {link.title}
        </StyledButton>
      ))}

      {/* User menu */}
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ ml: 1, minWidth: 'auto', textTransform: 'none', color: 'text.secondary' }}
      >
        <Avatar sx={{ width: 30, height: 30, fontSize: '0.8rem', bgcolor: 'primary.main', mr: 1 }}>
          {initials}
        </Avatar>
        {user?.first_name || 'Account'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/portal/profile'); }}>
          <ListItemIcon><IconUser size={18} /></ListItemIcon>
          My Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><IconLogout size={18} /></ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>
    </>
  );
};

export default PortalNavigations;
