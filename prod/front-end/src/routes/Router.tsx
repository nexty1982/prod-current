// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import HeadlineSourcePicker from '../components/headlines/HeadlineSourcePicker';
import SmartRedirect from '../components/routing/SmartRedirect';
import ComingSoon from '../components/shared/ComingSoon';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { RecordsProvider } from '../features/records-centralized/context/RecordsProvider';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const ModernDash = Loadable(lazy(() => import('../views/dashboard/EnhancedModernDashboard')));
const EcommerceDash = Loadable(lazy(() => import('../views/dashboard/Ecommerce')));
const OrthodMetricsDash = Loadable(lazy(() => import('../views/dashboard/OrthodoxMetrics')));

/* ****Raydar Components***** */
const RaydarAnalytics = Loadable(lazy(() => import('../views/raydar/dashboard/Analytics')));
const RaydarAlerts = Loadable(lazy(() => import('../views/raydar/ui/Alerts')));
const RaydarButtons = Loadable(lazy(() => import('../views/raydar/ui/Buttons')));
const RaydarCards = Loadable(lazy(() => import('../views/raydar/ui/Cards')));
const RaydarBadges = Loadable(lazy(() => import('../views/raydar/ui/Badges')));
const RaydarAvatars = Loadable(lazy(() => import('../views/raydar/ui/Avatars')));
const RaydarRatings = Loadable(lazy(() => import('../views/raydar/advanced/Ratings')));

// Charts
const RaydarAreaCharts = Loadable(lazy(() => import('../views/raydar/charts/Area')));

// Forms  
const RaydarFormValidation = Loadable(lazy(() => import('../views/raydar/forms/Validation')));

// Vector Maps
const RaydarWorldMap = Loadable(lazy(() => import('../views/raydar/vector-maps/World')));

// Pages
const RaydarWelcome = Loadable(lazy(() => import('../views/raydar/pages/Welcome')));

// Tables
const RaydarAdvancedBasic = Loadable(lazy(() => import('../views/raydar/tables/Basic')));

// Widgets
const RaydarWidgets = Loadable(lazy(() => import('../views/raydar/widgets/index')));

// Icons
const RaydarBoxIcons = Loadable(lazy(() => import('../views/raydar/icons/BoxIcons')));

/* ****Apps***** */
// const Blog = Loadable(lazy(() => import('../views/apps/blog/Blog')));
// const BlogDetail = Loadable(lazy(() => import('../views/apps/blog/BlogPost')));
const Contacts = Loadable(lazy(() => import('../views/apps/contacts/Contacts')));
const ChatApp = Loadable(lazy(() => import('../views/apps/chat/ChatApp')));
const Notes = Loadable(lazy(() => import('../views/apps/notes/Notes')));
const Tickets = Loadable(lazy(() => import('../views/apps/tickets/Tickets')));

/* ****Developer Tools***** */
const SiteStructureVisualizer = Loadable(lazy(() => import('../tools/SiteStructureVisualizer')));
const Kanban = Loadable(lazy(() => import('../views/apps/kanban/Kanban')));
const InvoiceList = Loadable(lazy(() => import('../views/apps/invoice/List')));
const InvoiceCreate = Loadable(lazy(() => import('../views/apps/invoice/Create')));
const InvoiceDetail = Loadable(lazy(() => import('../views/apps/invoice/Detail')));
const InvoiceEdit = Loadable(lazy(() => import('../views/apps/invoice/Edit')));
const Ecommerce = Loadable(lazy(() => import('../views/apps/eCommerce/Ecommerce')));
const EcommerceDetail = Loadable(lazy(() => import('../views/apps/eCommerce/EcommerceDetail')));
const EcommerceAddProduct = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceAddProduct')),
);
const EcommerceEditProduct = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceEditProduct')),
);
const EcomProductList = Loadable(lazy(() => import('../views/apps/eCommerce/EcomProductList')));
const EcomProductCheckout = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceCheckout')),
);
const Calendar = Loadable(lazy(() => import('../views/apps/calendar/BigCalendar')));
const OrthodoxLiturgicalCalendar = Loadable(lazy(() => import('../views/apps/calendar/OrthodoxLiturgicalCalendar')));
const SiteClone = Loadable(lazy(() => import('../views/apps/site-clone/SiteClone')));
// const Logs = Loadable(lazy(() => import('../views/apps/logs/Logs')));
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
const AssignTaskPage = Loadable(lazy(() => import('../pages/AssignTaskPage')));

