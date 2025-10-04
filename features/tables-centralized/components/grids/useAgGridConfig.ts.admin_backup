/**
 * Orthodox Metrics - useAgGridConfig Hook
 * React hook for managing AG Grid configurations
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  agGridConfigApiService,
  AgGridConfig,
  ColumnDefinition,
  GridOptions,
  GridSettings,
  ThemeSettings,
  ExportSettings,
  UserPreferences,
  CreateAgGridConfigRequest,
  UpdateAgGridConfigRequest,
  GridStateData,
  SavedGridState
} from '../api/AgGridConfigApiService';

export interface UseAgGridConfigOptions {
  churchId: number;
  tableName: string;
  configName?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseAgGridConfigReturn {
  config: AgGridConfig | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

export interface UseAgGridConfigsOptions {
  churchId: number;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseAgGridConfigsReturn {
  configs: AgGridConfig[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

export interface UseAgGridConfigMutationsOptions {
  churchId: number;
  onSuccess?: (data: AgGridConfig) => void;
  onError?: (error: Error) => void;
}

export interface UseAgGridConfigMutationsReturn {
  createConfig: (config: CreateAgGridConfigRequest) => Promise<AgGridConfig>;
  updateConfig: (tableName: string, config: UpdateAgGridConfigRequest, configName?: string) => Promise<AgGridConfig>;
  deleteConfig: (tableName: string, configName?: string) => Promise<void>;
  cloneConfig: (tableName: string, sourceConfigName: string, newConfigName: string) => Promise<AgGridConfig>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isCloning: boolean;
  error: string | null;
}

export interface UseGridStateOptions {
  churchId: number;
  tableName: string;
  configName?: string;
  autoSave?: boolean;
  saveDelay?: number;
}

export interface UseGridStateReturn {
  savedState: SavedGridState | undefined;
  loading: boolean;
  error: string | null;
  saveState: (state: GridStateData) => Promise<void>;
  loadState: () => Promise<SavedGridState>;
  isSaving: boolean;
  isLoading: boolean;
}

/**
 * Hook to fetch a specific AG Grid configuration
 */
