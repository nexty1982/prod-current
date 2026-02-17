import { Outlet } from 'react-router-dom';

// material ui
import { styled } from '@mui/material/styles';

// project imports
import Customization from 'layout/Customization';
import AppBar from 'ui-component/extended/AppBar';

// ==============================|| LAYOUTS - STRUCTURE ||============================== //

const headerBackground = '/assets/images/landing/bg-header.jpg';
const HeaderWrapper = styled('div')(({ theme }) => ({
  backgroundImage: `url(${headerBackground})`,
  backgroundSize: '100% 600px',
  backgroundAttachment: 'fixed',
  backgroundRepeat: 'no-repeat',
  textAlign: 'center',
  paddingTop: 30,
  [theme.breakpoints.down('md')]: {
    paddingTop: 0
  }
}));

// ==============================|| SIMPLE LAYOUT ||============================== //

export default function SimpleLayout() {
  return (
    <HeaderWrapper>
      <AppBar />
      <Outlet />
      <Customization />
    </HeaderWrapper>
  );
}
