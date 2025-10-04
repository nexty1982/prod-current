import Grid2 from '@/components/compat/Grid2';
import CodeDialog from '@/shared/ui/CodeDialog';

const BasicLayoutCode = () => {
  return (
    <>
      <CodeDialog>
        {`
"use client";

import { Grid, InputAdornment, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { TextField } from '@mui/material';
import { Typography } from '@mui/material';
import { OutlinedInput } from '@mui/material';

const CustomTextField = styled((props: any) => <TextField {...props} />)(({ theme }) => ({
  '& .MuiOutlinedInput-input::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '0.8',
  },
  '& .MuiOutlinedInput-input.Mui-disabled::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '1',
  },
  '& .Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[200],
  },
}));

const CustomFormLabel = styled((props: any) => (
  <Typography
    variant="subtitle1"
    fontWeight={600}
    {...props}
    component="label"
    htmlFor={props.htmlFor}
  />
))(() => ({
  marginBottom: '5px',
  marginTop: '25px',
  display: 'block',
}));

const CustomOutlinedInput = styled((props: any) => <OutlinedInput {...props} />)(({ theme }) => ({
  '& .MuiOutlinedInput-input::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '0.8',
  },

  '& .MuiTypography-root': {
    color: theme.palette.text.secondary,
  },

  '& .MuiOutlinedInput-input.Mui-disabled::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '1',
  },
}));

<div>
  <Grid2 container spacing={3}>
    <Grid2
      display="flex"
      alignItems="center"
      size={{
        xs: 12,
        sm: 3
      }}>
      <CustomFormLabel htmlFor="bl-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
        Name
      </CustomFormLabel>
    </Grid2>
    <Grid2
      size={{
        xs: 12,
        sm: 9
      }}>
      <CustomTextField id="bl-name" placeholder="John Deo" fullWidth />
    </Grid2>
    <Grid2
      display="flex"
      alignItems="center"
      size={{
        xs: 12,
        sm: 3
      }}>
      <CustomFormLabel htmlFor="bl-company" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
        Company
      </CustomFormLabel>
    </Grid2>
    <Grid2
      size={{
        xs: 12,
        sm: 9
      }}>
      <CustomTextField id="bl-company" placeholder="ACME Inc." fullWidth />
    </Grid2>
    <Grid2
      display="flex"
      alignItems="center"
      size={{
        xs: 12,
        sm: 3
      }}>
      <CustomFormLabel htmlFor="bl-email" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
        Email
      </CustomFormLabel>
    </Grid2>
    <Grid2
      size={{
        xs: 12,
        sm: 9
      }}>
      <CustomOutlinedInput
        endAdornment={<InputAdornment position="end">@example.com</InputAdornment>}
        id="bl-email"
        placeholder="john.deo"
        fullWidth
      />
    </Grid2>
    <Grid2
      display="flex"
      alignItems="center"
      size={{
        xs: 12,
        sm: 3
      }}>
      <CustomFormLabel htmlFor="bl-phone" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
        Phone No
      </CustomFormLabel>
    </Grid2>
    <Grid2
      size={{
        xs: 12,
        sm: 9
      }}>
      <CustomTextField id="bl-phone" placeholder="412 2150 451" fullWidth />
    </Grid2>
    <Grid2
      display="flex"
      alignItems="center"
      size={{
        xs: 12,
        sm: 3
      }}>
      <CustomFormLabel htmlFor="bl-message" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
        Message
      </CustomFormLabel>
    </Grid2>
    <Grid2
      size={{
        xs: 12,
        sm: 9
      }}>
      <CustomTextField
        id="bl-message"
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
      <Button variant="contained" color="primary">Send</Button>
    </Grid2>
  </Grid2>
</div>
`}
      </CodeDialog>
    </>
  );
};

export default BasicLayoutCode;
