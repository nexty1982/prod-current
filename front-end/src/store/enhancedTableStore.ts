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

export interface ButtonConfig {
  backgroundColor?: string;
  hoverColor?: string;
  textColor?: string;
  size?: 'small' | 'medium' | 'large';
  padding?: string;
  fontSize?: string;
}

export interface ActionButtonConfigs {
  switchToAG?: ButtonConfig;
  fieldSettings?: ButtonConfig;
  addRecords?: ButtonConfig;
  advancedGrid?: ButtonConfig;
  searchRecords?: ButtonConfig;
  theme?: ButtonConfig;
  recordTableConfig?: ButtonConfig;
}

export interface EnhancedTableState {
  liturgicalTheme: LiturgicalThemeKey | string; // Allow custom theme names
  tokens: ThemeTokens;
  fieldRules: FieldStyleRule[];
  branding: Branding;
  customThemes?: Record<string, ThemeTokens & { name: string; description?: string }>; // Store custom themes
  actionButtonConfigs?: ActionButtonConfigs; // Button configurations
}

// Light mode themes
export const THEME_MAP: Record<LiturgicalThemeKey, ThemeTokens> = {
  orthodox_traditional: {
    headerBg: '#bd56fa',
    headerText: '#ffffff',
    rowOddBg: '#fafafa',
    rowEvenBg: '#ffffff',
    border: '#e0e0e0',
    accent: '#bd56fa',
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

// Dark mode themes - same accent colors but dark backgrounds
export const THEME_MAP_DARK: Record<LiturgicalThemeKey, ThemeTokens> = {
  orthodox_traditional: {
    headerBg: '#bd56fa',
    headerText: '#ffffff',
    rowOddBg: '#1e1e1e',
    rowEvenBg: '#2d2d2d',
    border: '#424242',
    accent: '#bd56fa',
    cellText: '#e0e0e0',
  },
  great_lent: {
    headerBg: '#4a148c',
    headerText: '#ffffff',
    rowOddBg: '#1a1a2e',
    rowEvenBg: '#252538',
    border: '#6a1b9a',
    accent: '#7b1fa2',
    cellText: '#ce93d8',
  },
  pascha: {
    headerBg: '#d32f2f',
    headerText: '#ffffff',
    rowOddBg: '#2d1a1a',
    rowEvenBg: '#3d2525',
    border: '#c62828',
    accent: '#c62828',
    cellText: '#ffcdd2',
  },
  nativity: {
    headerBg: '#2e7d32',
    headerText: '#ffffff',
    rowOddBg: '#1a2d1a',
    rowEvenBg: '#253d25',
    border: '#388e3c',
    accent: '#388e3c',
    cellText: '#c8e6c9',
  },
  palm_sunday: {
    headerBg: '#558b2f',
    headerText: '#ffffff',
    rowOddBg: '#1f2d1a',
    rowEvenBg: '#2a3d25',
    border: '#689f38',
    accent: '#689f38',
    cellText: '#dcedc8',
  },
  theotokos_feasts: {
    headerBg: '#1565c0',
    headerText: '#ffffff',
    rowOddBg: '#1a1f2d',
    rowEvenBg: '#252a3d',
    border: '#1976d2',
    accent: '#1976d2',
    cellText: '#bbdefb',
  },
};

// Helper to get theme tokens based on mode
export const getThemeTokens = (theme: LiturgicalThemeKey, isDarkMode: boolean): ThemeTokens => {
  return isDarkMode ? THEME_MAP_DARK[theme] : THEME_MAP[theme];
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
        const theme = parsed.liturgicalTheme || 'orthodox_traditional';
        
        // If the theme is orthodox_traditional, always use the latest default values from THEME_MAP
        // This ensures theme updates are applied even if localStorage has old values
        // Also check if stored tokens match old defaults and migrate them
        let tokens: ThemeTokens;
        let needsMigration = false;
        
        if (theme === 'orthodox_traditional') {
          // Check if stored tokens match old default values that need migration
          const oldHeaderBgValues = ['#1976d2', '#2c5aa0', '#724eeb', '#866cff'];
          if (parsed.tokens?.headerBg && oldHeaderBgValues.includes(parsed.tokens.headerBg)) {
            needsMigration = true;
          }
          
          // Always use the current default theme values (this ensures updates are applied)
          tokens = THEME_MAP.orthodox_traditional;
        } else {
          // For other themes, use stored tokens or theme defaults
          tokens = parsed.tokens || THEME_MAP[theme as LiturgicalThemeKey] || THEME_MAP.orthodox_traditional;
        }
        
        const state = {
          liturgicalTheme: theme,
          tokens: tokens,
          fieldRules: parsed.fieldRules || [],
          branding: parsed.branding || {},
          customThemes: parsed.customThemes || {},
          actionButtonConfigs: parsed.actionButtonConfigs || {},
        };
        
        // If migration is needed, save the updated state immediately
        if (needsMigration) {
          this.state = state;
          this.saveState();
        }
        
        return state;
      }
    } catch (error) {
      console.warn('Failed to load enhanced table state:', error);
    }
    
    return {
      liturgicalTheme: 'orthodox_traditional',
      tokens: THEME_MAP.orthodox_traditional,
      fieldRules: [],
      branding: {},
      customThemes: {},
      actionButtonConfigs: {},
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

  public setLiturgicalTheme(theme: LiturgicalThemeKey | string): void {
    this.state.liturgicalTheme = theme;
    
    // Check if it's a pre-defined theme
    if (theme in THEME_MAP) {
      // Always use the current default from THEME_MAP to ensure updates are applied
      this.state.tokens = THEME_MAP[theme as LiturgicalThemeKey];
    } else if (this.state.customThemes && this.state.customThemes[theme]) {
      // Use custom theme if it exists
      const customTheme = this.state.customThemes[theme];
      this.state.tokens = {
        headerBg: customTheme.headerBg,
        headerText: customTheme.headerText,
        rowOddBg: customTheme.rowOddBg,
        rowEvenBg: customTheme.rowEvenBg,
        border: customTheme.border,
        accent: customTheme.accent,
        cellText: customTheme.cellText,
      };
    }
    
    this.saveState();
    this.notify();
  }
  
  public setCustomThemes(themes: Record<string, ThemeTokens & { name: string; description?: string }>): void {
    this.state.customThemes = themes;
    this.saveState();
    this.notify();
  }
  
  public getCustomThemes(): Record<string, ThemeTokens & { name: string; description?: string }> | undefined {
    return this.state.customThemes;
  }
  
  public updatePreDefinedTheme(themeKey: LiturgicalThemeKey, tokens: ThemeTokens): void {
    // Update the THEME_MAP (this is a runtime update, not persisted in code)
    // Note: This only affects the current session. To persist, we'd need backend support.
    (THEME_MAP as any)[themeKey] = tokens;
    
    // If this theme is currently active, update the state
    if (this.state.liturgicalTheme === themeKey) {
      this.state.tokens = tokens;
      this.saveState();
      this.notify();
    }
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

  public setTokens(tokens: Partial<ThemeTokens>): void {
    this.state.tokens = { ...this.state.tokens, ...tokens };
    this.saveState();
    this.notify();
  }

  public setState(updater: (state: EnhancedTableState) => EnhancedTableState): void {
    const newState = updater(this.state);
    // If orthodox_traditional theme, ensure headerBg and accent use current defaults
    if (newState.liturgicalTheme === 'orthodox_traditional') {
      newState.tokens.headerBg = THEME_MAP.orthodox_traditional.headerBg;
      newState.tokens.accent = THEME_MAP.orthodox_traditional.accent;
    }
    this.state = newState;
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
    if (config.actionButtonConfigs) {
      this.state.actionButtonConfigs = { ...this.state.actionButtonConfigs, ...config.actionButtonConfigs };
    }
    this.saveState();
    this.notify();
  }

  public setActionButtonConfigs(configs: Partial<ActionButtonConfigs>): void {
    this.state.actionButtonConfigs = { ...this.state.actionButtonConfigs, ...configs };
    this.saveState();
    this.notify();
  }

  public getActionButtonConfigs(): ActionButtonConfigs | undefined {
    return this.state.actionButtonConfigs;
  }
}

export const enhancedTableStore = new EnhancedTableStore();
