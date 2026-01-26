// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../features/auth/auth/ProtectedRoute';
import AdminErrorBoundary from '../features/admin/ErrorBoundary/AdminErrorBoundary';
import HeadlineSourcePicker from '../shared/ui/legacy/headlines/HeadlineSourcePicker';
import SmartRedirect from '../shared/ui/legacy/routing/SmartRedirect';
import ComingSoon from '../shared/ui/ComingSoon';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import OMDeps from '../tools/om-deps/OM-deps';

/* ***Layouts**** */
const FullLayout   = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout  = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages (Dashboards)***** */
const ModernDash        = Loadable(lazy(() => import('../features/admin/dashboard/EnhancedModernDashboard')));
const EcommerceDash     = Loadable(lazy(() => import('../features/admin/dashboard/Ecommerce')));
const OrthodMetricsDash = Loadable(lazy(() => import('../features/admin/dashboard/OrthodoxMetrics')));

/* ****Apps***** */
const Contacts   = Loadable(lazy(() => import('../features/apps/contacts/Contacts')));
const ChatApp    = Loadable(lazy(() => import('../features/apps/chat/ChatApp')));
const Notes      = Loadable(lazy(() => import('../features/apps/notes/Notes')));
const Tickets    = Loadable(lazy(() => import('../features/apps/tickets/Tickets')));

/* ****Developer Tools & Apps***** */
const SiteStructureVisualizer = Loadable(lazy(() => import('../tools/SiteStructureVisualizer')));
const Kanban                  = Loadable(lazy(() => import('../features/apps/kanban/Kanban')));
const InvoiceList             = Loadable(lazy(() => import('../features/apps/invoice/List')));
const InvoiceCreate           = Loadable(lazy(() => import('../features/apps/invoice/Create')));
const InvoiceDetail           = Loadable(lazy(() => import('../features/apps/invoice/Detail')));
const InvoiceEdit             = Loadable(lazy(() => import('../features/apps/invoice/Edit')));
const Ecommerce               = Loadable(lazy(() => import('../features/apps/ecommerce/Ecommerce')));
const EcommerceDetail         = Loadable(lazy(() => import('../features/apps/ecommerce/EcommerceDetail')));
const EcommerceAddProduct     = Loadable(lazy(() => import('../features/apps/ecommerce/EcommerceAddProduct')));
const EcommerceEditProduct    = Loadable(lazy(() => import('../features/apps/ecommerce/EcommerceEditProduct')));
const EcomProductList         = Loadable(lazy(() => import('../features/apps/ecommerce/EcomProductList')));
const EcomProductCheckout     = Loadable(lazy(() => import('../features/apps/ecommerce/EcommerceCheckout')));
const Calendar                = Loadable(lazy(() => import('../features/apps/calendar/BigCalendar')));
const OrthodoxLiturgicalCalendar = Loadable(lazy(() => import('../features/apps/calendar/OrthodoxLiturgicalCalendar')));
const SiteClone               = Loadable(lazy(() => import('../features/apps/site-clone/SiteClone')));
const Logs                    = Loadable(lazy(() => import('../features/system/apps/logs/Logs')));
const UserProfile             = Loadable(lazy(() => import('../features/apps/user-profile/UserProfile')));
const Followers               = Loadable(lazy(() => import('../features/apps/user-profile/Followers')));
const Friends                 = Loadable(lazy(() => import('../features/apps/user-profile/Friends')));
const Gallery                 = Loadable(lazy(() => import('../features/apps/user-profile/Gallery')));
const Email                   = Loadable(lazy(() => import('../features/apps/email/Email')));

/* ****Social Features***** */
const SocialBlogList       = Loadable(lazy(() => import('../features/social/blog/BlogList')));
const SocialBlogCreate     = Loadable(lazy(() => import('../features/social/blog/BlogCreate')));
const SocialBlogEdit       = Loadable(lazy(() => import('../features/social/blog/BlogEdit')));
const SocialBlogView       = Loadable(lazy(() => import('../features/social/blog/BlogView')));
const SocialFriends        = Loadable(lazy(() => import('../features/social/friends/FriendsList')));
const SocialChat           = Loadable(lazy(() => import('../features/social/chat/SocialChat')));
const SocialNotifications  = Loadable(lazy(() => import('../features/social/notifications/NotificationCenter')));

