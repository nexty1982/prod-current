// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import HeadlineSourcePicker from '../components/headlines/HeadlineSourcePicker';
import SmartRedirect from '../components/routing/SmartRedirect';
import ComingSoon from '../shared/ui/ComingSoon';
import AppErrorBoundary from '@/shared/ui/AppErrorBoundary';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import OMDeps from '../tools/om-deps/OM-deps';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const ModernDash = Loadable(lazy(() => import('../features/dashboard/ModernDashboard')));
const EcommerceDash = Loadable(lazy(() => import('../features/dashboard/Ecommerce')));
const OrthodMetricsDash = Loadable(lazy(() => import('../features/admin/dashboard/OrthodoxMetrics')));

/* ****Apps***** */
const Contacts = Loadable(lazy(() => import('../features/apps/contacts/Contacts')));
const ChatApp = Loadable(lazy(() => import('../features/misc-legacy/apps/chat/ChatApp')));
const Notes = Loadable(lazy(() => import('../features/apps/notes/Notes')));
const Tickets = Loadable(lazy(() => import('../features/apps/tickets/Tickets')));

/* ****Developer Tools***** */
const SiteStructureVisualizer = Loadable(lazy(() => import('../tools/SiteStructureVisualizer')));
const OmtraceConsole = Loadable(lazy(() => import('../components/ui-tools/omtrace/OmtraceConsole')));
const Kanban = Loadable(lazy(() => import('../features/apps/kanban/Kanban')));
const InvoiceList = Loadable(lazy(() => import('../features/apps/invoice/List')));
const InvoiceCreate = Loadable(lazy(() => import('../features/apps/invoice/Create')));
const InvoiceDetail = Loadable(lazy(() => import('../features/apps/invoice/Detail')));
const InvoiceEdit = Loadable(lazy(() => import('../features/apps/invoice/Edit')));
const LiturgicalCalendarPage = Loadable(lazy(() => import('../features/misc-legacy/calendar/LiturgicalCalendarPage')));
const SiteClone = Loadable(lazy(() => import('../features/misc-legacy/apps/site-clone/SiteClone')));
const Logs = Loadable(lazy(() => import('../features/system/apps/logs/Logs')));
const UserProfile = Loadable(lazy(() => import('../features/apps/user-profile/UserProfile')));
const Followers = Loadable(lazy(() => import('../features/apps/user-profile/Followers')));
const Friends = Loadable(lazy(() => import('../features/apps/user-profile/Friends')));
const Gallery = Loadable(lazy(() => import('../features/apps/user-profile/Gallery')));
const Email = Loadable(lazy(() => import('../features/apps/email/Email')));

/* ****Social Features***** */
const SocialBlogList = Loadable(lazy(() => import('../features/misc-legacy/social/blog/BlogList')));
const SocialBlogCreate = Loadable(lazy(() => import('../features/misc-legacy/social/blog/BlogCreate')));
const SocialBlogEdit = Loadable(lazy(() => import('../features/misc-legacy/social/blog/BlogEdit')));
const SocialBlogView = Loadable(lazy(() => import('../features/misc-legacy/social/blog/BlogView')));
const SocialFriends = Loadable(lazy(() => import('../features/misc-legacy/social/friends/FriendsList')));
const SocialChat = Loadable(lazy(() => import('../features/misc-legacy/social/chat/SocialChat')));
const SocialNotifications = Loadable(lazy(() => import('../features/misc-legacy/social/notifications/NotificationCenter')));

// Orthodox Headlines
const OrthodoxHeadlines = Loadable(lazy(() => import('../features/misc-legacy/OrthodoxHeadlines')));

// OMAI Task Assignment
const AssignTaskPage = Loadable(lazy(() => import('../features/misc-legacy/pages/AssignTask')));

// 404 Page
const NotFound404 = Loadable(lazy(() => import('../features/misc-legacy/pages/NotFound404')));

// Church Management
const ChurchList = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchList')));
const ChurchForm = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchForm')));
const ChurchSetupWizard = Loadable(lazy(() => import('../features/church/church-management/ch-wiz/ChurchSetupWizard')));
const FieldMapperPage = Loadable(lazy(() => import('../features/church/FieldMapperPage')));
const RecordsPageWrapper = Loadable(lazy(() => import('../features/records/apps/church-management/RecordsPageWrapper')));

