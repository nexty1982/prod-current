/**
 * Orthodox Metrics - Table Style Store
 * React hook-based store for managing table theme state with localStorage persistence
 */
import { useState, useEffect, useCallback } from 'react';

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
  headerColor: '#bd56fa',
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
    colors: ['#bd56fa', '#ffffff', '#f9f9f9', '#e3f2fd', '#1976d2'],
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

const STORAGE_KEY = 'om.tableTheme';
const SAVED_THEMES_KEY = 'om.tableTheme.saved';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export const useTableStyleStore = (): TableStyleState => {
  const [tableTheme, setTableTheme] = useState<TableTheme>(() => loadFromStorage(STORAGE_KEY, orthodoxTheme));
  const [savedThemes, setSavedThemes] = useState<Record<string, TableTheme>>(() => loadFromStorage(SAVED_THEMES_KEY, {}));
  const [currentTheme, setCurrentTheme] = useState('Orthodox Traditional');
  const [isLiturgicalMode, setIsLiturgicalMode] = useState(false);

  // Persist theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tableTheme));
  }, [tableTheme]);

  useEffect(() => {
    localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(savedThemes));
  }, [savedThemes]);

  // Individual property setters
  const setHeaderColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, headerColor: color }));
  }, []);

  const setHeaderTextColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, headerTextColor: color }));
  }, []);

  const setCellColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, cellColor: color }));
  }, []);

  const setCellTextColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, cellTextColor: color }));
  }, []);

  const setRowColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, rowColor: color }));
  }, []);

  const setRowAlternateColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, rowAlternateColor: color }));
  }, []);

  const setBorderStyle = useCallback((color: string, width: number, radius: number) => {
    setTableTheme(prev => ({ ...prev, borderColor: color, borderWidth: width, borderRadius: radius }));
  }, []);

  const setHoverColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, hoverColor: color }));
  }, []);

  const setSelectedColor = useCallback((color: string) => {
    setTableTheme(prev => ({ ...prev, selectedColor: color }));
  }, []);

  const setShadowStyle = useCallback((shadow: string) => {
    setTableTheme(prev => ({ ...prev, shadowStyle: shadow }));
  }, []);

  const setFontSettings = useCallback((family: string, size: number) => {
    setTableTheme(prev => ({ ...prev, fontFamily: family, fontSize: size }));
  }, []);

  const resetTheme = useCallback(() => {
    setTableTheme(orthodoxTheme);
    setCurrentTheme('Orthodox Traditional');
  }, []);

  const saveTheme = useCallback((name: string) => {
    setSavedThemes(prev => ({ ...prev, [name]: { ...tableTheme } }));
  }, [tableTheme]);

  const loadTheme = useCallback((name: string) => {
    const theme = savedThemes[name];
    if (theme) {
      setTableTheme(theme);
      setCurrentTheme(name);
    }
  }, [savedThemes]);

  const deleteTheme = useCallback((name: string) => {
    setSavedThemes(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const exportTheme = useCallback(() => {
    return { ...tableTheme };
  }, [tableTheme]);

  const importTheme = useCallback((theme: TableTheme) => {
    setTableTheme(theme);
  }, []);

  const applyThemeToElement = useCallback((_element: string) => {
    return {};
  }, []);

  const getTableHeaderStyle = useCallback(() => ({
    backgroundColor: tableTheme.headerColor,
    color: tableTheme.headerTextColor,
    borderColor: tableTheme.borderColor,
    borderWidth: `${tableTheme.borderWidth}px`,
    borderRadius: `${tableTheme.borderRadius}px`,
    fontFamily: tableTheme.fontFamily,
    fontSize: `${tableTheme.fontSize}px`,
    boxShadow: tableTheme.shadowStyle,
    fontWeight: 'bold',
  }), [tableTheme]);

  const getTableRowStyle = useCallback((type: 'even' | 'odd') => ({
    backgroundColor: type === 'even' ? tableTheme.rowColor : tableTheme.rowAlternateColor,
    borderColor: tableTheme.borderColor,
    borderWidth: `${tableTheme.borderWidth}px`,
    '&:hover': {
      backgroundColor: tableTheme.hoverColor,
    },
  }), [tableTheme]);

  const getTableCellStyle = useCallback((type: 'header' | 'body') => {
    if (type === 'header') {
      return {
        backgroundColor: tableTheme.headerColor,
        color: tableTheme.headerTextColor,
        borderColor: tableTheme.borderColor,
        borderWidth: `${tableTheme.borderWidth}px`,
        fontFamily: tableTheme.fontFamily,
        fontSize: `${tableTheme.fontSize}px`,
        fontWeight: 'bold',
        padding: '16px',
      };
    }
    return {
      backgroundColor: tableTheme.cellColor,
      color: tableTheme.cellTextColor,
      borderColor: tableTheme.borderColor,
      borderWidth: `${tableTheme.borderWidth}px`,
      fontFamily: tableTheme.fontFamily,
      fontSize: `${tableTheme.fontSize}px`,
      padding: '16px',
    };
  }, [tableTheme]);

  return {
    tableTheme,
    savedThemes,
    currentTheme,
    isLiturgicalMode,
    setHeaderColor,
    setHeaderTextColor,
    setCellColor,
    setCellTextColor,
    setRowColor,
    setRowAlternateColor,
    setBorderStyle,
    setHoverColor,
    setSelectedColor,
    setShadowStyle,
    setFontSettings,
    resetTheme,
    saveTheme,
    loadTheme,
    deleteTheme,
    exportTheme,
    importTheme,
    applyThemeToElement,
    getTableHeaderStyle,
    getTableRowStyle,
    getTableCellStyle,
  };
};
