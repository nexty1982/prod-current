/**
 * Theme-aware color helpers for Refactor Console
 * Provides consistent dark/light mode color handling
 */

import { Theme, alpha } from '@mui/material/styles';
import { useState, useEffect, useContext } from 'react';
import { CustomizerContext } from '@/context/CustomizerContext';

export type ColorIntent = 'success' | 'warning' | 'info' | 'error' | 'neutral';

/**
 * Detect dark mode from multiple sources for reliability
 * Checks in order:
 * 1. Provided context activeMode
 * 2. DOM 'dark' class on html element
 * 3. data-theme-mode attribute
 * 4. MUI theme.palette.mode
 */
export function detectDarkMode(activeMode?: string, theme?: Theme): boolean {
  // 1. Check context value if provided
  if (activeMode === 'dark') return true;
  if (activeMode === 'light') return false;
  
  // 2. Check DOM dark class (most reliable after context)
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) return true;
    
    // 3. Check data-theme-mode attribute
    const dataThemeMode = document.documentElement.getAttribute('data-theme-mode');
    if (dataThemeMode === 'dark') return true;
    if (dataThemeMode === 'light') return false;
  }
  
  // 4. Fall back to MUI theme if provided
  if (theme && theme.palette?.mode === 'dark') return true;
  
  // Default to dark mode if unable to determine (safer for dark UIs)
  return true;
}

/**
 * Custom hook to reliably track dark mode state
 * Combines CustomizerContext with DOM observation for reliability
 */
export function useDarkMode(): boolean {
  const customizerContext = useContext(CustomizerContext);
  const activeMode = customizerContext?.activeMode;
  
  // Initialize with context if available, then DOM check
  const [isDark, setIsDark] = useState<boolean>(() => {
    // FIRST: Check context - this is the authoritative source
    if (activeMode === 'dark') return true;
    if (activeMode === 'light') return false;
    
    // SECOND: Check DOM if context not ready
    if (typeof document !== 'undefined') {
      // Check for dark class
      if (document.documentElement.classList.contains('dark')) return true;
      // Check for data-theme-mode attribute
      const dataThemeMode = document.documentElement.getAttribute('data-theme-mode');
      if (dataThemeMode === 'dark') return true;
      if (dataThemeMode === 'light') return false;
    }
    
    // DEFAULT: Return false (light mode) - safer default to avoid dark styles on light backgrounds
    return false;
  });
  
  // Update when context changes
  useEffect(() => {
    if (activeMode === 'dark') {
      setIsDark(true);
    } else if (activeMode === 'light') {
      setIsDark(false);
    }
  }, [activeMode]);
  
  // Also observe DOM changes as backup
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'class') {
            const hasDarkClass = document.documentElement.classList.contains('dark');
            setIsDark(hasDarkClass);
          } else if (mutation.attributeName === 'data-theme-mode') {
            const mode = document.documentElement.getAttribute('data-theme-mode');
            setIsDark(mode === 'dark');
          }
        }
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme-mode']
    });
    
    // Check again after a short delay to catch any race conditions
    const timeout = setTimeout(() => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      const dataMode = document.documentElement.getAttribute('data-theme-mode');
      if (hasDarkClass || dataMode === 'dark') {
        setIsDark(true);
      }
    }, 100);
    
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);
  
  return isDark;
}

export interface SurfaceStyles {
  bgcolor: string;
  color: string;
  borderColor: string;
  iconColor: string;
}

/**
 * Get theme-aware surface styles for status/legend rows
 * In light mode: uses pastel backgrounds
 * In dark mode: uses darker, muted fills with colored accents
 * 
 * @param theme - MUI theme object
 * @param intent - Color intent (success, warning, info, error, neutral)
 * @param isDarkOverride - Optional override for dark mode detection (use activeMode === 'dark' from CustomizerContext)
 */
export function getSurfaceStyles(theme: Theme, intent: ColorIntent, isDarkOverride?: boolean): SurfaceStyles {
  // Use override if provided, otherwise fall back to theme.palette.mode
  const isDark = isDarkOverride !== undefined ? isDarkOverride : theme.palette.mode === 'dark';

  if (isDark) {
    // Dark mode: darker surfaces with colored accents using proper alpha
    switch (intent) {
      case 'success':
        return {
          bgcolor: alpha(theme.palette.success.main, 0.15),
          color: theme.palette.success.light,
          borderColor: alpha(theme.palette.success.main, 0.5),
          iconColor: theme.palette.success.light,
        };
      case 'warning':
        return {
          bgcolor: alpha(theme.palette.warning.main, 0.15),
          color: theme.palette.warning.light,
          borderColor: alpha(theme.palette.warning.main, 0.5),
          iconColor: theme.palette.warning.light,
        };
      case 'info':
        return {
          bgcolor: alpha(theme.palette.info.main, 0.15),
          color: theme.palette.info.light,
          borderColor: alpha(theme.palette.info.main, 0.5),
          iconColor: theme.palette.info.light,
        };
      case 'error':
        return {
          bgcolor: alpha(theme.palette.error.main, 0.15),
          color: theme.palette.error.light,
          borderColor: alpha(theme.palette.error.main, 0.5),
          iconColor: theme.palette.error.light,
        };
      case 'neutral':
      default:
        return {
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderColor: theme.palette.divider,
          iconColor: theme.palette.text.secondary,
        };
    }
  } else {
    // Light mode: pastel backgrounds
    switch (intent) {
      case 'success':
        return {
          bgcolor: alpha(theme.palette.success.main, 0.12),
          color: theme.palette.success.dark,
          borderColor: alpha(theme.palette.success.main, 0.4),
          iconColor: theme.palette.success.main,
        };
      case 'warning':
        return {
          bgcolor: alpha(theme.palette.warning.main, 0.12),
          color: theme.palette.warning.dark,
          borderColor: alpha(theme.palette.warning.main, 0.4),
          iconColor: theme.palette.warning.main,
        };
      case 'info':
        return {
          bgcolor: alpha(theme.palette.info.main, 0.12),
          color: theme.palette.info.dark,
          borderColor: alpha(theme.palette.info.main, 0.4),
          iconColor: theme.palette.info.main,
        };
      case 'error':
        return {
          bgcolor: alpha(theme.palette.error.main, 0.12),
          color: theme.palette.error.dark,
          borderColor: alpha(theme.palette.error.main, 0.4),
          iconColor: theme.palette.error.main,
        };
      case 'neutral':
      default:
        return {
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderColor: theme.palette.divider,
          iconColor: theme.palette.text.secondary,
        };
    }
  }
}

/**
 * Get status color for classification types
 */
export function getClassificationIntent(classification: 'green' | 'orange' | 'yellow' | 'red'): ColorIntent {
  switch (classification) {
    case 'green':
      return 'success';
    case 'orange':
      return 'warning';
    case 'yellow':
      return 'warning';
    case 'red':
      return 'error';
    default:
      return 'neutral';
  }
}
