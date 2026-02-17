// material-ui
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import useAuth from 'hooks/useAuth';
import Avatar from 'ui-component/extended/Avatar';
import SubCard from 'ui-component/cards/SubCard';

import { gridSpacing } from 'store/constant';

// assets
import { IconEdit } from '@tabler/icons-react';
import PhonelinkRingTwoToneIcon from '@mui/icons-material/PhonelinkRingTwoTone';
import PinDropTwoToneIcon from '@mui/icons-material/PinDropTwoTone';
import MailTwoToneIcon from '@mui/icons-material/MailTwoTone';

import Avatar3 from 'assets/images/users/avatar-3.png';

// progress
function LinearProgressWithLabel({ value, ...others }: LinearProgressProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Box
        sx={{
          width: '100%',
          mr: 1
        }}
      >
        <LinearProgress value={value} {...others} />
      </Box>
      <Box
        sx={{
          minWidth: 35
        }}
      >
        <Typography variant="body2" color="textSecondary">{`${Math.round(value!)}%`}</Typography>
      </Box>
    </Box>
  );
}

// personal details table
/** names Don&apos;t look right */
function createData(name: string, calories?: string, fat?: string, carbs?: string, protein?: string) {
  return { name, calories, fat, carbs, protein };
}

// ==============================|| PROFILE 1 - PROFILE ||============================== //

