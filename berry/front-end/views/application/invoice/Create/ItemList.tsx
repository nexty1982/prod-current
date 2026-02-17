// material-ui
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// assets
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';

// types
import { InvoiceItems } from 'types/invoice';

interface ProductDataProps {
  productsData: InvoiceItems[];
  deleteProductHandler: (row: number) => void;
}

// ==============================|| CREATE INVOICE - ITEMS ||============================== //

export default function ItemList({ productsData, deleteProductHandler }: ProductDataProps) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ pl: 3 }}>Description</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {productsData.map((row, index) => (
            <TableRow key={index}>
              <TableCell sx={{ pl: 3 }}>
                <Typography variant="subtitle1">{row.product}</Typography>
                <Typography variant="body2">{row.description}</Typography>
              </TableCell>
              <TableCell align="right">{row.quantity}</TableCell>
              <TableCell align="right">${row.amount}</TableCell>
              <TableCell align="right">${Math.round(row.total! * 100) / 100}</TableCell>
              <TableCell sx={{ pr: 1 }} align="right">
                <IconButton color="error" size="small" onClick={() => deleteProductHandler(row.id!)} aria-label="'Delete'">
                  <DeleteTwoToneIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
