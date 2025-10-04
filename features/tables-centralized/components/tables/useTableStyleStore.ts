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
  getTableHeaderStyle: () => object;
  getTableRowStyle: (type: 'even' | 'odd') => object;
  getTableCellStyle: (type: 'header' | 'body') => object;
}

const orthodoxTheme: TableTheme = {
  headerColor: '#2c5aa0',
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

export const liturgicalThemes = {
  'Orthodox Traditional': {
    colors: ['#2c5aa0', '#ffffff', '#f9f9f9', '#e3f2fd', '#1976d2'],
    description: 'Traditional Orthodox blue and white theme'
  },
  'Lent Season': {
    colors: ['#4a148c', '#ffffff', '#f3e5f5', '#e1bee7', '#7b1fa2'],
    description: 'Purple theme for Great Lent and fasting periods'
  },
  'Pascha Celebration': {
    colors: ['#d32f2f', '#ffffff', '#ffebee', '#ffcdd2', '#f44336'],
    description: 'Red theme for Pascha and resurrectional celebrations'
  },
  'Theophany': {
    colors: ['#0277bd', '#ffffff', '#e3f2fd', '#bbdefb', '#03a9f4'],
    description: 'Light blue theme for Theophany and baptismal feasts'
  },
  'Pentecost': {
    colors: ['#388e3c', '#ffffff', '#e8f5e8', '#c8e6c9', '#4caf50'],
    description: 'Green theme for Pentecost and ordinary time'
  },
  'Christmas': {
    colors: ['#d32f2f', '#ffd700', '#fff8e1', '#fff59d', '#ffeb3b'],
    description: 'Red and gold theme for Christmas season'
  },
  'Saints Feast': {
    colors: ['#ffa000', '#ffffff', '#fff8e1', '#ffecb3', '#ffc107'],
    description: 'Gold theme for saints and martyrs'
  },
  'Marian Feasts': {
    colors: ['#1976d2', '#ffffff', '#e3f2fd', '#bbdefb', '#2196f3'],
    description: 'Blue theme for Theotokos feasts'
  }
};

export const useTableStyleStore = (): TableStyleState => {
  return {
    tableTheme: orthodoxTheme,
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
    exportTheme: () => orthodoxTheme,
    importTheme: () => {},
    applyThemeToElement: () => ({}),
    getTableHeaderStyle: () => ({
      backgroundColor: orthodoxTheme.headerColor,
      color: orthodoxTheme.headerTextColor,
      borderColor: orthodoxTheme.borderColor,
      borderWidth: `${orthodoxTheme.borderWidth}px`,
      borderRadius: `${orthodoxTheme.borderRadius}px`,
      fontFamily: orthodoxTheme.fontFamily,
      fontSize: `${orthodoxTheme.fontSize}px`,
      boxShadow: orthodoxTheme.shadowStyle,
      fontWeight: 'bold',
    }),
    getTableRowStyle: (type: 'even' | 'odd') => ({
      backgroundColor: type === 'even' ? orthodoxTheme.rowColor : orthodoxTheme.rowAlternateColor,
      borderColor: orthodoxTheme.borderColor,
      borderWidth: `${orthodoxTheme.borderWidth}px`,
      '&:hover': {
        backgroundColor: orthodoxTheme.hoverColor,
      },
    }),
    getTableCellStyle: (type: 'header' | 'body') => {
      if (type === 'header') {
        return {
          backgroundColor: orthodoxTheme.headerColor,
          color: orthodoxTheme.headerTextColor,
          borderColor: orthodoxTheme.borderColor,
          borderWidth: `${orthodoxTheme.borderWidth}px`,
          fontFamily: orthodoxTheme.fontFamily,
          fontSize: `${orthodoxTheme.fontSize}px`,
          fontWeight: 'bold',
          padding: '16px',
        };
      } else {
        return {
          backgroundColor: orthodoxTheme.cellColor,
          color: orthodoxTheme.cellTextColor,
          borderColor: orthodoxTheme.borderColor,
          borderWidth: `${orthodoxTheme.borderWidth}px`,
          fontFamily: orthodoxTheme.fontFamily,
          fontSize: `${orthodoxTheme.fontSize}px`,
          padding: '16px',
        };
      }
    }
  };
};
