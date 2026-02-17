import * as React from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog, { DialogProps } from '@mui/material/Dialog';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';

export default function MaxWidthDialog() {
  const [open, setOpen] = React.useState(false);
  const [fullWidth, setFullWidth] = React.useState(true);
  const [maxWidth, setMaxWidth] = React.useState<DialogProps['maxWidth']>('sm');

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleMaxWidthChange = (event: SelectChangeEvent<typeof maxWidth>) => {
    setMaxWidth(
      // @ts-expect-error autofill of arbitrary value is not handled.
      event.target.value
    );
  };

  const handleFullWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFullWidth(event.target.checked);
  };

  return (
    <>
      <Button variant="outlined" onClick={handleClickOpen}>
        Open max-width dialog
      </Button>
      <Dialog fullWidth={fullWidth} maxWidth={maxWidth} open={open} onClose={handleClose}>
        {open && (
          <>
            <DialogTitle>Optional sizes</DialogTitle>
            <DialogContent>
              <DialogContentText>You can set my maximum width and whether to adapt or not.</DialogContentText>
              <Box
                noValidate
                component="form"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  m: 'auto',
                  width: 'fit-content'
                }}
              >
                <FormControl sx={{ mt: 2, minWidth: 120 }}>
                  <InputLabel htmlFor="max-width">maxWidth</InputLabel>
                  <Select
                    autoFocus
                    value={maxWidth}
                    onChange={handleMaxWidthChange}
                    label="maxWidth"
                    slotProps={{ input: { name: 'max-width', id: 'max-width' } }}
                  >
                    <MenuItem value={false as any}>false</MenuItem>
                    <MenuItem value="xs">xs</MenuItem>
                    <MenuItem value="sm">sm</MenuItem>
                    <MenuItem value="md">md</MenuItem>
                    <MenuItem value="lg">lg</MenuItem>
                    <MenuItem value="xl">xl</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={<Switch checked={fullWidth} onChange={handleFullWidthChange} />}
                  label="Full width"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
