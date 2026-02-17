// material-ui
import Grid from '@mui/material/Grid';

// project imports
import AutoStop from './AutoStop';
import Controlled from './Controlled';
import Validation from './Validation';
import CustomEdit from './CustomEdit';
import EditableRow from './EditableRow';
import ParserSetter from './ParserSetter';
import EditingEvents from './EditingEvents';
import EditableColumn from './EditableColumn';
import DisableEditing from './DisableEditing';
import ServerValidation from './ServerValidation';
import FullFeaturedCrudGrid from './FullFeatured';
import ConfirmationSave from './ConfirmationSave';
import { gridSpacing } from 'store/constant';

// ==============================|| INLINE EDITING DATA GRID ||============================== //

export default function InlineEditing() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <FullFeaturedCrudGrid />
      </Grid>
      <Grid size={12}>
        <EditableColumn />
      </Grid>
      <Grid size={12}>
        <EditableRow />
      </Grid>
      <Grid size={12}>
        <EditingEvents />
      </Grid>
      <Grid size={12}>
        <DisableEditing />
      </Grid>
      <Grid size={12}>
        <ServerValidation />
      </Grid>
      <Grid size={12}>
        <ConfirmationSave />
      </Grid>
      <Grid size={12}>
        <ParserSetter />
      </Grid>
      <Grid size={12}>
        <Validation />
      </Grid>
      <Grid size={12}>
        <Controlled />
      </Grid>
      <Grid size={12}>
        <CustomEdit />
      </Grid>
      <Grid size={12}>
        <AutoStop />
      </Grid>
    </Grid>
  );
}
