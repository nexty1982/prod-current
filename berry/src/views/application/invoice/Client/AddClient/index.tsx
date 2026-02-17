import React from 'react';
import { Link } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

// project imports
import PersonalInformation from './PersonalInformation';
import ContactDetail from './ContactDetail';
import Address from './Address';
import OtherDetail from './OtherDetail';
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { gridSpacing } from 'store/constant';

// assets
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import PersonAddTwoTone from '@mui/icons-material/PersonAddTwoTone';
import PinDropTwoTone from '@mui/icons-material/PinDropTwoTone';
import RecentActorsIcon from '@mui/icons-material/RecentActors';

// types
import { TabsProps } from 'types';

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
    label: 'Personal information',
    icon: <PersonAddTwoTone />,
    caption: 'Profile Settings'
  },
  {
    label: 'Contact detail',
    icon: <RecentActorsIcon />,
    caption: 'Contact Information'
  },
  {
    label: 'Address detail',
    icon: <PinDropTwoTone />,
    caption: 'Address detail'
  },
  {
    label: 'Other Detail',
    icon: <WorkTwoToneIcon />,
    caption: 'Update Profile Security'
  }
];

interface Props {
  isOpen?: boolean;
  handleDialogToggler?: () => void;
}

// ==============================|| ADD CLIENT ||============================== //

export default function AddClient({ isOpen = false, handleDialogToggler }: Props) {
  const { mode, borderRadius } = useConfig();
  const [value, setValue] = React.useState<number>(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <MainCard title="Add New Client" content={false}>
          <Grid container spacing={gridSpacing}>
            <Grid size={{ xs: 12, lg: 3 }}>
              <CardContent sx={{ pr: 0 }}>
                <Tabs
                  value={value}
                  onChange={handleChange}
                  orientation="vertical"
                  variant="scrollable"
                  sx={{
                    '& .MuiTabs-flexContainer': {
                      borderBottom: 'none'
                    },
                    '& button': {
                      color: mode === ThemeMode.DARK ? 'grey.600' : 'grey.900',
                      minHeight: 'auto',
                      minWidth: '100%',
                      py: 1.5,
                      px: 2,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      borderRadius: `${borderRadius}px`
                    },
                    '& button.Mui-selected': {
                      color: 'primary.main',
                      bgcolor: mode === ThemeMode.DARK ? 'dark.main' : 'grey.50'
                    },
                    '& button > svg': {
                      marginBottom: '0px !important',
                      marginRight: 1.25,
                      marginTop: 1.25,
                      height: 20,
                      width: 20
                    },
                    '& button > div > span': {
                      display: 'block'
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
                        <Grid container direction="column">
                          <Typography variant="subtitle1" color="inherit">
                            {tab.label}
                          </Typography>
                          <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                            {tab.caption}
                          </Typography>
                        </Grid>
                      }
                      {...a11yProps(index)}
                    />
                  ))}
                </Tabs>
              </CardContent>
            </Grid>
            <Grid size={{ xs: 12, lg: 9 }}>
              <CardContent
                sx={{
                  borderLeft: '1px solid',
                  borderColor: mode === ThemeMode.DARK ? 'background.default' : 'grey.200',
                  height: '100%'
                }}
              >
                <TabPanel value={value} index={0}>
                  <PersonalInformation />
                </TabPanel>
                <TabPanel value={value} index={1}>
                  <ContactDetail />
                </TabPanel>
                <TabPanel value={value} index={2}>
                  <Address />
                </TabPanel>
                <TabPanel value={value} index={3}>
                  <OtherDetail />
                </TabPanel>
              </CardContent>
            </Grid>
          </Grid>
          <Divider />
          <CardActions>
            <Grid container spacing={0} sx={{ justifyContent: 'space-between', width: 1 }}>
              <Grid>
                {value > 0 && (
                  <AnimateButton>
                    <Button variant="outlined" size="large" onClick={(e) => handleChange(e, value - 1)}>
                      Back
                    </Button>
                  </AnimateButton>
                )}
              </Grid>
              <Grid>
                {value < 3 && (
                  <Stack spacing={1.5} direction="row">
                    <AnimateButton>
                      <Button variant="outlined" size="large">
                        Save
                      </Button>
                    </AnimateButton>
                    <AnimateButton>
                      <Button variant="contained" size="large" onClick={(e) => handleChange(e, 1 + value)}>
                        Continue
                      </Button>
                    </AnimateButton>
                  </Stack>
                )}
                {value === 3 && (
                  <AnimateButton>
                    <Button
                      variant="contained"
                      size="large"
                      {...(!isOpen && { component: Link, to: '/apps/invoice/client/client-list' })}
                      {...(isOpen && handleDialogToggler && { onClick: () => handleDialogToggler() })}
                    >
                      Save
                    </Button>
                  </AnimateButton>
                )}
              </Grid>
            </Grid>
          </CardActions>
        </MainCard>
      </Grid>
    </Grid>
  );
}
