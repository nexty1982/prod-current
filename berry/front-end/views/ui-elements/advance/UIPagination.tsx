// material-ui
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// =============================|| UI PAGINATION ||============================= //

export default function UIPagination() {
  return (
    <MainCard title="Pagination" secondary={<SecondaryAction link="https://next.material-ui.com/components/pagination/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Basic Pagination">
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', width: 1, gap: 2 }}>
              <Pagination count={10} />
              <Pagination count={10} color="primary" />
              <Pagination count={10} color="secondary" />
              <Pagination count={10} disabled />
            </Stack>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Outline Pagination">
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', width: 1, gap: 2 }}>
              <Pagination count={10} variant="outlined" />
              <Pagination count={10} variant="outlined" color="primary" />
              <Pagination count={10} variant="outlined" color="secondary" />
              <Pagination count={10} variant="outlined" disabled />
            </Stack>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Rounded Pagination">
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', width: 1, gap: 2 }}>
              <Pagination count={10} variant="outlined" shape="rounded" />
              <Pagination count={10} color="primary" shape="rounded" />
              <Pagination count={10} color="secondary" shape="rounded" />
              <Pagination count={10} disabled shape="rounded" />
            </Stack>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Pagination Size">
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', width: 1, gap: 2 }}>
              <Pagination count={10} size="small" />
              <Pagination count={10} color="primary" />
              <Pagination count={10} color="secondary" size="large" />
              <Pagination count={10} variant="outlined" disabled size="small" />
            </Stack>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Pagination Ranges">
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', width: 1, gap: 2 }}>
              <Pagination size="small" count={11} defaultPage={6} siblingCount={0} />
              <Pagination count={11} defaultPage={6} color="primary" />
              <Pagination count={11} defaultPage={6} siblingCount={0} boundaryCount={2} color="secondary" />
              <Pagination count={11} defaultPage={6} boundaryCount={2} variant="outlined" color="primary" />
            </Stack>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Pagination Buttons">
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', width: 1, gap: 2 }}>
              <Pagination count={10} color="primary" showFirstButton showLastButton />
              <Pagination count={10} color="secondary" hidePrevButton hideNextButton />
            </Stack>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
