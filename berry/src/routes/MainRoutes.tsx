import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import ErrorBoundary from './ErrorBoundary';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';

import { loader as productsLoader, productLoader } from 'api/products';

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('views/dashboard/Default')));
const DashboardAnalytics = Loadable(lazy(() => import('views/dashboard/Analytics')));

// widget routing
const WidgetStatistics = Loadable(lazy(() => import('views/widget/Statistics')));
const WidgetData = Loadable(lazy(() => import('views/widget/Data')));
const WidgetChart = Loadable(lazy(() => import('views/widget/Chart')));

// application - user social & account profile routing
const AppUserSocialProfile = Loadable(lazy(() => import('views/application/users/social-profile')));
const AppUserAccountProfile1 = Loadable(lazy(() => import('views/application/users/account-profile/Profile1')));
const AppUserAccountProfile2 = Loadable(lazy(() => import('views/application/users/account-profile/Profile2')));
const AppUserAccountProfile3 = Loadable(lazy(() => import('views/application/users/account-profile/Profile3')));

// application - user cards & list variant routing
const AppProfileCardStyle1 = Loadable(lazy(() => import('views/application/users/card/CardStyle1')));
const AppProfileCardStyle2 = Loadable(lazy(() => import('views/application/users/card/CardStyle2')));
const AppProfileCardStyle3 = Loadable(lazy(() => import('views/application/users/card/CardStyle3')));
const AppProfileListStyle1 = Loadable(lazy(() => import('views/application/users/list/Style1')));
const AppProfileListStyle2 = Loadable(lazy(() => import('views/application/users/list/Style2')));

// application - customer routing
const AppCustomerList = Loadable(lazy(() => import('views/application/customer/CustomerList')));
const AppCustomerOrderList = Loadable(lazy(() => import('views/application/customer/OrderList')));
const AppCustomerCreateInvoice = Loadable(lazy(() => import('views/application/customer/CreateInvoice')));
const AppCustomerOrderDetails = Loadable(lazy(() => import('views/application/customer/OrderDetails')));
const AppCustomerProduct = Loadable(lazy(() => import('views/application/customer/Product')));
const AppCustomerProductReview = Loadable(lazy(() => import('views/application/customer/ProductReview')));

// application - chat / kanban / kanban / mail / calendar / contact routing
const AppChat = Loadable(lazy(() => import('views/application/chat')));
const AppKanban = Loadable(lazy(() => import('views/application/kanban')));
const AppKanbanBacklogs = Loadable(lazy(() => import('views/application/kanban/Backlogs')));
const AppKanbanBoard = Loadable(lazy(() => import('views/application/kanban/Board')));
const AppMail = Loadable(lazy(() => import('views/application/mail')));
const AppCalendar = Loadable(lazy(() => import('views/application/calendar')));
const AppContactCard = Loadable(lazy(() => import('views/application/contact/Card')));
const AppContactList = Loadable(lazy(() => import('views/application/contact/List')));

// application - e-commerce routing
const AppECommProducts = Loadable(lazy(() => import('views/application/e-commerce/Products')));
const AppECommProductDetails = Loadable(lazy(() => import('views/application/e-commerce/ProductDetails')));
const AppECommProductList = Loadable(lazy(() => import('views/application/e-commerce/ProductList')));
const AppECommCheckout = Loadable(lazy(() => import('views/application/e-commerce/Checkout')));

// application - invoice routing
const AppInvoiceDashboard = Loadable(lazy(() => import('views/application/invoice/Dashboard')));
const AppInvoiceCreate = Loadable(lazy(() => import('views/application/invoice/Create')));
const AppInvoiceList = Loadable(lazy(() => import('views/application/invoice/List')));
const AppInvoiceEdit = Loadable(lazy(() => import('views/application/invoice/Edit')));
const AppInvoiceDetails = Loadable(lazy(() => import('views/application/invoice/Details')));
const AppInvoiceAddClient = Loadable(lazy(() => import('views/application/invoice/Client/AddClient')));
const AppInvoiceClientList = Loadable(lazy(() => import('views/application/invoice/Client/ClientList')));
const AppInvoiceAddItem = Loadable(lazy(() => import('views/application/invoice/Items/AddItem')));
const AppInvoiceItemList = Loadable(lazy(() => import('views/application/invoice/Items/ItemList')));
const AppInvoiceAddPayment = Loadable(lazy(() => import('views/application/invoice/Payment/AddPayment')));
const AppInvoicePaymentList = Loadable(lazy(() => import('views/application/invoice/Payment/PaymentList')));
const AppInvoicePaymentDetails = Loadable(lazy(() => import('views/application/invoice/Payment/PaymentDetails')));

