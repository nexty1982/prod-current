import React, { useMemo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { enhancedTableStore } from '@/store/enhancedTableStore';
import { getCompletenessSeverity } from '../quality/recordCompleteness';

// Note: AG Grid CSS is imported globally in main.tsx to avoid duplicates
// Import custom themes (contains ag-theme-ocean-blue and other custom themes)
import '@/styles/advanced-grid-themes.css';

export interface AdvancedRecordsGridProps {
  rowData: any[];
  columnDefs: ColDef[];
  recordType: 'baptism' | 'marriage' | 'funeral';
  churchId: number;
  loading?: boolean;
  onRowClick?: (row: any) => void;
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
  containerId?: string;
  highlightIncomplete?: boolean;
}

const AdvancedRecordsGrid: React.FC<AdvancedRecordsGridProps> = ({
  rowData,
  columnDefs,
  recordType,
  churchId,
  loading = false,
  onRowClick,
  defaultSort,
  containerId,
  highlightIncomplete = false,
}) => {
  const [gridApi, setGridApi] = React.useState<GridApi | null>(null);
  const [enhancedTableState, setEnhancedTableState] = React.useState(enhancedTableStore.getState());
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [heightPx, setHeightPx] = useState<number>(600); // Default fallback height

  // Subscribe to enhanced table store changes
  useEffect(() => {
    const unsubscribe = enhancedTableStore.subscribe(() => {
      setEnhancedTableState(enhancedTableStore.getState());
    });
    return unsubscribe;
  }, []);

  // Compute container height in pixels using useLayoutEffect
  const computeHeight = useCallback(() => {
    if (!hostRef.current) return;
    
    const rect = hostRef.current.getBoundingClientRect();
    const computedHeight = window.innerHeight - rect.top - 28; // 28px bottom padding
    const clampedHeight = Math.max(240, computedHeight); // Minimum 240px
    
    if (import.meta.env.DEV) {
      console.log('📏 AdvancedRecordsGrid: Computing height', {
        windowHeight: window.innerHeight,
        rectTop: rect.top,
        computedHeight,
        clampedHeight,
        previousHeight: heightPx
      });
    }
    
    if (clampedHeight !== heightPx) {
      setHeightPx(clampedHeight);
    }
  }, [heightPx]);

  // Compute height on mount and when dependencies change
  useLayoutEffect(() => {
    computeHeight();
  }, [computeHeight]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      computeHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [computeHeight]);

  // Call sizeColumnsToFit() and resetRowHeights() when height changes or grid is ready
  useEffect(() => {
    if (!gridApi || gridApi.isDestroyed()) return;

    const performLayout = () => {
      requestAnimationFrame(() => {
        if (gridApi && !gridApi.isDestroyed()) {
          try {
            if (typeof gridApi.sizeColumnsToFit === 'function') {
              gridApi.sizeColumnsToFit();
            }
            if (typeof gridApi.resetRowHeights === 'function') {
              gridApi.resetRowHeights();
            }
          } catch (error) {
            console.warn('Error performing layout:', error);
          }
        }
      });
    };

    performLayout();
  }, [gridApi, heightPx]);

  // Row class rules for completeness highlighting
  const rowClassRules = useMemo(() => {
    if (!highlightIncomplete) return undefined;
    
    return {
      'ag-row-incomplete-warning': (params: any) => {
        if (!params.data || !recordType) return false;
        const result = getCompletenessSeverity(recordType, params.data);
        return result.severity === 1;
      },
      'ag-row-incomplete-critical': (params: any) => {
        if (!params.data || !recordType) return false;
        const result = getCompletenessSeverity(recordType, params.data);
        return result.severity === 2;
      },
    };
  }, [highlightIncomplete, recordType]);

  // Default column properties for AG Grid
  const defaultColDef: ColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    suppressMovable: false,
    hide: false,
    headerStyle: {
      backgroundColor: enhancedTableState.tokens.headerBg,
      color: enhancedTableState.tokens.headerText,
      borderColor: enhancedTableState.tokens.border,
      fontWeight: 'bold',
      fontSize: '16px',
    },
    cellStyle: (params: any) => {
      const rowIndex = params.node?.rowIndex ?? 0;
      return {
        backgroundColor: rowIndex % 2 === 0 
          ? enhancedTableState.tokens.rowEvenBg 
          : enhancedTableState.tokens.rowOddBg,
        color: enhancedTableState.tokens.cellText,
        borderColor: enhancedTableState.tokens.border,
        fontSize: '15px',
      };
    },
  }), [enhancedTableState.tokens]);

  // Apply theme colors to column headers
  const themedColumnDefs = useMemo(() => {
    return columnDefs.map(col => ({
      ...col,
      headerStyle: {
        ...col.headerStyle,
        backgroundColor: enhancedTableState.tokens.headerBg,
        background: enhancedTableState.tokens.headerBg,
        color: enhancedTableState.tokens.headerText,
        borderColor: enhancedTableState.tokens.border,
        borderBottomColor: enhancedTableState.tokens.border,
        fontWeight: 'bold',
        fontSize: '16px',
      },
    }));
  }, [columnDefs, enhancedTableState.tokens]);

  // Grid ready event
  const onGridReady = useCallback((params: GridReadyEvent) => {
    if (params.api.isDestroyed()) {
      console.warn('AG Grid is already destroyed, skipping initialization');
      return;
    }
    
    setGridApi(params.api);
    
    // Apply default sort if provided
    if (defaultSort && typeof params.api.applyColumnState === 'function' && !params.api.isDestroyed()) {
      try {
        params.api.applyColumnState({
          state: [{ colId: defaultSort.field, sort: defaultSort.dir }],
          defaultState: { sort: null }
        });
      } catch (error) {
        console.error('Error applying column state:', error);
      }
    }
    
    // Perform layout after grid is ready
    requestAnimationFrame(() => {
      if (!params.api.isDestroyed()) {
        try {
          if (typeof params.api.sizeColumnsToFit === 'function') {
            params.api.sizeColumnsToFit();
          }
          if (typeof params.api.resetRowHeights === 'function') {
            params.api.resetRowHeights();
          }
        } catch (error) {
          console.warn('Error performing layout on grid ready:', error);
        }
      }
    });
  }, [defaultSort]);

  // Handle first data rendered - ensures layout after data loads
  const onFirstDataRendered = useCallback((params: any) => {
    if (!params.api || params.api.isDestroyed()) return;
    
    requestAnimationFrame(() => {
      if (!params.api.isDestroyed()) {
        try {
          if (typeof params.api.sizeColumnsToFit === 'function') {
            params.api.sizeColumnsToFit();
          }
          if (typeof params.api.resetRowHeights === 'function') {
            params.api.resetRowHeights();
          }
        } catch (error) {
          console.warn('Error performing layout on first data rendered:', error);
        }
      }
    });
  }, []);

  // Handle container resize to recompute height and fix column sizing
  useEffect(() => {
    if (!hostRef.current || !gridApi) return;
    
    const resizeObserver = new ResizeObserver(() => {
      computeHeight();
      if (gridApi && !gridApi.isDestroyed()) {
        requestAnimationFrame(() => {
          if (gridApi && !gridApi.isDestroyed()) {
            try {
              if (typeof gridApi.sizeColumnsToFit === 'function') {
                gridApi.sizeColumnsToFit();
              }
              if (typeof gridApi.resetRowHeights === 'function') {
                gridApi.resetRowHeights();
              }
            } catch (error) {
              // Silently handle errors during resize
            }
          }
        });
      }
    });
    
    resizeObserver.observe(hostRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [gridApi, computeHeight]);

  // Cleanup grid API
  useEffect(() => {
    return () => {
      if (gridApi && !gridApi.isDestroyed()) {
        setGridApi(null);
      }
    };
  }, [gridApi]);

  const gridId = containerId || `ag-grid-container-${recordType}-${churchId}`;

  // Diagnostic logging in useEffect to avoid render loop
  useEffect(() => {
    console.log('🔍 AdvancedRecordsGrid RENDER:', {
      recordType,
      churchId,
      rowDataLength: rowData?.length || 0,
      columnDefsLength: columnDefs?.length || 0,
      themedColumnDefsLength: themedColumnDefs.length,
      loading,
      gridId,
    });
  }, [recordType, churchId, rowData?.length, columnDefs?.length, themedColumnDefs.length, loading, gridId]);

  // Comprehensive dev diagnostic logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      const checkGridState = () => {
        if (containerRef.current) {
          const containerHeight = containerRef.current.offsetHeight;
          const containerWidth = containerRef.current.offsetWidth;
          
          // Log diagnostic info
          console.log('🔍 AdvancedRecordsGrid Diagnostic:', {
            recordType,
            churchId,
            containerId: gridId,
            containerHeight,
            containerWidth,
            rowDataLength: rowData.length,
            columnDefsLength: columnDefs.length,
            themedColumnDefsLength: themedColumnDefs.length,
            hasGridApi: !!gridApi,
            gridApiDestroyed: gridApi?.isDestroyed?.() || false,
          });

          // Warning if rowData length doesn't match expectations
          if (rowData.length === 0 && columnDefs.length > 0) {
            console.warn('⚠️ AdvancedRecordsGrid: rowData is empty but columnDefs exist', {
              rowDataLength: rowData.length,
              columnDefsLength: columnDefs.length,
              recordType,
              churchId,
            });
          }

          // Check parent chain if height is 0
          if (containerHeight === 0 && rowData.length > 0) {
            console.warn('⚠️ AdvancedRecordsGrid: Container height is 0 but rowData exists', {
              containerHeight,
              rowDataLength: rowData.length,
              recordType,
              churchId,
            });
            
            // Log parent chain
            let parent = containerRef.current.parentElement;
            let depth = 0;
            const parentChain: Array<{ tag: string; height: number; display: string; flex: string }> = [];
            while (parent && depth < 5) {
              const styles = window.getComputedStyle(parent);
              parentChain.push({
                tag: parent.tagName,
                height: parent.offsetHeight,
                display: styles.display,
                flex: styles.flex,
              });
              parent = parent.parentElement;
              depth++;
            }
            console.warn('Parent chain:', parentChain);
          }
        } else {
          // Container ref not available
          console.warn('⚠️ AdvancedRecordsGrid: containerRef.current is null', {
            recordType,
            churchId,
            rowDataLength: rowData.length,
            columnDefsLength: columnDefs.length,
          });
        }
      };

      // Check immediately and after delays
      checkGridState();
      const timeout1 = setTimeout(checkGridState, 100);
      const timeout2 = setTimeout(checkGridState, 500);
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }
  }, [recordType, churchId, gridId, rowData.length, columnDefs.length, themedColumnDefs.length, gridApi]);

  return (
    <Box
      sx={{
        flex: 1,
        width: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'visible',
        position: 'relative',
        // Ensure no transform or position quirks that break AG Grid
        transform: 'none',
        willChange: 'auto'
      }}
    >
      {/* Dynamic style tag to apply theme colors to AG Grid - Pure CSS approach (no Theming API) */}
      <style id={`ag-grid-theme-${gridId}`}>
        {`#${gridId}.ag-theme-quartz {
          --ag-header-background-color: ${enhancedTableState.tokens.headerBg} !important;
          --ag-header-foreground-color: ${enhancedTableState.tokens.headerText} !important;
          --ag-border-color: ${enhancedTableState.tokens.border} !important;
          --ag-odd-row-background-color: ${enhancedTableState.tokens.rowOddBg} !important;
          --ag-background-color: ${enhancedTableState.tokens.rowEvenBg} !important;
          --ag-data-color: ${enhancedTableState.tokens.cellText} !important;
          --ag-row-hover-color: ${enhancedTableState.tokens.accent}15 !important;
          --ag-selected-row-background-color: ${enhancedTableState.tokens.accent}20 !important;
          --ag-quartz-active-color: ${enhancedTableState.tokens.accent} !important;
        }
        #${gridId}.ag-theme-quartz .ag-header,
        #${gridId}.ag-theme-quartz .ag-header-row,
        #${gridId}.ag-theme-quartz .ag-header-row > div,
        #${gridId}.ag-theme-quartz .ag-header-row > div > div {
          background-color: ${enhancedTableState.tokens.headerBg} !important;
          color: ${enhancedTableState.tokens.headerText} !important;
          border-color: ${enhancedTableState.tokens.border} !important;
        }
        #${gridId}.ag-theme-quartz .ag-header-cell,
        #${gridId}.ag-theme-quartz .ag-header-cell > div,
        #${gridId}.ag-theme-quartz .ag-header-cell > div > div {
          background-color: ${enhancedTableState.tokens.headerBg} !important;
          color: ${enhancedTableState.tokens.headerText} !important;
          border-color: ${enhancedTableState.tokens.border} !important;
          border-bottom-color: ${enhancedTableState.tokens.border} !important;
          font-size: 16px !important;
          font-weight: bold !important;
        }
        #${gridId}.ag-theme-quartz .ag-row-incomplete-warning {
          background-color: rgba(255, 193, 7, 0.1) !important;
        }
        #${gridId}.ag-theme-quartz .ag-row-incomplete-warning:hover {
          background-color: rgba(255, 193, 7, 0.15) !important;
        }
        #${gridId}.ag-theme-quartz .ag-row-incomplete-critical {
          background-color: rgba(244, 67, 54, 0.1) !important;
        }
        #${gridId}.ag-theme-quartz .ag-row-incomplete-critical:hover {
          background-color: rgba(244, 67, 54, 0.15) !important;
        }
        #${gridId}.ag-theme-quartz .ag-header-cell-text,
        #${gridId}.ag-theme-quartz .ag-header-cell-label,
        #${gridId}.ag-theme-quartz .ag-header-cell-label span,
        #${gridId}.ag-theme-quartz .ag-header-cell-label .ag-header-cell-text,
        #${gridId}.ag-theme-quartz .ag-header-cell-label > span {
          color: ${enhancedTableState.tokens.headerText} !important;
          font-size: 16px !important;
          font-weight: bold !important;
        }
        #${gridId}.ag-theme-quartz .ag-row-odd,
        #${gridId}.ag-theme-quartz .ag-row-odd .ag-cell {
          background-color: ${enhancedTableState.tokens.rowOddBg} !important;
        }
        #${gridId}.ag-theme-quartz .ag-row-even,
        #${gridId}.ag-theme-quartz .ag-row-even .ag-cell {
          background-color: ${enhancedTableState.tokens.rowEvenBg} !important;
        }
        #${gridId}.ag-theme-quartz .ag-cell {
          color: ${enhancedTableState.tokens.cellText} !important;
          border-color: ${enhancedTableState.tokens.border} !important;
          font-size: 15px !important;
        }
        #${gridId}.ag-theme-quartz .ag-row:hover {
          background-color: ${enhancedTableState.tokens.accent}15 !important;
        }
        #${gridId}.ag-theme-quartz .ag-row-selected {
          background-color: ${enhancedTableState.tokens.accent}20 !important;
        }
        #${gridId}.ag-theme-quartz .ag-header-cell-resize {
          background-color: ${enhancedTableState.tokens.headerBg} !important;
        }`}
      </style>
      
      {themedColumnDefs.length > 0 ? (
        (() => {
          if (import.meta.env.DEV) {
            console.log('✅ AdvancedRecordsGrid: Rendering grid with', {
              rowDataLength: rowData.length,
              columnDefsLength: columnDefs.length,
              themedColumnDefsLength: themedColumnDefs.length,
              gridId,
            });
          }
          return (
            <Box 
              ref={hostRef}
              sx={{ 
                flex: 1, 
                minHeight: 0, 
                minWidth: 0, 
                width: '100%',
                overflow: 'visible',
                position: 'relative'
              }}
            >
              <div
                ref={containerRef}
                id={gridId}
                className="ag-theme-quartz"
                style={{
                  height: `${heightPx}px`,
                  width: '100%',
                  minHeight: 0,
                  minWidth: 0
                }}
              >
              <AgGridReact
            key={`ag-grid-${recordType}-${churchId}`}
            theme="legacy"
            domLayout="normal"
            rowData={rowData || []}
            columnDefs={themedColumnDefs}
            defaultColDef={defaultColDef}
            rowClassRules={rowClassRules}
            onGridReady={onGridReady}
            onFirstDataRendered={onFirstDataRendered}
            pagination={false}
            animateRows={true}
            enableCellTextSelection={true}
            enableBrowserTooltips={true}
            tooltipShowDelay={500}
            rowHeight={40}
            headerHeight={45}
            maintainColumnOrder={true}
            suppressColumnVirtualisation={false}
            suppressRowVirtualisation={false}
            getRowId={(params) => params.data?.id?.toString() || String(params.data?.ID || params.node.id || '')}
            suppressMenuHide={false}
            suppressMovableColumns={false}
            rowSelection={{ mode: 'multiRow' }}
            onRowClicked={onRowClick ? (params) => onRowClick(params.data) : undefined}
            getRowStyle={(params) => {
              const rowIndex = params.node.rowIndex ?? 0;
              return {
                backgroundColor: rowIndex % 2 === 0 
                  ? enhancedTableState.tokens.rowEvenBg 
                  : enhancedTableState.tokens.rowOddBg,
                color: enhancedTableState.tokens.cellText,
              };
            }}
          />
              </div>
            </Box>
          );
        })()
      ) : (
        (() => {
          if (import.meta.env.DEV) {
            console.warn('⚠️ AdvancedRecordsGrid: NOT rendering grid - themedColumnDefs.length is 0', {
              rowDataLength: rowData.length,
              columnDefsLength: columnDefs.length,
              themedColumnDefsLength: themedColumnDefs.length,
              loading,
              gridId,
            });
          }
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
              {loading ? 'Loading columns...' : `No columns available (columnDefs.length=${columnDefs.length})`}
            </Box>
          );
        })()
      )}
    </Box>
  );
};

export default AdvancedRecordsGrid;
