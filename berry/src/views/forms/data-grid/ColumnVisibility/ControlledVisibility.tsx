import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import { DataGrid, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { useDemoData } from '@mui/x-data-grid-generator';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import useDataGrid from 'hooks/useDataGrid';
import MainCard from 'ui-component/cards/MainCard';
import CardSecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { CSVExport } from 'views/forms/tables/TableExports';

// ==============================|| CONTROLLED COLUMN VISIBILITY DATA GRID ||============================== //

export default function VisibleColumnsModelControlled() {
  const theme = useTheme();
  const dataGridStyles = useDataGrid();
  const { data, loading } = useDemoData({
    dataSet: 'Commodity',
    rowLength: 20,
    maxColumns: 20
  });

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    id: false,
    brokerId: false,
    status: false
  });

  let headers: any = [];
  data.columns.map((item) => {
    return headers.push({ label: item.headerName, key: item.field });
  });

  return (
    <MainCard
      content={false}
      title="Controlled Visible Columns"
      secondary={
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <CSVExport data={data.rows} filename={'controlled-visibility-data-grid-table.csv'} header={headers} />
          <CardSecondaryAction link="https://mui.com/x/react-data-grid/column-visibility/#controlled-visible-columns" />
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
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5
              }
            }
          }}
          hideFooterSelectedRowCount
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
        />
      </Box>
    </MainCard>
  );
}