export default function Profile() {
  const { user } = useAuth();

  const rows = [
    createData('Full Name', ':', user?.name),
    createData('Fathers Name', ':', 'Mr. Deepen Handgun'),
    createData('Address', ':', 'Street 110-B Kalians Bag, Dewan, M.P. INDIA'),
    createData('Zip Code', ':', '12345'),
    createData('Phone', ':', '+0 123456789 , +0 123456789'),
    createData('Email', ':', 'support@example.com'),
    createData('Website', ':', 'http://example.com')
  ];

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ lg: 4, xs: 12 }}>
        <SubCard
          title={
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid>
                <Avatar alt="User 1" src={Avatar3} />
              </Grid>
              <Grid size="grow">
                <Typography variant="subtitle1">{user?.name}</Typography>
                <Typography variant="subtitle2">UI/UX Designer</Typography>
              </Grid>
              <Grid>
                <Chip size="small" label="Pro" color="primary" variant="filled" />
              </Grid>
            </Grid>
          }
        >
          <List component="nav" aria-label="main mailbox folders">
            <ListItemButton>
              <ListItemIcon>
                <MailTwoToneIcon sx={{ fontSize: '1.3rem' }} />
              </ListItemIcon>
              <ListItemText primary={<Typography variant="subtitle1">Email</Typography>} />
              <Typography variant="subtitle2" align="right">
                demo@sample.com
              </Typography>
            </ListItemButton>
            <Divider />
            <ListItemButton>
              <ListItemIcon>
                <PhonelinkRingTwoToneIcon sx={{ fontSize: '1.3rem' }} />
              </ListItemIcon>
              <ListItemText primary={<Typography variant="subtitle1">Phone</Typography>} />
              <Typography variant="subtitle2" align="right">
                (+99) 9999 999 999
              </Typography>
            </ListItemButton>
            <Divider />
            <ListItemButton>
              <ListItemIcon>
                <PinDropTwoToneIcon sx={{ fontSize: '1.3rem' }} />
              </ListItemIcon>
              <ListItemText primary={<Typography variant="subtitle1">Location</Typography>} />
              <Typography variant="subtitle2" align="right">
                Melbourne
              </Typography>
            </ListItemButton>
          </List>
          <CardContent>
            <Grid container spacing={0}>
              <Grid size={4}>
                <Typography align="center" variant="h3">
                  37
                </Typography>
                <Typography align="center" variant="subtitle2">
                  Mails
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography align="center" variant="h3">
                  2749
                </Typography>
                <Typography align="center" variant="subtitle2">
                  Followers
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography align="center" variant="h3">
                  678
                </Typography>
                <Typography align="center" variant="subtitle2">
                  Following
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </SubCard>
      </Grid>
      <Grid size={{ lg: 8, xs: 12 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <SubCard
              title="About me"
              secondary={
                <Button>
                  <IconEdit stroke={1.5} size="20px" aria-label="Edit Details" />
                </Button>
              }
            >
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Typography variant="body2">
                    Hello,I’m Anshan Handgun Creative Graphic Designer & User Experience Designer based in Website, I create digital
                    Products a more Beautiful and usable place. Morbid accusant ipsum. Nam nec tellus at.
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="subtitle1">Personal Details</Typography>
                </Grid>

                <Grid size={12}>
                  <TableContainer>
                    <Table sx={{ '& td': { borderBottom: 'none' } }} size="small">
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.name}>
                            <TableCell variant="head">{row.name}</TableCell>
                            <TableCell>{row.calories}</TableCell>
                            <TableCell>{row.fat}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
          <Grid size={12}>
            <SubCard title="Education">
              <Grid container spacing={1}>
                <Grid size={12}>
                  <Grid container>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="subtitle1">2014-2017</Typography>
                      <Typography variant="subtitle2">Master Degree</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Typography variant="subtitle1">Master Degree in Computer Application</Typography>
                      <Typography variant="subtitle2">University of Oxford, England</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid sx={{ display: { xs: 'block', sm: 'none' } }} size={12}>
                  <Divider />
                </Grid>
                <Grid size={12}>
                  <Grid container>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="subtitle1">2011-2013</Typography>
                      <Typography variant="subtitle2">Bachelor</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Typography variant="subtitle1">Bachelor Degree in Computer Engineering</Typography>
                      <Typography variant="subtitle2">Imperial College London</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid sx={{ display: { xs: 'block', sm: 'none' } }} size={12}>
                  <Divider />
                </Grid>
                <Grid size={12}>
                  <Grid container>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="subtitle1">2009-2011</Typography>
                      <Typography variant="subtitle2">School</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Typography variant="subtitle1">Higher Secondary Education</Typography>
                      <Typography variant="subtitle2">School of London, England</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
          <Grid size={12}>
            <SubCard title="Employment">
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Grid container>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="subtitle1">Current</Typography>
                      <Typography variant="subtitle2">Senior</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Typography variant="subtitle1">Senior UI/UX designer</Typography>
                      <Typography variant="subtitle2">
                        Perform task related to project manager with the 100+ team under my observation. Team management is key role in this
                        company.
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid sx={{ display: { xs: 'block', sm: 'none' } }} size={12}>
                  <Divider />
                </Grid>
                <Grid size={12}>
                  <Grid container>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="subtitle1">2017-2019</Typography>
                      <Typography variant="subtitle2">Junior</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Typography variant="subtitle1">Trainee cum Project Manager</Typography>
                      <Typography variant="subtitle2">Microsoft, TX, USA</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
          <Grid size={12}>
            <SubCard title="Skills">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">Junior</Typography>
                  <LinearProgressWithLabel color="primary" variant="determinate" value={70} aria-label="junior-skill-progress" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">UX Researcher</Typography>
                  <LinearProgressWithLabel color="primary" variant="determinate" value={80} aria-label="UX-Researcher-skill-progress" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">Wordpress</Typography>
                  <LinearProgressWithLabel color="secondary" variant="determinate" value={25} aria-label="Wordpress-skill-progress" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">Graphic Designer</Typography>
                  <LinearProgressWithLabel color="primary" variant="determinate" value={80} aria-label="Designer-skill-progress" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">HTML</Typography>
                  <LinearProgressWithLabel color="secondary" variant="determinate" value={45} aria-label="HTML-skill-progress" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">PHP</Typography>
                  <LinearProgressWithLabel color="primary" variant="determinate" value={65} aria-label="PHP-skill-progress" />
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
