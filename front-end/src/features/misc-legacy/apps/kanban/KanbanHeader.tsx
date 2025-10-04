import Grid2 from '@/components/compat/Grid2';
import { useState, useContext } from 'react';
import { KanbanDataContext } from '@/context/kanbancontext/index';

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  Box,
  Grid,
} from '@mui/material';
import CustomFormLabel from '@/features/records-centralized/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '@/features/records-centralized/components/forms/theme-elements/CustomTextField';



function KanbanHeader() {
  const { addCategory, setError } = useContext(KanbanDataContext);
  const [show, setShow] = useState(false);
  const [listName, setListName] = useState('');

  //Closes the modal
  const handleClose = () => setShow(false);
  //open the modal
  const handleShow = () => setShow(true);

  //Handles Add a new category.
  const handleSave = async () => {
    try {
      addCategory(listName);
      setListName('');
      setShow(false);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const isAddButtonDisabled = listName.trim().length === 0;

  return (<>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
      <Typography variant="h5">Improving Work Processes</Typography>
      <Button variant="contained" onClick={handleShow}>
        Add List
      </Button>
    </Box>
    <Dialog
      open={show}
      onClose={handleClose}
      maxWidth="lg"
      sx={{ '.MuiDialog-paper': { width: '600px' } }}
    >
      <DialogTitle>Add List</DialogTitle>
      <DialogContent>
        <Grid2 container spacing={3}>
          <Grid2
            size={{
              xs: 12,
              lg: 12
            }}>
            <CustomFormLabel htmlFor="default-value">List Name</CustomFormLabel>
            <CustomTextField
              autoFocus
              id="default-value"
              variant="outlined"
              value={listName}
              fullWidth
              onChange={(e: any) => setListName(e.target.value)}
            />
          </Grid2>
        </Grid2>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleClose} color="error">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          color="primary"
          disabled={isAddButtonDisabled}
        >
          Add List
        </Button>
      </DialogActions>
    </Dialog>
  </>);
}
export default KanbanHeader;
