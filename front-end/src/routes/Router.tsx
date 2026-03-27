// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useAuth } from '@/context/AuthContext';
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
const PublicLayout = Loadable(lazy(() => import('../layouts/public/PublicLayout')));
const ChurchPortalLayout = Loadable(lazy(() => import('../layouts/portal/ChurchPortalLayout')));
const ChurchPortalHub = Loadable(lazy(() => import('../features/portal/ChurchPortalHub')));
const PortalSettingsPage = Loadable(lazy(() => import('../features/portal/PortalSettingsPage')));
const PortalSacramentalRestrictionsPage = Loadable(lazy(() => import('../features/portal/PortalSacramentalRestrictionsPage')));
const PortalRecordsPage = Loadable(lazy(() => import('../features/portal/PortalRecordsPage')));
const PortalCertificatesPage = Loadable(lazy(() => import('../features/portal/PortalCertificatesPage')));
// TODO: ParishOnboardingWizardPage and FieldConfigEditorPage not yet created
// const ParishOnboardingWizardPage = Loadable(lazy(() => import('../features/portal/onboarding/ParishOnboardingWizardPage')));
// const FieldConfigEditorPage = Loadable(lazy(() => import('../features/portal/onboarding/FieldConfigEditorPage')));

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
const PageEditor = Loadable(lazy(() => import('../features/devel-tools/page-editor/PageEditor')));
const Kanban = Loadable(lazy(() => import('../features/apps/kanban/Kanban')));
const InvoiceList = Loadable(lazy(() => import('../features/apps/invoice/List')));
const InvoiceCreate = Loadable(lazy(() => import('../features/apps/invoice/Create')));
const InvoiceDetail = Loadable(lazy(() => import('../features/apps/invoice/Detail')));
const InvoiceEdit = Loadable(lazy(() => import('../features/apps/invoice/Edit')));
// Removed: LiturgicalCalendarPage, OrthodoxLiturgicalCalendar
const DynamicRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/dynamic/DynamicRecordsPage')));
const AnalyticsDashboard = Loadable(lazy(() => import('../features/admin/AnalyticsDashboard')));
const Logs = Loadable(lazy(() => import('../features/system/apps/logs/Logs')));
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
// UserManagement — migrated to OMAI (/omai/ops/users)
const OMPermissionCenter = Loadable(lazy(() => import('../features/devel-tools/om-permission-center/PermissionsManagement')));
const AdminSettings = Loadable(lazy(() => import('../features/admin/admin/AdminSettings')));
const OMSiteSurvey = Loadable(lazy(() => import('../features/admin/admin/tools/OMSiteSurvey')));
// Removed: BlogFeed from misc-legacy
const BlogAdmin = Loadable(lazy(() => import('../features/admin/admin/BlogAdmin')));
// TutorialManagement — migrated to OMAI (/omai/ops/tutorials)
const SessionManagement = Loadable(lazy(() => import('../features/auth/admin/SessionManagement')));
const AdminLogs = Loadable(lazy(() => import('../features/admin/admin/AdminLogs')));
const ActivityLogs = Loadable(lazy(() => import('../features/admin/admin/ActivityLogs')));
const MenuPermissions = Loadable(lazy(() => import('../features/admin/admin/MenuPermissions')));
const MenuManagement = Loadable(lazy(() => import('../features/admin/admin/MenuManagement')));
const ChurchPublishingGuide = Loadable(lazy(() => import('../features/admin/components/ChurchPublishingGuide')));
const InteractiveReportReview = Loadable(lazy(() => import('../features/records-centralized/components/interactiveReport/InteractiveReportReview')));
const InteractiveReportsPage = Loadable(lazy(() => import('../features/records-centralized/components/interactiveReport/InteractiveReportsPage')));
const CertificateGeneratorPage = Loadable(lazy(() => import('../features/certificates/CertificateGeneratorPage')));
const RecipientSubmissionPage = Loadable(lazy(() => import('../features/records-centralized/components/interactiveReport/RecipientSubmissionPage')));
const PublicCollaborationPage = Loadable(lazy(() => import('../features/records-centralized/components/collaborationLinks/PublicCollaborationPage')));
const InteractiveReportJobsPage = Loadable(lazy(() => import('../features/devel-tools/interactive-reports/InteractiveReportJobsPage')));
const BuildInfoPage = Loadable(lazy(() => import('../features/devel-tools/build-info/BuildInfoPage')));
const RepoOpsPage = Loadable(lazy(() => import('../features/devel-tools/repo-ops/RepoOpsPage')));
const PlatformStatusPage = Loadable(lazy(() => import('../features/devel-tools/platform-status/PlatformStatusPage')));
const OrthodMetricsAdmin = Loadable(lazy(() => import('../features/admin/admin/OrthodoxMetricsAdmin')));
const AIAdminPanel = Loadable(lazy(() => import('../features/admin/ai/AIAdminPanel')));
const OMAIUltimateLogger = Loadable(lazy(() => import('../features/devel-tools/om-ultimatelogger/LoggerDashboard')));
const ScriptRunner = Loadable(lazy(() => import('../features/admin/admin/ScriptRunner')));
const AdminControlPanel = Loadable(lazy(() => import('../features/admin/control-panel/AdminControlPanel')));
const ChurchManagementPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchManagementPage')));
const SacramentalRestrictionsPage = Loadable(lazy(() => import('../features/admin/control-panel/SacramentalRestrictionsPage')));
const OrthodoxScheduleGuidelinesPage = Loadable(lazy(() => import('../features/admin/control-panel/OrthodoxScheduleGuidelinesPage')));
const PendingMembersPage = Loadable(lazy(() => import('../features/admin/control-panel/PendingMembersPage')));
const ChurchOnboardingPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchOnboardingPage')));
const ChurchOnboardingDetailPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchOnboardingDetailPage')));
const JurisdictionsPage = Loadable(lazy(() => import('../features/admin/control-panel/JurisdictionsPage')));
const DemoChurchesPage = Loadable(lazy(() => import('../features/admin/control-panel/DemoChurchesPage')));
const ChurchPipelinePage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchPipelinePage')));
const RecordsOCRPage = Loadable(lazy(() => import('../features/admin/control-panel/RecordsOCRPage')));
// CRMOutreachPage — migrated to OMAI
const SystemServerPage = Loadable(lazy(() => import('../features/admin/control-panel/SystemServerPage')));
const AIAutomationPage = Loadable(lazy(() => import('../features/admin/control-panel/AIAutomationPage')));
const CodeChangeDetection = Loadable(lazy(() => import('../features/admin/ai/CodeChangeDetection')));
const RecordsLandingConfig = Loadable(lazy(() => import('../features/admin/church-branding/RecordsLandingConfig')));
// OM Daily retired from orthodoxmetrics — now on OMAI Operations Hub
const OMAppSuitePage = Loadable(lazy(() => import('../features/admin/control-panel/OMAppSuitePage')));
const SDLCPage = Loadable(lazy(() => import('../features/admin/control-panel/SDLCPage')));
const ComponentsInDevelopmentPage = Loadable(lazy(() => import('../features/admin/control-panel/ComponentsInDevelopmentPage')));
const DeprecatedComponentsPage = Loadable(lazy(() => import('../features/admin/control-panel/DeprecatedComponentsPage')));
const ChurchLifecycleDetailPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchLifecycleDetailPage')));
const OnboardingPipelinePage = Loadable(lazy(() => import('../features/admin/control-panel/OnboardingPipelinePage')));
const OnboardingPipelineDetailPage = Loadable(lazy(() => import('../features/admin/control-panel/OnboardingPipelineDetailPage')));
const UsersSecurityPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/UsersSecurityPage')));
const ContentMediaPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/ContentMediaPage')));
const SocialCommsPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/SocialCommsPage')));
const ServerDevOpsPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/ServerDevOpsPage')));
const PlatformConfigPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/PlatformConfigPage')));
const CodeSafetyPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/CodeSafetyPage')));
const SSLCertificatePage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/SSLCertificatePage')));
const SiteMapPage = Loadable(lazy(() => import('../features/admin/SiteMapPage')));
const CertificateTemplatesPage = Loadable(lazy(() => import('../features/admin/control-panel/CertificateTemplatesPage')));
const CRMPage = Loadable(lazy(() => import('../features/devel-tools/crm/CRMPage')));
const USChurchMapPage = Loadable(lazy(() => import('../features/devel-tools/us-church-map/USChurchMapPage')));
const LogSearch = Loadable(lazy(() => import('../features/admin/dashboard/LogSearch')));
const OmOcrStudioPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OmOcrStudioPage')));
const UploadRecordsPage = Loadable(lazy(() => import('../features/records-centralized/apps/upload-records/UploadRecordsPage')));
// Removed: SuperDashboard, SuperDashboardCustomizer, UserDashboard — replaced by AdminControlPanel and ChurchPortalHub
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
const OcrOperationsDashboard = Loadable(lazy(() => import('../features/devel-tools/ocr-operations/OcrOperationsDashboard')));
const OcrBatchManager = Loadable(lazy(() => import('../features/devel-tools/ocr-operations/OcrBatchManager')));
// OMTasksPage, DailyTasks — retired, now managed via OMAI OM Daily
const ApiExplorerPage = Loadable(lazy(() => import('../features/devel-tools/api-explorer/ApiExplorerPage')));
const LiveTableBuilderPage = Loadable(lazy(() => import('../features/devel-tools/live-table-builder/LiveTableBuilderPage')));
const GitOperations = Loadable(lazy(() => import('../features/devel-tools/git-operations/GitOperations')));
// ConversationLogPage — retired, now on OMAI Operations Hub
// ChangeSetsDashboard, ChangeSetDetailPage, ReleaseHistoryPage, SDLCWizardPage, PromptPlans — retired, now on OMAI
const RecordCreationWizard = Loadable(lazy(() => import('../features/devel-tools/om-seedlings/RecordCreationWizard')));
const OMChartsPage = Loadable(lazy(() => import('../features/church/apps/om-charts/OMChartsPage')));

