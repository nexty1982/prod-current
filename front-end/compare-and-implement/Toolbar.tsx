/**
 * Toolbar Component
 * Controls for import/export, reset, and save operations
 */

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Save, 
  AlertTriangle 
} from 'lucide-react';
import { FieldMapping, FieldMappingSchema } from '../api/schemas';
import { SubtleAlert } from './SubtleAlert';

interface ToolbarProps {
  recordType: string;
  onRecordTypeChange: (recordType: string) => void;
  churchId: string;
  onChurchIdChange: (churchId: string) => void;
  currentMapping: FieldMapping | null;
  onImportMapping: (mapping: FieldMapping) => void;
  onResetMapping: () => void;
  onSaveMapping: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  validationErrors?: string[];
}

const RECORD_TYPES = [
  { value: 'baptisms', label: 'Baptisms' },
  { value: 'marriages', label: 'Marriages' },
  { value: 'funerals', label: 'Funerals' },
  { value: 'members', label: 'Members' },
] as const;

export function Toolbar({
  recordType,
  onRecordTypeChange,
  churchId,
  onChurchIdChange,
  currentMapping,
  onImportMapping,
  onResetMapping,
  onSaveMapping,
  isSaving = false,
  canSave = false,
  validationErrors = [],
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!currentMapping) return;

    const dataStr = JSON.stringify(currentMapping, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `field-mapping-${recordType}-${churchId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        
        // Validate against schema
        const mapping = FieldMappingSchema.parse(jsonData);
        
        // Coerce churchId and recordType to current values
        const normalizedMapping: FieldMapping = {
          ...mapping,
          churchId: churchId,
          recordType: recordType,
        };
        
        onImportMapping(normalizedMapping);
      } catch (error) {
        console.error('Failed to import mapping:', error);
        alert('Failed to import mapping. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="church-id">Church ID</Label>
          <Input
            id="church-id"
            placeholder="Enter church ID"
            value={churchId}
            onChange={(e) => onChurchIdChange(e.target.value)}
            className="w-[200px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="record-type">Record Type</Label>
          <Select value={recordType} onValueChange={onRecordTypeChange}>
            <SelectTrigger id="record-type" className="w-[150px]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {RECORD_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!currentMapping}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onResetMapping}
            disabled={!currentMapping}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          <Button
            onClick={onSaveMapping}
            disabled={!canSave || isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <SubtleAlert variant="warning">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Validation Issues</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </SubtleAlert>
        </motion.div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
        aria-label="Import field mapping file"
      />
    </div>
  );
}