// Records Management
const AdvancedGridPage = Loadable(lazy(() => import('../features/tables/AdvancedGridPage')));
const RecordsGridPage = Loadable(lazy(() => import('../features/records/apps/records-grid/RecordsGridPage')));
const ChurchRecordsSimplePage = Loadable(lazy(() => import('../features/records/records/ChurchRecordsSimplePage')));
const DynamicRecordsPageWrapper = Loadable(lazy(() => import('../features/records/apps/records/DynamicRecordsPageWrapper')));
const EnhancedRecordsGrid = Loadable(lazy(() => import('../features/records/EnhancedRecordsGrid')));

// Records Centralized Pages (unchanged by phase3)
const BaptismRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/baptism/BaptismRecordsPage')));
const MarriageRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/marriage/MarriageRecords')));
const FuneralRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/records/FuneralRecords')));
const CentralizedRecordsPageWrapper = Loadable(lazy(() => import('../features/records-centralized/components/records/RecordsPageWrapper')));
const DynamicRecordsManager = Loadable(lazy(() => import('../features/records-centralized/components/records/DynamicRecordsManager')));
const ModernDynamicRecordsManager = Loadable(lazy(() => import('../features/records-centralized/components/records/ModernDynamicRecordsManager')));
const EditableRecordPage = Loadable(lazy(() => import('../features/records-centralized/components/records/EditableRecordPage')));

// Settings
const MenuSettings = Loadable(lazy(() => import('../features/misc-legacy/settings/MenuSettings')));
const JITTerminalAccess = Loadable(lazy(() => import('../features/security/settings/JITTerminalAccess')));

// Notifications
const NotificationList = Loadable(lazy(() => import('../features/misc-legacy/notifications/NotificationList')));
const NotificationPreferences = Loadable(lazy(() => import('../features/misc-legacy/notifications/NotificationPreferences')));

// Admin
const UserManagement = Loadable(lazy(() => import('../features/admin/admin/UserManagement')));
const PermissionsManagement = Loadable(lazy(() => import('../features/admin/admin/PermissionsManagement')));
const RoleManagement = Loadable(lazy(() => import('../features/admin/admin/RoleManagement')));
const AdminSettings = Loadable(lazy(() => import('../features/admin/admin/AdminSettings')));
const OMSiteSurvey = Loadable(lazy(() => import('../features/admin/admin/tools/OMSiteSurvey')));
const BlogFeed = Loadable(lazy(() => import('../features/misc-legacy/blog/BlogFeed')));
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
const SuperAdminDashboard = Loadable(lazy(() => import('../features/admin/admin/SuperAdminDashboard')));
const RouterMenuStudio = Loadable(lazy(() => import('../features/devel-tools/RouterMenuStudio/RouterMenuStudioPage')));

const JITTerminal = Loadable(lazy(() => import('../features/misc-legacy/terminal/JITTerminal')));
const JITTerminalConsole = Loadable(lazy(() => import('../features/admin/admin/JITTerminalConsole')));

// AI Lab
const OMAILab = Loadable(lazy(() => import('../features/misc-legacy/sandbox/ai-lab')));
const ProjectGenerator = Loadable(lazy(() => import('../features/misc-legacy/sandbox/project-generator')));
const ComponentLibrary = Loadable(lazy(() => import('../features/misc-legacy/sandbox/component-library')));
const ComponentPreview = Loadable(lazy(() => import('../features/misc-legacy/sandbox/component-preview')));
const AdminDashboardLayout = Loadable(lazy(() => import('../features/admin/admin/AdminDashboardLayout')));
const AdminPageFallback = Loadable(lazy(() => import('../features/admin/admin/AdminPageFallback')));

// Big Book System
const OMBigBook = Loadable(lazy(() => import('../features/admin/admin/OMBigBook')));
const BigBookDynamicRoute = Loadable(lazy(() => import('../features/admin/admin/BigBookDynamicRoute')));

// OMAI Mobile
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../features/admin/admin/OMAIDiscoveryPanelMobile')));

// Component Registry for Dynamic Addons
import { DynamicAddonRoute } from '../features/misc-legacy/registry/ComponentRegistry';

// OMLearn Module (unchanged in phase3 map)
const OMLearn = Loadable(lazy(() => import('../modules/OMLearn/OMLearn')));

// Build System
const BuildConsole = Loadable(lazy(() => import('../features/admin/admin/BuildConsole')));

// Records Pages
import { RECORDS_LEGACY_ENABLED } from '../config/featureFlags';

const ChurchAdminList = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminList')));
const ChurchAdminPanel = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminPanelWorking')));

