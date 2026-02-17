import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { gridSpacing } from 'store/constant';
import SubCard from 'ui-component/cards/SubCard';

// assets
import PersonOutlineTwoToneIcon from '@mui/icons-material/PersonOutlineTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import CreditCardTwoToneIcon from '@mui/icons-material/CreditCardTwoTone';
import VpnKeyTwoToneIcon from '@mui/icons-material/VpnKeyTwoTone';

// types
import { TabsProps } from 'types';

// tab content
function TabPanel({ children, value, index, ...other }: TabsProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`vertical-tabpanel-${index}`} aria-labelledby={`vertical-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`
  };
}

// ================================|| UI TABS - VERTICAL ||================================ //

export default function VerticalTabs() {
  const theme = useTheme();
  const { borderRadius } = useConfig();

  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
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
                borderRadius: `${borderRadius}px`,
                color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900',
                minHeight: 'auto',
                minWidth: '100%',
                py: 1.5,
                px: 2,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                textAlign: 'left',
                justifyContent: 'flex-start'
              },
              '& button.Mui-selected': {
                color: 'primary.main',
                bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50'
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
            <Tab
              icon={<PersonOutlineTwoToneIcon />}
              label={
                <Grid container direction="column">
                  <Typography variant="subtitle1" color="inherit">
                    User Profile
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    Profile Settings
                  </Typography>
                </Grid>
              }
              {...a11yProps(0)}
            />
            <Tab
              icon={<DescriptionTwoToneIcon />}
              label={
                <Grid container direction="column">
                  <Typography variant="subtitle1" color="inherit">
                    Billing
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    Billing Information
                  </Typography>
                </Grid>
              }
              {...a11yProps(1)}
            />
            <Tab
              icon={<CreditCardTwoToneIcon />}
              label={
                <Grid container direction="column">
                  <Typography variant="subtitle1" color="inherit">
                    Payment
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    Add & Update Card
                  </Typography>
                </Grid>
              }
              {...a11yProps(2)}
            />
            <Tab
              icon={<VpnKeyTwoToneIcon />}
              label={
                <Grid container direction="column">
                  <Typography variant="subtitle1" color="inherit">
                    Change Password
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    Update Profile Security
                  </Typography>
                </Grid>
              }
              {...a11yProps(3)}
            />
          </Tabs>
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 9 }}>
          <TabPanel value={value} index={0}>
            <SubCard>
              <Stack spacing={gridSpacing}>
                <Typography variant="body2">
                  Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute,
                  non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod.
                </Typography>
                <Typography>
                  Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute,
                  non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod.
                </Typography>
              </Stack>
            </SubCard>
          </TabPanel>
          <TabPanel value={value} index={1}>
            <SubCard>
              <Stack spacing={gridSpacing}>
                <Typography variant="body2">
                  3 wolf moon officia aute, non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod.
                </Typography>
                <Typography>
                  Brunch 3 wolf moon tempor, sunt aliqua put a bird on it squid single-origin coffee nulla assumenda shoreditch et. Nihil
                  anim keffiyeh helvetica, craft beer labore wes anderson cred nesciunt sapiente ea proident. Ad vegan excepteur butcher
                  vice lomo.
                </Typography>
              </Stack>
            </SubCard>
          </TabPanel>
          <TabPanel value={value} index={2}>
            <SubCard>
              <Stack spacing={gridSpacing}>
                <Typography variant="body2">
                  Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute,
                  non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod.
                </Typography>
                <Typography>
                  Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute,
                  non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod.
                </Typography>
              </Stack>
            </SubCard>
          </TabPanel>
          <TabPanel value={value} index={3}>
            <SubCard>
              <Stack spacing={gridSpacing}>
                <Typography variant="body2">
                  3 wolf moon officia aute, non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod.
                </Typography>
                <Typography>
                  Brunch 3 wolf moon tempor, sunt aliqua put a bird on it squid single-origin coffee nulla assumenda shoreditch et. Nihil
                  anim keffiyeh helvetica, craft beer labore wes anderson cred nesciunt sapiente ea proident. Ad vegan excepteur butcher
                  vice lomo.
                </Typography>
              </Stack>
            </SubCard>
          </TabPanel>
        </Grid>
      </Grid>
    </div>
  );
}
