/**
 * Field Mapper Table Component
 * Main table component for mapping columns to fields
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Column, KnownField, MappingItem, FieldMapping } from '../api/schemas';
import { ColumnRow } from './ColumnRow';
import { PreviewDrawer } from './PreviewDrawer';
import { SubtleAlert } from './SubtleAlert';

interface FieldMapperTableProps {
  columns: Column[];
  knownFields: KnownField[];
  mapping: FieldMapping | null;
  onMappingChange: (mapping: FieldMapping) => void;
  isLoading?: boolean;
  className?: string;
}

interface ValidationError {
  columnIndex: number;
  message: string;
}

export function FieldMapperTable({
  columns,
  knownFields,
  mapping,
  onMappingChange,
  isLoading = false,
  className = '',
}: FieldMapperTableProps) {
  const [previewColumn, setPreviewColumn] = useState<Column | null>(null);

  const validationErrors = useMemo((): ValidationError[] => {
    if (!mapping) return [];

    const errors: ValidationError[] = [];
    const usedFields = new Set<string>();

    // Check for required fields that are unmapped
    const requiredFields = knownFields.filter(f => f.required);
    const mappedFieldKeys = new Set(
      mapping.items
        .filter(item => item.targetFieldKey)
        .map(item => item.targetFieldKey!)
    );

    requiredFields.forEach(field => {
      if (!mappedFieldKeys.has(field.key)) {
        errors.push({
          columnIndex: -1, // Global error
          message: `Required field "${field.label}" is not mapped`,
        });
      }
    });

    // Check each mapping item
    mapping.items.forEach(item => {
      const column = columns.find(c => c.index === item.columnIndex);
      if (!column) return;

      // Check for duplicate field mappings
      if (item.targetFieldKey) {
        if (usedFields.has(item.targetFieldKey)) {
          errors.push({
            columnIndex: item.columnIndex,
            message: `Field is already mapped to another column`,
          });
        } else {
          usedFields.add(item.targetFieldKey);
        }
      }

      // Check custom field name validation
      if (item.targetFieldKey === null) {
        if (!item.customFieldName || item.customFieldName.trim() === '') {
          errors.push({
            columnIndex: item.columnIndex,
            message: 'Custom field name is required',
          });
        } else if (!/^[A-Za-z0-9_]+$/.test(item.customFieldName)) {
          errors.push({
            columnIndex: item.columnIndex,
            message: 'Custom field name must contain only letters, numbers, and underscores',
          });
        }
      }
    });

    return errors;
  }, [mapping, knownFields, columns]);

  const handleMappingItemChange = (newItem: MappingItem) => {
    if (!mapping) return;

    const updatedItems = mapping.items.filter(
      item => item.columnIndex !== newItem.columnIndex
    );
    
    // Only add the item if it has a valid mapping
    if (newItem.targetFieldKey || newItem.customFieldName) {
      updatedItems.push(newItem);
    }

    onMappingChange({
      ...mapping,
      items: updatedItems.sort((a, b) => a.columnIndex - b.columnIndex),
    });
  };

  const getColumnError = (columnIndex: number): string | undefined => {
    return validationErrors
      .find(error => error.columnIndex === columnIndex)
      ?.message;
  };

  const globalErrors = validationErrors.filter(error => error.columnIndex === -1);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (columns.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <SubtleAlert variant="info">
            No columns found. Please ensure your data source is configured correctly.
          </SubtleAlert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardContent className="p-0">
          {globalErrors.length > 0 && (
            <div className="p-4 border-b">
              <SubtleAlert variant="warning">
                <div className="space-y-1">
                  {globalErrors.map((error, index) => (
                    <div key={index}>{error.message}</div>
                  ))}
                </div>
              </SubtleAlert>
            </div>
          )}

          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-16 text-center">#</TableHead>
                  <TableHead className="min-w-[200px]">Source Column</TableHead>
                  <TableHead className="w-16 text-center">Preview</TableHead>
                  <TableHead className="min-w-[200px]">Target Field</TableHead>
                  <TableHead className="min-w-[200px]">Custom Field Name</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="min-w-[120px]">Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((column, index) => {
                  const currentMapping = mapping?.items.find(
                    item => item.columnIndex === column.index
                  );
                  const columnError = getColumnError(column.index);

                  return (
                    <motion.tr
                      key={column.index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      asChild
                    >
                      <ColumnRow
                        column={column}
                        knownFields={knownFields}
                        mapping={currentMapping || null}
                        onMappingChange={handleMappingItemChange}
                        onPreview={() => setPreviewColumn(column)}
                        hasError={!!columnError}
                        errorMessage={columnError}
                      />
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PreviewDrawer
        isOpen={!!previewColumn}
        onClose={() => setPreviewColumn(null)}
        column={previewColumn}
      />
    </>
  );
}
