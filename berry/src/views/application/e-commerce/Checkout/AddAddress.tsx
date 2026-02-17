import { useDispatch } from 'store';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Zoom, { ZoomProps } from '@mui/material/Zoom';

// third party
import { useFormik } from 'formik';
import * as yup from 'yup';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { Address } from 'types/e-commerce';
import { openSnackbar } from 'store/slices/snackbar';
import { gridSpacing } from 'store/constant';

// assets
import HighlightOffTwoToneIcon from '@mui/icons-material/HighlightOffTwoTone';

const validationSchema = yup.object({
  destination: yup.string().required('Color selection is required'),
  name: yup.string().required('Name is required'),
  building: yup.string().required('Building no/name is required'),
  street: yup.string().required('Street Address is required'),
  city: yup.string().required('City is required'),
  state: yup.string().required('State is required'),
  post: yup.string().required('Area code is required'),
  phone: yup.string().required('Contact no is required')
});

function Transition(props: ZoomProps) {
  return <Zoom {...props} />;
}

// ==============================|| CHECKOUT BILLING ADDRESS - ADD NEW ADDRESS ||============================== //

interface AddAddressProps {
  address: Address;
  open: boolean;
  handleClose: () => void;
  addAddress: (address: Address) => void;
  editAddress: (address: Address) => void;
}

export default function AddAddress({ address, open, handleClose, addAddress, editAddress }: AddAddressProps) {
  const dispatch = useDispatch();
  const edit = address && address.id;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      destination: edit ? address.destination : '',
      name: edit ? address.name : '',
      building: edit ? address.building : '',
      street: edit ? address.street : '',
      city: edit ? address.city : '',
      state: edit ? address.state : '',
      country: edit ? address.country : '',
      post: edit ? address.post : '',
      phone: edit ? address.phone : '',
      isDefault: edit ? address.isDefault : false
    },
    validationSchema,
    onSubmit: (values) => {
      if (edit) {
        editAddress({ ...values, id: address.id });
      } else {
        addAddress(values);
      }
      handleClose();
      dispatch(
        openSnackbar({
          open: true,
          message: 'Submit Success',
          variant: 'alert',
          alert: {
            color: 'success'
          },
          close: false
        })
      );
    }
  });

  return (
    <Dialog
      open={open}
      slots={{ transition: Transition }}
      keepMounted
      onClose={handleClose}
      aria-labelledby="alert-dialog-slide-title"
      aria-describedby="alert-dialog-slide-description"
    >
      <DialogContent sx={{ p: 0 }}>
        <MainCard
          title={edit ? 'Edit Billing Address' : 'Add Billing Address'}
          secondary={
            <IconButton onClick={handleClose} size="large" aria-label="Close Edit Address">
              <HighlightOffTwoToneIcon fontSize="small" />
            </IconButton>
          }
          sx={{ border: 0 }}
        >
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={gridSpacing}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl>
                  <RadioGroup
                    row
                    aria-label="destination"
                    value={formik.values.destination}
                    onChange={formik.handleChange}
                    name="destination"
                    id="destination"
                  >
                    <FormControlLabel
                      value="home"
                      control={<Radio sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }} />}
                      label="Home"
                    />
                    <FormControlLabel
                      value="office"
                      control={<Radio sx={{ color: 'secondary.main', '&.Mui-checked': { color: 'secondary.main' } }} />}
                      label="Office"
                    />
                  </RadioGroup>
                </FormControl>
                {formik.errors.destination && (
                  <FormHelperText error id="standard-weight-helper-text-name-login">
                    {' '}
                    {formik.errors.destination}{' '}
                  </FormHelperText>
                )}
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  id="building"
                  name="building"
                  label="Building No./Name"
                  value={formik.values.building}
                  onChange={formik.handleChange}
                  error={formik.touched.building && Boolean(formik.errors.building)}
                  helperText={formik.touched.building && formik.errors.building}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  id="street"
                  name="street"
                  label="Street"
                  value={formik.values.street}
                  onChange={formik.handleChange}
                  error={formik.touched.building && Boolean(formik.errors.street)}
                  helperText={formik.touched.street && formik.errors.street}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  id="city"
                  name="city"
                  label="City"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  error={formik.touched.building && Boolean(formik.errors.city)}
                  helperText={formik.touched.city && formik.errors.city}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  id="state"
                  name="state"
                  label="State"
                  value={formik.values.state}
                  onChange={formik.handleChange}
                  error={formik.touched.building && Boolean(formik.errors.state)}
                  helperText={formik.touched.state && formik.errors.state}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  id="country"
                  name="country"
                  label="Country"
                  value={formik.values.country}
                  onChange={formik.handleChange}
                  error={formik.touched.building && Boolean(formik.errors.country)}
                  helperText={formik.touched.country && formik.errors.country}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  id="post"
                  name="post"
                  label="Area Code"
                  value={formik.values.post}
                  onChange={formik.handleChange}
                  error={formik.touched.building && Boolean(formik.errors.post)}
                  helperText={formik.touched.post && formik.errors.post}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  id="phone"
                  name="phone"
                  label="Contact"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  error={formik.touched.building && Boolean(formik.errors.phone)}
                  helperText={formik.touched.phone && formik.errors.phone}
                />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      id="isDefault"
                      name="isDefault"
                      checked={formik.values.isDefault}
                      onChange={formik.handleChange}
                      slotProps={{ input: { 'aria-label': 'controlled' } }}
                    />
                  }
                  label="Default"
                />
              </Grid>
              <Grid size={12}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button color="error" onClick={handleClose}>
                    Cancel
                  </Button>
                  <AnimateButton>
                    <Button variant="contained" type="submit">
                      Submit
                    </Button>
                  </AnimateButton>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </MainCard>
      </DialogContent>
    </Dialog>
  );
}
