/**
 * Retry Button Component
 * Smart retry button with exponential backoff and status indication
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'react-toastify';

interface RetryButtonProps {
  onRetry: () => Promise<void>;
  maxRetries?: number;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  maxRetries = 3,
  disabled = false,
  size = 'default',
  variant = 'outline',
  className = ''
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);

  const handleRetry = async () => {
    if (isRetrying || cooldownTime > 0 || retryCount >= maxRetries) return;

    setIsRetrying(true);
    
    try {
      await onRetry();
      
      // Reset retry count on successful retry
      setRetryCount(0);
      toast.success('Retry successful');
    } catch (error) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      if (newRetryCount >= maxRetries) {
        toast.error('Maximum retry attempts reached');
      } else {
        // Exponential backoff: 2^retryCount seconds
        const backoffTime = Math.pow(2, newRetryCount);
        setCooldownTime(backoffTime);
        
        toast.error(`Retry failed. Next attempt available in ${backoffTime}s`);
        
        // Start countdown
        const countdown = setInterval(() => {
          setCooldownTime(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const getButtonText = () => {
    if (isRetrying) return 'Retrying...';
    if (cooldownTime > 0) return `Retry (${cooldownTime}s)`;
    if (retryCount >= maxRetries) return 'Max retries reached';
    if (retryCount > 0) return `Retry (${retryCount}/${maxRetries})`;
    return 'Retry';
  };

  const getButtonIcon = () => {
    if (isRetrying) {
      return <RefreshCw className="h-4 w-4 mr-2 animate-spin" />;
    }
    if (cooldownTime > 0) {
      return <Clock className="h-4 w-4 mr-2" />;
    }
    if (retryCount >= maxRetries) {
      return <AlertCircle className="h-4 w-4 mr-2" />;
    }
    return <RefreshCw className="h-4 w-4 mr-2" />;
  };

  const isDisabled = disabled || isRetrying || cooldownTime > 0 || retryCount >= maxRetries;

  return (
    <Button
      onClick={handleRetry}
      disabled={isDisabled}
      size={size}
      variant={variant}
      className={`
        ${className}
        ${retryCount >= maxRetries ? 'opacity-50 cursor-not-allowed' : ''}
        ${cooldownTime > 0 ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : ''}
      `}
    >
      {getButtonIcon()}
      {getButtonText()}
    </Button>
  );
};
