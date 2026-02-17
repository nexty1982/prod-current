// material-ui
import Checkbox from '@mui/material/Checkbox';
import Chip, { ChipProps } from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// third party
import { Chance } from 'chance';
import { random } from 'lodash-es';

// assets
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import AvTimerOutlinedIcon from '@mui/icons-material/AvTimerOutlined';
import CachedIcon from '@mui/icons-material/Cached';
import CancelIcon from '@mui/icons-material/Cancel';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';

// types
import { Order } from 'types/customer';

const chance = new Chance();

interface FollowupTableProps {
  labelId: any;
  row: Order;
  selected: string[];
  handleClick: (name: string) => void;
}

// ==============================|| REMINDERS & FOLLOWUP - TABLE BODY ||============================== //

export default function FollowupTableBody({ labelId, row, selected, handleClick }: FollowupTableProps) {
  const isSelected = (name: string) => selected.indexOf(name) !== -1;
  const isItemSelected = isSelected(row.name);
  const date = new Date(new Date().getTime() - random(0, 28) * 24 * 60 * 60 * 1000);

  let follwup;
  let label;
  let color: ChipProps['color'];
  let rowStatus;
  let nameStatus;

  switch (Math.floor(Math.random() * 3 + 1)) {
    case 1:
      label = 'High';
      color = 'success';
      nameStatus = <CheckCircleIcon color="success" fontSize="small" />;
      break;
    case 2:
      label = 'Medium';
      color = 'warning';
      nameStatus = <CancelIcon color="error" fontSize="small" />;
      break;
    case 3:
    default:
      label = 'Low';
      color = 'error';
      nameStatus = <CachedIcon color="primary" fontSize="small" />;
  }

  switch (row.status) {
    case 1:
      follwup = 'survey';
      rowStatus = (
        <Tooltip title="Completed" placement="right-end" arrow>
          <CheckCircleIcon color="success" />
        </Tooltip>
      );
      break;
    case 2:
      follwup = 'upcoming project';
      rowStatus = (
        <Tooltip title="New" placement="right-end" arrow>
          <AvTimerOutlinedIcon color="primary" />
        </Tooltip>
      );
      break;
    case 4:
      follwup = 'Defect';
      rowStatus = (
        <Tooltip title="Paid" placement="right-end" arrow>
          <CheckCircleOutlinedIcon color="success" />
        </Tooltip>
      );
      break;
    case 5:
      rowStatus = (
        <Tooltip title="Cancelled" placement="right-end" arrow>
          <CancelOutlinedIcon color="error" />
        </Tooltip>
      );
      break;
    case 3:
    default:
      follwup = 'specific issue';
      rowStatus = (
        <Tooltip title="Pending" placement="right-end" arrow>
          <AccessTimeOutlinedIcon color="warning" />
        </Tooltip>
      );
  }

  return (
    <TableRow hover role="checkbox" aria-checked={isItemSelected} tabIndex={-1} selected={isItemSelected}>
      <TableCell padding="checkbox" sx={{ pl: 3 }} onClick={() => handleClick(row.name)}>
        <Checkbox color="primary" checked={isItemSelected} slotProps={{ input: { 'aria-labelledby': labelId } }} />
      </TableCell>
      <TableCell id={labelId}>#{row.id}</TableCell>
      <TableCell>
        <Stack spacing={1.25} direction="row" onClick={() => handleClick(row.name)} sx={{ alignItems: 'center', cursor: 'pointer' }}>
          <Avatar alt="User 1" src={getImageUrl(`avatar-${Math.floor(Math.random() * 9) + 1}.png`, ImagePath.USERS)} />
          <Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography variant="h5">{row.name.slice(0, -2)}</Typography>
              {nameStatus}
            </Stack>
            <Typography variant="subtitle2">{row.company}</Typography>
          </Stack>
        </Stack>
      </TableCell>
      <TableCell>
        <Stack sx={{ width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }}>{chance.company()}</Stack>
      </TableCell>
      <TableCell>{chance.phone()}</TableCell>
      <TableCell>{date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear()}</TableCell>
      <TableCell>{follwup}</TableCell>
      <TableCell>
        <Chip label={label} size="small" color={color} />
      </TableCell>
      <TableCell align="center">{rowStatus}</TableCell>
      <TableCell>
        <Link href="#">Instruction.doc</Link>
      </TableCell>
      <TableCell align="center" sx={{ pr: 3 }}>
        <IconButton color="primary" size="large" aria-label="View">
          <VisibilityTwoToneIcon />
        </IconButton>
        <IconButton color="secondary" size="large" aria-label="View">
          <EditTwoToneIcon />
        </IconButton>
        <IconButton color="error" size="large" aria-label="View">
          <DeleteTwoToneIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
