import { useState, useEffect } from 'react';

// material-ui
import Stack from '@mui/material/Stack';
import { DataGrid, GridColDef, GridRowId } from '@mui/x-data-grid';
import Box from '@mui/material/Box';

// project imports
import useDataGrid from 'hooks/useDataGrid';
import MainCard from 'ui-component/cards/MainCard';
import CardSecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { CSVExport } from 'views/forms/tables/TableExports';

interface DataRowModel {
  id: GridRowId;
  [price: string]: number | string;
}

interface GridData {
  columns: GridColDef[];
  rows: DataRowModel[];
}

function useData(rowLength: number, columnLength: number) {
  const [data, setData] = useState<GridData>({ columns: [], rows: [] });

  useEffect(() => {
    const rows: DataRowModel[] = [];

    for (let i = 0; i < rowLength; i += 1) {
      const row: DataRowModel = {
        id: i
      };

      for (let j = 1; j <= columnLength; j += 1) {
        row[`price${j}M`] = `${i.toString()}, ${j} `;
      }

      rows.push(row);
    }

    const columns: GridColDef[] = [];

    for (let j = 1; j <= columnLength; j += 1) {
      columns.push({ field: `price${j}M`, headerName: `${j}M` });
    }

    setData({
      rows,
      columns
    });
  }, [rowLength, columnLength]);

  return data;
}

// ==============================|| COLUMN VIRTUALIZATION DATA GRID ||============================== //

export default function ColumnVirtualizationGrid() {
  const dataGridStyles = useDataGrid();
  const data = useData(100, 1000);
  let headers: any = [];
  data.columns.map((item) => {
    return headers.push({ label: item.headerName, key: item.field });
  });

  return (
    <MainCard
      content={false}
      title="Column Virtualization"
      secondary={
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <CSVExport data={data.rows} filename={'column-virtualization-data-grid-table.csv'} header={headers} />
          <CardSecondaryAction link="https://mui.com/x/react-data-grid/virtualization/#column-virtualization" />
        </Stack>
      }
    >
      <Box sx={{ height: 400, width: '100%', ...dataGridStyles }}>
        <DataGrid hideFooter {...data} columnBufferPx={2} sx={{ '& .MuiDataGrid-columnHeaderTitleContainer': { minWidth: '135px' } }} />
      </Box>
    </MainCard>
  );
}
