import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Toolbar,
  AppBar,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Palette as ThemeIcon,
  TableChart as GridIcon
} from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi, ColumnApi } from 'ag-grid-community';

// Import AG Grid themes
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-alpine-dark.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'ag-grid-community/styles/ag-theme-balham-dark.css';
import 'ag-grid-community/styles/ag-theme-material.css';

interface BaptismRecord {
  id: number;
  first_name: string;
  last_name: string;
  date_of_baptism: string;
  place_of_baptism: string;
  priest_name: string;
  godparents: string;
  date_of_birth: string;
  place_of_birth: string;
  father_name: string;
  mother_name: string;
  created_at: string;
  updated_at: string;
}

interface AdvancedGridWindowProps {
  records: BaptismRecord[];
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

// Available AG Grid themes
const AG_GRID_THEMES = [
  { value: 'ag-theme-alpine', label: 'Alpine' },
  { value: 'ag-theme-alpine-dark', label: 'Alpine Dark' },
  { value: 'ag-theme-balham', label: 'Balham' },
  { value: 'ag-theme-balham-dark', label: 'Balham Dark' },
  { value: 'ag-theme-material', label: 'Material' },
];

export const BaptismAdvancedGrid: React.FC<AdvancedGridWindowProps> = ({
  records,
  open,
  onClose,
  onRefresh
}) => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [columnApi, setColumnApi] = useState<ColumnApi | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('ag-theme-alpine');

  // Column definitions for AG Grid
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'ID',
      field: 'id',
      width: 80,
      pinned: 'left',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true
    },
    {
      headerName: 'First Name',
      field: 'first_name',
      width: 140,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' }
    },
    {
      headerName: 'Last Name',
      field: 'last_name',
      width: 140,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' }
    },
    {
      headerName: 'Baptism Date',
      field: 'date_of_baptism',
      width: 130,
      sortable: true,
      filter: 'agDateColumnFilter',
      resizable: true,
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return '';
      }
    },
    {
      headerName: 'Baptism Place',
      field: 'place_of_baptism',
      width: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    },
    {
      headerName: 'Priest',
      field: 'priest_name',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    },
    {
      headerName: 'Godparents',
      field: 'godparents',
      width: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      tooltipField: 'godparents'
    },
    {
      headerName: 'Birth Date',
      field: 'date_of_birth',
      width: 130,
      sortable: true,
      filter: 'agDateColumnFilter',
      resizable: true,
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return 'N/A';
      }
    },
    {
      headerName: 'Birth Place',
      field: 'place_of_birth',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    },
    {
      headerName: 'Father',
      field: 'father_name',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    },
    {
      headerName: 'Mother',
      field: 'mother_name',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    },
    {
      headerName: 'Created',
      field: 'created_at',
      width: 130,
      sortable: true,
      filter: 'agDateColumnFilter',
      resizable: true,
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return '';
      }
    },
    {
      headerName: 'Updated',
      field: 'updated_at',
      width: 130,
      sortable: true,
      filter: 'agDateColumnFilter',
      resizable: true,
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return '';
      }
    }
  ], []);

  // Default column properties
  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    suppressMovable: false,
    menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab']
  };

  // Grid ready event
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
    setColumnApi(params.columnApi);
    
    // Auto-size columns to fit content
    params.api.sizeColumnsToFit();
  };

  // Handle theme change
  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
  };

  // Handle export to CSV
  const handleExport = () => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: `baptism-records-${new Date().toISOString().split('T')[0]}.csv`
      });
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: { 
          width: '95vw',
          height: '90vh',
          maxWidth: 'none',
          maxHeight: 'none',
          m: 2
        }
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar sx={{ gap: 2 }}>
            <GridIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Baptism Records - Advanced Grid View
            </Typography>
            
            {/* Records Count */}
            <Chip 
              label={`${records.length} Records`} 
              color="primary" 
              variant="outlined" 
            />
            
            {/* Theme Selector */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Theme</InputLabel>
              <Select
                value={selectedTheme}
                label="Theme"
                onChange={(e) => handleThemeChange(e.target.value)}
              >
                {AG_GRID_THEMES.map((theme) => (
                  <MenuItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Action Buttons */}
            <IconButton 
              onClick={handleRefresh}
              title="Refresh Data"
              color="inherit"
            >
              <RefreshIcon />
            </IconButton>
            
            <IconButton 
              onClick={handleExport}
              title="Export to CSV"
              color="inherit"
            >
              <ExportIcon />
            </IconButton>
            
            <IconButton 
              onClick={onClose}
              title="Close Window"
              color="inherit"
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      </DialogTitle>

      <DialogContent sx={{ p: 2, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: '100%' }}>
          <div className={selectedTheme} style={{ height: '100%', width: '100%' }}>
            <AgGridReact
              rowData={records}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              animateRows={true}
              enableRangeSelection={true}
              enableCellTextSelection={true}
              suppressRowClickSelection={true}
              rowMultiSelectWithClick={false}
              enableBrowserTooltips={true}
              tooltipShowDelay={500}
              loadingOverlayComponent="agLoadingOverlay"
              noRowsOverlayComponent="agNoRowsOverlay"
              overlayNoRowsTemplate="<span>No baptism records found</span>"
              overlayLoadingTemplate="<span>Loading baptism records...</span>"
              rowHeight={40}
              headerHeight={45}
              maintainColumnOrder={true}
              suppressColumnVirtualisation={false}
              suppressRowVirtualisation={false}
              getRowId={(params) => params.data.id.toString()}
            />
          </div>
        </Box>
      </DialogContent>

      {/* Footer with Grid Statistics */}
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Total Records: {records.length} | 
          Theme: {AG_GRID_THEMES.find(t => t.value === selectedTheme)?.label} | 
          Last Updated: {new Date().toLocaleTimeString()}
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BaptismAdvancedGrid;
