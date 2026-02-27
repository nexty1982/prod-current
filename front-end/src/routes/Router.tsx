// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AppErrorBoundary from '@/shared/ui/AppErrorBoundary';
import { RecordsRouteErrorBoundary } from '@/shared/ui/RecordsRouteErrorBoundary';
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import SmartRedirect from '../components/routing/SmartRedirect';
import HeadlineSourcePicker from '../features/admin/headlines/HeadlineSourcePicker';
import OMDeps from '../features/devel-tools/om-deps/OM-deps';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const ChurchPortalLayout = Loadable(lazy(() => import('../layouts/portal/ChurchPortalLayout')));
const ChurchPortalHub = Loadable(lazy(() => import('../features/portal/ChurchPortalHub')));

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
// Removed: SiteStructureVisualizer
const LoadingDemo = Loadable(lazy(() => import('../features/devel-tools/loading-demo/LoadingDemo')));
const OmtraceConsole = Loadable(lazy(() => import('../features/devel-tools/omtrace/OmtraceConsole')));
const MenuEditor = Loadable(lazy(() => import('../features/devel-tools/menu-editor/MenuEditor')));
const Kanban = Loadable(lazy(() => import('../features/apps/kanban/Kanban')));
const InvoiceList = Loadable(lazy(() => import('../features/apps/invoice/List')));
const InvoiceCreate = Loadable(lazy(() => import('../features/apps/invoice/Create')));
const InvoiceDetail = Loadable(lazy(() => import('../features/apps/invoice/Detail')));
const InvoiceEdit = Loadable(lazy(() => import('../features/apps/invoice/Edit')));
// Removed: LiturgicalCalendarPage, OrthodoxLiturgicalCalendar
const DynamicRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/dynamic/DynamicRecordsPage')));
const AnalyticsDashboard = Loadable(lazy(() => import('../features/admin/AnalyticsDashboard')));
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
const NotFound404 = Loadable(lazy(() => import('../features/auth/authentication/NotFound404')));
const ComingSoon = Loadable(lazy(() => import('../features/auth/authentication/ComingSoon')));

// Church Management
const ChurchList = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchList')));
const ChurchForm = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchForm')));
const ChurchSetupWizard = Loadable(lazy(() => import('../features/devel-tools/om-church-wizard/ChurchSetupWizard')));
const FieldMapperPage = Loadable(lazy(() => import('../features/church/FieldMapperPage')));
//const RecordsPageWrapper = Loadable(lazy(() => import('../features/records-centralized/apps/church-management/RecordsPageWrapper')));

// Records Management
const AdvancedGridPage = Loadable(lazy(() => import('../features/tables/AdvancedGridPage')));
//const RecordsGridPage = Loadable(lazy(() => import('../features/records/apps/records-grid/RecordsGridPage')));
//const ChurchRecordsSimplePage = Loadable(lazy(() => import('../features/records/records/ChurchRecordsSimplePage')));
//const DynamicRecordsPageWrapper = Loadable(lazy(() => import('../features/records/apps/records/DynamicRecordsPageWrapper')));
//const EnhancedRecordsGrid = Loadable(lazy(() => import('../features/records-centralized/EnhancedRecordsGrid')));

// Records Centralized Pages (unchanged by phase3)
const BaptismRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/baptism/BaptismRecordsPage')));
const MarriageRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/marriage/MarriageRecordsPage')));
const FuneralRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/death/FuneralRecordsPage')));
const CentralizedRecordsPageWrapper = Loadable(lazy(() => import('../features/records-centralized/components/records/RecordsPageWrapper')));

// Record Entry Forms
const BaptismRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/baptism/BaptismRecordEntryPage')));
const MarriageRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/marriage/MarriageRecordEntryPage')));
const FuneralRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/funeral/FuneralRecordEntryPage')));
const DynamicRecordsManager = Loadable(lazy(() => import('../features/records-centralized/components/records/DynamicRecordsManager')));
const ModernDynamicRecordsManager = Loadable(lazy(() => import('../features/records-centralized/components/records/ModernDynamicRecordsManager')));
const EditableRecordPage = Loadable(lazy(() => import('../features/records-centralized/components/records/EditableRecordPage')));

// Settings
// Removed: MenuSettings from misc-legacy
// Removed: JITTerminalAccess

// Notifications
// Removed: NotificationList, NotificationPreferences from misc-legacy

