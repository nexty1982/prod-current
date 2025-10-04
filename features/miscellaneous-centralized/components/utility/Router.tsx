// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { REFACTORED_ROUTES, REFACTORED_IMPORTS } from './refactoredRegistry';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import HeadlineSourcePicker from '../components/headlines/HeadlineSourcePicker';
import SmartRedirect from '../components/routing/SmartRedirect';
import ComingSoon from '../components/shared/ComingSoon';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import OMDeps from '../tools/om-deps/OM-deps';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const ModernDash = Loadable(lazy(() => import('../views/dashboard/EnhancedModernDashboard')));
const EcommerceDash = Loadable(lazy(() => import('../views/dashboard/Ecommerce')));
const OrthodMetricsDash = Loadable(lazy(() => import('../views/dashboard/OrthodoxMetrics')));

/* ****Apps***** */
// const Blog = Loadable(lazy(() => import('../views/apps/blog/Blog')));
// const BlogDetail = Loadable(lazy(() => import('../views/apps/blog/BlogPost')));
const Contacts = Loadable(lazy(() => import('../views/apps/contacts/Contacts')));
const ChatApp = Loadable(lazy(() => import('../views/apps/chat/ChatApp')));
const Notes = Loadable(lazy(() => import('../views/apps/notes/Notes')));
const Tickets = Loadable(lazy(() => import('../views/apps/tickets/Tickets')));

/* ****Developer Tools***** */
const SiteStructureVisualizer = Loadable(lazy(() => import('../tools/SiteStructureVisualizer')));
const OmtraceConsole = Loadable(lazy(() => import('../components/ui-tools/omtrace/OmtraceConsole')));
const Kanban = Loadable(lazy(() => import('../views/apps/kanban/Kanban')));
const InvoiceList = Loadable(lazy(() => import('../views/apps/invoice/List')));
const InvoiceCreate = Loadable(lazy(() => import('../views/apps/invoice/Create')));
const InvoiceDetail = Loadable(lazy(() => import('../views/apps/invoice/Detail')));
const InvoiceEdit = Loadable(lazy(() => import('../views/apps/invoice/Edit')));
const LiturgicalCalendarPage = Loadable(lazy(() => import('../pages/calendar/LiturgicalCalendarPage')));
const SiteClone = Loadable(lazy(() => import('../views/apps/site-clone/SiteClone')));
const Logs = Loadable(lazy(() => import('../views/apps/logs/Logs')));
const UserProfile = Loadable(lazy(() => import('../views/apps/user-profile/UserProfile')));
const Followers = Loadable(lazy(() => import('../views/apps/user-profile/Followers')));
const Friends = Loadable(lazy(() => import('../views/apps/user-profile/Friends')));
const Gallery = Loadable(lazy(() => import('../views/apps/user-profile/Gallery')));
const Email = Loadable(lazy(() => import('../views/apps/email/Email')));

/* ****Social Features***** */
const SocialBlogList = Loadable(lazy(() => import('../views/social/blog/BlogList')));
const SocialBlogCreate = Loadable(lazy(() => import('../views/social/blog/BlogCreate')));
const SocialBlogEdit = Loadable(lazy(() => import('../views/social/blog/BlogEdit')));
const SocialBlogView = Loadable(lazy(() => import('../views/social/blog/BlogView')));
const SocialFriends = Loadable(lazy(() => import('../views/social/friends/FriendsList')));
const SocialChat = Loadable(lazy(() => import('../views/social/chat/SocialChat')));
const SocialNotifications = Loadable(lazy(() => import('../views/social/notifications/NotificationCenter')));

// Orthodox Headlines
const OrthodoxHeadlines = Loadable(lazy(() => import('../pages/OrthodoxHeadlines')));

// OMAI Task Assignment
const AssignTaskPage = Loadable(lazy(() => import('../views/pages/AssignTask')));

// 404 Page
const NotFound404 = Loadable(lazy(() => import('../views/pages/NotFound404')));

