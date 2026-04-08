import React from 'react';
import { Box, Chip } from '@mui/material';
import {
  IconCircleCheck,
  IconAlertTriangle,
  IconCircleX,
  IconActivity,
} from '@tabler/icons-react';
import type { Component, ComponentsResponse } from '@/api/components.api';

export const getHealthColor = (health: string) => {
  switch (health) {
    case 'healthy':
      return { color: 'success', icon: IconCircleCheck, bgColor: '#e8f5e8' };
    case 'degraded':
      return { color: 'warning', icon: IconAlertTriangle, bgColor: '#fff8e1' };
    case 'failed':
      return { color: 'error', icon: IconCircleX, bgColor: '#ffebee' };
    default:
      return { color: 'default', icon: IconActivity, bgColor: '#f5f5f5' };
  }
};

export const formatLastUpdated = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

export const getHealthTooltip = (component: Component) => {
  const { health, healthIssues, lastHealthCheck } = component;

  let baseMessage = '';
  switch (health) {
    case 'healthy':
      baseMessage = 'This component is running normally and all checks are passing';
      break;
    case 'degraded':
      baseMessage = 'This component is experiencing issues but is still partially functional';
      break;
    case 'failed':
      baseMessage = 'This component has critical issues and may not be functioning properly';
      break;
    default:
      baseMessage = 'Component health status unknown';
  }

  let detectionInfo = '';
  if (health !== 'healthy' && healthIssues && healthIssues.length > 0) {
    detectionInfo = `\n\nDetected Issues:\n• ${healthIssues.join('\n• ')}`;
  }

  let healthCheckInfo = '';
  if (lastHealthCheck) {
    const checkTime = new Date(lastHealthCheck);
    const timeAgo = Math.round((Date.now() - checkTime.getTime()) / (1000 * 60));
    healthCheckInfo = `\n\nLast health check: ${timeAgo < 1 ? 'Just now' : `${timeAgo}m ago`}`;
  }

  return `${baseMessage}${detectionInfo}${healthCheckInfo}`;
};

export const isHealthAutoDetected = (component: Component): boolean => {
  return !!(component.healthIssues &&
    component.healthIssues.length > 0 &&
    component.lastHealthCheck &&
    component.health !== 'healthy');
};

export const getComponentCardClass = (component: Component) => {
  if (!component.enabled) {
    return {
      opacity: 0.5,
      filter: 'grayscale(0.7)',
      cursor: 'not-allowed',
      '&:hover': {
        boxShadow: 1,
        transform: 'none',
      },
    };
  }
  return {
    '&:hover': {
      boxShadow: 3,
      transform: 'translateY(-2px)',
    },
  };
};

export const getToggleTooltip = (enabled: boolean, canManage: boolean) => {
  if (!canManage) {
    return 'You need admin permissions to enable or disable components';
  }
  return enabled
    ? 'Click to disable this component across the system'
    : 'Click to enable this component across the system';
};

export const getRelativeTime = (timestamp: string | null): string => {
  if (!timestamp) return 'Never used';

  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return past.toLocaleDateString();
};

export const getUsageChip = (usageStatus: string, lastUsed: string | null) => {
  const configs = {
    active: { color: '#4caf50', bgColor: '#e8f5e8', icon: '🟢', label: 'Active' },
    inactive: { color: '#ff9800', bgColor: '#fff3e0', icon: '🟡', label: 'Inactive' },
    unused: { color: '#9e9e9e', bgColor: '#f5f5f5', icon: '⚪', label: 'Unused' },
  };

  const config = configs[usageStatus as keyof typeof configs] || configs.unused;

  return (
    <Chip
      size="small"
      label={
        <Box display="flex" alignItems="center" gap={0.5}>
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </Box>
      }
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 500,
        fontSize: '0.75rem',
      }}
    />
  );
};

export const calculateCategoryBreakdown = (components: Component[]) => {
  const breakdown: Record<string, any> = {};

  if (!Array.isArray(components)) {
    console.warn('calculateCategoryBreakdown: components is not an array:', components);
    return breakdown;
  }

  components.forEach(component => {
    const category = component.category || 'Uncategorized';
    if (!breakdown[category]) {
      breakdown[category] = {
        total: 0, healthy: 0, degraded: 0, failed: 0,
        enabled: 0, disabled: 0, active: 0, inactive: 0, unused: 0,
      };
    }

    breakdown[category].total++;
    breakdown[category][component.health]++;
    breakdown[category][component.enabled ? 'enabled' : 'disabled']++;
    breakdown[category][component.usageStatus]++;
  });

  return breakdown;
};

export const getFilteredSummary = (componentsData: ComponentsResponse | null) => {
  const components = Array.isArray(componentsData?.components) ? componentsData.components : [];
  const meta = componentsData?.meta;

  if (meta?.categoryBreakdown || meta?.usageStats) {
    return {
      total: meta.total || 0,
      healthy: meta.usageStats?.healthBreakdown?.healthy || components.filter(c => c.health === 'healthy').length,
      degraded: meta.usageStats?.healthBreakdown?.degraded || components.filter(c => c.health === 'degraded').length,
      failed: meta.usageStats?.healthBreakdown?.failed || components.filter(c => c.health === 'failed').length,
      active: meta.usageStats?.usageBreakdown?.active || components.filter(c => c.usageStatus === 'active').length,
      inactive: meta.usageStats?.usageBreakdown?.inactive || components.filter(c => c.usageStatus === 'inactive').length,
      unused: meta.usageStats?.usageBreakdown?.unused || components.filter(c => c.usageStatus === 'unused').length,
      enabled: meta.usageStats?.statusBreakdown?.enabled || components.filter(c => c.enabled).length,
      disabled: meta.usageStats?.statusBreakdown?.disabled || components.filter(c => !c.enabled).length,
    };
  }

  return {
    total: meta?.total || components.length,
    healthy: components.filter(c => c.health === 'healthy').length,
    degraded: components.filter(c => c.health === 'degraded').length,
    failed: components.filter(c => c.health === 'failed').length,
    active: components.filter(c => c.usageStatus === 'active').length,
    inactive: components.filter(c => c.usageStatus === 'inactive').length,
    unused: components.filter(c => c.usageStatus === 'unused').length,
    enabled: components.filter(c => c.enabled).length,
    disabled: components.filter(c => !c.enabled).length,
  };
};