/* Orthodox Headlines */
const OrthodoxHeadlines = Loadable(lazy(() => import('../features/headlines/OrthodoxHeadlines')));

/* OMAI Task Assignment */
const AssignTaskPage = Loadable(lazy(() => import('../features/omai/task-assign/AssignTaskPage')));

/* Church Management */
const ChurchList        = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchList')));
const ChurchForm        = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchForm')));
const ChurchSetupWizard = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchSetupWizard')));

/* Settings */
const MenuSettings     = Loadable(lazy(() => import('../features/settings/MenuSettings')));
const JITTerminalAccess= Loadable(lazy(() => import('../features/security/settings/JITTerminalAccess')));

/* Notifications */
const NotificationList        = Loadable(lazy(() => import('../features/notifications/NotificationList')));
const NotificationPreferences = Loadable(lazy(() => import('../features/notifications/NotificationPreferences')));

/* Admin */
const UserManagement      = Loadable(lazy(() => import('../features/admin/admin/UserManagement')));
const RoleManagement      = Loadable(lazy(() => import('../features/admin/admin/RoleManagement')));
const AdminSettings       = Loadable(lazy(() => import('../features/admin/admin/AdminSettings')));
const OMSiteSurvey        = Loadable(lazy(() => import('../features/admin/admin/tools/OMSiteSurvey')));
const PageEditor          = Loadable(lazy(() => import('../features/cms/apps/cms/PageEditor')));
const BlogFeed            = Loadable(lazy(() => import('../features/blog/BlogFeed')));
const BlogAdmin           = Loadable(lazy(() => import('../features/admin/admin/BlogAdmin')));
const SessionManagement   = Loadable(lazy(() => import('../features/auth/admin/SessionManagement')));
const AdminLogs           = Loadable(lazy(() => import('../features/admin/admin/AdminLogs')));
const ActivityLogs        = Loadable(lazy(() => import('../features/admin/admin/ActivityLogs')));
const MenuPermissions     = Loadable(lazy(() => import('../features/admin/admin/MenuPermissions')));
const MenuManagement      = Loadable(lazy(() => import('../features/admin/admin/MenuManagement')));
const OrthodMetricsAdmin  = Loadable(lazy(() => import('../features/admin/admin/OrthodoxMetricsAdmin')));
const AIAdminPanel        = Loadable(lazy(() => import('../features/admin/ai/AIAdminPanel')));
const OMAIUltimateLogger  = Loadable(lazy(() => import('../features/admin/logs/LoggerDashboard')));
const ScriptRunner        = Loadable(lazy(() => import('../features/admin/admin/ScriptRunner')));
const SuperAdminDashboard = Loadable(lazy(() => import('../features/admin/admin/SuperAdminDashboard')));
const SiteEditorDemo      = Loadable(lazy(() => import('../features/cms/demos/SiteEditorDemo')));
const AutoFixDemo         = Loadable(lazy(() => import('../features/devel-tools/demos/AutoFixDemo')));
const GitOpsDemo          = Loadable(lazy(() => import('../features/devel-tools/demos/GitOpsDemo')));

/* Site Editor and JIT Terminal Components */
const SiteEditor        = Loadable(lazy(() => import('../features/cms/apps/cms/SiteEditor')));
const JITTerminal       = Loadable(lazy(() => import('../features/system/terminal/JITTerminal')));
const JITTerminalConsole= Loadable(lazy(() => import('../features/admin/admin/JITTerminalConsole')));

/* AI Lab */
const OMAILab           = Loadable(lazy(() => import('../features/devel-tools/sandbox/ai-lab')));
const ProjectGenerator  = Loadable(lazy(() => import('../features/devel-tools/sandbox/project-generator')));
const ComponentLibrary  = Loadable(lazy(() => import('../features/devel-tools/sandbox/component-library')));
const ComponentPreview  = Loadable(lazy(() => import('../features/devel-tools/sandbox/component-preview')));
const OMBEditor         = Loadable(lazy(() => import('../features/omb/editor')));
const AdminDashboardLayout = Loadable(lazy(() => import('../features/admin/admin/AdminDashboardLayout')));
const AdminPageFallback    = Loadable(lazy(() => import('../features/admin/admin/AdminPageFallback')));

