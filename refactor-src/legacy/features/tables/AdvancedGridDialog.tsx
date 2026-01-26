import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Toolbar,
  AppBar,
  Tabs,
  Tab
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
import '../../styles/advanced-grid-themes.css';

// Removed unused interface definitions for cleaner code

interface AdvancedGridDialogProps {
  open: boolean;
  onClose: () => void;
  records: any[]; // Current tab records (for backward compatibility)
  onRefresh?: () => void;
  recordType?: 'baptism' | 'marriage' | 'funeral'; // Add record type for dynamic behavior
  columnDefs?: ColDef[]; // Add custom column definitions
  allRecords?: RecordsByType; // All records by type for tabs
}

// Add interface for records by type
interface RecordsByType {
  baptism: any[];
  marriage: any[];
  funeral: any[];
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
  columnDefs: customColumnDefs,
  allRecords
}) => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('ag-theme-ocean-blue');
  const [activeTab, setActiveTab] = useState<'baptism' | 'marriage' | 'funeral'>(recordType);

  // Default sort per tab
  const DEFAULT_SORT: Record<'baptism' | 'marriage' | 'funeral', { field: string; dir: 'asc' | 'desc' }> = {
    baptism: { field: 'dateOfBaptism', dir: 'desc' },
    marriage: { field: 'marriageDate', dir: 'desc' },
    funeral: { field: 'funeralDate', dir: 'desc' },
  };

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

  // Get records for the active tab
  const getRecordsForTab = (tab: string): any[] => {
    if (allRecords && allRecords[tab as keyof RecordsByType]) {
      return allRecords[tab as keyof RecordsByType] || [];
    }
    // Fallback to current records if allRecords not provided
    return records || [];
  };

  // Prepare row data with fallback - MOVED UP to fix circular dependency
  const rowData = useMemo(() => {
    const tabRecords = getRecordsForTab(activeTab);
    if (!tabRecords || tabRecords.length === 0) {
      console.log(`⚠️ No ${activeTab} records available for AG Grid`);
      return [];
    }
    console.log(`✅ Preparing ${tabRecords.length} ${activeTab} records for AG Grid`);
    return tabRecords;
  }, [activeTab, allRecords, records]); // Include both allRecords and records

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: 'baptism' | 'marriage' | 'funeral') => {
    console.log(`🔄 Tab change from ${activeTab} to ${newValue}`);
    setActiveTab(newValue);
    
    // Clear grid when switching tabs - use proper AG Grid API
    if (gridApi) {
      console.log('🔍 Grid API available, checking setRowData method...');
      if (typeof gridApi.setRowData === 'function') {
        console.log('✅ setRowData method found, clearing grid...');
        gridApi.setRowData([]);
      } else {
        console.log('⚠️ setRowData method not found on gridApi');
        console.log('🔍 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(gridApi)));
      }
    } else {
      console.log('⚠️ Grid API not available yet');
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

  // Update active tab when recordType prop changes
  React.useEffect(() => {
    setActiveTab(recordType);
  }, [recordType]);

  // Apply default sort when activeTab changes or when rowData changes
  React.useEffect(() => {
    if (gridApi && typeof gridApi.setSortModel === 'function' && rowData.length > 0) {
      const defaultSort = DEFAULT_SORT[activeTab];
      console.log(`🔄 Applying default sort: ${defaultSort.field} ${defaultSort.dir}`);
      
      // Force the sort to be applied
      setTimeout(() => {
        if (gridApi && typeof gridApi.setSortModel === 'function') {
          gridApi.setSortModel([{ colId: defaultSort.field, sort: defaultSort.dir }]);
          // Also refresh the grid to ensure sorting is visible
          if (typeof gridApi.refreshCells === 'function') {
            gridApi.refreshCells();
          }
        }
      }, 100);
    }
  }, [activeTab, gridApi, rowData]);



  // Generate column definitions dynamically from the actual data
  const getColumnDefinitions = (type: string): ColDef[] => {
    const tabRecords = getRecordsForTab(type);
    if (!tabRecords || tabRecords.length === 0) {
      return [];
    }

    // Debug: Log available fields
    console.log(`🔍 [${type}] Available fields:`, Object.keys(tabRecords[0]));

    // Helper function to create human-readable labels
    const toLabel = (fieldName: string): string => {
      return fieldName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase())
        .replace(/\b(id|Id)\b/g, 'ID');
    };

    // Helper function to determine column type and formatter
    const getColumnConfig = (fieldName: string, value: any): Partial<ColDef> => {
      const config: Partial<ColDef> = {
        headerName: toLabel(fieldName),
        field: fieldName,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        flex: 1,
        minWidth: 120
      };

      // Special handling for specific fields
      if (fieldName === 'id') {
        config.pinned = 'left';
        config.width = 80;
        config.flex = undefined;
      }

      // Date fields
      if (fieldName.includes('date') || fieldName.includes('Date') || 
          fieldName === 'dateOfBaptism' || fieldName === 'marriageDate' || 
          fieldName === 'funeralDate' || fieldName === 'deathDate' ||
          fieldName === 'birthDate') {
        config.filter = 'agDateColumnFilter';
        config.valueFormatter = (params) => {
          if (params.value) {
            return new Date(params.value).toLocaleDateString();
          }
          return '';
        };
      }

      // Number fields
      if (typeof value === 'number') {
        config.filter = 'agNumberColumnFilter';
      }

      // Name fields - make them bold
      if (fieldName.includes('name') || fieldName.includes('Name') ||
          fieldName === 'firstName' || fieldName === 'lastName' ||
          fieldName === 'groomFirstName' || fieldName === 'groomLastName' ||
          fieldName === 'brideFirstName' || fieldName === 'brideLastName') {
        config.cellStyle = { fontWeight: 'bold' };
      }

      return config;
    };

    // Define specific field order for each record type
    // Note: These are the actual field names from the backend (camelCase aliases)
    let orderedFields: string[] = [];
    
    if (type === 'baptism') {
      orderedFields = ['id', 'firstName', 'lastName', 'birthDate', 'dateOfBaptism', 'birthplace', 'entryType', 'sponsors', 'parents', 'clergy'];
    } else if (type === 'marriage') {
      orderedFields = ['id', 'marriageDate', 'groomFirstName', 'groomLastName', 'groomParents', 'brideFirstName', 'brideLastName', 'brideParents', 'witness', 'marriageLicense', 'clergy'];
    } else if (type === 'funeral') {
      orderedFields = ['id', 'deathDate', 'funeralDate', 'firstName', 'lastName', 'age', 'burialLocation', 'clergy'];
    }

    // Ensure clergy is always the last column - force it to the end
    if (orderedFields.includes('clergy')) {
      orderedFields = orderedFields.filter(field => field !== 'clergy');
      orderedFields.push('clergy');
    }

    // Build columns in the specified order, excluding system fields
    const systemFields = ['church_id', 'created_at', 'updated_at'];
    
    // First, check which fields actually exist in the data
    const availableFields = orderedFields.filter(field => {
      const exists = field in tabRecords[0];
      if (!exists) {
        console.log(`⚠️ [${type}] Field '${field}' not found in data`);
      }
      return exists && !systemFields.includes(field);
    });
    
    console.log(`🔍 [${type}] Available fields from ordered list:`, availableFields);
    
    // Create columns in the exact order specified, only for fields that exist
    const columns = availableFields.map(field => {
      const config = getColumnConfig(field, tabRecords[0]?.[field]);
      console.log(`🔍 [${type}] Processing field '${field}':`, config);
      
      // Ensure clergy column is always last
      if (field === 'clergy') {
        config.pinned = 'right';
        config.width = 150;
        config.flex = undefined;
      }
      
      return config;
    }).filter(Boolean); // Remove any undefined columns

    console.log(`🔍 [${type}] Final columns:`, columns.map(col => col.field));
    return columns;
  };

  // Column definitions for AG Grid - use custom columns if provided, otherwise use record type specific columns
  const columnDefs: ColDef[] = useMemo(() => {
    const cols = customColumnDefs || getColumnDefinitions(activeTab);
    
    // Ensure the default sort column is marked as sorted
    if (cols.length > 0) {
      const defaultSort = DEFAULT_SORT[activeTab];
      const sortCol = cols.find(col => col.field === defaultSort.field);
      if (sortCol) {
        sortCol.sort = defaultSort.dir;
        sortCol.sortIndex = 0;
      }
    }
    
    return cols;
  }, [customColumnDefs, activeTab, allRecords, records]);

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
    console.log('🔍 Grid API methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(params.api)));
    
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
        if (typeof params.api.setColumnWidths === 'function') {
          params.api.setColumnWidths([{ key: column.getColId(), newWidth: minWidth }]);
        }
      }
    });
    
    // Force refresh to ensure all columns are displayed
    if (typeof params.api.refreshCells === 'function') {
      params.api.refreshCells();
    }
    
    // Apply default sort for the current tab
    const defaultSort = DEFAULT_SORT[activeTab];
    if (typeof params.api.setSortModel === 'function') {
      console.log(`🎯 Grid ready - applying default sort: ${defaultSort.field} ${defaultSort.dir}`);
      params.api.setSortModel([{ colId: defaultSort.field, sort: defaultSort.dir }]);
      
      // Force refresh to ensure sorting is visible
      setTimeout(() => {
        if (typeof params.api.refreshCells === 'function') {
          params.api.refreshCells();
        }
      }, 50);
    }


    
    console.log('🎯 Final column count:', params.api.getAllDisplayedColumns().length);
  };

  // Theme change handler - removed for cleaner UI

  // Handle export to CSV
  const handleExport = () => {
    if (gridApi && gridApi.exportDataAsCsv) {
      const fileName = `${activeTab}-records-${new Date().toISOString().split('T')[0]}.csv`;
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
    // Also refresh the grid data if available
    if (gridApi && gridApi.refreshCells) {
      gridApi.refreshCells();
    }
  };

  // rowData is now defined above to fix circular dependency

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
               {getRecordTypeTitle(activeTab)} - Advanced Grid View
             </Typography>
            
                         {/* Records Count - Hidden for cleaner UI */}
             {/* <Chip 
               label={`${rowData.length} Records`} 
               color="primary" 
               variant="outlined" 
             /> */}
            
                         {/* Theme Selector - Hidden for cleaner UI */}
             {/* <FormControl size="small" sx={{ minWidth: 140 }}>
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
             </FormControl> */}
            
            {/* Action Buttons */}
            <IconButton 
              onClick={handleRefresh}
              title="Refresh Data"
              color="inherit"
            >
              <RefreshIcon />
            </IconButton>
            
                         {/* Show All Columns button - Hidden for cleaner UI */}
             {/* <IconButton 
               onClick={() => {
                 if (gridApi && gridApi.getAllDisplayedColumns && gridApi.setColumnsVisible && gridApi.sizeColumnsToFit) {
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
             </IconButton> */}
            
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
         {/* Tabs for different record types */}
         <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
           <Tabs value={activeTab} onChange={handleTabChange} aria-label="record type tabs">
             <Tab label="Baptism Records" value="baptism" />
             <Tab label="Marriage Records" value="marriage" />
             <Tab label="Funeral Records" value="funeral" />
           </Tabs>
         </Box>
         
                   <Box sx={{ height: 'calc(100% - 80px)', width: '100%' }}>
            <div 
              className={selectedTheme} 
              style={{ 
                height: '100%', 
                width: '100%'
              }}
            >
                                                                               <AgGridReact
                 rowData={rowData}
                 columnDefs={columnDefs}
                 defaultColDef={defaultColDef}
                 onGridReady={onGridReady}
                                   pagination={false}
                  animateRows={true}
                  enableCellTextSelection={true}
                  enableBrowserTooltips={true}
                  theme="legacy"
                  tooltipShowDelay={500}
                  loadingOverlayComponent="agLoadingOverlay"
                  noRowsOverlayComponent="agNoRowsOverlay"
                  overlayNoRowsTemplate={`<span>No ${activeTab} records found</span>`}
                  overlayLoadingTemplate={`<span>Loading ${activeTab} records...</span>`}
                  rowHeight={40}
                  headerHeight={45}
                  maintainColumnOrder={true}
                  suppressColumnVirtualisation={false}
                  suppressRowVirtualisation={false}
                  getRowId={(params) => params.data.id.toString()}
                  suppressMenuHide={false}
                  suppressMovableColumns={false}
                  suppressRowClickSelection={true}
                  // Ensure proper sorting
                  defaultSortModel={[{ colId: DEFAULT_SORT[activeTab].field, sort: DEFAULT_SORT[activeTab].dir }]}
                              />
           </div>
           
                       
         </Box>
       </DialogContent>

             {/* Clean Footer */}
       <DialogActions sx={{ justifyContent: 'flex-end', px: 3, py: 1 }}>
         <Button onClick={onClose} variant="outlined">
           Close
         </Button>
       </DialogActions>
    </Dialog>
  );
};

export default AdvancedGridDialog;
