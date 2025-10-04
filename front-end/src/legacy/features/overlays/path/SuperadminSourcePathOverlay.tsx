import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface SuperadminSourcePathOverlayProps {
  // No props needed - will get user from auth context
}

const SuperadminSourcePathOverlay: React.FC<SuperadminSourcePathOverlayProps> = () => {
  const location = useLocation();
  const { user, isSuperAdmin } = useAuth();

  // Only render for superadmins
  if (!user || !isSuperAdmin()) {
    return null;
  }

  // Get current route path as fallback
  const currentPath = location.pathname;
  
  // Try to determine source file path based on route patterns
  const getSourcePath = (routePath: string): string => {
    const pathMappings: Record<string, string> = {
      '/dashboard': 'src/pages/Dashboard.tsx',
      '/records': 'src/features/records-centralized/shared/ui/legacy/../features/records/records/DynamicRecordsManager.tsx',
      '/../features/records/records/baptism': 'src/features/records-centralized/shared/ui/legacy/baptism/BaptismRecordsPage.tsx',
      '/../features/records/records/marriage': 'src/features/records-centralized/shared/ui/legacy/marriage/MarriageRecordsPage.tsx',
      '/../features/records/records/death': 'src/features/records-centralized/shared/ui/legacy/death/DeathRecordsPage.tsx',
      '/../features/records/records/communion': 'src/features/records-centralized/shared/ui/legacy/communion/CommunionRecordsPage.tsx',
      '/../features/records/records/confirmation': 'src/features/records-centralized/shared/ui/legacy/confirmation/ConfirmationRecordsPage.tsx',
      '/../features/records/records/census': 'src/features/records-centralized/shared/ui/legacy/census/CensusRecordsPage.tsx',
      '/../features/records/records/members': 'src/features/records-centralized/shared/ui/legacy/members/MembersRecordsPage.tsx',
      '/account': 'src/features/account/pages/AccountPage.tsx',
      '/auth/login': 'src/features/auth/pages/LoginPage.tsx',
      '/church': 'src/features/church/pages/ChurchPage.tsx',
      '/church-management': 'src/features/church-management/pages/ChurchManagementPage.tsx',
    };

    // Check for exact match first
    if (pathMappings[routePath]) {
      return pathMappings[routePath];
    }

    // Check for partial matches
    for (const [pattern, sourcePath] of Object.entries(pathMappings)) {
      if (routePath.startsWith(pattern)) {
        return sourcePath;
      }
    }

    // Dynamic route patterns
    if (routePath.match(/^\/records\/\w+$/)) {
      return 'src/features/records-centralized/shared/ui/legacy/DynamicRecordsPage.tsx';
    }

    if (routePath.match(/^\/account\//)) {
      return 'src/features/account/shared/ui/legacy/AccountSubPage.tsx';
    }

    if (routePath.match(/^\/admin\//)) {
      return 's@/features/admin/pages/AdminPage.tsx';
    }

    // Fallback to route path
    return `Route: ${routePath}`;
  };

  const displayPath = getSourcePath(currentPath);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        fontFamily: 'Monaco, Menlo, "Courier New", monospace',
        fontSize: '11px',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
        zIndex: 9999,
        maxWidth: '400px',
        wordBreak: 'break-all',
        lineHeight: '1.4',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ opacity: 0.7, fontSize: '10px', marginBottom: '2px' }}>
        SOURCE:
      </div>
      <div>{displayPath}</div>
    </div>
  );
};

export default SuperadminSourcePathOverlay;
