import { SyntheticEvent } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import AddLeadDialogBody from './AddLeadDialogBody';
import AnimateButton from 'ui-component/extended/AnimateButton';

// assets
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';

// types
import { Order } from 'types/customer';

type AddLeadProps = {
  open: boolean;
  handleToggleAddDialog: (e: SyntheticEvent) => void;
  row?: Order;
};

// ==============================|| ADD LEAD ||============================== //

export default function AddLeadDialog({ open, handleToggleAddDialog, row }: AddLeadProps) {
  return (
    <Dialog
      open={open}
      onClose={handleToggleAddDialog}
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: '100%',
          width: 696,
          borderRadius: 3,
          py: 0
        }
      }}
    >
      {open && (
        <>
          <DialogTitle sx={{ px: 3, py: 2 }}>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              {!row ? (
                <Typography variant="h4">Add Lead</Typography>
              ) : (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="h4">Edit Lead</Typography>
                  <Typography variant="h4" sx={{ color: 'grey.400' }}>
                    #{row.id}
                  </Typography>
                </Stack>
              )}
              <IconButton sx={{ p: 0 }} size="medium" onClick={handleToggleAddDialog}>
                <CancelTwoToneIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ p: 0 }}>
            <AddLeadDialogBody {...{ row }} />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Stack spacing={1.5} direction="row" sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
              <AnimateButton>
                <Button variant="outlined" onClick={handleToggleAddDialog}>
                  Cancel
                </Button>
              </AnimateButton>
              <AnimateButton>
                <Button variant="contained" onClick={handleToggleAddDialog}>
                  Add
                </Button>
              </AnimateButton>
            </Stack>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
