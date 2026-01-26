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
  
  // Template management state (DB-backed)
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<Array<{ slug: string; name: string; record_type: string; is_global?: boolean }>>([]);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [overwriteTemplateDialogOpen, setOverwriteTemplateDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState('');
  const [loadTemplateDialogOpen, setLoadTemplateDialogOpen] = useState(false);
  const [templateToLoad, setTemplateToLoad] = useState('');
  const [importTemplatesDialogOpen, setImportTemplatesDialogOpen] = useState(false);
  const [importTemplatesJson, setImportTemplatesJson] = useState('');
  const [lastSavedState, setLastSavedState] = useState<string>('');
  const [templateRecordType, setTemplateRecordType] = useState<'baptism' | 'marriage' | 'funeral' | 'custom'>('custom');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIsGlobal, setTemplateIsGlobal] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Toast notification handler (defined early to avoid TDZ issues)
  const showToast = useCallback(
    (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      setToast({ open: true, message, severity });
    },
    []
  );

  // Load templates from database
  const loadTemplatesFromDb = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await adminAPI.templates.getAll();
      if (response.success) {
        setTemplates(response.templates.map((t: any) => ({
          slug: t.slug,
          name: t.name,
          record_type: t.record_type,
          is_global: t.is_global,
        })));
      }
    } catch (error) {
      console.error('Failed to load templates from database:', error);
      showToast('Failed to load templates', 'error');
    } finally {
      setLoadingTemplates(false);
    }
  }, [showToast]);

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
    
    // Load templates from database
    loadTemplatesFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTemplatesFromDb]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableData]);
  
  // Update template names when templates change
  useEffect(() => {
    loadTemplatesFromDb();
  }, [saveTemplateDialogOpen, deleteTemplateDialogOpen, importTemplatesDialogOpen, loadTemplatesFromDb]);

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

  // Convert table state to database template format (defined early to avoid TDZ issues)
  const convertTableToDbTemplate = useCallback((tableData: TableData) => {
    const fields = tableData.columns.map((col, colIdx) => {
      // Try to infer type from column name or default to string
      let type = 'string';
      const colName = col.label.toLowerCase();
      if (colName.includes('date') || colName.includes('time')) {
        type = 'date';
      } else if (colName.includes('id') || colName.includes('number') || colName.includes('count')) {
        type = 'number';
      } else if (colName.includes('email')) {
        type = 'email';
      } else if (colName.includes('phone')) {
        type = 'tel';
      }

      return {
        column: col.id, // Use stable column ID
        label: col.label || `Column ${colIdx + 1}`,
        type: type,
        required: false, // Default to optional
      };
    });

    return fields;
  }, []);
  
  // Template management functions (DB-backed)
  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      showToast('Template name is required', 'warning');
      return;
    }
    
    // Check if template exists in DB
    const existing = templates.find(t => t.name === templateName.trim() || t.slug === templateName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'));
    if (existing) {
      setOverwriteTemplateDialogOpen(true);
      return;
    }
    
    try {
      const normalized = normalizeTableData(
        tableData,
        tableData.rows.length,
        tableData.columns.length
      );

      const fields = convertTableToDbTemplate(normalized);
      const slug = templateName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

      const templateData = {
        name: templateName.trim(),
        slug: slug,
        record_type: templateRecordType,
        description: templateDescription.trim() || null,
        fields: fields,
        grid_type: 'aggrid',
        theme: 'liturgicalBlueGold',
        layout_type: 'table',
        is_editable: true,
        church_id: null,
        is_global: templateIsGlobal,
      };

      const response = await adminAPI.templates.create(templateData);
      
      if (response.success) {
        const savedTemplateName = templateName.trim();
        await loadTemplatesFromDb();
        setTemplateName('');
        setTemplateDescription('');
        setTemplateRecordType('custom');
        setTemplateIsGlobal(false);
        setSaveTemplateDialogOpen(false);
        showToast(`Saved template: ${savedTemplateName}`, 'success');
      } else {
        showToast('Failed to save template', 'error');
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
      showToast(`Failed to save template: ${errorMessage}`, 'error');
    }
  }, [templateName, templateRecordType, templateDescription, templateIsGlobal, tableData, templates, convertTableToDbTemplate, loadTemplatesFromDb, showToast]);
  
  const handleOverwriteTemplate = useCallback(async () => {
    try {
      const existing = templates.find(t => t.name === templateName.trim() || t.slug === templateName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'));
      if (!existing) {
        showToast('Template not found', 'error');
        return;
      }

      const normalized = normalizeTableData(
        tableData,
        tableData.rows.length,
        tableData.columns.length
      );

      const fields = convertTableToDbTemplate(normalized);

      const templateData = {
        record_type: templateRecordType,
        description: templateDescription.trim() || null,
        fields: fields,
        is_global: templateIsGlobal,
      };

      const response = await adminAPI.templates.update(existing.slug, templateData);
      
      if (response.success) {
        const updatedTemplateName = templateName.trim();
        await loadTemplatesFromDb();
        setTemplateName('');
        setTemplateDescription('');
        setTemplateRecordType('custom');
        setTemplateIsGlobal(false);
        setSaveTemplateDialogOpen(false);
        setOverwriteTemplateDialogOpen(false);
        showToast(`Updated template: ${updatedTemplateName}`, 'success');
      } else {
        showToast('Failed to update template', 'error');
      }
    } catch (error: any) {
      console.error('Error updating template:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
      showToast(`Failed to update template: ${errorMessage}`, 'error');
    }
  }, [templateName, templateRecordType, templateDescription, templateIsGlobal, tableData, templates, convertTableToDbTemplate, loadTemplatesFromDb, showToast]);
  
  const handleLoadTemplate = useCallback(async (slug: string) => {
    if (isDirty()) {
      setTemplateToLoad(slug);
      setLoadTemplateDialogOpen(true);
      return;
    }
    
    try {
      const response = await adminAPI.templates.getBySlug(slug);
      if (!response.success || !response.template) {
        showToast(`Template not found`, 'error');
        return;
      }

      const template = response.template;
      
      // Handle both formats:
      // 1. Flat array format: [{ column, label, type, required }]
      // 2. Versioned format: { version, columns: [...], ui: {...} }
      let fieldsArray: any[] = [];
      
      if (Array.isArray(template.fields)) {
        // Format 1: Already an array
        fieldsArray = template.fields;
      } else if (template.fields && typeof template.fields === 'object') {
        // Format 2: Versioned structure - extract columns array
        if (template.fields.columns && Array.isArray(template.fields.columns)) {
          fieldsArray = template.fields.columns.map((col: any) => ({
            column: col.name || col.column || `col_${fieldsArray.length}`,
            label: col.label || col.name || col.column,
            type: col.type || 'string',
            required: col.required || false
          }));
        } else {
          throw new Error('Template fields format not recognized');
        }
      } else {
        throw new Error('Template fields is missing or invalid');
      }
      
      // Convert DB template fields back to table structure
      const columns = fieldsArray.map((field: any, index: number) => ({
        id: field.column || `col_${index}`,
        label: field.label || field.column || `Column ${index + 1}`,
      }));

      // Create empty rows (DB templates don't store row data, just structure)
      const rows = Array.from({ length: DEFAULT_ROWS }, (_, rowIdx) => ({
        id: `row_${rowIdx}`,
        cells: columns.reduce((acc: Record<string, string>, col: any) => {
          acc[col.id] = '';
          return acc;
        }, {}),
      }));

      const tableData: TableData = { columns, rows };
      const normalized = normalizeTableData(tableData, rows.length, columns.length);
      
      setTableData(normalized);
      historyManagerRef.current.clear();
      historyManagerRef.current.initialize(normalized);
      setCanUndo(false);
      setCanRedo(false);
      setLastSavedState(JSON.stringify(normalized));
      setSelectedTemplate(slug);
      showToast(`Loaded template: ${template.name}`, 'success');
    } catch (error: any) {
      console.error('Error loading template:', error);
      showToast(`Failed to load template: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [isDirty, showToast]);
  
  const handleConfirmLoadTemplate = useCallback(async () => {
    const slug = templateToLoad;
    try {
      const response = await adminAPI.templates.getBySlug(slug);
      if (!response.success || !response.template) {
        showToast(`Template not found`, 'error');
        setLoadTemplateDialogOpen(false);
        return;
      }

      const template = response.template;
      
      // Handle both formats (same logic as handleLoadTemplate)
      let fieldsArray: any[] = [];
      
      if (Array.isArray(template.fields)) {
        fieldsArray = template.fields;
      } else if (template.fields && typeof template.fields === 'object') {
        if (template.fields.columns && Array.isArray(template.fields.columns)) {
          fieldsArray = template.fields.columns.map((col: any) => ({
            column: col.name || col.column || `col_${fieldsArray.length}`,
            label: col.label || col.name || col.column,
            type: col.type || 'string',
            required: col.required || false
          }));
        } else {
          throw new Error('Template fields format not recognized');
        }
      } else {
        throw new Error('Template fields is missing or invalid');
      }
      
      const columns = fieldsArray.map((field: any, index: number) => ({
        id: field.column || `col_${index}`,
        label: field.label || field.column || `Column ${index + 1}`,
      }));

      const rows = Array.from({ length: DEFAULT_ROWS }, (_, rowIdx) => ({
        id: `row_${rowIdx}`,
        cells: columns.reduce((acc: Record<string, string>, col: any) => {
          acc[col.id] = '';
          return acc;
        }, {}),
      }));

      const tableData: TableData = { columns, rows };
      const normalized = normalizeTableData(tableData, rows.length, columns.length);
      
      setTableData(normalized);
      historyManagerRef.current.clear();
      historyManagerRef.current.initialize(normalized);
      setCanUndo(false);
      setCanRedo(false);
      setLastSavedState(JSON.stringify(normalized));
      setSelectedTemplate(slug);
      setLoadTemplateDialogOpen(false);
      setTemplateToLoad('');
      showToast(`Loaded template: ${template.name}`, 'success');
    } catch (error: any) {
      console.error('Error loading template:', error);
      showToast(`Failed to load template: ${error?.message || 'Unknown error'}`, 'error');
      setLoadTemplateDialogOpen(false);
    }
  }, [templateToLoad, showToast]);
  
  const handleDeleteTemplate = useCallback((slug: string) => {
    setTemplateToDelete(slug);
    setDeleteTemplateDialogOpen(true);
  }, []);
  
  const handleConfirmDeleteTemplate = useCallback(async () => {
    const slug = templateToDelete;
    try {
      const response = await adminAPI.templates.delete(slug);
      if (response.success) {
        await loadTemplatesFromDb();
        setDeleteTemplateDialogOpen(false);
        setTemplateToDelete('');
        if (selectedTemplate === slug) {
          setSelectedTemplate('');
        }
        showToast('Template deleted successfully', 'success');
      } else {
        showToast('Failed to delete template', 'error');
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      showToast(`Failed to delete template: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [templateToDelete, selectedTemplate, loadTemplatesFromDb, showToast]);
  
  const handleExportTemplates = useCallback(async () => {
    try {
      const response = await adminAPI.templates.getAll();
      if (response.success) {
        const json = JSON.stringify(response.templates, null, 2);
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
      } else {
        showToast('Failed to export templates', 'error');
      }
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
  
  const handleImportTemplatesConfirm = useCallback(async () => {
    try {
      if (!importTemplatesJson.trim()) {
        showToast('Please paste template JSON data', 'warning');
        return;
      }
      
      const imported = JSON.parse(importTemplatesJson);
      if (!Array.isArray(imported)) {
        showToast('Invalid template format: expected array', 'error');
        return;
      }

      let importedCount = 0;
      let errorCount = 0;

      for (const template of imported) {
        try {
          await adminAPI.templates.create({
            name: template.name,
            slug: template.slug,
            record_type: template.record_type || 'custom',
            description: template.description || null,
            fields: template.fields || [],
            grid_type: template.grid_type || 'aggrid',
            theme: template.theme || 'liturgicalBlueGold',
            layout_type: template.layout_type || 'table',
            is_editable: template.is_editable !== false,
            church_id: template.church_id || null,
            is_global: template.is_global || false,
          });
          importedCount++;
        } catch (error) {
          console.error('Failed to import template:', template.name, error);
          errorCount++;
        }
      }

      await loadTemplatesFromDb();
      setImportTemplatesDialogOpen(false);
      setImportTemplatesJson('');
      
      if (errorCount > 0) {
        showToast(`Imported ${importedCount} templates. ${errorCount} failed.`, 'warning');
      } else {
        showToast(`Imported ${importedCount} templates successfully`, 'success');
      }
    } catch (e) {
      showToast('Failed to import templates', 'error');
      console.error(e);
    }
  }, [importTemplatesJson, loadTemplatesFromDb, showToast]);
  
  const handleCreateStandardTemplates = useCallback(async () => {
    try {
      const standardHeaders = ['id', 'church_id', 'entry_no', 'date', 'first_name', 'last_name', 'father_name', 'mother_name', 'godfather_name', 'godmother_name', 'notes'];
      const recordTypes: Array<'baptism' | 'marriage' | 'funeral'> = ['baptism', 'marriage', 'funeral'];
      const locales = ['en', 'gr'];

      let created = 0;
      for (const locale of locales) {
        for (const recordType of recordTypes) {
          const name = `${locale}_${recordType}_records`;
          const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
          
          const fields = standardHeaders.map((header, index) => ({
            column: `col_${index}`,
            label: header,
            type: 'string',
            required: false,
          }));

          try {
            await adminAPI.templates.create({
              name,
              slug,
              record_type: recordType,
              description: `Standard ${recordType} template for ${locale}`,
              fields,
              grid_type: 'aggrid',
              theme: 'liturgicalBlueGold',
              layout_type: 'table',
              is_editable: true,
              church_id: null,
              is_global: true,
            });
            created++;
          } catch (error) {
            // Template might already exist, skip
            console.log(`Template ${name} may already exist, skipping`);
          }
        }
      }

      await loadTemplatesFromDb();
      showToast(`Created ${created} standard templates`, 'success');
    } catch (e) {
      showToast('Failed to create standard templates', 'error');
      console.error(e);
    }
  }, [loadTemplatesFromDb, showToast]);


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
                disabled={loadingTemplates}
                onChange={(e) => {
                  const slug = e.target.value;
                  setSelectedTemplate(slug);
                  if (slug) {
                    handleLoadTemplate(slug);
                  }
                }}
              >
                {loadingTemplates ? (
                  <MenuItem disabled>Loading templates...</MenuItem>
                ) : templates.length === 0 ? (
                  <MenuItem disabled>No templates available</MenuItem>
                ) : (
                  templates.map((template) => (
                    <MenuItem key={template.slug} value={template.slug}>
                      {template.name} {template.is_global ? '(Global)' : ''}
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
      <Dialog open={saveTemplateDialogOpen} onClose={() => setSaveTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Template to Database</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Standard Baptism Records"
              required
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Record Type</InputLabel>
              <Select
                value={templateRecordType}
                label="Record Type"
                onChange={(e) => setTemplateRecordType(e.target.value as any)}
              >
                <MenuItem value="baptism">Baptism</MenuItem>
                <MenuItem value="marriage">Marriage</MenuItem>
                <MenuItem value="funeral">Funeral</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description (optional)"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Template description..."
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={templateIsGlobal}
                  onChange={(e) => setTemplateIsGlobal(e.target.checked)}
                />
              }
              label="Make this template global (available to all churches)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSaveTemplateDialogOpen(false);
            setTemplateName('');
            setTemplateDescription('');
            setTemplateRecordType('custom');
            setTemplateIsGlobal(false);
          }}>Cancel</Button>
          <Button 
            onClick={handleSaveTemplate} 
            variant="contained" 
            disabled={!templateName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Overwrite Template Confirmation Dialog */}
      <Dialog open={overwriteTemplateDialogOpen} onClose={() => setOverwriteTemplateDialogOpen(false)}>
        <DialogTitle>Update Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Template "{templateName}" already exists in the database. Update it?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOverwriteTemplateDialogOpen(false);
            setTemplateName('');
            setSaveTemplateDialogOpen(false);
          }}>Cancel</Button>
          <Button onClick={handleOverwriteTemplate} variant="contained" color="warning">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Template Confirmation Dialog */}
      <Dialog open={deleteTemplateDialogOpen} onClose={() => setDeleteTemplateDialogOpen(false)}>
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this template? This action cannot be undone.
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
            You have unsaved changes. Loading this template will replace your current table. Continue?
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


      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={12000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
        sx={{
          position: 'fixed',
          top: '50% !important',
          left: '50% !important',
          transform: 'translate(-50%, -50%) !important',
          zIndex: 10000,
          '& .MuiSnackbar-root': {
            position: 'fixed',
            top: '50% !important',
            left: '50% !important',
            transform: 'translate(-50%, -50%) !important',
          }
        }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ 
            minWidth: '400px',
            maxWidth: '600px',
            fontSize: '1.1rem',
            padding: '16px 20px',
            '& .MuiAlert-message': {
              fontSize: '1.1rem',
              fontWeight: 500,
            },
            '& .MuiAlert-icon': {
              fontSize: '28px',
            }
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LiveTableBuilderPage;