// Church Management
const ChurchList = Loadable(lazy(() => import('../views/apps/church-management/ChurchList')));
const ChurchForm = Loadable(lazy(() => import('../views/apps/church-management/ChurchForm')));
const ChurchSetupWizard = Loadable(lazy(() => import('../components/church-management/ch-wiz/ChurchSetupWizard')));
const FieldMapperPage = Loadable(lazy(() => import('../features/church/FieldMapperPage')));
const RecordsPageWrapper = Loadable(lazy(() => import('../pages/apps/church-management/RecordsPageWrapper')));

// Records Management
const AdvancedGridPage = Loadable(lazy(() => import('../components/AdvancedGridPage')));
const ChurchRecordsSimplePage = Loadable(lazy(() => import('../views/records/ChurchRecordsSimplePage')));
const DynamicRecordsPageWrapper = Loadable(lazy(() => import('../pages/apps/records/DynamicRecordsPageWrapper')));
const EnhancedRecordsGrid = Loadable(lazy(() => import('../features/records/EnhancedRecordsGrid')));

// Settings
const MenuSettings = Loadable(lazy(() => import('../views/settings/MenuSettings')));
const JITTerminalAccess = Loadable(lazy(() => import('../views/settings/JITTerminalAccess')));

// Notifications
const NotificationList = Loadable(lazy(() => import('../components/notifications/NotificationList')));
const NotificationPreferences = Loadable(lazy(() => import('../components/notifications/NotificationPreferences')));

// Admin
const UserManagement = Loadable(lazy(() => import('../views/admin/UserManagement')));
const PermissionsManagement = Loadable(lazy(() => import('../views/admin/PermissionsManagement')));
const RoleManagement = Loadable(lazy(() => import('../views/admin/RoleManagement')));
const AdminSettings = Loadable(lazy(() => import('../views/admin/AdminSettings')));
const OMSiteSurvey = Loadable(lazy(() => import('../views/admin/tools/OMSiteSurvey')));
const BlogFeed = Loadable(lazy(() => import('../views/blog/BlogFeed')));
const BlogAdmin = Loadable(lazy(() => import('../views/admin/BlogAdmin')));
const SessionManagement = Loadable(lazy(() => import('../views/admin/SessionManagement')));
const AdminLogs = Loadable(lazy(() => import('../views/admin/SessionManagement')));
const ActivityLogs = Loadable(lazy(() => import('../views/admin/ActivityLogs')));
const MenuPermissions = Loadable(lazy(() => import('../views/admin/MenuPermissions')));
const MenuManagement = Loadable(lazy(() => import('../views/admin/MenuManagement')));
const OrthodMetricsAdmin = Loadable(lazy(() => import('../views/admin/OrthodoxMetricsAdmin')));
const AIAdminPanel = Loadable(lazy(() => import('../components/ai/AIAdminPanel')));
const OMAIUltimateLogger = Loadable(lazy(() => import('../views/logs/LoggerDashboard')));
const ScriptRunner = Loadable(lazy(() => import('../components/admin/ScriptRunner')));
const SuperAdminDashboard = Loadable(lazy(() => import('../components/admin/SuperAdminDashboard')));

const JITTerminal = Loadable(lazy(() => import('../components/terminal/JITTerminal')));
const JITTerminalConsole = Loadable(lazy(() => import('../views/admin/JITTerminalConsole')));

// AI Lab
const OMAILab = Loadable(lazy(() => import('../pages/sandbox/ai-lab')));
const ProjectGenerator = Loadable(lazy(() => import('../pages/sandbox/project-generator')));
const ComponentLibrary = Loadable(lazy(() => import('../pages/sandbox/component-library')));
const ComponentPreview = Loadable(lazy(() => import('../pages/sandbox/component-preview')));
const AdminDashboardLayout = Loadable(lazy(() => import('../components/admin/AdminDashboardLayout')));
const AdminPageFallback = Loadable(lazy(() => import('../components/admin/AdminPageFallback')));

