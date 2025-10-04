/**
 * Field Select Component
 * Dropdown for selecting known fields or custom field option
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import { KnownField } from '../schemas';

interface FieldSelectProps {
  knownFields: KnownField[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

const CUSTOM_FIELD_VALUE = '__CUSTOM__';

export function FieldSelect({
  knownFields,
  value,
  onValueChange,
  placeholder = "Select a field...",
  disabled = false,
  'aria-label': ariaLabel,
}: FieldSelectProps) {
  const handleValueChange = (newValue: string) => {
    if (newValue === CUSTOM_FIELD_VALUE) {
      onValueChange(null); // null indicates custom field
    } else {
      onValueChange(newValue);
    }
  };

  const displayValue = value || (value === null ? CUSTOM_FIELD_VALUE : undefined);

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger 
        className="w-full"
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {knownFields.length > 0 && (
          <>
            {knownFields.map((field) => (
              <SelectItem key={field.key} value={field.key}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{field.label}</span>
                  {field.description && (
                    <span className="text-xs text-muted-foreground">
                      {field.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
            <Separator className="my-1" />
          </>
        )}
        <SelectItem value={CUSTOM_FIELD_VALUE}>
          <span className="text-muted-foreground italic">Use Custom Name...</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
