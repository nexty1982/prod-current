import adminAPI from '@/api/admin.api';
import { useAuth } from '@/context/AuthContext';
import { fetchWithChurchContext } from '@/shared/lib/fetchWithChurchContext';
import { enhancedTableStore, THEME_MAP, type LiturgicalThemeKey, type ThemeTokens } from '@/store/enhancedTableStore';
import {
    Download as DownloadIcon,
    Palette as PaletteIcon,
    Settings as SettingsIcon,
    Storage as StorageIcon,
    ViewList as ViewListIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
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
import RecordSettingsTab from './FieldMapperPage/RecordSettingsTab';
import ThemeStudioTab from './FieldMapperPage/ThemeStudioTab';
import UIThemeTab from './FieldMapperPage/UIThemeTab';
import { DEFAULT_RECORD_SETTINGS } from './FieldMapperPage/constants';
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

  // Record Settings State
  const [recordSettings, setRecordSettings] = useState({
    logo: {
      enabled: true,
      column: 3,
      file: null as File | null,
      width: 200,
      height: 200,
      objectFit: 'contain' as 'contain' | 'cover' | 'fill' | 'none' | 'scale-down',
      opacity: 100,
      quadrant: 'middle' as 'top' | 'middle' | 'bottom',
      horizontalPosition: 'center' as 'left' | 'center' | 'right',
    },
    calendar: {
      enabled: true,
      column: 2,
      quadrant: 'middle' as 'top' | 'middle' | 'bottom',
      horizontalPosition: 'center' as 'left' | 'center' | 'right',
    },
    omLogo: {
      enabled: true,
      column: 4,
      width: 68,
      height: 68,
      quadrant: 'middle' as 'top' | 'middle' | 'bottom',
      horizontalPosition: 'center' as 'left' | 'center' | 'right',
    },
    headerText: {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 700,
      color: '#4C1D95',
      column: 1,
      position: 'above', // 'above' or 'below' recordImage
      quadrant: 'middle', // 'top', 'middle', or 'bottom'
      horizontalPosition: 'center' as 'left' | 'center' | 'right',
    },
    recordImages: {
      column: 1,
      quadrant: 'middle', // 'top', 'middle', or 'bottom'
      horizontalPosition: 'center' as 'left' | 'center' | 'right',
      width: 160, // Width in pixels (default 160x160)
      height: 160, // Height in pixels (default 160x160)
    },
    backgroundImage: {
      enabled: true,
      column: 0, // 0 means span all columns
      images: [] as string[], // Array of image paths
      currentIndex: 0,
      quadrant: 'middle' as 'top' | 'middle' | 'bottom',
    },
    g1Image: {
      enabled: true,
      column: 0, // 0 means span all columns
      images: [] as string[], // Array of image paths
      currentIndex: 0,
      quadrant: 'middle' as 'top' | 'middle' | 'bottom',
    },
    // Support for multiple images per type
    imageLibrary: {
      logo: [] as string[],
      omLogo: [] as string[],
      baptism: [] as string[],
      marriage: [] as string[],
      funeral: [] as string[],
      bg: [] as string[],
      g1: [] as string[],
      recordImage: [] as string[], // General record images library
    },
    currentImageIndex: {
      logo: 0,
      omLogo: 0,
      baptism: 0,
      marriage: 0,
      funeral: 0,
      bg: 0,
      g1: 0,
      recordImage: 0,
    },
  });

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

  // Reset header settings to defaults
  const handleResetDefaults = () => {
    if (!window.confirm('Are you sure you want to reset the header display to default settings? This will clear all customizations.')) {
      return;
    }

    setRecordSettings({
      ...DEFAULT_RECORD_SETTINGS,
      logo: { ...DEFAULT_RECORD_SETTINGS.logo },
      calendar: { ...DEFAULT_RECORD_SETTINGS.calendar },
      omLogo: { ...DEFAULT_RECORD_SETTINGS.omLogo },
      headerText: { ...DEFAULT_RECORD_SETTINGS.headerText },
      recordImages: { ...DEFAULT_RECORD_SETTINGS.recordImages },
      backgroundImage: { ...DEFAULT_RECORD_SETTINGS.backgroundImage, images: [], currentIndex: 0 },
      g1Image: { ...DEFAULT_RECORD_SETTINGS.g1Image, images: [], currentIndex: 0 },
      imageLibrary: { ...DEFAULT_RECORD_SETTINGS.imageLibrary },
      currentImageIndex: { ...DEFAULT_RECORD_SETTINGS.currentImageIndex },
    });

    setSuccess('Header display reset to default settings. Click "Save Record Settings" to apply changes.');
    setError(null);
  };

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

  // Handle logo file upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate it's an image
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setRecordSettings(prev => ({
        ...prev,
        logo: { ...prev.logo, file }
      }));
    }
  };

  // Handle image upload from preview component
  const handleImageUpload = async (type: string, file: File) => {
    if (!churchId) {
      throw new Error('Invalid church ID. Cannot upload image.');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    const response = await fetch(`/api/admin/churches/${churchId}/record-images`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload image';
      let errorDetails: any = null;

      // Try to get the response as text first (in case it's not JSON)
      const responseText = await response.text();

      // Check if it's an HTML error page (nginx/apache)
      if (responseText.trim().startsWith('<html') || responseText.trim().startsWith('<!DOCTYPE')) {
        // Extract title from HTML if possible
        const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : 'Internal Server Error';

        errorMessage = `Server error (${response.status}): ${title}. The server is experiencing issues. Please check the server logs or contact support.`;

        console.error('Received HTML error page instead of JSON:', {
          status: response.status,
          statusText: response.statusText,
          htmlTitle: title,
          responsePreview: responseText.substring(0, 300),
        });
      } else {
        try {
          // Try to parse as JSON
          errorDetails = JSON.parse(responseText);
          errorMessage = errorDetails.message || errorDetails.error || errorDetails.error?.message || errorMessage;
        } catch (parseError) {
          // If not JSON and not HTML, use the text response (but limit length)
          if (responseText && responseText.trim() && responseText.length < 500) {
            errorMessage = responseText.trim();
          } else {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        }
      }

      // Log full error details for debugging (but don't include full HTML in message)
      console.error('Upload error details:', {
        status: response.status,
        statusText: response.statusText,
        errorDetails,
        responsePreview: responseText.substring(0, 500),
        isHtml: responseText.trim().startsWith('<html') || responseText.trim().startsWith('<!DOCTYPE'),
      });

        throw new Error(errorMessage);
      }

      const result = await response.json();
      const imageUrl = result.url || result.path || `/images/records/${churchId}-${type === 'logo' ? 'logo' : type === 'bg' ? 'bg' : type}.png`;

      // Add the new image to the image library
      setRecordSettings(prev => {
        const imageLibrary = prev.imageLibrary || {
          logo: [],
          omLogo: [],
          baptism: [],
          marriage: [],
          funeral: [],
          bg: [],
          g1: [],
          recordImage: [],
        };

        const currentImages = imageLibrary[type as keyof typeof imageLibrary] || [];
        const updatedImages = [...currentImages, imageUrl];

        // Update current index to the newly uploaded image
        const currentImageIndex = prev.currentImageIndex || {
          logo: 0,
          omLogo: 0,
          baptism: 0,
          marriage: 0,
          funeral: 0,
          bg: 0,
          g1: 0,
          recordImage: 0,
        };

        return {
          ...prev,
          imageLibrary: {
            ...imageLibrary,
            [type]: updatedImages,
          },
          currentImageIndex: {
            ...currentImageIndex,
            [type]: updatedImages.length - 1,
          },
          // Also update the file reference for logo
          ...(type === 'logo' ? {
            logo: { ...prev.logo, file }
          } : {}),
        };
      });

    return imageUrl;
  };

  // Save record settings
  const handleSaveRecordSettings = async () => {
    if (!churchId) {
      setError('Invalid church ID. Please check the URL and ensure you have access to this church.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('settings', JSON.stringify({
        logo: {
          enabled: recordSettings.logo.enabled,
          column: recordSettings.logo.column,
          width: recordSettings.logo.width,
          height: recordSettings.logo.height,
          objectFit: recordSettings.logo.objectFit,
          opacity: recordSettings.logo.opacity,
          order: recordSettings.logo?.order ?? 0,
          quadrant: recordSettings.logo?.quadrant || 'middle',
          horizontalPosition: recordSettings.logo?.horizontalPosition || 'center',
        },
        calendar: {
          ...recordSettings.calendar,
          order: recordSettings.calendar?.order ?? 0,
          quadrant: recordSettings.calendar?.quadrant || 'middle',
          horizontalPosition: recordSettings.calendar?.horizontalPosition || 'center',
        },
        omLogo: {
          ...recordSettings.omLogo,
          order: recordSettings.omLogo?.order ?? 0,
          quadrant: recordSettings.omLogo?.quadrant || 'middle',
          horizontalPosition: recordSettings.omLogo?.horizontalPosition || 'center',
          width: recordSettings.omLogo.width,
          height: recordSettings.omLogo.height,
        },
        headerText: {
          fontFamily: recordSettings.headerText?.fontFamily || 'Arial, sans-serif',
          fontSize: recordSettings.headerText?.fontSize || 16,
          fontWeight: recordSettings.headerText?.fontWeight || 700,
          color: recordSettings.headerText?.color || '#4C1D95',
          column: recordSettings.headerText?.column || 1,
          order: recordSettings.headerText?.order ?? 0,
          position: recordSettings.headerText?.position || 'above',
          quadrant: recordSettings.headerText?.quadrant || 'middle',
          horizontalPosition: recordSettings.headerText?.horizontalPosition || 'center',
        },
        recordImages: {
          column: recordSettings.recordImages?.column || 1,
          order: recordSettings.recordImages?.order ?? 0,
          quadrant: recordSettings.recordImages?.quadrant || 'middle',
          horizontalPosition: recordSettings.recordImages?.horizontalPosition || 'center',
          width: recordSettings.recordImages?.width || 60,
          height: recordSettings.recordImages?.height || 60,
        },
        backgroundImage: {
          enabled: recordSettings.backgroundImage?.enabled ?? true,
          column: recordSettings.backgroundImage?.column ?? 0,
          order: recordSettings.backgroundImage?.order ?? 0,
          quadrant: recordSettings.backgroundImage?.quadrant || 'middle',
        },
        g1Image: {
          enabled: recordSettings.g1Image?.enabled ?? true,
          column: recordSettings.g1Image?.column ?? 0,
          order: recordSettings.g1Image?.order ?? 0,
          quadrant: recordSettings.g1Image?.quadrant || 'middle',
        },
        imageLibrary: recordSettings.imageLibrary || {},
        currentImageIndex: recordSettings.currentImageIndex || {},
      }));

      if (recordSettings.logo.file) {
        formData.append('logo', recordSettings.logo.file);
      }

      const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/record-settings`, {
        churchId,
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setSuccess('Record settings saved successfully!');

      // Reload settings to ensure preview is updated
      if (churchId) {
        const loadRecordSettings = async () => {
          try {
            const response = await fetch(`/api/admin/churches/${churchId}/record-settings`, {
              credentials: 'include',
              cache: 'no-cache',
            });
            if (response.ok) {
              const data = await response.json();
              if (data.settings) {
                const safeObj = (val: any) => (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
                setRecordSettings(prev => ({
                  ...prev,
                  ...safeObj(data.settings),
                  logo: {
                    ...prev.logo,
                    ...safeObj(data.settings.logo),
                  },
                  calendar: {
                    ...prev.calendar,
                    ...safeObj(data.settings.calendar),
                  },
                  omLogo: {
                    ...prev.omLogo,
                    ...safeObj(data.settings.omLogo),
                  },
                  headerText: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#4C1D95',
                    ...safeObj(data.settings.headerText),
                    column: data.settings.headerText?.column ?? 1,
                  },
                  recordImages: {
                    column: data.settings.recordImages?.column ?? 1,
                    quadrant: data.settings.recordImages?.quadrant || 'middle',
                    horizontalPosition: data.settings.recordImages?.horizontalPosition || 'center',
                    width: data.settings.recordImages?.width ?? 160,
                    height: data.settings.recordImages?.height ?? 160,
                  },
                  backgroundImage: {
                    enabled: data.settings.backgroundImage?.enabled ?? true,
                    column: data.settings.backgroundImage?.column ?? 0,
                    images: data.settings.backgroundImage?.images || [],
                    currentIndex: data.settings.backgroundImage?.currentIndex ?? 0,
                    quadrant: data.settings.backgroundImage?.quadrant || 'middle',
                  },
                  g1Image: {
                    enabled: data.settings.g1Image?.enabled ?? true,
                    column: data.settings.g1Image?.column ?? 0,
                    images: data.settings.g1Image?.images || [],
                    currentIndex: data.settings.g1Image?.currentIndex ?? 0,
                    quadrant: data.settings.g1Image?.quadrant || 'middle',
                  },
                  imageLibrary: {
                    logo: data.settings.imageLibrary?.logo || [],
                    omLogo: data.settings.imageLibrary?.omLogo || [],
                    baptism: data.settings.imageLibrary?.baptism || [],
                    marriage: data.settings.imageLibrary?.marriage || [],
                    funeral: data.settings.imageLibrary?.funeral || [],
                    bg: data.settings.imageLibrary?.bg || [],
                    g1: data.settings.imageLibrary?.g1 || [],
                    recordImage: data.settings.imageLibrary?.recordImage || [],
                  },
                  currentImageIndex: {
                    logo: data.settings.currentImageIndex?.logo ?? 0,
                    omLogo: data.settings.currentImageIndex?.omLogo ?? 0,
                    baptism: data.settings.currentImageIndex?.baptism ?? 0,
                    marriage: data.settings.currentImageIndex?.marriage ?? 0,
                    funeral: data.settings.currentImageIndex?.funeral ?? 0,
                    bg: data.settings.currentImageIndex?.bg ?? 0,
                    g1: data.settings.currentImageIndex?.g1 ?? 0,
                    recordImage: data.settings.currentImageIndex?.recordImage ?? 0,
                  },
                }));
              }
            }
          } catch (err) {
            console.error('Error reloading record settings:', err);
          }
        };
        loadRecordSettings();
      }

      // Dispatch custom event to notify other pages that settings have been updated
      window.dispatchEvent(new CustomEvent('recordSettingsUpdated', {
        detail: { churchId, timestamp: Date.now() }
      }));

      // Clear the file from state after successful save
      if (recordSettings.logo.file) {
        setRecordSettings(prev => ({
          ...prev,
          logo: { ...prev.logo, file: null }
        }));
      }
    } catch (err: any) {
      console.error('Error saving record settings:', err);
      setError(err?.message || 'Failed to save record settings');
    } finally {
      setSaving(false);
    }
  };

  // Load record settings
  useEffect(() => {
    if (!churchId) {
      setError('Invalid church ID. Please check the URL and ensure you have access to this church.');
      return;
    }

    const loadRecordSettings = async () => {
      try {
        const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/record-settings`, {
          churchId,
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            // Helper: only spread objects, not strings (guards against legacy corrupt data)
            const safeObj = (val: any) => (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};

            // Merge loaded settings with defaults to ensure all properties exist
            setRecordSettings(prev => ({
              ...prev,
              ...safeObj(data.settings),
              logo: {
                ...prev.logo,
                ...safeObj(data.settings.logo),
              },
              calendar: {
                ...prev.calendar,
                ...safeObj(data.settings.calendar),
              },
              omLogo: {
                ...prev.omLogo,
                ...safeObj(data.settings.omLogo),
              },
              headerText: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 16,
                fontWeight: 700,
                color: '#4C1D95',
                x: 0,
                y: 0,
                ...safeObj(data.settings.headerText),
                column: data.settings.headerText?.column ?? 1,
              },
              recordImages: {
                column: data.settings.recordImages?.column ?? 1,
                // Handle both old format (baptism/marriage/funeral) and new format (x, y)
                x: data.settings.recordImages?.x ?? data.settings.recordImages?.baptism?.x ?? 0,
                y: data.settings.recordImages?.y ?? data.settings.recordImages?.baptism?.y ?? 0,
                width: data.settings.recordImages?.width ?? 60,
                height: data.settings.recordImages?.height ?? 60,
              },
              backgroundImage: {
                enabled: true,
                column: 0,
                images: [],
                currentIndex: 0,
                ...safeObj(data.settings.backgroundImage),
              },
              g1Image: {
                enabled: true,
                column: 0,
                images: [],
                currentIndex: 0,
                ...safeObj(data.settings.g1Image),
              },
              imageLibrary: {
                logo: [],
                omLogo: [],
                baptism: [],
                marriage: [],
                funeral: [],
                bg: [],
                g1: [],
                ...safeObj(data.settings.imageLibrary),
              },
              currentImageIndex: {
                logo: 0,
                omLogo: 0,
                baptism: 0,
                marriage: 0,
                funeral: 0,
                bg: 0,
                g1: 0,
                ...safeObj(data.settings.currentImageIndex),
              },
            }));
          }
        }
      } catch (err) {
        console.error('Error loading record settings:', err);
      }
    };
    if (churchId) {
      loadRecordSettings();
    }
  }, [churchId]);

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

      {/* Export to Template Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => !exporting && setExportDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Export to Template</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                This will create or update a global template from the current table schema and field mapper configuration.
              </Typography>

              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Template Details:</Typography>
                <Typography variant="body2">
                  <strong>Table:</strong> {tableName}
                </Typography>
                <Typography variant="body2">
                  <strong>Language:</strong> {exportLanguage}
                </Typography>
                <Typography variant="body2">
                  <strong>Template Slug:</strong> {exportLanguage}_{tableName}
                </Typography>
                <Typography variant="body2">
                  <strong>Template Name:</strong> {
                    exportLanguage === 'en' ? 'English' :
                    exportLanguage === 'gr' ? 'Greek' :
                    exportLanguage === 'ru' ? 'Russian' :
                    exportLanguage === 'ro' ? 'Romanian' :
                    exportLanguage === 'ka' ? 'Georgian' : exportLanguage.toUpperCase()
                  } {getRecordType(tableName).charAt(0).toUpperCase() + getRecordType(tableName).slice(1)} Records
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOverwrite}
                    onChange={(e) => setExportOverwrite(e.target.checked)}
                    disabled={exporting}
                  />
                }
                label="Overwrite existing template if it exists"
              />

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> This will create a global template available to all churches.
                  Only export standardized, production-ready configurations. Church-specific customizations should not be exported.
                </Typography>
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportDialogOpen(false)} disabled={exporting}>
              Cancel
            </Button>
            <Button
              onClick={handleExportToTemplate}
              variant="contained"
              disabled={exporting}
              startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            >
              {exporting ? 'Exporting...' : 'Export Template'}
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
};

export default FieldMapperPage;