// Big Book System
const OMBigBook = Loadable(lazy(() => import('../components/admin/OMBigBook')));
const BigBookDynamicRoute = Loadable(lazy(() => import('../components/admin/BigBookDynamicRoute')));

// OMAI Mobile
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../components/admin/OMAIDiscoveryPanelMobile')));

// Component Registry for Dynamic Addons
import { DynamicAddonRoute } from '../components/registry/ComponentRegistry';

// Refactored Component Routes (already imported at top)

// OMLearn Module
const OMLearn = Loadable(lazy(() => import('../modules/OMLearn/OMLearn')));

// Build System
const BuildConsole = Loadable(lazy(() => import('../components/admin/BuildConsole')));

// Records Pages
import { RECORDS_LEGACY_ENABLED } from '../config/featureFlags';

const ChurchAdminList = Loadable(lazy(() => import('../views/admin/ChurchAdminList')));
const ChurchAdminPanel = Loadable(lazy(() => import('../views/admin/ChurchAdminPanelWorking')));

// New Records Management (Shop Layout)
const RecordsManagement = Loadable(lazy(() => import('../pages/apps/records/index')));

// Church Records UI (based on eco-product-list)

// Records UI Page



// ui components
const MuiAlert = Loadable(lazy(() => import('../views/ui-components/MuiAlert')));
const MuiAccordion = Loadable(lazy(() => import('../views/ui-components/MuiAccordion')));
const MuiAvatar = Loadable(lazy(() => import('../views/ui-components/MuiAvatar')));
const MuiChip = Loadable(lazy(() => import('../views/ui-components/MuiChip')));
const MuiDialog = Loadable(lazy(() => import('../views/ui-components/MuiDialog')));
const MuiList = Loadable(lazy(() => import('../views/ui-components/MuiList')));
const MuiPopover = Loadable(lazy(() => import('../views/ui-components/MuiPopover')));
const MuiRating = Loadable(lazy(() => import('../views/ui-components/MuiRating')));
const MuiTabs = Loadable(lazy(() => import('../views/ui-components/MuiTabs')));
const MuiTooltip = Loadable(lazy(() => import('../views/ui-components/MuiTooltip')));
const MuiTransferList = Loadable(lazy(() => import('../views/ui-components/MuiTransferList')));
const MuiTypography = Loadable(lazy(() => import('../views/ui-components/MuiTypography')));

// form elements
const MuiAutoComplete = Loadable(
  lazy(() => import('../views/forms/form-elements/MuiAutoComplete')),
);
const MuiButton = Loadable(lazy(() => import('../views/forms/form-elements/MuiButton')));
const MuiCheckbox = Loadable(lazy(() => import('../views/forms/form-elements/MuiCheckbox')));
const MuiRadio = Loadable(lazy(() => import('../views/forms/form-elements/MuiRadio')));
const MuiSlider = Loadable(lazy(() => import('../views/forms/form-elements/MuiSlider')));
const MuiDateTime = Loadable(lazy(() => import('../views/forms/form-elements/MuiDateTime')));
const MuiSwitch = Loadable(lazy(() => import('../views/forms/form-elements/MuiSwitch')));

// forms
const FormLayouts = Loadable(lazy(() => import('../views/forms/FormLayouts')));
const FormCustom = Loadable(lazy(() => import('../views/forms/FormCustom')));
const FormHorizontal = Loadable(lazy(() => import('../views/forms/FormHorizontal')));
const FormVertical = Loadable(lazy(() => import('../views/forms/FormVertical')));
const FormWizard = Loadable(lazy(() => import('../views/forms/FormWizard')));
const FormValidation = Loadable(lazy(() => import('../views/forms/FormValidation')));
const TiptapEditor = Loadable(lazy(() => import('../views/forms/from-tiptap/TiptapEditor')));