// application crm routing
const AppCrmLeadOverview = Loadable(lazy(() => import('views/application/crm/LeadManagement/Overview')));
const AppCrmLeadList = Loadable(lazy(() => import('views/application/crm/LeadManagement/LeadList')));
const AppCrmContactCard = Loadable(lazy(() => import('views/application/crm/ContactManagement/ContactCard')));
const AppCrmContactList = Loadable(lazy(() => import('views/application/crm/ContactManagement/ContactList')));
const AppCrmRemindersFollowup = Loadable(lazy(() => import('views/application/crm/ContactManagement/RemindersFollowUp')));
const AppCrmCommunicationHistory = Loadable(lazy(() => import('views/application/crm/ContactManagement/CommunicationHistory')));
const AppCrmStatement = Loadable(lazy(() => import('views/application/crm/SalesManagement/Statement')));
const AppCrmRefund = Loadable(lazy(() => import('views/application/crm/SalesManagement/Refund')));
const AppCrmEarning = Loadable(lazy(() => import('views/application/crm/SalesManagement/Earning')));

// application blog routing
const AppBlogDashboard = Loadable(lazy(() => import('views/application/blog/Dashboard')));
const AppBlogGeneralSettings = Loadable(lazy(() => import('views/application/blog/GeneralSettings')));
const AppBlogAddNew = Loadable(lazy(() => import('views/application/blog/AddNewBlog')));
const AppBlogEdit = Loadable(lazy(() => import('views/application/blog/EditBlog')));
const AppBlogList = Loadable(lazy(() => import('views/application/blog/List')));
const AppBlogDetails = Loadable(lazy(() => import('views/application/blog/Details')));

// map routing
const AppMap = Loadable(lazy(() => import('views/application/map')));

// forms component routing
const FrmComponentsTextfield = Loadable(lazy(() => import('views/forms/components/TextField')));
const FrmComponentsButton = Loadable(lazy(() => import('views/forms/components/Button')));
const FrmComponentsCheckbox = Loadable(lazy(() => import('views/forms/components/Checkbox')));
const FrmComponentsRadio = Loadable(lazy(() => import('views/forms/components/Radio')));
const FrmComponentsSwitch = Loadable(lazy(() => import('views/forms/components/Switch')));
const FrmComponentsAutoComplete = Loadable(lazy(() => import('views/forms/components/AutoComplete')));
const FrmComponentsSlider = Loadable(lazy(() => import('views/forms/components/Slider')));
const FrmComponentsDateTime = Loadable(lazy(() => import('views/forms/components/DateTime')));

// forms plugins layout
const FrmLayoutLayout = Loadable(lazy(() => import('views/forms/layouts/Layouts')));
const FrmLayoutMultiColumnForms = Loadable(lazy(() => import('views/forms/layouts/MultiColumnForms')));
const FrmLayoutActionBar = Loadable(lazy(() => import('views/forms/layouts/ActionBar')));
const FrmLayoutStickyActionBar = Loadable(lazy(() => import('views/forms/layouts/StickyActionBar')));

// forms plugins routing
const FrmAutocomplete = Loadable(lazy(() => import('views/forms/plugins/AutoComplete')));
const FrmMask = Loadable(lazy(() => import('views/forms/plugins/Mask')));
const FrmClipboard = Loadable(lazy(() => import('views/forms/plugins/Clipboard')));
const FrmRecaptcha = Loadable(lazy(() => import('views/forms/plugins/Recaptcha')));
const FrmEditor = Loadable(lazy(() => import('views/forms/plugins/Editor')));
const FrmModal = Loadable(lazy(() => import('views/forms/plugins/Modal')));
const FrmTooltip = Loadable(lazy(() => import('views/forms/plugins/Tooltip')));
const FrmDropzone = Loadable(lazy(() => import('views/forms/plugins/Dropzone')));

