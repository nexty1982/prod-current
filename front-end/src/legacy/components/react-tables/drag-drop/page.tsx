import Grid2 from '@mui/material/Grid2';

import Rowdragdrop from './Rowdragdrop.tsx';
import Columndragdrop from './Columndragdrop.tsx';
import { Grid } from '@mui/material';
import PageContainer from '@/features/misc-legacy/container/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Drag & Drop React Table',
  },
];

function page() {
  return (
    (<PageContainer title="Drag & drop Table" description="this is Drag & Drop Table">
      <Breadcrumb title="Drag & Drop Table" items={BCrumb} />
      <Grid2 container spacing={3}>
        <Grid2 sx={{ padding: 2 }} size={12}>
          <Rowdragdrop />
        </Grid2>
        <Grid2 sx={{ padding: 2 }} size={12}>
          <Columndragdrop />
        </Grid2>
      </Grid2>
    </PageContainer>)
  );
}
export default page;