// pages
const RollbaseCASL = Loadable(lazy(() => import('../views/pages/rollbaseCASL/RollbaseCASL')));
const Faq = Loadable(lazy(() => import('../views/pages/faq/Faq')));
const Pricing = Loadable(lazy(() => import('../views/pages/pricing/Pricing')));
const AccountSetting = Loadable(
  lazy(() => import('../views/pages/account-setting/AccountSetting')),
);

// charts
const AreaChart = Loadable(lazy(() => import('../views/charts/AreaChart')));
const CandlestickChart = Loadable(lazy(() => import('../views/charts/CandlestickChart')));
const ColumnChart = Loadable(lazy(() => import('../views/charts/ColumnChart')));
const DoughnutChart = Loadable(lazy(() => import('../views/charts/DoughnutChart')));
const GredientChart = Loadable(lazy(() => import('../views/charts/GredientChart')));
const RadialbarChart = Loadable(lazy(() => import('../views/charts/RadialbarChart')));
const LineChart = Loadable(lazy(() => import('../views/charts/LineChart')));

// tables
const BasicTable = Loadable(lazy(() => import('../views/tables/BasicTable')));
const EnhanceTable = Loadable(lazy(() => import('../views/tables/EnhanceTable')));
const PaginationTable = Loadable(lazy(() => import('../views/tables/PaginationTable')));
const FixedHeaderTable = Loadable(lazy(() => import('../views/tables/FixedHeaderTable')));
const CollapsibleTable = Loadable(lazy(() => import('../views/tables/CollapsibleTable')));
const SearchTable = Loadable(lazy(() => import('../views/tables/SearchTable')));

//react tables
const ReactBasicTable = Loadable(lazy(() => import('../views/react-tables/basic/page')));
const ReactColumnVisibilityTable = Loadable(
  lazy(() => import('../views/react-tables/columnvisibility/page')),
);
const ReactDenseTable = Loadable(lazy(() => import('../views/react-tables/dense/page')));
const ReactDragDropTable = Loadable(lazy(() => import('../views/react-tables/drag-drop/page')));
const ReactEditableTable = Loadable(lazy(() => import('../views/react-tables/editable/page')));
const ReactEmptyTable = Loadable(lazy(() => import('../views/react-tables/empty/page')));
const ReactExpandingTable = Loadable(lazy(() => import('../views/react-tables/expanding/page')));
const ReactFilterTable = Loadable(lazy(() => import('../views/react-tables/filtering/page')));
const ReactPaginationTable = Loadable(lazy(() => import('../views/react-tables/pagination/page')));
const ReactRowSelectionTable = Loadable(
  lazy(() => import('../views/react-tables/row-selection/page')),
);
const ReactSortingTable = Loadable(lazy(() => import('../views/react-tables/sorting/page')));
const ReactStickyTable = Loadable(lazy(() => import('../views/react-tables/sticky/page')));

//mui charts
const BarCharts = Loadable(lazy(() => import('../views/muicharts/barcharts/page')));
const GaugeCharts = Loadable(lazy(() => import('../views/muicharts/gaugecharts/page')));
const AreaCharts = Loadable(lazy(() => import('../views/muicharts/linecharts/area/page')));
const LineCharts = Loadable(lazy(() => import('../views/muicharts/linecharts/line/page')));
const PieCharts = Loadable(lazy(() => import('../views/muicharts/piecharts/page')));
const ScatterCharts = Loadable(lazy(() => import('../views/muicharts/scattercharts/page')));
const SparklineCharts = Loadable(lazy(() => import('../views/muicharts/sparklinecharts/page')));

//mui charts
const SimpletreeCustomization = Loadable(lazy(() => import('../views/mui-trees/simpletree/simpletree-customization/page')));
const SimpletreeExpansion = Loadable(lazy(() => import('../views/mui-trees/simpletree/simpletree-expansion/page')));
const SimpletreeFocus = Loadable(lazy(() => import('../views/mui-trees/simpletree/simpletree-focus/page')));
const SimpletreeItems = Loadable(lazy(() => import('../views/mui-trees/simpletree/simpletree-items/page')));
const SimpletreeSelection = Loadable(lazy(() => import('../views/mui-trees/simpletree/simpletree-selection/page')));

