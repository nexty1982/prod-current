import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';

// project imports
import Profile from './Profile';
import Billing from './Billing';
import Security from './Security';
import Notifications from './Notifications';
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';

// types
import { TabsProps } from 'types';

// tabs
function TabPanel({ children, value, index, ...other }: TabsProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

// ==============================|| PROFILE 3 ||============================== //

export default function Profile3() {
  const theme = useTheme();
  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <MainCard title="Account">
      <div>
        <Tabs
          value={value}
          indicatorColor="primary"
          onChange={handleChange}
          sx={{
            mb: 3,
            minHeight: 'auto',
            '& button': {
              minWidth: 100
            },
            '& .MuiTab-root': {
              minHeight: 'auto',
              minWidth: 10,
              py: 1.5,
              px: 1,
              mr: 2.25,
              color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900'
            },
            '& .Mui-selected': {
              color: 'primary.main'
            }
          }}
          aria-label="simple tabs example"
          variant="scrollable"
        >
          <Tab label="Profile" {...a11yProps(0)} />
          <Tab label="Billing" {...a11yProps(1)} />
          <Tab label="Security" {...a11yProps(2)} />
          <Tab label="Notifications" {...a11yProps(3)} />
        </Tabs>
        <TabPanel value={value} index={0}>
          <Profile />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <Billing />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <Security />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <Notifications />
        </TabPanel>
      </div>
    </MainCard>
  );
}
