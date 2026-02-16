/**
 * Field Mapper Demo Page
 * Self-contained demo page for testing the field mapper
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';
import { 
  useKnownFields, 
  useColumnSample, 
  useFieldMapping, 
  useSaveFieldMapping 
} from '../api/queries';
import { FieldMapping } from '../api/schemas';
import { FieldMapperTable } from '../components/FieldMapperTable';
import { Toolbar } from '../components/Toolbar';
import { SubtleAlert } from '../components/SubtleAlert';

export default function FieldMapperDemoPage() {
  const [churchId, setChurchId] = useState('demo-church-001');
  const [recordType, setRecordType] = useState('baptisms');

  // Queries
  const knownFieldsQuery = useKnownFields(recordType);
  const columnsQuery = useColumnSample(churchId, recordType);
  const mappingQuery = useFieldMapping(churchId, recordType);
  const saveMappingMutation = useSaveFieldMapping(churchId, recordType);

  // Local state for the mapping
  const [localMapping, setLocalMapping] = useState<FieldMapping | null>(null);

  // Use server mapping as base, then local overrides
  const currentMapping = localMapping || mappingQuery.data || null;

  // Initialize local mapping when server data loads
  React.useEffect(() => {
    if (mappingQuery.data && !localMapping) {
      setLocalMapping(mappingQuery.data);
    }
  }, [mappingQuery.data, localMapping]);

  // Reset local mapping when church/record type changes
  React.useEffect(() => {
    setLocalMapping(null);
  }, [churchId, recordType]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    
    if (!churchId.trim()) {
      errors.push('Church ID is required');
    }
    
    if (!recordType.trim()) {
      errors.push('Record type is required');
    }

    if (currentMapping && knownFieldsQuery.data) {
      const requiredFields = knownFieldsQuery.data.filter(f => f.required);
      const mappedFieldKeys = new Set(
        currentMapping.items
          .filter(item => item.targetFieldKey)
          .map(item => item.targetFieldKey!)
      );

      requiredFields.forEach(field => {
        if (!mappedFieldKeys.has(field.key)) {
          errors.push(`Required field "${field.label}" is not mapped`);
        }
      });

      // Check for duplicate mappings
      const usedFields = new Set<string>();
      currentMapping.items.forEach(item => {
        if (item.targetFieldKey && usedFields.has(item.targetFieldKey)) {
          errors.push(`Duplicate mapping for field "${item.targetFieldKey}"`);
        }
        if (item.targetFieldKey) {
          usedFields.add(item.targetFieldKey);
        }
      });

      // Check custom field names
      currentMapping.items.forEach(item => {
        if (item.targetFieldKey === null) {
          if (!item.customFieldName || item.customFieldName.trim() === '') {
            errors.push('Some custom field names are empty');
          } else if (!/^[A-Za-z0-9_]+$/.test(item.customFieldName)) {
            errors.push('Custom field names must contain only letters, numbers, and underscores');
          }
        }
      });
    }

    return errors;
  }, [currentMapping, knownFieldsQuery.data, churchId, recordType]);

  const canSave = validationErrors.length === 0 && 
    currentMapping && 
    currentMapping.items.length > 0 &&
    !saveMappingMutation.isPending;

  const handleMappingChange = (newMapping: FieldMapping) => {
    setLocalMapping(newMapping);
  };

  const handleImportMapping = (importedMapping: FieldMapping) => {
    setLocalMapping(importedMapping);
  };

  const handleResetMapping = () => {
    if (mappingQuery.data) {
      setLocalMapping(mappingQuery.data);
    } else {
      setLocalMapping({
        churchId,
        recordType,
        items: [],
      });
    }
  };

  const handleSaveMapping = () => {
    if (!currentMapping || !canSave) return;
    
    saveMappingMutation.mutate(currentMapping, {
      onSuccess: () => {
        // Refresh the server data
        mappingQuery.refetch();
      },
    });
  };

  const isLoading = knownFieldsQuery.isLoading || 
    columnsQuery.isLoading || 
    mappingQuery.isLoading;

  const hasError = knownFieldsQuery.isError || 
    columnsQuery.isError || 
    mappingQuery.isError;

  // Initialize mapping if we have columns but no mapping
  React.useEffect(() => {
    if (columnsQuery.data && !currentMapping && !isLoading) {
      const initialMapping: FieldMapping = {
        churchId,
        recordType,
        items: [],
      };
      setLocalMapping(initialMapping);
    }
  }, [columnsQuery.data, currentMapping, isLoading, churchId, recordType]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Field Mapper</h1>
          <Badge variant="outline">Demo</Badge>
        </div>
        <p className="text-muted-foreground">
          Map imported data columns to canonical record fields for your church records.
        </p>
      </motion.div>

      {saveMappingMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <SubtleAlert variant="success">
            Field mapping saved successfully!
          </SubtleAlert>
        </motion.div>
      )}

      {saveMappingMutation.isError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <SubtleAlert variant="error">
            Failed to save field mapping. Please try again.
          </SubtleAlert>
        </motion.div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Set up your church and record type, then configure field mappings below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Toolbar
            recordType={recordType}
            onRecordTypeChange={setRecordType}
            churchId={churchId}
            onChurchIdChange={setChurchId}
            currentMapping={currentMapping}
            onImportMapping={handleImportMapping}
            onResetMapping={handleResetMapping}
            onSaveMapping={handleSaveMapping}
            isSaving={saveMappingMutation.isPending}
            canSave={canSave}
            validationErrors={validationErrors}
          />
        </CardContent>
      </Card>

      {hasError && (
        <SubtleAlert variant="error">
          Failed to load data. Please check your connection and try again.
        </SubtleAlert>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading field mapper data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !hasError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <FieldMapperTable
            columns={columnsQuery.data || []}
            knownFields={knownFieldsQuery.data || []}
            mapping={currentMapping}
            onMappingChange={handleMappingChange}
            isLoading={isLoading}
          />
        </motion.div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>
          This is a demo of the Field Mapper component. 
          In production, this would be integrated into your record import workflow.
        </p>
      </div>
    </div>
  );
}
