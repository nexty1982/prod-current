import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import AvatarGroup from '@mui/material/AvatarGroup';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import { gridSpacing } from 'store/constant';
import { UserProfileStyle2 } from 'types/user';
import { dispatch, useSelector } from 'store';
import { getUsersListStyle2 } from 'store/slices/user';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Avatar3 from 'assets/images/users/avatar-3.png';
import Avatar4 from 'assets/images/users/avatar-4.png';
import Avatar5 from 'assets/images/users/avatar-5.png';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChatBubbleTwoToneIcon from '@mui/icons-material/ChatBubbleTwoTone';
import BlockTwoToneIcon from '@mui/icons-material/BlockTwoTone';

// ==============================|| USER LIST 2 ||============================== //

export default function UserCard() {
  const theme = useTheme();

  const [rows, setRows] = React.useState<UserProfileStyle2[]>([]);
  const { usersS2 } = useSelector((state) => state.user);

  React.useEffect(() => {
    setRows(usersS2);
  }, [usersS2]);

  React.useEffect(() => {
    dispatch(getUsersListStyle2());
  }, []);

  return (
    <TableContainer>
      <Table
        sx={{
          '& td': {
            whiteSpace: 'nowrap'
          },
          '& td:first-of-type': {
            pl: 0
          },
          '& td:last-of-type': {
            pr: 0,
            minWidth: 260
          },
          '& tbody tr:last-of-type  td': {
            borderBottom: 'none'
          },
          [theme.breakpoints.down('xl')]: {
            '& tr:not(:last-of-type)': {
              borderBottom: '1px solid',
              borderBottomColor: theme.palette.mode === ThemeMode.DARK ? 'rgb(132, 146, 196, .2)' : 'rgba(224, 224, 224, 1)'
            },
            '& td': {
              display: 'inline-block',
              borderBottom: 'none',
              pl: 0
            },
            '& td:first-of-type': {
              display: 'block'
            }
          }
        }}
      >
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              <TableCell>
                <Grid container spacing={2}>
                  <Grid>
                    <Avatar alt="User 1" src={getImageUrl(`${row.image}`, ImagePath.USERS)} sx={{ width: 60, height: 60 }} />
                  </Grid>
                  <Grid size={{ sm: 'grow' }}>
                    <Grid container spacing={1}>
                      <Grid size={12}>
                        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                          <Typography variant="subtitle1">{row.name}</Typography>
                          {row.badgeStatus === 'active' && <CheckCircleIcon sx={{ color: 'success.dark', width: 14, height: 14 }} />}
                        </Stack>
                        <Typography variant="subtitle2" sx={{ whiteSpace: 'break-spaces' }}>
                          {row.designation}
                        </Typography>
                      </Grid>
                      <Grid size={12}>
                        <Typography variant="body2" sx={{ whiteSpace: 'break-spaces' }}>
                          {row.subContent}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </TableCell>
              <TableCell>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <Typography variant="caption">Email</Typography>
                    <Typography variant="h6">{row.email}</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="caption">Phone</Typography>
                    <Typography variant="h6">{row.phone}</Typography>
                  </Grid>
                </Grid>
              </TableCell>
              <TableCell>
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="caption">Location</Typography>
                    <Typography variant="h6">{row.location}</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Grid container>
                      <AvatarGroup
                        max={4}
                        sx={{
                          '& .MuiAvatar-root': {
                            width: 32,
                            height: 32,
                            fontSize: '1rem'
                          }
                        }}
                      >
                        <Avatar alt="User 1" src={Avatar1} />
                        <Avatar alt="User 2" src={Avatar2} />
                        <Avatar alt="User 3" src={Avatar3} />
                        <Avatar alt="User 4" src={Avatar4} />
                        <Avatar alt="User 5" src={Avatar5} />
                      </AvatarGroup>
                    </Grid>
                  </Grid>
                </Grid>
              </TableCell>
              <TableCell>
                <Grid container spacing={3}>
                  <Grid size={12}>
                    <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
                      <Grid>
                        <Typography variant="caption">Progress</Typography>
                      </Grid>
                      <Grid size={{ sm: 'grow' }}>
                        <LinearProgress variant="determinate" value={56} color="primary" sx={{ minWidth: 90 }} aria-label="user-progress" />
                      </Grid>
                      <Grid>
                        <Typography variant="h6">{row.progressValue}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid container spacing={1} size={12}>
                    <Grid size={6}>
                      <Button variant="outlined" fullWidth size="small" sx={{ minWidth: 120 }} startIcon={<ChatBubbleTwoToneIcon />}>
                        Message
                      </Button>
                    </Grid>
                    <Grid size={6}>
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        size="small"
                        sx={{ minWidth: 120 }}
                        startIcon={<BlockTwoToneIcon />}
                      >
                        Block
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
