import { useDispatch } from 'store';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { openSnackbar } from 'store/slices/snackbar';

// third party
import { useFormik } from 'formik';
import * as yup from 'yup';

/**
 * 'Select your favorite color'
 * yup.string Expected 0 arguments, but got 1 */
const validationSchema = yup.object({
  color: yup.string().required('Color selection is required')
});

// ==============================|| FORM VALIDATION - RADIO GROUP FORMIK ||============================== //

export default function RadioGroupForms() {
  const dispatch = useDispatch();

  const formik = useFormik({
    initialValues: {
      color: ''
    },
    validationSchema,
    onSubmit: (values) => {
      dispatch(
        openSnackbar({
          open: true,
          message: 'Radio - Submit Success',
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
    <MainCard title="Radio">
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={2}>
          <Grid>
            <FormControl>
              <RadioGroup row aria-label="color" value={formik.values.color} onChange={formik.handleChange} name="color" id="color">
                <FormControlLabel
                  value="primary"
                  control={
                    <Radio
                      sx={{
                        color: 'primary.main',
                        '&.Mui-checked': { color: 'primary.main' }
                      }}
                    />
                  }
                  label="Primary"
                />
                <FormControlLabel
                  value="error"
                  control={
                    <Radio
                      sx={{
                        color: 'error.main',
                        '&.Mui-checked': { color: 'error.main' }
                      }}
                    />
                  }
                  label="Error"
                />
                <FormControlLabel
                  value="secondary"
                  control={
                    <Radio
                      sx={{
                        color: 'secondary.main',
                        '&.Mui-checked': { color: 'secondary.main' }
                      }}
                    />
                  }
                  label="Secondary"
                />
              </RadioGroup>
            </FormControl>
            {formik.errors.color && (
              <FormHelperText error id="standard-weight-helper-text-email-login">
                {' '}
                {formik.errors.color}{' '}
              </FormHelperText>
            )}
          </Grid>
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
