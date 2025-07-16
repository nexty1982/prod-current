/**
 * Orthodox Metrics - Table Style Store
 * Simple React hook-based store for managing table theme state
 */

export interface TableTheme {
  headerColor: string;
  headerTextColor: string;
  cellColor: string;
  cellTextColor: string;
  rowColor: string;
  rowAlternateColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  hoverColor: string;
  selectedColor: string;
  shadowStyle: string;
  fontFamily: string;
  fontSize: number;
}

export interface TableStyleState {
  tableTheme: TableTheme;
  savedThemes: Record<string, TableTheme>;
  currentTheme: string;
  isLiturgicalMode: boolean;
  setHeaderColor: (color: string) => void;
  setHeaderTextColor: (color: string) => void;
  setCellColor: (color: string) => void;
  setCellTextColor: (color: string) => void;
  setRowColor: (color: string) => void;
  setRowAlternateColor: (color: string) => void;
  setBorderStyle: (color: string, width: number, radius: number) => void;
  setHoverColor: (color: string) => void;
  setSelectedColor: (color: string) => void;
  setShadowStyle: (shadow: string) => void;
  setFontSettings: (family: string, size: number) => void;
  resetTheme: () => void;
  saveTheme: (name: string) => void;
  loadTheme: (name: string) => void;
  deleteTheme: (name: string) => void;
  exportTheme: () => TableTheme;
  importTheme: (theme: TableTheme) => void;
  applyThemeToElement: (element: string) => object;
  // Helper methods for applying theme styles to table elements
  getTableHeaderStyle: () => object;
  getTableRowStyle: (type: 'even' | 'odd') => object;
  getTableCellStyle: (type: 'header' | 'body') => object;
}

// Orthodox Traditional Default Theme
const defaultTheme: TableTheme = {
  headerColor: '#2c5aa0', // Orthodox blue
  headerTextColor: '#ffffff',
  cellColor: '#ffffff',
  cellTextColor: '#333333',
  rowColor: '#f9f9f9',
  rowAlternateColor: '#ffffff',
  borderColor: '#e0e0e0',
  borderWidth: 1,
  borderRadius: 4,
  hoverColor: '#f5f5f5',
  selectedColor: '#e3f2fd',
  shadowStyle: '0 2px 4px rgba(0,0,0,0.1)',
  fontFamily: 'Roboto, Arial, sans-serif',
  fontSize: 14,
};

// Simple fallback implementation that doesn't require context
export const useTableStyleStore = (): TableStyleState => {
  return {
    tableTheme: defaultTheme,
    savedThemes: {},
    currentTheme: 'Orthodox Traditional',
    isLiturgicalMode: false,
    setHeaderColor: () => {},
    setHeaderTextColor: () => {},
    setCellColor: () => {},
    setCellTextColor: () => {},
    setRowColor: () => {},
    setRowAlternateColor: () => {},
    setBorderStyle: () => {},
    setHoverColor: () => {},
    setSelectedColor: () => {},
    setShadowStyle: () => {},
    setFontSettings: () => {},
    resetTheme: () => {},
    saveTheme: () => {},
    loadTheme: () => {},
    deleteTheme: () => {},
    exportTheme: () => defaultTheme,
    importTheme: () => {},
    applyThemeToElement: () => ({}),
    
    // Helper methods for applying theme styles to table elements
    getTableHeaderStyle: () => ({
      backgroundColor: defaultTheme.headerColor,
      color: defaultTheme.headerTextColor,
      borderColor: defaultTheme.borderColor,
      borderWidth: `${defaultTheme.borderWidth}px`,
      borderRadius: `${defaultTheme.borderRadius}px`,
      fontFamily: defaultTheme.fontFamily,
      fontSize: `${defaultTheme.fontSize}px`,
      boxShadow: defaultTheme.shadowStyle,
    }),
    
    getTableRowStyle: (type: 'even' | 'odd') => ({
      backgroundColor: type === 'even' ? defaultTheme.rowColor : defaultTheme.rowAlternateColor,
      borderColor: defaultTheme.borderColor,
      borderWidth: `${defaultTheme.borderWidth}px`,
      '&:hover': {
        backgroundColor: defaultTheme.hoverColor,
      },
    }),
    
    getTableCellStyle: (type: 'header' | 'body') => {
      if (type === 'header') {
        return {
          backgroundColor: defaultTheme.headerColor,
          color: defaultTheme.headerTextColor,
          borderColor: defaultTheme.borderColor,
          borderWidth: `${defaultTheme.borderWidth}px`,
          fontFamily: defaultTheme.fontFamily,
          fontSize: `${defaultTheme.fontSize}px`,
          fontWeight: 'bold',
        };
      } else {
        return {
          backgroundColor: defaultTheme.cellColor,
          color: defaultTheme.cellTextColor,
          borderColor: defaultTheme.borderColor,
          borderWidth: `${defaultTheme.borderWidth}px`,
          fontFamily: defaultTheme.fontFamily,
          fontSize: `${defaultTheme.fontSize}px`,
        };
      }
    }
  };
};
