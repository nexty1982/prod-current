/**
 * Church Portal routes — the /portal/* layout block extracted from Router.tsx.
 * Exports the full top-level route object with ChurchPortalLayout wrapper.
 */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { RecordsRouteErrorBoundary } from '@/shared/ui/RecordsRouteErrorBoundary';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ── Lazy imports ── */
const ChurchPortalLayout = Loadable(lazy(() => import('../layouts/portal/ChurchPortalLayout')));
const ChurchPortalHub = Loadable(lazy(() => import('../features/portal/ChurchPortalHub')));
const PortalSettingsPage = Loadable(lazy(() => import('../features/portal/PortalSettingsPage')));
const PortalRecordsPage = Loadable(lazy(() => import('../features/portal/PortalRecordsPage')));
const PortalCertificatesPage = Loadable(lazy(() => import('../features/portal/PortalCertificatesPage')));
const BaptismRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/baptism/BaptismRecordsPage')));
const MarriageRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/marriage/MarriageRecordsPage')));
const FuneralRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/death/FuneralRecordsPage')));
const BaptismRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/baptism/BaptismRecordEntryPage')));
const MarriageRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/marriage/MarriageRecordEntryPage')));
const FuneralRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/funeral/FuneralRecordEntryPage')));
const UploadRecordsPage = Loadable(lazy(() => import('../features/records-centralized/apps/upload-records/UploadRecordsPage')));
const OMChartsPage = Loadable(lazy(() => import('../features/church/apps/om-charts/OMChartsPage')));
const CertificateGeneratorPage = Loadable(lazy(() => import('../features/certificates/CertificateGeneratorPage')));
const OrthodoxScheduleGuidelinesPage = Loadable(lazy(() => import('../features/admin/control-panel/OrthodoxScheduleGuidelinesPage')));
const OCRStudioPage = Loadable(lazy(() => import('../features/ocr/pages/OCRStudioPage')));
const OcrReviewPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrReviewPage')));
const UserGuide = Loadable(lazy(() => import('../features/help/UserGuide')));
const SiteMapPage = Loadable(lazy(() => import('../features/admin/SiteMapPage')));

/**
 * Top-level portal route object with ChurchPortalLayout.
 */
export const portalRoute = {
  path: '/portal',
  element: <ChurchPortalLayout />,
  children: [
    { index: true, element: <ChurchPortalHub /> },
    // Records hub — all church staff
    {
      path: 'records',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <PortalRecordsPage />
        </ProtectedRoute>
      ),
    },
    // Records — all church staff
    {
      path: 'records/baptism',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <RecordsRouteErrorBoundary>
            <BaptismRecordsPage />
          </RecordsRouteErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: 'records/baptism/new',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <BaptismRecordEntryPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'records/baptism/edit/:id',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <BaptismRecordEntryPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'records/marriage',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <RecordsRouteErrorBoundary>
            <MarriageRecordsPage />
          </RecordsRouteErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: 'records/marriage/new',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <MarriageRecordEntryPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'records/marriage/edit/:id',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <MarriageRecordEntryPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'records/funeral',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <RecordsRouteErrorBoundary>
            <FuneralRecordsPage />
          </RecordsRouteErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: 'records/funeral/new',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <FuneralRecordEntryPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'records/funeral/edit/:id',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <FuneralRecordEntryPage />
        </ProtectedRoute>
      ),
    },
    // Upload Records (church_admin + priest)
    {
      path: 'upload',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
          <UploadRecordsPage />
        </ProtectedRoute>
      ),
    },
    // Charts (church_admin + priest)
    {
      path: 'charts',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
          <OMChartsPage />
        </ProtectedRoute>
      ),
    },
    // Certificates — new template-based flow
    {
      path: 'certificates',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <PortalCertificatesPage />
        </ProtectedRoute>
      ),
    },
    // Certificates — legacy drag-and-drop generator
    {
      path: 'certificates/generate',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <CertificateGeneratorPage />
        </ProtectedRoute>
      ),
    },
    // Parish Settings
    {
      path: 'settings',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
          <PortalSettingsPage />
        </ProtectedRoute>
      ),
    },
    // User Profile → redirect to Account Hub
    {
      path: 'profile',
      element: <Navigate to="/account/profile" replace />,
    },
    // User Guide
    {
      path: 'guide',
      element: (
        <ProtectedRoute>
          <UserGuide />
        </ProtectedRoute>
      ),
    },
    // OCR Studio (portal version)
    {
      path: 'ocr',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
          <OCRStudioPage />
        </ProtectedRoute>
      ),
    },
    // OCR Jobs History (portal version)
    {
      path: 'ocr/jobs',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
          <OcrReviewPage />
        </ProtectedRoute>
      ),
    },
    // Sacramental Restrictions (portal version)
    {
      path: 'sacramental-restrictions',
      element: (
        <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          <OrthodoxScheduleGuidelinesPage />
        </ProtectedRoute>
      ),
    },
    // Site Map (portal version)
    {
      path: 'site-map',
      element: (
        <ProtectedRoute>
          <SiteMapPage />
        </ProtectedRoute>
      ),
    },
  ],
};