// New Records Management (Shop Layout)
const RecordsManagement = Loadable(lazy(() => import('../features/records/apps/records/index')));

// Records UI Page
const RecordsUIPage = Loadable(lazy(() => import('../features/records/apps/records-ui/index')));

// ui components
const MuiAlert = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiAlert')));
const MuiAccordion = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiAccordion')));
const MuiAvatar = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiAvatar')));
const MuiChip = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiChip')));
const MuiDialog = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiDialog')));
const MuiList = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiList')));
const MuiPopover = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiPopover')));
const MuiRating = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiRating')));
const MuiTabs = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiTabs')));
const MuiTooltip = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiTooltip')));
const MuiTransferList = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiTransferList')));
const MuiTypography = Loadable(lazy(() => import('../features/misc-legacy/ui-components/MuiTypography')));

// form elements
const MuiAutoComplete = Loadable(lazy(() => import('../features/misc-legacy/forms/form-elements/MuiAutoComplete')));
const MuiButton = Loadable(lazy(() => import('../features/misc-legacy/forms/form-elements/MuiButton')));
const MuiCheckbox = Loadable(lazy(() => import('../features/misc-legacy/forms/form-elements/MuiCheckbox')));
const MuiRadio = Loadable(lazy(() => import('../features/misc-legacy/forms/form-elements/MuiRadio')));
const MuiSlider = Loadable(lazy(() => import('../features/misc-legacy/forms/form-elements/MuiSlider')));
const MuiDateTime = Loadable(lazy(() => import('../features/misc-legacy/forms/form-elements/MuiDateTime')));
const MuiSwitch = Loadable(lazy(() => import('../features/misc-legacy/forms/form-elements/MuiSwitch')));

// forms
const FormLayouts = Loadable(lazy(() => import('../features/misc-legacy/forms/FormLayouts')));
const FormCustom = Loadable(lazy(() => import('../features/misc-legacy/forms/FormCustom')));
const FormHorizontal = Loadable(lazy(() => import('../features/misc-legacy/forms/FormHorizontal')));
const FormVertical = Loadable(lazy(() => import('../features/misc-legacy/forms/FormVertical')));
const FormWizard = Loadable(lazy(() => import('../features/misc-legacy/forms/FormWizard')));
const FormValidation = Loadable(lazy(() => import('../features/misc-legacy/forms/FormValidation')));
const TiptapEditor = Loadable(lazy(() => import('../features/misc-legacy/forms/from-tiptap/TiptapEditor')));

// pages
const RollbaseCASL = Loadable(lazy(() => import('../features/misc-legacy/pages/rollbaseCASL/RollbaseCASL')));
const Faq = Loadable(lazy(() => import('../features/misc-legacy/pages/faq/Faq')));

const Pricing = Loadable(lazy(() => import('../features/misc-legacy/pages/pricing/Pricing')));
const AccountSetting = Loadable(
  lazy(() => import('../features/misc-legacy/pages/account-setting/AccountSetting')),
);

// charts
const AreaChart = Loadable(lazy(() => import('../features/misc-legacy/charts/AreaChart')));
const CandlestickChart = Loadable(lazy(() => import('../features/misc-legacy/charts/CandlestickChart')));
const ColumnChart = Loadable(lazy(() => import('../features/misc-legacy/charts/ColumnChart')));
const DoughnutChart = Loadable(lazy(() => import('../features/misc-legacy/charts/DoughnutChart')));
const GredientChart = Loadable(lazy(() => import('../features/misc-legacy/charts/GredientChart')));
const RadialbarChart = Loadable(lazy(() => import('../features/misc-legacy/charts/RadialbarChart')));
const LineChart = Loadable(lazy(() => import('../features/misc-legacy/charts/LineChart')));

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
const BarCharts = Loadable(lazy(() => import('../features/misc-legacy/muicharts/barcharts/page')));
const GaugeCharts = Loadable(lazy(() => import('../features/misc-legacy/muicharts/gaugecharts/page')));
const AreaCharts = Loadable(lazy(() => import('../features/misc-legacy/muicharts/linecharts/area/page')));
const LineCharts = Loadable(lazy(() => import('../features/misc-legacy/muicharts/linecharts/line/page')));
const PieCharts = Loadable(lazy(() => import('../features/misc-legacy/muicharts/piecharts/page')));
const ScatterCharts = Loadable(lazy(() => import('../features/misc-legacy/muicharts/scattercharts/page')));
const SparklineCharts = Loadable(lazy(() => import('../features/misc-legacy/muicharts/sparklinecharts/page')));

