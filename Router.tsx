// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import HeadlineSourcePicker from '../components/headlines/HeadlineSourcePicker';
import SmartRedirect from '../components/routing/SmartRedirect';
import AppErrorBoundary from '@/shared/ui/AppErrorBoundary';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import OMDeps from '../tools/om-deps/OM-deps';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const ModernDash = Loadable(lazy(() => import('../features/dashboard/ModernDashboard')));
const EcommerceDash = Loadable(lazy(() => import('../features/dashboard/Ecommerce')));
const OrthodoxMetricsDash = Loadable(lazy(() => import('../features/admin/dashboard/OrthodoxMetrics')));

/* ****Apps***** */
const Contacts = Loadable(lazy(() => import('../features/apps/contacts/Contacts')));
// Removed: ChatApp from misc-legacy
const Notes = Loadable(lazy(() => import('../features/apps/notes/Notes')));
const Tickets = Loadable(lazy(() => import('../features/apps/tickets/Tickets')));
const ImageAI = Loadable(lazy(() => import('../features/apps/image-ai/ImageAI')));

/* ****Developer Tools***** */
const SiteStructureVisualizer = Loadable(lazy(() => import('../tools/SiteStructureVisualizer')));
const OmtraceConsole = Loadable(lazy(() => import('../components/ui-tools/omtrace/OmtraceConsole')));
const Kanban = Loadable(lazy(() => import('../features/apps/kanban/Kanban')));
const InvoiceList = Loadable(lazy(() => import('../features/apps/invoice/List')));
const InvoiceCreate = Loadable(lazy(() => import('../features/apps/invoice/Create')));
const InvoiceDetail = Loadable(lazy(() => import('../features/apps/invoice/Detail')));
const InvoiceEdit = Loadable(lazy(() => import('../features/apps/invoice/Edit')));
// Removed: LiturgicalCalendarPage, SiteClone from misc-legacy
const Logs = Loadable(lazy(() => import('../features/system/apps/logs/Logs')));
const UserProfile = Loadable(lazy(() => import('../features/apps/user-profile/UserProfile')));
const Followers = Loadable(lazy(() => import('../features/apps/user-profile/Followers')));
const Friends = Loadable(lazy(() => import('../features/apps/user-profile/Friends')));
const UserProfileGallery = Loadable(lazy(() => import('../features/apps/user-profile/Gallery')));
const Email = Loadable(lazy(() => import('../features/apps/email/Email')));

/* ****Social Features***** */
const SocialChat = Loadable(lazy(() => import('../features/social/chat/SocialChat')));
const NotificationCenter = Loadable(lazy(() => import('../features/social/notifications/NotificationCenter')));
const SocialFriends = Loadable(lazy(() => import('../features/social/friends/FriendsList')));

// Orthodox Headlines
// Removed: OrthodoxHeadlines from misc-legacy

// OMAI Task Assignment
// Removed: AssignTaskPage from misc-legacy

// 404 Page
// Removed: NotFound404 from misc-legacy - redirects to Super Dashboard

// Church Management
const ChurchList = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchList')));
const ChurchForm = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchForm')));
const ChurchSetupWizard = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchSetupWizard')));
const FieldMapperPage = Loadable(lazy(() => import('../features/church/FieldMapperPage')));
const RecordsPageWrapper = Loadable(lazy(() => import('../features/records/apps/church-management/RecordsPageWrapper')));

// Records Management
const AdvancedGridPage = Loadable(lazy(() => import('../features/tables/AdvancedGridPage')));
//const RecordsGridPage = Loadable(lazy(() => import('../features/records/apps/records-grid/RecordsGridPage')));
//const ChurchRecordsSimplePage = Loadable(lazy(() => import('../features/records/records/ChurchRecordsSimplePage')));
//const DynamicRecordsPageWrapper = Loadable(lazy(() => import('../features/records/apps/records/DynamicRecordsPageWrapper')));
const EnhancedRecordsGrid = Loadable(lazy(() => import('../features/records/EnhancedRecordsGrid')));

