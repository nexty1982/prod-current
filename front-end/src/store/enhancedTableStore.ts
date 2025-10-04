/**
 * Enhanced Table Store with Liturgical Themes, Branding & Field Rules
 * localStorage-based persistence for cross-session configuration
 */

export type LiturgicalThemeKey = 
  | 'orthodox_traditional'
  | 'great_lent'
  | 'pascha'
  | 'nativity'
  | 'palm_sunday'
  | 'theotokos_feasts';

export interface ThemeTokens {
  headerBg: string;
  headerText: string;
  rowOddBg: string;
  rowEvenBg: string;
  border: string;
  accent: string;
  cellText: string;
}

export interface FieldStyleRule {
  field: string;
  weight?: 'regular' | 'bold';
  italic?: boolean;
  uppercase?: boolean;
  color?: string;
  bg?: string;
}

export interface Branding {
  churchName?: string;
  logoUrl?: string;
  logoPreview?: string;
  logoAlign?: 'left' | 'center' | 'right';
  showBrandHeader?: boolean;
}

export interface EnhancedTableState {
  liturgicalTheme: LiturgicalThemeKey;
  tokens: ThemeTokens;
  fieldRules: FieldStyleRule[];
  branding: Branding;
}

export const THEME_MAP: Record<LiturgicalThemeKey, ThemeTokens> = {
  orthodox_traditional: {
    headerBg: '#1976d2',
    headerText: '#ffffff',
    rowOddBg: '#fafafa',
    rowEvenBg: '#ffffff',
    border: '#e0e0e0',
    accent: '#1976d2',
    cellText: '#212121',
  },
  great_lent: {
    headerBg: '#4a148c',
    headerText: '#ffffff',
    rowOddBg: '#f3e5f5',
    rowEvenBg: '#ffffff',
    border: '#ce93d8',
    accent: '#7b1fa2',
    cellText: '#4a148c',
  },
  pascha: {
    headerBg: '#d32f2f',
    headerText: '#ffffff',
    rowOddBg: '#ffebee',
    rowEvenBg: '#ffffff',
    border: '#ffcdd2',
    accent: '#c62828',
    cellText: '#b71c1c',
  },
  nativity: {
    headerBg: '#2e7d32',
    headerText: '#ffffff',
    rowOddBg: '#e8f5e8',
    rowEvenBg: '#ffffff',
    border: '#c8e6c9',
    accent: '#388e3c',
    cellText: '#1b5e20',
  },
  palm_sunday: {
    headerBg: '#558b2f',
    headerText: '#ffffff',
    rowOddBg: '#f1f8e9',
    rowEvenBg: '#ffffff',
    border: '#dcedc8',
    accent: '#689f38',
    cellText: '#33691e',
  },
  theotokos_feasts: {
    headerBg: '#1565c0',
    headerText: '#ffffff',
    rowOddBg: '#e3f2fd',
    rowEvenBg: '#ffffff',
    border: '#bbdefb',
    accent: '#1976d2',
    cellText: '#0d47a1',
  },
};

const STORAGE_KEY = 'om.dynamicInspector';

class EnhancedTableStore {
  private state: EnhancedTableState;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): EnhancedTableState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          liturgicalTheme: parsed.liturgicalTheme || 'orthodox_traditional',
          tokens: parsed.tokens || THEME_MAP.orthodox_traditional,
          fieldRules: parsed.fieldRules || [],
          branding: parsed.branding || {},
        };
      }
    } catch (error) {
      console.warn('Failed to load enhanced table state:', error);
    }
    
    return {
      liturgicalTheme: 'orthodox_traditional',
      tokens: THEME_MAP.orthodox_traditional,
      fieldRules: [],
      branding: {},
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save enhanced table state:', error);
    }
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  public getState(): EnhancedTableState {
    return { ...this.state };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public setLiturgicalTheme(theme: LiturgicalThemeKey): void {
    this.state.liturgicalTheme = theme;
    this.state.tokens = THEME_MAP[theme];
    this.saveState();
    this.notify();
  }

  public setFieldRules(rules: FieldStyleRule[]): void {
    this.state.fieldRules = rules;
    this.saveState();
    this.notify();
  }

  public setBranding(updates: Partial<Branding>): void {
    this.state.branding = { ...this.state.branding, ...updates };
    this.saveState();
    this.notify();
  }

  public exportConfig(): EnhancedTableState {
    return { ...this.state };
  }

  public importConfig(config: Partial<EnhancedTableState>): void {
    if (config.liturgicalTheme && THEME_MAP[config.liturgicalTheme]) {
      this.state.liturgicalTheme = config.liturgicalTheme;
      this.state.tokens = THEME_MAP[config.liturgicalTheme];
    }
    if (config.fieldRules) {
      this.state.fieldRules = config.fieldRules;
    }
    if (config.branding) {
      this.state.branding = { ...this.state.branding, ...config.branding };
    }
    this.saveState();
    this.notify();
  }
}

export const enhancedTableStore = new EnhancedTableStore();
