// material-ui
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import Chip, { ChipProps } from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// table data
const createData = (badgeText: string, badgeType: ChipProps['color'], subject: string, dept: string, date: string) => ({
  badgeText,
  badgeType,
  subject,
  dept,
  date
});

const rows = [
  createData('Open', 'success', 'Website down for one week', 'Support', 'Today 2:00'),
  createData('Progress', 'primary', 'Loosing control on server', 'Support', 'Yesterday'),
  createData('Closed', 'error', 'Authorizations keys', 'Support', '27, Aug'),
  createData('Open', 'success', 'Restoring default settings', 'Support', 'Today 9:00'),
  createData('Progress', 'primary', 'Loosing control on server', 'Support', 'Yesterday'),
  createData('Closed', 'error', 'Authorizations keys', 'Support', '27, Aug'),
  createData('Open', 'success', 'Restoring default settings', 'Support', 'Today 9:00'),
  createData('Closed', 'error', 'Authorizations keys', 'Support', '27, Aug')
];

// ==========================|| DATA WIDGET - RECENT TICKETS CARD ||========================== //

export default function RecentTickets() {
  return (
    <MainCard title="Recent Tickets" content={false}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: 3 }}>Subject</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right" sx={{ pr: 3 }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow hover key={index}>
                <TableCell sx={{ pl: 3 }}>{row.subject}</TableCell>
                <TableCell>{row.dept}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell align="right" sx={{ pr: 3 }}>
                  {/**
                   * REMINDER:
                   *  color is an enum */}
                  <Chip variant="outlined" color={row.badgeType} label={row.badgeText} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text" size="small">
          View all Projects
        </Button>
      </CardActions>
    </MainCard>
  );
}
