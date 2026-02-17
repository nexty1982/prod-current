import { useState } from 'react';

// material-ui
import Tab, { TabProps } from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';

interface TabItem {
  label: string;
  icon: TabProps['icon'];
}

interface HeadingTabProps {
  tabs: TabItem[];
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

// ==============================|| BLOG DETAILS - HEADING TAB ||============================== //

export default function HeadingTab({ tabs }: HeadingTabProps) {
  const [tabValue, setTabValue] = useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <MainCard content={false}>
      <Box sx={{ mx: 3 }}>
        <Tabs
          value={tabValue}
          variant="scrollable"
          onChange={handleChange}
          sx={{
            '&.MuiTabs-root .MuiTab-root': {
              minHeight: 'auto',
              minWidth: 10,
              py: 1.75,
              px: 1,
              mr: 2.2,
              color: 'grey.600',
              '&.Mui-selected': { color: 'primary.main' }
            },
            '& .MuiTabs-flexContainer': { border: 0 },
            '& .MuiTabs-indicator': { height: 3 }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} icon={tab.icon} iconPosition="start" {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>
    </MainCard>
  );
}