// Church Management
const ChurchList = Loadable(lazy(() => import('../views/apps/church-management/ChurchList')));
const ChurchForm = Loadable(lazy(() => import('../views/apps/church-management/ChurchForm')));
const ChurchSetupWizard = Loadable(lazy(() => import('../features/church-management/wizard/ChurchSetupWizard')));



// Settings
const MenuSettings = Loadable(lazy(() => import('../views/settings/MenuSettings')));
const JITTerminalAccess = Loadable(lazy(() => import('../views/settings/JITTerminalAccess')));

// Notifications
const NotificationList = Loadable(lazy(() => import('../components/notifications/NotificationList')));
const NotificationPreferences = Loadable(lazy(() => import('../components/notifications/NotificationPreferences')));

// Admin
const UserManagement = Loadable(lazy(() => import('../views/admin/UserManagement')));
const RoleManagement = Loadable(lazy(() => import('../views/admin/RoleManagement')));
const AdminSettings = Loadable(lazy(() => import('../views/admin/AdminSettings')));
const OMSiteSurvey = Loadable(lazy(() => import('../views/admin/tools/OMSiteSurvey')));
const PageEditor = Loadable(lazy(() => import('../views/admin/tools/PageEditor')));
const BlogFeed = Loadable(lazy(() => import('../views/blog/BlogFeed')));
const BlogAdmin = Loadable(lazy(() => import('../views/admin/BlogAdmin')));
const SessionManagement = Loadable(lazy(() => import('../views/admin/SessionManagement')));
const AdminLogs = Loadable(lazy(() => import('../views/admin/SessionManagement')));
const ActivityLogs = Loadable(lazy(() => import('../views/admin/ActivityLogs')));
const MenuPermissions = Loadable(lazy(() => import('../views/admin/MenuPermissions')));
const MenuManagement = Loadable(lazy(() => import('../views/admin/MenuManagement')));
const OrthodMetricsAdmin = Loadable(lazy(() => import('../views/admin/OrthodoxMetricsAdmin')));
const AIAdminPanel = Loadable(lazy(() => import('../components/ai/AIAdminPanel')));
// const OMAIUltimateLogger = Loadable(lazy(() => import('../views/logs/LoggerDashboard')));
const ScriptRunner = Loadable(lazy(() => import('../components/admin/ScriptRunner')));
const SuperAdminDashboard = Loadable(lazy(() => import('../components/admin/SuperAdminDashboard')));
const SiteEditorDemo = Loadable(lazy(() => import('../views/demo/SiteEditorDemo')));
const AutoFixDemo = Loadable(lazy(() => import('../views/demo/AutoFixDemo')));
const GitOpsDemo = Loadable(lazy(() => import('../views/demo/GitOpsDemo')));

// Site Editor and JIT Terminal Components
const SiteEditor = Loadable(lazy(() => import('../components/SiteEditor')));
const JITTerminal = Loadable(lazy(() => import('../components/terminal/JITTerminal')));
const JITTerminalConsole = Loadable(lazy(() => import('../views/admin/JITTerminalConsole')));

// AI Lab
const OMAILab = Loadable(lazy(() => import('../pages/sandbox/ai-lab')));
const ProjectGenerator = Loadable(lazy(() => import('../pages/sandbox/project-generator')));
const ComponentLibrary = Loadable(lazy(() => import('../pages/sandbox/component-library')));
const ComponentPreview = Loadable(lazy(() => import('../pages/sandbox/component-preview')));
const OMBEditor = Loadable(lazy(() => import('../pages/omb/editor')));
const AdminDashboardLayout = Loadable(lazy(() => import('../components/admin/AdminDashboardLayout')));
const AdminPageFallback = Loadable(lazy(() => import('../components/admin/AdminPageFallback')));

