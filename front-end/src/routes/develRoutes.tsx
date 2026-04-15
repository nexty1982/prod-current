/**
 * Developer tool routes — all /devel/*, /devel-tools/*, /tools/* paths
 * extracted from Router.tsx. Each route is a FullLayout child.
 */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import EnvironmentAwarePage from '../components/routing/EnvironmentAwarePage';
import OMDeps from '../features/devel-tools/om-deps/OM-deps';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ── Lazy imports ── */
const OmtraceConsole = Loadable(lazy(() => import('../features/devel-tools/omtrace/OmtraceConsole')));
const LoadingDemo = Loadable(lazy(() => import('../features/devel-tools/loading-demo/LoadingDemo')));
const MenuEditor = Loadable(lazy(() => import('../features/devel-tools/menu-editor/MenuEditor')));
const PageEditor = Loadable(lazy(() => import('../features/devel-tools/page-editor/PageEditor')));
const PageEditAuditPage = Loadable(lazy(() => import('../features/devel-tools/page-edit-audit/PageEditAuditPage')));
const RouterMenuStudio = Loadable(lazy(() => import('../features/devel-tools/RouterMenuStudio/RouterMenuStudioPage')));
const DynamicRecordsInspector = Loadable(lazy(() => import('../features/records-centralized/components/dynamic/DynamicRecordsInspector')));
const RefactorConsole = Loadable(lazy(() => import('../features/devel-tools/refactor-console/RefactorConsole')));
const ButtonShowcase = Loadable(lazy(() => import('../features/devel-tools/button-showcase/ButtonShowcase')));
const BasicRefactor = Loadable(lazy(() => import('../features/devel-tools/basic-refactor/BasicRefactor')));
const OMMagicImage = Loadable(lazy(() => import('../features/devel-tools/om-magic-image/om-magic-image')));
const USChurchMapPage = Loadable(lazy(() => import('../features/devel-tools/us-church-map/USChurchMapPage')));
const RepoOpsPage = Loadable(lazy(() => import('../features/devel-tools/repo-ops/RepoOpsPage')));
const OcrOperationsDashboard = Loadable(lazy(() => import('../features/devel-tools/ocr-operations/OcrOperationsDashboard')));
const OcrBatchManager = Loadable(lazy(() => import('../features/devel-tools/ocr-operations/OcrBatchManager')));
const WorkSessionAdmin = Loadable(lazy(() => import('../features/devel-tools/work-sessions/WorkSessionAdminPage')));
// ApiExplorerPage — migrated to OMAI (PR #99, OMD-1283). Route below redirects.
const LiveTableBuilderPage = Loadable(lazy(() => import('../features/devel-tools/live-table-builder/LiveTableBuilderPage')));
const TranslationManagerPage = Loadable(lazy(() => import('../features/devel-tools/translation-manager/TranslationManagerPage')));
const OMPermissionCenter = Loadable(lazy(() => import('../features/devel-tools/om-permission-center/PermissionsManagement')));
const InteractiveReportJobsPage = Loadable(lazy(() => import('../features/devel-tools/interactive-reports/InteractiveReportJobsPage')));
const PlatformStatusPage = Loadable(lazy(() => import('../features/devel-tools/platform-status/PlatformStatusPage')));
const CommandCenterPage = Loadable(lazy(() => import('../features/devel-tools/command-center/CommandCenterPage')));
const BadgeStateManagerPage = Loadable(lazy(() => import('../features/devel-tools/badge-state-manager/BadgeStateManagerPage')));
const BuildInfoPage = Loadable(lazy(() => import('../features/devel-tools/build-info/BuildInfoPage')));
const OmOcrStudioPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OmOcrStudioPage')));
const OCRSettingsPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OCRSettingsPage')));
const OcrSetupWizardPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrSetupWizardPage')));
const OcrReviewPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrReviewPage')));
const OcrTableExtractorPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrTableExtractorPage')));
const LayoutTemplateEditorPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/LayoutTemplateEditorPage')));
const OcrActivityMonitor = Loadable(lazy(() => import('../features/admin/OcrActivityMonitor')));
const GitOperations = Loadable(lazy(() => import('../features/devel-tools/git-operations/GitOperations')));
const OCRStudioPage = Loadable(lazy(() => import('../features/ocr/pages/OCRStudioPage')));
const OcrUploader = Loadable(lazy(() => import('../features/ocr/OcrUploader')));
const ChurchOCRPage = Loadable(lazy(() => import('../features/ocr/pages/ChurchOCRPage')));
const UploadRecordsPage = Loadable(lazy(() => import('../features/records-centralized/apps/upload-records/UploadRecordsPage')));

