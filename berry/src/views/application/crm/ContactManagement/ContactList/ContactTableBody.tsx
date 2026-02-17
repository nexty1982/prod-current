import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Chip, { ChipProps } from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// third party
import { Chance } from 'chance';
import { random } from 'lodash-es';

// project imports
import AddContactDialog from './AddContactDialog';
import ContactNewMessage from './NewMessage';
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import LinkIcon from '@mui/icons-material/Link';
import CachedIcon from '@mui/icons-material/Cached';
import CancelIcon from '@mui/icons-material/Cancel';
import ChatBubbleTwoToneIcon from '@mui/icons-material/ChatBubbleTwoTone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import EditTwoTone from '@mui/icons-material/EditTwoTone';
import FacebookIcon from '@mui/icons-material/Facebook';
import GoogleIcon from '@mui/icons-material/Google';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MoreVertTwoTone from '@mui/icons-material/MoreVertTwoTone';
import PhoneTwoToneIcon from '@mui/icons-material/PhoneTwoTone';
import TwitterIcon from '@mui/icons-material/Twitter';

// types
import { Order } from 'types/customer';

const chance = new Chance();

interface ContactTableProps {
  row: Order;
  selected: string[];
  handleClick: (name: string) => void;
}

// ==============================|| CONTACT - TABLE BODY ||============================== //

