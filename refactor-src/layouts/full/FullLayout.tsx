import { FC, useContext } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';
import Customizer from './shared/customizer/Customizer';
import Navigation from '../full/horizontal/navbar/Navigation';
import HorizontalHeader from '../full/horizontal/header/Header';
import ScrollToTop from '../../shared/ui/ScrollToTop';
// import SuperadminSourcePathOverlay from '../../features/overlays'; // TEMPORARILY DISABLED
// import { VersionSwitcher } from '../../features/overlays'; // TEMPORARILY DISABLED
// import LoadingBar from '../../LoadingBar';
import { CustomizerContext } from '@/context/CustomizerContext';
import config from '@/context/config';
// import SiteEditorOverlay from '../../components/SiteEditorOverlay';
// import GlobalOMAI from '../../components/global/GlobalOMAI';
// import ErrorNotificationToast from '../../components/global/ErrorNotificationToast';

const MainWrapper = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

const PageWrapper = styled('div')(() => ({
  display: 'flex',
  flexGrow: 1,
  paddingBottom: '60px',
  flexDirection: 'column',
  zIndex: 1,
  width: '100%',
  backgroundColor: 'transparent',
}));

const FullLayout: FC = () => {
  const { activeLayout, isLayout, activeMode, isCollapse } = useContext(CustomizerContext);
  const theme = useTheme();
  const MiniSidebarWidth = config.miniSidebarWidth;

  return (
    <>
      {/* <LoadingBar /> */}
      <MainWrapper className={activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}>

        {/* ------------------------------------------- */}
        {/* Sidebar */}
        {/* ------------------------------------------- */}
        {activeLayout === 'horizontal' ? '' : <Sidebar />}
        {/* ------------------------------------------- */}
        {/* Main Wrapper */}
        {/* ------------------------------------------- */}
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(isCollapse === "mini-sidebar" && {
              [theme.breakpoints.up('lg')]: { ml: `${MiniSidebarWidth}px` },
            }),
          }}
        >
          {/* ------------------------------------------- */}
          {/* Header */}
          {/* ------------------------------------------- */}
          {activeLayout === 'horizontal' ? <HorizontalHeader /> : <Header />}
          {/* PageContent */}
          {activeLayout === 'horizontal' ? <Navigation /> : ''}
          <Container
            sx={{
              pt: '30px',
              maxWidth: isLayout === 'boxed' ? 'lg' : '100%!important',
              mx: 'auto', // Center the container
              px: { xs: 2, sm: 3, md: 4 }, // Responsive padding
            }}
          >
            {/* ------------------------------------------- */}
            {/* PageContent */}
            {/* ------------------------------------------- */}

            <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
              <ScrollToTop>
                {/* <SiteEditorOverlay> */}
                  <Outlet />
                {/* </SiteEditorOverlay> */}
              </ScrollToTop>
            </Box>

            {/* ------------------------------------------- */}
            {/* End Page */}
            {/* ------------------------------------------- */}
          </Container>
          <Customizer />
        </PageWrapper>
      </MainWrapper>
      
      {/* ------------------------------------------- */}
      {/* Global OMAI Assistant - DISABLED */}
      {/* ------------------------------------------- */}
      {/* <GlobalOMAI /> */}
      {/* <SuperadminSourcePathOverlay /> TEMPORARILY DISABLED */}
      {/* <VersionSwitcher /> TEMPORARILY DISABLED */}
      {/* <ErrorNotificationToast /> */}
    </>
  );
};

export default FullLayout;
