// eslint-disable-next-line
import * as DataGrid from '@mui/material/DataGrid';
import { GridRowModesModel, GridRowsProp } from '@mui/x-data-grid';

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides {
    selectedCellParams: SelectedCellParams | null;
    setSelectedCellParams: (value: SelectedCellParams) => void;
    cellModesModel: GridCellModesModel;
    setCellModesModel: (value: GridCellModesModel) => void;
    cellMode: 'view' | 'edit';
    setRows: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void;
    setRowModesModel: (newModel: (oldModel: GridRowModesModel) => GridRowModesModel) => void;
  }
}
