import { useState } from 'react';

// material-ui
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import { DataGrid, gridPageSelector, gridPageCountSelector, useGridApiContext, useGridSelector } from '@mui/x-data-grid';
import { useDemoData } from '@mui/x-data-grid-generator';
import Box from '@mui/material/Box';

// project imports
import useDataGrid from 'hooks/useDataGrid';
import MainCard from 'ui-component/cards/MainCard';
import CardSecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { CSVExport } from 'views/forms/tables/TableExports';

// pagination toolbar
function Toolbar() {
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);

  return (
    <Pagination
      sx={(theme) => ({ padding: theme.spacing(1.5, 0) })}
      color="primary"
      count={pageCount}
      page={page + 1}
      onChange={(event, value) => apiRef.current.setPage(value - 1)}
    />
  );
}

// ==============================|| USE GRID SELECTOR DATA GRID ||============================== //

export default function UseGridSelector() {
  const dataGridStyles = useDataGrid();

  const { data, loading } = useDemoData({
    dataSet: 'Commodity',
    rowLength: 100,
    maxColumns: 8
  });

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0
  });

  let headers: any = [];
  data.columns.map((item) => {
    return headers.push({ label: item.headerName, key: item.field });
  });

  return (
    <MainCard
      content={false}
      title="With useGridSelector"
      secondary={
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <CSVExport data={data.rows} filename={'use-grid-selector-data-grid-table.csv'} header={headers} />
          <CardSecondaryAction link="https://mui.com/x/react-data-grid/state/#with-usegridselector" />
        </Stack>
      }
    >
      <Box sx={{ width: '100%', ...dataGridStyles }}>
        <DataGrid
          {...data}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          hideFooter
          slots={{ toolbar: Toolbar }}
          className="custom-data-grid"
        />
      </Box>
    </MainCard>
  );
}
