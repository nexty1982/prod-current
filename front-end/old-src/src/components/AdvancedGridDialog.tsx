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
  TableChart as GridIcon,
  TableChart as TableChartIcon
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
// Import custom themes
import '../styles/advanced-grid-themes.css';

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

interface MarriageRecord {
  id: string;
  registryNumber: string;
  dateOfMarriage: string;
  placeOfMarriage: string;
  groomFirstName: string;
  groomLastName: string;
  groomAge: number;
  groomBirthplace: string;
  groomFather: string;
  groomMother: string;
  brideFirstName: string;
  brideLastName: string;
  brideAge: number;
  brideBirthplace: string;
  brideFather: string;
  brideMother: string;
  witness1: string;
  witness2: string;
  koumbaro: string;
  priest: string;
  churchId: string;
  churchName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface FuneralRecord {
  id: string;
  registryNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  dateOfDeath: string;
  dateOfFuneral: string;
  ageAtDeath: number;
  placeOfBirth: string;
  placeOfDeath: string;
  placeOfBurial: string;
  causeOfDeath: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  survivingFamily: string;
  priest: string;
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
  records: any[]; // Made generic to accept any record type
  onRefresh?: () => void;
  recordType?: 'baptism' | 'marriage' | 'funeral'; // Add record type for dynamic behavior
  columnDefs?: ColDef[]; // Add custom column definitions
}

// Custom AG Grid themes with beautiful color schemes
const AG_GRID_THEMES = [
  { value: 'ag-theme-ocean-blue', label: 'Ocean Blue' },
  { value: 'ag-theme-forest-green', label: 'Forest Green' },
  { value: 'ag-theme-sunset-orange', label: 'Sunset Orange' },
  { value: 'ag-theme-royal-purple', label: 'Royal Purple' },
  { value: 'ag-theme-midnight-dark', label: 'Midnight Dark' },
];

export const AdvancedGridDialog: React.FC<AdvancedGridDialogProps> = ({
  open,
  onClose,
  records,
  onRefresh,
  recordType = 'baptism',
  columnDefs: customColumnDefs
}) => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('ag-theme-ocean-blue');

  // Get the proper title based on record type
  const getRecordTypeTitle = (type: string) => {
    switch (type) {
      case 'marriage':
        return 'Marriage Records';
      case 'funeral':
        return 'Funeral Records';
      case 'baptism':
      default:
        return 'Baptism Records';
    }
  };

  // Debug logging for records
  React.useEffect(() => {
    console.log('🔍 AdvancedGridDialog - Records received:', {
      recordsLength: records?.length || 0,
      records: records?.slice(0, 3), // Log first 3 records for debugging
      open
    });
  }, [records, open]);

  // Get comprehensive column definitions based on record type
  const getColumnDefinitions = (type: string): ColDef[] => {
    switch (type) {
      case 'baptism':
        return [
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
            headerName: 'Middle Name',
            field: 'middleName',
            width: 140,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
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
            headerName: 'Baptism Place',
            field: 'placeOfBaptism',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Father Name',
            field: 'fatherName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Mother Name',
            field: 'motherName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Godparent Names',
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
          },
          {
            headerName: 'Notes',
            field: 'notes',
            width: 200,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true,
            tooltipField: 'notes'
          },
          {
            headerName: 'Created Date',
            field: 'createdAt',
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
            headerName: 'Created By',
            field: 'createdBy',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          }
        ];

      case 'marriage':
        return [
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
            headerName: 'Marriage Date',
            field: 'dateOfMarriage',
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
            headerName: 'Marriage Place',
            field: 'placeOfMarriage',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Groom First Name',
            field: 'groomFirstName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true,
            cellStyle: { fontWeight: 'bold' }
          },
          {
            headerName: 'Groom Last Name',
            field: 'groomLastName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true,
            cellStyle: { fontWeight: 'bold' }
          },
          {
            headerName: 'Groom Age',
            field: 'groomAge',
            width: 100,
            sortable: true,
            filter: 'agNumberColumnFilter',
            resizable: true
          },
          {
            headerName: 'Groom Birthplace',
            field: 'groomBirthplace',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Groom Father',
            field: 'groomFather',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Groom Mother',
            field: 'groomMother',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Bride First Name',
            field: 'brideFirstName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true,
            cellStyle: { fontWeight: 'bold' }
          },
          {
            headerName: 'Bride Last Name',
            field: 'brideLastName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true,
            cellStyle: { fontWeight: 'bold' }
          },
          {
            headerName: 'Bride Age',
            field: 'brideAge',
            width: 100,
            sortable: true,
            filter: 'agNumberColumnFilter',
            resizable: true
          },
          {
            headerName: 'Bride Birthplace',
            field: 'brideBirthplace',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Bride Father',
            field: 'brideFather',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Bride Mother',
            field: 'brideMother',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Witness 1',
            field: 'witness1',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Witness 2',
            field: 'witness2',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Koumbaro',
            field: 'koumbaro',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
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
          },
          {
            headerName: 'Notes',
            field: 'notes',
            width: 200,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true,
            tooltipField: 'notes'
          },
          {
            headerName: 'Created Date',
            field: 'createdAt',
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
            headerName: 'Created By',
            field: 'createdBy',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          }
        ];