// Records Centralized Pages (unchanged by phase3)
const BaptismRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/baptism/BaptismRecordsPage')));
const MarriageRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/marriage/MarriageRecordsPage')));
const FuneralRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/death/FuneralRecordsPage')));
const CentralizedRecordsPageWrapper = Loadable(lazy(() => import('../features/records-centralized/components/records/RecordsPageWrapper')));
//const DynamicRecordsManager = Loadable(lazy(() => import('../features/records-centralized/components/records/DynamicRecordsManager')));
//const ModernDynamicRecordsManager = Loadable(lazy(() => import('../features/records-centralized/components/records/ModernDynamicRecordsManager')));
//const EditableRecordPage = Loadable(lazy(() => import('../features/records-centralized/components/records/EditableRecordPage')));

// Settings
// Removed: MenuSettings from misc-legacy
const JITTerminalAccess = Loadable(lazy(() => import('../features/security/settings/JITTerminalAccess')));

// Notifications
// Removed: NotificationList, NotificationPreferences from misc-legacy

// Admin
const UserManagement = Loadable(lazy(() => import('../features/admin/admin/UserManagement')));
const PermissionsManagement = Loadable(lazy(() => import('../features/admin/admin/PermissionsManagement')));
const AdminSettings = Loadable(lazy(() => import('../features/admin/admin/AdminSettings')));
const OMSiteSurvey = Loadable(lazy(() => import('../features/admin/admin/tools/OMSiteSurvey')));
// Removed: BlogFeed from misc-legacy
const BlogAdmin = Loadable(lazy(() => import('../features/admin/admin/BlogAdmin')));
const SessionManagement = Loadable(lazy(() => import('../features/auth/admin/SessionManagement')));
const AdminLogs = Loadable(lazy(() => import('../features/admin/admin/AdminLogs')));
const ActivityLogs = Loadable(lazy(() => import('../features/admin/admin/ActivityLogs')));
const MenuPermissions = Loadable(lazy(() => import('../features/admin/admin/MenuPermissions')));
const MenuManagement = Loadable(lazy(() => import('../features/admin/admin/MenuManagement')));
const OrthodMetricsAdmin = Loadable(lazy(() => import('../features/admin/admin/OrthodoxMetricsAdmin')));
const AIAdminPanel = Loadable(lazy(() => import('../features/admin/ai/AIAdminPanel')));
const OMAIUltimateLogger = Loadable(lazy(() => import('../features/admin/logs/LoggerDashboard')));
const ScriptRunner = Loadable(lazy(() => import('../features/admin/admin/ScriptRunner')));
const SuperDashboard = Loadable(lazy(() => import('../features/devel-tools/users-customized-landing/SuperDashboard')));
const RouterMenuStudio = Loadable(lazy(() => import('../features/router-menu-studio/RouterMenuStudioPage')));
const DynamicRecordsInspector = Loadable(lazy(() => import('../features/records-centralized/components/dynamic/DynamicRecordsInspector')));
const RefactorConsole = Loadable(lazy(() => import('../features/devel-tools/refactor-console/RefactorConsole')));
const OMSpecDocumentation = Loadable(lazy(() => import('../features/devel-tools/system-documentation/om-spec/OMSpecDocumentation')));
const OMMagicImage = Loadable(lazy(() => import('../features/devel-tools/om-magic-image/om-magic-image')));
const OCRStudioPage = Loadable(lazy(() => import('../features/ocr/pages/OCRStudioPage')));
const ChurchOCRPage = Loadable(lazy(() => import('../features/ocr/pages/ChurchOCRPage')));

// Removed: JITTerminal from misc-legacy
const JITTerminalConsole = Loadable(lazy(() => import('../features/admin/admin/JITTerminalConsole')));

// AI Lab
// Removed: All sandbox components from misc-legacy
const AdminDashboardLayout = Loadable(lazy(() => import('../features/admin/admin/AdminDashboardLayout')));
const AdminPageFallback = Loadable(lazy(() => import('../features/admin/admin/AdminPageFallback')));

// Big Book System
const OMBigBook = Loadable(lazy(() => import('../features/admin/admin/OMBigBook')));
const BigBookDynamicRoute = Loadable(lazy(() => import('../features/admin/admin/BigBookDynamicRoute')));

// OMAI Mobile
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../features/admin/admin/OMAIDiscoveryPanelMobile')));

