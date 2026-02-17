import { Chip } from '@mui/material';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import { NavLink, useLocation } from 'react-router-dom';

export const NavLinks = [
  {
    title: 'Home',
    to: '/frontend-pages/homepage',
  },
  {
    title: 'About Us',
    to: '/frontend-pages/about',
  },
  {
    title: 'Pricing',
    to: '/frontend-pages/pricing',
  },
  {
    title: 'Samples',
    to: '/samples',
  },
  {
    title: 'Tour',
    to: '/tour',
    new: true,
  },
  {
    title: 'Blog',
    to: '/frontend-pages/blog',
  },
  {
    title: 'Contact',
    to: '/frontend-pages/contact',
  },
];

const StyledButton = styled(Button)(({ theme }) => ({
  fontSize: '15px',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  '&.active': {
    backgroundColor: 'rgba(200, 162, 75, 0.12)',
    color: theme.palette.primary.main,
  },
}));

const Navigations = () => {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <>
      {NavLinks.map((navlink, i) => (
        <StyledButton
          className={pathname === navlink.to ? 'active' : 'not-active'}
          variant="text"
          key={i}
          component={NavLink}
          to={navlink.to}
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
        </StyledButton>
      ))}
    </>
  );
};

export default Navigations;