/* Big Book System */
const OMBigBook           = Loadable(lazy(() => import('../features/admin/admin/OMBigBook')));
const BigBookDynamicRoute = Loadable(lazy(() => import('../features/admin/admin/BigBookDynamicRoute')));

/* OMAI Mobile */
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../features/admin/admin/OMAIDiscoveryPanelMobile')));

/* Component Registry for Dynamic Addons */
import { DynamicAddonRoute } from '../features/system/registry/ComponentRegistry';

/* OMLearn Module */
const OMLearn = Loadable(lazy(() => import('../modules/OMLearn/OMLearn')));

/* Build System */
const BuildConsole = Loadable(lazy(() => import('../features/admin/admin/BuildConsole')));

/* Demos */
const OrthodoxThemeDemo   = Loadable(lazy(() => import('../features/devel-tools/demos/OrthodoxThemeDemo')));
const AdvancedRecordsDemo = Loadable(lazy(() => import('../features/records/AdvancedRecordsDemo')));
const EditableRecordPage  = Loadable(lazy(() => import('../features/records/EditableRecordPage')));
const TableThemeEditor    = Loadable(lazy(() => import('../features/tables/demos/TableThemeEditor')));
const RecordGeneratorPage = Loadable(lazy(() => import('../features/records/records/RecordGeneratorPage')));
const VisualTestDemo      = Loadable(lazy(() => import('../features/devel-tools/demos/VisualTestDemo')));

/* Records Pages */
const SSPPOCRecordsPage  = Loadable(lazy(() => import('../features/records/records/SSPPOCRecordsPage')));
const UnifiedRecordsPage = Loadable(lazy(() => import('../features/records/records/UnifiedRecordsPage')));
const ChurchAdminListPg  = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminList')));
const ChurchAdminPanel   = Loadable(lazy(() => import('../features/admin/admin/ChurchAdminPanelWorking')));
const ChurchRecordsPage  = Loadable(lazy(() => import('../features/records/records/ChurchRecordsPage')));

/* New Records Management (Shop Layout) */
const RecordsManagement  = Loadable(lazy(() => import('../features/records/apps/records/index')));

/* Church Records UI (eco-product-list) */
const ChurchRecordsList  = Loadable(lazy(() => import('../features/records/apps/records-ui/index')));

/* ui components (demo pages) */
const MuiAlert         = Loadable(lazy(() => import('../shared/ui/MuiAlert')));
const MuiAccordion     = Loadable(lazy(() => import('../shared/ui/MuiAccordion')));
const MuiAvatar        = Loadable(lazy(() => import('../shared/ui/MuiAvatar')));
const MuiChip          = Loadable(lazy(() => import('../shared/ui/MuiChip')));
const MuiDialog        = Loadable(lazy(() => import('../shared/ui/MuiDialog')));
const MuiList          = Loadable(lazy(() => import('../shared/ui/MuiList')));
const MuiPopover       = Loadable(lazy(() => import('../shared/ui/MuiPopover')));
const MuiRating        = Loadable(lazy(() => import('../shared/ui/MuiRating')));
const MuiTabs          = Loadable(lazy(() => import('../shared/ui/MuiTabs')));
const MuiTooltip       = Loadable(lazy(() => import('../shared/ui/MuiTooltip')));
const MuiTransferList  = Loadable(lazy(() => import('../shared/ui/MuiTransferList')));
const MuiTypography    = Loadable(lazy(() => import('../shared/ui/MuiTypography')));

/* form element demos */
const MuiAutoComplete = Loadable(lazy(() => import('../shared/ui/forms/elements/MuiAutoComplete')));
const MuiButton       = Loadable(lazy(() => import('../shared/ui/forms/elements/MuiButton')));
const MuiCheckbox     = Loadable(lazy(() => import('../shared/ui/forms/elements/MuiCheckbox')));
const MuiRadio        = Loadable(lazy(() => import('../shared/ui/forms/elements/MuiRadio')));
const MuiSlider       = Loadable(lazy(() => import('../shared/ui/forms/elements/MuiSlider')));
const MuiDateTime     = Loadable(lazy(() => import('../shared/ui/forms/elements/MuiDateTime')));
const MuiSwitch       = Loadable(lazy(() => import('../shared/ui/forms/elements/MuiSwitch')));