/**
 * All /devel/*, /devel-tools/*, /tools/* route definitions.
 * These are children of the FullLayout route.
 */
export const develRoutes = [
  {
    path: '/devel-tools/omtrace',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminErrorBoundary>
          <OmtraceConsole />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/tools/file-deps',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <OMDeps />
      </ProtectedRoute>
    ),
    meta: {
      requiresAuth: true,
      hidden: true
    }
  },
  {
    path: '/devel/router-menu-studio',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <RouterMenuStudio />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/menu-editor',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <MenuEditor />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/page-editor',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <EnvironmentAwarePage featureId="page-editor" priority={2} featureName="Page Content Editor">
          <PageEditor />
        </EnvironmentAwarePage>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/page-edit-audit',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <PageEditAuditPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/dynamic-records',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <DynamicRecordsInspector />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/refactor-console',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <RefactorConsole />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/button-showcase',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <ButtonShowcase />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/basic-refactor',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <BasicRefactor />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/om-magic-image',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <OMMagicImage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/crm',
    element: <Navigate to="/admin/control-panel" replace />,
  },
  {
    path: '/devel-tools/us-church-map',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin']}>
        <AdminErrorBoundary>
          <USChurchMapPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/repo-ops',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <EnvironmentAwarePage featureId="repo-ops">
          <RepoOpsPage />
        </EnvironmentAwarePage>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/git-operations',
    element: <Navigate to="/devel-tools/repo-ops" replace />,
  },
  // Record Creation Wizard — retired from OM, now on OMAI /omai/tools/om-seedlings
  {
    path: '/devel-tools/record-creation-wizard',
    element: <Navigate to="/admin/control-panel" replace />,
  },
  {
    path: '/devel-tools/ocr-operations',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OcrOperationsDashboard />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/ocr-batch-manager',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OcrBatchManager />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  // OM Tasks, Daily Tasks — retired from OM, now managed via OMAI OM Daily
  {
    path: '/devel-tools/work-session-admin',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <WorkSessionAdmin />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/api-explorer',
    element: <Navigate to="/admin/control-panel" replace />,
  },
  {
    path: '/apps/devel/loading-demo',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <LoadingDemo />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/live-table-builder',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <LiveTableBuilderPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/translation-manager',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <EnvironmentAwarePage featureId="translation-manager" priority={2} featureName="Translation Manager">
          <TranslationManagerPage />
        </EnvironmentAwarePage>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/om-permission-center',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin']}>
        <AdminErrorBoundary>
          <OMPermissionCenter />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/interactive-reports/jobs',
    element: (
      <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
        <EnvironmentAwarePage
          featureId="interactive-report-jobs"
          priority={4}
          featureName="Interactive Report Jobs"
        >
          <InteractiveReportJobsPage />
        </EnvironmentAwarePage>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/build-info',
    element: <Navigate to="/devel-tools/repo-ops" replace />,
  },
  {
    path: '/devel-tools/platform-status',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <PlatformStatusPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/command-center',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <CommandCenterPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/devel-tools/badge-state-manager',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <EnvironmentAwarePage featureId="badge-state-manager">
          <BadgeStateManagerPage />
        </EnvironmentAwarePage>
      </ProtectedRoute>
    )
  },
  // OCR Studio routes
  {
    path: '/devel/ocr-studio',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <EnvironmentAwarePage
            featureId="ocr-studio"
            priority={4}
            featureName="OCR Studio"
          >
            <OCRStudioPage />
          </EnvironmentAwarePage>
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-studio/church/:churchId',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <ChurchOCRPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-setup-wizard',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <OcrSetupWizardPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-studio/upload',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <EnvironmentAwarePage
            featureId="enhanced-ocr-uploader"
            priority={2}
            featureName="OCR Upload"
          >
            <UploadRecordsPage />
          </EnvironmentAwarePage>
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-studio/review/:churchId/:jobId',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <OcrReviewPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-studio/review/:churchId',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <OcrReviewPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-studio/jobs',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OcrActivityMonitor />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-studio/table-extractor',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OcrTableExtractorPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-studio/layout-templates',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <LayoutTemplateEditorPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-studio/settings',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <OCRSettingsPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/om-ocr-studio',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <UploadRecordsPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-settings',
    element: (
      <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
        <AdminErrorBoundary>
          <OCRSettingsPage />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
  {
    path: '/devel/ocr-activity-monitor',
    element: (
      <ProtectedRoute requiredRole={['super_admin']}>
        <AdminErrorBoundary>
          <OcrActivityMonitor />
        </AdminErrorBoundary>
      </ProtectedRoute>
    )
  },
];
