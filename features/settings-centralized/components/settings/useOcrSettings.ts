/**
 * useOcrSettings Hook
 * React hook for managing OCR settings and configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

export interface OcrSettings {
  // Processing Settings
  defaultLanguage: string;
  defaultQuality: 'fast' | 'balanced' | 'accurate';
  autoSubmit: boolean;
  batchProcessing: boolean;
  confidenceThreshold: number;
  
  // Field Mapping
  enableSmartMapping: boolean;
  customFieldMappings: Record<string, string>;
  requiredFields: string[];
  
  // UI Settings
  showConfidenceBadges: boolean;
  showBoundingBoxes: boolean;
  previewMode: 'side-by-side' | 'overlay' | 'tabs';
  autoRefreshQueue: boolean;
  refreshInterval: number;
  
  // Advanced Settings
  enableEntityExtraction: boolean;
  enableTranslation: boolean;
  retentionDays: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  
  // Church-specific
  recordTypes: string[];
  theme: string;
  customCss: string;
}

export const useOcrSettings = (churchId: string) => {
  const [settings, setSettings] = useState<OcrSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings from API
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/church/${churchId}/ocr/settings`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.statusText}`);
      }

      const data = await response.json();
      setSettings(data.settings || getDefaultSettings());
      setError(null);
      setHasChanges(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(errorMessage);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  // Get default settings
  const getDefaultSettings = useCallback((): OcrSettings => {
    return {
      defaultLanguage: 'en',
      defaultQuality: 'balanced',
      autoSubmit: false,
      batchProcessing: true,
      confidenceThreshold: 0.7,
      enableSmartMapping: true,
      customFieldMappings: {},
      requiredFields: [],
      showConfidenceBadges: true,
      showBoundingBoxes: true,
      previewMode: 'side-by-side',
      autoRefreshQueue: true,
      refreshInterval: 5,
      enableEntityExtraction: true,
      enableTranslation: false,
      retentionDays: 90,
      maxFileSize: 10,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'],
      recordTypes: ['baptism', 'marriage', 'funeral'],
      theme: 'light',
      customCss: ''
    };
  }, []);

  // Update a setting
  const updateSetting = useCallback(<K extends keyof OcrSettings>(
    key: K, 
    value: OcrSettings[K]
  ) => {
    setSettings(prev => {
      if (!prev) return null;
      return { ...prev, [key]: value };
    });
    setHasChanges(true);
  }, []);

  // Save settings to API
  const saveSettings = useCallback(async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/church/${churchId}/ocr/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`);
      }

      toast.success('Settings saved successfully');
      setHasChanges(false);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [settings, churchId]);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    setSettings(getDefaultSettings());
    setHasChanges(true);
  }, [getDefaultSettings]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    hasChanges,
    updateSetting,
    saveSettings,
    resetSettings,
    refreshSettings: fetchSettings
  };
};
