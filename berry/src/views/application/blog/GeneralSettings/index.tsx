import React from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import Box from '@mui/material/Box';

// project imports
import Drafts from './Drafts';
import Articles from './Articles';
import YourLibrary from './YourLibrary';
import GeneralSetting from './GeneralSetting';

import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// types
import { TabsProps } from 'types';

// assets
import AddIcon from '@mui/icons-material/Add';
import InboxTwoToneIcon from '@mui/icons-material/InboxTwoTone';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import LibraryBooksTwoToneIcon from '@mui/icons-material/LibraryBooksTwoTone';

// tabs
function TabPanel({ children, value, index, ...other }: TabsProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <div>{children}</div>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

// tabs option
const tabsOption = [
  {
    label: 'General Setting',
    icon: <BuildOutlinedIcon />
  },
  {
    label: 'Articles',
    icon: <LibraryBooksTwoToneIcon />
  },
  {
    label: 'Drafts',
    icon: <InboxTwoToneIcon />
  },
  {
    label: 'Your library',
    icon: <LibraryBooksTwoToneIcon />
  }
];

// ==============================|| BLOG GENERAL SETTINGS PAGE ||============================== //

export default function GeneralSettings() {
  const { mode, borderRadius } = useConfig();
  const navigate = useNavigate();
  const [value, setValue] = React.useState<number>(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Stack sx={{ gap: gridSpacing }}>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          sx={{ textTransform: 'none' }}
          onClick={() => navigate('/apps/blog/add-new')}
          startIcon={<AddIcon />}
        >
          Create a new team blog
        </Button>
      </Stack>
      <MainCard content={false}>
        <Grid container spacing={{ xs: 1, lg: gridSpacing }}>
          <Grid size={{ xs: 12, lg: 3 }}>
            <Box sx={{ p: 3, pb: 0 }}>
              <Tabs
                value={value}
                onChange={handleChange}
                orientation="vertical"
                variant="scrollable"
                sx={{
                  '& .MuiTabs-flexContainer': {
                    borderBottom: 'none'
                  },
                  '& .MuiTab-root': {
                    color: 'grey.600',
                    minHeight: 'auto',
                    minWidth: '100%',
                    py: 2,
                    px: 2,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    borderRadius: `${borderRadius}px`,
                    '&.Mui-selected': {
                      color: 'primary.main'
                    },
                    '& > svg': {
                      marginBottom: 0,
                      marginRight: 1.25,
                      height: 24,
                      width: 24
                    },
                    '& > div > span': {
                      display: 'block'
                    }
                  },
                  '& > div > span': {
                    display: 'none'
                  }
                }}
              >
                {tabsOption.map((tab, index) => (
                  <Tab
                    key={index}
                    icon={tab.icon}
                    label={
                      <Typography variant="body1" color="inherit" sx={{ fontWeight: 500, mb: -0.25 }}>
                        {tab.label}
                      </Typography>
                    }
                    {...a11yProps(index)}
                  />
                ))}
              </Tabs>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, lg: 9 }}>
            <Box
              sx={{
                borderLeft: '1px solid',
                borderColor: mode === ThemeMode.DARK ? 'divider' : 'grey.200',
                height: '100%',
                p: 0
              }}
            >
              <TabPanel value={value} index={0}>
                <GeneralSetting />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <Articles />
              </TabPanel>
              <TabPanel value={value} index={2}>
                <Drafts />
              </TabPanel>
              <TabPanel value={value} index={3}>
                <YourLibrary />
              </TabPanel>
            </Box>
          </Grid>
        </Grid>
        <Divider />
        <CardActions>
          <Button variant="contained" size="large" sx={{ display: 'block', ml: 'auto' }}>
            Update
          </Button>
        </CardActions>
      </MainCard>
    </Stack>
  );
}
