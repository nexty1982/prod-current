// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// project imports
import Customization from 'layout/Customization';
import AppBar from 'ui-component/extended/AppBar';
import HeaderSection from './HeaderSection';
import CardSection from './CardSection';
import FeatureSection from './FeatureSection';
import PeopleSection from './PeopleSection';
import FrameworkSection from './FrameworkSection';
import FooterSection from './FooterSection';
import CustomizeSection from './CustomizeSection';
import PreBuildDashBoard from './PreBuildDashBoard';
import StartupProjectSection from './StartupProjectSection';
//import IncludeSection from './IncludeSection';
//import RtlInfoSection from './RtlInfoSection';

import { ThemeMode } from 'config';

// =============================|| LANDING MAIN ||============================= //

export default function Landing() {
  const theme = useTheme();

  return (
    <>
      {/* 1. header and hero section */}
      <Box
        id="home"
        sx={{
          overflowX: 'hidden',
          overflowY: 'clip',
          background:
            theme.palette.mode === ThemeMode.DARK
              ? theme.palette.background.default
              : `linear-gradient(360deg, ${theme.palette.grey[100]} 1.09%, ${theme.palette.background.paper} 100%)`
        }}
      >
        <AppBar />
        <HeaderSection />
      </Box>

      {/* 2. card section */}
      <Box sx={{ py: 12.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'background.default' }}>
        <CardSection />
      </Box>

      {/* 4. Developer Experience section */}
      <Box sx={{ py: 12.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'grey.100' }}>
        <CustomizeSection />
      </Box>

      {/* 3. about section */}
      <Box sx={{ py: 12.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'background.default' }}>
        <FeatureSection />
      </Box>

      {/* 4. Apps */}
      <Box sx={{ py: 12.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'grey.100' }}>
        <PreBuildDashBoard />
      </Box>

      {/* 5. people section */}
      <Box sx={{ py: 12.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'background.default' }}>
        <PeopleSection />
      </Box>

      {/* 6. startup section */}
      <Box sx={{ py: 0 }}>
        <StartupProjectSection />
      </Box>

      {/* multi-language section */}

      {/*  <Box sx={{ py: 0 }}>
                <RtlInfoSection />
            </Box> */}

      {/* framework section */}
      <Box sx={{ py: 12.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'background.default' }}>
        <FrameworkSection />
      </Box>

      {/* 7. inculde section */}
      {/* <Box sx={{ py: 12.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'background.default' }}>
                <IncludeSection />
            </Box>
            */}
      {/* footer section */}
      <Box sx={{ py: 12.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'dark.900', pb: 0 }}>
        <FooterSection />
      </Box>
      <Customization />
    </>
  );
}
