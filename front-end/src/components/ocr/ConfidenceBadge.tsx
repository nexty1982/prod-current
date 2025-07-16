/**
 * Confidence Badge Component
 * Visual indicator for OCR field confidence levels
 */

import React from 'react';
import { Badge } from '../ui/badge';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showPercentage?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  size = 'md',
  showIcon = true,
  showPercentage = true
}) => {
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 0.9) return 'high';
    if (conf >= 0.7) return 'medium';
    return 'low';
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceIcon = (level: string) => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    switch (level) {
      case 'high':
        return <CheckCircle2 className={`${iconSize} mr-1`} />;
      case 'medium':
        return <AlertTriangle className={`${iconSize} mr-1`} />;
      case 'low':
        return <AlertCircle className={`${iconSize} mr-1`} />;
      default:
        return null;
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-sm px-3 py-1';
      default:
        return 'text-xs px-2.5 py-0.5';
    }
  };

  const level = getConfidenceLevel(confidence);
  const percentage = Math.round(confidence * 100);

  return (
    <Badge 
      variant="outline" 
      className={`
        ${getConfidenceColor(level)} 
        ${getSizeClasses(size)}
        flex items-center font-medium border
      `}
    >
      {showIcon && getConfidenceIcon(level)}
      {showPercentage ? `${percentage}%` : level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
};