// Admin
const UserManagement = Loadable(lazy(() => import('../features/admin/admin/UserManagement')));
const OMPermissionCenter = Loadable(lazy(() => import('../features/devel-tools/om-permission-center/PermissionsManagement')));
const AdminSettings = Loadable(lazy(() => import('../features/admin/admin/AdminSettings')));
const OMSiteSurvey = Loadable(lazy(() => import('../features/admin/admin/tools/OMSiteSurvey')));
// Removed: BlogFeed from misc-legacy
const BlogAdmin = Loadable(lazy(() => import('../features/admin/admin/BlogAdmin')));
const TutorialManagement = Loadable(lazy(() => import('../features/admin/tutorials/TutorialManagement')));
const SessionManagement = Loadable(lazy(() => import('../features/auth/admin/SessionManagement')));
const AdminLogs = Loadable(lazy(() => import('../features/admin/admin/AdminLogs')));
const ActivityLogs = Loadable(lazy(() => import('../features/admin/admin/ActivityLogs')));
const MenuPermissions = Loadable(lazy(() => import('../features/admin/admin/MenuPermissions')));
const MenuManagement = Loadable(lazy(() => import('../features/admin/admin/MenuManagement')));
const ChurchPublishingGuide = Loadable(lazy(() => import('../features/admin/components/ChurchPublishingGuide')));
const InteractiveReportReview = Loadable(lazy(() => import('../features/records-centralized/components/interactiveReport/InteractiveReportReview')));
const CertificateGeneratorPage = Loadable(lazy(() => import('../features/certificates/CertificateGeneratorPage')));
const RecipientSubmissionPage = Loadable(lazy(() => import('../features/records-centralized/components/interactiveReport/RecipientSubmissionPage')));
const PublicCollaborationPage = Loadable(lazy(() => import('../features/records-centralized/components/collaborationLinks/PublicCollaborationPage')));
const InteractiveReportJobsPage = Loadable(lazy(() => import('../features/devel-tools/interactive-reports/InteractiveReportJobsPage')));
const BuildInfoPage = Loadable(lazy(() => import('../features/devel-tools/build-info/BuildInfoPage')));
const OrthodMetricsAdmin = Loadable(lazy(() => import('../features/admin/admin/OrthodoxMetricsAdmin')));
const AIAdminPanel = Loadable(lazy(() => import('../features/admin/ai/AIAdminPanel')));
const OMAIUltimateLogger = Loadable(lazy(() => import('../features/devel-tools/om-ultimatelogger/LoggerDashboard')));
const ScriptRunner = Loadable(lazy(() => import('../features/admin/admin/ScriptRunner')));
const AdminControlPanel = Loadable(lazy(() => import('../features/admin/control-panel/AdminControlPanel')));
const ChurchManagementPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchManagementPage')));
const RecordsOCRPage = Loadable(lazy(() => import('../features/admin/control-panel/RecordsOCRPage')));
const CRMOutreachPage = Loadable(lazy(() => import('../features/admin/control-panel/CRMOutreachPage')));
const SystemServerPage = Loadable(lazy(() => import('../features/admin/control-panel/SystemServerPage')));
const AIAutomationPage = Loadable(lazy(() => import('../features/admin/control-panel/AIAutomationPage')));
const OMDailyPage = Loadable(lazy(() => import('../features/admin/control-panel/OMDailyPage')));
const SDLCPage = Loadable(lazy(() => import('../features/admin/control-panel/SDLCPage')));
const UsersSecurityPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/UsersSecurityPage')));
const ContentMediaPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/ContentMediaPage')));
const SocialCommsPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/SocialCommsPage')));
const ServerDevOpsPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/ServerDevOpsPage')));
const PlatformConfigPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/PlatformConfigPage')));
const CRMPage = Loadable(lazy(() => import('../features/devel-tools/crm/CRMPage')));
const USChurchMapPage = Loadable(lazy(() => import('../features/devel-tools/us-church-map/USChurchMapPage')));
const LogSearch = Loadable(lazy(() => import('../features/admin/dashboard/LogSearch')));
const OmOcrStudioPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OmOcrStudioPage')));
const UploadRecordsPage = Loadable(lazy(() => import('../features/records-centralized/apps/upload-records/UploadRecordsPage')));
const SuperDashboard = Loadable(lazy(() => import('../features/devel-tools/users-customized-landing/SuperDashboard')));
const SuperDashboardCustomizer = Loadable(lazy(() => import('../features/devel-tools/users-customized-landing/SuperDashboardCustomizer')));
const UserDashboard = Loadable(lazy(() => import('../features/devel-tools/users-customized-landing/UserDashboard')));
const RouterMenuStudio = Loadable(lazy(() => import('../features/devel-tools/RouterMenuStudio/RouterMenuStudioPage')));
const DynamicRecordsInspector = Loadable(lazy(() => import('../features/records-centralized/components/dynamic/DynamicRecordsInspector')));
const RefactorConsole = Loadable(lazy(() => import('../features/devel-tools/refactor-console/RefactorConsole')));
const ButtonShowcase = Loadable(lazy(() => import('../features/devel-tools/button-showcase/ButtonShowcase')));
const BasicRefactor = Loadable(lazy(() => import('../features/devel-tools/basic-refactor/BasicRefactor')));
const OMLibrary = Loadable(lazy(() => import('../features/devel-tools/system-documentation/om-library/OMLibrary')));
const OMMagicImage = Loadable(lazy(() => import('../features/devel-tools/om-magic-image/om-magic-image')));
const OCRStudioPage = Loadable(lazy(() => import('../features/ocr/pages/OCRStudioPage')));
const OcrUploader = Loadable(lazy(() => import('../features/ocr/OcrUploader')));
const ChurchOCRPage = Loadable(lazy(() => import('../features/ocr/pages/ChurchOCRPage')));
const OCRSettingsPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OCRSettingsPage')));
const OcrSetupWizardPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrSetupWizardPage')));
const OcrReviewPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrReviewPage')));
const OcrTableExtractorPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrTableExtractorPage')));
const LayoutTemplateEditorPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/LayoutTemplateEditorPage')));
const OcrActivityMonitor = Loadable(lazy(() => import('../features/admin/OcrActivityMonitor')));
const OMTasksPage = Loadable(lazy(() => import('../features/devel-tools/om-tasks/OMTasksPage')));
const DailyTasks = Loadable(lazy(() => import('../features/devel-tools/DailyTasks')));
const ApiExplorerPage = Loadable(lazy(() => import('../features/devel-tools/api-explorer/ApiExplorerPage')));
const LiveTableBuilderPage = Loadable(lazy(() => import('../features/devel-tools/live-table-builder/LiveTableBuilderPage')));
const GitOperations = Loadable(lazy(() => import('../features/devel-tools/git-operations/GitOperations')));
const ConversationLogPage = Loadable(lazy(() => import('../features/devel-tools/conversation-log/ConversationLogPage')));
const OMChartsPage = Loadable(lazy(() => import('../features/church/apps/om-charts/OMChartsPage')));

