import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';

// assets
import PersonOutlineTwoToneIcon from '@mui/icons-material/PersonOutlineTwoTone';
import PanoramaTwoToneIcon from '@mui/icons-material/PanoramaTwoTone';
import PeopleAltTwoToneIcon from '@mui/icons-material/PeopleAltTwoTone';
import RecentActorsTwoToneIcon from '@mui/icons-material/RecentActorsTwoTone';

// types
import { TabsProps } from 'types';

// tab content
function TabPanel({ children, value, index, ...other }: TabsProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

// ================================|| UI TABS - SAMPLE ||================================ //

export default function SimpleTabs() {
  const theme = useTheme();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      <Tabs
        value={value}
        variant="scrollable"
        onChange={handleChange}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            minHeight: 'auto',
            minWidth: 10,
            py: 1.5,
            px: 1,
            mr: 2.2,
            color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900'
          },
          '& .Mui-selected': { color: 'primary.main' }
        }}
      >
        <Tab icon={<PersonOutlineTwoToneIcon sx={{ fontSize: '1.3rem' }} />} iconPosition="start" label="Profile" {...a11yProps(0)} />
        <Tab icon={<RecentActorsTwoToneIcon sx={{ fontSize: '1.3rem' }} />} iconPosition="start" label="followers" {...a11yProps(1)} />
        <Tab
          icon={<PeopleAltTwoToneIcon sx={{ fontSize: '1.3rem' }} />}
          label={
            <>
              friends <Chip label="01" size="small" color="secondary" sx={{ ml: 1.3 }} />
            </>
          }
          iconPosition="start"
          {...a11yProps(2)}
        />
        <Tab icon={<PanoramaTwoToneIcon sx={{ fontSize: '1.3rem' }} />} iconPosition="start" label="Gallery" {...a11yProps(3)} />
      </Tabs>
      <TabPanel value={value} index={0}>
        Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute, non
        cupidatat skateboard dolor brunch.
      </TabPanel>
      <TabPanel value={value} index={1}>
        Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute, non
        cupidatat skateboard dolor brunch.
      </TabPanel>
      <TabPanel value={value} index={2}>
        Nihil anim keffiyeh helvetica, craft beer labore wes anderson cred nesciunt sapiente ea proident.
      </TabPanel>
      <TabPanel value={value} index={3}>
        Nihil anim keffiyeh helvetica, craft beer labore wes anderson cred nesciunt sapiente ea proident. Ad vegan excepteur butcher vice
        lomo. 3 wolf moon officia aute, non cupidatat skateboard dolor brunch.
      </TabPanel>
    </>
  );
}
