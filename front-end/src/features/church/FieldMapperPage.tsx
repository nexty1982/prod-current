import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, CircularProgress, Select, MenuItem, FormControl,
  InputLabel, Stack, Card, CardContent, Divider, Checkbox, FormControlLabel, Radio,
  RadioGroup, Chip, Tooltip, Tabs, Tab, Slider, Switch, Grid, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, useTheme,
} from '@mui/material';
import {
  Save as SaveIcon, Refresh as RefreshIcon, Cancel as CancelIcon, Storage as StorageIcon,
  Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, Sort as SortIcon,
  ArrowUpward as ArrowUpIcon, ArrowDownward as ArrowDownIcon, Settings as SettingsIcon,
  Image as ImageIcon, CalendarToday as CalendarIcon, PhotoLibrary as PhotoLibraryIcon,
  CloudUpload as CloudUploadIcon, Palette as PaletteIcon, Business as BusinessIcon,
  Add as AddIcon, Delete as DeleteIcon, Download as DownloadIcon, Upload as UploadIcon,
  ViewList as ViewListIcon, GridView as GridViewIcon, Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import adminAPI from '@/api/admin.api';
import { enhancedTableStore, THEME_MAP, type LiturgicalThemeKey, type ThemeTokens, type FieldStyleRule, type Branding } from '@/store/enhancedTableStore';
import { useAuth } from '@/context/AuthContext';
import { fetchWithChurchContext } from '@/shared/lib/fetchWithChurchContext';
import RecordHeaderPreview from './RecordHeaderPreview';

interface Column {
  column_name: string;
  ordinal_position: number;
  new_name: string;
  is_visible: boolean;
  is_sortable: boolean;
}

interface ApiResponse {
  columns: Array<{ column_name: string; ordinal_position: number }>;
  mappings?: Record<string, string>;
  field_settings?: {
    visibility?: Record<string, boolean>;
    sortable?: Record<string, boolean>;
    default_sort_field?: string;
    default_sort_direction?: 'asc' | 'desc';
  };
}

// Sample data for Live Preview
const BAPTISM_RECORDS_PREVIEW = [
  { id: 1, first_name: 'Paul', last_name: 'Harris', birth_date: '3/30/1952', reception_date: '2/4/1953', birthplace: 'New York', entry_type: 'Chrismation', sponsors: 'Katherine Owens; James Franklin', parents: 'Christopher Harris & Claire Franklin', clergy: 'Fr. Michael Taylor' },
  { id: 2, first_name: 'Mary', last_name: 'Fletcher', birth_date: '8/13/1969', reception_date: '5/8/1970', birthplace: 'Detroit', entry_type: 'Baptism', sponsors: 'Jonathan Thompson; Mary Powers', parents: 'Andrew Fletcher & Madeline Warren', clergy: 'Fr. George Davis' },
  { id: 3, first_name: 'Lydia', last_name: 'Richards', birth_date: '8/1/1950', reception_date: '2/10/1951', birthplace: 'Pittsburgh', entry_type: 'Baptism', sponsors: 'Luke Griffin; Olivia Richards', parents: 'Anna Richards & Laura Vaughn', clergy: 'Fr. Michael Brown' },
];

const MARRIAGE_RECORDS_PREVIEW = [
  { id: 1, married_date_name: '11/20/2004 Emily Griffin', last_name: 'Nathan Bennett', parents_groom: 'Olivia Griffin & Joseph Bates', parents: 'Charlotte Bennett & Victoria Ellis', witnesses: 'Daniel Ingram; James Ulrich', marriage_license: 'ML-720644', clergy: 'Fr. John Ta' },
  { id: 2, married_date_name: '6/14/2008 Benjamin York', last_name: 'Mary Fletcher', parents_groom: 'James York & Naomi Ingram', parents: 'Rachel Fletcher & Elizabeth Quinn', witnesses: 'Samuel Underwood; Laura Ingram', marriage_license: 'ML-898207', clergy: 'Fr. Andrew' },
  { id: 3, married_date_name: '8/19/1992 Samuel Richards', last_name: 'Philis Bishop', parents_groom: 'Gabriella Richards & Sarah Knight', parents: 'Mary Bishop & Caroline Ortega', witnesses: 'Elizabeth Walker; Matthew Warren', marriage_license: 'ML-890870', clergy: 'Fr. Michae' },
  { id: 4, married_date_name: '9/3/1983 Mary Parker', last_name: 'Andrew Bennett', parents_groom: 'Katherine Parker & James Knight', parents: 'Joseph Bennett & Rebecca Reeves', witnesses: 'Laura Ingram; Luke Quinn', marriage_license: 'ML-735324', clergy: 'Fr. Andrew' },
];

const FUNERAL_RECORDS_PREVIEW = [
  { id: 1, date_of_deceased: '11/1/2068', date_of_burial: '11/3/2068', first_name: 'Adam', last_name: 'Ingram', age: 77, clergy: 'Fr. Andrew Taylor', burial_location: 'Resurrection Cemetery' },
  { id: 2, date_of_deceased: '10/28/2040', date_of_burial: '11/5/2040', first_name: 'Joseph', last_name: 'Quinn', age: 53, clergy: 'Fr. Michael Brown', burial_location: 'St. George Cemetery' },
  { id: 3, date_of_deceased: '9/23/2010', date_of_burial: '9/26/2010', first_name: 'Sarah', last_name: 'Griffin', age: 73, clergy: 'Fr. John Moore', burial_location: 'St. George Cemetery' },
  { id: 4, date_of_deceased: '6/21/2040', date_of_burial: '6/26/2040', first_name: 'Peter', last_name: 'Walker', age: 44, clergy: 'Fr. Thomas Moore', burial_location: 'St. George Cemetery' },
  { id: 5, date_of_deceased: '1/10/2012', date_of_burial: '1/18/2012', first_name: 'Benjamin', last_name: 'Morris', age: 53, clergy: 'Fr. Peter Brown', burial_location: 'Resurrection Cemetery' },
  { id: 6, date_of_deceased: '3/24/2036', date_of_burial: '3/29/2036', first_name: 'Patrick', last_name: 'Powers', age: 50, clergy: 'Fr. Peter Taylor', burial_location: 'St. Nicholas Cemetery' },
];

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
  const [dynamicConfig, setDynamicConfig] = useState<{
    branding: Branding;
    liturgicalTheme: LiturgicalThemeKey;
    fieldRules: FieldStyleRule[];
  }>({
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
  
  const [editingRule, setEditingRule] = useState<FieldStyleRule | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  // Theme Studio State
  const [themeStudio, setThemeStudio] = useState<{
    isGlobal: boolean;
    themes: Record<string, ThemeTokens & { name: string; description?: string }>;
    selectedTheme: string;
  }>({
    isGlobal: false,
    themes: {},
    selectedTheme: '',
  });
  
  const [editingTheme, setEditingTheme] = useState<{
    name: string;
    description: string;
    tokens: ThemeTokens;
    isPreDefined?: boolean; // Track if editing a pre-defined theme
    originalKey?: string; // Original key for pre-defined themes
  } | null>(null);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [previewTheme, setPreviewTheme] = useState<ThemeTokens | null>(null);
  const [colorConfigDialogOpen, setColorConfigDialogOpen] = useState(false);
  const [configuringColorKey, setConfiguringColorKey] = useState<keyof ThemeTokens | null>(null);
  
  // UI Theme State - for real-time preview updates
  const [uiThemeState, setUiThemeState] = useState(enhancedTableStore.getState());
  const [configuringButton, setConfiguringButton] = useState<string | null>(null);
  const [configuringColumn, setConfiguringColumn] = useState<string | null>(null);

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
        if (data.themes) {
          setThemeStudio(prev => ({
            ...prev,
            themes: data.themes,
            isGlobal: isGlobal,
          }));
          
          // Sync church-specific themes to enhancedTableStore so they appear in dropdown
          if (!isGlobal) {
            enhancedTableStore.setCustomThemes(data.themes);
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

      // Convert themes object/map to array for API
      // themeStudio.themes is Record<string, ThemeTokens> - convert to Theme[]
      const themesArray = Object.values(themeStudio.themes || {}).filter(theme => theme && theme.name);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          themes: themesArray,
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
          loadedChurchName = churchData.church?.church_name || churchData.church?.name || '';
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
      const { columns: normalizedColumns } = await adminAPI.churches.getTableColumns(churchId, tableName);

      // 2) Try to fetch existing mappings/settings (optional)
      //    We probe two URLs; whichever returns JSON wins.
      const mappingCandidates = [
        `/admin/churches/${churchId}/field-mapper?table=${encodeURIComponent(tableName)}`,
        `/api/admin/churches/${churchId}/field-mapper?table=${encodeURIComponent(tableName)}`,
      ];

      let mappingData: ApiResponse | null = null;
      for (const url of mappingCandidates) {
        try {
          const res = await fetchWithChurchContext(url, { churchId, credentials: 'include' });
          if (res.ok) {
            mappingData = await res.json();
            break;
          }
        } catch {
          /* try next candidate */
        }
      }

      const data: ApiResponse = mappingData ?? { columns: normalizedColumns.map((name, i) => ({ column_name: name, ordinal_position: i + 1 })) };

      // 3) Map into UI rows with defaults
      const rowsMapped: Column[] = (data.columns ?? normalizedColumns.map((name, i) => ({
        column_name: name, ordinal_position: i + 1,
      }))).map((col, idx) => {
        const column_name = (col as any).column_name ?? (typeof col === 'string' ? col : `col_${idx + 1}`);
        const ordinal_position = (col as any).ordinal_position ?? (idx + 1);

        return {
          column_name,
          ordinal_position,
          new_name: data.mappings?.[column_name] || '',
          is_visible: data.field_settings?.visibility?.[column_name] ?? true,
          is_sortable: data.field_settings?.sortable?.[column_name] ?? true,
        };
      });

      setRows(rowsMapped);

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
    } catch (err: any) {
      console.error('Error loading columns:', err);
      setError(err?.message || 'Failed to load columns');
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
        mapping,
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
            lastErr = new Error(e?.error || `HTTP ${res.status}: ${res.statusText}`);
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

  // Reset header settings to defaults (matching simple header: record image left, text center, no other elements)
  const handleResetDefaults = () => {
    if (!window.confirm('Are you sure you want to reset the header display to default settings? This will clear all customizations.')) {
      return;
    }

    setRecordSettings({
      logo: {
        enabled: false, // Disabled - not shown in default simple header
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
        enabled: false, // Disabled - not shown in default simple header
        column: 2,
        quadrant: 'middle' as 'top' | 'middle' | 'bottom',
        horizontalPosition: 'center' as 'left' | 'center' | 'right',
      },
      omLogo: {
        enabled: false, // Disabled - not shown in default simple header
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
        column: 1, // Text spans across, centered
        position: 'above',
        quadrant: 'middle',
        horizontalPosition: 'center' as 'left' | 'center' | 'right',
      },
      recordImages: {
        column: 1, // Left side
        quadrant: 'middle',
        horizontalPosition: 'center' as 'left' | 'center' | 'right',
        width: 160, // Updated to 160x160 px
        height: 160, // Updated to 160x160 px
      },
      backgroundImage: {
        enabled: true, // Enabled - gradient background
        column: 0,
        images: [] as string[],
        currentIndex: 0,
        quadrant: 'middle' as 'top' | 'middle' | 'bottom',
      },
      g1Image: {
        enabled: true, // Enabled - overlay effect
        column: 0,
        images: [] as string[],
        currentIndex: 0,
        quadrant: 'middle' as 'top' | 'middle' | 'bottom',
      },
      imageLibrary: {
        logo: [] as string[],
        omLogo: [] as string[],
        baptism: [] as string[],
        marriage: [] as string[],
        funeral: [] as string[],
        bg: [] as string[],
        g1: [] as string[],
        recordImage: [] as string[],
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
    // churchId is already in the URL path, no need to include in formData

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
                setRecordSettings(prev => ({
                  ...prev,
                  ...data.settings,
                  logo: {
                    ...prev.logo,
                    ...(data.settings.logo || {}),
                  },
                  calendar: {
                    ...prev.calendar,
                    ...(data.settings.calendar || {}),
                  },
                  omLogo: {
                    ...prev.omLogo,
                    ...(data.settings.omLogo || {}),
                  },
                  headerText: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#4C1D95',
                    ...(data.settings.headerText || {}),
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
            // Merge loaded settings with defaults to ensure all properties exist
            setRecordSettings(prev => ({
              ...prev,
              ...data.settings,
              logo: {
                ...prev.logo,
                ...(data.settings.logo || {}),
              },
              calendar: {
                ...prev.calendar,
                ...(data.settings.calendar || {}),
              },
              omLogo: {
                ...prev.omLogo,
                ...(data.settings.omLogo || {}),
              },
              headerText: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 16,
                fontWeight: 700,
                color: '#4C1D95',
                x: 0,
                y: 0,
                ...(data.settings.headerText || {}),
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
                ...(data.settings.backgroundImage || {}),
              },
              g1Image: {
                enabled: true,
                column: 0,
                images: [],
                currentIndex: 0,
                ...(data.settings.g1Image || {}),
              },
              imageLibrary: {
                logo: [],
                omLogo: [],
                baptism: [],
                marriage: [],
                funeral: [],
                bg: [],
                g1: [],
                ...(data.settings.imageLibrary || {}),
              },
              currentImageIndex: {
                logo: 0,
                omLogo: 0,
                baptism: 0,
                marriage: 0,
                funeral: 0,
                bg: 0,
                g1: 0,
                ...(data.settings.currentImageIndex || {}),
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
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      <Card sx={{ bgcolor: theme.palette.background.paper }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon color="primary" />
              Record Table Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure database mappings and record display settings for church ID {churchId}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab 
                icon={<StorageIcon />} 
                iconPosition="start"
                label="Database → Table Mapping" 
                sx={{ textTransform: 'none', minHeight: 64 }}
              />
              <Tab 
                icon={<SettingsIcon />} 
                iconPosition="start"
                label="Record Settings" 
                sx={{ textTransform: 'none', minHeight: 64 }}
              />
              <Tab 
                icon={<PaletteIcon />} 
                iconPosition="start"
                label="Theme Studio" 
                sx={{ textTransform: 'none', minHeight: 64 }}
              />
              <Tab 
                icon={<SettingsIcon />} 
                iconPosition="start"
                label="UI Theme" 
                sx={{ textTransform: 'none', minHeight: 64 }}
              />
            </Tabs>
          </Box>

          {/* Tab Panel 0: Database → Table Mapping */}
          {activeTab === 0 && (
            <Box>

          {/* Table Selection and Reload */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center" flexWrap="wrap">
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Select Table</InputLabel>
              <Select
                value={tableName}
                onChange={(e) => {
                  const newTableName = e.target.value;
                  setTableName(newTableName);
                  // Update URL to keep it in sync
                  const newSearchParams = new URLSearchParams(searchParams);
                  newSearchParams.set('table', newTableName);
                  setSearchParams(newSearchParams, { replace: true });
                }}
                label="Select Table"
                disabled={loading || saving}
              >
                <MenuItem value="baptism_records">baptism_records</MenuItem>
                <MenuItem value="marriage_records">marriage_records</MenuItem>
                <MenuItem value="funeral_records">funeral_records</MenuItem>
                <MenuItem value="members">members</MenuItem>
                <MenuItem value="families">families</MenuItem>
                <MenuItem value="donations">donations</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={loadColumns}
              disabled={loading || saving}
            >
              Reload Columns
            </Button>

            {/* Export to Template Button */}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Language</InputLabel>
              <Select
                value={exportLanguage}
                onChange={(e) => setExportLanguage(e.target.value)}
                label="Language"
                disabled={loading || saving || exporting}
              >
                <MenuItem value="en">English (en)</MenuItem>
                <MenuItem value="gr">Greek (gr)</MenuItem>
                <MenuItem value="ru">Russian (ru)</MenuItem>
                <MenuItem value="ro">Romanian (ro)</MenuItem>
                <MenuItem value="ka">Georgian (ka)</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={() => setExportDialogOpen(true)}
              disabled={loading || saving || exporting || rows.length === 0}
            >
              Export to Template
            </Button>
          </Stack>

          {/* Warning Banner for Export */}
          <Alert severity="warning" sx={{ mb: 2, mt: 2 }}>
            <Typography variant="body2">
              <strong>Export to Template:</strong> This exports the current table schema and field mapper configuration 
              into a <strong>global template</strong> that will be available to all churches. Only use this for 
              standardized, production-ready configurations. Church-specific customizations should not be exported.
            </Typography>
          </Alert>

          {/* Status Messages */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* Loading State */}
          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading columns...</Typography>
            </Box>
          )}

          {/* Mapping Table */}
          {!loading && rows.length > 0 && (
            <>
              {/* Sort Settings Section */}
              <Card variant="outlined" sx={{ mb: 3, p: 2, bgcolor: theme.palette.background.paper }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SortIcon color="primary" />
                  Default Sort Settings
                </Typography>
                <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Default Sort Field</InputLabel>
                    <Select
                      value={defaultSortField}
                      onChange={(e) => setDefaultSortField(e.target.value)}
                      label="Default Sort Field"
                      disabled={saving}
                    >
                      <MenuItem value="">
                        <em>No default sort</em>
                      </MenuItem>
                      {rows.filter(r => r.is_visible && r.is_sortable).map((r) => (
                        <MenuItem key={r.column_name} value={r.column_name}>
                          {r.new_name || r.column_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {defaultSortField && (
                    <FormControl component="fieldset">
                      <RadioGroup
                        row
                        value={defaultSortDirection}
                        onChange={(e) => setDefaultSortDirection(e.target.value as 'asc' | 'desc')}
                      >
                        <FormControlLabel
                          value="asc"
                          control={<Radio size="small" />}
                          label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ArrowUpIcon fontSize="small" /> Ascending</Box>}
                          disabled={saving}
                        />
                        <FormControlLabel
                          value="desc"
                          control={<Radio size="small" />}
                          label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ArrowDownIcon fontSize="small" /> Descending</Box>}
                          disabled={saving}
                        />
                      </RadioGroup>
                    </FormControl>
                  )}
                </Stack>
              </Card>

              {/* Live Preview */}
              <Card variant="outlined" sx={{ mb: 3, p: 3, bgcolor: theme.palette.background.paper }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Live Preview - {tableName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Double-click any column header to configure Visible, Sortable, and Default Sort settings.
                </Typography>
                <Box
                  sx={{
                    border: `2px dashed ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 2,
                    bgcolor: theme.palette.background.paper,
                    overflow: 'auto',
                    maxHeight: 400,
                  }}
                >
                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                          {rows.filter(r => r.is_visible).map((row) => {
                            const fullRow = rows.find(r => r.column_name === row.column_name);
                            return (
                              <TableCell
                                key={row.column_name}
                                onDoubleClick={() => {
                                  setConfiguringColumn(row.column_name);
                                }}
                                sx={{
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  '&:hover': {
                                    bgcolor: 'action.hover',
                                  },
                                }}
                              >
                                <Tooltip title="Double-click to configure">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                      {fullRow?.new_name || row.column_name}
                                    </Typography>
                                    {fullRow?.is_sortable && <SortIcon fontSize="small" color="action" />}
                                    {defaultSortField === row.column_name && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {defaultSortDirection === 'asc' ? <ArrowUpIcon fontSize="small" color="primary" /> : <ArrowDownIcon fontSize="small" color="primary" />}
                                      </Box>
                                    )}
                                  </Box>
                                </Tooltip>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          let previewData: any[] = [];
                          let columnMap: Record<string, string> = {};
                          
                          if (tableName === 'baptism_records') {
                            previewData = BAPTISM_RECORDS_PREVIEW;
                            columnMap = {
                              'id': 'id',
                              'first_name': 'first_name',
                              'last_name': 'last_name',
                              'birth_date': 'birth_date',
                              'reception_date': 'reception_date',
                              'birthplace': 'birthplace',
                              'entry_type': 'entry_type',
                              'sponsors': 'sponsors',
                              'parents': 'parents',
                              'clergy': 'clergy',
                            };
                          } else if (tableName === 'marriage_records') {
                            previewData = MARRIAGE_RECORDS_PREVIEW;
                            columnMap = {
                              'id': 'id',
                              'married_date_name': 'married_date_name',
                              'last_name': 'last_name',
                              'parents_groom': 'parents_groom',
                              'parents': 'parents',
                              'witnesses': 'witnesses',
                              'marriage_license': 'marriage_license',
                              'clergy': 'clergy',
                            };
                          } else if (tableName === 'funeral_records') {
                            previewData = FUNERAL_RECORDS_PREVIEW;
                            columnMap = {
                              'id': 'id',
                              'date_of_deceased': 'date_of_deceased',
                              'date_of_burial': 'date_of_burial',
                              'first_name': 'first_name',
                              'last_name': 'last_name',
                              'age': 'age',
                              'clergy': 'clergy',
                              'burial_location': 'burial_location',
                            };
                          }
                          
                          if (previewData.length === 0) {
                            // Fallback to sample data for other tables
                            return [1, 2, 3].map((idx) => (
                              <TableRow key={idx}>
                                {rows.filter(r => r.is_visible).map((row) => (
                                  <TableCell key={row.column_name}>
                                    <Typography variant="body2" color="text.secondary">
                                      Sample {row.new_name || row.column_name}
                                    </Typography>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ));
                          }
                          
                          return previewData.map((rowData) => (
                            <TableRow key={rowData.id}>
                              {rows.filter(r => r.is_visible).map((row) => {
                                const dataKey = columnMap[row.column_name];
                                const cellValue = dataKey ? rowData[dataKey] : '';
                                return (
                                  <TableCell key={row.column_name}>
                                    <Typography variant="body2" color="text.secondary">
                                      {cellValue || '-'}
                                    </Typography>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Card>

              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.background.paper }}>
                      <TableCell><Typography variant="subtitle2" fontWeight="bold">Column Name</Typography></TableCell>
                      <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Column #</Typography></TableCell>
                      <TableCell><Typography variant="subtitle2" fontWeight="bold">New Column Name</Typography></TableCell>
                      <TableCell align="center">
                        <Tooltip title="Show/hide this column in data grids">
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <VisibilityIcon fontSize="small" /> Visible
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Allow sorting by this column">
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <SortIcon fontSize="small" /> Sortable
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Set as default sort field">
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <SortIcon fontSize="small" color="primary" /> Default Sort
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.column_name} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'text.primary' }}>
                            {row.column_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">{row.ordinal_position}</Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth size="small" variant="outlined" value={row.new_name}
                            onChange={(e) => updateNewName(row.column_name, e.target.value)}
                            placeholder={`Display name for ${row.column_name}`}
                            disabled={saving} sx={{ minWidth: 200 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={row.is_visible}
                            onChange={() => toggleColumnVisibility(row.column_name)}
                            disabled={saving}
                            color="primary" icon={<VisibilityOffIcon />} checkedIcon={<VisibilityIcon />}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={row.is_sortable}
                            onChange={() => toggleColumnSortable(row.column_name)}
                            disabled={saving || !row.is_visible}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Radio
                            checked={defaultSortField === row.column_name}
                            onChange={() => setDefaultSortField(row.column_name)}
                            disabled={saving || !row.is_visible || !row.is_sortable}
                            color="primary" size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Stats Summary */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip icon={<VisibilityIcon />} label={`${rows.filter(r => r.is_visible).length} visible columns`} color="primary" variant="outlined" />
                  <Chip icon={<SortIcon />} label={`${rows.filter(r => r.is_sortable && r.is_visible).length} sortable columns`} color="secondary" variant="outlined" />
                  {defaultSortField && (
                    <Chip
                      icon={defaultSortDirection === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                      label={`Default: ${rows.find(r => r.column_name === defaultSortField)?.new_name || defaultSortField} (${defaultSortDirection.toUpperCase()})`}
                      color="success"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* No Columns Message */}
          {!loading && rows.length === 0 && !error && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No columns found for table "{tableName}". The table may not exist or be empty.
            </Alert>
          )}

              {/* Column Configuration Dialog */}
              {configuringColumn && (() => {
                const column = rows.find(r => r.column_name === configuringColumn);
                if (!column) return null;
                return (
                  <Dialog open={!!configuringColumn} onClose={() => setConfiguringColumn(null)} maxWidth="sm" fullWidth>
                    <DialogTitle>
                      Configure Column: {column.column_name}
                    </DialogTitle>
                    <DialogContent>
                      <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField
                          fullWidth
                          label="Display Name"
                          value={column.new_name}
                          onChange={(e) => updateNewName(column.column_name, e.target.value)}
                          placeholder={`Display name for ${column.column_name}`}
                          disabled={saving}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={column.is_visible}
                              onChange={() => toggleColumnVisibility(column.column_name)}
                              disabled={saving}
                            />
                          }
                          label="Visible"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={column.is_sortable}
                              onChange={() => toggleColumnSortable(column.column_name)}
                              disabled={saving || !column.is_visible}
                            />
                          }
                          label="Sortable"
                        />
                        <FormControl>
                          <InputLabel>Default Sort</InputLabel>
                          <Select
                            value={defaultSortField === column.column_name ? 'yes' : 'no'}
                            onChange={(e) => {
                              if (e.target.value === 'yes') {
                                setDefaultSortField(column.column_name);
                              } else {
                                setDefaultSortField('');
                              }
                            }}
                            label="Default Sort"
                            disabled={saving || !column.is_visible || !column.is_sortable}
                          >
                            <MenuItem value="no">No</MenuItem>
                            <MenuItem value="yes">Yes</MenuItem>
                          </Select>
                        </FormControl>
                        {defaultSortField === column.column_name && (
                          <FormControl component="fieldset">
                            <RadioGroup
                              row
                              value={defaultSortDirection}
                              onChange={(e) => setDefaultSortDirection(e.target.value as 'asc' | 'desc')}
                            >
                              <FormControlLabel
                                value="asc"
                                control={<Radio size="small" />}
                                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ArrowUpIcon fontSize="small" /> Ascending</Box>}
                                disabled={saving}
                              />
                              <FormControlLabel
                                value="desc"
                                control={<Radio size="small" />}
                                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ArrowDownIcon fontSize="small" /> Descending</Box>}
                                disabled={saving}
                              />
                            </RadioGroup>
                          </FormControl>
                        )}
                      </Stack>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setConfiguringColumn(null)}>Close</Button>
                    </DialogActions>
                  </Dialog>
                );
              })()}

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel} disabled={saving}>Cancel</Button>
                <Button variant="contained" startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} onClick={handleSave} disabled={saving || loading || rows.length === 0}>
                  {saving ? 'Saving...' : 'Save Mapping'}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Tab Panel 1: Record Settings */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon color="primary" />
                Header Display Configuration
              </Typography>

              {/* Status Messages */}
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              {/* Upload Image Button and Reset Defaults */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    disabled={saving}
                  >
                    Upload Image to Library
                    <input
                      type="file"
                      hidden
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file type
                          const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                          if (!validTypes.includes(file.type.toLowerCase())) {
                            setError('Please upload a .jpg or .png image file');
                            return;
                          }
                          
                          // Reset error state
                          setError(null);
                          setSuccess(null);
                          setSaving(true);
                          
                          try {
                            // Upload to image library using a supported type
                            // Using 'baptism' as the type since 'recordImage' might not be supported by backend
                            console.log('Starting image upload:', { churchId, type: 'baptism', fileName: file.name, fileSize: file.size, fileType: file.type });
                            await handleImageUpload('baptism', file);
                            setSuccess('Image uploaded successfully to library!');
                          } catch (err: any) {
                            console.error('Error uploading image:', err);
                            console.error('Error details:', {
                              message: err?.message,
                              stack: err?.stack,
                              name: err?.name
                            });
                            setError(err?.message || 'Failed to upload image. Please try again.');
                          } finally {
                            setSaving(false);
                            // Reset the input so the same file can be selected again
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<RefreshIcon />}
                    onClick={handleResetDefaults}
                    disabled={saving}
                  >
                    Reset Defaults
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Upload .jpg or .png images to your image library
                </Typography>
              </Box>

              {/* Live Preview */}
              <RecordHeaderPreview
                churchId={churchId}
                recordSettings={recordSettings}
                setRecordSettings={setRecordSettings}
                onImageUpload={handleImageUpload}
                recordType={
                  urlTableName === 'baptism_records' ? 'baptism' :
                  urlTableName === 'marriage_records' ? 'marriage' :
                  urlTableName === 'funeral_records' ? 'funeral' : 'baptism'
                }
                churchName={churchName || `Church ${churchId}`}
              />

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button 
                  variant="outlined" 
                  startIcon={<ArrowBackIcon />} 
                  onClick={handleBackToRecords}
                  disabled={saving}
                >
                  Back to Records
                </Button>
                <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} 
                  onClick={handleSaveRecordSettings} 
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Record Settings'}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Tab Panel 2: Theme Studio */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaletteIcon color="primary" />
                Theme Studio
              </Typography>

              {/* Status Messages */}
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              {/* Live Preview */}
              <Card variant="outlined" sx={{ mb: 3, p: 3, bgcolor: theme.palette.background.paper }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Live Preview
                    </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Double-click any table element to configure its color.
                        </Typography>
                <Box
                  sx={{
                    border: `2px dashed ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 2,
                    bgcolor: theme.palette.background.paper,
                    overflow: 'auto',
                  }}
                >
                  {(() => {
                    // Get current theme tokens for preview
                    const currentState = enhancedTableStore.getState();
                    const currentThemeKey = currentState.liturgicalTheme;
                    let previewTokens: ThemeTokens;
                    
                    if (previewTheme) {
                      previewTokens = previewTheme;
                    } else if (currentThemeKey && THEME_MAP[currentThemeKey as LiturgicalThemeKey]) {
                      previewTokens = THEME_MAP[currentThemeKey as LiturgicalThemeKey];
                    } else if (currentState.customThemes && currentThemeKey && currentState.customThemes[currentThemeKey]) {
                      previewTokens = currentState.customThemes[currentThemeKey];
                    } else {
                      previewTokens = {
                        headerBg: '#1976d2',
                        headerText: '#ffffff',
                        rowOddBg: '#fafafa',
                        rowEvenBg: '#ffffff',
                        border: '#e0e0e0',
                        accent: '#1976d2',
                        cellText: '#212121',
                      };
                    }

                    const handleColorDoubleClick = (colorKey: keyof ThemeTokens) => {
                      setConfiguringColorKey(colorKey);
                      setColorConfigDialogOpen(true);
                    };

                            return (
                      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell
                                onDoubleClick={() => handleColorDoubleClick('headerBg')}
                                sx={{
                                  backgroundColor: previewTokens.headerBg,
                                  color: previewTokens.headerText,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  fontWeight: 'bold',
                                  '&:hover': {
                                    outline: '2px solid #1976d2',
                                    outlineOffset: '-2px',
                                  },
                                }}
                              >
                                <Tooltip title="Double-click to configure Header Background">
                                  ID
                                </Tooltip>
                              </TableCell>
                              <TableCell
                                onDoubleClick={() => handleColorDoubleClick('headerBg')}
                              sx={{
                                  backgroundColor: previewTokens.headerBg,
                                  color: previewTokens.headerText,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  fontWeight: 'bold',
                                  '&:hover': {
                                    outline: '2px solid #1976d2',
                                    outlineOffset: '-2px',
                                  },
                                }}
                              >
                                <Tooltip title="Double-click to configure Header Background">
                                  First Name
                                </Tooltip>
                              </TableCell>
                              <TableCell
                                onDoubleClick={() => handleColorDoubleClick('headerBg')}
                                sx={{
                                  backgroundColor: previewTokens.headerBg,
                                  color: previewTokens.headerText,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  fontWeight: 'bold',
                                  '&:hover': {
                                    outline: '2px solid #1976d2',
                                    outlineOffset: '-2px',
                                  },
                                }}
                              >
                                <Tooltip title="Double-click to configure Header Background">
                                  Last Name
                                </Tooltip>
                              </TableCell>
                              <TableCell
                                onDoubleClick={() => handleColorDoubleClick('headerBg')}
                                sx={{
                                  backgroundColor: previewTokens.headerBg,
                                  color: previewTokens.headerText,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  fontWeight: 'bold',
                                  '&:hover': {
                                    outline: '2px solid #1976d2',
                                    outlineOffset: '-2px',
                                  },
                                }}
                              >
                                <Tooltip title="Double-click to configure Header Background">
                                  Date
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[1, 2, 3, 4, 5].map((row, idx) => (
                              <TableRow
                                key={row}
                                sx={{
                                  backgroundColor: idx % 2 === 0 ? previewTokens.rowEvenBg : previewTokens.rowOddBg,
                                  '& .MuiTableCell-root': {
                                    color: previewTokens.cellText,
                                    borderColor: previewTokens.border,
                                    cursor: 'pointer',
                                    '&:hover': {
                                      outline: '2px solid #1976d2',
                                      outlineOffset: '-2px',
                                    },
                                  },
                                }}
                                onDoubleClick={(e) => {
                                  const target = e.target as HTMLElement;
                                  if (target.tagName === 'TD') {
                                    handleColorDoubleClick(idx % 2 === 0 ? 'rowEvenBg' : 'rowOddBg');
                                  }
                                }}
                              >
                                <TableCell onDoubleClick={() => handleColorDoubleClick('cellText')}>
                                  {row}
                                </TableCell>
                                <TableCell onDoubleClick={() => handleColorDoubleClick('cellText')}>
                                  Sample {row}
                                </TableCell>
                                <TableCell onDoubleClick={() => handleColorDoubleClick('cellText')}>
                                  Data {row}
                                </TableCell>
                                <TableCell onDoubleClick={() => handleColorDoubleClick('cellText')}>
                                  {new Date().toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    );
                  })()}
            </Box>
              </Card>

              <Grid container spacing={3}>
                {/* Left Column - Theme Management */}
                <Grid item xs={12} md={8}>
                  <Card variant="outlined" sx={{ mb: 3, p: 3, bgcolor: theme.palette.background.paper }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Theme Management
                    </Typography>
                    
                    <Stack spacing={3}>
                      {/* Global vs Church-Specific Toggle */}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={themeStudio.isGlobal}
                            onChange={(e) => {
                              setThemeStudio(prev => ({ ...prev, isGlobal: e.target.checked }));
                              // Reload themes when switching
                              loadThemes(e.target.checked);
                            }}
                          />
                        }
                        label="Global Theme (applies to all churches unless overridden)"
                      />

                      {!themeStudio.isGlobal && (
                        <Alert severity="info">
                          Church-specific themes will override global themes for this church only.
                        </Alert>
                      )}

                      {/* Theme List */}
                      <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {themeStudio.isGlobal ? 'Global Themes' : 'Church-Specific Themes'}
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setEditingTheme({
                                name: '',
                                description: '',
                                tokens: {
                                  headerBg: '#1976d2',
                                  headerText: '#ffffff',
                                  rowOddBg: '#fafafa',
                                  rowEvenBg: '#ffffff',
                                  border: '#e0e0e0',
                                  accent: '#1976d2',
                                  cellText: '#212121',
                                },
                              });
                              setThemeDialogOpen(true);
                            }}
                          >
                            Add Theme
                          </Button>
                        </Typography>
                        <Stack spacing={1} sx={{ mt: 2 }}>
                          {Object.entries(themeStudio.themes).map(([key, theme]) => (
                            <Card key={key} variant="outlined" sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {theme.name || key}
                                  </Typography>
                                  {theme.description && (
                                    <Typography variant="body2" color="text.secondary">
                                      {theme.description}
                                    </Typography>
                                  )}
                                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                    <Box sx={{ width: 30, height: 20, bgcolor: theme.headerBg, border: '1px solid #ccc', borderRadius: 1 }} />
                                    <Box sx={{ width: 30, height: 20, bgcolor: theme.accent, border: '1px solid #ccc', borderRadius: 1 }} />
                                    <Box sx={{ width: 30, height: 20, bgcolor: theme.rowOddBg, border: '1px solid #ccc', borderRadius: 1 }} />
                                    <Box sx={{ width: 30, height: 20, bgcolor: theme.rowEvenBg, border: '1px solid #ccc', borderRadius: 1 }} />
                                  </Box>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      setEditingTheme({ name: key, description: theme.description || '', tokens: theme });
                                      setThemeDialogOpen(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={async () => {
                                      if (window.confirm(`Delete theme "${theme.name || key}"?`)) {
                                        const newThemes = { ...themeStudio.themes };
                                        delete newThemes[key];
                                        setThemeStudio(prev => ({ ...prev, themes: newThemes }));
                                        await saveThemes();
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </Stack>
                            </Card>
                          ))}
                          {Object.keys(themeStudio.themes).length === 0 && (
                            <Alert severity="info">
                              No {themeStudio.isGlobal ? 'global' : 'church-specific'} themes defined. Click "Add Theme" to create one.
                            </Alert>
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>

                {/* Right Column - Pre-defined Themes */}
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ mb: 3, p: 3, bgcolor: theme.palette.background.paper }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Pre-defined Liturgical Themes
                    </Typography>
                    <Stack spacing={2}>
                      {Object.entries(THEME_MAP).map(([key, tokens]) => (
                        <Card
                          key={key}
                          variant="outlined"
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            border: themeStudio.selectedTheme === key ? '2px solid primary.main' : '1px solid',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                          onClick={() => {
                            // Check if theme already exists in custom themes, if not add it
                            if (!themeStudio.themes[key]) {
                              const themeName = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                              setThemeStudio(prev => ({
                                ...prev,
                                themes: {
                                  ...prev.themes,
                                  [key]: {
                                    ...tokens,
                                    name: themeName,
                                    description: `Pre-defined ${themeName} theme`,
                                  },
                                },
                              }));
                            }
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight="bold">
                            {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                            <Box sx={{ width: 30, height: 20, bgcolor: tokens.headerBg, border: '1px solid #ccc', borderRadius: 1 }} />
                            <Box sx={{ width: 30, height: 20, bgcolor: tokens.accent, border: '1px solid #ccc', borderRadius: 1 }} />
                            <Box sx={{ width: 30, height: 20, bgcolor: tokens.rowOddBg, border: '1px solid #ccc', borderRadius: 1 }} />
                            <Box sx={{ width: 30, height: 20, bgcolor: tokens.rowEvenBg, border: '1px solid #ccc', borderRadius: 1 }} />
                          </Box>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button size="small" variant="outlined" onClick={(e) => {
                              e.stopPropagation();
                              const themeName = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                              setEditingTheme({
                                name: key, // Use the key as the name to allow editing default themes
                                description: `Pre-defined ${themeName} theme`,
                                tokens: tokens,
                                isPreDefined: true, // Mark as pre-defined theme
                                originalKey: key, // Store original key
                              });
                              setThemeDialogOpen(true);
                            }}>
                              Edit
                            </Button>
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  </Card>
                </Grid>
              </Grid>

              {/* Theme Editor Dialog */}
              <Dialog open={themeDialogOpen} onClose={() => setThemeDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                  {editingTheme?.name ? `Edit Theme: ${editingTheme.name}` : 'Create New Theme'}
                </DialogTitle>
                <DialogContent>
                  <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                      label="Theme Name"
                      value={editingTheme?.name || ''}
                      onChange={(e) => setEditingTheme(prev => prev ? { ...prev, name: e.target.value } : null)}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Description"
                      value={editingTheme?.description || ''}
                      onChange={(e) => setEditingTheme(prev => prev ? { ...prev, description: e.target.value } : null)}
                      fullWidth
                      multiline
                      rows={2}
                    />
                    <Divider />
                    <Typography variant="subtitle2">Theme Colors</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Header Background"
                          type="color"
                          value={editingTheme?.tokens.headerBg || '#1976d2'}
                          onChange={(e) => setEditingTheme(prev => prev ? {
                            ...prev,
                            tokens: { ...prev.tokens, headerBg: e.target.value }
                          } : null)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Header Text"
                          type="color"
                          value={editingTheme?.tokens.headerText || '#ffffff'}
                          onChange={(e) => setEditingTheme(prev => prev ? {
                            ...prev,
                            tokens: { ...prev.tokens, headerText: e.target.value }
                          } : null)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Row Odd Background"
                          type="color"
                          value={editingTheme?.tokens.rowOddBg || '#fafafa'}
                          onChange={(e) => setEditingTheme(prev => prev ? {
                            ...prev,
                            tokens: { ...prev.tokens, rowOddBg: e.target.value }
                          } : null)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Row Even Background"
                          type="color"
                          value={editingTheme?.tokens.rowEvenBg || '#ffffff'}
                          onChange={(e) => setEditingTheme(prev => prev ? {
                            ...prev,
                            tokens: { ...prev.tokens, rowEvenBg: e.target.value }
                          } : null)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Border Color"
                          type="color"
                          value={editingTheme?.tokens.border || '#e0e0e0'}
                          onChange={(e) => setEditingTheme(prev => prev ? {
                            ...prev,
                            tokens: { ...prev.tokens, border: e.target.value }
                          } : null)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Accent Color"
                          type="color"
                          value={editingTheme?.tokens.accent || '#1976d2'}
                          onChange={(e) => setEditingTheme(prev => prev ? {
                            ...prev,
                            tokens: { ...prev.tokens, accent: e.target.value }
                          } : null)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Cell Text Color"
                          type="color"
                          value={editingTheme?.tokens.cellText || '#212121'}
                          onChange={(e) => setEditingTheme(prev => prev ? {
                            ...prev,
                            tokens: { ...prev.tokens, cellText: e.target.value }
                          } : null)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                    <Divider />
                    <Typography variant="subtitle2">Preview</Typography>
                    {editingTheme && (
                      <Box>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Box sx={{ bgcolor: editingTheme.tokens.headerBg, color: editingTheme.tokens.headerText, p: 2, borderRadius: 1, textAlign: 'center' }}>
                              Header
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ bgcolor: editingTheme.tokens.accent, color: editingTheme.tokens.cellText, p: 2, borderRadius: 1, textAlign: 'center' }}>
                              Accent
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ bgcolor: editingTheme.tokens.rowOddBg, color: editingTheme.tokens.cellText, p: 2, border: `1px solid ${editingTheme.tokens.border}`, borderRadius: 1, textAlign: 'center' }}>
                              Row Odd
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ bgcolor: editingTheme.tokens.rowEvenBg, color: editingTheme.tokens.cellText, p: 2, border: `1px solid ${editingTheme.tokens.border}`, borderRadius: 1, textAlign: 'center' }}>
                              Row Even
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => {
                    setThemeDialogOpen(false);
                    setEditingTheme(null);
                    setSaveAsDialogOpen(false);
                    setNewThemeName('');
                  }}>Cancel</Button>
                  
                  {/* Update Template button - only show for pre-defined themes */}
                  {editingTheme?.isPreDefined && editingTheme.originalKey && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={async () => {
                        if (editingTheme && editingTheme.originalKey && editingTheme.originalKey in THEME_MAP) {
                          // Update the pre-defined theme in THEME_MAP
                          enhancedTableStore.updatePreDefinedTheme(
                            editingTheme.originalKey as LiturgicalThemeKey,
                            editingTheme.tokens
                          );
                          
                          // Also save to custom themes for persistence
                          const newThemes = {
                            ...themeStudio.themes,
                            [editingTheme.originalKey]: {
                              ...editingTheme.tokens,
                              name: editingTheme.originalKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                              description: editingTheme.description,
                            },
                          };
                          setThemeStudio(prev => ({ ...prev, themes: newThemes }));
                          await saveThemes();
                          setSuccess(`Template "${editingTheme.originalKey}" updated successfully!`);
                          setThemeDialogOpen(false);
                          setEditingTheme(null);
                        }
                      }}
                      disabled={!editingTheme?.name}
                    >
                      Update Template
                    </Button>
                  )}
                  
                  {/* Save Theme button - prompts for new name */}
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (editingTheme?.isPreDefined) {
                        // For pre-defined themes, open save-as dialog
                        setSaveAsDialogOpen(true);
                      } else {
                        // For custom themes, save directly
                        if (editingTheme && editingTheme.name) {
                          const newThemes = {
                            ...themeStudio.themes,
                            [editingTheme.name]: {
                              ...editingTheme.tokens,
                              name: editingTheme.name,
                              description: editingTheme.description,
                            },
                          };
                          setThemeStudio(prev => ({ ...prev, themes: newThemes }));
                          await saveThemes();
                          setThemeDialogOpen(false);
                          setEditingTheme(null);
                        }
                      }
                    }}
                    disabled={!editingTheme?.name}
                  >
                    {editingTheme?.isPreDefined ? 'Save Theme' : 'Save Theme'}
                  </Button>
                </DialogActions>
                
                {/* Save As Dialog */}
                <Dialog open={saveAsDialogOpen} onClose={() => {
                  setSaveAsDialogOpen(false);
                  setNewThemeName('');
                }}>
                  <DialogTitle>Save Theme As</DialogTitle>
                  <DialogContent>
                    <TextField
                      autoFocus
                      margin="dense"
                      label="New Theme Name"
                      fullWidth
                      variant="outlined"
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="Enter a unique theme name"
                      sx={{ mt: 2 }}
                    />
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => {
                      setSaveAsDialogOpen(false);
                      setNewThemeName('');
                    }}>Cancel</Button>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        if (editingTheme && newThemeName.trim()) {
                          // Check if name already exists
                          if (themeStudio.themes[newThemeName.trim()]) {
                            setError(`Theme "${newThemeName.trim()}" already exists. Please choose a different name.`);
                            return;
                          }
                          
                          const newThemes = {
                            ...themeStudio.themes,
                            [newThemeName.trim()]: {
                              ...editingTheme.tokens,
                              name: newThemeName.trim(),
                              description: editingTheme.description || `Custom theme: ${newThemeName.trim()}`,
                            },
                          };
                          setThemeStudio(prev => ({ ...prev, themes: newThemes }));
                          await saveThemes();
                          setSuccess(`Theme "${newThemeName.trim()}" saved successfully!`);
                          setThemeDialogOpen(false);
                          setSaveAsDialogOpen(false);
                          setEditingTheme(null);
                          setNewThemeName('');
                        }
                      }}
                      disabled={!newThemeName.trim()}
                    >
                      Save
                    </Button>
                  </DialogActions>
                </Dialog>
              </Dialog>

              {/* Color Configuration Dialog */}
              <Dialog open={colorConfigDialogOpen} onClose={() => setColorConfigDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                  Configure {configuringColorKey === 'headerBg' ? 'Header Background' :
                            configuringColorKey === 'headerText' ? 'Header Text' :
                            configuringColorKey === 'rowOddBg' ? 'Odd Row Background' :
                            configuringColorKey === 'rowEvenBg' ? 'Even Row Background' :
                            configuringColorKey === 'border' ? 'Border' :
                            configuringColorKey === 'accent' ? 'Accent' :
                            configuringColorKey === 'cellText' ? 'Cell Text' : 'Color'}
                </DialogTitle>
                <DialogContent>
                  {configuringColorKey && (() => {
                    const currentState = enhancedTableStore.getState();
                    const currentThemeKey = currentState.liturgicalTheme;
                    let currentTokens: ThemeTokens;
                    
                    if (previewTheme) {
                      currentTokens = previewTheme;
                    } else if (currentThemeKey && THEME_MAP[currentThemeKey as LiturgicalThemeKey]) {
                      currentTokens = THEME_MAP[currentThemeKey as LiturgicalThemeKey];
                    } else if (currentState.customThemes && currentThemeKey && currentState.customThemes[currentThemeKey]) {
                      currentTokens = currentState.customThemes[currentThemeKey];
                    } else {
                      currentTokens = {
                        headerBg: '#1976d2',
                        headerText: '#ffffff',
                        rowOddBg: '#fafafa',
                        rowEvenBg: '#ffffff',
                        border: '#e0e0e0',
                        accent: '#1976d2',
                        cellText: '#212121',
                      };
                    }

                    const currentColor = currentTokens[configuringColorKey];

                    return (
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <TextField
                          label="Color"
                          type="color"
                          value={currentColor}
                          onChange={(e) => {
                            const newTokens = { ...currentTokens, [configuringColorKey]: e.target.value };
                            setPreviewTheme(newTokens);
                            
                            // Update the current theme in the store if it's a custom theme
                            if (currentThemeKey && currentState.customThemes && currentState.customThemes[currentThemeKey]) {
                              const updatedThemes = {
                                ...currentState.customThemes,
                                [currentThemeKey]: {
                                  ...currentState.customThemes[currentThemeKey],
                                  ...newTokens,
                                },
                              };
                              enhancedTableStore.setCustomThemes(updatedThemes);
                              
                              // Also update in themeStudio
                              setThemeStudio(prev => ({
                                ...prev,
                                themes: {
                                  ...prev.themes,
                                  [currentThemeKey]: {
                                    ...prev.themes[currentThemeKey],
                                    ...newTokens,
                                  },
                                },
                              }));
                            }
                          }}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                        <Box sx={{ p: 2, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Preview: This color will be applied to {configuringColorKey === 'headerBg' ? 'the table header background' :
                                      configuringColorKey === 'headerText' ? 'the table header text' :
                                      configuringColorKey === 'rowOddBg' ? 'odd-numbered table rows' :
                                      configuringColorKey === 'rowEvenBg' ? 'even-numbered table rows' :
                                      configuringColorKey === 'border' ? 'table borders' :
                                      configuringColorKey === 'accent' ? 'accent elements' :
                                      'table cell text'}.
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })()}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => {
                    setColorConfigDialogOpen(false);
                    setConfiguringColorKey(null);
                  }}>
                    Close
                  </Button>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (configuringColorKey && previewTheme) {
                        const currentState = enhancedTableStore.getState();
                        const currentThemeKey = currentState.liturgicalTheme;
                        
                        // Save the preview theme to the actual theme
                        if (currentThemeKey) {
                          if (currentState.customThemes && currentState.customThemes[currentThemeKey]) {
                            // Update custom theme
                            const updatedThemes = {
                              ...currentState.customThemes,
                              [currentThemeKey]: {
                                ...currentState.customThemes[currentThemeKey],
                                ...previewTheme,
                              },
                            };
                            enhancedTableStore.setCustomThemes(updatedThemes);
                            
                            // Update in themeStudio and save
                            setThemeStudio(prev => ({
                              ...prev,
                              themes: {
                                ...prev.themes,
                                [currentThemeKey]: {
                                  ...prev.themes[currentThemeKey],
                                  ...previewTheme,
                                },
                              },
                            }));
                            await saveThemes();
                          } else if (THEME_MAP[currentThemeKey as LiturgicalThemeKey]) {
                            // Update pre-defined theme
                            enhancedTableStore.updatePreDefinedTheme(
                              currentThemeKey as LiturgicalThemeKey,
                              previewTheme
                            );
                          }
                        }
                        
                        setColorConfigDialogOpen(false);
                        setConfiguringColorKey(null);
                        setPreviewTheme(null);
                        setSuccess('Theme color updated successfully!');
                      }
                    }}
                  >
                    Apply
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} 
                  onClick={async () => {
                    await saveThemes();
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Themes'}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Tab Panel 3: UI Theme */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon color="primary" />
                UI Theme - Action Buttons Configuration
              </Typography>

              {/* Status Messages */}
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Customize the appearance of the four action buttons: Switch to AG, Field Settings, Add Records, and Advanced Grid.
              </Typography>

              {/* Live Preview */}
              <Card variant="outlined" sx={{ mb: 3, p: 3, bgcolor: theme.palette.background.paper }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Live Preview
                </Typography>
                <Box
                  key={JSON.stringify(uiThemeState.actionButtonConfigs)}
                  sx={{
                    border: `2px dashed ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 3,
                    bgcolor: theme.palette.background.paper,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    alignItems: 'center',
                  }}
                >
                  {(() => {
                    const buttonConfigs = uiThemeState.actionButtonConfigs;
                    const searchRecordsConfig = buttonConfigs?.searchRecords;
                    const themeConfig = buttonConfigs?.theme;
                    const recordTableConfigConfig = buttonConfigs?.recordTableConfig;
                    const switchToAGConfig = buttonConfigs?.switchToAG;
                    const fieldSettingsConfig = buttonConfigs?.fieldSettings;
                    const addRecordsConfig = buttonConfigs?.addRecords;
                    const advancedGridConfig = buttonConfigs?.advancedGrid;

                    const renderButton = (buttonKey: string, label: string, icon: React.ReactNode, config: ButtonConfig | undefined, defaultBg: string, defaultHover: string) => (
                      <Tooltip title="Double-click to configure">
                        <Box
                          onDoubleClick={() => setConfiguringButton(buttonKey)}
                          sx={{
                            cursor: 'pointer',
                            outline: configuringButton === buttonKey ? '2px solid #4C1D95' : 'none',
                            outlineOffset: '4px',
                            borderRadius: 1,
                            p: 0.5,
                          }}
                        >
                          {buttonKey === 'searchRecords' ? (
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                minWidth: 220,
                              }}
                            >
                              <Chip 
                                label={label}
                                size="small" 
                                sx={{ 
                                  width: 'fit-content',
                                  backgroundColor: config?.backgroundColor || '#4C1D95',
                                  color: config?.textColor || '#ffffff',
                                  borderRadius: '20px',
                                  fontWeight: 500,
                                  fontSize: config?.fontSize || '0.75rem',
                                  padding: config?.padding || '4px 8px',
                                  '&:hover': {
                                    backgroundColor: config?.hoverColor || '#5a2ba8',
                                  },
                                }}
                              />
                              <TextField
                                placeholder="Search records..."
                                InputProps={{
                                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                                }}
                                size="small"
                                sx={{ minWidth: 220 }}
                                disabled
                              />
                            </Box>
                          ) : buttonKey === 'theme' ? (
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                minWidth: 200,
                              }}
                            >
                              <Chip 
                                label={label}
                                size="small" 
                                sx={{ 
                                  width: 'fit-content',
                                  backgroundColor: config?.backgroundColor || '#4C1D95',
                                  color: config?.textColor || '#ffffff',
                                  borderRadius: '20px',
                                  fontWeight: 500,
                                  fontSize: config?.fontSize || '0.75rem',
                                  padding: config?.padding || '4px 8px',
                                  '&:hover': {
                                    backgroundColor: config?.hoverColor || '#5a2ba8',
                                  },
                                }}
                              />
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={uiThemeState.liturgicalTheme}
                                  disabled
                                  sx={{
                                    borderRadius: 2,
                                    backgroundColor: 'background.paper',
                                  }}
                                >
                                  <MenuItem value={uiThemeState.liturgicalTheme}>
                                    {uiThemeState.liturgicalTheme}
                                  </MenuItem>
                                </Select>
                              </FormControl>
                            </Box>
                          ) : buttonKey === 'recordTableConfig' ? (
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                              }}
                            >
                              <Chip 
                                label={label}
                                size="small" 
                                sx={{ 
                                  width: 'fit-content',
                                  backgroundColor: config?.backgroundColor || '#4C1D95',
                                  color: config?.textColor || '#ffffff',
                                  borderRadius: '20px',
                                  fontWeight: 500,
                                  fontSize: config?.fontSize || '0.75rem',
                                  padding: config?.padding || '4px 8px',
                                  '&:hover': {
                                    backgroundColor: config?.hoverColor || '#5a2ba8',
                                  },
                                }}
                              />
                              <Button
                                variant="outlined"
                                startIcon={<PaletteIcon />}
                                disabled
                                size={config?.size || 'small'}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  borderColor: config?.backgroundColor || 'rgba(76, 29, 149, 0.3)',
                                  color: config?.textColor || '#4C1D95',
                                  padding: config?.padding || '5px 9px',
                                  fontSize: config?.fontSize || '0.75rem',
                                  '&:hover': {
                                    borderColor: config?.hoverColor || '#4C1D95',
                                    backgroundColor: config?.hoverColor ? `${config.hoverColor}15` : 'rgba(76, 29, 149, 0.08)',
                                  },
                                }}
                              >
                                Theme Studio
                              </Button>
                            </Box>
                          ) : (
                            <Button
                              variant="contained"
                              startIcon={icon}
                              size={config?.size || 'small'}
                              disabled
                              sx={{
                                borderRadius: 14,
                                padding: config?.padding || '5px 9px',
                                textTransform: 'none',
                                fontWeight: 600,
                                letterSpacing: 0.2,
                                fontSize: config?.fontSize || '0.75rem',
                                color: config?.textColor || '#fff',
                                background: config?.backgroundColor || defaultBg,
                                boxShadow: '0 6px 16px -6px rgba(25, 118, 210, 0.35)',
                                '&:hover': {
                                  background: config?.hoverColor || defaultHover,
                                },
                                '& .MuiButton-startIcon': { marginRight: 1 },
                              }}
                            >
                              {label}
                            </Button>
                          )}
                        </Box>
                      </Tooltip>
                    );

                    return (
                      <>
                        {/* Search Records */}
                        {renderButton('searchRecords', 'Search Records', <SearchIcon />, searchRecordsConfig, '#4C1D95', '#5a2ba8')}
                        
                        {/* Theme */}
                        {renderButton('theme', 'Theme', <PaletteIcon />, themeConfig, '#4C1D95', '#5a2ba8')}
                        
                        {/* Record Table Configuration */}
                        {renderButton('recordTableConfig', 'Record Table Configuration', <PaletteIcon />, recordTableConfigConfig, '#4C1D95', '#5a2ba8')}

                        {/* Switch to AG Button */}
                        {renderButton('switchToAG', 'Switch to AG', <ViewListIcon />, switchToAGConfig, 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)', 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)')}

                        {/* Field Settings Button */}
                        {renderButton('fieldSettings', 'Field Settings', <SettingsIcon />, fieldSettingsConfig, 'linear-gradient(135deg, #4C1D95 0%, #2E1065 100%)', 'linear-gradient(135deg, #2E1065 0%, #4C1D95 100%)')}

                        {/* Add Records Button */}
                        {renderButton('addRecords', 'Add Records', <AddIcon />, addRecordsConfig, 'linear-gradient(135deg, #4C1D95 0%, #2E1065 100%)', 'linear-gradient(135deg, #2E1065 0%, #4C1D95 100%)')}

                        {/* Advanced Grid Button */}
                        {renderButton('advancedGrid', 'Advanced Grid', <GridViewIcon />, advancedGridConfig, 'linear-gradient(100deg, #4C1D95 0%, #2E1065 50%, #F6C90E 115%)', 'linear-gradient(100deg, #2E1065 0%, #4C1D95 50%, #D4A80A 115%)')}
                      </>
                    );
                  })()}
                </Box>
              </Card>

              {['searchRecords', 'theme', 'recordTableConfig', 'switchToAG', 'fieldSettings', 'addRecords', 'advancedGrid'].map((buttonKey) => {
                const buttonName = buttonKey === 'searchRecords' ? 'Search Records' :
                                  buttonKey === 'theme' ? 'Theme' :
                                  buttonKey === 'recordTableConfig' ? 'Record Table Configuration' :
                                  buttonKey === 'switchToAG' ? 'Switch to AG' :
                                  buttonKey === 'fieldSettings' ? 'Field Settings' :
                                  buttonKey === 'addRecords' ? 'Add Records' : 'Advanced Grid';
                const buttonConfigs = uiThemeState.actionButtonConfigs;
                const config = buttonConfigs?.[buttonKey as keyof typeof buttonConfigs];
                
                return (
                  <Card key={buttonKey} variant="outlined" sx={{ mb: 2, p: 2, bgcolor: theme.palette.background.paper }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                      {buttonName}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Background Color"
                          type="color"
                          value={config?.backgroundColor || ''}
                          onChange={(e) => {
                            enhancedTableStore.setActionButtonConfigs({
                              [buttonKey]: {
                                ...config,
                                backgroundColor: e.target.value,
                              }
                            });
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Hover Color"
                          type="color"
                          value={config?.hoverColor || ''}
                          onChange={(e) => {
                            enhancedTableStore.setActionButtonConfigs({
                              [buttonKey]: {
                                ...config,
                                hoverColor: e.target.value,
                              }
                            });
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Text Color"
                          type="color"
                          value={config?.textColor || ''}
                          onChange={(e) => {
                            enhancedTableStore.setActionButtonConfigs({
                              [buttonKey]: {
                                ...config,
                                textColor: e.target.value,
                              }
                            });
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Button Size</InputLabel>
                          <Select
                            value={config?.size || 'small'}
                            onChange={(e) => {
                              enhancedTableStore.setActionButtonConfigs({
                                [buttonKey]: {
                                  ...config,
                                  size: e.target.value as 'small' | 'medium' | 'large',
                                }
                              });
                            }}
                            label="Button Size"
                          >
                            <MenuItem value="small">Small</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="large">Large</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Padding (e.g., 5px 9px)"
                          value={config?.padding || ''}
                          onChange={(e) => {
                            enhancedTableStore.setActionButtonConfigs({
                              [buttonKey]: {
                                ...config,
                                padding: e.target.value,
                              }
                            });
                          }}
                          placeholder="5px 9px"
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Font Size (e.g., 0.75rem)"
                          value={config?.fontSize || ''}
                          onChange={(e) => {
                            enhancedTableStore.setActionButtonConfigs({
                              [buttonKey]: {
                                ...config,
                                fontSize: e.target.value,
                              }
                            });
                          }}
                          placeholder="0.75rem"
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                );
              })}

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button 
                  variant="contained" 
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} 
                  onClick={async () => {
                    setSaving(true);
                    // Button configs are already saved to localStorage via enhancedTableStore
                    // Simulate save operation
                    await new Promise(resolve => setTimeout(resolve, 500));
                    setSuccess('Actionbar saved successfully!');
                    setTimeout(() => setSuccess(null), 3000);
                    setSaving(false);
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Actionbar'}
                </Button>
              </Stack>

              {/* Quick Configuration Dialog */}
              {configuringButton && (
                <Dialog open={!!configuringButton} onClose={() => setConfiguringButton(null)} maxWidth="sm" fullWidth>
                  <DialogTitle>
                    Configure {configuringButton === 'searchRecords' ? 'Search Records' :
                              configuringButton === 'theme' ? 'Theme' :
                              configuringButton === 'recordTableConfig' ? 'Record Table Configuration' :
                              configuringButton === 'switchToAG' ? 'Switch to AG' :
                              configuringButton === 'fieldSettings' ? 'Field Settings' :
                              configuringButton === 'addRecords' ? 'Add Records' : 'Advanced Grid'}
                  </DialogTitle>
                  <DialogContent>
                    {(() => {
                      const buttonConfigs = uiThemeState.actionButtonConfigs;
                      const config = buttonConfigs?.[configuringButton as keyof typeof buttonConfigs];
                      return (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Background Color"
                              type="color"
                              value={config?.backgroundColor || ''}
                              onChange={(e) => {
                                enhancedTableStore.setActionButtonConfigs({
                                  [configuringButton]: {
                                    ...config,
                                    backgroundColor: e.target.value,
                                  }
                                });
                              }}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Hover Color"
                              type="color"
                              value={config?.hoverColor || ''}
                              onChange={(e) => {
                                enhancedTableStore.setActionButtonConfigs({
                                  [configuringButton]: {
                                    ...config,
                                    hoverColor: e.target.value,
                                  }
                                });
                              }}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Text Color"
                              type="color"
                              value={config?.textColor || ''}
                              onChange={(e) => {
                                enhancedTableStore.setActionButtonConfigs({
                                  [configuringButton]: {
                                    ...config,
                                    textColor: e.target.value,
                                  }
                                });
                              }}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Button Size</InputLabel>
                              <Select
                                value={config?.size || 'small'}
                                onChange={(e) => {
                                  enhancedTableStore.setActionButtonConfigs({
                                    [configuringButton]: {
                                      ...config,
                                      size: e.target.value as 'small' | 'medium' | 'large',
                                    }
                                  });
                                }}
                                label="Button Size"
                              >
                                <MenuItem value="small">Small</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="large">Large</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Padding (e.g., 5px 9px)"
                              value={config?.padding || ''}
                              onChange={(e) => {
                                enhancedTableStore.setActionButtonConfigs({
                                  [configuringButton]: {
                                    ...config,
                                    padding: e.target.value,
                                  }
                                });
                              }}
                              placeholder="5px 9px"
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Font Size (e.g., 0.75rem)"
                              value={config?.fontSize || ''}
                              onChange={(e) => {
                                enhancedTableStore.setActionButtonConfigs({
                                  [configuringButton]: {
                                    ...config,
                                    fontSize: e.target.value,
                                  }
                                });
                              }}
                              placeholder="0.75rem"
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                        </Grid>
                      );
                    })()}
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setConfiguringButton(null)}>Close</Button>
                  </DialogActions>
                </Dialog>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

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