/* ****Help & Documentation***** */
const UserGuide = Loadable(lazy(() => import('../features/help/UserGuide')));

/* ****Berry Components***** */
const BerryLeadManagementPage = Loadable(lazy(() => import('../features/berry-crm/BerryLeadManagementPage')));
const BerryContactManagementPage = Loadable(lazy(() => import('../features/berry-crm/BerryContactManagementPage')));
const BerrySalesManagementPage = Loadable(lazy(() => import('../features/berry-crm/BerrySalesManagementPage')));
const BerryCalendarPage = Loadable(lazy(() => import('../features/berry-calendar/BerryCalendarPage')));
const BerryMapPage = Loadable(lazy(() => import('../features/berry-map/BerryMapPage')));
const BerryCardGalleryPage = Loadable(lazy(() => import('../features/berry-cards/BerryCardGalleryPage')));
const BerryAccountSettingsPage = Loadable(lazy(() => import('../features/berry-profile-02/BerryAccountSettingsPage')));
const BerryAccountProfilePage = Loadable(lazy(() => import('../features/berry-profile-03/BerryAccountProfilePage')));

// Removed: JITTerminal, JITTerminalConsole

// AI Lab
// Removed: All sandbox components from misc-legacy
const AdminDashboardLayout = Loadable(lazy(() => import('../features/admin/admin/AdminDashboardLayout')));
const AdminPageFallback = Loadable(lazy(() => import('../features/admin/admin/AdminPageFallback')));

// Big Book System
const OMBigBook = Loadable(lazy(() => import('../features/admin/admin/OMBigBook')));
const BigBookDynamicRoute = Loadable(lazy(() => import('../features/admin/admin/BigBookDynamicRoute')));

