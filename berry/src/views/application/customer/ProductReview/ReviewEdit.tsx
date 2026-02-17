import { useState, SyntheticEvent } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// project imports
import { gridSpacing } from 'store/constant';
import AnimateButton from 'ui-component/extended/AnimateButton';

// review state options
const reviewState = [
  {
    value: '1',
    label: 'Published'
  },
  {
    value: '2',
    label: 'Pending'
  },
  {
    value: '3',
    label: 'confirm'
  }
];

type ReviewEditProps = {
  open: boolean;
  handleCloseDialog: (e: SyntheticEvent) => void;
};

export default function ReviewEdit({ open, handleCloseDialog }: ReviewEditProps) {
  // handle review status change
  const [currency, setCurrency] = useState('1');
  const handleSelectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrency(event.target.value);
  };

  // handle star rating
  const [value, setValue] = useState<number | null>(2);

  return (
    <Dialog
      open={open}
      onClose={handleCloseDialog}
      sx={{
        '&>div:nth-of-type(3)': {
          '&>div': {
            maxWidth: 400
          }
        }
      }}
    >
      {open && (
        <>
          <DialogTitle>Edit Review</DialogTitle>
          <DialogContent>
            <Grid container spacing={gridSpacing} sx={{ my: 0 }}>
              <Grid size={12}>
                <TextField id="outlined-basic-review-product" fullWidth label="Product " defaultValue="Apple Watch Series 4" />
              </Grid>
              <Grid size={12}>
                <TextField id="outlined-basic-review-author" fullWidth label="Author " defaultValue="Joseph William" />
              </Grid>
              <Grid size={12}>
                <TextField
                  id="outlined-basic-review"
                  fullWidth
                  multiline
                  rows={4}
                  label="Text of review"
                  defaultValue="If you're coming from a Series 3, the choice is more difficult. The Series 4 is undoubtedly the better device. And if you care about fall detection, the ECG app, or a larger screen then upgrading makes sense. But I think most people will remain satisfied with their Series 3s."
                />
              </Grid>
              <Grid size={12}>
                <Typography variant="body2">Rating</Typography>
                <Rating
                  name="simple-controlled"
                  value={value}
                  precision={0.5}
                  onChange={(event, newValue) => {
                    setValue(newValue);
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField id="standard-select-currency" select label="Status" value={currency} fullWidth onChange={handleSelectChange}>
                  {reviewState.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <AnimateButton>
              <Button variant="contained">Create</Button>
            </AnimateButton>
            <Button variant="text" onClick={handleCloseDialog}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