// Component Registry for Dynamic Addons
// Removed: DynamicAddonRoute from misc-legacy

// OMLearn Module (unchanged in phase3 map)
const OMLearn = Loadable(lazy(() => import('../modules/OMLearn/OMLearn')));

// Build System
const BuildConsole = Loadable(lazy(() => import('../features/admin/admin/BuildConsole')));

// Records Pages
import { RECORDS_LEGACY_ENABLED } from '../config/featureFlags';

const ChurchAdminList = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminList')));
const ChurchAdminPanel = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminPanelWorking')));


// Records UI Page
const RecordsUIPage = Loadable(lazy(() => import('../features/records/apps/records-ui/index')));

// ui components
// Removed: All MUI UI components from misc-legacy

// form elements
// Removed: All MUI form elements from misc-legacy

// forms
// Removed: All form components from misc-legacy

// pages
// Removed: RollbaseCASL, Faq, Pricing, AccountSetting from misc-legacy

// charts
// Removed: All chart components from misc-legacy

// tables
const BasicTable = Loadable(lazy(() => import('../features/tables/tables/BasicTable')));
const EnhanceTable = Loadable(lazy(() => import('../features/tables/tables/EnhanceTable')));
const PaginationTable = Loadable(lazy(() => import('../features/tables/tables/PaginationTable')));
const FixedHeaderTable = Loadable(lazy(() => import('../features/tables/tables/FixedHeaderTable')));
const CollapsibleTable = Loadable(lazy(() => import('../features/tables/tables/CollapsibleTable')));
const SearchTable = Loadable(lazy(() => import('../features/tables/tables/SearchTable')));

// react tables
const ReactBasicTable = Loadable(lazy(() => import('../features/tables/react-tables/basic/page')));
const ReactColumnVisibilityTable = Loadable(
  lazy(() => import('../features/tables/react-tables/columnvisibility/page')),
);
const ReactDenseTable = Loadable(lazy(() => import('../features/tables/react-tables/dense/page')));
const ReactDragDropTable = Loadable(lazy(() => import('../features/tables/react-tables/drag-drop/page')));
const ReactEditableTable = Loadable(lazy(() => import('../features/tables/react-tables/editable/page')));
const ReactEmptyTable = Loadable(lazy(() => import('../features/tables/react-tables/empty/page')));
const ReactExpandingTable = Loadable(lazy(() => import('../features/tables/react-tables/expanding/page')));
const ReactFilterTable = Loadable(lazy(() => import('../features/tables/react-tables/filtering/page')));
const ReactPaginationTable = Loadable(lazy(() => import('../features/tables/react-tables/pagination/page')));
const ReactRowSelectionTable = Loadable(
  lazy(() => import('../features/tables/react-tables/row-selection/page')),
);

const ReactSortingTable = Loadable(lazy(() => import('../features/tables/react-tables/sorting/page')));
const ReactStickyTable = Loadable(lazy(() => import('../features/tables/react-tables/sticky/page')));

// mui charts (Recharts demos)
// Removed: All MUI chart demos from misc-legacy

// mui trees
// Removed: All MUI tree components from misc-legacy

// widgets
// Removed: All widget components from misc-legacy

// authentication
const OrthodoxLogin = Loadable(lazy(() => import('../features/auth/authentication/auth1/OrthodoxLogin')));
const Login2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/Login2')));
const Register = Loadable(lazy(() => import('../features/auth/authentication/auth1/Register')));
const Register2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('../features/auth/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/ForgotPassword2')));
const TwoSteps = Loadable(lazy(() => import('../features/auth/authentication/auth1/TwoSteps')));
const TwoSteps2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/TwoSteps2')));
const Error = Loadable(lazy(() => import('../features/auth/authentication/Error')));
const Unauthorized = Loadable(lazy(() => import('../features/auth/authentication/Unauthorized')));
const Maintenance = Loadable(lazy(() => import('../features/auth/authentication/Maintenance')));

// landingpage
const Landingpage = Loadable(lazy(() => import('../features/pages/landingpage/Landingpage')));