// widget
const WidgetCards = Loadable(lazy(() => import('../views/widgets/cards/WidgetCards')));
const WidgetBanners = Loadable(lazy(() => import('../views/widgets/banners/WidgetBanners')));
const WidgetCharts = Loadable(lazy(() => import('../views/widgets/charts/WidgetCharts')));

// authentication
const OrthodoxLogin = Loadable(lazy(() => import('../views/authentication/auth1/OrthodoxLogin')));
const Login2 = Loadable(lazy(() => import('../views/authentication/auth2/Login2')));
const Register = Loadable(lazy(() => import('../views/authentication/auth1/Register')));
const Register2 = Loadable(lazy(() => import('../views/authentication/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('../views/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(
  lazy(() => import('../views/authentication/auth2/ForgotPassword2')),
);
const TwoSteps = Loadable(lazy(() => import('../views/authentication/auth1/TwoSteps')));
const TwoSteps2 = Loadable(lazy(() => import('../views/authentication/auth2/TwoSteps2')));
const Error = Loadable(lazy(() => import('../views/authentication/Error')));
const Unauthorized = Loadable(lazy(() => import('../views/authentication/Unauthorized')));
const Maintenance = Loadable(lazy(() => import('../views/authentication/Maintenance')));

// landingpage
const Landingpage = Loadable(lazy(() => import('../views/pages/landingpage/Landingpage')));

// front end pages
const Homepage = Loadable(lazy(() => import('../views/pages/frontend-pages/Homepage')));
const About = Loadable(lazy(() => import('../views/pages/frontend-pages/About')));
const Contact = Loadable(lazy(() => import('../views/pages/frontend-pages/Contact')));
const Portfolio = Loadable(lazy(() => import('../views/pages/frontend-pages/Portfolio')));
const PagePricing = Loadable(lazy(() => import('../views/pages/frontend-pages/Pricing')));
const BlogPage = Loadable(lazy(() => import('../views/pages/frontend-pages/Blog')));
const BlogPost = Loadable(lazy(() => import('../views/pages/frontend-pages/BlogPost')));

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
            <ModernDash />
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
        path: '/tools/omtrace',
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
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
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

      {
        path: '/admin/churches',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <ChurchAdminList />
          </ProtectedRoute>
        )
      },

      // Refactored Component Routes (Static Lazy)
      ...REFACTORED_ROUTES.map(r => {
        const Cmp = REFACTORED_IMPORTS[r.path];
        if (!Cmp) {
          console.warn(`Missing lazy import for route: ${r.path}`);
          return null;
        }
        return {
          path: `/refactored/${r.path}`,
          element: (
            <ProtectedRoute requiredRole={['admin', 'super_admin']}>
              <AdminErrorBoundary>
                <Suspense fallback={null}>
                  <Cmp />
                </Suspense>
              </AdminErrorBoundary>
            </ProtectedRoute>
          )
        };
      }).filter(Boolean),

      // Debug route for OMTrace Console (remove after validation)
      {
        path: '/__debug/tools/omtrace',
        element: <OmtraceConsole />
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

      // Refactored Components Routes
      { path: '/refactored/tools/omtrace', element: <OmtraceConsole /> },
      { path: '/refactored/tools/site-structure', element: <SiteStructureVisualizer /> },
      { path: '/refactored/tools/om-deps', element: <OMDeps /> },
      { path: '/refactored/tools/omls', element: <OMDeps /> }, // Placeholder for OMLS

      { path: '/refactored/church/setup-wizard', element: <ChurchSetupWizard /> },
      { path: '/refactored/church/server-manager', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/church/edit-modal', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/church/management', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/church/wizard', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/site/editor', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/site/editor-overlay', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/site/editor-test', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/site/editor-error-boundary', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/site/editor-fallback', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/user/form-modal', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/user/reset-password', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/user/authentication', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/user/social-permissions', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/admin/component-inspector', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/git-ops', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/super-dashboard', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/script-runner', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/build-console', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/system-watchdog', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/memory-manager', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/notification-management', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/component-discovery', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/admin-page-fallback', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/admin-tile', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/admin/admin-dashboard-layout', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/bigbook/main', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/bigbook/settings', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/bigbook/console', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/bigbook/custom-viewer', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/bigbook/kanban-sync', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/bigbook/dynamic-route', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/ai/admin-panel', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ai/log-analysis', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ai/translation-assistant', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ai/content-generator', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ai/deployment-automation', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ai/analytics-dashboard', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/data/advanced-grid', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/data/advanced-grid-dialog', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/data/record-generator', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/data/import-records', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/data/import-records-v2', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/data/import-records-simple', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/data/upload-token-manager', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/data/ssppoc-records', element: <OMDeps /> }, // Placeholder
      { path: '/apps/records-simple', element: <ChurchRecordsSimplePage /> }, // Simple Church Records
      { path: '/apps/records-simple/:churchId', element: <ChurchRecordsSimplePage /> }, // Simple Church Records with Church ID
      { path: '/refactored/data/advanced-records-demo', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/data/editable-record-page', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/kanban/board', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/kanban/column', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/kanban/task-card', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/kanban/task-modal', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/ui/themed-table', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ui/table-theme-selector', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ui/table-theme-demo', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ui/table-control-panel', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ui/color-picker-popover', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/ui/ag-grid-view-only', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/debug/permission-debugger', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/debug/component-inspector', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/debug/visual-regression', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/debug/vrt-settings', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/terminal/jit-terminal', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/content/markdown-upload', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/content/ocr-scan-preview', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/content/manual-fix-editor', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/security/encrypted-storage', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/security/nfs-backup-config', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/security/sdlc-backup-panel', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/forms/questionnaire-preview', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/forms/tsx-component-install', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/files/uploaded-file-list', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/files/file-viewer', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/omai/task-assignment', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/omai/discovery-panel', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/omai/discovery-panel-mobile', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/public/assign-task', element: <OMDeps /> }, // Placeholder

      // 🔄 DUPLICATE Components Routes
      { path: '/refactored/duplicate/profile-tab', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/profile-tab-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/profile-tab-backup2', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/profile-tab-backup3', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/profile-banner', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/profile-banner-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/profile-banner-backup2', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/profile-banner-backup3', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/post-item', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-item-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-item-backup2', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-item-backup3', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/post-comments', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-comments-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-comments-backup2', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-comments-backup3', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/post', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-backup2', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/post-backup3', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/photos-card', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/photos-card-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/photos-card-backup2', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/photos-card-backup3', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/intro-card', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/intro-card-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/intro-card-backup2', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/intro-card-backup3', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/gallery-card', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/gallery-card-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/gallery-card-backup2', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/friends-card', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/friends-card-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/friends-card-backup2', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/follower-card', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/follower-card-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/follower-card-backup2', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/user-profile', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/user-profile-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/user-profile-backup2', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/gallery', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/gallery-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/gallery-backup2', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/friends', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/friends-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/friends-backup2', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/followers', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/followers-backup1', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/followers-backup2', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/email-data', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/email-data-backup1', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/kanban-data', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/kanban-data-backup1', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/church-setup-wizard', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/church-setup-wizard-backup1', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/summary', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/summary-backup1', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/success', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/success-backup1', element: <OMDeps /> }, // Placeholder

      { path: '/refactored/duplicate/provision-dashboard', element: <OMDeps /> }, // Placeholder
      { path: '/refactored/duplicate/provision-dashboard-backup1', element: <OMDeps /> }, // Placeholder

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
