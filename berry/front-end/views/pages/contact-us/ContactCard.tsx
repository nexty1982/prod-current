import React from 'react';
import { Link } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// third party
import { PatternFormat } from 'react-number-format';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';

import { gridSpacing } from 'store/constant';

// assets
import mailImg from 'assets/images/landing/widget-mail.svg';

// select options
const currencies = [
  {
    value: '1',
    label: 'Below $1000'
  },
  {
    value: '2',
    label: '$1000 - $5000'
  },
  {
    value: '3',
    label: 'Not specified'
  }
];

const sizes = [
  {
    value: '1',
    label: '1 - 5'
  },
  {
    value: '2',
    label: '5 - 10'
  },
  {
    value: '3',
    label: '10+'
  }
];

// ===========================|| CONTACT CARD - FORMS ||=========================== //

export default function ContactCard() {
  const [budget, setBudget] = React.useState(1);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBudget(Number(event.target?.value!));
  };

  const [size, setSize] = React.useState(1);
  const handleChange1 = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSize(Number(event.target?.value!));
  };

  return (
    <Container>
      <Grid container spacing={gridSpacing} sx={{ justifyContent: 'center' }}>
        <Grid sx={{ mt: { md: 12.5, xs: 2.5 }, mb: { md: 12.5, xs: 2.5 } }} size={{ sm: 10, md: 7 }}>
          <Grid container spacing={gridSpacing}>
            <Grid size={12}>
              <Typography
                variant="h1"
                color="white"
                sx={{
                  fontSize: { xs: '1.8125rem', md: '3.5rem' },
                  fontWeight: 900,
                  lineHeight: 1.4,
                  mt: { xs: 10, md: 0 }
                }}
              >
                Talk to our account expert
              </Typography>
            </Grid>
            <Grid size={12}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 400, lineHeight: 1.4, my: { xs: 'auto', md: 0 }, mx: { xs: 'auto', md: 12.5 } }}
                color="white"
              >
                The starting point for your next project based on easy-to-customize Material-UI © helps you build apps faster and better.
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ position: 'relative', display: { xs: 'none', lg: 'block' } }} size={12}>
          <CardMedia
            component="img"
            src={mailImg}
            alt="Berry"
            sx={{
              mb: -0.081,
              position: 'absolute',
              bottom: -90,
              right: 0,
              width: 400,
              maxWidth: 1,
              animation: '5s wings ease-in-out infinite'
            }}
          />
        </Grid>
        <Grid sx={{ mb: -37.5 }} size={10}>
          <Card sx={{ mb: 6.25 }} elevation={4}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={gridSpacing}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Name</InputLabel>
                    <OutlinedInput type="text" label="Name" placeholder="Enter Your Name" />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Company Name</InputLabel>
                    <OutlinedInput type="text" label="Company Name" placeholder="Enter Your Company Name" />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Email Address</InputLabel>
                    <OutlinedInput type="text" label="Email Address" placeholder="Enter Your Email Address" />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <PatternFormat
                      format="+1 (###) ###-####"
                      mask="_"
                      fullWidth
                      customInput={TextField}
                      label="Phone Number"
                      placeholder="Enter Your Contact Number"
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth sx={{ textAlign: 'left' }}>
                    <TextField id="outlined-select-Size" select fullWidth label="Company Size" value={size} onChange={handleChange1}>
                      {sizes.map((option, index) => (
                        <MenuItem key={index} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth sx={{ textAlign: 'left' }}>
                    <TextField id="outlined-select-budget" select fullWidth label="Project Budget" value={budget} onChange={handleChange}>
                      {currencies.map((option, index) => (
                        <MenuItem key={index} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </FormControl>
                </Grid>
                <Grid size={12}>
                  <FormControl fullWidth>
                    <TextField id="outlined-multiline-static1" placeholder="Message" multiline fullWidth rows={4} defaultValue="" />
                  </FormControl>
                </Grid>
                <Grid size={12}>
                  <Grid container spacing={gridSpacing}>
                    <Grid size={{ sm: 'grow' }}>
                      <Typography align="left" variant="body2">
                        By submitting this, you agree to the
                        <Typography variant="subtitle1" component={Link} to="#" color="primary" sx={{ mx: 0.5 }}>
                          Privacy Policy
                        </Typography>
                        and
                        <Typography variant="subtitle1" component={Link} to="#" color="primary" sx={{ ml: 0.5 }}>
                          Cookie Policy
                        </Typography>
                      </Typography>
                    </Grid>
                    <Grid>
                      <AnimateButton>
                        <Button variant="contained" color="secondary">
                          Get Started
                        </Button>
                      </AnimateButton>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