/* ****Account Hub***** */
const AccountLayout = Loadable(lazy(() => import('../features/account/AccountLayout')));
const AccountProfilePage = Loadable(lazy(() => import('../features/account/AccountProfilePage')));
const AccountPersonalInfoPage = Loadable(lazy(() => import('../features/account/AccountPersonalInfoPage')));
const AccountPasswordPage = Loadable(lazy(() => import('../features/account/AccountPasswordPage')));
const AccountParishInfoPage = Loadable(lazy(() => import('../features/account/AccountParishInfoPage')));
const AccountChurchDetailsPage = Loadable(lazy(() => import('../features/account/AccountChurchDetailsPage')));
const AccountBrandingPage = Loadable(lazy(() => import('../features/account/AccountBrandingPage')));
const AccountSessionsPage = Loadable(lazy(() => import('../features/account/AccountSessionsPage')));
const AccountNotificationsPage = Loadable(lazy(() => import('../features/account/AccountNotificationsPage')));
const AccountOcrPreferencesPage = Loadable(lazy(() => import('../features/account/AccountOcrPreferencesPage')));

/* ****Parish Management Hub***** */
const ParishManagementLayout = Loadable(lazy(() => import('../features/account/parish-management/ParishManagementLayout')));
const ParishDashboard = Loadable(lazy(() => import('../features/account/parish-management/ParishDashboard')));
const DatabaseMappingPage = Loadable(lazy(() => import('../features/account/parish-management/DatabaseMappingPage')));
const PMRecordSettingsPage = Loadable(lazy(() => import('../features/account/parish-management/RecordSettingsPage')));
const LandingPageBrandingPage = Loadable(lazy(() => import('../features/account/parish-management/LandingPageBrandingPage')));
const ThemeStudioPage = Loadable(lazy(() => import('../features/account/parish-management/ThemeStudioPage')));
const UIThemePage = Loadable(lazy(() => import('../features/account/parish-management/UIThemePage')));
const SearchConfigurationPage = Loadable(lazy(() => import('../features/account/parish-management/SearchConfigurationPage')));
const SystemBehaviorPage = Loadable(lazy(() => import('../features/account/parish-management/SystemBehaviorPage')));