// Big Book System
const OMBigBook = Loadable(lazy(() => import('../components/admin/OMBigBook')));
const BigBookDynamicRoute = Loadable(lazy(() => import('../components/admin/BigBookDynamicRoute')));

// OMAI Mobile
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../components/admin/OMAIDiscoveryPanelMobile')));

// Component Registry for Dynamic Addons
import { DynamicAddonRoute } from '../components/registry/ComponentRegistry';

// OMLearn Module
const OMLearn = Loadable(lazy(() => import('../modules/OMLearn/OMLearn')));

// Build System
const BuildConsole = Loadable(lazy(() => import('../components/admin/BuildConsole')));

// Demos
const OrthodoxThemeDemo = Loadable(lazy(() => import('../components/demos/OrthodoxThemeDemo')));
const AdvancedRecordsDemo = Loadable(lazy(() => import('../views/AdvancedRecordsDemo')));
const EditableRecordPage = Loadable(lazy(() => import('../views/EditableRecordPage')));
const TableThemeEditor = Loadable(lazy(() => import('../demos/TableThemeEditor')));
const RecordGeneratorPage = Loadable(lazy(() => import('../pages/RecordGeneratorPage')));
const VisualTestDemo = Loadable(lazy(() => import('../views/demo/VisualTestDemo')));

// Records Pages
const SSPPOCRecordsPage = Loadable(lazy(() => import('../views/records/SSPPOCRecordsPage')));
const UnifiedRecordsPage = Loadable(lazy(() => import('../views/records/UnifiedRecordsPage')));
const ChurchAdminList = Loadable(lazy(() => import('../views/admin/ChurchAdminList')));
const ChurchAdminPanel = Loadable(lazy(() => import('../views/admin/ChurchAdminPanelWorking')));
const ChurchRecordsPage = Loadable(lazy(() => import('../views/records/ChurchRecordsPage')));

// New Records Management (Shop Layout)
const RecordsManagement = Loadable(lazy(() => import('../pages/apps/records/index')));

// Church Records UI (based on eco-product-list)
const ChurchRecordsList = Loadable(lazy(() => import('../pages/apps/records-ui/index')));

// Records Centralized - New Auto-Discovery System
const BasicRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/BasicRecordsPage')));
const SSPPOCRecordsPageNew = Loadable(lazy(() => import('../features/records-centralized/components/SSPPOCRecordsPageNew')));
const RecordsAPIDetectionReport = Loadable(lazy(() => import('../features/records-centralized/components/RecordsAPIDetectionReport')));
const RecordsDemoPage = Loadable(lazy(() => import('../features/records-centralized/components/RecordsDemoPage')));

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
const OrthodMetricsDemo = Loadable(lazy(() => import('../views/pages/frontend-pages/OrthodoxMetricsDemo')));
const About = Loadable(lazy(() => import('../views/pages/frontend-pages/About')));
const Contact = Loadable(lazy(() => import('../views/pages/frontend-pages/Contact')));
const Portfolio = Loadable(lazy(() => import('../views/pages/frontend-pages/Portfolio')));
const PagePricing = Loadable(lazy(() => import('../views/pages/frontend-pages/Pricing')));
const BlogPage = Loadable(lazy(() => import('../views/pages/frontend-pages/Blog')));
const BlogPost = Loadable(lazy(() => import('../views/pages/frontend-pages/BlogPost')));

