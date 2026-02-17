// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Chip, { ChipProps } from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import EditTwoTone from '@mui/icons-material/EditTwoTone';
import ReceiptTwoTone from '@mui/icons-material/ReceiptTwoTone';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';

// types
import { UserProfile } from 'types/user-profile';

interface RowDetailProps {
  rowValue: UserProfile;
  handleDrawerClose: () => void;
}

// ==============================|| CLIENT LIST - DETAILS ||============================== //

export default function ClientDetails({ rowValue, handleDrawerClose }: RowDetailProps) {
  const theme = useTheme();
  const balance = Math.floor(Math.random() * 4);
  const matchesXs = useMediaQuery(theme.breakpoints.down('sm'));

  let label: string;
  let color: ChipProps['color'];

  switch (balance.toString()) {
    case '0':
      label = 'Rejected';
      color = 'error';
      break;
    case '1':
      label = 'Pending';
      color = 'warning';
      break;
    case '3':
      label = 'Verified';
      color = 'success';
      break;
    case '2':
    default:
      label = 'New';
      color = 'primary';
      break;
  }

  return (
    <Grid container spacing={1.5}>
      <Grid size={12}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 1.5 }}>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={handleDrawerClose} sx={{ mr: '10px', padding: matchesXs ? '0px' : '' }}>
              {theme.direction === 'rtl' ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
            <Button
              variant="outlined"
              sx={{
                borderRadius: 1.5,
                borderColor: 'divider',
                color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900'
              }}
              startIcon={<EditTwoTone />}
            >
              Edit
            </Button>
          </Stack>
          <Stack direction="row" spacing={{ xs: 1, sm: 2.5 }} sx={{ justifyContent: 'flex-end' }}>
            {matchesXs ? (
              <Tooltip title=" Statement View">
                <IconButton color="primary" sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'grey.300' }}>
                  <ReceiptTwoTone />
                </IconButton>
              </Tooltip>
            ) : (
              <Button variant="outlined" startIcon={<ReceiptTwoTone />} sx={{ borderRadius: 1.5 }} color="primary">
                Statement View
              </Button>
            )}
            <Tooltip title="Delete">
              <IconButton color="error" sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <DeleteOutlineOutlined />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Grid>
      <Grid size={12}>
        <Divider />
      </Grid>
      <Grid size={12}>
        <Box sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50', my: -1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 2.5 }}>
            <Stack direction={'row'} spacing={1}>
              <Stack spacing={1}>
                <Avatar
                  alt="User 1"
                  sx={{ height: '30px', width: '30px', alignItems: 'center' }}
                  src={rowValue?.avatar && getImageUrl(`${rowValue?.avatar}`, ImagePath.USERS)}
                />
              </Stack>
              <Stack>
                <Typography variant="subtitle1">
                  {rowValue?.name}
                  <Chip label={label} size="small" color={color} variant="filled" sx={{ ml: 0.75, height: '20px' }} />
                </Typography>
                <Typography variant="subtitle2" noWrap>
                  {rowValue?.role}
                </Typography>
              </Stack>
            </Stack>
            <Stack>
              <Typography variant="h4">£5678.09</Typography>
              <Typography variant="subtitle2" noWrap sx={{ textAlign: 'right' }}>
                Balance
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Grid>
      <Grid size={12}>
        <Divider />
      </Grid>
      <Grid size={12}>
        <Box sx={{ px: 2.5 }}>
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <Typography variant="h5">Company Information</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">{rowValue?.id}</Typography>
              <Typography variant="subtitle2">Vat ID number</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">Berry system</Typography>
              <Typography variant="subtitle2">Company name</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">USD</Typography>
              <Typography variant="subtitle2">Currency</Typography>
            </Grid>
          </Grid>
        </Box>
      </Grid>
      <Grid size={12}>
        <Divider />
      </Grid>
      <Grid size={12}>
        <Box sx={{ px: 2.5 }}>
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <Typography variant="h5">Contact History</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">{rowValue?.name}</Typography>
              <Typography variant="subtitle2">Name</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">{rowValue?.contact}</Typography>
              <Typography variant="subtitle2">Phone no.</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">{rowValue?.email}</Typography>
              <Typography variant="subtitle2">Email id</Typography>
            </Grid>
          </Grid>
        </Box>
      </Grid>
      <Grid size={12}>
        <Divider />
      </Grid>
      <Grid size={12}>
        <Box sx={{ px: 2.5 }}>
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <Typography variant="h5">Address detail</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">India</Typography>
              <Typography variant="subtitle2">Country</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">Gujarat</Typography>
              <Typography variant="subtitle2">State</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">Surat</Typography>
              <Typography variant="subtitle2">City</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">394105</Typography>
              <Typography variant="subtitle2">Pincode</Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle1">{rowValue?.location}</Typography>
              <Typography variant="subtitle2">Address</Typography>
            </Grid>
          </Grid>
        </Box>
      </Grid>
    </Grid>
  );
}
