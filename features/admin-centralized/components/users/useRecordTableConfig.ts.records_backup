/**
 * Orthodox Metrics - useRecordTableConfig Hook
 * React hook for managing record table configurations
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  recordTableConfigApiService,
  RecordTableConfig,
  FieldDefinition,
  DisplaySettings,
  SearchConfig,
  ValidationRules,
  ImportExportConfig,
  CertificateConfig,
  CreateRecordTableConfigRequest,
  UpdateRecordTableConfigRequest
} from '../api/RecordTableConfigApiService';

export interface UseRecordTableConfigOptions {
  churchId: number;
  tableName: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseRecordTableConfigReturn {
  config: RecordTableConfig | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

export interface UseRecordTableConfigsOptions {
  churchId: number;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseRecordTableConfigsReturn {
  configs: RecordTableConfig[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

export interface UseTableConfigMutationsOptions {
  churchId: number;
  onSuccess?: (data: RecordTableConfig) => void;
  onError?: (error: Error) => void;
}

export interface UseTableConfigMutationsReturn {
  createConfig: (config: CreateRecordTableConfigRequest) => Promise<RecordTableConfig>;
  updateConfig: (tableName: string, config: UpdateRecordTableConfigRequest) => Promise<RecordTableConfig>;
  deleteConfig: (tableName: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
}

/**
 * Hook to fetch a specific table configuration
 */
export const useRecordTableConfig = ({
  churchId,
  tableName,
  enabled = true,
  refetchInterval
}: UseRecordTableConfigOptions): UseRecordTableConfigReturn => {
  const {
    data: config,
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['recordTableConfig', churchId, tableName],
    queryFn: () => recordTableConfigApiService.getTableConfig(churchId, tableName),
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
 * Hook to fetch all table configurations for a church
 */
export const useRecordTableConfigs = ({
  churchId,
  enabled = true,
  refetchInterval
}: UseRecordTableConfigsOptions): UseRecordTableConfigsReturn => {
  const {
    data: configs = [],
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['recordTableConfigs', churchId],
    queryFn: () => recordTableConfigApiService.getTableConfigs(churchId),
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
 * Hook for table configuration mutations (create, update, delete)
 */
export const useTableConfigMutations = ({
  churchId,
  onSuccess,
  onError
}: UseTableConfigMutationsOptions): UseTableConfigMutationsReturn => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (config: CreateRecordTableConfigRequest) =>
      recordTableConfigApiService.createTableConfig(churchId, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recordTableConfigs', churchId] });
      queryClient.invalidateQueries({ queryKey: ['recordTableConfig', churchId, data.table_name] });
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ tableName, config }: { tableName: string; config: UpdateRecordTableConfigRequest }) =>
      recordTableConfigApiService.updateTableConfig(churchId, tableName, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recordTableConfigs', churchId] });
      queryClient.invalidateQueries({ queryKey: ['recordTableConfig', churchId, data.table_name] });
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (tableName: string) =>
      recordTableConfigApiService.deleteTableConfig(churchId, tableName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordTableConfigs', churchId] });
      queryClient.invalidateQueries({ queryKey: ['recordTableConfig', churchId] });
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  return {
    createConfig: createMutation.mutateAsync,
    updateConfig: (tableName: string, config: UpdateRecordTableConfigRequest) =>
      updateMutation.mutateAsync({ tableName, config }),
    deleteConfig: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: createMutation.error?.message || updateMutation.error?.message || deleteMutation.error?.message || null
  };
};

/**
 * Hook to get field definitions for a table
 */
export const useFieldDefinitions = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: fields = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['fieldDefinitions', churchId, tableName],
    queryFn: () => recordTableConfigApiService.getFieldDefinitions(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    fields,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get display settings for a table
 */
export const useDisplaySettings = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: settings,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['displaySettings', churchId, tableName],
    queryFn: () => recordTableConfigApiService.getDisplaySettings(churchId, tableName),
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
 * Hook to get search configuration for a table
 */
export const useSearchConfig = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: config,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['searchConfig', churchId, tableName],
    queryFn: () => recordTableConfigApiService.getSearchConfig(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
 * Hook to get validation rules for a table
 */
export const useValidationRules = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: rules,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['validationRules', churchId, tableName],
    queryFn: () => recordTableConfigApiService.getValidationRules(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    rules,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get import/export configuration for a table
 */
export const useImportExportConfig = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: config,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['importExportConfig', churchId, tableName],
    queryFn: () => recordTableConfigApiService.getImportExportConfig(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
 * Hook to get certificate configuration for a table
 */
export const useCertificateConfig = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: config,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['certificateConfig', churchId, tableName],
    queryFn: () => recordTableConfigApiService.getCertificateConfig(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
 * Hook to validate record data against table configuration
 */
export const useRecordValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateRecord = useCallback(async (
    churchId: number,
    tableName: string,
    recordData: Record<string, any>
  ) => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const result = await recordTableConfigApiService.validateRecordData(
        churchId,
        tableName,
        recordData
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setValidationError(errorMessage);
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    validateRecord,
    isValidating,
    validationError
  };
};

/**
 * Hook to get table schema information
 */
export const useTableSchema = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: schema,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tableSchema', churchId, tableName],
    queryFn: () => recordTableConfigApiService.getTableSchema(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    schema,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get available tables for a church
 */
export const useAvailableTables = (
  churchId: number,
  enabled: boolean = true
) => {
  const {
    data: tables = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['availableTables', churchId],
    queryFn: () => recordTableConfigApiService.getTableConfigs(churchId).then(configs =>
      configs.map(config => ({
        tableName: config.table_name,
        displayName: config.display_name,
        tableType: config.table_type,
        fieldCount: config.field_definitions.length,
        hasCertificate: config.certificate_config.enabled
      }))
    ),
    enabled: enabled && !!churchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });

  return {
    tables,
    loading,
    error: error?.message || null,
    refetch
  };
};