// table routing
const TableBasic = Loadable(lazy(() => import('views/forms/tables/TableBasic')));
const TableDense = Loadable(lazy(() => import('views/forms/tables/TableDense')));
const TableEnhanced = Loadable(lazy(() => import('views/forms/tables/TableEnhanced')));
const TableData = Loadable(lazy(() => import('views/forms/tables/TableData')));
const TableCustomized = Loadable(lazy(() => import('views/forms/tables/TablesCustomized')));
const TableStickyHead = Loadable(lazy(() => import('views/forms/tables/TableStickyHead')));
const TableCollapsible = Loadable(lazy(() => import('views/forms/tables/TableCollapsible')));

// data-grid routing
const DataGridBasic = Loadable(lazy(() => import('views/forms/data-grid/DataGridBasic')));
const DataGridInlineEditing = Loadable(lazy(() => import('views/forms/data-grid/InlineEditing')));
const DataGridColumnGrouping = Loadable(lazy(() => import('views/forms/data-grid/ColumnGroups')));
const DataGridSaveRestoreState = Loadable(lazy(() => import('views/forms/data-grid/SaveRestoreState')));
const DataGridQuickFilter = Loadable(lazy(() => import('views/forms/data-grid/QuickFilter')));
const DataGridColumnVisibility = Loadable(lazy(() => import('views/forms/data-grid/ColumnVisibility')));
const DataGridColumnVirtualization = Loadable(lazy(() => import('views/forms/data-grid/ColumnVirtualization')));
const DataGridColumnMenu = Loadable(lazy(() => import('views/forms/data-grid/ColumnMenu')));

// forms validation
const FrmFormsValidation = Loadable(lazy(() => import('views/forms/forms-validation')));
const FrmFormsWizard = Loadable(lazy(() => import('views/forms/forms-wizard')));

// chart routing
const ChartApexchart = Loadable(lazy(() => import('views/forms/chart/Apexchart')));
const OrgChartPage = Loadable(lazy(() => import('views/forms/chart/OrgChart')));

// basic ui-elements routing
const BasicUIAccordion = Loadable(lazy(() => import('views/ui-elements/basic/UIAccordion')));
const BasicUIAvatar = Loadable(lazy(() => import('views/ui-elements/basic/UIAvatar')));
const BasicUIBadges = Loadable(lazy(() => import('views/ui-elements/basic/UIBadges')));
const BasicUIBreadcrumb = Loadable(lazy(() => import('views/ui-elements/basic/UIBreadcrumb')));
const BasicUICards = Loadable(lazy(() => import('views/ui-elements/basic/UICards')));
const BasicUIChip = Loadable(lazy(() => import('views/ui-elements/basic/UIChip')));
const BasicUIList = Loadable(lazy(() => import('views/ui-elements/basic/UIList')));
const BasicUITabs = Loadable(lazy(() => import('views/ui-elements/basic/UITabs')));

// advance ui-elements routing
const AdvanceUIAlert = Loadable(lazy(() => import('views/ui-elements/advance/UIAlert')));
const AdvanceUIDialog = Loadable(lazy(() => import('views/ui-elements/advance/UIDialog')));
const AdvanceUIPagination = Loadable(lazy(() => import('views/ui-elements/advance/UIPagination')));
const AdvanceUIProgress = Loadable(lazy(() => import('views/ui-elements/advance/UIProgress')));
const AdvanceUIRating = Loadable(lazy(() => import('views/ui-elements/advance/UIRating')));
const AdvanceUISnackbar = Loadable(lazy(() => import('views/ui-elements/advance/UISnackbar')));
const AdvanceUISkeleton = Loadable(lazy(() => import('views/ui-elements/advance/UISkeleton')));
const AdvanceUISpeeddial = Loadable(lazy(() => import('views/ui-elements/advance/UISpeeddial')));
const AdvanceUITimeline = Loadable(lazy(() => import('views/ui-elements/advance/UITimeline')));
const AdvanceUIToggleButton = Loadable(lazy(() => import('views/ui-elements/advance/UIToggleButton')));
const AdvanceUITreeview = Loadable(lazy(() => import('views/ui-elements/advance/UITreeview')));

// pricing page routing
const PagesPrice1 = Loadable(lazy(() => import('views/pages/pricing/Price1')));
const PagesPrice2 = Loadable(lazy(() => import('views/pages/pricing/Price2')));

