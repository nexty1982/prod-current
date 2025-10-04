import Grid2 from '@mui/material/Grid2';
'use client'
import { Grid, InputAdornment, Button } from '@mui/material';
import CustomFormLabel from '../theme-elements/CustomFormLabel.tsx';
import CustomTextField from '../theme-elements/CustomTextField.tsx';
import CustomOutlinedInput from '../theme-elements/CustomOutlinedInput.tsx';

const BasicLayout = () => {
  return (
    (<div>
      {/* ------------------------------------------------------------------------------------------------ */}
      {/* Basic Layout */}
      {/* ------------------------------------------------------------------------------------------------ */}
      <Grid2 container>
        {/* 1 */}
        <Grid2 display="flex" alignItems="center" size={12}>
          <CustomFormLabel htmlFor="bl-name" sx={{ mt: 0 }}>
            Name
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomTextField id="bl-name" placeholder="John Deo" fullWidth />
        </Grid2>
        {/* 2 */}
        <Grid2 display="flex" alignItems="center" size={12}>
          <CustomFormLabel htmlFor="bl-company">
            Company
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomTextField id="bl-company" placeholder="ACME Inc." fullWidth />
        </Grid2>
        {/* 3 */}
        <Grid2 display="flex" alignItems="center" size={12}>
          <CustomFormLabel htmlFor="bl-email">
            Email
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomOutlinedInput
            endAdornment={<InputAdornment position="end">@example.com</InputAdornment>}
            id="bl-email"
            placeholder="john.deo"
            fullWidth
          />
        </Grid2>
        {/* 4 */}
        <Grid2 display="flex" alignItems="center" size={12}>
          <CustomFormLabel htmlFor="bl-phone">
            Phone No
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomTextField id="bl-phone" placeholder="412 2150 451" fullWidth />
        </Grid2>
        {/* 5 */}
        <Grid2 display="flex" alignItems="center" size={12}>
          <CustomFormLabel htmlFor="bl-message">
            Message
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomTextField
            id="bl-message"
            placeholder="Hi, Do you  have a moment to talk Jeo ?"
            multiline
            fullWidth
          />
        </Grid2>
        <Grid2 mt={3} size={12}>
          <Button variant="contained" color="primary">Send</Button>
        </Grid2>
      </Grid2>
    </div>)
  );
};

export default BasicLayout;
