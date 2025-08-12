import {
    IconActivity,
    IconApps,
    IconBell,
    IconBorderAll,
    IconBug,
    IconCalendar,
    IconCalendarEvent,
    IconChartHistogram,
    IconComponents,
    IconDatabase,
    IconEdit,
    IconFileDescription,
    IconForms,
    IconHome,
    IconLayout,
    IconLayoutDashboard,
    IconMessage,
    IconNews,
    IconNotes,
    IconPalette,
    IconPoint,
    IconRocket,
    IconShield,
    IconSitemap,
    IconTerminal,
    IconUserPlus,
    IconUsers,
    IconWriting
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';
import OrthodoxChurchIcon from 'src/components/shared/OrthodoxChurchIcon';

interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}

const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheader: '🏠 Dashboards',
  },
  {
    id: uniqueId(),
    title: 'Enhanced Modern Dashboard',
    icon: IconHome,
    href: '/dashboards/modern',
  },
  {
    id: uniqueId(),
    title: 'Admin Dashboard',
    icon: IconShield,
    href: '/dashboards/orthodmetrics',
  },

  {
    navlabel: true,
    subheader: '📰 News & Social',
  },
  {
    id: uniqueId(),
    title: 'Orthodox Headlines',
    icon: IconNews,
    href: '/orthodox-headlines',
  },
  {
    id: uniqueId(),
    title: 'Blog',
    icon: IconWriting,
    href: '/social/blog',
  },
  {
    id: uniqueId(),
    title: 'Friends',
    icon: IconUserPlus,
    href: '/social/friends',
  },
  {
    id: uniqueId(),
    title: 'Chat',
    icon: IconMessage,
    href: '/social/chat',
  },
  {
    id: uniqueId(),
    title: 'Notifications',
    icon: IconBell,
    href: '/social/notifications',
  },

  {
    navlabel: true,
    subheader: '🕍 Church Tools',
  },
  {
    id: uniqueId(),
    title: 'Church Management',
    icon: OrthodoxChurchIcon,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'All Churches',
        icon: IconPoint,
        href: '/apps/church-management',
      },
      {
        id: uniqueId(),
        title: 'Add Church',
        icon: IconPoint,
        href: '/apps/church-management/create',
      },
      {
        id: uniqueId(),
        title: 'Church Setup Wizard',
        icon: IconPoint,
        href: '/apps/church-management/wizard',
      },
      {
        id: uniqueId(),
        title: 'Church OCR',
        icon: IconPoint,
        href: '/admin/church/:id/ocr',
      },
      {
        id: uniqueId(),
        title: 'Legacy Profile',
        icon: IconPoint,
        href: '/user-profile',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Records Management',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Records Browser',
        icon: IconPoint,
        href: '/apps/records-ui',
      },
      {
        id: uniqueId(),
        title: 'Records Dashboard',
        icon: IconPoint,
        href: '/apps/records',
      },
      {
        id: uniqueId(),
        title: 'Legacy Records',
        icon: IconPoint,
        href: '/records',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Analytics',
    icon: IconChartHistogram,
    href: '/analytics',
  },
  {
    id: uniqueId(),
    title: 'Orthodox Calendar',
    icon: IconCalendar,
    href: '/apps/liturgical-calendar',
  },

  {
    navlabel: true,
    subheader: '🤖 Orthodox Metrics Admin OMAI Studio',
  },
  {
    id: uniqueId(),
    title: 'OMAI Ultimate Logger',
    icon: IconActivity,
    href: '/admin/omai-logger',
  },
  {
    id: uniqueId(),
    title: 'Build Console',
    icon: IconTerminal,
    href: '/admin/build',
  },
  {
    id: uniqueId(),
    title: 'Site Editor Demo',
    icon: IconEdit,
    href: '/demos/site-editor',
  },
  {
    id: uniqueId(),
    title: 'Auto-Fix Demo',
    icon: IconEdit,
    href: '/demos/auto-fix',
  },
  {
    id: uniqueId(),
    title: 'GitOps Demo',
    icon: IconEdit,
    href: '/demos/gitops',
  },
  {
    id: uniqueId(),
    title: '🐞 VRT Demo',
    icon: IconBug,
    href: '/demos/vrt',
  },
  {
    navlabel: true,
    subheader: '🧩 Site Components',
  },
  {
    id: uniqueId(),
    title: 'Core Components',
    icon: IconComponents,
    children: [
      {
        id: uniqueId(),
        title: 'Form Components',
        icon: IconForms,
        href: '/sandbox/component-preview/core/forms',
      },
      {
        id: uniqueId(),
        title: 'Theme Components',
        icon: IconPalette,
        href: '/sandbox/component-preview/core/theme',
      },
      {
        id: uniqueId(),
        title: 'Feature Components',
        icon: IconUsers,
        href: '/sandbox/component-preview/core/features',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Modernize Components',
    icon: IconLayoutDashboard,
    children: [
      {
        id: uniqueId(),
        title: 'Calendar Components',
        icon: IconCalendarEvent,
        href: '/sandbox/component-preview/modernize/calendar',
      },
      {
        id: uniqueId(),
        title: 'Data Components',
        icon: IconDatabase,
        href: '/sandbox/component-preview/modernize/data',
      },
      {
        id: uniqueId(),
        title: 'Feature Components',
        icon: IconApps,
        href: '/sandbox/component-preview/modernize/features',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Raydar Components',
    icon: IconRocket,
    children: [
      {
        id: uniqueId(),
        title: 'Calendar Components',
        icon: IconCalendarEvent,
        href: '/sandbox/component-preview/raydar/calendar',
      },
      {
        id: uniqueId(),
        title: 'Layout Components',
        icon: IconLayout,
        href: '/sandbox/component-preview/raydar/layout',
      },
      {
        id: uniqueId(),
        title: 'Form Components',
        icon: IconForms,
        href: '/sandbox/component-preview/raydar/forms',
      },
    ],
  },
  {
    id: uniqueId(),
    title: '🧩 Component Library',
    icon: IconBorderAll,
    href: '/sandbox/component-library',
  },





  {
    navlabel: true,
    subheader: '🗂️ MISC',
  },
  {
    id: uniqueId(),
    title: 'eCommerce',
    icon: IconPoint,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Shop',
        icon: IconPoint,
        href: '/apps/ecommerce/shop',
      },
      {
        id: uniqueId(),
        title: 'Product List',
        icon: IconPoint,
        href: '/apps/ecommerce/eco-product-list',
      },
      {
        id: uniqueId(),
        title: 'Checkout',
        icon: IconPoint,
        href: '/apps/ecommerce/eco-checkout',
      },
      {
        id: uniqueId(),
        title: 'Add Product',
        icon: IconPoint,
        href: '/apps/ecommerce/add-product',
      },
      {
        id: uniqueId(),
        title: 'Edit Product',
        icon: IconPoint,
        href: '/apps/ecommerce/edit-product',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Invoice',
    icon: IconPoint,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Invoice List',
        icon: IconPoint,
        href: '/apps/invoice/list',
      },
      {
        id: uniqueId(),
        title: 'Create Invoice',
        icon: IconPoint,
        href: '/apps/invoice/create',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'User Profile',
    icon: IconPoint,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Followers',
        icon: IconPoint,
        href: '/apps/followers',
      },
      {
        id: uniqueId(),
        title: 'Friends',
        icon: IconPoint,
        href: '/apps/friends',
      },
      {
        id: uniqueId(),
        title: 'Gallery',
        icon: IconPoint,
        href: '/apps/gallery',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'CMS',
    icon: IconPoint,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Page Editor',
        icon: IconPoint,
        href: '/apps/cms/page-editor',
      },
      {
        id: uniqueId(),
        title: 'Enhanced Editor',
        icon: IconPoint,
        href: '/apps/cms/page-editor-enhanced',
      },
      {
        id: uniqueId(),
        title: 'Legacy Editor',
        icon: IconPoint,
        href: '/apps/cms/page-editor-legacy',
      },
    ],
  },
];

export const getMenuItems = (user: any) => {
  if (user && (user.role === 'super_admin' || user.role === 'admin')) {
    return Menuitems;
  }
  // For non-admin users, show only Notes App and Liturgical Calendar under Apps, and Users Guide under Quick Links
  return [
    {
      navlabel: true,
      subheader: 'Dashboard',
    },
    {
      id: uniqueId(),
      title: 'Enhanced Modern Dashboard',
      icon: IconHome,
      href: '/dashboards/modern',
    },
    {
      navlabel: true,
      subheader: 'Apps',
    },
    {
      id: uniqueId(),
      title: 'Notes',
      icon: IconNotes,
      href: '/apps/notes',
    },
    {
      id: uniqueId(),
      title: 'Orthodox Liturgical Calendar',
      icon: IconCalendar,
      href: '/apps/liturgical-calendar',
    },
    {
      navlabel: true,
      subheader: '💬 Social',
    },
    {
      id: uniqueId(),
      title: 'Blog',
      icon: IconWriting,
      href: '/social/blog',
    },
    {
      id: uniqueId(),
      title: 'Friends',
      icon: IconUserPlus,
      href: '/social/friends',
    },
    {
      id: uniqueId(),
      title: 'Chat',
      icon: IconMessage,
      href: '/social/chat',
    },
    {
      id: uniqueId(),
      title: 'Notifications',
      icon: IconBell,
      href: '/social/notifications',
    },
    {
      navlabel: true,
      subheader: '🛠️ Developer Tools',
    },
    {
      id: uniqueId(),
      title: 'Site Structure Visualizer',
      icon: IconSitemap,
      href: '/tools/site-structure',
    },
    {
      navlabel: true,
      subheader: 'Quick Links',
    },
    {
      id: uniqueId(),
      title: 'Users Guide',
      icon: IconFileDescription,
      href: '/frontend-pages/coming-soon',
    },
  ];
};

export default Menuitems;
