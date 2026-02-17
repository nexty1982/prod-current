// material-ui
import Avatar from '@mui/material/Avatar';
import Chip, { ChipProps } from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// assets
import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Avatar3 from 'assets/images/users/avatar-3.png';
import Avatar4 from 'assets/images/users/avatar-4.png';

// table data
const createData = (
  avtar: string,
  name: string,
  designation: string,
  product: string,
  date: string,
  badgeText: string,
  badgeType: ChipProps['color']
) => ({ avtar, name, designation, product, date, badgeText, badgeType });

const rows = [
  createData(Avatar1, 'John Deo', 'Graphics Designer', 'Materially', 'Jun, 26', 'Low', 'warning'),
  createData(Avatar2, 'Jenifer Vintage', 'Web Designer', 'Mashable', 'March, 31', 'High', 'error'),
  createData(Avatar3, 'William Jem', 'Developer', 'Flatable', 'Aug, 02', 'Medium', 'primary'),
  createData(Avatar4, 'David Jones', 'Developer', 'Guruable', 'Sep, 22', 'High', 'error')
];

// ===========================|| DATA WIDGET - PROJECT TABLE CARD ||=========================== //

export default function ProjectTable() {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ pl: 3 }}>Assigned</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Due Date</TableCell>
            <TableCell align="right" sx={{ pr: 3 }}>
              Priority
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow hover key={index}>
              <TableCell sx={{ pl: 3 }}>
                <Grid container spacing={2} sx={{ alignItems: 'center', flexWrap: 'nowrap' }}>
                  <Grid>
                    <Avatar alt="User 1" src={row.avtar} />
                  </Grid>
                  <Grid size="grow">
                    <Typography variant="subtitle1">{row.name}</Typography>
                    <Typography variant="subtitle2">{row.designation}</Typography>
                  </Grid>
                </Grid>
              </TableCell>
              <TableCell>{row.product}</TableCell>
              <TableCell>{row.date}</TableCell>
              <TableCell align="right" sx={{ pr: 3 }}>
                <Chip color={row.badgeType} label={row.badgeText} size="small" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
