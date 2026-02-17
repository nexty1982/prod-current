// material-ui
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { DataGrid, useGridApiRef, gridPaginatedVisibleSortedGridRowIdsSelector } from '@mui/x-data-grid';
import { useDemoData } from '@mui/x-data-grid-generator';
import Box from '@mui/material/Box';

// project imports
import useDataGrid from 'hooks/useDataGrid';
import MainCard from 'ui-component/cards/MainCard';
import CardSecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { CSVExport } from 'views/forms/tables/TableExports';

// ==============================|| INITIAL STATE DATA GRID ||============================== //

export default function InitialState() {
  const dataGridStyles = useDataGrid();

  const { data } = useDemoData({
    dataSet: 'Commodity',
    rowLength: 100,
    maxColumns: 8
  });

  const apiRef = useGridApiRef();

  const handleSelectFirstVisibleRow = () => {
    const visibleRows = gridPaginatedVisibleSortedGridRowIdsSelector(apiRef);
    if (visibleRows.length === 0) {
      return;
    }

    apiRef.current?.selectRow(visibleRows[0], !apiRef.current.isRowSelected(visibleRows[0]));
  };

  let headers: any = [];
  data.columns.map((item) => {
    return headers.push({ label: item.headerName, key: item.field });
  });

  return (
    <MainCard
      content={false}
      title="Initial State with Access"
      secondary={
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Button size="small" onClick={handleSelectFirstVisibleRow}>
            Select 1st Row
          </Button>
          <CSVExport data={data.rows} filename={'initial-state-data-grid-table.csv'} header={headers} />
          <CardSecondaryAction link="https://mui.com/x/react-data-grid/state/#access-the-state" />
        </Stack>
      }
    >
      <Box sx={{ width: '100%', ...dataGridStyles }}>
        <DataGrid
          {...data}
          apiRef={apiRef}
          hideFooterSelectedRowCount
          pageSizeOptions={[10]}
          initialState={{
            ...data.initialState,
            pagination: {
              paginationModel: {
                pageSize: 10
              }
            }
          }}
        />
      </Box>
    </MainCard>
  );
}
