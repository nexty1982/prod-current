// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';

// project imports
import ItemDetails from './ItemDetails';

// types
import { Products } from 'types/e-commerce';

interface ItemDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  rowValue: Products;
}

// ==============================|| ITEM LIST - DRAWER ||============================== //

export default function ItemDrawer({ open, setOpen, rowValue }: ItemDrawerProps) {
  const downSM = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Drawer
      sx={{
        flexShrink: 0,
        zIndex: 100,
        display: open ? 'block' : 'none',
        '& .MuiDrawer-paper': {
          position: 'relative',
          ...(!downSM && open && { borderTop: '1px solid', borderTopColor: 'divider' }),
          ...(downSM && { position: 'absolute' }),
          overflow: 'unset',
          width: '100%',
          borderLeft: 'none'
        }
      }}
      variant="persistent"
      anchor="right"
      open={open}
    >
      <ItemDetails rowValue={rowValue} handleDrawerClose={handleDrawerClose} />
    </Drawer>
  );
}