/* ****Help & Documentation***** */
const UserGuide = Loadable(lazy(() => import('../features/help/UserGuide')));

/* ****Berry Components***** */
// Berry Components removed — CRM, Calendar, Map, Cards, Profile prototypes retired
const LiturgicalCalendarPage = Loadable(lazy(() => import('../features/liturgical-calendar/LiturgicalCalendarPage')));

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
const RegisterToken = Loadable(lazy(() => import('../features/auth/authentication/authForms/AuthRegisterToken')));
const AcceptInvite = Loadable(lazy(() => import('../features/auth/AcceptInvite')));
const ForgotPassword = Loadable(lazy(() => import('../features/auth/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/ForgotPassword2')));
const VerifyEmailPage = Loadable(lazy(() => import('../features/auth/VerifyEmailPage')));
const TwoSteps = Loadable(lazy(() => import('../features/auth/authentication/auth1/TwoSteps')));
const TwoSteps2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/TwoSteps2')));
const Error = Loadable(lazy(() => import('../features/auth/authentication/Error')));
const Unauthorized = Loadable(lazy(() => import('../features/auth/authentication/Unauthorized')));
const Maintenance = Loadable(lazy(() => import('../features/auth/authentication/Maintenance')));

// Removed: Landingpage — /landingpage now redirects to /admin/control-panel

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
const SampleRecordsExplorer = Loadable(lazy(() => import('../features/pages/frontend-pages/SampleRecordsExplorer')));
const Gallery = Loadable(lazy(() => import('../features/devel-tools/om-gallery/Gallery')));
const PageImageIndex = Loadable(lazy(() => import('../features/devel-tools/PageImageIndex')));
const OCATimeline = Loadable(lazy(() => import('../features/pages/frontend-pages/OCATimeline')));
const PublicTasksListPage = Loadable(lazy(() => import('../features/pages/frontend-pages/PublicTasksListPage')));
const PublicTaskDetailPage = Loadable(lazy(() => import('../features/pages/frontend-pages/PublicTaskDetailPage')));
const WelcomeMessage = Loadable(lazy(() => import('../features/pages/frontend-pages/WelcomeMessage')));
const Tour = Loadable(lazy(() => import('../features/pages/frontend-pages/Tour')));
const Faq = Loadable(lazy(() => import('../features/pages/frontend-pages/Faq')));
const SacramentalRestrictionsPublicPage = Loadable(lazy(() => import('../features/pages/frontend-pages/SacramentalRestrictionsPublicPage')));

