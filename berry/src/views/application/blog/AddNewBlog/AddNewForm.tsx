import { useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// third party
import { Formik } from 'formik';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import InputLabel from 'ui-component/extended/Form/InputLabel';
import UploadAvatar from 'ui-component/third-party/dropzone/Avatar';
import ReactQuill from 'ui-component/third-party/ReactQuill';
import { gridSpacing } from 'store/constant';

// assets
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ErrorOutlineTwoToneIcon from '@mui/icons-material/ErrorOutlineTwoTone';
import LibraryBooksTwoToneIcon from '@mui/icons-material/LibraryBooksTwoTone';
import RemoveRedEyeTwoToneIcon from '@mui/icons-material/RemoveRedEyeTwoTone';

// autocomplete options
const tags = [
  { label: 'React', id: 1 },
  { label: 'UI/UX Design', id: 2 },
  { label: 'Testing', id: 3 },
  { label: 'Angular', id: 4 },
  { label: 'Bootstrap', id: 5 }
];

// ==============================|| ADD NEW FORM ||============================== //

export default function AddNewForm() {
  const [date, setDate] = useState<Date | null>(new Date());

  return (
    <Formik
      initialValues={{
        files: null
      }}
      onSubmit={(values: any) => {
        console.log('values', values);
        // submit form
      }}
    >
      {({ values, handleSubmit, setFieldValue, touched, errors }) => (
        <form onSubmit={handleSubmit}>
          <MainCard
            title="Add New"
            secondary={
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: { xs: 1, lg: 2 } }}>
                <Button
                  color="inherit"
                  variant="outlined"
                  sx={{ textTransform: 'none', opacity: 0.6 }}
                  startIcon={<LibraryBooksTwoToneIcon />}
                  type="submit"
                >
                  Save as drafts
                </Button>
                <Button variant="outlined" startIcon={<RemoveRedEyeTwoToneIcon />} color="primary">
                  Preview
                </Button>
                <Button variant="contained" color="primary" type="submit">
                  Publish
                </Button>
              </Stack>
            }
            sx={{ '& .MuiCardHeader-root': { flexWrap: 'wrap', gap: 1.5 }, '& .MuiCardHeader-action': { flex: 'unset' } }}
          >
            <Grid container spacing={gridSpacing}>
              <Grid size={12}>
                <TextField fullWidth id="outlined-email-address" label="Add title" />
              </Grid>
              <Grid size={12}>
                <ReactQuill editorMinHeight={300} />
              </Grid>
              <Grid size={12}>
                <Stack
                  direction={{ lg: 'row' }}
                  sx={{ gap: { xs: 2, lg: 3 }, alignItems: { lg: 'center' }, '& .MuiSvgIcon-root': { fontSize: '1.5rem !important' } }}
                >
                  <UploadAvatar
                    sx={{ height: 72, width: 72 }}
                    setFieldValue={setFieldValue}
                    file={values.files}
                    error={touched.files && !!errors.files}
                  />
                  <Typography variant="caption" sx={{ overflow: 'hidden' }}>
                    <ErrorOutlineTwoToneIcon sx={{ height: 16, width: 16, mr: 1, verticalAlign: 'text-bottom' }} />
                    Image size Limit should be 125kb Max.
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Author" id="outlined-author" />
              </Grid>
              <Grid size={12}>
                <InputLabel>Tags</InputLabel>
                <Autocomplete
                  multiple
                  options={tags}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => <TextField placeholder="Add Tag" {...params} />}
                />
                <FormHelperText>ex. #uidesign, #React</FormHelperText>
              </Grid>
              <Grid sx={{ '& .MuiTextField-root': { mb: 0 } }} size={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Publish to"
                    value={date}
                    onChange={(newValue) => setDate(newValue as Date | null)}
                    slotProps={{
                      textField: {
                        margin: 'normal',
                        fullWidth: true,
                        InputProps: {
                          endAdornment: (
                            <InputAdornment position="end" sx={{ cursor: 'pointer' }}>
                              <EventOutlinedIcon />
                            </InputAdornment>
                          )
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </MainCard>
        </form>
      )}
    </Formik>
  );
}
