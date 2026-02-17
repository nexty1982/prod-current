// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';

// project imports
import ClientDetails from './ClientDetails';

// types
import { UserProfile } from 'types/user-profile';

interface ClientDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  rowValue: UserProfile;
}

// ==============================|| CLIENT DETAILS - DRAWER ||============================== //

export default function ClientDrawer({ open, setOpen, rowValue }: ClientDrawerProps) {
  const downSM = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Drawer
        sx={{
          flexShrink: 0,
          zIndex: 100,
          display: open ? 'block' : 'none',
          '& .MuiDrawer-paper': {
            position: 'relative',
            ...(!downSM && open && { borderTop: '1px solid', borderTopColor: 'divider' }),
            ...(downSM && {
              position: 'absolute'
            }),
            overflow: 'unset',
            width: '100%',
            borderLeft: 'none'
          }
        }}
        variant="persistent"
        anchor="right"
        open={open}
      >
        <ClientDetails rowValue={rowValue} handleDrawerClose={handleDrawerClose} />
      </Drawer>
    </>
  );
}