// OMAI Mobile
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../features/admin/admin/OMAIDiscoveryPanelMobile')));
const OpsReportsPage = Loadable(lazy(() => import('../features/admin/ops/OpsReportsPage')));

// Component Registry for Dynamic Addons
// Removed: DynamicAddonRoute from misc-legacy

// OMLearn Module (unchanged in phase3 map)
const OMLearn = Loadable(lazy(() => import('../features/omlearn/OMLearn')));

// Build System
const BuildConsole = Loadable(lazy(() => import('../features/devel-tools/om-build-console/BuildConsole')));

// Records Pages
import { isInteractiveReportRecipientsEnabled } from '../config/featureFlags';

// Environment-Gated Feature Components
import EnvironmentAwarePage from '../components/routing/EnvironmentAwarePage';

const ChurchAdminList = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminList')));
const ChurchAdminPanel = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminPanelWorking')));


// Records UI Page
const RecordsUIPage = Loadable(lazy(() => import('../features/records-centralized/apps/records-ui/index')));

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
const AcceptInvite = Loadable(lazy(() => import('../features/auth/AcceptInvite')));
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
const PageImageIndex = Loadable(lazy(() => import('../features/devel-tools/PageImageIndex')));
const OCATimeline = Loadable(lazy(() => import('../features/pages/frontend-pages/OCATimeline')));
const PublicTasksListPage = Loadable(lazy(() => import('../features/pages/frontend-pages/PublicTasksListPage')));
const PublicTaskDetailPage = Loadable(lazy(() => import('../features/pages/frontend-pages/PublicTaskDetailPage')));
const WelcomeMessage = Loadable(lazy(() => import('../features/pages/frontend-pages/WelcomeMessage')));
const Tour = Loadable(lazy(() => import('../features/pages/frontend-pages/Tour')));
const Faq = Loadable(lazy(() => import('../features/pages/frontend-pages/Faq')));

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
        path: '/dashboards/orthodoxmetrics',
        exact: true,
        element: (
          <ProtectedRoute requiredPermission="admin_dashboard">
            <OrthodoxMetricsDash />
          </ProtectedRoute>
        )
      },
      {
        path: '/dashboards/user',
        exact: true,
        element: (
          <ProtectedRoute requiredRole={['priest']}>
            <AppErrorBoundary>
              <UserDashboard />
            </AppErrorBoundary>
          </ProtectedRoute>
        ),
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
      {
        path: '/dashboards/super/customize',
        exact: true,
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <SuperDashboardCustomizer />
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

      // Removed: /tools/site-structure route
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

      // Chat redirect from legacy route
      {
        path: '/apps/chats',
        element: <Navigate to="/social/chat" replace />
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
        element: (
          <ProtectedRoute>
            <Gallery />
          </ProtectedRoute>
        ) 
      },
      {
        path: '/apps/gallery/page-index',
        element: (
          <ProtectedRoute>
            <PageImageIndex />
          </ProtectedRoute>
        )
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
      // OM Charts — graphical charts from church sacramental records
      {
        path: '/apps/om-charts',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
            <EnvironmentAwarePage featureId="om-charts" priority={2} featureName="OM Charts">
              <OMChartsPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/:churchId/charts',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="om-charts" priority={2} featureName="OM Charts">
              <OMChartsPage />
            </EnvironmentAwarePage>
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
     // {
     //   path: '/apps/church-management/:id/records',
     //   element: (
     //     <ProtectedRoute requiredPermission="manage_churches">
     //       <RecordsPageWrapper />
     //     </ProtectedRoute>
     //   )
      {
        path: '/church/om-spec',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OMLibrary />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/church/omai-logger',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OMAIUltimateLogger />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      // Help & Documentation
      {
        path: '/help/user-guide',
        element: (
          <ProtectedRoute>
            <UserGuide />
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
      // Removed: /settings/menu, /settings/jit-terminal routes
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
      {
        path: '/admin/tutorials',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <TutorialManagement />
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
        path: '/admin/control-panel/records-ocr',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <RecordsOCRPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/control-panel/crm-outreach',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <CRMOutreachPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
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
        path: '/admin/control-panel/om-daily',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <OMDailyPage />
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
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <CRMPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
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
        path: '/devel-tools/git-operations',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <GitOperations />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/devel-tools/conversation-log',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <ConversationLogPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/devel-tools/om-tasks',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin']}>
            <AdminErrorBoundary>
              <OMTasksPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/devel-tools/daily-tasks',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <DailyTasks />
            </AdminErrorBoundary>
          </ProtectedRoute>
        ),
        meta: {
          requiresAuth: true,
          hidden: false
        }
      },
      {
        path: '/devel-tools/api-explorer',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <ApiExplorerPage />
            </AdminErrorBoundary>
          </ProtectedRoute>
        ),
        meta: {
          requiresAuth: true,
          hidden: false
        }
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
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
            <BuildInfoPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/upload-records',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
            <AdminErrorBoundary>
              <EnvironmentAwarePage
                featureId="upload-records"
                priority={4}
                featureName="Upload Records"
              >
                <UploadRecordsPage />
              </EnvironmentAwarePage>
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/ocr-upload',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
            <AdminErrorBoundary>
              <EnvironmentAwarePage 
                featureId="ocr-studio" 
                priority={4}
                featureName="OCR Upload"
              >
                <OCRStudioPage />
              </EnvironmentAwarePage>
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
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
        path: '/records/ocr-uploader',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
            <AdminErrorBoundary>
              <OcrUploader />
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
              <OmOcrStudioPage />
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
              <OmOcrStudioPage />
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
     // {
     //   path: '/apps/records/enhanced/:churchId',
     //   element: (
     //     <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
     //       <EnhancedRecordsGrid />
     //     </ProtectedRoute>
     //   )
      
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
      // Removed: /notifications, /settings/notifications, /apps/liturgical-calendar, /apps/orthodox-calendar routes
      {
        path: '/apps/records/dynamic',
        element: (
          <ProtectedRoute>
            <DynamicRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/dashboards/analytics',
        element: (
          <ProtectedRoute requiredPermission="view_dashboard">
            <AnalyticsDashboard />
          </ProtectedRoute>
        )
      },
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

      // =====================================================
      // BERRY COMPONENT ROUTES (Stage 1 - Prototype)
      // =====================================================
      {
        path: '/berry/crm/leads',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="berry-crm-leads" priority={1} featureName="Berry CRM Leads">
              <BerryLeadManagementPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/berry/crm/contacts',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="berry-crm-contacts" priority={1} featureName="Berry CRM Contacts">
              <BerryContactManagementPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/berry/crm/sales',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="berry-crm-sales" priority={1} featureName="Berry CRM Sales">
              <BerrySalesManagementPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/berry/calendar',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="berry-calendar" priority={1} featureName="Berry Calendar">
              <BerryCalendarPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/berry/map',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="berry-map" priority={1} featureName="Berry Map">
              <BerryMapPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/berry/cards',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="berry-cards" priority={1} featureName="Berry Card Gallery">
              <BerryCardGalleryPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/berry/profile/settings',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="berry-profile-02" priority={1} featureName="Berry Account Settings">
              <BerryAccountSettingsPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/berry/profile/account',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="berry-profile-03" priority={1} featureName="Berry Account Profile">
              <BerryAccountProfilePage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },

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

      // Records Centralized Routes (Priority 0-3: Reconstructed)
      {
        path: '/apps/records/baptism',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <EnvironmentAwarePage 
                featureId="baptism-records-v2" 
                priority={0}
                featureName="Baptism Records"
              >
                <BaptismRecordsPage />
              </EnvironmentAwarePage>
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <EnvironmentAwarePage 
                featureId="marriage-records-v2" 
                priority={2}
                featureName="Marriage Records"
              >
                <MarriageRecordsPage />
              </EnvironmentAwarePage>
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <EnvironmentAwarePage 
                featureId="funeral-records-v2" 
                priority={3}
                featureName="Funeral Records"
              >
                <FuneralRecordsPage />
              </EnvironmentAwarePage>
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/baptism/new',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <BaptismRecordEntryPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/baptism/edit/:id',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <BaptismRecordEntryPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage/new',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <MarriageRecordEntryPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage/edit/:id',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <MarriageRecordEntryPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral/new',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <FuneralRecordEntryPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral/edit/:id',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <FuneralRecordEntryPage />
          </ProtectedRoute>
        )
      },
      // Certificate Generation Page
      {
        path: '/apps/certificates/generate',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <CertificateGeneratorPage />
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
     {
       path: '/apps/records/interactive-reports/:reportId',
       element: (
         <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
           <EnvironmentAwarePage 
             featureId="interactive-reports" 
             priority={4}
             featureName="Interactive Reports Review"
           >
             <InteractiveReportReview />
           </EnvironmentAwarePage>
         </ProtectedRoute>
       )
     },
      { path: '/apps/records/manager', element: <DynamicRecordsManager /> },
      { path: '/apps/records/modern-manager', element: <ModernDynamicRecordsManager /> },
      { path: '/apps/records/editable', element: <EditableRecordPage /> },
    ],
  },
  // ── Church Portal (public-style layout for church staff) ──
  {
    path: '/portal',
    element: <ChurchPortalLayout />,
    children: [
      { index: true, element: <ChurchPortalHub /> },
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
      // User Profile
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        ),
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
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      // Auth routes - explicitly public, NO ProtectedRoute wrapper
      {
        path: 'auth',
        children: [
          { index: true, element: <Navigate to="/auth/login" replace /> },
          { path: '404', element: <NotFound404 /> },
          { path: 'coming-soon', element: <ComingSoon /> },
          { path: 'unauthorized', element: <Unauthorized /> },
          { path: 'login', element: <Login2 /> },
          { path: 'login2', element: <Login2 /> },
          { path: 'register', element: <Register /> },
          { path: 'register2', element: <Register2 /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'forgot-password2', element: <ForgotPassword2 /> },
          { path: 'two-steps', element: <TwoSteps /> },
          { path: 'two-steps2', element: <TwoSteps2 /> },
          { path: 'maintenance', element: <Maintenance /> },
          { path: 'accept-invite/:token', element: <AcceptInvite /> },
          { path: '*', element: <NotFound404 /> },
        ]
      },
      // Root login redirect
      { path: 'login', element: <Navigate to="/auth/login2" replace /> },
      { path: '/landingpage', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/pages/pricing', element: <Navigate to="/dashboards/super" replace /> },
      { path: '/pages/faq', element: <Faq /> },
      { path: '/frontend-pages/faq', element: <Faq /> },
      { path: '/frontend-pages/homepage', element: <Homepage /> },
      // Removed: /frontend-pages/homepage1 route - old homepage no longer used
      { path: '/frontend-pages/menu', element: <PagesMenu /> },
      { path: '/samples', element: <Samples /> },
      { path: '/frontend-pages/samples', element: <Samples /> },
      // Removed: /assign-task route (misc-legacy)
      { path: '/frontend-pages/about', element: <About /> },
      { path: '/frontend-pages/contact', element: <Contact /> },
      { path: '/frontend-pages/portfolio', element: <Portfolio /> },
      { path: '/frontend-pages/pricing', element: <PagePricing /> },
      { path: '/frontend-pages/oca-timeline', element: <OCATimeline /> },
      { path: '/frontend-pages/welcome-message', element: <WelcomeMessage /> },
      { path: '/tour', element: <Tour /> },
      // Removed: /blog route (misc-legacy)
      { path: '/blog/:slug', element: <BlogPost /> },
      { path: '/frontend-pages/blog', element: <BlogPage /> },
      { path: '/frontend-pages/blog/detail/:id', element: <BlogPost /> },
      { path: '/frontend-pages/gallery', element: <Gallery /> },
      { path: '/greek_baptism_table_demo.html', element: <GreekRecordsViewer /> },
      { path: '/russian_wedding_table_demo.html', element: <HTMLViewer htmlFile="/russian_wedding_table_demo.html" /> },
      { path: '/romanian_funeral_table_demo.html', element: <HTMLViewer htmlFile="/romanian_funeral_table_demo.html" /> },
      // Public Task Pages (no authentication required)
      { path: '/tasks', element: <PublicTasksListPage /> },
      { path: '/tasks/:id', element: <PublicTaskDetailPage /> },
      // Interactive Report Recipient Page (public, token-based)
      // Feature flag: interactiveReports.enableRecipientPages
      ...(isInteractiveReportRecipientsEnabled() ? [
        { path: '/r/interactive/:token', element: <RecipientSubmissionPage /> },
      ] : []),
      // Collaboration Links (public, token-based)
      { path: '/c/:token', element: <PublicCollaborationPage /> },

      { path: '*', element: <NotFound404 /> },
    ],
  },
];
const router = createBrowserRouter(Router);

export default router;
