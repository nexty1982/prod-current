// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';

// types
import { Products } from 'types/e-commerce';

// assets
import { ImagePath, getImageUrl } from 'utils/getImageUrl';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';

interface RowDetailProps {
  rowValue: Products;
  handleDrawerClose: () => void;
}

// ==============================|| ITEM - DRAWER DETAILS ||============================== //

export default function ItemDetails({ rowValue, handleDrawerClose }: RowDetailProps) {
  const theme = useTheme();
  const downSM = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Grid container spacing={1.5}>
      <Grid size={12}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 1.5, ml: '-10px' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton onClick={handleDrawerClose} sx={{ mr: 1.25, ...(downSM && { p: 0 }) }}>
              {theme.direction === 'rtl' ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
            <Typography variant="h4">View Details</Typography>
          </Stack>
          <Stack spacing={1} sx={{ justifyContent: 'flex-end' }}>
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
        <Box
          sx={{
            bgcolor: 'primary.light',
            my: -1.5,
            ...(theme.palette.mode === ThemeMode.DARK && {
              bgcolor: 'dark.main',
              borderTop: '1px solid',
              borderBottom: '1px solid',
              borderColor: 'primary.200'
            })
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 2.5 }}>
            <Stack direction={'row'} spacing={1}>
              <Stack spacing={1}>
                <Avatar
                  alt="'product images'"
                  src={rowValue?.image && getImageUrl(`${rowValue?.image}`, ImagePath.ECOMMERCE)}
                  size="xs"
                  variant="rounded"
                />
              </Stack>
              <Stack spacing={1} direction="row" sx={{ alignItems: 'center', width: { xs: '180px', sm: '218px', md: '251px' } }}>
                <Typography variant="h4">{rowValue?.name}</Typography>
              </Stack>
            </Stack>
            <Stack sx={{ alignItems: 'flex-end' }}>
              <Typography variant="h4">£5678.09</Typography>
              <Typography variant="subtitle2">Balance</Typography>
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
              <Typography variant="h5">Basic Information</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">{rowValue?.quantity}</Typography>
              <Typography variant="subtitle2">Quantity</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">{rowValue?.rating && Math.round(rowValue?.rating)}</Typography>
              <Typography variant="subtitle2">Unit</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">{rowValue?.discount}%</Typography>
              <Typography variant="subtitle2">Tax</Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle1">{rowValue?.about}</Typography>
              <Typography variant="subtitle2">Description</Typography>
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
              <Typography variant="h5">Sales Information</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">{rowValue?.discount}%</Typography>
              <Typography variant="subtitle2">CESS%</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">USD</Typography>
              <Typography variant="subtitle2">Currency</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle1">demo@gmail.com</Typography>
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
              <Typography variant="subtitle1">Silver Business Point, nr. VIP Circle, Uttran, Surat, Gujarat 394105</Typography>
              <Typography variant="subtitle2">Address</Typography>
            </Grid>
          </Grid>
        </Box>
      </Grid>
    </Grid>
  );
}
