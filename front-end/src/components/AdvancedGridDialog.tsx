import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Toolbar,
  Chip,
  AppBar
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  TableChart as GridIcon
} from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Import AG Grid legacy themes (CSS-based only, no theming API)
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'ag-grid-community/styles/ag-theme-material.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

interface BaptismRecord {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  dateOfBaptism: string;
  placeOfBirth: string;
  placeOfBaptism: string;
  fatherName: string;
  motherName: string;
  godparentNames: string;
  priest: string;
  registryNumber: string;
  churchId: string;
  churchName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface AdvancedGridDialogProps {
  open: boolean;
  onClose: () => void;
  records: BaptismRecord[];
  onRefresh?: () => void;
}

// Available AG Grid themes (legacy CSS-based themes only)
const AG_GRID_THEMES = [
  { value: 'ag-theme-alpine', label: 'Alpine' },
  { value: 'ag-theme-balham', label: 'Balham' },
  { value: 'ag-theme-material', label: 'Material' },
  { value: 'ag-theme-quartz', label: 'Quartz' },
];

export const AdvancedGridDialog: React.FC<AdvancedGridDialogProps> = ({
  open,
  onClose,
  records,
  onRefresh
}) => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('ag-theme-alpine');

  // Debug logging for records
  React.useEffect(() => {
    console.log('🔍 AdvancedGridDialog - Records received:', {
      recordsLength: records?.length || 0,
      records: records?.slice(0, 3), // Log first 3 records for debugging
      open
    });
  }, [records, open]);

  // Column definitions for AG Grid
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Registry #',
      field: 'registryNumber',
      width: 120,
      pinned: 'left',
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    },
    {
      headerName: 'First Name',
      field: 'firstName',
      width: 140,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' }
    },
    {
      headerName: 'Last Name',
      field: 'lastName',
      width: 140,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' }
    },
    {
      headerName: 'Birth Date',
      field: 'dateOfBirth',
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
      headerName: 'Baptism Date',
      field: 'dateOfBaptism',
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
      headerName: 'Birth Place',
      field: 'placeOfBirth',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    },
    {
      headerName: 'Parents Names',
      field: 'parentNames',
      width: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      valueGetter: (params) => {
        // Combine father and mother names
        const father = params.data.fatherName || '';
        const mother = params.data.motherName || '';
        if (father && mother) {
          return `${father} & ${mother}`;
        } else if (father) {
          return father;
        } else if (mother) {
          return mother;
        }
        return '';
      }
    },
    {
      headerName: 'Sponsors',
      field: 'godparentNames',
      width: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      tooltipField: 'godparentNames'
    },
    {
      headerName: 'Priest',
      field: 'priest',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    },
    {
      headerName: 'Church',
      field: 'churchName',
      width: 200,
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true
    }
  ], []);

  // Default column properties (community features only)
  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    suppressMovable: false
  };

  // Grid ready event
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
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

  // Prepare row data with fallback
  const rowData = useMemo(() => {
    if (!records || records.length === 0) {
      console.log('⚠️ No records available for AG Grid');
      return [];
    }
    console.log(`✅ Preparing ${records.length} records for AG Grid`);
    return records;
  }, [records]);

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
              label={`${rowData.length} Records`} 
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
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              animateRows={true}
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
          Total Records: {rowData.length} | 
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

export default AdvancedGridDialog;
