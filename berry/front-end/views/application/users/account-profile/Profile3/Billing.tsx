import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CardMedia from '@mui/material/CardMedia';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// project imports
import BillCard from 'ui-component/cards/BillCard';
import SubCard from 'ui-component/cards/SubCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { gridSpacing } from 'store/constant';

// assets
import imageDiscover from 'assets/images/pages/card-discover.png';
import imageMasterCard from 'assets/images/pages/card-master.png';
import imageVisa from 'assets/images/pages/card-visa.png';

// table data
function createData(tid: string, date: string, amount: string, badgeText: string, badgeType: string) {
  return { tid, date, amount, badgeText, badgeType };
}

const rows = [
  createData('12877227695', '26 Feb 2021 9:16 am', '$56.32', 'Awaiting', 'warning'),
  createData('12901477937', '30 Jan 2021 2:54 pm', '$75.56', 'Paid', 'success'),
  createData('12767886919', '22 Jan 2021 12:01 pm', '$34.23', 'Paid', 'success')
];

const getChipColor = (badgeType: string) => {
  switch (badgeType) {
    case 'success':
    case 'error':
    case 'warning':
    case 'info':
    case 'default':
    case 'primary':
    case 'secondary':
      return badgeType; // returns valid color
    default:
      return 'default'; // fallback to a default color
  }
};

// ==============================|| PROFILE 3 - BILLING ||============================== //

export default function Billing() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <BillCard primary="Bill Due" secondary="$150.00" link="Pay Now" color="orange.dark" bg="orange.light" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <BillCard primary="Total Credits" secondary="1570 GB" link="Full Report" color="warning.dark" bg="warning.light" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <BillCard primary="Plan" secondary="Basic" link="Upgrade?" color="success.dark" bg="success.light" />
      </Grid>
      <Grid size={12}>
        <SubCard
          title="Payment Methods"
          secondary={
            <AnimateButton>
              <Button variant="contained" size="small">
                Add New Method
              </Button>
            </AnimateButton>
          }
        >
          <Grid container spacing={gridSpacing}>
            <Grid size={12}>
              <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-start', alignItems: 'center' }}>
                    <CardMedia component="img" image={imageVisa} title="payment" sx={{ width: 65 }} />
                    <Stack>
                      <Typography variant="subtitle1">Visa card</Typography>
                      <Typography variant="subtitle2">Ending in 5269 07XX XXXX 8110</Typography>
                    </Stack>
                  </Stack>
                </Grid>
                <Grid>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Chip label="Default" size="small" />
                    <Typography variant="caption" sx={{ color: 'grey.300' }}>
                      |
                    </Typography>
                    <Link component={RouterLink} to="#" underline="hover">
                      Edit
                    </Link>
                  </Stack>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-start', alignItems: 'center' }}>
                    <CardMedia component="img" image={imageDiscover} title="payment" sx={{ width: 65 }} />
                    <Stack>
                      <Typography variant="subtitle1">Discover</Typography>
                      <Typography variant="subtitle2">Ending in 6109 07XX XXXX 8020</Typography>
                    </Stack>
                  </Stack>
                </Grid>
                <Grid>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Link component={RouterLink} to="#" color="secondary" underline="hover">
                      Make Default
                    </Link>
                    <Typography variant="caption" sx={{ color: 'grey.300' }}>
                      |
                    </Typography>
                    <Link component={RouterLink} to="#" underline="hover">
                      Edit
                    </Link>
                  </Stack>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Grid>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-start', alignItems: 'center' }}>
                    <CardMedia component="img" image={imageMasterCard} title="payment" sx={{ width: 65 }} />
                    <Stack>
                      <Typography variant="subtitle1">Mastercard</Typography>
                      <Typography variant="subtitle2">Ending in 7278 07XX XXXX 4290</Typography>
                    </Stack>
                  </Stack>
                </Grid>
                <Grid>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Link component={RouterLink} to="#" color="secondary" underline="hover">
                      Make Default
                    </Link>
                    <Typography variant="caption" sx={{ color: 'grey.300' }}>
                      |
                    </Typography>
                    <Link component={RouterLink} to="#" underline="hover">
                      Edit
                    </Link>
                  </Stack>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </SubCard>
      </Grid>
      <Grid size={12}>
        <SubCard sx={{ overflowX: 'auto' }} title="Billing History" content={false}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 3 }}>Order No.</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell sx={{ pr: 3 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow hover key={index}>
                    <TableCell sx={{ pl: 3 }}>{row.tid}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.amount}</TableCell>
                    <TableCell sx={{ pr: 3 }}>
                      <Chip color={getChipColor(row.badgeType)} label={row.badgeText} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SubCard>
      </Grid>
    </Grid>
  );
}
