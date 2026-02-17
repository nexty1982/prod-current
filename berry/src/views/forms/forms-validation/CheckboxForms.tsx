import { useDispatch } from 'store';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Checkbox from '@mui/material/Checkbox';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { openSnackbar } from 'store/slices/snackbar';

// third party
import { useFormik } from 'formik';
import * as yup from 'yup';

const validationSchema = yup.object({
  color: yup.array().min(1, 'At least one color is required')
});

// ==============================|| FORM VALIDATION - CHECKBOX FORMIK ||============================== //

export default function CheckboxForms() {
  const dispatch = useDispatch();

  const formik = useFormik({
    initialValues: {
      color: []
    },
    validationSchema,
    onSubmit: (values) => {
      dispatch(
        openSnackbar({
          open: true,
          message: 'Checkbox - Submit Success',
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
    <MainCard title="Checkbox">
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={2}>
          <Grid>
            <Checkbox value="primary" name="color" color="primary" onChange={formik.handleChange} />
          </Grid>
          <Grid>
            <Checkbox value="secondary" name="color" color="secondary" sx={{ color: 'secondary.main' }} onChange={formik.handleChange} />
          </Grid>
          <Grid>
            <Checkbox
              value="error"
              name="color"
              sx={{ color: 'error.main', '&.Mui-checked': { color: 'error.main' } }}
              onChange={formik.handleChange}
            />
          </Grid>
          {formik.errors.color && (
            <Grid size={12} sx={{ mt: -2 }}>
              <FormHelperText error id="standard-weight-helper-text-email-login">
                {formik.errors.color}
              </FormHelperText>
            </Grid>
          )}
          <Grid size={12}>
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
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
  );
}
