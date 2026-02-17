// material-ui
import Grid from '@mui/material/Grid';
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

// ==============================|| PRODUCTS-DATA PAGE ||============================== //

export default function ProductsPage({ productsData, deleteProductHandler }: any) {
  return (
    <>
      {productsData.length ? (
        <Grid size={12}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 3 }}>Description</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right" sx={{ pr: 3 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {productsData.map((row: any, index: any) => (
                  <TableRow key={index}>
                    <TableCell sx={{ pl: 3 }}>
                      <Typography variant="subtitle1">{row.product}</Typography>
                      <Typography variant="body2">{row.description}</Typography>
                    </TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell align="right">${row.amount}</TableCell>
                    <TableCell align="right">${row.total}</TableCell>
                    <TableCell sx={{ pr: 1 }} align="right">
                      <IconButton color="error" size="small" onClick={() => deleteProductHandler(row.id)} aria-label="'Delete'">
                        <DeleteTwoToneIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      ) : null}
    </>
  );
}
