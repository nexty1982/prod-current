import { useMemo } from 'react';

// material-ui
import Stack from '@mui/material/Stack';
import { DataGrid, GetApplyQuickFilterFn, GridLogicOperator } from '@mui/x-data-grid';
import { useDemoData } from '@mui/x-data-grid-generator';
import Box from '@mui/material/Box';

// project imports
import useDataGrid from 'hooks/useDataGrid';
import MainCard from 'ui-component/cards/MainCard';
import CardSecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { CSVExport } from 'views/forms/tables/TableExports';

const getApplyQuickFilterFnSameYear: GetApplyQuickFilterFn<any, unknown> = (value) => {
  if (!value || value.length !== 4 || !/\d{4}/.test(value)) {
    // If the value is not a 4-digit string, it cannot be a year so applying this filter is useless
    return null;
  }
  return (cellValue) => {
    if (cellValue instanceof Date) {
      return cellValue.getFullYear() === Number(value);
    }
    return false;
  };
};

const VISIBLE_FIELDS = ['name', 'rating', 'country', 'dateCreated', 'isAdmin', 'email', 'phone'];

// ==============================|| PARSING VALUES DATA GRID ||============================== //

export default function ParsingValues() {
  const dataGridStyles = useDataGrid();

  const { data } = useDemoData({
    dataSet: 'Employee',
    visibleFields: VISIBLE_FIELDS,
    rowLength: 100
  });

  // Otherwise filter will be applied on fields such as the hidden column id
  const columns = useMemo(
    () =>
      data.columns
        .filter((column) => VISIBLE_FIELDS.includes(column.field))
        .map((column) => {
          if (column.field === 'dateCreated') {
            return {
              ...column,
              getApplyQuickFilterFn: getApplyQuickFilterFnSameYear
            };
          }
          if (column.field === 'name') {
            return {
              ...column,
              getApplyQuickFilterFn: undefined
            };
          }
          return column;
        }),
    [data.columns]
  );

  let headers: any = [];
  columns.map((item) => {
    return headers.push({ label: item.headerName, key: item.field });
  });

  return (
    <MainCard
      content={false}
      title="Parsing Values"
      secondary={
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <CSVExport data={data.rows} filename={'parsing-value-data-grid-table.csv'} header={headers} />
          <CardSecondaryAction link="https://mui.com/x/react-data-grid/filtering/quick-filter/#parsing-values" />
        </Stack>
      }
    >
      <Box sx={{ width: '100%', ...dataGridStyles }}>
        <DataGrid
          {...data}
          columns={columns}
          initialState={{
            ...data.initialState,
            pagination: {
              paginationModel: {
                pageSize: 5
              }
            },
            filter: {
              ...data.initialState?.filter,
              filterModel: {
                items: [],
                quickFilterLogicOperator: GridLogicOperator.Or
              }
            }
          }}
          hideFooterSelectedRowCount
          showToolbar
        />
      </Box>
    </MainCard>
  );
}
