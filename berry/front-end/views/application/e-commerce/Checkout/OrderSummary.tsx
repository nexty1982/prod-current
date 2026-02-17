// material-ui
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// third party
import currency from 'currency.js';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import { CartCheckoutStateProps } from 'types/cart';

// ==============================|| CHECKOUT CART - ORDER SUMMARY ||============================== //

export default function OrderSummary({ checkout }: { checkout: CartCheckoutStateProps }) {
  return (
    <SubCard>
      <TableContainer>
        <Table sx={{ minWidth: 'auto' }} size="small" aria-label="simple table">
          <TableBody>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle1">Order Summary</Typography>
              </TableCell>
              <TableCell />
            </TableRow>
            <TableRow>
              <TableCell>Sub Total</TableCell>
              <TableCell align="right">
                {checkout.subtotal && <Typography variant="subtitle1">{currency(checkout.subtotal).format()}</Typography>}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Coupon Discount</TableCell>
              <TableCell align="right">
                {checkout.discount && (
                  <Typography variant="subtitle1">{checkout.discount <= 0 ? '-' : currency(checkout.discount).format()}</Typography>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Shipping Charges</TableCell>
              <TableCell align="right">
                {checkout.shipping && (
                  <Typography variant="subtitle1">{checkout.shipping <= 0 ? '-' : currency(checkout.shipping).format()}</Typography>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ borderBottom: 'none' }}>
                <Typography variant="subtitle1">Total</Typography>
              </TableCell>
              <TableCell align="right" sx={{ borderBottom: 'none' }}>
                {checkout.total && <Typography variant="subtitle1">{currency(checkout.total).format()}</Typography>}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </SubCard>
  );
}
