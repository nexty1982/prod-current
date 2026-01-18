/**
 * Live Table Builder - Page Component
 * Main page wrapper with import/export, reset, and toast functionality
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
  Collapse,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Refresh as ResetIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  HelpOutline as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { LiveTableBuilder } from './components/LiveTableBuilder';
import type { TableData, TableState } from './types';
import { tableDataToCsv, generateCsvFilename } from './utils/csvExport';
import { parseCsvTextToTableData } from './utils/csvImport';
import { HistoryManager } from './utils/history';
import { normalizeTableData } from './utils/normalize';
import {
  getAllTemplates,
  saveTemplate,
  getTemplate,
  deleteTemplate,
  templateExists,
  getTemplateNames,
  exportTemplates,
  importTemplates,
  createStandardTemplates,
  type Template,
} from '../../../utils/liveTableTemplates';
import { adminAPI } from '../../../api/admin.api';

const STORAGE_KEY = 'om_live_table_builder_state_v1';
const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 6;

// Generate default table data using normalization
const createDefaultData = (): TableData => {
  return normalizeTableData(null, DEFAULT_ROWS, DEFAULT_COLS);
};

export const LiveTableBuilderPage: React.FC = () => {
  const [tableData, setTableData] = useState<TableData>(createDefaultData());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [csvFirstRowIsHeader, setCsvFirstRowIsHeader] = useState(true);
  const [showTips, setShowTips] = useState(false);
  const historyManagerRef = React.useRef<HistoryManager>(new HistoryManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Template management state
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateNames, setTemplateNames] = useState<string[]>([]);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [overwriteTemplateDialogOpen, setOverwriteTemplateDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState('');
  const [loadTemplateDialogOpen, setLoadTemplateDialogOpen] = useState(false);
  const [templateToLoad, setTemplateToLoad] = useState('');
  const [importTemplatesDialogOpen, setImportTemplatesDialogOpen] = useState(false);
  const [importTemplatesJson, setImportTemplatesJson] = useState('');
  const [lastSavedState, setLastSavedState] = useState<string>('');
  
  // Database template state
  const [dbTemplateName, setDbTemplateName] = useState('');
  const [dbTemplateRecordType, setDbTemplateRecordType] = useState<'baptism' | 'marriage' | 'funeral' | 'custom'>('custom');
  const [dbTemplateDescription, setDbTemplateDescription] = useState('');
  const [dbTemplateIsGlobal, setDbTemplateIsGlobal] = useState(false);
  const [saveDbTemplateDialogOpen, setSaveDbTemplateDialogOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: TableState = JSON.parse(saved);
        if (parsed?.data?.columns && Array.isArray(parsed.data.columns) && 
            parsed?.data?.rows && Array.isArray(parsed.data.rows)) {
          // Normalize loaded data to ensure consistency
          const normalized = normalizeTableData(
            parsed.data,
            parsed.data.rows.length,
            parsed.data.columns.length
          );
          setTableData(normalized);
          historyManagerRef.current.initialize(normalized);
          setLastSavedState(JSON.stringify(normalized));
        } else {
          showToast('Invalid saved data format, using defaults', 'warning');
          const defaultData = createDefaultData();
          setTableData(defaultData);
          historyManagerRef.current.initialize(defaultData);
          setLastSavedState(JSON.stringify(defaultData));
        }
      } else {
        const defaultData = createDefaultData();
        setTableData(defaultData);
        historyManagerRef.current.initialize(defaultData);
        setLastSavedState(JSON.stringify(defaultData));
      }
    } catch (e) {
      console.error('Failed to load table data:', e);
      showToast('Failed to load saved data, using defaults', 'warning');
      const defaultData = createDefaultData();
      setTableData(defaultData);
      historyManagerRef.current.initialize(defaultData);
      setLastSavedState(JSON.stringify(defaultData));
    }
    
    // Load template names
    setTemplateNames(getTemplateNames());
  }, []);

  // Update undo/redo button states
  useEffect(() => {
    setCanUndo(historyManagerRef.current.canUndo());
    setCanRedo(historyManagerRef.current.canRedo());
  }, [tableData]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      if (tableData?.columns && Array.isArray(tableData.columns) && 
          tableData?.rows && Array.isArray(tableData.rows)) {
        const normalized = normalizeTableData(
          tableData,
          tableData.rows.length,
          tableData.columns.length
        );
        const state: TableState = {
          data: normalized,
          version: '1',
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setLastSavedState(JSON.stringify(normalized));
      }
    } catch (e) {
      console.error('Failed to save table data:', e);
      showToast('Failed to save data to localStorage', 'error');
    }
  }, [tableData]);
  
  // Update template names when templates change
  useEffect(() => {
    setTemplateNames(getTemplateNames());
  }, [saveTemplateDialogOpen, deleteTemplateDialogOpen, importTemplatesDialogOpen]);

  const showToast = useCallback(
    (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      setToast({ open: true, message, severity });
    },
    []
  );

  const handleDataChange = useCallback((data: TableData) => {
    // Normalize data before storing
    const normalized = normalizeTableData(
      data,
      data?.rows?.length || 0,
      data?.columns?.length || 0
    );
    
    // Only push to history if data actually changed
    const currentDataStr = JSON.stringify(tableData);
    const newDataStr = JSON.stringify(normalized);
    
    if (currentDataStr !== newDataStr) {
      setTableData(normalized);
      historyManagerRef.current.push(normalized);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());
    }
  }, [tableData]);

  const handleUndo = useCallback(() => {
    const previousState = historyManagerRef.current.undo();
    if (previousState) {
      setTableData(previousState);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());
      showToast('Undone', 'info');
    }
  }, [showToast]);

  const handleRedo = useCallback(() => {
    const nextState = historyManagerRef.current.redo();
    if (nextState) {
      setTableData(nextState);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());
      showToast('Redone', 'info');
    }
  }, [showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Z (undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Check for Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z (redo)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  const handleExport = useCallback(() => {
    try {
      if (!tableData?.columns || !tableData?.rows) {
        showToast('No data to export', 'warning');
        return;
      }

      // Normalize before export to ensure consistency
      const normalized = normalizeTableData(
        tableData,
        tableData.rows.length,
        tableData.columns.length
      );

      const state: TableState = {
        data: normalized,
        version: '1',
      };
      const json = JSON.stringify(state, null, 2);

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => {
          showToast('JSON copied to clipboard', 'success');
        }).catch(() => {
          // Clipboard API may fail, continue with download
        });
      }

      // Download file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `live-table-builder-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('JSON exported and copied to clipboard', 'success');
    } catch (e) {
      showToast('Failed to export data', 'error');
      console.error(e);
    }
  }, [tableData, showToast]);

  const handleImport = useCallback(() => {
    setImportDialogOpen(true);
    setImportCsv('');
  }, []);

  const handleImportCsv = useCallback(() => {
    setImportDialogOpen(true);
    setImportJson('');
  }, []);

  const handleImportCsvConfirm = useCallback(() => {
    try {
      if (!importCsv || !importCsv.trim()) {
      showToast('Please paste CSV data', 'warning');
      return;
    }

      const importedData = parseCsvTextToTableData(importCsv, csvFirstRowIsHeader);
      
      if (!importedData.columns || importedData.columns.length === 0) {
        showToast('Invalid CSV format: no columns found', 'error');
        return;
      }

      // Normalize imported data
      const normalized = normalizeTableData(
        importedData,
        importedData.rows?.length || 0,
        importedData.columns.length
      );

      setTableData(normalized);
      historyManagerRef.current.push(normalized);
      setCanUndo(historyManagerRef.current.canUndo());
      setCanRedo(historyManagerRef.current.canRedo());
      setImportDialogOpen(false);
      setImportCsv('');
      const rowCount = normalized.rows.length;
      const colCount = normalized.columns.length;
      showToast(`Imported ${rowCount} rows, ${colCount} columns`, 'success');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      showToast('Failed to parse CSV: ' + errorMsg, 'error');
      console.error(e);
    }
  }, [importCsv, csvFirstRowIsHeader, showToast]);

  const handleImportConfirm = useCallback(() => {
    try {
      if (!importJson || !importJson.trim()) {
        showToast('Please paste JSON data', 'warning');
        return;
      }

      const parsed: TableState = JSON.parse(importJson);
          if (parsed?.data?.columns && Array.isArray(parsed.data.columns) && 
              parsed?.data?.rows && Array.isArray(parsed.data.rows)) {
            // Normalize imported data
            const normalized = normalizeTableData(
              parsed.data,
              parsed.data.rows.length,
              parsed.data.columns.length
            );
            setTableData(normalized);
            historyManagerRef.current.push(normalized);
            setCanUndo(historyManagerRef.current.canUndo());
            setCanRedo(historyManagerRef.current.canRedo());
            setImportDialogOpen(false);
            setImportJson('');
            const rowCount = normalized.rows.length;
            const colCount = normalized.columns.length;
            showToast(`JSON imported: ${rowCount} rows, ${colCount} columns`, 'success');
          } else {
            showToast('Invalid JSON format: missing columns or rows', 'error');
          }
    } catch (e) {
      showToast('Failed to parse JSON: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
      console.error(e);
    }
  }, [importJson, showToast]);

  const handleImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text || !text.trim()) {
            showToast('File is empty', 'error');
            return;
          }

          const fileName = file.name.toLowerCase();
          const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.tsv');

          if (isCsv) {
            // Try CSV import
            const importedData = parseCsvTextToTableData(text, csvFirstRowIsHeader);
            if (!importedData.columns || importedData.columns.length === 0) {
              showToast('Invalid CSV format: no columns found', 'error');
              return;
            }
            // Normalize imported data
            const normalized = normalizeTableData(
              importedData,
              importedData.rows?.length || 0,
              importedData.columns.length
            );
            setTableData(normalized);
            historyManagerRef.current.push(normalized);
            setCanUndo(historyManagerRef.current.canUndo());
            setCanRedo(historyManagerRef.current.canRedo());
            const rowCount = normalized.rows.length;
            const colCount = normalized.columns.length;
            showToast(`Imported ${rowCount} rows, ${colCount} columns from CSV`, 'success');
          } else {
            // Try JSON import
            const parsed: TableState = JSON.parse(text);
            if (parsed?.data?.columns && Array.isArray(parsed.data.columns) && 
                parsed?.data?.rows && Array.isArray(parsed.data.rows)) {
              // Normalize imported data
              const normalizedJson = normalizeTableData(
                parsed.data,
                parsed.data.rows.length,
                parsed.data.columns.length
              );
              setTableData(normalizedJson);
              historyManagerRef.current.push(normalizedJson);
              setCanUndo(historyManagerRef.current.canUndo());
              setCanRedo(historyManagerRef.current.canRedo());
              const rowCount = normalizedJson.rows.length;
              const colCount = normalizedJson.columns.length;
              showToast(`Imported ${rowCount} rows, ${colCount} columns from JSON`, 'success');
            } else {
              showToast('Invalid JSON format: missing columns or rows', 'error');
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          showToast('Failed to parse file: ' + errorMsg, 'error');
          console.error(err);
        }
      };
      reader.onerror = () => {
        showToast('Failed to read file', 'error');
      };
      reader.readAsText(file);
    },
    [showToast, csvFirstRowIsHeader]
  );

  const handleExportCsv = useCallback(() => {
    try {
      if (!tableData?.columns || !tableData?.rows) {
        showToast('No data to export', 'warning');
        return;
      }

      // Normalize before export to ensure consistency
      const normalized = normalizeTableData(
        tableData,
        tableData.rows.length,
        tableData.columns.length
      );

      const csv = tableDataToCsv(normalized);
      if (!csv) {
        showToast('Failed to generate CSV', 'error');
        return;
      }

      // Download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateCsvFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export CSV', 'error');
      console.error(e);
    }
  }, [tableData, showToast]);

  const handleReset = useCallback(() => {
    setResetDialogOpen(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    try {
      const defaultData = createDefaultData();
      setTableData(defaultData);
      historyManagerRef.current.clear();
      historyManagerRef.current.initialize(defaultData);
      setCanUndo(false);
      setCanRedo(false);
      setResetDialogOpen(false);
      setLastSavedState(JSON.stringify(defaultData));
      showToast('Grid reset to defaults', 'success');
    } catch (e) {
      showToast('Failed to reset table', 'error');
      console.error(e);
    }
  }, [showToast]);
  
  // Check if current table is dirty (different from last saved state)
  const isDirty = useCallback((): boolean => {
    if (!tableData) return false;
    const normalized = normalizeTableData(
      tableData,
      tableData.rows.length,
      tableData.columns.length
    );
    const currentState = JSON.stringify(normalized);
    return currentState !== lastSavedState;
  }, [tableData, lastSavedState]);
  
  // Template management functions
  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) {
      showToast('Template name is required', 'warning');
      return;
    }
    
    if (templateExists(templateName)) {
      setOverwriteTemplateDialogOpen(true);
      return;
    }
    
    // Save template
    const normalized = normalizeTableData(
      tableData,
      tableData.rows.length,
      tableData.columns.length
    );
    
    const template: Template = {
      name: templateName.trim(),
      tableState: {
        data: normalized,
        version: '1',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    try {
      saveTemplate(template);
      setTemplateNames(getTemplateNames());
      setTemplateName('');
      setSaveTemplateDialogOpen(false);
      showToast(`Saved template: ${template.name}`, 'success');
    } catch (e) {
      showToast('Failed to save template', 'error');
      console.error(e);
    }
  }, [templateName, tableData, showToast]);
  
  const handleOverwriteTemplate = useCallback(() => {
    const normalized = normalizeTableData(
      tableData,
      tableData.rows.length,
      tableData.columns.length
    );
    
    const existing = getTemplate(templateName.trim());
    const template: Template = {
      name: templateName.trim(),
      tableState: {
        data: normalized,
        version: '1',
      },
      recordType: existing?.recordType,
      locale: existing?.locale,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    try {
      saveTemplate(template);
      setTemplateNames(getTemplateNames());
      setTemplateName('');
      setSaveTemplateDialogOpen(false);
      setOverwriteTemplateDialogOpen(false);
      showToast(`Saved template: ${template.name}`, 'success');
    } catch (e) {
      showToast('Failed to save template', 'error');
      console.error(e);
    }
  }, [templateName, tableData, showToast]);
  
  const handleLoadTemplate = useCallback((name: string) => {
    if (isDirty()) {
      setTemplateToLoad(name);
      setLoadTemplateDialogOpen(true);
      return;
    }
    
    // Load template
    const template = getTemplate(name);
    if (!template) {
      showToast(`Template "${name}" not found`, 'error');
      return;
    }
    
    const normalized = normalizeTableData(
      template.tableState.data,
      template.tableState.data.rows.length,
      template.tableState.data.columns.length
    );
    
    setTableData(normalized);
    historyManagerRef.current.clear();
    historyManagerRef.current.initialize(normalized);
    setCanUndo(false);
    setCanRedo(false);
    setLastSavedState(JSON.stringify(normalized));
    setSelectedTemplate(name);
    showToast(`Loaded template: ${name}`, 'success');
  }, [isDirty, showToast]);
  
  const handleConfirmLoadTemplate = useCallback(() => {
    const name = templateToLoad;
    const template = getTemplate(name);
    if (!template) {
      showToast(`Template "${name}" not found`, 'error');
      setLoadTemplateDialogOpen(false);
      return;
    }
    
    const normalized = normalizeTableData(
      template.tableState.data,
      template.tableState.data.rows.length,
      template.tableState.data.columns.length
    );
    
    setTableData(normalized);
    historyManagerRef.current.clear();
    historyManagerRef.current.initialize(normalized);
    setCanUndo(false);
    setCanRedo(false);
    setLastSavedState(JSON.stringify(normalized));
    setSelectedTemplate(name);
    setLoadTemplateDialogOpen(false);
    setTemplateToLoad('');
    showToast(`Loaded template: ${name}`, 'success');
  }, [templateToLoad, showToast]);
  
  const handleDeleteTemplate = useCallback((name: string) => {
    setTemplateToDelete(name);
    setDeleteTemplateDialogOpen(true);
  }, []);
  
  const handleConfirmDeleteTemplate = useCallback(() => {
    const name = templateToDelete;
    if (deleteTemplate(name)) {
      setTemplateNames(getTemplateNames());
      setDeleteTemplateDialogOpen(false);
      setTemplateToDelete('');
      if (selectedTemplate === name) {
        setSelectedTemplate('');
      }
      showToast(`Deleted template: ${name}`, 'success');
    } else {
      showToast(`Failed to delete template: ${name}`, 'error');
    }
  }, [templateToDelete, selectedTemplate, showToast]);
  
  const handleExportTemplates = useCallback(() => {
    try {
      const json = exportTemplates();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      a.download = `live-table-templates_${dateStr}_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Templates exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export templates', 'error');
      console.error(e);
    }
  }, [showToast]);
  
  const handleImportTemplates = useCallback(() => {
    setImportTemplatesDialogOpen(true);
    setImportTemplatesJson('');
  }, []);
  
  const handleImportTemplatesFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          showToast('Failed to read file', 'error');
          return;
        }
        
        // Validate it's JSON
        JSON.parse(text);
        setImportTemplatesJson(text);
        setImportTemplatesDialogOpen(true);
      } catch (err) {
        showToast('Invalid JSON file', 'error');
        console.error(err);
      }
    };
    reader.onerror = () => {
      showToast('Failed to read file', 'error');
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  }, [showToast]);
  
  const handleImportTemplatesConfirm = useCallback(() => {
    try {
      if (!importTemplatesJson.trim()) {
        showToast('Please paste template JSON data', 'warning');
        return;
      }
      
      // For now, use overwrite all conflicts as default
      // In a more advanced UI, we could show options
      const result = importTemplates(importTemplatesJson, {
        overwriteConflicts: true,
      });
      
      setTemplateNames(getTemplateNames());
      setImportTemplatesDialogOpen(false);
      setImportTemplatesJson('');
      
      if (result.errors.length > 0) {
        showToast(
          `Imported ${result.imported} templates (${result.overwritten} overwritten, ${result.skipped} skipped). Errors: ${result.errors.length}`,
          'warning'
        );
      } else {
        showToast(
          `Imported ${result.imported} templates (${result.overwritten} overwritten, ${result.skipped} skipped)`,
          'success'
        );
      }
    } catch (e) {
      showToast('Failed to import templates', 'error');
      console.error(e);
    }
  }, [importTemplatesJson, showToast]);
  
  const handleCreateStandardTemplates = useCallback(() => {
    try {
      createStandardTemplates();
      setTemplateNames(getTemplateNames());
      showToast('Created standard record templates', 'success');
    } catch (e) {
      showToast('Failed to create standard templates', 'error');
      console.error(e);
    }
  }, [showToast]);

  return (
    <Container maxWidth="xl" sx={{ py: 4, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Live Table Builder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create, edit, and manage tables with clipboard paste support. Data is automatically saved.
            </Typography>
          </Box>
          <IconButton
            onClick={() => setShowTips(!showTips)}
            title="Show/hide quick tips"
            sx={{ ml: 2 }}
          >
            {showTips ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            <HelpIcon sx={{ ml: 0.5 }} />
          </IconButton>
        </Box>

        {/* Quick Tips */}
        <Collapse in={showTips}>
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Quick Tips:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
              <li>Double-click column headers to edit them inline</li>
              <li>Paste data from Excel/Google Sheets directly into cells</li>
              <li>Use <strong>Ctrl+Z</strong> to undo and <strong>Ctrl+Y</strong> to redo</li>
              <li>Export to CSV for Excel compatibility or JSON for data backup</li>
              <li>Import CSV/TSV files with automatic delimiter detection</li>
              <li>All changes are automatically saved to your browser</li>
            </Box>
          </Paper>
        </Collapse>

        {/* Template Management Section */}
        <Box sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5 }}>
            Template Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Template Name"
              size="small"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., en_baptism_records"
              sx={{ width: 200 }}
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => setSaveTemplateDialogOpen(true)}
              disabled={!templateName.trim()}
              size="small"
            >
              Save Template
            </Button>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Load Template</InputLabel>
              <Select
                value={selectedTemplate}
                label="Load Template"
                onChange={(e) => {
                  const name = e.target.value;
                  setSelectedTemplate(name);
                  if (name) {
                    handleLoadTemplate(name);
                  }
                }}
              >
                {templateNames.length === 0 ? (
                  <MenuItem disabled>No templates available</MenuItem>
                ) : (
                  templateNames.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (selectedTemplate) {
                  handleDeleteTemplate(selectedTemplate);
                }
              }}
              disabled={!selectedTemplate}
              color="error"
              size="small"
            >
              Delete
            </Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExportTemplates}
              size="small"
            >
              Export Templates
            </Button>
            <Button
              variant="outlined"
              startIcon={<ImportIcon />}
              onClick={handleImportTemplates}
              size="small"
            >
              Import Templates
            </Button>
            <input
              accept=".json"
              style={{ display: 'none' }}
              id="import-templates-file-input"
              type="file"
              onChange={handleImportTemplatesFile}
            />
            <label htmlFor="import-templates-file-input">
              <Button variant="outlined" component="span" startIcon={<ImportIcon />} size="small">
                Upload Templates
              </Button>
            </label>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateStandardTemplates}
              size="small"
              color="secondary"
            >
              Create Standard Templates
            </Button>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => setSaveDbTemplateDialogOpen(true)}
              size="small"
              color="primary"
            >
              Save to Database
            </Button>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<UndoIcon />}
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            size="small"
          >
            Undo
          </Button>
          <Button
            variant="outlined"
            startIcon={<RedoIcon />}
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            size="small"
          >
            Redo
          </Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={handleReset}
            color="warning"
            size="small"
          >
            Reset
          </Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleImport}
            size="small"
          >
            Import JSON
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleImportCsv}
            size="small"
          >
            Import CSV
          </Button>
          <input
            accept=".json,.csv,.tsv"
            style={{ display: 'none' }}
            id="import-file-input"
            type="file"
            onChange={handleImportFile}
          />
          <label htmlFor="import-file-input">
            <Button variant="outlined" component="span" startIcon={<ImportIcon />} size="small">
              Upload File
            </Button>
          </label>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            size="small"
          >
            Export JSON
          </Button>
          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={handleExportCsv}
            size="small"
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Helper Text */}
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Tip:</strong> Paste data from Excel/Google Sheets (Ctrl/Cmd+V) or start typing in any cell. 
          All changes are automatically saved.
        </Typography>
      </Box>

      {/* Table Builder */}
      <Box sx={{ flex: 1, minHeight: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <LiveTableBuilder
          data={tableData}
          onDataChange={handleDataChange}
          onToast={showToast}
        />
      </Box>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{importCsv ? 'Import CSV/TSV' : 'Import JSON'}</DialogTitle>
        <DialogContent>
          {importCsv ? (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={csvFirstRowIsHeader}
                    onChange={(e) => setCsvFirstRowIsHeader(e.target.checked)}
                  />
                }
                label="First row is headers"
                sx={{ mt: 2, mb: 1 }}
              />
              <TextField
                fullWidth
                multiline
                rows={12}
                value={importCsv}
                onChange={(e) => setImportCsv(e.target.value)}
                placeholder="Paste CSV/TSV data here..."
                sx={{ mt: 1 }}
              />
            </>
          ) : (
            <TextField
              fullWidth
              multiline
              rows={12}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste JSON data here..."
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImportDialogOpen(false);
            setImportJson('');
            setImportCsv('');
          }}>Cancel</Button>
          {importCsv ? (
            <Button onClick={handleImportCsvConfirm} variant="contained">
              Import CSV
            </Button>
          ) : (
            <Button onClick={handleImportConfirm} variant="contained">
              Import JSON
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset Table</DialogTitle>
        <DialogContent>
          <Typography>
            Reset to default 10x6 grid? This will lose all current data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleResetConfirm} variant="contained" color="warning">
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateDialogOpen} onClose={() => setSaveTemplateDialogOpen(false)}>
        <DialogTitle>Save Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., en_baptism_records"
            sx={{ mt: 2 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && templateName.trim()) {
                handleSaveTemplate();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSaveTemplateDialogOpen(false);
            setTemplateName('');
          }}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={!templateName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Overwrite Template Confirmation Dialog */}
      <Dialog open={overwriteTemplateDialogOpen} onClose={() => setOverwriteTemplateDialogOpen(false)}>
        <DialogTitle>Overwrite Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Template "{templateName}" already exists. Do you want to overwrite it?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOverwriteTemplateDialogOpen(false);
            setTemplateName('');
            setSaveTemplateDialogOpen(false);
          }}>Cancel</Button>
          <Button onClick={handleOverwriteTemplate} variant="contained" color="warning">
            Overwrite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Template Confirmation Dialog */}
      <Dialog open={deleteTemplateDialogOpen} onClose={() => setDeleteTemplateDialogOpen(false)}>
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete template "{templateToDelete}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteTemplateDialogOpen(false);
            setTemplateToDelete('');
          }}>Cancel</Button>
          <Button onClick={handleConfirmDeleteTemplate} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Template Confirmation Dialog (when dirty) */}
      <Dialog open={loadTemplateDialogOpen} onClose={() => setLoadTemplateDialogOpen(false)}>
        <DialogTitle>Load Template?</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Loading template "{templateToLoad}" will replace your current table. Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setLoadTemplateDialogOpen(false);
            setTemplateToLoad('');
          }}>Cancel</Button>
          <Button onClick={handleConfirmLoadTemplate} variant="contained" color="warning">
            Load Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Templates Dialog */}
      <Dialog open={importTemplatesDialogOpen} onClose={() => setImportTemplatesDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Templates</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste JSON template data. Existing templates with the same name will be overwritten.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={12}
            value={importTemplatesJson}
            onChange={(e) => setImportTemplatesJson(e.target.value)}
            placeholder="Paste template JSON here..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImportTemplatesDialogOpen(false);
            setImportTemplatesJson('');
          }}>Cancel</Button>
          <Button onClick={handleImportTemplatesConfirm} variant="contained" disabled={!importTemplatesJson.trim()}>
            Import Templates
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save to Database Dialog */}
      <Dialog open={saveDbTemplateDialogOpen} onClose={() => setSaveDbTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Template to Database</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Template Name"
              value={dbTemplateName}
              onChange={(e) => setDbTemplateName(e.target.value)}
              placeholder="e.g., Standard Baptism Records"
              required
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Record Type</InputLabel>
              <Select
                value={dbTemplateRecordType}
                label="Record Type"
                onChange={(e) => setDbTemplateRecordType(e.target.value as any)}
              >
                <MenuItem value="baptism">Baptism</MenuItem>
                <MenuItem value="marriage">Marriage</MenuItem>
                <MenuItem value="funeral">Funeral</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Description (optional)"
              value={dbTemplateDescription}
              onChange={(e) => setDbTemplateDescription(e.target.value)}
              placeholder="Template description..."
              multiline
              rows={2}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={dbTemplateIsGlobal}
                  onChange={(e) => setDbTemplateIsGlobal(e.target.checked)}
                />
              }
              label="Make this template global (available to all churches)"
            />
            <Typography variant="caption" color="text.secondary">
              This will convert your current table structure ({tableData.columns.length} columns) into a database template.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSaveDbTemplateDialogOpen(false);
            setDbTemplateName('');
            setDbTemplateDescription('');
            setDbTemplateRecordType('custom');
            setDbTemplateIsGlobal(false);
          }}>Cancel</Button>
          <Button 
            onClick={handleSaveDbTemplate} 
            variant="contained" 
            disabled={!dbTemplateName.trim()}
          >
            Save to Database
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LiveTableBuilderPage;
