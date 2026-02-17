// material-ui
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import { DataGrid } from '@mui/x-data-grid';
import { useDemoData } from '@mui/x-data-grid-generator';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import useDataGrid from 'hooks/useDataGrid';
import MainCard from 'ui-component/cards/MainCard';
import CardSecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { CSVExport } from 'views/forms/tables/TableExports';

// ==============================|| INITIALIZE COLUMN VISIBILITY DATA GRID ||============================== //

export default function VisibleColumnsModelInitialState() {
  const theme = useTheme();
  const dataGridStyles = useDataGrid();
  const { data, loading } = useDemoData({
    dataSet: 'Commodity',
    rowLength: 20,
    maxColumns: 20
  });

  let headers: any = [];
  data.columns.map((item) => {
    return headers.push({ label: item.headerName, key: item.field });
  });

  return (
    <MainCard
      content={false}
      title="Initialize Column Visibility"
      secondary={
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <CSVExport data={data.rows} filename={'column-visibility-data-grid-table.csv'} header={headers} />
          <CardSecondaryAction link="https://mui.com/x/react-data-grid/column-visibility/#initialize-the-visible-columns" />
        </Stack>
      }
    >
      <Box
        sx={{
          width: '100%',
          ...dataGridStyles,
          '& .MuiDataGrid-root': {
            '& .MuiDataGrid-cell--withRenderer > .positive': {
              color: theme.palette.mode === ThemeMode.DARK ? 'success.dark' : 'success.main'
            },
            '& .MuiDataGrid-cell--withRenderer > .negative': {
              color: theme.palette.mode === ThemeMode.DARK ? 'error.dark' : 'error.main'
            }
          }
        }}
      >
        <DataGrid
          {...data}
          loading={loading}
          hideFooterSelectedRowCount
          initialState={{
            ...data.initialState,
            pagination: {
              paginationModel: {
                pageSize: 5
              }
            },
            columns: {
              ...data.initialState?.columns,
              columnVisibilityModel: {
                id: false,
                brokerId: false,
                status: false
              }
            }
          }}
        />
      </Box>
    </MainCard>
  );
}
