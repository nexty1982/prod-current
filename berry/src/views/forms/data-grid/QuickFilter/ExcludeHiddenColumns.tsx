import { useState } from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

import { DataGrid, GridRowsProp, GridColDef, GridFilterModel, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { randomTraderName, randomEmail } from '@mui/x-data-grid-generator';

// project imports
import useDataGrid from 'hooks/useDataGrid';
import MainCard from 'ui-component/cards/MainCard';
import CardSecondaryAction from 'ui-component/cards/CardSecondaryAction';

// table data
const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', flex: 0.25, minWidth: 120 },
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 150 },
  { field: 'age', headerName: 'Age', flex: 1, minWidth: 100 }
];

const rows: GridRowsProp = [
  { id: 1, name: randomTraderName(), email: randomEmail(), age: 25 },
  { id: 2, name: randomTraderName(), email: randomEmail(), age: 36 },
  { id: 3, name: randomTraderName(), email: randomEmail(), age: 19 },
  { id: 4, name: randomTraderName(), email: randomEmail(), age: 28 },
  { id: 5, name: randomTraderName(), email: randomEmail(), age: 23 },
  { id: 6, name: randomTraderName(), email: randomEmail(), age: 27 },
  { id: 7, name: randomTraderName(), email: randomEmail(), age: 18 },
  { id: 8, name: randomTraderName(), email: randomEmail(), age: 31 },
  { id: 9, name: randomTraderName(), email: randomEmail(), age: 24 },
  { id: 10, name: randomTraderName(), email: randomEmail(), age: 35 }
];
// ==============================|| EXCLUDE HIDDEN COLUMN DATA GRID ||============================== //

export default function ExcludeHiddenColumn() {
  const dataGridStyles = useDataGrid();
  const downSM = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const [filterModel, setFilterModel] = useState<GridFilterModel>({
    items: [],
    quickFilterExcludeHiddenColumns: true,
    quickFilterValues: ['1']
  });

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({});

  return (
    <MainCard
      {...(downSM && { sx: { '& .MuiCardHeader-root': { flexDirection: 'column', alignItems: 'flex-start' } } })}
      content={false}
      title="Exclude Hidden Column"
      secondary={
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', ...(downSM && { mt: 2.5 }), '& .MuiFormControlLabel-label': { mb: -1 } }}
        >
          <FormControlLabel
            checked={columnVisibilityModel.id !== false}
            onChange={(event) => setColumnVisibilityModel(() => ({ id: (event.target as any).checked }))}
            control={<Switch color="primary" size="small" sx={{ mb: -0.75 }} />}
            label="Show ID column"
          />
          <FormControlLabel
            checked={filterModel.quickFilterExcludeHiddenColumns}
            onChange={(event) =>
              setFilterModel((model) => ({
                ...model,
                quickFilterExcludeHiddenColumns: (event.target as any).checked
              }))
            }
            control={<Switch color="primary" size="small" sx={{ mb: -0.75 }} />}
            label="Exclude Hidden Columns"
          />
          <CardSecondaryAction link="https://mui.com/x/react-data-grid/filtering/quick-filter/#excluding-hidden-columns" />
        </Stack>
      }
    >
      <Box
        sx={{
          width: '100%',
          ...dataGridStyles,
          '& .MuiDataGrid-root': {
            '& .MuiDataGrid-toolbarContainer': {
              pl: 3,
              pr: 2,
              pt: 2,
              '& .MuiButton-root': {
                p: 1,
                color: 'common.white',
                borderRadius: 1.5,
                bgcolor: 'primary.main'
              },
              '& .MuiFormControl-root > .MuiInput-root': {
                p: 0.6,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'grey.50'
              },
              '& .MuiFormControl-root > .MuiInputBase-root:after': {
                display: 'none'
              },
              '& .MuiFormControl-root > .MuiInputBase-root:before': {
                display: 'none'
              },
              '& .MuiFormControl-root > .Mui-focused': {
                border: '1px solid',
                borderColor: 'primary.main'
              }
            }
          }
        }}
      >
        <DataGrid
          columns={columns}
          rows={rows}
          disableColumnFilter
          disableDensitySelector
          hideFooterSelectedRowCount
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5
              }
            }
          }}
          showToolbar
          filterModel={filterModel}
          onFilterModelChange={(newModel) => setFilterModel(newModel)}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
        />
      </Box>
    </MainCard>
  );
}