/* forms (demo pages) */
const FormLayouts   = Loadable(lazy(() => import('../shared/ui/forms/FormLayouts')));
const FormCustom    = Loadable(lazy(() => import('../shared/ui/forms/FormCustom')));
const FormHorizontal= Loadable(lazy(() => import('../shared/ui/forms/FormHorizontal')));
const FormVertical  = Loadable(lazy(() => import('../shared/ui/forms/FormVertical')));
const FormWizard    = Loadable(lazy(() => import('../shared/ui/forms/FormWizard')));
const FormValidation= Loadable(lazy(() => import('../shared/ui/forms/FormValidation')));
const TiptapEditor  = Loadable(lazy(() => import('../shared/ui/editor/tiptap/TiptapEditor')));

/* marketing pages */
const RollbaseCASL  = Loadable(lazy(() => import('../features/marketing/pages/casl/RollbaseCASL')));
const Faq           = Loadable(lazy(() => import('../features/marketing/pages/faq/Faq')));
const Pricing       = Loadable(lazy(() => import('../features/marketing/pages/pricing/Pricing')));
const AccountSetting= Loadable(lazy(() => import('../features/marketing/pages/account-setting/AccountSetting')));

/* charts */
const AreaChart        = Loadable(lazy(() => import('../features/analytics/charts/AreaChart')));
const CandlestickChart = Loadable(lazy(() => import('../features/analytics/charts/CandlestickChart')));
const ColumnChart      = Loadable(lazy(() => import('../features/analytics/charts/ColumnChart')));
const DoughnutChart    = Loadable(lazy(() => import('../features/analytics/charts/DoughnutChart')));
const GredientChart    = Loadable(lazy(() => import('../features/analytics/charts/GredientChart')));
const RadialbarChart   = Loadable(lazy(() => import('../features/analytics/charts/RadialbarChart')));
const LineChart        = Loadable(lazy(() => import('../features/analytics/charts/LineChart')));

/* tables */
const BasicTable       = Loadable(lazy(() => import('../features/tables/tables/BasicTable')));
const EnhanceTable     = Loadable(lazy(() => import('../features/tables/tables/EnhanceTable')));
const PaginationTable  = Loadable(lazy(() => import('../features/tables/tables/PaginationTable')));
const FixedHeaderTable = Loadable(lazy(() => import('../features/tables/tables/FixedHeaderTable')));
const CollapsibleTable = Loadable(lazy(() => import('../features/tables/tables/CollapsibleTable')));
const SearchTable      = Loadable(lazy(() => import('../features/tables/tables/SearchTable')));

/* react tables */
const ReactBasicTable            = Loadable(lazy(() => import('../features/tables/react-tables/basic/page')));
const ReactColumnVisibilityTable = Loadable(lazy(() => import('../features/tables/react-tables/columnvisibility/page')));
const ReactDenseTable            = Loadable(lazy(() => import('../features/tables/react-tables/dense/page')));
const ReactDragDropTable         = Loadable(lazy(() => import('../features/tables/react-tables/drag-drop/page')));
const ReactEditableTable         = Loadable(lazy(() => import('../features/tables/react-tables/editable/page')));
const ReactEmptyTable            = Loadable(lazy(() => import('../features/tables/react-tables/empty/page')));
const ReactExpandingTable        = Loadable(lazy(() => import('../features/tables/react-tables/expanding/page')));
const ReactFilterTable           = Loadable(lazy(() => import('../features/tables/react-tables/filtering/page')));
const ReactPaginationTable       = Loadable(lazy(() => import('../features/tables/react-tables/pagination/page')));
const ReactRowSelectionTable     = Loadable(lazy(() => import('../features/tables/react-tables/row-selection/page')));
const ReactSortingTable          = Loadable(lazy(() => import('../features/tables/react-tables/sorting/page')));
const ReactStickyTable           = Loadable(lazy(() => import('../features/tables/react-tables/sticky/page')));

