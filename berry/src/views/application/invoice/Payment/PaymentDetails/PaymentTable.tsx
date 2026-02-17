// material-ui
import { useTheme } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';

// types
import { Invoice } from 'types/invoice';

// ==============================|| PAYMENT DETAILS - TABLE ||============================== //

export default function PaymentTable({ rows, randomAmount }: { rows: Invoice[]; randomAmount: number }) {
  const theme = useTheme();

  const initialValue = 0;
  const totalPayAmount = rows.reduce((accumulator, currentValue) => accumulator + currentValue?.quantity, initialValue) - randomAmount;
  const totalDueAmount = rows.reduce((accumulator, currentValue) => accumulator + currentValue?.quantity, initialValue) - totalPayAmount;

  return (
    <>
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'grey.200' }}>
            <TableRow>
              <TableCell align="center">Issue Date</TableCell>
              <TableCell>Invoice No.</TableCell>
              <TableCell align="center">Due Date</TableCell>
              <TableCell align="right">Due Amount</TableCell>
              <TableCell align="right">Payment Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              return (
                <TableRow key={index}>
                  <TableCell align="center">{row.date}</TableCell>
                  <TableCell>#{row.invoice_id}</TableCell>
                  <TableCell align="center">{row.due_date}</TableCell>
                  <TableCell align="right">${row.quantity}</TableCell>
                  <TableCell align="right">${rows.length === index + 1 ? row.quantity - randomAmount : row.quantity}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ px: 2.5, py: 2, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'primary.light' }}>
        <Grid container spacing={1}>
          <Grid size={10}>
            <Typography variant="subtitle1" sx={{ textAlign: 'right' }}>
              Total Payment Amount :
            </Typography>
          </Grid>
          <Grid size={2}>
            <Typography variant="body2" sx={{ textAlign: 'right' }}>
              ${totalPayAmount}
            </Typography>
          </Grid>
          <Grid size={10}>
            <Typography variant="subtitle1" sx={{ textAlign: 'right' }}>
              Total Due Amount :
            </Typography>
          </Grid>
          <Grid size={2}>
            <Typography variant="body2" sx={{ textAlign: 'right' }}>
              ${totalDueAmount}
            </Typography>
          </Grid>
        </Grid>
      </Box>
      <Divider />
      <Box sx={{ p: 2.5 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <Typography variant="h5">Notes</Typography>
              <Typography variant="subtitle2">
                We appreciate your business. Should you need us to add VAT or extra notes let us know!
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1} sx={{ alignItems: 'flex-end' }}>
              <Typography variant="h5">Have Question?</Typography>
              <Typography variant="subtitle2">Support@Berrytheme.com</Typography>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