      case 'funeral':
        return [
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
            headerName: 'Middle Name',
            field: 'middleName',
            width: 140,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
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
            headerName: 'Death Date',
            field: 'dateOfDeath',
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
            headerName: 'Funeral Date',
            field: 'dateOfFuneral',
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
            headerName: 'Age at Death',
            field: 'ageAtDeath',
            width: 60,
            sortable: true,
            filter: 'agNumberColumnFilter',
            resizable: true
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
            headerName: 'Death Place',
            field: 'placeOfDeath',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Burial Place',
            field: 'placeOfBurial',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Cause of Death',
            field: 'causeOfDeath',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Father Name',
            field: 'fatherName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Mother Name',
            field: 'motherName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Spouse Name',
            field: 'spouseName',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          },
          {
            headerName: 'Surviving Family',
            field: 'survivingFamily',
            width: 200,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true,
            tooltipField: 'survivingFamily'
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
          },
          {
            headerName: 'Notes',
            field: 'notes',
            width: 200,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true,
            tooltipField: 'notes'
          },
          {
            headerName: 'Created Date',
            field: 'createdAt',
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
            headerName: 'Created By',
            field: 'createdBy',
            width: 150,
            sortable: true,
            filter: 'agTextColumnFilter',
            resizable: true
          }
        ];

      default:
        return [];
    }
  };

  // Column definitions for AG Grid - use custom columns if provided, otherwise use record type specific columns
  const columnDefs: ColDef[] = useMemo(() => 
    customColumnDefs || getColumnDefinitions(recordType), [customColumnDefs, recordType]);

  // Default column properties (community features only)
  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    suppressMovable: false,
    hide: false // Ensure all columns are visible by default
  };

  // Grid ready event
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
    console.log('✅ AG Grid ready with', params.api.getDisplayedRowCount(), 'rows');
    
    // Get all column definitions
    const allColumnDefs = params.api.getColumnDefs();
    console.log('📋 All column definitions:', allColumnDefs?.map(col => (col as any).field || col.headerName));
    
    // Ensure all columns are visible by default
    const allColumns = params.api.getAllDisplayedColumns();
    console.log('📊 All displayed columns:', allColumns.map(col => col.getColId()));
    
    // Get all columns (including hidden ones)
    const allGridColumns = params.api.getAllGridColumns();
    console.log('🔍 All grid columns:', allGridColumns.map(col => col.getColId()));
    
    // Ensure all columns are shown and expand them to show full content
    allColumns.forEach(column => {
      if (column.isVisible()) {
        console.log(`✅ Column visible: ${column.getColId()}`);
        // Set minimum width to ensure content is not truncated
        // Use a larger minimum width for better content visibility
        const minWidth = Math.max(column.getActualWidth(), 200);
        params.api.setColumnWidths([{ key: column.getColId(), newWidth: minWidth }]);
      }
    });
    
    // Force refresh to ensure all columns are displayed
    params.api.refreshCells();
    
    console.log('🎯 Final column count:', params.api.getAllDisplayedColumns().length);
  };

  // Handle theme change
  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
  };

  // Handle export to CSV
  const handleExport = () => {
    if (gridApi) {
      const fileName = `${recordType}-records-${new Date().toISOString().split('T')[0]}.csv`;
      gridApi.exportDataAsCsv({
        fileName: fileName
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
              {getRecordTypeTitle(recordType)} - Advanced Grid View
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
              onClick={() => {
                if (gridApi) {
                  // Show all columns
                  const allColumns = gridApi.getAllDisplayedColumns();
                  allColumns.forEach(column => {
                    gridApi.setColumnsVisible([column], true);
                  });
                  gridApi.sizeColumnsToFit();
                }
              }}
              title="Show All Columns"
              color="inherit"
            >
              <TableChartIcon />
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
              enableBrowserTooltips={true}
              theme="legacy"
              tooltipShowDelay={500}
              loadingOverlayComponent="agLoadingOverlay"
              noRowsOverlayComponent="agNoRowsOverlay"
              overlayNoRowsTemplate={`<span>No ${recordType} records found</span>`}
              overlayLoadingTemplate={`<span>Loading ${recordType} records...</span>`}
              rowHeight={40}
              headerHeight={45}
              maintainColumnOrder={true}
              suppressColumnVirtualisation={false}
              suppressRowVirtualisation={false}
              getRowId={(params) => params.data.id.toString()}
              suppressMenuHide={false}
              suppressMovableColumns={false}
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
