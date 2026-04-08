/**
 * Admin routes — all /admin/* paths extracted from Router.tsx
 * Each route is a FullLayout child (no layout wrapper needed here).
 */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import EnvironmentAwarePage from '../components/routing/EnvironmentAwarePage';
import HeadlineSourcePicker from '../features/admin/headlines/HeadlineSourcePicker';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ── Lazy imports ── */
const OmaiBridge = Loadable(lazy(() => import('../features/admin/OmaiBridge')));
const MenuPermissions = Loadable(lazy(() => import('../features/admin/admin/MenuPermissions')));
const MenuManagement = Loadable(lazy(() => import('../features/admin/admin/MenuManagement')));
const AdminSettings = Loadable(lazy(() => import('../features/admin/admin/AdminSettings')));
const ChurchPublishingGuide = Loadable(lazy(() => import('../features/admin/components/ChurchPublishingGuide')));
const OMSiteSurvey = Loadable(lazy(() => import('../features/admin/admin/tools/OMSiteSurvey')));
const BlogAdmin = Loadable(lazy(() => import('../features/admin/admin/BlogAdmin')));
const SessionManagement = Loadable(lazy(() => import('../features/auth/admin/SessionManagement')));
const ActivityLogs = Loadable(lazy(() => import('../features/admin/admin/ActivityLogs')));
const ScriptRunner = Loadable(lazy(() => import('../features/admin/admin/ScriptRunner')));
const AIAdminPanel = Loadable(lazy(() => import('../features/admin/ai/AIAdminPanel')));
const AdminPageFallback = Loadable(lazy(() => import('../features/admin/admin/AdminPageFallback')));
const AdminControlPanel = Loadable(lazy(() => import('../features/admin/control-panel/AdminControlPanel')));
const ChurchManagementPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchManagementPage')));
const OrthodoxScheduleGuidelinesPage = Loadable(lazy(() => import('../features/admin/control-panel/OrthodoxScheduleGuidelinesPage')));
const PendingMembersPage = Loadable(lazy(() => import('../features/admin/control-panel/PendingMembersPage')));
const JurisdictionsPage = Loadable(lazy(() => import('../features/admin/control-panel/JurisdictionsPage')));
const DemoChurchesPage = Loadable(lazy(() => import('../features/admin/control-panel/DemoChurchesPage')));
const CertificateTemplatesPage = Loadable(lazy(() => import('../features/admin/control-panel/CertificateTemplatesPage')));
const ChurchLifecycleDetailPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchLifecycleDetailPage')));
const RecordsOCRPage = Loadable(lazy(() => import('../features/admin/control-panel/RecordsOCRPage')));
const SystemServerPage = Loadable(lazy(() => import('../features/admin/control-panel/SystemServerPage')));
const AIAutomationPage = Loadable(lazy(() => import('../features/admin/control-panel/AIAutomationPage')));
const CodeChangeDetection = Loadable(lazy(() => import('../features/admin/ai/CodeChangeDetection')));
const RecordsLandingConfig = Loadable(lazy(() => import('../features/admin/church-branding/RecordsLandingConfig')));
const OMAppSuitePage = Loadable(lazy(() => import('../features/admin/control-panel/OMAppSuitePage')));
const ComponentsInDevelopmentPage = Loadable(lazy(() => import('../features/admin/control-panel/ComponentsInDevelopmentPage')));
const DeprecatedComponentsPage = Loadable(lazy(() => import('../features/admin/control-panel/DeprecatedComponentsPage')));
const SDLCPage = Loadable(lazy(() => import('../features/admin/control-panel/SDLCPage')));
const UsersSecurityPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/UsersSecurityPage')));
const ContentMediaPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/ContentMediaPage')));
const SocialCommsPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/SocialCommsPage')));
const ServerDevOpsPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/ServerDevOpsPage')));
const PlatformConfigPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/PlatformConfigPage')));
const CodeSafetyPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/CodeSafetyPage')));
const SSLCertificatePage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/SSLCertificatePage')));
const OpsReportsPage = Loadable(lazy(() => import('../features/admin/ops/OpsReportsPage')));
const OrthodoxMetricsDash = Loadable(lazy(() => import('../features/admin/dashboard/OrthodoxMetrics')));
const OMBigBook = Loadable(lazy(() => import('../features/admin/OMBigBook')));
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../features/admin/admin/OMAIDiscoveryPanelMobile')));
const LogSearch = Loadable(lazy(() => import('../features/admin/dashboard/LogSearch')));
const ChurchAdminList = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminList')));
const ChurchAdminPanel = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminPanelWorking')));

/**
 * All /admin/* route definitions.
 * These are children of the FullLayout route.
 */
