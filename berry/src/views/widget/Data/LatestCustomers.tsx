// material-ui
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardMedia from '@mui/material/CardMedia';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// assets
import Flag1 from 'assets/images/widget/australia.jpg';
import Flag2 from 'assets/images/widget/brazil.jpg';
import Flag3 from 'assets/images/widget/germany.jpg';
import Flag4 from 'assets/images/widget/uk.jpg';
import Flag5 from 'assets/images/widget/usa.jpg';

// table data
function createData(image: string, subject: string, dept: string, date: string) {
  return { image, subject, dept, date };
}

const rows = [
  createData(Flag1, 'Germany', 'Angelina Jolly', '56.23%'),
  createData(Flag2, 'USA', 'John Deo', '25.23%'),
  createData(Flag3, 'Australia', 'Jenifer Vintage', '12.45%'),
  createData(Flag4, 'United Kingdom', 'Lori Moore', '8.65%'),
  createData(Flag5, 'Brazil', 'Allianz Dacron', '3.56%'),
  createData(Flag1, 'Australia', 'Jenifer Vintage', '12.45%'),
  createData(Flag3, 'USA', 'John Deo', '25.23%'),
  createData(Flag5, 'Australia', 'Jenifer Vintage', '12.45%'),
  createData(Flag2, 'United Kingdom', 'Lori Moore', '8.65%')
];

// =========================|| DATA WIDGET - LATEST CUSTOMERS CARD ||========================= //

export default function LatestCustomers() {
  return (
    <MainCard title="Latest Customers" content={false}>
      <PerfectScrollbar style={{ height: 345, padding: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 3 }}>#</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right" sx={{ pr: 3 }}>
                  Average
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow hover key={index}>
                  <TableCell sx={{ pl: 3 }}>
                    <CardMedia component="img" image={row.image} title="image" sx={{ width: 30, height: 'auto' }} />
                  </TableCell>
                  <TableCell>{row.subject}</TableCell>
                  <TableCell>{row.dept}</TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>
                    {row.date}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </PerfectScrollbar>

      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text" size="small">
          View all Latest Customers
        </Button>
      </CardActions>
    </MainCard>
  );
}
