import Grid2 from '@mui/material/Grid2';
'use client'
import { Grid, InputAdornment, Button } from '@mui/material';
import CustomFormLabel from '../theme-elements/CustomFormLabel.tsx';
import CustomOutlinedInput from '../theme-elements/CustomOutlinedInput.tsx';
import { IconBuildingArch, IconMail, IconMessage2, IconPhone, IconUser } from '@tabler/icons-react';

const BasicIcons = () => {
  return (
    (<div>
      {/* ------------------------------------------------------------------------------------------------ */}
      {/* Basic Layout */}
      {/* ------------------------------------------------------------------------------------------------ */}
      <Grid2 container>
        {/* 1 */}
        <Grid2 size={12}>
          <CustomFormLabel htmlFor="bi-name" sx={{ mt: 0 }}>
            Name
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomOutlinedInput
            startAdornment={
              <InputAdornment position="start">
                <IconUser size="20" />
              </InputAdornment>
            }
            id="bi-name"
            placeholder="John Deo"
            fullWidth
          />
        </Grid2>
        {/* 2 */}
        <Grid2 size={12}>
          <CustomFormLabel htmlFor="bi-company">
            Company
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomOutlinedInput
            startAdornment={
              <InputAdornment position="start">
                <IconBuildingArch size="20" />
              </InputAdornment>
            }
            id="bi-company"
            placeholder="ACME Inc."
            fullWidth
          />
        </Grid2>
        {/* 3 */}
        <Grid2 size={12}>
          <CustomFormLabel htmlFor="bi-email">
            Email
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomOutlinedInput
            startAdornment={
              <InputAdornment position="start">
                <IconMail size="20" />
              </InputAdornment>
            }
            id="bi-email"
            placeholder="john.deo"
            fullWidth
          />
        </Grid2>
        {/* 4 */}
        <Grid2 size={12}>
          <CustomFormLabel htmlFor="bi-phone">
            Phone No
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomOutlinedInput
            startAdornment={
              <InputAdornment position="start">
                <IconPhone size="20" />
              </InputAdornment>
            }
            id="bi-phone"
            placeholder="412 2150 451"
            fullWidth
          />
        </Grid2>
        {/* 5 */}
        <Grid2 size={12}>
          <CustomFormLabel htmlFor="bi-message">
            Message
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomOutlinedInput
            id="bi-message"
            startAdornment={
              <InputAdornment position="start">
                <IconMessage2 size="20" />
              </InputAdornment>
            }
            placeholder="Hi, Do you  have a moment to talk Jeo ?"
            multiline
            fullWidth
          />
        </Grid2>
        <Grid2 mt={3} size={12}>
          <Button variant="contained" color="primary">
            Send
          </Button>
        </Grid2>
      </Grid2>
    </div>)
  );
};

export default BasicIcons;