// CMS Pages
const PageEditorTest = Loadable(lazy(() => import('../views/apps/cms/PageEditorTest')));
const EnhancedPageEditor = Loadable(lazy(() => import('../views/apps/cms/EnhancedPageEditor')));
const EnhancedPageEditorTest = Loadable(lazy(() => import('../views/apps/cms/EnhancedPageEditorTest')));
const SimplePageEditor = Loadable(lazy(() => import('../views/apps/cms/SimplePageEditor')));
const SimplePageEditorTest = Loadable(lazy(() => import('../views/apps/cms/SimplePageEditorTest')));

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
      // Raydar Dashboard Routes
              {
          path: '/raydar/dashboard/analytics',
          element: (
            <ProtectedRoute>
              <RaydarAnalytics />
            </ProtectedRoute>
          )
        },
        {
          path: '/raydar/ui/alerts',
          element: (
            <ProtectedRoute>
              <RaydarAlerts />
            </ProtectedRoute>
          )
        },
        {
          path: '/raydar/ui/buttons',
          element: (
            <ProtectedRoute>
              <RaydarButtons />
            </ProtectedRoute>
          )
        },
        {
          path: '/raydar/ui/cards',
          element: (
            <ProtectedRoute>
              <RaydarCards />
            </ProtectedRoute>
          )
        },
        {
          path: '/raydar/ui/badges',
          element: (
            <ProtectedRoute>
              <RaydarBadges />
            </ProtectedRoute>
          )
        },
        {
          path: '/raydar/ui/avatars',
          element: (
            <ProtectedRoute>
              <RaydarAvatars />
            </ProtectedRoute>
          )
        },
        {
          path: '/raydar/advanced/ratings',
          element: (
            <ProtectedRoute>
              <RaydarRatings />
            </ProtectedRoute>
          )
        },
        // Charts Routes
        {
          path: '/raydar/charts/area',
          element: (
            <ProtectedRoute>
              <RaydarAreaCharts />
            </ProtectedRoute>
          )
        },
        // Forms Routes
        {
          path: '/raydar/forms/validation',
          element: (
            <ProtectedRoute>
              <RaydarFormValidation />
            </ProtectedRoute>
          )
        },
        // Vector Maps Routes
        {
          path: '/raydar/vector-maps/world',
          element: (
            <ProtectedRoute>
              <RaydarWorldMap />
            </ProtectedRoute>
          )
        },
        // Pages Routes
        {
          path: '/raydar/pages/welcome',
          element: (
            <ProtectedRoute>
              <RaydarWelcome />
            </ProtectedRoute>
          )
        },
        // Tables Routes
        {
          path: '/raydar/tables/basic',
          element: (
            <ProtectedRoute>
              <RaydarAdvancedBasic />
            </ProtectedRoute>
          )
        },
        // Widgets Routes
        {
          path: '/raydar/widgets',
          element: (
            <ProtectedRoute>
              <RaydarWidgets />
            </ProtectedRoute>
          )
        },
        // Icons Routes
        {
          path: '/raydar/icons/boxicons',
          element: (
            <ProtectedRoute>
              <RaydarBoxIcons />
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
      // {
      //   path: '/admin/omai-logger',
      //   element: (
      //     <ProtectedRoute requiredRole={['admin', 'super_admin']}>
      //       <AdminErrorBoundary>
      //         <OMAIUltimateLogger />
      //       </AdminErrorBoundary>
      //     </ProtectedRoute>
      //   )
      // },
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
            <RecordsProvider>
              <SSPPOCRecordsPage />
            </RecordsProvider>
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
            <RecordsProvider>
              <ChurchRecordsPage />
            </RecordsProvider>
          </ProtectedRoute>
        )
      },
      // New Records Management with Shop Layout
      {
        path: '/apps/records',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsProvider>
              <RecordsManagement />
            </RecordsProvider>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/baptism',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsProvider>
              <SSPPOCRecordsPage />
            </RecordsProvider>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsProvider>
              <SSPPOCRecordsPage />
            </RecordsProvider>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsProvider>
              <SSPPOCRecordsPage />
            </RecordsProvider>
          </ProtectedRoute>
        )
      },
      // Church Records UI - Professional Record Browser
      {
        path: '/apps/records-ui',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsProvider>
              <ChurchRecordsList />
            </RecordsProvider>
          </ProtectedRoute>
        )
      },
      // Test Records Auto-Discovery
      {
        path: '/apps/records/explorer',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsProvider>
              <BasicRecordsPage />
            </RecordsProvider>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/enhanced',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsProvider>
              <SSPPOCRecordsPageNew />
            </RecordsProvider>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/detection-report',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsAPIDetectionReport />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/demo',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsProvider>
              <RecordsDemoPage />
            </RecordsProvider>
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
      // {
      //   path: '/apps/logs',
      //   element: (
      //     <ProtectedRoute>
      //       <Logs />
      //     </ProtectedRoute>
      //   )
      // },
      
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
