import Grid2 from '@/components/compat/Grid2';
import React from 'react';
import { Box, Container, Grid, MenuItem, Button } from '@mui/material';
import CustomFormLabel from '../../../forms/theme-elements/CustomFormLabel.tsx';
import CustomTextField from '../../../forms/theme-elements/CustomTextField.tsx';
import CustomSelect from '../../../forms/theme-elements/CustomSelect.tsx';
import Address from './Address.tsx';

const numbers = [
  {
    value: 'one',
    label: 'General Enquiry',
  },
  {
    value: 'two',
    label: 'General Enquiry 2',
  },
];

const Form = () => {
  const [number, setNumber] = React.useState('one');

  const handleChange3 = (event: any) => {
    setNumber(event.target.value);
  };

  return (<>
    <Box
      sx={{
        paddingTop: {
          xs: '40px',
          lg: '60px',
        },
        paddingBottom: {
          xs: '40px',
          lg: '90px',
        },
      }}
    >
      <Container maxWidth="lg">
        <Grid2 container spacing={3} justifyContent="center">
          <Grid2
            alignItems="center"
            size={{
              xs: 12,
              lg: 8
            }}>
            <form>
              <Grid2 container spacing={3} justifyContent="center">
                <Grid2
                  alignItems="center"
                  size={{
                    xs: 12,
                    lg: 6
                  }}>
                  <CustomFormLabel htmlFor="fname" sx={{ mt: 0 }}>
                    First Name *
                  </CustomFormLabel>
                  <CustomTextField id="fname" placeholder="Name" fullWidth />
                </Grid2>
                <Grid2
                  alignItems="center"
                  size={{
                    xs: 12,
                    lg: 6
                  }}>
                  <CustomFormLabel htmlFor="lname" sx={{ mt: 0 }}>
                    Last Name *
                  </CustomFormLabel>
                  <CustomTextField id="lname" placeholder="Last Name" fullWidth />
                </Grid2>
                <Grid2
                  alignItems="center"
                  size={{
                    xs: 12,
                    lg: 6
                  }}>
                  <CustomFormLabel htmlFor="phone" sx={{ mt: 0 }}>
                    Phone Number *
                  </CustomFormLabel>
                  <CustomTextField id="phone" placeholder="xxx xxx xxxx" fullWidth />
                </Grid2>
                <Grid2
                  alignItems="center"
                  size={{
                    xs: 12,
                    lg: 6
                  }}>
                  <CustomFormLabel htmlFor="txt-email" sx={{ mt: 0 }}>
                    Email *
                  </CustomFormLabel>
                  <CustomTextField id="txt-email" placeholder="Email address" fullWidth />
                </Grid2>
                <Grid2 alignItems="center" size={12}>
                  <CustomFormLabel htmlFor="txt-enquire" sx={{ mt: 0 }}>
                    Enquire related to *
                  </CustomFormLabel>
                  <CustomSelect
                    fullWidth
                    id="txt-enquire"
                    variant="outlined"
                    value={number}
                    onChange={handleChange3}
                  >
                    {numbers.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid2>
                <Grid2 alignItems="center" size={12}>
                  <CustomFormLabel htmlFor="txt-message" sx={{ mt: 0 }}>
                    Message
                  </CustomFormLabel>
                  <CustomTextField
                    id="txt-message"
                    multiline
                    rows={4}
                    variant="outlined"
                    placeholder="Write your message here..."
                    fullWidth
                  />
                </Grid2>
                <Grid2 alignItems="center" size={12}>
                  <Button variant="contained" size="large">
                    Submit
                  </Button>
                </Grid2>
              </Grid2>
            </form>
          </Grid2>
          <Grid2
            alignItems="center"
            size={{
              xs: 12,
              lg: 4
            }}>
            <Address />
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  </>);
};

export default Form;
