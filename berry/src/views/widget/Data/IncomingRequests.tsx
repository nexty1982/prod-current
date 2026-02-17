// material-ui
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// =========================|| DATA WIDGET - INCOMING REQUESTS CARD ||========================= //

export default function IncomingRequests() {
  return (
    <MainCard title="Incoming Requests" content={false}>
      <PerfectScrollbar style={{ height: 290 }}>
        <List component="nav" aria-label="main mailbox folders">
          <ListItemButton>
            <ListItemIcon>
              <FiberManualRecordIcon sx={{ color: 'success.main' }} />
            </ListItemIcon>
            <ListItemText primary="Incoming requests" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <FiberManualRecordIcon sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primary="You have 2 pending requests.." />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <FiberManualRecordIcon sx={{ color: 'warning.main' }} />
            </ListItemIcon>
            <ListItemText primary="You have 3 pending tasks" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <FiberManualRecordIcon sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText primary="New order received" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <FiberManualRecordIcon sx={{ color: 'success.main' }} />
            </ListItemIcon>
            <ListItemText primary="Incoming requests" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <FiberManualRecordIcon sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primary="You have 2 pending requests.." />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <FiberManualRecordIcon sx={{ color: 'warning.main' }} />
            </ListItemIcon>
            <ListItemText primary="You have 3 pending tasks" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
            <ListItemIcon>
              <FiberManualRecordIcon sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText primary="New order received" />
          </ListItemButton>
        </List>
      </PerfectScrollbar>

      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text" size="small">
          Show more
        </Button>
      </CardActions>
    </MainCard>
  );
}