// mui trees
const SimpletreeCustomization = Loadable(lazy(() => import('../features/misc-legacy/mui-trees/simpletree/simpletree-customization/page')));
const SimpletreeExpansion = Loadable(lazy(() => import('../features/misc-legacy/mui-trees/simpletree/simpletree-expansion/page')));
const SimpletreeFocus = Loadable(lazy(() => import('../features/misc-legacy/mui-trees/simpletree/simpletree-focus/page')));
const SimpletreeItems = Loadable(lazy(() => import('../features/misc-legacy/mui-trees/simpletree/simpletree-items/page')));
const SimpletreeSelection = Loadable(lazy(() => import('../features/misc-legacy/mui-trees/simpletree/simpletree-selection/page')));

// widgets
const WidgetCards = Loadable(lazy(() => import('../features/misc-legacy/widgets/cards/WidgetCards')));
const WidgetBanners = Loadable(lazy(() => import('../features/misc-legacy/widgets/banners/WidgetBanners')));
const WidgetCharts = Loadable(lazy(() => import('../features/misc-legacy/widgets/charts/WidgetCharts')));

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
const About = Loadable(lazy(() => import('../features/pages/frontend-pages/About')));
const Contact = Loadable(lazy(() => import('../features/pages/frontend-pages/Contact')));
const Portfolio = Loadable(lazy(() => import('../features/pages/frontend-pages/Portfolio')));
const PagePricing = Loadable(lazy(() => import('../features/pages/frontend-pages/Pricing')));
const BlogPage = Loadable(lazy(() => import('../features/pages/frontend-pages/Blog')));
const BlogPost = Loadable(lazy(() => import('../features/pages/frontend-pages/BlogPost')));

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
      },
      {
        path: '/dashboards/orthodmetrics',
        exact: true,
        element: (
          <ProtectedRoute requiredPermission="admin_dashboard">
            <OrthodMetricsDash />
          </ProtectedRoute>
        )
      },
      {
        path: '/liturgical-calendar',
        element: <LiturgicalCalendarPage />
      },
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
      {
        path: '/apps/chats',
        element: (
          <ProtectedRoute>
            <ChatApp />
          </ProtectedRoute>
        )
      },

      // Developer Tools
      {
        path: '/tools/site-structure',
        element: (
          <ProtectedRoute requiredPermission="admin">
            <SiteStructureVisualizer />
          </ProtectedRoute>
        )
      },

      // Social Experience Routes
      {
        path: '/social/blog',
        element: (
          <ProtectedRoute>
            <SocialBlogList />
          </ProtectedRoute>
        )
      },
      {
        path: '/social/blog/create',
        element: (
          <ProtectedRoute>
            <SocialBlogCreate />
          </ProtectedRoute>
        )
      },
      {
        path: '/social/blog/edit/:id',
        element: (
          <ProtectedRoute>
            <SocialBlogEdit />
          </ProtectedRoute>
        )
      },
      {
        path: '/social/blog/post/:id',
        element: (
          <ProtectedRoute>
            <SocialBlogView />
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
        path: '/social/chat',
        element: (
          <ProtectedRoute>
            <SocialChat />
          </ProtectedRoute>
        )
      },
      {
        path: '/social/notifications',
        element: (
          <ProtectedRoute>
            <SocialNotifications />
          </ProtectedRoute>
        )
      },

      // Orthodox Headlines - Authenticated news aggregator
      {
        path: '/orthodox-headlines',
        element: (
          <ProtectedRoute>
            <OrthodoxHeadlines />
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
          <ProtectedRoute requiredPermission="manage_churches">
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
            <Gallery />
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
      {
        path: '/settings/menu',
        element: (
          <ProtectedRoute>
            <AdminErrorBoundary>
              <MenuSettings />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
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
        path: '/admin/roles',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <RoleManagement />
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
        path: '/admin/dashboard',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <SuperAdminDashboard />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/orthodox-metrics',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin']}>
            <AdminErrorBoundary>
              <OrthodMetricsDash />
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
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OmtraceConsole />
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
      {
        path: '/sandbox/ai-lab',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OMAILab />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/sandbox/project-generator',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <ProjectGenerator />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/sandbox/component-library',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <ComponentLibrary />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },

      {
        path: '/sandbox/component-preview',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <ComponentPreview />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/sandbox/component-preview/:source',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <ComponentPreview />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/sandbox/component-preview/:source/:category',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <ComponentPreview />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/sandbox/component-preview/:source/:category/:component',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <ComponentPreview />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/omb/editor',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/:churchId(\\d+)-records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          </ProtectedRoute>
        )
      },
      {
        path: '/:churchName-Records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          </ProtectedRoute>
        )
      },
      {
        path: '/records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          </ProtectedRoute>
        )
      },
      // New Records Management with Shop Layout
      {
        path: '/apps/records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsManagement />
          </ProtectedRoute>
        )
      },
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
      {
        path: '/apps/records/manager',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <DynamicRecordsManager />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/modern-manager',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <ModernDynamicRecordsManager />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/editable',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <EditableRecordPage />
          </ProtectedRoute>
        )
      },
      // Church Records UI - Professional Record Browser
      {
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          </ProtectedRoute>
        )
      },

      // Advanced Grid Route
      {
        path: '/apps/records-grid',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <AdvancedGridPage />
          </ProtectedRoute>
        )
      },

      // Dynamic Records Explorer
      {
        path: '/apps/records/dynamic',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <DynamicRecordsPageWrapper />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/dynamic/:churchId',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <DynamicRecordsPageWrapper />
          </ProtectedRoute>
        )
      },

      // Enhanced Records Grid with Field Mapping
      {
        path: '/apps/records/enhanced',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <EnhancedRecordsGrid defaultChurchId={46} />
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
      {
        path: '/notifications',
        element: (
          <ProtectedRoute>
            <NotificationList />
          </ProtectedRoute>
        )
      },
      {
        path: '/settings/notifications',
        element: (
          <ProtectedRoute>
            <NotificationPreferences />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/liturgical-calendar',
        element: <LiturgicalCalendarPage />
      },
      {
        path: '/apps/logs',
        element: (
          <ProtectedRoute>
            <Logs />
          </ProtectedRoute>
        )
      },

      // =====================================================
      // DYNAMIC ADDON ROUTES
      // =====================================================


      // Generic addon route pattern for future addons
      // Note: More specific routes should be added above this catch-all
      {
        path: '/addons/*',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <DynamicAddonRoute route={window.location.pathname} />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },

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

      { path: '/ui-components/alert', element: <MuiAlert /> },
      { path: '/ui-components/accordion', element: <MuiAccordion /> },
      { path: '/ui-components/avatar', element: <MuiAvatar /> },
      { path: '/ui-components/chip', element: <MuiChip /> },
      { path: '/ui-components/dialog', element: <MuiDialog /> },
      { path: '/ui-components/list', element: <MuiList /> },
      { path: '/ui-components/popover', element: <MuiPopover /> },
      { path: '/ui-components/rating', element: <MuiRating /> },
      { path: '/ui-components/tabs', element: <MuiTabs /> },
      { path: '/ui-components/tooltip', element: <MuiTooltip /> },
      { path: '/ui-components/transfer-list', element: <MuiTransferList /> },
      { path: '/ui-components/typography', element: <MuiTypography /> },
      { path: '/pages/casl', element: <RollbaseCASL /> },
      { path: '/pages/pricing', element: <Pricing /> },
      { path: '/pages/faq', element: <Faq /> },
      { path: '/pages/account-settings', element: <AccountSetting /> },
      { path: '/tables/basic', element: <BasicTable /> },
      { path: '/tables/enhanced', element: <EnhanceTable /> },
      { path: '/tables/pagination', element: <PaginationTable /> },
      { path: '/tables/fixed-header', element: <FixedHeaderTable /> },
      { path: '/tables/collapsible', element: <CollapsibleTable /> },
      { path: '/tables/search', element: <SearchTable /> },
      { path: '/forms/form-elements/autocomplete', element: <MuiAutoComplete /> },
      { path: '/forms/form-elements/button', element: <MuiButton /> },
      { path: '/forms/form-elements/checkbox', element: <MuiCheckbox /> },
      { path: '/forms/form-elements/radio', element: <MuiRadio /> },
      { path: '/forms/form-elements/slider', element: <MuiSlider /> },
      { path: '/forms/form-elements/date-time', element: <MuiDateTime /> },
      { path: '/forms/form-elements/switch', element: <MuiSwitch /> },
      { path: '/forms/form-elements/switch', element: <MuiSwitch /> },
      { path: '/forms/form-layouts', element: <FormLayouts /> },
      { path: '/forms/form-custom', element: <FormCustom /> },
      { path: '/forms/form-wizard', element: <FormWizard /> },
      { path: '/forms/form-validation', element: <FormValidation /> },
      { path: '/forms/form-horizontal', element: <FormHorizontal /> },
      { path: '/forms/form-vertical', element: <FormVertical /> },
      { path: '/forms/form-tiptap', element: <TiptapEditor /> },
      { path: '/charts/area-chart', element: <AreaChart /> },
      { path: '/charts/line-chart', element: <LineChart /> },
      { path: '/charts/gredient-chart', element: <GredientChart /> },
      { path: '/charts/candlestick-chart', element: <CandlestickChart /> },
      { path: '/charts/column-chart', element: <ColumnChart /> },
      { path: '/charts/doughnut-pie-chart', element: <DoughnutChart /> },
      { path: '/charts/radialbar-chart', element: <RadialbarChart /> },
      { path: '/widgets/cards', element: <WidgetCards /> },
      { path: '/widgets/banners', element: <WidgetBanners /> },
      { path: '/widgets/charts', element: <WidgetCharts /> },
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

      { path: '/muicharts/barcharts', element: <BarCharts /> },
      { path: '/muicharts/gaugecharts', element: <GaugeCharts /> },
      { path: '/muicharts/linecharts/area', element: <AreaCharts /> },
      { path: '/muicharts/linecharts/line', element: <LineCharts /> },
      { path: '/muicharts/piecharts', element: <PieCharts /> },
      { path: '/muicharts/scattercharts', element: <ScatterCharts /> },
      { path: '/muicharts/sparklinecharts', element: <SparklineCharts /> },

      { path: '/mui-trees/simpletree/simpletree-customization', element: <SimpletreeCustomization /> },
      { path: '/mui-trees/simpletree/simpletree-expansion', element: <SimpletreeExpansion /> },
      { path: '/mui-trees/simpletree/simpletree-focus', element: <SimpletreeFocus /> },
      { path: '/mui-trees/simpletree/simpletree-items', element: <SimpletreeItems /> },
      { path: '/mui-trees/simpletree/simpletree-selection', element: <SimpletreeSelection /> },

      // Records Centralized Routes
      { path: '/apps/records/baptism', element: <BaptismRecordsPage /> },
      { path: '/apps/records/marriage', element: <MarriageRecordsPage /> },
      { path: '/apps/records/funeral', element: <FuneralRecordsPage /> },
      { path: '/apps/records/centralized', element: <CentralizedRecordsPageWrapper /> },
      { path: '/apps/records/manager', element: <DynamicRecordsManager /> },
      { path: '/apps/records/modern-manager', element: <ModernDynamicRecordsManager /> },
      { path: '/apps/records/editable', element: <EditableRecordPage /> },

      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/404', element: <NotFound404 /> },
      { path: '/auth/unauthorized', element: <Unauthorized /> },
      { path: '/auth/login', element: <OrthodoxLogin /> },
      { path: '/login', element: <Navigate to="/auth/login" replace /> },
      { path: '/auth/login2', element: <Login2 /> },
      { path: '/auth/register', element: <Register /> },
      { path: '/auth/register2', element: <Register2 /> },
      { path: '/auth/forgot-password', element: <ForgotPassword /> },
      { path: '/auth/forgot-password2', element: <ForgotPassword2 /> },
      { path: '/auth/two-steps', element: <TwoSteps /> },
      { path: '/auth/two-steps2', element: <TwoSteps2 /> },
      { path: '/auth/maintenance', element: <Maintenance /> },
      { path: '/landingpage', element: <ComingSoon pageName="The landing page" /> },
      { path: '/pages/pricing', element: <ComingSoon pageName="The pricing page" /> },
      { path: '/pages/faq', element: <ComingSoon pageName="The FAQ page" /> },
      { path: '/frontend-pages/homepage', element: <Homepage /> },
      { path: '/assign-task', element: <AssignTaskPage /> },
      { path: '/frontend-pages/about', element: <ComingSoon pageName="The about page" /> },
      { path: '/frontend-pages/contact', element: <ComingSoon pageName="The contact page" /> },
      { path: '/frontend-pages/portfolio', element: <ComingSoon pageName="The portfolio page" /> },
      { path: '/frontend-pages/pricing', element: <ComingSoon pageName="The pricing page" /> },
      { path: '/blog', element: <BlogFeed /> },
      { path: '/blog/:slug', element: <BlogPost /> },
      { path: '/frontend-pages/blog', element: <ComingSoon pageName="The blog page" /> },
      { path: '/frontend-pages/blog/detail/:id', element: <BlogPost /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];
const router = createBrowserRouter(Router);

export default router;
