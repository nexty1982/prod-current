// material-ui
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import FilterLeadList from './FilterLeadList';

// assets
import CloseIcon from '@mui/icons-material/Close';

interface LeadDrawerProps {
  open: boolean;
  handleToggleDrawer: () => void;
}

// ==============================|| LEAD - FILTER DRAWER ||============================== //

export default function LeadDrawer({ open, handleToggleDrawer }: LeadDrawerProps) {
  return (
    <Drawer
      sx={{
        flexShrink: 0,
        zIndex: 100,
        display: open ? 'block' : 'none',
        '& .MuiDrawer-paper': {
          position: { xs: 'fixed', sm: 'relative' },
          overflow: 'auto',
          width: '100%'
        }
      }}
      variant="persistent"
      anchor="right"
      open={open}
    >
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Grid container spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Grid size={6}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-start', alignItems: 'center' }}>
              <Typography variant="h5">Filter</Typography>
              <Chip label="2" variant="outlined" size="small" onDelete={() => console.log('You clicked the delete icon.')} />
            </Stack>
          </Grid>
          <Grid size={6}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" onClick={handleToggleDrawer} sx={{ borderRadius: 1.5 }} color="primary">
                Save
              </Button>
              <IconButton size="small" onClick={handleToggleDrawer}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Box>
      <Divider />
      <FilterLeadList {...{ handleToggleDrawer }} />
    </Drawer>
  );
}