/* mui charts */
const BarCharts       = Loadable(lazy(() => import('../features/analytics/muicharts/barcharts/page')));
const GaugeCharts     = Loadable(lazy(() => import('../features/analytics/muicharts/gaugecharts/page')));
const AreaCharts      = Loadable(lazy(() => import('../features/analytics/muicharts/linecharts/area/page')));
const LineCharts      = Loadable(lazy(() => import('../features/analytics/muicharts/linecharts/line/page')));
const PieCharts       = Loadable(lazy(() => import('../features/analytics/muicharts/piecharts/page')));
const ScatterCharts   = Loadable(lazy(() => import('../features/analytics/muicharts/scattercharts/page')));
const SparklineCharts = Loadable(lazy(() => import('../features/analytics/muicharts/sparklinecharts/page')));

/* mui trees */
const SimpletreeCustomization = Loadable(lazy(() => import('../shared/ui/tree/simpletree/simpletree-customization/page')));
const SimpletreeExpansion     = Loadable(lazy(() => import('../shared/ui/tree/simpletree/simpletree-expansion/page')));
const SimpletreeFocus         = Loadable(lazy(() => import('../shared/ui/tree/simpletree/simpletree-focus/page')));
const SimpletreeItems         = Loadable(lazy(() => import('../shared/ui/tree/simpletree/simpletree-items/page')));
const SimpletreeSelection     = Loadable(lazy(() => import('../shared/ui/tree/simpletree/simpletree-selection/page')));

/* widgets */
const WidgetCards   = Loadable(lazy(() => import('../shared/ui/widgets/cards/WidgetCards')));
const WidgetBanners = Loadable(lazy(() => import('../shared/ui/widgets/banners/WidgetBanners')));
const WidgetCharts  = Loadable(lazy(() => import('../shared/ui/widgets/charts/WidgetCharts')));

