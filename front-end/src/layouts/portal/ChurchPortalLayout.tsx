import React from 'react';
import { PortalThemeProvider, usePortalTheme } from '@/features/portal/themes/PortalThemeContext';

function PortalLayoutShell() {
  const { bundle } = usePortalTheme();
  const Layout = bundle.Layout;
  return <Layout />;
}

const ChurchPortalLayout: React.FC = () => (
  <PortalThemeProvider>
    <PortalLayoutShell />
  </PortalThemeProvider>
);

export default ChurchPortalLayout;
