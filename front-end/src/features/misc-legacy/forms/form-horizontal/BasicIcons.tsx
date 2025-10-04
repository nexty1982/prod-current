import Grid2 from '@/components/compat/Grid2';
'use client'
import { Grid, InputAdornment, Button } from '@mui/material';

import CustomFormLabel from '@/theme-elements/CustomFormLabel';
import CustomOutlinedInput from '@/theme-elements/CustomOutlinedInput';
import { IconBuildingArch, IconMail, IconMessage2, IconPhone, IconUser } from '@tabler/icons-react';

const BasicIcons = () => {
  return (
    (<div>
      {/* ------------------------------------------------------------------------------------------------ */}
      {/* Basic Layout */}
      {/* ------------------------------------------------------------------------------------------------ */}
      <Grid2 container spacing={3}>
        {/* 1 */}
        <Grid2
          display="flex"
          alignItems="center"
          size={{
            xs: 12,
            sm: 3
          }}>
          <CustomFormLabel htmlFor="bi-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
            Name
          </CustomFormLabel>
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 9
          }}>
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
        <Grid2
          display="flex"
          alignItems="center"
          size={{
            xs: 12,
            sm: 3
          }}>
          <CustomFormLabel htmlFor="bi-company" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
            Company
          </CustomFormLabel>
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 9
          }}>
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
        <Grid2
          display="flex"
          alignItems="center"
          size={{
            xs: 12,
            sm: 3
          }}>
          <CustomFormLabel htmlFor="bi-email" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
            Email
          </CustomFormLabel>
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 9
          }}>
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
        <Grid2
          display="flex"
          alignItems="center"
          size={{
            xs: 12,
            sm: 3
          }}>
          <CustomFormLabel htmlFor="bi-phone" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
            Phone No
          </CustomFormLabel>
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 9
          }}>
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
        <Grid2
          display="flex"
          alignItems="center"
          size={{
            xs: 12,
            sm: 3
          }}>
          <CustomFormLabel htmlFor="bi-message" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
            Message
          </CustomFormLabel>
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 9
          }}>
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
        <Grid2
          size={{
            xs: 12,
            sm: 3
          }}></Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 9
          }}>
          <Button variant="contained" color="primary">
            Send
          </Button>
        </Grid2>
      </Grid2>
    </div>)
  );
};

export default BasicIcons;
