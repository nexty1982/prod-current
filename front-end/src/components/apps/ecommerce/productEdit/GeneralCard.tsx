import Grid2 from '@/components/compat/Grid2';
import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { Grid } from '@mui/material';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import TiptapEdit from '@/features/forms/from-tiptap/TiptapEdit';

const GeneralCard = () => {
  return (
    (<Box p={3}>
      <Typography variant="h5">General</Typography>
      <Grid2 container mt={3}>
        {/* 1 */}
        <Grid2 display="flex" alignItems="center" size={12}>
          <CustomFormLabel htmlFor="p_name" sx={{ mt: 0 }}>
            Product Name{' '}
            <Typography color="error.main" component="span">
              *
            </Typography>
          </CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <CustomTextField
            id="p_name"
            placeholder="Product Name"
            value="Sample Product"
            fullWidth
          />
          <Typography variant="body2">
            A product name is required and recommended to be unique.
          </Typography>
        </Grid2>

        <Grid2 display="flex" alignItems="center" size={12}>
          <CustomFormLabel htmlFor="desc">Description</CustomFormLabel>
        </Grid2>
        <Grid2 size={12}>
          <TiptapEdit />
          <Typography variant="body2">
            Set a description to the product for better visibility.
          </Typography>
        </Grid2>
      </Grid2>
    </Box>)
  );
};

export default GeneralCard;
