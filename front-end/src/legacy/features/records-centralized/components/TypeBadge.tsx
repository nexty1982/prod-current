/**
 * Type Badge Component
 * Displays data type with appropriate styling
 */

import React from 'react';
import { Badge } from '@/shared/ui/badge';

interface TypeBadgeProps {
  type: 'string' | 'date' | 'number' | 'enum' | 'bool';
  className?: string;
}

const typeConfig = {
  string: { label: 'Text', variant: 'secondary' as const },
  date: { label: 'Date', variant: 'outline' as const },
  number: { label: 'Number', variant: 'outline' as const },
  enum: { label: 'Choice', variant: 'outline' as const },
  bool: { label: 'Yes/No', variant: 'outline' as const },
};

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const config = typeConfig[type];
  
  return (
    <Badge 
      variant={config.variant}
      className={className}
    >
      {config.label}
    </Badge>
  );
}
