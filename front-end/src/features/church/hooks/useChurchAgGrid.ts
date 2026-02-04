/**
 * useChurchAgGrid - Hook to check if AG Grid is enabled for a church's record types
 *
 * Reads the church configuration to determine if AG Grid view should be available
 * for specific record types (baptism, marriage, funeral).
 *
 * Usage in record pages:
 *   const { isAgGridEnabled, loading } = useChurchAgGrid('baptism');
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface AgGridConfig {
  enabled: boolean;
  recordTypes: string[];
}

interface UseChurchAgGridResult {
  /** Whether AG Grid is enabled for the specified record type */
  isAgGridEnabled: boolean;
  /** Whether AG Grid is enabled globally for this church */
  isAgGridEnabledGlobal: boolean;
  /** Which record types have AG Grid enabled */
  enabledRecordTypes: string[];
  /** Loading state while fetching church config */
  loading: boolean;
  /** Error message if config fetch failed */
  error: string | null;
  /** Toggle AG Grid for a specific record type (calls API) */
  toggleAgGrid: (recordType: string, enabled: boolean) => Promise<void>;
}

export const useChurchAgGrid = (recordType?: string): UseChurchAgGridResult => {
  const { user } = useAuth();
  const [config, setConfig] = useState<AgGridConfig>({ enabled: false, recordTypes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const churchId = user?.church_id;

  useEffect(() => {
    if (!churchId) {
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/churches/${churchId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const church = await response.json();
          setConfig({
            enabled: church.enable_ag_grid ?? false,
            recordTypes: church.ag_grid_record_types || [],
          });
        } else {
          // If church API fails, check localStorage for cached config
          const cached = localStorage.getItem(`om.church.${churchId}.agGrid`);
          if (cached) {
            setConfig(JSON.parse(cached));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load AG Grid config';
        setError(msg);
        // Fallback to localStorage cache
        const cached = localStorage.getItem(`om.church.${churchId}.agGrid`);
        if (cached) {
          try { setConfig(JSON.parse(cached)); } catch { /* ignore parse errors */ }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [churchId]);

  // Cache config in localStorage when it changes
  useEffect(() => {
    if (churchId && config.enabled) {
      localStorage.setItem(`om.church.${churchId}.agGrid`, JSON.stringify(config));
    }
  }, [churchId, config]);

  const toggleAgGrid = async (type: string, enabled: boolean) => {
    if (!churchId) return;

    const newRecordTypes = enabled
      ? [...new Set([...config.recordTypes, type])]
      : config.recordTypes.filter(t => t !== type);

    const hasAnyEnabled = newRecordTypes.length > 0;

    try {
      const response = await fetch(`/api/admin/churches/${churchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enable_ag_grid: hasAnyEnabled,
          ag_grid_record_types: newRecordTypes,
        }),
      });

      if (response.ok) {
        setConfig({
          enabled: hasAnyEnabled,
          recordTypes: newRecordTypes,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update AG Grid config');
    }
  };

  return {
    isAgGridEnabled: config.enabled && (recordType ? config.recordTypes.includes(recordType) : false),
    isAgGridEnabledGlobal: config.enabled,
    enabledRecordTypes: config.recordTypes,
    loading,
    error,
    toggleAgGrid,
  };
};

export default useChurchAgGrid;
