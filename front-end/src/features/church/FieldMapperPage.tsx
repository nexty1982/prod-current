import adminAPI from '@/api/admin.api';
import { useAuth } from '@/context/AuthContext';
import { fetchWithChurchContext } from '@/shared/lib/fetchWithChurchContext';
import { enhancedTableStore, THEME_MAP, type LiturgicalThemeKey, type ThemeTokens } from '@/store/enhancedTableStore';
import {
    Palette as PaletteIcon,
    Settings as SettingsIcon,
    Storage as StorageIcon,
    ViewList as ViewListIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    IconButton,
    Stack,
    Tab,
    Tabs,
    Typography,
    useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DatabaseMappingTab from './FieldMapperPage/DatabaseMappingTab';
import ExportTemplateDialog from './FieldMapperPage/ExportTemplateDialog';
import RecordSettingsTab from './FieldMapperPage/RecordSettingsTab';
import ThemeStudioTab from './FieldMapperPage/ThemeStudioTab';
import UIThemeTab from './FieldMapperPage/UIThemeTab';
import { useRecordSettings } from './FieldMapperPage/useRecordSettings';
import type { ApiResponse, Column, DynamicConfig, EditingTheme, ThemeStudioState } from './FieldMapperPage/types';

const FieldMapperPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();

  // Helper to ensure church ID is valid
  const getValidChurchId = (churchId: any): number | null => {
    if (churchId === null || churchId === undefined || churchId === '') return null;
    const num = typeof churchId === 'string' ? parseInt(churchId, 10) : Number(churchId);
    return !isNaN(num) && num > 0 ? num : null;
  };

  // Get church ID from URL param, fallback to user's church_id if available
  const urlChurchId = getValidChurchId(id);
  const userChurchId = getValidChurchId(user?.church_id);
  const churchId = urlChurchId || userChurchId;

  // Get table name from URL parameter, default to 'baptism_records'
  const urlTableName = searchParams.get('table') || 'baptism_records';
  const [tableName, setTableName] = useState<string>(urlTableName);

  // Map table name to record type for navigation
  const getRecordType = (table: string): string => {
    if (table === 'baptism_records') return 'baptism';
    if (table === 'marriage_records') return 'marriage';
    if (table === 'funeral_records') return 'funeral';
    return 'baptism'; // default fallback
  };

  // Handle back to records navigation
  const handleBackToRecords = () => {
    const recordType = getRecordType(urlTableName);
    navigate(`/apps/records/${recordType}`);
  };
  const [rows, setRows] = useState<Column[]>([]);
  const [defaultSortField, setDefaultSortField] = useState<string>('');
  const [defaultSortDirection, setDefaultSortDirection] = useState<'asc' | 'desc'>('asc');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  // Church name state (for header display)
  const [churchName, setChurchName] = useState<string>('');

  // Export to Template state
  const [exportLanguage, setExportLanguage] = useState<string>('en');
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportOverwrite, setExportOverwrite] = useState<boolean>(false);

  // Record Settings (custom hook)
  const {
    recordSettings,
    setRecordSettings,
    handleImageUpload,
    handleResetDefaults,
    handleSaveRecordSettings,
  } = useRecordSettings(churchId, setError, setSuccess, setSaving);

  // Dynamic Records Config State
  const [dynamicConfig, setDynamicConfig] = useState<DynamicConfig>({
    branding: {
      churchName: '',
      logoUrl: undefined,
      logoPreview: undefined,
      logoAlign: 'left',
      showBrandHeader: true,
    },
    liturgicalTheme: 'orthodox_traditional',
    fieldRules: [],
  });

  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  // Theme Studio State
  const [themeStudio, setThemeStudio] = useState<ThemeStudioState>({
    isGlobal: false,
    themes: {},
    selectedTheme: '',
  });

  const [editingTheme, setEditingTheme] = useState<EditingTheme | null>(null);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [previewTheme, setPreviewTheme] = useState<ThemeTokens | null>(null);
  const [colorConfigDialogOpen, setColorConfigDialogOpen] = useState(false);
  const [configuringColorKey, setConfiguringColorKey] = useState<keyof ThemeTokens | null>(null);

  // UI Theme State - for real-time preview updates
  const [uiThemeState, setUiThemeState] = useState(enhancedTableStore.getState());
  const [configuringButton, setConfiguringButton] = useState<string | null>('searchRecords');
  const [configuringColumn, setConfiguringColumn] = useState<string | null>(null);

  // Database Schema stats
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [columnsError, setColumnsError] = useState<string | null>(null);

  // Subscribe to enhancedTableStore changes for real-time preview updates
  useEffect(() => {
    const unsubscribe = enhancedTableStore.subscribe(() => {
      setUiThemeState(enhancedTableStore.getState());
      // Reset preview theme when store theme changes
      setPreviewTheme(null);
    });
    return () => unsubscribe();
  }, []);

  // Load themes
  const loadThemes = async (isGlobal: boolean) => {
    if (!isGlobal && !churchId) {
      console.error('Cannot load church themes: invalid church ID');
      return;
    }

    try {
      const endpoint = isGlobal
        ? '/api/admin/churches/themes/global'
        : `/api/admin/churches/${churchId}/themes`;

      const response = await fetch(endpoint, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both ApiResponse-wrapped ({ data: { themes } }) and direct ({ themes }) formats
        const themesPayload = data.data?.themes || data.themes;
        if (themesPayload && typeof themesPayload === 'object' && Object.keys(themesPayload).length > 0) {
          setThemeStudio(prev => ({
            ...prev,
            themes: themesPayload,
            isGlobal: isGlobal,
          }));

          // Sync church-specific themes to enhancedTableStore so they appear in dropdown
          if (!isGlobal) {
            enhancedTableStore.setCustomThemes(themesPayload);
          }
        } else {
          // Initialize with empty themes
          setThemeStudio(prev => ({
            ...prev,
            themes: {},
            isGlobal: isGlobal,
          }));

          // Clear custom themes if no themes found
          if (!isGlobal) {
            enhancedTableStore.setCustomThemes({});
          }
        }
      } else {
        // Initialize with empty themes
        setThemeStudio(prev => ({
          ...prev,
          themes: {},
          isGlobal: isGlobal,
        }));

        // Clear custom themes if request failed
        if (!isGlobal) {
          enhancedTableStore.setCustomThemes({});
        }
      }
    } catch (err) {
      console.error('Error loading themes:', err);
      setThemeStudio(prev => ({
        ...prev,
        themes: {},
        isGlobal: isGlobal,
      }));

      // Clear custom themes on error
      if (!isGlobal) {
        enhancedTableStore.setCustomThemes({});
      }
    }
  };

  // Save themes
  const saveThemes = async () => {
    if (!themeStudio.isGlobal && !churchId) {
      setError('Invalid church ID. Cannot save themes.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const endpoint = themeStudio.isGlobal
        ? '/api/admin/churches/themes/global'
        : `/api/admin/churches/${churchId}/themes`;

      // Send themes as object (Record<string, ThemeTokens>) to match what loadThemes() expects
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          themes: themeStudio.themes || {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save themes');
      }

      setSuccess(`Themes saved successfully as ${themeStudio.isGlobal ? 'global' : 'church-specific'} themes!`);

      // Also update enhancedTableStore with custom themes so they appear in dropdown
      if (!themeStudio.isGlobal) {
        // Only sync church-specific themes to the store
        enhancedTableStore.setCustomThemes(themeStudio.themes);
      }
    } catch (err: any) {
      console.error('Error saving themes:', err);
      setError(err?.message || 'Failed to save themes');
    } finally {
      setSaving(false);
    }
  };

  // Load themes on mount and when isGlobal changes
  useEffect(() => {
    if (churchId) {
      loadThemes(themeStudio.isGlobal);
    }
  }, [churchId, themeStudio.isGlobal]);

  // Load custom themes from enhancedTableStore on mount
  useEffect(() => {
    const customThemes = enhancedTableStore.getCustomThemes();
    if (customThemes && Object.keys(customThemes).length > 0 && !themeStudio.isGlobal) {
      // Merge custom themes with loaded themes
      setThemeStudio(prev => ({
        ...prev,
        themes: { ...prev.themes, ...customThemes },
      }));
    }
  }, []);

  // Load church info and dynamic records config
  useEffect(() => {
    const loadChurchInfoAndConfig = async () => {
      if (!churchId) return;

      try {
        // Load church information
        const churchResponse = await fetch(`/api/admin/churches/${churchId}`, {
          credentials: 'include',
        });
        let loadedChurchName = '';
        if (churchResponse.ok) {
          const churchData = await churchResponse.json();
          loadedChurchName = churchData.church?.church_name || churchData.church?.name || churchData.data?.church_name || churchData.data?.name || churchData.church_name || churchData.name || '';
          setChurchName(loadedChurchName);
        }

        // Check if logo exists - try multiple methods
        const logoUrl = `/images/records/${churchId}-logo.png`;
        let logoExists = false;
        try {
          // Try HEAD request first
          const logoCheck = await fetch(logoUrl, { method: 'HEAD', cache: 'no-cache' });
          logoExists = logoCheck.ok;
        } catch {
          // If HEAD fails, try GET request
          try {
            const logoCheck = await fetch(logoUrl, { method: 'GET', cache: 'no-cache' });
            logoExists = logoCheck.ok;
          } catch {
            // Logo doesn't exist or can't be checked
            logoExists = false;
          }
        }

        // Load dynamic records config
        const configResponse = await fetch(`/api/admin/churches/${churchId}/dynamic-records-config`, {
          credentials: 'include',
        });

        if (configResponse.ok) {
          const data = await configResponse.json();
          if (data.config) {
            // Merge with church info
            setDynamicConfig(prev => ({
              ...data.config,
              branding: {
                ...data.config.branding,
                churchName: data.config.branding?.churchName || loadedChurchName,
                logoUrl: data.config.branding?.logoUrl || (logoExists ? logoUrl : undefined),
              },
            }));
          } else {
            // Use defaults with church info
            const storeState = enhancedTableStore.getState();
            setDynamicConfig({
              branding: {
                ...storeState.branding,
                churchName: loadedChurchName,
                logoUrl: logoExists ? logoUrl : undefined,
              },
              liturgicalTheme: storeState.liturgicalTheme,
              fieldRules: storeState.fieldRules,
            });
          }
        } else {
          // Use defaults with church info
          const storeState = enhancedTableStore.getState();
          setDynamicConfig({
            branding: {
              ...storeState.branding,
              churchName: loadedChurchName,
              logoUrl: logoExists ? logoUrl : undefined,
            },
            liturgicalTheme: storeState.liturgicalTheme,
            fieldRules: storeState.fieldRules,
          });
        }
      } catch (err) {
        console.error('Error loading church info and dynamic records config:', err);
        // Load from enhancedTableStore as fallback
        const storeState = enhancedTableStore.getState();
        setDynamicConfig({
          branding: storeState.branding,
          liturgicalTheme: storeState.liturgicalTheme,
          fieldRules: storeState.fieldRules,
        });
      }
    };

    if (churchId) {
      loadChurchInfoAndConfig();
    }
  }, [churchId]);

  // --- Load columns using adminAPI with smart backend fallbacks ---
  const loadColumns = async () => {
    if (!churchId) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // 1) Get column names (works across /admin and /api/admin variants)
      let normalizedColumns: string[] = [];
      try {
        const result = await adminAPI.churches.getTableColumns(churchId, tableName);
        normalizedColumns = result.columns;
      } catch (colErr) {
        console.warn('getTableColumns failed, will try field-mapper endpoint:', colErr);
      }

      // 2) Try to fetch existing mappings/settings (also provides columns as fallback)
      const mappingCandidates = [
        `/api/admin/churches/${churchId}/field-mapper?table=${encodeURIComponent(tableName)}`,
      ];

      let mappingData: ApiResponse | null = null;
      for (const url of mappingCandidates) {
        try {
          const res = await fetchWithChurchContext(url, { churchId, credentials: 'include' });
          if (res.ok) {
            const raw = await res.json();
            // Handle both ApiResponse-wrapped ({ data: { columns, mappings, ... } }) and direct formats
            mappingData = raw.data ?? raw;
            break;
          }
        } catch {
          /* try next candidate */
        }
      }

      // If both column sources failed, throw
      if (normalizedColumns.length === 0 && (!mappingData || !mappingData.columns?.length)) {
        throw new Error('No matching columns endpoint responded. Column mapping cannot be loaded.');
      }

      const data: ApiResponse = mappingData ?? { columns: normalizedColumns.map((name, i) => ({ column_name: name, ordinal_position: i + 1 })) };

      // 3) Map into UI rows with defaults
      const columnsSource = data.columns ?? normalizedColumns.map((name, i) => ({
        column_name: name, ordinal_position: i + 1,
      }));
      const rowsMapped: Column[] = columnsSource.map((col, idx) => {
        const column_name = (col as any).column_name ?? (col as any).name ?? (col as any).Field ?? (typeof col === 'string' ? col : `col_${idx + 1}`);
        const ordinal_position = (col as any).ordinal_position ?? (col as any).position ?? (idx + 1);

        return {
          column_name,
          ordinal_position,
          new_name: data.mappings?.[column_name] || '',
          is_visible: data.field_settings?.visibility?.[column_name] ?? true,
          is_sortable: data.field_settings?.sortable?.[column_name] ?? true,
        };
      });

      setRows(rowsMapped);
      setLastSync(new Date());
      setColumnsError(null);

      if (data.field_settings?.default_sort_field) {
        setDefaultSortField(data.field_settings.default_sort_field);
      } else {
        setDefaultSortField('');
      }
      if (data.field_settings?.default_sort_direction) {
        setDefaultSortDirection(data.field_settings.default_sort_direction);
      } else {
        setDefaultSortDirection('asc');
      }

      // Fetch row count for the table
      try {
        const countRes = await fetch(`/api/admin/church-database/${churchId}/record-counts`, { credentials: 'include' });
        if (countRes.ok) {
          const countData = await countRes.json();
          const counts = countData?.data?.record_counts || countData?.counts || countData;
          setRowCount(counts[tableName] ?? null);
        }
      } catch { /* non-fatal */ }
    } catch (err: any) {
      console.error('Error loading columns:', err);
      const msg = err?.message || 'Failed to load columns';
      setError(msg);
      setColumnsError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Export to Template handler ---
  const handleExportToTemplate = async () => {
    if (!churchId || !tableName) return;

    try {
      setExporting(true);
      setError(null);
      setSuccess(null);

      // Generate slug and name
      const slug = `${exportLanguage}_${tableName}`;
      const recordType = getRecordType(tableName);
      const langName = exportLanguage === 'en' ? 'English' :
                      exportLanguage === 'gr' ? 'Greek' :
                      exportLanguage === 'ru' ? 'Russian' :
                      exportLanguage === 'ro' ? 'Romanian' :
                      exportLanguage === 'ka' ? 'Georgian' : exportLanguage.toUpperCase();
      const name = `${langName} ${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Records`;

      const response = await adminAPI.churches.exportTemplate(churchId, {
        table: tableName,
        language: exportLanguage,
        template_slug: slug,
        template_name: name,
        overwrite: exportOverwrite
      });

      if (response.success) {
        setSuccess(`Exported template: ${response.slug}`);
        setExportDialogOpen(false);
        setExportOverwrite(false);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(response.error || 'Failed to export template');
      }
    } catch (err: any) {
      console.error('Error exporting template:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to export template');
    } finally {
      setExporting(false);
    }
  };

  // --- Save mapping with a minimal dual-path fallback (/admin then /api/admin) ---
  const handleSave = async () => {
    if (!churchId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const mapping: Record<string, string> = {};
      const visibility: Record<string, boolean> = {};
      const sortable: Record<string, boolean> = {};
      rows.forEach((row) => {
        if (row.new_name.trim()) mapping[row.column_name] = row.new_name.trim();
        visibility[row.column_name] = row.is_visible;
        sortable[row.column_name] = row.is_sortable;
      });

      const body = JSON.stringify({
        table: tableName,
        mappings: mapping,
        field_settings: {
          visibility,
          sortable,
          default_sort_field: defaultSortField,
          default_sort_direction: defaultSortDirection,
        },
      });

      const saveCandidates = [
        `/api/admin/churches/${churchId}/field-mapper`,
      ];

      let ok = false;
      let lastErr: any = null;
      for (const url of saveCandidates) {
        try {
          const res = await fetchWithChurchContext(url, {
            churchId,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body,
          });
          if (res.ok) {
            ok = true;
            break;
          } else {
            const e = await res.json().catch(() => ({}));
            lastErr = new Error(e?.error?.message || e?.message || e?.error || `HTTP ${res.status}: ${res.statusText}`);
          }
        } catch (e) {
          lastErr = e;
        }
      }
      if (!ok) throw lastErr || new Error('Failed to save mapping');

      setSuccess('Field mapping saved successfully!');

      // Optional: notify opener
      if (window.opener) {
        try {
          window.opener.postMessage(
            { type: 'FIELD_MAPPING_SAVED', table: tableName, churchId, timestamp: new Date().toISOString() },
            '*'
          );
        } catch {}
      }

      // Auto-close after 1.5s
      setTimeout(() => window.close(), 1500);
    } catch (err: any) {
      console.error('Error saving mapping:', err);
      setError(err?.message || 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => window.close();


  const updateNewName = (columnName: string, newName: string) => {
    setRows((prev) =>
      prev.map((r) => (r.column_name === columnName ? { ...r, new_name: newName } : r))
    );
  };
  const toggleColumnVisibility = (columnName: string) => {
    setRows((prev) =>
      prev.map((r) => (r.column_name === columnName ? { ...r, is_visible: !r.is_visible } : r))
    );
  };
  const toggleColumnSortable = (columnName: string) => {
    setRows((prev) =>
      prev.map((r) => (r.column_name === columnName ? { ...r, is_sortable: !r.is_sortable } : r))
    );
  };

  // Update tableName when URL parameter changes
  useEffect(() => {
    const urlTable = searchParams.get('table') || 'baptism_records';
    if (urlTable !== tableName) {
      setTableName(urlTable);
      // Clear rows when table changes to avoid showing stale data
      setRows([]);
      setDefaultSortField('');
      setDefaultSortDirection('asc');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load columns on mount and when table changes
  useEffect(() => {
    if (tableName) {
      loadColumns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, tableName]);

  if (!churchId) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Invalid church ID. Please check the URL or ensure you have access to a church.
          {user?.church_id && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Your assigned church ID: {user.church_id}
            </Typography>
          )}
        </Alert>
      </Box>
    );
  }


  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      {/* Page Header */}
      <Box sx={{ px: 3, pt: 3, pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Record Table Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure database mappings and record display settings for{' '}
              <Typography component="span" variant="body2" color="primary.main" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                churchID {churchId}
              </Typography>
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" size="small" startIcon={<SettingsIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>
              Show HUD
            </Button>
            <IconButton size="small"><SettingsIcon fontSize="small" /></IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 48,
              fontWeight: 500,
              fontSize: '0.875rem',
            },
            '& .Mui-selected': {
              fontWeight: 600,
            },
          }}
        >
          <Tab icon={<StorageIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Database Mapping" />
          <Tab icon={<SettingsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Record Settings" />
          <Tab icon={<PaletteIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Theme Studio" />
          <Tab icon={<ViewListIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="UI Theme" />
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Tab Panel 0: Database Mapping */}
        {activeTab === 0 && (
          <DatabaseMappingTab
            rows={rows}
            tableName={tableName}
            setTableName={setTableName}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            defaultSortField={defaultSortField}
            setDefaultSortField={setDefaultSortField}
            defaultSortDirection={defaultSortDirection}
            setDefaultSortDirection={setDefaultSortDirection}
            saving={saving}
            loading={loading}
            error={error}
            success={success}
            columnsError={columnsError}
            rowCount={rowCount}
            lastSync={lastSync}
            exportLanguage={exportLanguage}
            configuringColumn={configuringColumn}
            setConfiguringColumn={setConfiguringColumn}
            loadColumns={loadColumns}
            setExportDialogOpen={setExportDialogOpen}
            updateNewName={updateNewName}
            toggleColumnVisibility={toggleColumnVisibility}
            toggleColumnSortable={toggleColumnSortable}
            handleSave={handleSave}
            handleCancel={handleCancel}
          />
        )}

        {/* Tab Panel 1: Record Settings */}
        {activeTab === 1 && (
          <RecordSettingsTab
            churchId={churchId}
            churchName={churchName}
            urlTableName={urlTableName}
            recordSettings={recordSettings}
            setRecordSettings={setRecordSettings}
            saving={saving}
            error={error}
            success={success}
            columnsError={columnsError}
            setError={setError}
            setSuccess={setSuccess}
            setSaving={setSaving}
            handleImageUpload={handleImageUpload}
            handleResetDefaults={handleResetDefaults}
            handleSaveRecordSettings={handleSaveRecordSettings}
            handleCancel={handleCancel}
          />
        )}

        {/* Tab Panel 2: Theme Studio */}
        {activeTab === 2 && (
          <ThemeStudioTab
            themeStudio={themeStudio}
            setThemeStudio={setThemeStudio}
            editingTheme={editingTheme}
            setEditingTheme={setEditingTheme}
            themeDialogOpen={themeDialogOpen}
            setThemeDialogOpen={setThemeDialogOpen}
            saveAsDialogOpen={saveAsDialogOpen}
            setSaveAsDialogOpen={setSaveAsDialogOpen}
            newThemeName={newThemeName}
            setNewThemeName={setNewThemeName}
            previewTheme={previewTheme}
            setPreviewTheme={setPreviewTheme}
            colorConfigDialogOpen={colorConfigDialogOpen}
            setColorConfigDialogOpen={setColorConfigDialogOpen}
            configuringColorKey={configuringColorKey}
            setConfiguringColorKey={setConfiguringColorKey}
            saving={saving}
            error={error}
            success={success}
            setError={setError}
            setSuccess={setSuccess}
            loadThemes={loadThemes}
            saveThemes={saveThemes}
            handleCancel={handleCancel}
          />
        )}

        {/* Tab Panel 3: UI Theme */}
        {activeTab === 3 && (
          <UIThemeTab
            churchId={churchId}
            uiThemeState={uiThemeState}
            dynamicConfig={dynamicConfig}
            configuringButton={configuringButton}
            setConfiguringButton={setConfiguringButton}
            saving={saving}
            error={error}
            success={success}
            setSaving={setSaving}
            setError={setError}
            setSuccess={setSuccess}
            handleCancel={handleCancel}
          />
        )}
      </Box>

      <ExportTemplateDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExportToTemplate}
        exporting={exporting}
        tableName={tableName}
        exportLanguage={exportLanguage}
        exportOverwrite={exportOverwrite}
        setExportOverwrite={setExportOverwrite}
        getRecordType={getRecordType}
      />
    </Box>
  );
};

export default FieldMapperPage;
