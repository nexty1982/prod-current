/**
 * Field Mapper Queries
 * TanStack Query hooks for field mapper operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from './client';
import { endpoints } from './endpoints';
import { 
  KnownField, 
  Column, 
  FieldMapping, 
  KnownFieldSchema, 
  ColumnSchema, 
  FieldMappingSchema 
} from './schemas';
import { z } from 'zod';

const QUERY_KEYS = {
  knownFields: (recordType: string) => ['field-mapper', 'known-fields', recordType],
  columnSample: (churchId: string, recordType: string) => ['field-mapper', 'columns', churchId, recordType],
  fieldMapping: (churchId: string, recordType: string) => ['field-mapper', 'mapping', churchId, recordType],
} as const;

export function useKnownFields(recordType: string) {
  return useQuery({
    queryKey: QUERY_KEYS.knownFields(recordType),
    queryFn: async () => {
      const data = await apiJson<unknown[]>(endpoints.knownFields(recordType));
      return z.array(KnownFieldSchema).parse(data);
    },
    enabled: !!recordType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useColumnSample(churchId: string, recordType: string) {
  return useQuery({
    queryKey: QUERY_KEYS.columnSample(churchId, recordType),
    queryFn: async () => {
      const data = await apiJson<unknown[]>(endpoints.columnSample(churchId, recordType));
      return z.array(ColumnSchema).parse(data);
    },
    enabled: !!churchId && !!recordType,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useFieldMapping(churchId: string, recordType: string) {
  return useQuery({
    queryKey: QUERY_KEYS.fieldMapping(churchId, recordType),
    queryFn: async () => {
      const data = await apiJson<unknown>(endpoints.getMapping(churchId, recordType));
      return FieldMappingSchema.parse(data);
    },
    enabled: !!churchId && !!recordType,
  });
}

export function useSaveFieldMapping(churchId: string, recordType: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (mapping: FieldMapping) => {
      const normalizedMapping = {
        ...mapping,
        items: mapping.items
          .filter(item => item.targetFieldKey || item.customFieldName)
          .sort((a, b) => a.columnIndex - b.columnIndex),
        updatedAt: new Date().toISOString(),
      };

      const data = await apiJson<unknown>(
        endpoints.saveMapping(churchId, recordType),
        {
          method: 'PUT',
          body: JSON.stringify(normalizedMapping),
        }
      );
      
      return FieldMappingSchema.parse(data);
    },
    onSuccess: (savedMapping) => {
      // Update the cache with the saved mapping
      queryClient.setQueryData(
        QUERY_KEYS.fieldMapping(churchId, recordType),
        savedMapping
      );
    },
    onError: (error) => {
      console.error('Failed to save field mapping:', error);
    },
  });
}