export const adminRoutes = [
  // OMAI Bridge — redirect to OMAI Berry with auth token
  {
    path: '/admin/omai',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <OmaiBridge />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/menu-permissions',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <MenuPermissions />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/menu-management',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <MenuManagement />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/settings',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminSettings />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/publishing-guide',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin']}>
        <ChurchPublishingGuide />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/tools/survey',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OMSiteSurvey />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/blog-admin',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'church_admin', 'admin']}>
        <AdminErrorBoundary>
          <BlogAdmin />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  // /admin/tutorials — migrated to OMAI (/omai/ops/tutorials)
  {
    path: '/admin/logs',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <ActivityLogs />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/sessions',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <SessionManagement />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/activity-logs',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <ActivityLogs />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/script-runner',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminErrorBoundary>
          <ScriptRunner />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/ai',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AIAdminPanel />
      </ProtectedRoute>
    )
  },
  // Removed: /admin/jit-terminal route
  {
    path: '/admin/headlines-config',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminErrorBoundary>
          <HeadlineSourcePicker />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminPageFallback />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <AdminControlPanel />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/church-management',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <ChurchManagementPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/church-management/sacramental-restrictions',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OrthodoxScheduleGuidelinesPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/pending-members',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <EnvironmentAwarePage featureId="pending-members" priority={4} featureName="Pending Members">
            <PendingMembersPage />
          </EnvironmentAwarePage>
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/church-onboarding',
    element: <Navigate to="/admin/control-panel" replace />,
  },
  {
    path: '/admin/control-panel/church-onboarding/:churchId',
    element: <Navigate to="/admin/control-panel" replace />,
  },
  {
    path: '/admin/control-panel/jurisdictions',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <EnvironmentAwarePage featureId="jurisdictions" priority={4} featureName="Jurisdictions">
            <JurisdictionsPage />
          </EnvironmentAwarePage>
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/demo-churches',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <EnvironmentAwarePage featureId="demo-churches" priority={4} featureName="Demo Churches">
            <DemoChurchesPage />
          </EnvironmentAwarePage>
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/certificate-templates',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <CertificateTemplatesPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/control-panel/church-pipeline',
    element: <Navigate to="/admin/control-panel" replace />,
  },
  // church-lifecycle list — retired from OM, feature now owned by OMAI (PP-0003)
  {
    path: '/admin/control-panel/church-lifecycle',
    element: <Navigate to="/admin/control-panel" replace />,
  },
  // church-lifecycle detail — OMAI opens this URL via window.open(); keep route for OMAI consumption
  {
    path: '/admin/control-panel/church-lifecycle/:churchId',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <EnvironmentAwarePage featureId="church-lifecycle-detail" priority={4} featureName="Church Lifecycle Detail">
            <ChurchLifecycleDetailPage />
          </EnvironmentAwarePage>
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  // Deprecated: onboarding-pipeline routes → redirect to church lifecycle (PP-0003 Stage 4)
  { path: '/admin/control-panel/onboarding-pipeline', element: <Navigate to="/admin/control-panel" replace /> },
  { path: '/admin/control-panel/onboarding-pipeline/:id', element: <Navigate to="/admin/control-panel" replace /> },
  {
    path: '/admin/control-panel/records-ocr',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <RecordsOCRPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  // /admin/control-panel/crm-outreach — migrated to OMAI
  {
    path: '/admin/control-panel/system-server',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <SystemServerPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/ai-automation',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <AIAutomationPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/ai/code-changes',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <EnvironmentAwarePage featureId="code-change-detection" priority={2} featureName="Code Change Detection">
          <CodeChangeDetection />
        </EnvironmentAwarePage>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/church-branding/records-landing',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin']}>
        <EnvironmentAwarePage featureId="records-landing-branding" priority={2} featureName="Records Landing Branding">
          <RecordsLandingConfig />
        </EnvironmentAwarePage>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/om-app-suite',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OMAppSuitePage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/components-in-development',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <ComponentsInDevelopmentPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/deprecated-components',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <DeprecatedComponentsPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/sdlc',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <SDLCPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/system-server/users-security',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <UsersSecurityPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/system-server/content-media',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <ContentMediaPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/system-server/social-comms',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <SocialCommsPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/system-server/server-devops',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <ServerDevOpsPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/system-server/platform-config',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <PlatformConfigPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/system-server/code-safety',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <CodeSafetyPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/control-panel/system-server/platform-config/ssl-certificates',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <SSLCertificatePage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/ops',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminErrorBoundary>
          <OpsReportsPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/orthodox-metrics',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <OrthodoxMetricsDash />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/bigbook',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminErrorBoundary>
          <OMBigBook />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/omai/mobile',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OMAIDiscoveryPanelMobile />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/log-search',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminErrorBoundary>
          <LogSearch />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/churches',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <ChurchAdminList />
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/church/:id',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <ChurchAdminPanel />
      </ProtectedRoute>
    )
  },
];