export const useAgGridConfig = ({
  churchId,
  tableName,
  configName = 'default',
  enabled = true,
  refetchInterval
}: UseAgGridConfigOptions): UseAgGridConfigReturn => {
  const {
    data: config,
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['agGridConfig', churchId, tableName, configName],
    queryFn: () => agGridConfigApiService.getGridConfig(churchId, tableName, configName),
    enabled: enabled && !!churchId && !!tableName,
    refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  return {
    config: config || undefined,
    loading,
    error: error?.message || null,
    refetch,
    isRefetching
  };
};

/**
 * Hook to fetch all AG Grid configurations for a church
 */
export const useAgGridConfigs = ({
  churchId,
  enabled = true,
  refetchInterval
}: UseAgGridConfigsOptions): UseAgGridConfigsReturn => {
  const {
    data: configs = [],
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['agGridConfigs', churchId],
    queryFn: () => agGridConfigApiService.getGridConfigs(churchId),
    enabled: enabled && !!churchId,
    refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  return {
    configs,
    loading,
    error: error?.message || null,
    refetch,
    isRefetching
  };
};

/**
 * Hook for AG Grid configuration mutations (create, update, delete, clone)
 */
export const useAgGridConfigMutations = ({
  churchId,
  onSuccess,
  onError
}: UseAgGridConfigMutationsOptions): UseAgGridConfigMutationsReturn => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (config: CreateAgGridConfigRequest) =>
      agGridConfigApiService.createGridConfig(churchId, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agGridConfigs', churchId] });
      queryClient.invalidateQueries({ queryKey: ['agGridConfig', churchId, data.table_name, data.config_name] });
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ tableName, config, configName }: { tableName: string; config: UpdateAgGridConfigRequest; configName?: string }) =>
      agGridConfigApiService.updateGridConfig(churchId, tableName, config, configName),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agGridConfigs', churchId] });
      queryClient.invalidateQueries({ queryKey: ['agGridConfig', churchId, data.table_name, data.config_name] });
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ tableName, configName }: { tableName: string; configName?: string }) =>
      agGridConfigApiService.deleteGridConfig(churchId, tableName, configName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agGridConfigs', churchId] });
      queryClient.invalidateQueries({ queryKey: ['agGridConfig', churchId] });
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  const cloneMutation = useMutation({
    mutationFn: ({ tableName, sourceConfigName, newConfigName }: { tableName: string; sourceConfigName: string; newConfigName: string }) =>
      agGridConfigApiService.cloneConfiguration(churchId, tableName, sourceConfigName, newConfigName),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agGridConfigs', churchId] });
      queryClient.invalidateQueries({ queryKey: ['agGridConfig', churchId, data.table_name] });
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  return {
    createConfig: createMutation.mutateAsync,
    updateConfig: (tableName: string, config: UpdateAgGridConfigRequest, configName?: string) =>
      updateMutation.mutateAsync({ tableName, config, configName }),
    deleteConfig: (tableName: string, configName?: string) =>
      deleteMutation.mutateAsync({ tableName, configName }),
    cloneConfig: (tableName: string, sourceConfigName: string, newConfigName: string) =>
      cloneMutation.mutateAsync({ tableName, sourceConfigName, newConfigName }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCloning: cloneMutation.isPending,
    error: createMutation.error?.message || updateMutation.error?.message || deleteMutation.error?.message || cloneMutation.error?.message || null
  };
};

/**
 * Hook to get column definitions for a table
 */
export const useColumnDefinitions = (
  churchId: number,
  tableName: string,
  configName: string = 'default',
  enabled: boolean = true
) => {
  const {
    data: columns = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['columnDefinitions', churchId, tableName, configName],
    queryFn: () => agGridConfigApiService.getColumnDefinitions(churchId, tableName, configName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    columns,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get grid options for a table
 */
export const useGridOptions = (
  churchId: number,
  tableName: string,
  configName: string = 'default',
  enabled: boolean = true
) => {
  const {
    data: options,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['gridOptions', churchId, tableName, configName],
    queryFn: () => agGridConfigApiService.getGridOptions(churchId, tableName, configName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    options,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get complete grid configuration for frontend
 */
export const useCompleteGridConfig = (
  churchId: number,
  tableName: string,
  configName: string = 'default',
  enabled: boolean = true
) => {
  const {
    data: config,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['completeGridConfig', churchId, tableName, configName],
    queryFn: () => agGridConfigApiService.getCompleteGridConfig(churchId, tableName, configName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });

  return {
    config,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to manage grid state (save/load user preferences)
 */
export const useGridState = ({
  churchId,
  tableName,
  configName = 'default',
  autoSave = true,
  saveDelay = 1000
}: UseGridStateOptions): UseGridStateReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const {
    data: savedState,
    isLoading: loading,
    error,
    refetch: loadState
  } = useQuery({
    queryKey: ['gridState', churchId, tableName, configName],
    queryFn: () => agGridConfigApiService.loadGridState(churchId, tableName, configName),
    enabled: !!churchId && !!tableName,
    staleTime: 0, // Always refetch to get latest state
    retry: 1
  });

  const saveStateMutation = useMutation({
    mutationFn: (state: GridStateData) =>
      agGridConfigApiService.saveGridState(churchId, tableName, state, configName),
    onSuccess: () => {
      // Invalidate and refetch the saved state
      loadState();
    }
  });

  const saveState = useCallback(async (state: GridStateData) => {
    if (!autoSave) {
      setIsSaving(true);
      try {
        await saveStateMutation.mutateAsync(state);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Debounced save for auto-save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveStateMutation.mutateAsync(state);
      } finally {
        setIsSaving(false);
      }
    }, saveDelay);

    setSaveTimeout(timeout);
  }, [autoSave, saveDelay, saveStateMutation, churchId, tableName, configName]);

  const loadStateCallback = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await agGridConfigApiService.loadGridState(churchId, tableName, configName);
      return state;
    } finally {
      setIsLoading(false);
    }
  }, [churchId, tableName, configName]);

  return {
    savedState,
    loading,
    error: error?.message || null,
    saveState,
    loadState: loadStateCallback,
    isSaving,
    isLoading
  };
};

/**
 * Hook to get available configurations for a table
 */
export const useTableConfigurations = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: configurations = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tableConfigurations', churchId, tableName],
    queryFn: () => agGridConfigApiService.getTableConfigurations(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });

  return {
    configurations,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get theme settings for a table
 */
export const useThemeSettings = (
  churchId: number,
  tableName: string,
  configName: string = 'default',
  enabled: boolean = true
) => {
  const {
    data: theme,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['themeSettings', churchId, tableName, configName],
    queryFn: async () => {
      const config = await agGridConfigApiService.getGridConfig(churchId, tableName, configName);
      return config?.theme_settings;
    },
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    theme,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get export settings for a table
 */
export const useExportSettings = (
  churchId: number,
  tableName: string,
  configName: string = 'default',
  enabled: boolean = true
) => {
  const {
    data: settings,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exportSettings', churchId, tableName, configName],
    queryFn: async () => {
      const config = await agGridConfigApiService.getGridConfig(churchId, tableName, configName);
      return config?.export_settings;
    },
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    settings,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get user preferences for a table
 */
export const useUserPreferences = (
  churchId: number,
  tableName: string,
  configName: string = 'default',
  enabled: boolean = true
) => {
  const {
    data: preferences,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['userPreferences', churchId, tableName, configName],
    queryFn: async () => {
      const config = await agGridConfigApiService.getGridConfig(churchId, tableName, configName);
      return config?.user_preferences;
    },
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });

  return {
    preferences,
    loading,
    error: error?.message || null,
    refetch
  };
};
