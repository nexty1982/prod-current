/**
 * Column Row Component
 * Individual table row for field mapping
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TableCell, TableRow } from '@/shared/ui/table';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Eye } from 'lucide-react';
import { Column, KnownField, MappingItem } from '../schemas';
import { FieldSelect } from './FieldSelect';
import { TypeBadge } from './TypeBadge';

interface ColumnRowProps {
  column: Column;
  knownFields: KnownField[];
  mapping: MappingItem | null;
  onMappingChange: (mapping: MappingItem) => void;
  onPreview: () => void;
  hasError?: boolean;
  errorMessage?: string;
}

export function ColumnRow({
  column,
  knownFields,
  mapping,
  onMappingChange,
  onPreview,
  hasError = false,
  errorMessage,
}: ColumnRowProps) {
  const selectedKnownField = mapping?.targetFieldKey 
    ? knownFields.find(f => f.key === mapping.targetFieldKey)
    : null;

  const isUsingCustomField = mapping?.targetFieldKey === null && mapping?.customFieldName;

  const handleFieldChange = (fieldKey: string | null) => {
    const newMapping: MappingItem = {
      columnIndex: column.index,
      targetFieldKey: fieldKey,
      customFieldName: fieldKey === null ? (mapping?.customFieldName || '') : null,
      outputType: fieldKey 
        ? knownFields.find(f => f.key === fieldKey)?.type || column.inferredType
        : mapping?.outputType || column.inferredType,
    };
    onMappingChange(newMapping);
  };

  const handleCustomFieldChange = (customName: string) => {
    if (!mapping) return;
    const newMapping: MappingItem = {
      ...mapping,
      customFieldName: customName,
    };
    onMappingChange(newMapping);
  };

  const handleTypeChange = (type: string) => {
    if (!mapping) return;
    const newMapping: MappingItem = {
      ...mapping,
      outputType: type as any,
    };
    onMappingChange(newMapping);
  };

  const previewText = column.sample.length > 0 
    ? column.sample.slice(0, 3).join(', ')
    : 'No data';

  return (
    <TableRow className={hasError ? 'bg-red-50 border-red-200' : undefined}>
      <TableCell className="font-medium text-center">
        {column.index + 1}
      </TableCell>
      
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">
            {column.header || <em className="text-muted-foreground">No header</em>}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
            {previewText}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreview}
          className="h-8 w-8 p-0"
          aria-label={`Preview column ${column.index + 1}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>

      <TableCell>
        <FieldSelect
          knownFields={knownFields}
          value={mapping?.targetFieldKey || null}
          onValueChange={handleFieldChange}
          placeholder="Select field..."
          aria-label={`Map column ${column.index + 1} to field`}
        />
      </TableCell>

      <TableCell>
        {isUsingCustomField ? (
          <Input
            placeholder="Enter custom field name"
            value={mapping?.customFieldName || ''}
            onChange={(e) => handleCustomFieldChange(e.target.value)}
            className={hasError ? 'border-red-300' : ''}
            aria-label={`Custom field name for column ${column.index + 1}`}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            {mapping?.targetFieldKey ? 'Using known field' : 'Select field first'}
          </div>
        )}
      </TableCell>

      <TableCell>
        <Select
          value={mapping?.outputType || column.inferredType}
          onValueChange={handleTypeChange}
          disabled={!mapping}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string">Text</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="enum">Choice</SelectItem>
            <SelectItem value="bool">Yes/No</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <TypeBadge type={column.inferredType} />
          {selectedKnownField?.required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        {hasError && errorMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-red-600 mt-1"
          >
            {errorMessage}
          </motion.div>
        )}
      </TableCell>
    </TableRow>
  );
}
