import { useState } from 'react';

// mui
import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import Chip, { ChipProps } from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// third party
import { Chance } from 'chance';

// project imports
import AddLeadDialog from './AddLeadDialog';
import NewMessage from './NewMessage';
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import EditTwoTone from '@mui/icons-material/EditTwoTone';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import FacebookIcon from '@mui/icons-material/Facebook';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// types
import { Order } from 'types/customer';

const chance = new Chance();

interface Props {
  row: Order;
  selected: string[];
  handleClick: (name: string) => void;
}

// ==============================|| LEAD LIST - TABLE BODY ||============================== //

export default function LeadTableBody({ row, selected, handleClick }: Props) {
  const { mode, borderRadius } = useConfig();

  let name = chance.name();

  const [open, setOpen] = useState(false);
  const [openMsgDialog, setOpenMsgDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);

  const isSelected = (name: string) => selected.indexOf(name) !== -1;
  const isItemSelected = isSelected(row.name);

  const handleToggleAddDialog = () => {
    setOpenAddDialog(!openAddDialog);
  };

  // open dialog to edit review
  const handleToggleMsgDialog = () => {
    setOpenMsgDialog(!openMsgDialog);
  };

  let icon;
  let followup;
  let label;
  let color: ChipProps['color'];

  switch (row.status) {
    case 1:
      followup = 'Yes';
      label = 'Qualified';
      color = 'warning';
      break;
    case 2:
      followup = 'Yes';
      label = 'Contacted';
      color = 'success';
      break;
    case 3:
    default:
      followup = 'No';
      label = 'Lost';
      color = 'error';
  }

  switch (Math.floor(Math.random() * 4 + 1)) {
    case 1:
      icon = <CallOutlinedIcon color="success" />;
      break;
    case 2:
      icon = <FacebookIcon color="primary" />;
      break;
    case 3:
      icon = <LinkedInIcon color="inherit" />;
      break;
    case 4:
    default:
      icon = <InsertLinkIcon color="info" />;
  }

  return (
    <>
      <TableRow hover role="checkbox" aria-checked={isItemSelected} tabIndex={-1} selected={isItemSelected}>
        <TableCell sx={{ pl: 3 }} onClick={() => handleClick(row.name)}>
          <Checkbox color="primary" checked={isItemSelected} />
        </TableCell>
        <TableCell sx={{ cursor: 'pointer' }}>#{row.id}</TableCell>
        <TableCell>
          <Typography variant="h5" onClick={() => handleClick(row.name)}>
            {row.name.slice(0, -2)}
          </Typography>
        </TableCell>
        <TableCell>
          <Stack direction="row" sx={{ justifyContent: 'center', alignItems: 'center' }}>
            <IconButton>
              <EmailOutlinedIcon />
            </IconButton>
            <Tooltip title="Message">
              <IconButton onClick={handleToggleMsgDialog}>
                <ForumOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
        <TableCell align="center">{icon}</TableCell>
        <TableCell>
          <Chip label={label} size="small" color={color} />
        </TableCell>
        <TableCell>
          <Tooltip title={name} placement="right" arrow>
            <Avatar alt="User 1" src={getImageUrl(`avatar-${Math.floor(Math.random() * 9) + 1}.png`, ImagePath.USERS)} />
          </Tooltip>
        </TableCell>
        <TableCell>
          <Stack sx={{ width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }}>{chance.company()}</Stack>
        </TableCell>
        <TableCell>{chance.phone()}</TableCell>
        <TableCell>{Math.floor(Math.random() * 12) + 1} month ago</TableCell>
        <TableCell>{followup}</TableCell>
        <TableCell>{Math.floor(Math.random() * 3) + 1} year ago</TableCell>
        <TableCell sx={{ pr: 3 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow sx={{ bgcolor: mode === ThemeMode.DARK ? 'background.default' : 'grey.50' }}>
        <TableCell sx={{ py: 0 }} colSpan={13}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            {open && (
              <Box sx={{ p: 2 }}>
                <Stack spacing={2} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Avatar alt="User 1" src={getImageUrl(`avatar-${Math.floor(Math.random() * 5) + 1}.png`, ImagePath.USERS)} />
                    <Stack>
                      <Typography variant="subtitle2">Assigned name</Typography>
                      <Typography variant="h5">{name}</Typography>
                    </Stack>
                  </Stack>
                  <Stack sx={{ justifyContent: 'center' }}>
                    <Typography variant="subtitle2">Name</Typography>
                    <Typography variant="h5">{row.name.slice(0, -2)}</Typography>
                  </Stack>
                  <Stack sx={{ justifyContent: 'center' }}>
                    <Typography variant="subtitle2">Created date</Typography>
                    <Typography variant="h5">{Math.floor(Math.random() * 12) + 1} month ago</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.25} sx={{ justifyContent: 'center' }}>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={handleToggleAddDialog}
                      sx={{
                        borderRadius: `${borderRadius}px`,
                        p: 1.25,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <EditTwoTone />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      sx={{
                        borderRadius: `${borderRadius}px`,
                        p: 1.25,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <DeleteOutlineOutlined />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Collapse>
        </TableCell>
      </TableRow>
      <AddLeadDialog {...{ open: openAddDialog, handleToggleAddDialog, row }} />
      <NewMessage {...{ open: openMsgDialog, handleToggleMsgDialog }} />
    </>
  );
}
