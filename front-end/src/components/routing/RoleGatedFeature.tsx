/**
 * Role-Gated Feature Component
 * 
 * Higher-Order Component (HOC) that conditionally renders features
 * based on user role and environment settings.
 * 
 * Usage:
 * 
 * 1. Wrap a component:
 *    <RoleGatedFeature featureId="interactive-reports">
 *      <InteractiveReportJobsPage />
 *    </RoleGatedFeature>
 * 
 * 2. With fallback:
 *    <RoleGatedFeature 
 *      featureId="baptism-records-v2"
 *      fallback={<LegacyBaptismRecords />}
 *    >
 *      <NewBaptismRecordsPage />
 *    </RoleGatedFeature>
 * 
 * 3. By priority level:
 *    <RoleGatedFeature priority={3}>
 *      <ReconstructedFeature />
 *    </RoleGatedFeature>
 * 
 * 4. By risk level:
 *    <RoleGatedFeature riskLevel="high">
 *      <ExperimentalFeature />
 *    </RoleGatedFeature>
 */

import React from 'react';
import { Box, Typography, Alert, Paper, Chip } from '@mui/material';
import { useEnvironment, FeatureRiskLevel, FeaturePriority } from '../../context/EnvironmentContext';
import { useAuth } from '../../context/AuthContext';

interface RoleGatedFeatureProps {
  children: React.ReactNode;
  
  // Feature identification (for feature flag lookup)
  featureId?: string;
  
  // Priority level (1-4 = high-risk, 5 = production-ready)
  priority?: FeaturePriority;
  
  // Risk level from Refactor Console
  riskLevel?: FeatureRiskLevel;
  
  // Fallback component for non-authorized users
  fallback?: React.ReactNode;
  
  // Show "coming soon" message instead of nothing
  showComingSoon?: boolean;
  
  // Custom message for coming soon
  comingSoonMessage?: string;
  
  // For super_admin users only (stricter than priority check)
  superAdminOnly?: boolean;
}

// Default "Coming Soon" component
const ComingSoonMessage: React.FC<{ featureName?: string; message?: string }> = ({ 
  featureName, 
  message 
}) => (
  <Paper 
    elevation={0} 
    sx={{ 
      p: 4, 
      textAlign: 'center',
      bgcolor: 'background.default',
      border: '1px dashed',
      borderColor: 'divider',
      borderRadius: 2,
    }}
  >
    <Box sx={{ mb: 2 }}>
      <Chip 
        label="Coming Soon" 
        color="primary" 
        size="small"
        sx={{ fontWeight: 600 }}
      />
    </Box>
    <Typography variant="h6" color="text.secondary" gutterBottom>
      {featureName || 'This Feature'} is Under Development
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {message || 'This feature is currently being developed and will be available to all users soon.'}
    </Typography>
  </Paper>
);

// Development banner for latest environment
const LatestEnvironmentBanner: React.FC<{ featureId?: string }> = ({ featureId }) => (
  <Alert 
    severity="info" 
    sx={{ 
      mb: 2,
      '& .MuiAlert-icon': {
        fontSize: '1.5rem',
      }
    }}
  >
    <Typography variant="body2">
      🧪 <strong>Latest Environment</strong> — You're viewing a feature in development
      {featureId && <> ({featureId})</>}. This feature is not yet available to regular users.
    </Typography>
  </Alert>
);

const RoleGatedFeature: React.FC<RoleGatedFeatureProps> = ({
  children,
  featureId,
  priority,
  riskLevel,
  fallback,
  showComingSoon = false,
  comingSoonMessage,
  superAdminOnly = false,
}) => {
  const { 
    environment,
    hasLatestAccess, 
    isFeatureEnabled, 
    shouldShowFeature, 
    shouldShowPriority,
    loading 
  } = useEnvironment();
  const { user } = useAuth();

  // Loading state
  if (loading) {
    return null;
  }

  // Determine if user should see this feature
  let shouldShow = true;

  // Super admin only check (strictest)
  if (superAdminOnly) {
    shouldShow = user?.role === 'super_admin';
  }
  // Feature ID check
  else if (featureId) {
    shouldShow = isFeatureEnabled(featureId);
  }
  // Priority level check
  else if (priority !== undefined) {
    shouldShow = shouldShowPriority(priority);
  }
  // Risk level check
  else if (riskLevel) {
    shouldShow = shouldShowFeature(riskLevel);
  }

  // User should not see this feature
  if (!shouldShow) {
    // Return fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show "coming soon" message if requested
    if (showComingSoon) {
      return (
        <ComingSoonMessage 
          featureName={featureId} 
          message={comingSoonMessage} 
        />
      );
    }

    // Return nothing
    return null;
  }

  // User should see this feature
  // For latest environment, optionally show a development banner
  const showDevBanner = hasLatestAccess && (
    (priority !== undefined && priority <= 4) ||
    riskLevel === 'high' ||
    riskLevel === 'medium'
  );

  return (
    <>
      {showDevBanner && <LatestEnvironmentBanner featureId={featureId} />}
      {children}
    </>
  );
};

// HOC version for wrapping components
export function withRoleGating<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<RoleGatedFeatureProps, 'children'>
): React.FC<P> {
  const GatedComponent: React.FC<P> = (props) => (
    <RoleGatedFeature {...options}>
      <WrappedComponent {...props} />
    </RoleGatedFeature>
  );

  GatedComponent.displayName = `RoleGated(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return GatedComponent;
}

// Convenience components for common use cases
export const HighRiskFeature: React.FC<{ 
  children: React.ReactNode; 
  featureId?: string;
  fallback?: React.ReactNode;
}> = ({ children, featureId, fallback }) => (
  <RoleGatedFeature riskLevel="high" featureId={featureId} fallback={fallback}>
    {children}
  </RoleGatedFeature>
);

export const SuperAdminFeature: React.FC<{ 
  children: React.ReactNode;
  showComingSoon?: boolean;
}> = ({ children, showComingSoon }) => (
  <RoleGatedFeature superAdminOnly showComingSoon={showComingSoon}>
    {children}
  </RoleGatedFeature>
);

export const ReconstructedFeature: React.FC<{ 
  children: React.ReactNode; 
  priority: FeaturePriority;
  fallback?: React.ReactNode;
}> = ({ children, priority, fallback }) => (
  <RoleGatedFeature priority={priority} fallback={fallback}>
    {children}
  </RoleGatedFeature>
);

export default RoleGatedFeature;
