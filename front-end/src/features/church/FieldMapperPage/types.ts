import type { Branding, FieldStyleRule, LiturgicalThemeKey, ThemeTokens } from '@/store/enhancedTableStore';

export interface Column {
  column_name: string;
  ordinal_position: number;
  new_name: string;
  is_visible: boolean;
  is_sortable: boolean;
}

export interface ApiResponse {
  columns: Array<{ column_name: string; ordinal_position: number }>;
  mappings?: Record<string, string>;
  field_settings?: {
    visibility?: Record<string, boolean>;
    sortable?: Record<string, boolean>;
    default_sort_field?: string;
    default_sort_direction?: 'asc' | 'desc';
  };
}

export interface RecordSettings {
  logo: {
    enabled: boolean;
    column: number;
    file: File | null;
    width: number;
    height: number;
    objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    opacity: number;
    quadrant: 'top' | 'middle' | 'bottom';
    horizontalPosition: 'left' | 'center' | 'right';
    order?: number;
  };
  calendar: {
    enabled: boolean;
    column: number;
    quadrant: 'top' | 'middle' | 'bottom';
    horizontalPosition: 'left' | 'center' | 'right';
    order?: number;
  };
  omLogo: {
    enabled: boolean;
    column: number;
    width: number;
    height: number;
    quadrant: 'top' | 'middle' | 'bottom';
    horizontalPosition: 'left' | 'center' | 'right';
    order?: number;
  };
  headerText: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    column: number;
    position: string;
    quadrant: string;
    horizontalPosition: 'left' | 'center' | 'right';
    order?: number;
    x?: number;
    y?: number;
  };
  recordImages: {
    column: number;
    quadrant: string;
    horizontalPosition: 'left' | 'center' | 'right';
    width: number;
    height: number;
    order?: number;
    x?: number;
    y?: number;
  };
  backgroundImage: {
    enabled: boolean;
    column: number;
    images: string[];
    currentIndex: number;
    quadrant: 'top' | 'middle' | 'bottom';
    order?: number;
  };
  g1Image: {
    enabled: boolean;
    column: number;
    images: string[];
    currentIndex: number;
    quadrant: 'top' | 'middle' | 'bottom';
    order?: number;
  };
  imageLibrary: {
    logo: string[];
    omLogo: string[];
    baptism: string[];
    marriage: string[];
    funeral: string[];
    bg: string[];
    g1: string[];
    recordImage: string[];
  };
  currentImageIndex: {
    logo: number;
    omLogo: number;
    baptism: number;
    marriage: number;
    funeral: number;
    bg: number;
    g1: number;
    recordImage: number;
  };
}

export interface DynamicConfig {
  branding: Branding;
  liturgicalTheme: LiturgicalThemeKey;
  fieldRules: FieldStyleRule[];
}

export interface ThemeStudioState {
  isGlobal: boolean;
  themes: Record<string, ThemeTokens & { name: string; description?: string }>;
  selectedTheme: string;
}

export interface EditingTheme {
  name: string;
  description: string;
  tokens: ThemeTokens;
  isPreDefined?: boolean;
  originalKey?: string;
}
