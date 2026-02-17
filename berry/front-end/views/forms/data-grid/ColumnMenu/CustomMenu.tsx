// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { useDemoData } from '@mui/x-data-grid-generator';
import {
  DataGrid,
  GridColumnMenuFilterItem,
  GridColumnMenuSortItem,
  GridColumnMenuColumnsItem,
  GridColumnMenuItemProps,
  GridColumnMenuProps
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';

// project imports
import useDataGrid from 'hooks/useDataGrid';
import MainCard from 'ui-component/cards/MainCard';
import CardSecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { CSVExport } from 'views/forms/tables/TableExports';

function MenuCloseComponent(props: GridColumnMenuItemProps) {
  return (
    <Button color="primary" onClick={props.onClick}>
      Close Menu
    </Button>
  );
}

function CustomColumnMenu(props: GridColumnMenuProps) {
  const itemProps = {
    colDef: props.colDef,
    onClick: props.hideMenu
  };
  return (
    <>
      <Stack sx={{ px: 0.5, py: 0.5 }}>
        <GridColumnMenuSortItem {...itemProps} />
        {/* Only provide filtering on desk */}
        {itemProps.colDef.field === 'desk' ? <GridColumnMenuFilterItem {...itemProps} /> : null}
      </Stack>
      <Divider />
      <Stack sx={{ px: 0.5, py: 0.5 }}>
        <GridColumnMenuColumnsItem {...itemProps} />
        <MenuCloseComponent {...itemProps} />
      </Stack>
    </>
  );
}

// ==============================|| CUSTOM MENU COMPONENT DATA GRID ||============================== //

export default function CustomMenu() {
  const dataGridStyles = useDataGrid();

  const { data } = useDemoData({
    dataSet: 'Commodity',
    rowLength: 5,
    maxColumns: 8
  });

  let headers: any = [];
  data.columns.map((item) => {
    return headers.push({ label: item.headerName, key: item.field });
  });

  return (
    <MainCard
      content={false}
      title="Custom Menu Component"
      secondary={
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <CSVExport data={data.rows} filename={'custom-menu-data-grid-table.csv'} header={headers} />
          <CardSecondaryAction link="https://mui.com/x/react-data-grid/column-menu/#custom-menu-component" />
        </Stack>
      }
    >
      <Box sx={{ width: '100%', ...dataGridStyles }}>
        <DataGrid {...data} hideFooter slots={{ columnMenu: CustomColumnMenu }} className="custom-data-grid" />
      </Box>
    </MainCard>
  );
}