// utilities routing
const UtilsTypography = Loadable(lazy(() => import('views/utilities/Typography')));
const UtilsColor = Loadable(lazy(() => import('views/utilities/Color')));
const UtilsShadow = Loadable(lazy(() => import('views/utilities/Shadow')));
const UtilsAnimation = Loadable(lazy(() => import('views/utilities/Animation')));
const UtilsGrid = Loadable(lazy(() => import('views/utilities/Grid')));

// sample page routing
const SamplePage = Loadable(lazy(() => import('views/sample-page')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: (
    <AuthGuard>
      <MainLayout />
    </AuthGuard>
  ),
  children: [
    {
      path: '/widget/statistics',
      element: <WidgetStatistics />
    },
    {
      path: '/widget/data',
      element: <WidgetData />
    },
    {
      path: '/widget/chart',
      element: <WidgetChart />
    },

    {
      path: '/apps/user/social-profile/:tab',
      element: <AppUserSocialProfile />
    },
    {
      path: '/apps/user/account-profile/profile1',
      element: <AppUserAccountProfile1 />
    },
    {
      path: '/apps/user/account-profile/profile2',
      element: <AppUserAccountProfile2 />
    },
    {
      path: '/apps/user/account-profile/profile3',
      element: <AppUserAccountProfile3 />
    },

    {
      path: '/apps/user/card/card1',
      element: <AppProfileCardStyle1 />
    },
    {
      path: '/apps/user/card/card2',
      element: <AppProfileCardStyle2 />
    },
    {
      path: '/apps/user/card/card3',
      element: <AppProfileCardStyle3 />
    },
    {
      path: '/apps/user/list/list1',
      element: <AppProfileListStyle1 />
    },
    {
      path: '/apps/user/list/list2',
      element: <AppProfileListStyle2 />
    },

    {
      path: '/apps/customer/customer-list',
      element: <AppCustomerList />
    },
    {
      path: '/apps/customer/order-list',
      element: <AppCustomerOrderList />
    },
    {
      path: '/apps/customer/create-invoice',
      element: <AppCustomerCreateInvoice />
    },
    {
      path: '/apps/customer/order-details',
      element: <AppCustomerOrderDetails />
    },
    {
      path: '/apps/customer/product',
      element: <AppCustomerProduct />
    },
    {
      path: '/apps/customer/product-review',
      element: <AppCustomerProductReview />
    },

    {
      path: '/apps/chat',
      element: <AppChat />
    },
    {
      path: '/apps/mail',
      element: <AppMail />
    },
    {
      path: '/apps/kanban',
      element: <AppKanban />,
      children: [
        {
          path: 'backlogs',
          element: <AppKanbanBacklogs />
        },
        {
          path: 'board',
          element: <AppKanbanBoard />
        }
      ]
    },
    {
      path: '/apps/calendar',
      element: <AppCalendar />
    },
    {
      path: '/apps/contact/c-card',
      element: <AppContactCard />
    },
    {
      path: '/apps/contact/c-list',
      element: <AppContactList />
    },

    {
      path: '/apps/e-commerce/products',
      element: <AppECommProducts />,
      loader: productsLoader,
      errorElement: <ErrorBoundary />
    },
    {
      path: '/apps/e-commerce/product-details/:id',
      element: <AppECommProductDetails />,
      loader: productLoader,
      errorElement: <ErrorBoundary />
    },
    {
      path: '/apps/e-commerce/product-list',
      element: <AppECommProductList />,
      loader: productsLoader,
      errorElement: <ErrorBoundary />
    },
    {
      path: '/apps/e-commerce/checkout',
      element: <AppECommCheckout />
    },
    {
      path: '/apps/invoice/dashboard',
      element: <AppInvoiceDashboard />
    },
    {
      path: '/apps/invoice/create-invoice',
      element: <AppInvoiceCreate />,
      loader: productsLoader,
      errorElement: <ErrorBoundary />
    },
    {
      path: '/apps/invoice/invoice-list',
      element: <AppInvoiceList />
    },
    {
      path: '/apps/invoice/edit-invoice',
      element: <AppInvoiceEdit />,
      loader: productsLoader,
      errorElement: <ErrorBoundary />
    },
    {
      path: '/apps/invoice/invoice-details',
      element: <AppInvoiceDetails />
    },
    {
      path: '/apps/invoice/client/add-client',
      element: <AppInvoiceAddClient />
    },
    {
      path: 'apps/invoice/client/client-list',
      element: <AppInvoiceClientList />
    },
    {
      path: '/apps/invoice/items/add-item',
      element: <AppInvoiceAddItem />
    },
    {
      path: '/apps/invoice/items/item-list',
      loader: productsLoader,
      element: <AppInvoiceItemList />,
      errorElement: <ErrorBoundary />
    },
    {
      path: '/apps/invoice/payment/add-payment',
      element: <AppInvoiceAddPayment />
    },
    {
      path: '/apps/invoice/payment/payment-list',
      element: <AppInvoicePaymentList />
    },
    {
      path: '/apps/invoice/payment/payment-details',
      element: <AppInvoicePaymentDetails />
    },
    {
      path: '/apps/crm/lead-management/lm-overview',
      element: <AppCrmLeadOverview />
    },
    {
      path: '/apps/crm/lead-management/lm-lead-list',
      element: <AppCrmLeadList />
    },
    {
      path: '/apps/crm/contact-management/cm-contact-card',
      element: <AppCrmContactCard />
    },
    {
      path: '/apps/crm/contact-management/cm-contact-list',
      element: <AppCrmContactList />
    },
    {
      path: '/apps/crm/contact-management/cm-reminders-followup',
      element: <AppCrmRemindersFollowup />
    },
    {
      path: '/apps/crm/contact-management/cm-communication-history',
      element: <AppCrmCommunicationHistory />
    },
    {
      path: '/apps/crm/sales-management/sm-statement',
      element: <AppCrmStatement />
    },
    {
      path: '/apps/crm/sales-management/sm-refund',
      element: <AppCrmRefund />
    },
    {
      path: '/apps/crm/sales-management/sm-earning',
      element: <AppCrmEarning />
    },
    {
      path: '/apps/blog/dashboard',
      element: <AppBlogDashboard />
    },
    {
      path: '/apps/blog/general-settings',
      element: <AppBlogGeneralSettings />
    },
    {
      path: '/apps/blog/add-new',
      element: <AppBlogAddNew />
    },
    {
      path: '/apps/blog/edit',
      element: <AppBlogEdit />
    },
    {
      path: '/apps/blog/blog-list',
      element: <AppBlogList />
    },
    {
      path: '/apps/blog/blog-details',
      element: <AppBlogDetails />
    },
    {
      path: '/components/text-field',
      element: <FrmComponentsTextfield />
    },
    {
      path: '/components/button',
      element: <FrmComponentsButton />
    },
    {
      path: '/components/checkbox',
      element: <FrmComponentsCheckbox />
    },
    {
      path: '/components/radio',
      element: <FrmComponentsRadio />
    },
    {
      path: '/components/autocomplete',
      element: <FrmComponentsAutoComplete />
    },
    {
      path: '/components/slider',
      element: <FrmComponentsSlider />
    },
    {
      path: '/components/switch',
      element: <FrmComponentsSwitch />
    },
    {
      path: '/components/date-time',
      element: <FrmComponentsDateTime />
    },

    {
      path: '/forms/layouts/layouts',
      element: <FrmLayoutLayout />
    },
    {
      path: '/forms/layouts/multi-column-forms',
      element: <FrmLayoutMultiColumnForms />
    },
    {
      path: '/forms/layouts/action-bar',
      element: <FrmLayoutActionBar />
    },
    {
      path: '/forms/layouts/sticky-action-bar',
      element: <FrmLayoutStickyActionBar />
    },
    {
      path: '/forms/frm-autocomplete',
      element: <FrmAutocomplete />
    },
    {
      path: '/forms/frm-mask',
      element: <FrmMask />
    },
    {
      path: '/forms/frm-clipboard',
      element: <FrmClipboard />
    },
    {
      path: '/forms/frm-recaptcha',
      element: <FrmRecaptcha />
    },
    {
      path: '/forms/map',
      element: <AppMap />
    },
    {
      path: '/forms/frm-editor',
      element: <FrmEditor />
    },
    {
      path: '/forms/frm-modal',
      element: <FrmModal />
    },
    {
      path: '/forms/frm-tooltip',
      element: <FrmTooltip />
    },
    {
      path: '/forms/frm-dropzone',
      element: <FrmDropzone />
    },
    {
      path: '/tables/tbl-basic',
      element: <TableBasic />
    },
    {
      path: '/tables/tbl-dense',
      element: <TableDense />
    },
    {
      path: '/tables/tbl-enhanced',
      element: <TableEnhanced />
    },
    {
      path: '/tables/tbl-data',
      element: <TableData />
    },
    {
      path: '/tables/tbl-customized',
      element: <TableCustomized />
    },
    {
      path: '/tables/tbl-sticky-header',
      element: <TableStickyHead />
    },
    {
      path: '/tables/tbl-collapse',
      element: <TableCollapsible />
    },
    {
      path: '/data-grid/data-grid-basic',
      element: <DataGridBasic />
    },
    {
      path: '/data-grid/data-grid-inline-editing',
      element: <DataGridInlineEditing />
    },
    {
      path: '/data-grid/data-grid-column-groups',
      element: <DataGridColumnGrouping />
    },
    {
      path: '/data-grid/data-grid-save-restore',
      element: <DataGridSaveRestoreState />
    },
    {
      path: '/data-grid/data-grid-quick-filter',
      element: <DataGridQuickFilter />
    },
    {
      path: '/data-grid/data-grid-column-visibility',
      element: <DataGridColumnVisibility />
    },
    {
      path: '/data-grid/data-grid-column-virtualization',
      element: <DataGridColumnVirtualization />
    },
    {
      path: '/data-grid/data-grid-column-menu',
      element: <DataGridColumnMenu />
    },
    {
      path: 'forms/charts/apexchart',
      element: <ChartApexchart />
    },
    {
      path: '/forms/charts/orgchart',
      element: <OrgChartPage />
    },
    {
      path: '/forms/forms-validation',
      element: <FrmFormsValidation />
    },
    {
      path: '/forms/forms-wizard',
      element: <FrmFormsWizard />
    },

    {
      path: '/basic/accordion',
      element: <BasicUIAccordion />
    },
    {
      path: '/basic/avatar',
      element: <BasicUIAvatar />
    },
    {
      path: '/basic/badges',
      element: <BasicUIBadges />
    },
    {
      path: '/basic/breadcrumb',
      element: <BasicUIBreadcrumb />
    },
    {
      path: '/basic/cards',
      element: <BasicUICards />
    },
    {
      path: '/basic/chip',
      element: <BasicUIChip />
    },
    {
      path: '/basic/list',
      element: <BasicUIList />
    },
    {
      path: '/basic/tabs',
      element: <BasicUITabs />
    },

    {
      path: '/advance/alert',
      element: <AdvanceUIAlert />
    },
    {
      path: '/advance/dialog',
      element: <AdvanceUIDialog />
    },
    {
      path: '/advance/pagination',
      element: <AdvanceUIPagination />
    },
    {
      path: '/advance/progress',
      element: <AdvanceUIProgress />
    },
    {
      path: '/advance/rating',
      element: <AdvanceUIRating />
    },
    {
      path: '/advance/snackbar',
      element: <AdvanceUISnackbar />
    },
    {
      path: '/advance/skeleton',
      element: <AdvanceUISkeleton />
    },
    {
      path: '/advance/speeddial',
      element: <AdvanceUISpeeddial />
    },
    {
      path: '/advance/timeline',
      element: <AdvanceUITimeline />
    },
    {
      path: '/advance/toggle-button',
      element: <AdvanceUIToggleButton />
    },
    {
      path: '/advance/treeview',
      element: <AdvanceUITreeview />
    },

    {
      path: '/pages/price/price1',
      element: <PagesPrice1 />
    },
    {
      path: '/pages/price/price2',
      element: <PagesPrice2 />
    },

    {
      path: '/utils/util-typography',
      element: <UtilsTypography />
    },
    {
      path: '/utils/util-color',
      element: <UtilsColor />
    },
    {
      path: '/utils/util-shadow',
      element: <UtilsShadow />
    },
    {
      path: '/utils/util-animation',
      element: <UtilsAnimation />
    },
    {
      path: '/utils/util-grid',
      element: <UtilsGrid />
    },
    {
      path: '/sample-page',
      element: <SamplePage />
    },
    {
      path: '/dashboard/default',
      element: <DashboardDefault />
    },
    {
      path: '/dashboard/analytics',
      element: <DashboardAnalytics />
    },
    {
      path: '/dashboard/invoice',
      element: <AppInvoiceDashboard />
    },
    {
      path: '/dashboard/crm',
      element: <AppCrmLeadOverview />
    },
    {
      path: '/dashboard/blog',
      element: <AppBlogDashboard />
    }
  ]
};

export default MainRoutes;
