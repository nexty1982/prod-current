/**
 * Subtle Alert Component
 * Minimal alert component for inline messages
 */

import React from 'react';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface SubtleAlertProps {
  variant?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
  className?: string;
}

const variantConfig = {
  info: { icon: Info, className: 'border-blue-200 bg-blue-50 text-blue-800' },
  warning: { icon: AlertTriangle, className: 'border-yellow-200 bg-yellow-50 text-yellow-800' },
  error: { icon: XCircle, className: 'border-red-200 bg-red-50 text-red-800' },
  success: { icon: CheckCircle, className: 'border-green-200 bg-green-50 text-green-800' },
};

export function SubtleAlert({ variant = 'info', children, className = '' }: SubtleAlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Alert className={`${config.className} ${className}`}>
      <Icon className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {children}
      </AlertDescription>
    </Alert>
  );
}