export default function ContactTableBody({ row, selected, handleClick }: ContactTableProps) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [openMsgDialog, setOpenMsgDialog] = React.useState(false);
  const [openAddDialog, setOpenAddDialog] = React.useState(false);

  const handleToggleAddDialog = () => {
    setOpenAddDialog(!openAddDialog);
  };

  const date = new Date(new Date().getTime() - random(0, 28) * 24 * 60 * 60 * 1000);
  const birthDate = new Date(new Date().setTime(random(0, 18) * 365 * 24 * 60 * 60 * 1000));

  const isSelected = (name: string) => selected.indexOf(name) !== -1;
  const isItemSelected = isSelected(row.name);

  // open dialog to edit review
  const handleToggleMsgDialog = () => {
    setOpenMsgDialog(!openMsgDialog);
  };

  let color: ChipProps['color'];
  let label;
  let statusIcon;

  switch (row.status) {
    case 1:
      color = 'success';
      label = 'Verify';
      statusIcon = <CheckCircleIcon color="success" fontSize="small" />;
      break;
    case 2:
      label = 'Reject';
      color = 'error';
      statusIcon = <CancelIcon color="error" fontSize="small" />;
      break;
    case 3:
    default:
      color = 'warning';
      label = 'New';
      statusIcon = <CachedIcon color="primary" fontSize="small" />;
  }

  let icon;

  switch (Math.floor(Math.random() * 4 + 1)) {
    case 1:
      icon = <TwitterIcon color="info" />;
      break;
    case 2:
      icon = <GoogleIcon color="error" />;
      break;
    case 4:
      icon = <FacebookIcon color="primary" />;
      break;
    case 3:
    default:
      icon = <LinkedInIcon color="inherit" />;
  }

  return (
    <>
      <TableRow hover role="checkbox" aria-checked={isItemSelected} tabIndex={-1} selected={isItemSelected}>
        <TableCell sx={{ pl: 3 }} onClick={() => handleClick(row.name)}>
          <Checkbox color="primary" checked={isItemSelected} />
        </TableCell>
        <TableCell>#{row.id}</TableCell>
        <TableCell sx={{ cursor: 'pointer' }}>
          <Stack spacing={1.25} direction="row" onClick={() => handleClick(row.name)} sx={{ alignItems: 'center' }}>
            <Avatar alt="User 1" src={getImageUrl(`avatar-${Math.floor(Math.random() * 9) + 1}.png`, ImagePath.USERS)} />
            <Stack>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography variant="h5">{row.name.slice(0, -2)}</Typography>
                {statusIcon}
              </Stack>
              <Typography variant="subtitle2">{row.company}</Typography>
            </Stack>
          </Stack>
        </TableCell>
        <TableCell>{chance.company()}</TableCell>
        <TableCell>{chance.phone()}</TableCell>
        <TableCell>
          <Chip label={label} size="small" color={color} />
        </TableCell>
        <TableCell align="center">{chance.address()}</TableCell>
        <TableCell align="center">{icon}</TableCell>
        <TableCell sx={{ pr: 3 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'grey.50' }}>
        <TableCell sx={{ py: 0 }} colSpan={13}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            {open && (
              <Grid container spacing={1.25} sx={{ p: 2.5 }}>
                <Grid size={12}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                    <IconButton size="small" onClick={handleToggleAddDialog}>
                      <EditTwoTone sx={{ fontSize: '1.15rem' }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                      <CloseIcon sx={{ fontSize: '1.15rem' }} />
                    </IconButton>
                    <IconButton size="small">
                      <MoreVertTwoTone sx={{ fontSize: '1.15rem' }} color="disabled" />
                    </IconButton>
                  </Stack>
                </Grid>
                <Grid container spacing={2.5} size={12}>
                  <Grid size={3}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Stack direction="row" spacing={3}>
                        <Avatar
                          alt="User 1"
                          size="lg"
                          src={getImageUrl(`avatar-${Math.floor(Math.random() * 9) + 1}.png`, ImagePath.USERS)}
                        />
                        <Grid container rowSpacing={2.5}>
                          <Grid sx={{ mt: -2.5 }} size={12}>
                            <Stack>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Typography variant="h5">{row.name.slice(0, -2)}</Typography>
                                {statusIcon}
                              </Stack>
                              <Typography variant="subtitle2">{row.company}</Typography>
                            </Stack>
                          </Grid>
                          <Grid size={12}>
                            <Stack>
                              <Typography variant="subtitle2">Birthdate</Typography>
                              <Typography variant="h5">
                                {birthDate.getDate() + '.' + (birthDate.getMonth() + 1) + '.' + birthDate.getFullYear()}
                              </Typography>
                            </Stack>
                          </Grid>
                          <Grid size={12}>
                            <Stack>
                              <Typography variant="subtitle2">Connect</Typography>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <TwitterIcon color="info" />
                                <LinkedInIcon color="inherit" />
                                <FacebookIcon color="primary" />
                              </Stack>
                            </Stack>
                          </Grid>
                        </Grid>
                      </Stack>
                      <Chip label="VIP" size="small" color="warning" />
                    </Stack>
                  </Grid>
                  <Grid container rowSpacing={2.5} size={3}>
                    <Grid size={12}>
                      <Stack>
                        <Typography variant="subtitle2">Email</Typography>
                        <Typography variant="h5">{chance.email()}</Typography>
                      </Stack>
                    </Grid>
                    <Grid size={12}>
                      <Stack>
                        <Typography variant="subtitle2">Phone</Typography>
                        <Typography variant="h5">{chance.phone()}</Typography>
                      </Stack>
                    </Grid>
                    <Grid size={12}>
                      <Stack>
                        <Typography variant="subtitle2">Website</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <LinkIcon color="primary" />
                          <Typography variant="h6">{chance.url()}</Typography>
                        </Stack>
                      </Stack>
                    </Grid>
                  </Grid>
                  <Grid container rowSpacing={2.5} size={3}>
                    <Grid size={12}>
                      <Stack>
                        <Typography variant="subtitle2">Location</Typography>
                        <Typography variant="h5">{chance.address()}</Typography>
                      </Stack>
                    </Grid>
                    <Grid size={12}>
                      <Stack>
                        <Typography variant="subtitle2">Lead Source</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <LinkIcon color="primary" />
                          <Typography variant="h6">{chance.url()}</Typography>
                        </Stack>
                      </Stack>
                    </Grid>
                    <Grid size={12}>
                      <Stack>
                        <Typography variant="subtitle2">Created Contact</Typography>
                        <Typography variant="h5">{date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear()}</Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                  <Grid size={3}>
                    <Stack sx={{ justifyContent: 'space-between', height: 1 }}>
                      <Stack>
                        <Typography variant="subtitle2">Notes</Typography>
                        <Typography variant="h5">{chance.sentence({ words: 5 })}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Button fullWidth variant="outlined" onClick={handleToggleMsgDialog} startIcon={<ChatBubbleTwoToneIcon />}>
                          Message
                        </Button>
                        <Button variant="outlined" color="secondary" fullWidth startIcon={<PhoneTwoToneIcon />}>
                          Call
                        </Button>
                      </Stack>
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Collapse>
        </TableCell>
      </TableRow>
      <ContactNewMessage {...{ open: openMsgDialog, handleToggleMsgDialog }} />
      <AddContactDialog {...{ open: openAddDialog, handleToggleAddDialog, row }} />
    </>
  );
}