// front end pages
const Homepage = Loadable(lazy(() => import('../features/pages/frontend-pages/Homepage')));
// Removed: HomepageOriginal - old homepage, no longer used
const About = Loadable(lazy(() => import('../features/pages/frontend-pages/About')));
const Contact = Loadable(lazy(() => import('../features/pages/frontend-pages/Contact')));
const Portfolio = Loadable(lazy(() => import('../features/pages/frontend-pages/Portfolio')));
const PagePricing = Loadable(lazy(() => import('../features/pages/frontend-pages/Pricing')));
const BlogPage = Loadable(lazy(() => import('../features/pages/frontend-pages/Blog')));
const BlogPost = Loadable(lazy(() => import('../features/pages/frontend-pages/BlogPost')));
const PagesMenu = Loadable(lazy(() => import('../features/pages/frontend-pages/PagesMenu')));
const HTMLViewer = Loadable(lazy(() => import('../features/pages/frontend-pages/HTMLViewer')));
const GreekRecordsViewer = Loadable(lazy(() => import('../features/pages/frontend-pages/GreekRecordsViewer')));
const Samples = Loadable(lazy(() => import('../features/pages/frontend-pages/Samples')));
const Gallery = Loadable(lazy(() => import('../features/devel-tools/om-gallery/Gallery')));
const OCATimeline = Loadable(lazy(() => import('../features/pages/frontend-pages/OCATimeline')));