/* authentication */
const OrthodoxLogin  = Loadable(lazy(() => import('../features/auth/authentication/auth1/OrthodoxLogin')));
const Login2         = Loadable(lazy(() => import('../features/auth/authentication/auth2/Login2')));
const Register       = Loadable(lazy(() => import('../features/auth/authentication/auth1/Register')));
const Register2      = Loadable(lazy(() => import('../features/auth/authentication/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('../features/auth/authentication/auth1/ForgotPassword')));
const ForgotPassword2= Loadable(lazy(() => import('../features/auth/authentication/auth2/ForgotPassword2')));
const TwoSteps       = Loadable(lazy(() => import('../features/auth/authentication/auth1/TwoSteps')));
const TwoSteps2      = Loadable(lazy(() => import('../features/auth/authentication/auth2/TwoSteps2')));
const Error          = Loadable(lazy(() => import('../features/auth/authentication/Error')));
const Unauthorized   = Loadable(lazy(() => import('../features/auth/authentication/Unauthorized')));
const Maintenance    = Loadable(lazy(() => import('../features/auth/authentication/Maintenance')));

/* landing + front-end pages */
const Landingpage    = Loadable(lazy(() => import('../features/marketing/pages/landing/Landingpage')));
const Homepage       = Loadable(lazy(() => import('../features/marketing/pages/frontend/Homepage')));
const OrthodMetricsDemo = Loadable(lazy(() => import('../features/marketing/pages/frontend/OrthodoxMetricsDemo')));
const About          = Loadable(lazy(() => import('../features/marketing/pages/frontend/About')));
const Contact        = Loadable(lazy(() => import('../features/marketing/pages/frontend/Contact')));
const Portfolio      = Loadable(lazy(() => import('../features/marketing/pages/frontend/Portfolio')));
const PagePricing    = Loadable(lazy(() => import('../features/marketing/pages/frontend/Pricing')));
const BlogPage       = Loadable(lazy(() => import('../features/marketing/pages/frontend/Blog')));
const BlogPost       = Loadable(lazy(() => import('../features/marketing/pages/frontend/BlogPost')));

/* CMS Pages */
const PageEditorTest        = Loadable(lazy(() => import('../features/cms/apps/cms/PageEditorTest')));
const EnhancedPageEditor    = Loadable(lazy(() => import('../features/cms/apps/cms/EnhancedPageEditor')));
const EnhancedPageEditorTest= Loadable(lazy(() => import('../features/cms/apps/cms/EnhancedPageEditorTest')));
const SimplePageEditor      = Loadable(lazy(() => import('../features/cms/apps/cms/SimplePageEditor')));
const SimplePageEditorTest  = Loadable(lazy(() => import('../features/cms/apps/cms/SimplePageEditorTest')));

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
        path: '/apps/ecommerce/shop',
        element: (
          <ProtectedRoute>
            <Ecommerce />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/ecommerce/eco-product-list',
        element: (
          <ProtectedRoute>
            <EcomProductList />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/ecommerce/eco-checkout',
        element: (
          <ProtectedRoute>
            <EcomProductCheckout />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/ecommerce/add-product',
        element: (
          <ProtectedRoute>
            <EcommerceAddProduct />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/ecommerce/edit-product',
        element: (
          <ProtectedRoute>
            <EcommerceEditProduct />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/ecommerce/detail/:id',
        element: (
          <ProtectedRoute>
            <EcommerceDetail />
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
        path: '/apps/church-management/edit/:id',
        element: (
          <ProtectedRoute requiredPermission="manage_churches">
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
        path: '/admin/tools/page-editor',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'church_admin', 'admin']}>
            <AdminErrorBoundary>
              <PageEditor />
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
        path: '/admin/omai-logger',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OMAIUltimateLogger />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/site-editor',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <SiteEditor />
            </AdminErrorBoundary>
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
              <OMBEditor />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/demos/orthodox-theme',
        element: <OrthodoxThemeDemo />
      },
      {
        path: '/demos/advanced-records',
        element: (
                  <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin']}>
          <AdvancedRecordsDemo />
        </ProtectedRoute>
        )
      },
      {
        path: '/demos/editable-record',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <EditableRecordPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/demos/editable-record/:recordType',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <EditableRecordPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/demos/editable-record/:recordType/:recordId',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <EditableRecordPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/demos/table-tester',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <TableThemeEditor />
          </ProtectedRoute>
        )
      },
      {
        path: '/demos/record-generator',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordGeneratorPage />
          </ProtectedRoute>
        )
      },
                   {
               path: '/demos/site-editor',
               element: (
                 <ProtectedRoute requiredRole={['super_admin']}>
                   <SiteEditorDemo />
                 </ProtectedRoute>
               )
             },
                         {
              path: '/demos/auto-fix',
              element: (
                <ProtectedRoute requiredRole={['super_admin']}>
                  <AutoFixDemo />
                </ProtectedRoute>
              )
            },
            {
              path: '/demos/gitops',
              element: (
                <ProtectedRoute requiredRole={['super_admin']}>
                  <GitOpsDemo />
                </ProtectedRoute>
              )
            },
            {
              path: '/demos/vrt',
              element: (
                <ProtectedRoute requiredRole={['super_admin']}>
                  <VisualTestDemo />
                </ProtectedRoute>
              )
            },
      {
        path: '/records/baptism',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <SSPPOCRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/saints-peter-and-paul-Records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <ChurchRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/:churchId(\\d+)-records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <ChurchRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/:churchName-Records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <UnifiedRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <ChurchRecordsPage />
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
            <SSPPOCRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <SSPPOCRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <SSPPOCRecordsPage />
          </ProtectedRoute>
        )
      },
      // Church Records UI - Professional Record Browser
      {
        path: '/apps/records-ui',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <ChurchRecordsList />
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
        path: '/apps/calendar',
        element: (
          <ProtectedRoute requiredPermission="view_calendar">
            <Calendar />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/liturgical-calendar',
        element: <OrthodoxLiturgicalCalendar />
      },
      {
        path: '/apps/site-clone',
        element: (
          <ProtectedRoute requiredPermission="access_admin">
            <SiteClone />
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
      
      // =====================================================
      // DYNAMIC ADDON ROUTES
      // =====================================================
      
      // Parish Map Addon
      {
        path: '/addons/parish-map',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <DynamicAddonRoute route="/addons/parish-map" />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      
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

      {
        path: '/apps/cms/page-editor/:slug?',
        element: (
          <ProtectedRoute>
            <SimplePageEditorTest />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/cms/page-editor-enhanced/:slug?',
        element: (
          <ProtectedRoute>
            <EnhancedPageEditorTest />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/cms/page-editor-legacy/:slug?',
        element: (
          <ProtectedRoute>
            <PageEditorTest />
          </ProtectedRoute>
        )
      },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/404', element: <Error /> },
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
      { path: '/demo', element: <OrthodMetricsDemo /> },
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