/**
 * Super admins stay in FullLayout (admin shell with sidebar).
 * All other users get ChurchPortalLayout (portal-style, no sidebar).
 */
function AccountLayoutSwitcher() {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <FullLayout />;
  return <ChurchPortalLayout />;
}

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
      // Legacy dashboard redirects — SuperDashboard/UserDashboard removed, redirect to replacements
      { path: '/dashboards/user', element: <Navigate to="/portal" replace /> },
      { path: '/dashboards/super', element: <Navigate to="/admin/control-panel" replace /> },
      { path: '/dashboards/super/customize', element: <Navigate to="/admin/control-panel" replace /> },
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
        element: <Navigate to="/account/parish-management/database-mapping" replace />,
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
      // Site Map — full navigation tree with "you are here"
      {
        path: '/site-map',
        element: (
          <ProtectedRoute>
            <SiteMapPage />
          </ProtectedRoute>
        )
      },
      // Modernize User Profile Routes → redirect to Account Hub
      {
        path: '/apps/user-profile',
        element: <Navigate to="/account/profile" replace />,
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
      // Legacy user profile routes → redirect to Account Hub
      {
        path: '/user-profile',
        element: <Navigate to="/account/profile" replace />,
      },
      // Account Hub moved to top-level route (outside FullLayout) so non-admin users
      // can access it without the admin sidebar. See top-level /account route block.
      // Removed: /settings/menu, /settings/jit-terminal routes
      // /admin/users — migrated to OMAI (/omai/ops/users)
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
      {
        path: '/admin/control-panel/onboarding-pipeline',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin']}>
            <AdminErrorBoundary>
              <EnvironmentAwarePage featureId="onboarding-pipeline" priority={4} featureName="Onboarding Pipeline">
                <OnboardingPipelinePage />
              </EnvironmentAwarePage>
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/control-panel/onboarding-pipeline/:id',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin']}>
            <AdminErrorBoundary>
              <EnvironmentAwarePage featureId="onboarding-pipeline-detail" priority={4} featureName="Onboarding Detail">
                <OnboardingPipelineDetailPage />
              </EnvironmentAwarePage>
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
      // Conversation Log, Prompt Plans — retired from OM, now on OMAI Operations Hub
      {
        path: '/devel-tools/record-creation-wizard',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <RecordCreationWizard />
            </AdminErrorBoundary>
          </ProtectedRoute>
        ),
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

      // Berry Component Routes removed — CRM, Calendar, Map, Cards, Profile prototypes retired
      {
        path: '/apps/liturgical-calendar',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="liturgical-calendar" priority={1} featureName="Liturgical Calendar">
              <LiturgicalCalendarPage />
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
       path: '/apps/records/interactive-reports',
       element: (
         <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
           <EnvironmentAwarePage
             featureId="interactive-reports"
             priority={4}
             featureName="Interactive Reports"
           >
             <InteractiveReportsPage />
           </EnvironmentAwarePage>
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
      // TODO: Parish Onboarding Wizard — page not yet created
      // { path: 'onboarding', element: <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin']}><ParishOnboardingWizardPage /></ProtectedRoute> },
      // TODO: Record Field Settings — page not yet created
      // { path: 'settings/fields', element: <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin']}><FieldConfigEditorPage /></ProtectedRoute> },
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
      // Sacramental Restrictions (portal version — uses updated schedule guidelines)
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
  },
  // ── Account Hub — super_admin uses FullLayout, others use portal ──
  {
    path: '/account',
    element: <AccountLayoutSwitcher />,
    children: [
      {
        element: (
          <ProtectedRoute>
            <AccountLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/account/profile" replace /> },
          { path: 'profile', element: <AccountProfilePage /> },
          { path: 'personal-info', element: <AccountPersonalInfoPage /> },
          { path: 'password', element: <AccountPasswordPage /> },
          { path: 'sessions', element: <AccountSessionsPage /> },
          { path: 'notifications', element: <AccountNotificationsPage /> },
          { path: 'parish', element: <AccountParishInfoPage /> },
          { path: 'church-details', element: <AccountChurchDetailsPage /> },
          { path: 'branding', element: <AccountBrandingPage /> },
          { path: 'ocr-preferences', element: <AccountOcrPreferencesPage /> },
        ],
      },
      // Parish Management Hub — own sidebar layout
      {
        path: 'parish-management',
        element: (
          <ProtectedRoute>
            <ParishManagementLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <ParishDashboard /> },
          { path: 'database-mapping', element: <DatabaseMappingPage /> },
          { path: 'database-mapping/:step', element: <DatabaseMappingPage /> },
          { path: 'record-settings', element: <PMRecordSettingsPage /> },
          { path: 'landing-page-branding', element: <LandingPageBrandingPage /> },
          { path: 'theme-studio', element: <ThemeStudioPage /> },
          { path: 'ui-theme', element: <UIThemePage /> },
          { path: 'search-configuration', element: <SearchConfigurationPage /> },
          { path: 'system-behavior', element: <SystemBehaviorPage /> },
        ],
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
          { path: 'register-token', element: <RegisterToken /> },
          { path: 'register2', element: <Register2 /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'forgot-password2', element: <ForgotPassword2 /> },
          { path: 'two-steps', element: <TwoSteps /> },
          { path: 'two-steps2', element: <TwoSteps2 /> },
          { path: 'maintenance', element: <Maintenance /> },
          { path: 'accept-invite/:token', element: <AcceptInvite /> },
          { path: 'verify-email', element: <VerifyEmailPage /> },
          { path: '*', element: <NotFound404 /> },
        ]
      },
      // Root login redirect
      { path: 'login', element: <Navigate to="/auth/login2" replace /> },
      { path: '/landingpage', element: <Navigate to="/admin/control-panel" replace /> },
      { path: '/pages/pricing', element: <Navigate to="/admin/control-panel" replace /> },
      { path: '/pages/faq', element: <Faq /> },
      { path: '/frontend-pages/faq', element: <Faq /> },
      { path: '/frontend-pages/menu', element: <PagesMenu /> },
      { path: '/frontend-pages/portfolio', element: <Portfolio /> },
      { path: '/frontend-pages/oca-timeline', element: <OCATimeline /> },
      { path: '/frontend-pages/welcome-message', element: <WelcomeMessage /> },
      { path: '/blog/:slug', element: <BlogPost /> },
      { path: '/frontend-pages/blog/detail/:id', element: <BlogPost /> },
      { path: '/frontend-pages/gallery', element: <Gallery /> },
      { path: '/frontend-pages/sacramental-restrictions', element: <SacramentalRestrictionsPublicPage /> },
      // Public pages with shared header/footer via PublicLayout
      {
        element: <PublicLayout />,
        children: [
          { path: '/frontend-pages/homepage', element: <Homepage /> },
          { path: '/frontend-pages/about', element: <About /> },
          { path: '/frontend-pages/contact', element: <Contact /> },
          { path: '/frontend-pages/pricing', element: <PagePricing /> },
          { path: '/frontend-pages/blog', element: <BlogPage /> },
          { path: '/samples', element: <Samples /> },
          { path: '/frontend-pages/samples', element: <Samples /> },
          { path: '/samples/explorer', element: <SampleRecordsExplorer /> },
          { path: '/tour', element: <Tour /> },
        ],
      },
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