const Router = [
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', element: <SmartRedirect /> },
      {
        path: '/dashboards/modern',
        exact: true,
        element: (
          <ProtectedRoute requiredPermission="view_dashboard">
            <AppErrorBoundary>
              <ModernDash />
            </AppErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/dashboards/ecommerce',
        exact: true,
        element: (
          <ProtectedRoute requiredPermission="view_dashboard">
            <EcommerceDash />
          </ProtectedRoute>
        )
      },
      {
        path: '/dashboards/orthodmetrics',
        exact: true,
        element: (
          <ProtectedRoute requiredPermission="admin_dashboard">
            <OrthodoxMetricsDash />
          </ProtectedRoute>
        )
      },
      {
        path: '/dashboards/super',
        exact: true,
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <SuperDashboard />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      // Removed: /liturgical-calendar route (misc-legacy)
      {
        path: '/apps/contacts',
        element: (
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        )
      },
      // { path: '/apps/blog/posts', element: <Blog /> },
      // { path: '/frontend-pages/blog/detail/:id', element: <BlogDetail /> },
      // Removed: /apps/chats route (misc-legacy)

      // Developer Tools
      {
        path: '/tools/site-structure',
        element: (
          <ProtectedRoute requiredPermission="admin">
            <SiteStructureVisualizer />
          </ProtectedRoute>
        )
      },

      // Social Features Routes
      {
        path: '/social/chat',
        element: (
          <ProtectedRoute>
            <SocialChat />
          </ProtectedRoute>
        )
      },
      {
        path: '/social/friends',
        element: (
          <ProtectedRoute>
            <SocialFriends />
          </ProtectedRoute>
        )
      },
      {
        path: '/social/notifications',
        element: (
          <ProtectedRoute>
            <NotificationCenter />
          </ProtectedRoute>
        )
      },
      {
        path: '/notifications',
        element: (
          <ProtectedRoute>
            <NotificationCenter />
          </ProtectedRoute>
        )
      },

      {
        path: '/apps/email',
        element: (
          <ProtectedRoute>
            <Email />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/notes',
        element: (
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/tickets',
        element: (
          <ProtectedRoute>
            <Tickets />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/image-ai',
        element: (
          <ProtectedRoute>
            <ImageAI />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/followers',
        element: (
          <ProtectedRoute>
            <Followers />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/friends',
        element: (
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/gallery',
        element: <Gallery />
      },
      {
        path: '/apps/kanban',
        element: (
          <ProtectedRoute>
            <Kanban />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/invoice/list',
        element: (
          <ProtectedRoute requiredPermission="view_invoices">
            <InvoiceList />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/invoice/create',
        element: (
          <ProtectedRoute requiredPermission="manage_invoices">
            <InvoiceCreate />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/invoice/detail/:id',
        element: (
          <ProtectedRoute requiredPermission="view_invoices">
            <InvoiceDetail />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/invoice/edit/:id',
        element: (
          <ProtectedRoute requiredPermission="manage_invoices">
            <InvoiceEdit />
          </ProtectedRoute>
        )
      },

      // Church Management Routes (replacing User Profile)
      {
        path: '/apps/church-management',
        element: (
          <ProtectedRoute requiredPermission="manage_churches">
            <ChurchList />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/create',
        element: (
          <ProtectedRoute>
            <ChurchForm />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/wizard',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <ChurchSetupWizard />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/edit/:id',
        element: (
          <ProtectedRoute requiredPermission="manage_churches">
            <ChurchForm />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/:id/field-mapper',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
            <FieldMapperPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/:id/records',
        element: (
          <ProtectedRoute requiredPermission="manage_churches">
            <RecordsPageWrapper />
          </ProtectedRoute>
        )
      },
      {
        path: '/church/om-spec',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OMSpecDocumentation />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      // Modernize User Profile Routes
      {
        path: '/apps/user-profile',
        element: (
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/user-profile/followers',
        element: (
          <ProtectedRoute>
            <Followers />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/user-profile/friends',
        element: (
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/user-profile/gallery',
        element: (
          <ProtectedRoute>
            <UserProfileGallery />
          </ProtectedRoute>
        )
      },
      // Keep legacy user profile route for backward compatibility
      {
        path: '/user-profile',
        element: (
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        )
      },
      // Removed: /settings/menu route (misc-legacy)
      {
        path: '/settings/jit-terminal',
        element: (
          <ProtectedRoute>
            <AdminErrorBoundary>
              <JITTerminalAccess />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/users',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <UserManagement />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/permissions',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <PermissionsManagement />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/menu-permissions',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <MenuPermissions />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/menu-management',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
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
      {
        path: '/admin/jit-terminal',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <JITTerminalConsole />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
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
        path: '/bigbook/omlearn/*',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OMLearn />
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
        path: '/apps/ocr-upload',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin']}>
            <AdminErrorBoundary>
              <OCRStudioPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/devel/ocr-studio',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin']}>
            <AdminErrorBoundary>
              <OCRStudioPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/devel/ocr-studio/church/:churchId',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin']}>
            <AdminErrorBoundary>
              <ChurchOCRPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/build',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin']}>
            <AdminErrorBoundary>
              <BuildConsole />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      // Removed: All sandbox routes (misc-legacy)
      {
        path: '/omb/editor',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <div>OMB Editor</div>
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/centralized',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <CentralizedRecordsPageWrapper />
          </ProtectedRoute>
        )
      },
      // Church Records UI - Professional Record Browser
      // Advanced Grid Route
      {
        path: '/apps/records-grid',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <AdvancedGridPage />
          </ProtectedRoute>
        )
      },
      // Enhanced Records Grid for specific church
      {
        path: '/apps/records/enhanced/:churchId',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <EnhancedRecordsGrid />
          </ProtectedRoute>
        )
      },
      // Records UI Page
      {
        path: '/apps/records-ui',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsUIPage />
          </ProtectedRoute>
        )
      },
      // Church Records UI with churchId
      {
        path: '/apps/records-ui/:churchId',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsUIPage />
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
      // Removed: /notifications, /settings/notifications routes (misc-legacy)
      // Removed: /apps/liturgical-calendar route (misc-legacy)
      {
        path: '/apps/logs',
        element: (
          <ProtectedRoute>
            <Logs />
          </ProtectedRoute>
        )
      },

      // Removed: Dynamic addon routes (misc-legacy)

      // =====================================================
      // BIG BOOK CUSTOM COMPONENT ROUTES
      // =====================================================

      // Big Book custom component routes
      {
        path: '/bigbook/:componentId',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'editor']}>
            <AdminErrorBoundary>
              <BigBookDynamicRoute />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },

      // Removed: All UI component routes (misc-legacy)
      // Removed: All page routes (misc-legacy)
      { path: '/tables/basic', element: <BasicTable /> },
      { path: '/tables/enhanced', element: <EnhanceTable /> },
      { path: '/tables/pagination', element: <PaginationTable /> },
      { path: '/tables/fixed-header', element: <FixedHeaderTable /> },
      { path: '/tables/collapsible', element: <CollapsibleTable /> },
      { path: '/tables/search', element: <SearchTable /> },
      // Removed: All form routes (misc-legacy)
      // Removed: All chart routes (misc-legacy)
      // Removed: All widget routes (misc-legacy)
      { path: '/react-tables/basic', element: <ReactBasicTable /> },
      { path: '/react-tables/column-visiblity', element: <ReactColumnVisibilityTable /> },
      { path: '/react-tables/drag-drop', element: <ReactDragDropTable /> },
      { path: '/react-tables/dense', element: <ReactDenseTable /> },
      { path: '/react-tables/editable', element: <ReactEditableTable /> },
      { path: '/react-tables/empty', element: <ReactEmptyTable /> },
      { path: '/react-tables/expanding', element: <ReactExpandingTable /> },
      { path: '/react-tables/filter', element: <ReactFilterTable /> },
      { path: '/react-tables/pagination', element: <ReactPaginationTable /> },
      { path: '/react-tables/row-selection', element: <ReactRowSelectionTable /> },
      { path: '/react-tables/sorting', element: <ReactSortingTable /> },
      { path: '/react-tables/sticky', element: <ReactStickyTable /> },

      // Removed: All MUI chart routes (misc-legacy)
      // Removed: All MUI tree routes (misc-legacy)

      // Records Centralized Routes
      {
        path: '/apps/records/baptism',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <BaptismRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <MarriageRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <FuneralRecordsPage />
          </ProtectedRoute>
        )
      },
     {
       path: '/apps/records/centralized',
       element: (
         <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
           <CentralizedRecordsPageWrapper />
         </ProtectedRoute>
       )
     },
     // { path: '/apps/records/manager', element: <DynamicRecordsManager /> },
     // { path: '/apps/records/modern-manager', element: <ModernDynamicRecordsManager /> },
     // { path: '/apps/records/editable', element: <EditableRecordPage /> },

      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/404', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/auth/unauthorized', element: <Unauthorized /> },
      { path: '/auth/login', element: <Navigate to="/auth/login2" replace /> },
      { path: '/login', element: <Navigate to="/auth/login2" replace /> },
      { path: '/auth/login2', element: <Login2 /> },
      { path: '/auth/register', element: <Register /> },
      { path: '/auth/register2', element: <Register2 /> },
      { path: '/auth/forgot-password', element: <ForgotPassword /> },
      { path: '/auth/forgot-password2', element: <ForgotPassword2 /> },
      { path: '/auth/two-steps', element: <TwoSteps /> },
      { path: '/auth/two-steps2', element: <TwoSteps2 /> },
      { path: '/auth/maintenance', element: <Maintenance /> },
      { path: '/landingpage', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/pages/pricing', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/pages/faq', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/frontend-pages/homepage', element: <Homepage /> },
      // Removed: /frontend-pages/homepage1 route - old homepage no longer used
      { path: '/frontend-pages/menu', element: <PagesMenu /> },
      { path: '/samples', element: <Samples /> },
      { path: '/frontend-pages/samples', element: <Samples /> },
      // Removed: /assign-task route (misc-legacy)
      { path: '/frontend-pages/about', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/frontend-pages/contact', element: <Contact /> },
      { path: '/frontend-pages/portfolio', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/frontend-pages/pricing', element: <PagePricing /> },
      { path: '/frontend-pages/oca-timeline', element: <OCATimeline /> },
      // Removed: /blog route (misc-legacy)
      { path: '/blog/:slug', element: <BlogPost /> },
      { path: '/frontend-pages/blog', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/frontend-pages/blog/detail/:id', element: <BlogPost /> },
      { path: '/frontend-pages/gallery', element: <Gallery /> },
      { path: '/greek_baptism_table_demo.html', element: <GreekRecordsViewer /> },
      { path: '/russian_wedding_table_demo.html', element: <HTMLViewer htmlFile="/russian_wedding_table_demo.html" /> },
      { path: '/romanian_funeral_table_demo.html', element: <HTMLViewer htmlFile="/romanian_funeral_table_demo.html" /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];
const router = createBrowserRouter(Router);

export default router;
