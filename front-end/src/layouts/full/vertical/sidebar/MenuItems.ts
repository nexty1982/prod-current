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
  IconWriting,
  IconSettings,
  IconGitBranch,
  IconTool,
  IconTree
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';
import OrthodoxChurchIcon from '@/shared/ui/OrthodoxChurchIcon';

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

// Icon mapping function for refactored routes
const getIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'Shield':
      return IconShield;
    case 'List':
      return IconBorderAll;
    case 'User':
      return IconUserPlus;
    case 'UserCheck':
      return IconUserPlus;
    case 'Users':
      return IconUsers;
    case 'FileCode':
      return IconFileDescription;
    case 'Sliders':
      return IconEdit;
    case 'Table':
      return IconBorderAll;
    case 'Lock':
      return IconShield;
    case 'Wrench':
      return IconSettings;
    case 'Edit':
      return IconEdit;
    case 'Bug':
      return IconBug;
    case 'Git':
      return IconGitBranch;
    case 'Sitemap':
      return IconSitemap;
    case 'Search':
      return IconEdit; // Using Edit as placeholder for Search
    case 'Server':
      return IconShield; // Using Shield as placeholder for Server
    case 'Wand':
      return IconEdit; // Using Edit as placeholder for Wand
    case 'Test':
      return IconBug; // Using Bug as placeholder for Test
    case 'Alert':
      return IconEdit; // Using Edit as placeholder for Alert
    case 'Fallback':
      return IconEdit; // Using Edit as placeholder for Fallback
    case 'Key':
      return IconShield; // Using Shield as placeholder for Key
    case 'Toggle':
      return IconEdit; // Using Edit as placeholder for Toggle
    case 'Dashboard':
      return IconLayoutDashboard;
    case 'Terminal':
      return IconTerminal;
    case 'Build':
      return IconEdit; // Using Edit as placeholder for Build
    case 'Monitor':
      return IconEdit; // Using Edit as placeholder for Monitor
    case 'Memory':
      return IconEdit; // Using Edit as placeholder for Memory
    case 'Bell':
      return IconBell;
    case 'Book':
      return IconFileDescription;
    case 'Settings':
      return IconSettings;
    case 'Eye':
      return IconEdit; // Using Edit as placeholder for Eye
    case 'Sync':
      return IconEdit; // Using Edit as placeholder for Sync
    case 'Route':
      return IconEdit; // Using Edit as placeholder for Route
    case 'Brain':
      return IconEdit; // Using Edit as placeholder for Brain
    case 'Logs':
      return IconEdit; // Using Edit as placeholder for Logs
    case 'Translate':
      return IconEdit; // Using Edit as placeholder for Translate
    case 'Generate':
      return IconEdit; // Using Edit as placeholder for Generate
    case 'Deploy':
      return IconEdit; // Using Edit as placeholder for Deploy
    case 'Chart':
      return IconChartHistogram;
    case 'Grid':
      return IconBorderAll;
    case 'Dialog':
      return IconEdit; // Using Edit as placeholder for Dialog
    case 'Import':
      return IconEdit; // Using Edit as placeholder for Import
    case 'Token':
      return IconEdit; // Using Edit as placeholder for Token
    case 'Records':
      return IconFileDescription;
    case 'Demo':
      return IconEdit; // Using Edit as placeholder for Demo
    case 'Board':
      return IconBorderAll;
    case 'Column':
      return IconBorderAll;
    case 'Card':
      return IconBorderAll;
    case 'Modal':
      return IconEdit; // Using Edit as placeholder for Modal
    case 'Palette':
      return IconPalette;
    case 'Control':
      return IconEdit; // Using Edit as placeholder for Control
    case 'Color':
      return IconPalette;
    case 'Inspect':
      return IconBug;
    case 'Regression':
      return IconEdit; // Using Edit as placeholder for Regression
    case 'Upload':
      return IconEdit; // Using Edit as placeholder for Upload
    case 'Scan':
      return IconEdit; // Using Edit as placeholder for Scan
    case 'Backup':
      return IconEdit; // Using Edit as placeholder for Backup
    case 'Registry':
      return IconEdit; // Using Edit as placeholder for Registry
    case 'Form':
      return IconForms;
    case 'Install':
      return IconEdit; // Using Edit as placeholder for Install
    case 'Files':
      return IconFileDescription;
    case 'View':
      return IconEdit; // Using Edit as placeholder for View
    case 'Discovery':
      return IconEdit; // Using Edit as placeholder for Discovery
    case 'Mobile':
      return IconEdit; // Using Edit as placeholder for Mobile
    default:
      return IconComponents;
  }
};

const Menuitems: MenuitemsType[] = [
  // DASHBOARDS SECTION
  {
    navlabel: true,
    subheader: '📊 Dashboards',
  },
  {
    id: uniqueId(),
    title: 'User Dashboard',
    icon: IconLayoutDashboard,
    href: '/dashboards/user',
  },
  {
    id: uniqueId(),
    title: 'Admin Dashboard',
    icon: IconShield,
    href: '/dashboards/orthodmetrics',
  },
  {
    id: uniqueId(),
    title: 'Super Dashboard',
    icon: IconLayoutDashboard,
    href: '/dashboards/super',
  },

  // SITE CONFIG SECTION
  {
    navlabel: true,
    subheader: '⚙️ Site Config',
  },
  {
    id: uniqueId(),
    title: 'Site Management',
    icon: IconSettings,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'User Management',
        icon: IconUsers,
        href: '/admin/users',
      },
      {
        id: uniqueId(),
        title: 'Menu Management',
        icon: IconLayout,
        href: '/admin/menu-management',
      },

    ],
  },
  {
    id: uniqueId(),
    title: 'Content Management',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Blog Management',
        icon: IconWriting,
        href: '/admin/blog-admin',
      },
      {
        id: uniqueId(),
        title: 'Notes',
        icon: IconNotes,
        href: '/apps/notes',
      },
      {
        id: uniqueId(),
        title: 'Welcome Message',
        icon: IconMessage,
        href: '/frontend-pages/welcome-message',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Social Features',
    icon: IconMessage,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Email',
        icon: IconMessage,
        href: '/apps/email',
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
    ],
  },
  {
    id: uniqueId(),
    title: 'System Monitoring',
    icon: IconActivity,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Activity Logs',
        icon: IconFileDescription,
        href: '/admin/logs',
      },
      {
        id: uniqueId(),
        title: 'Session Management',
        icon: IconShield,
        href: '/admin/sessions',
      },

    ],
  },

  // CHURCH SECTION
  {
    navlabel: true,
    subheader: '⛪ Church',
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
        title: 'Church Setup Wizard',
        icon: IconPoint,
        href: '/apps/church-management/wizard',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Records Systems',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Church Metric Records',
        icon: IconDatabase,
        href: '/apps/records/baptism',
      },
      {
        id: uniqueId(),
        title: 'Dynamic Records Manager',
        icon: IconDatabase,
        href: '/apps/records/manager',
        chip: 'NEW',
        chipColor: 'primary',
      },
      {
        id: uniqueId(),
        title: 'Modern Records Manager',
        icon: IconRocket,
        href: '/apps/records/modern-manager',
        chip: 'NEW',
        chipColor: 'secondary',
      },
      {
        id: uniqueId(),
        title: 'Editable Records',
        icon: IconEdit,
        href: '/apps/records/editable',
      },
      {
        id: uniqueId(),
        title: 'OCR Enhanced Uploader',
        icon: IconFileDescription,
        href: '/devel/enhanced-ocr-uploader',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Image AI',
    icon: IconPalette,
    href: '/apps/image-ai',
  },
  {
    id: uniqueId(),
    title: 'Gallery',
    icon: IconPalette,
    href: '/apps/gallery',
  },
  {
    id: uniqueId(),
    title: 'OM-Spec',
    icon: IconFileDescription,
    href: '/church/om-spec',
  },
  {
    id: uniqueId(),
    title: 'OM Tasks',
    icon: IconEdit,
    href: '/devel-tools/om-tasks',
  },
  {
    id: uniqueId(),
    title: 'Build Console',
    icon: IconRocket,
    href: '/admin/build',
  },
  {
    id: uniqueId(),
    title: 'OMAI Ultimate Logger',
    icon: IconBug,
    href: '/church/omai-logger',
  },
  // DEVELOPER TOOLS SECTION
  {
    navlabel: true,
    subheader: '🛠️ Developer Tools',
  },
  {
    id: uniqueId(),
    title: 'OM Spec / Tasks',
    icon: IconFileDescription,
    href: '/church/om-spec',
  },
  {
    id: uniqueId(),
    title: 'Development Console',
    icon: IconTerminal,
    href: '#',
    children: [

      {
        id: uniqueId(),
        title: 'Router/Menu Studio',
        icon: IconSitemap,
        href: '/devel/router-menu-studio',
      },
      {
        id: uniqueId(),
        title: 'Dynamic Records Inspector',
        icon: IconDatabase,
        href: '/devel/dynamic-records',
      },
      {
        id: uniqueId(),
        title: 'Site Structure Visualizer',
        icon: IconSitemap,
        href: '/tools/site-structure',
      },
      {
        id: uniqueId(),
        title: 'Refactor Console',
        icon: IconTool,
        href: '/devel-tools/refactor-console',
      },
      {
        id: uniqueId(),
        title: 'Live Table Builder',
        icon: IconBorderAll,
        href: '/devel-tools/live-table-builder',
      },
      {
        id: uniqueId(),
        title: 'Loading Demo',
        icon: IconComponents,
        href: '/apps/devel/loading-demo',
      },
      {
        id: uniqueId(),
        title: 'OCR Studio',
        icon: IconFileDescription,
        href: '/devel/ocr-studio',
      },
      {
        id: uniqueId(),
        title: 'OCR Setup Wizard',
        icon: IconSettings,
        href: '/devel/ocr-setup-wizard',
      },
      {
        id: uniqueId(),
        title: 'Enhanced OCR Uploader',
        icon: IconFileDescription,
        href: '/devel/enhanced-ocr-uploader',
      },
      {
        id: uniqueId(),
        title: 'OCR Settings',
        icon: IconFileDescription,
        href: '/devel/ocr-settings',
      },
      {
        id: uniqueId(),
        title: 'OM Permission Center',
        icon: IconShield,
        href: '/devel-tools/om-permission-center',
      },
      {
        id: uniqueId(),
        title: 'Interactive Report Jobs',
        icon: IconFileDescription,
        href: '/devel-tools/interactive-reports/jobs',
      },
      {
        id: uniqueId(),
        title: 'Build Info',
        icon: IconGitBranch,
        href: '/devel-tools/build-info',
      },
      {
        id: uniqueId(),
        title: 'Component Library',
        icon: IconBorderAll,
        href: '/sandbox/component-library',
      },
      {
        id: uniqueId(),
        title: 'Core Components',
        icon: IconComponents,
        href: '/sandbox/component-preview/core',
      },
      {
        id: uniqueId(),
        title: 'Modernize Components',
        icon: IconLayoutDashboard,
        href: '/sandbox/component-preview/modernize',
      },

    ],
  },

  {
    id: uniqueId(),
    title: 'AI & Automation',
    icon: IconRocket,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'OMAI Lab',
        icon: IconRocket,
        href: '/sandbox/ai-lab',
      },
      {
        id: uniqueId(),
        title: 'Project Generator',
        icon: IconEdit,
        href: '/sandbox/project-generator',
      },
      {
        id: uniqueId(),
        title: 'AI Admin Panel',
        icon: IconRocket,
        href: '/admin/ai',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Testing & QA',
    icon: IconBug,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Site Survey',
        icon: IconBug,
        href: '/admin/tools/survey',
      },
    ],
  },

  // BROKEN LINKS SECTION
  {
    navlabel: true,
    subheader: '🔗 Broken Links',
  },
  {
    id: uniqueId(),
    title: 'Broken Links',
    icon: IconBug,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'User Profile',
        icon: IconUsers,
        href: '/user-profile',
      },
      {
        id: uniqueId(),
        title: 'Gallery',
        icon: IconPoint,
        href: '/apps/gallery',
      },
      {
        id: uniqueId(),
        title: 'OM Permission Center',
        icon: IconShield,
        href: '/devel-tools/om-permission-center',
      },
      {
        id: uniqueId(),
        title: 'Admin Settings',
        icon: IconSettings,
        href: '/admin/settings',
      },
      {
        id: uniqueId(),
        title: 'Task Assignment',
        icon: IconEdit,
        href: '/admin/settings',
      },
      {
        id: uniqueId(),
        title: 'Build Console',
        icon: IconTerminal,
        href: '/admin/build',
      },
      {
        id: uniqueId(),
        title: 'OMTrace Console',
        icon: IconTerminal,
        href: '#',
      },
      {
        id: uniqueId(),
        title: 'JIT Terminal',
        icon: IconTerminal,
        href: '/admin/jit-terminal',
      },
    ],
  },
];

export const getMenuItems = (user: any) => {
  const churchId = user?.church_id || 46; // fallback to default church ID
  
  if (user && (user.role === 'super_admin' || user.role === 'admin')) {
    // Create dynamic menu items with church-aware URLs
    let dynamicMenuItems = Menuitems.map(item => {
      if (item.title === 'Records Systems' && item.children) {
        return {
          ...item,
          children: item.children.map(child => {
            switch (child.title) {
              case 'Dynamic Explorer':
                return { ...child, href: `/apps/records/dynamic/${churchId}` };
              case 'Enhanced AG Grid':
                return { ...child, href: `/apps/records/enhanced/${churchId}` };
              case 'Simple Records System':
                return { ...child, href: `/apps/records-simple/${churchId}` };
              case 'Dynamic Manager':
                return { ...child, href: `/apps/records/manager` };
              case 'Modern Manager':
                return { ...child, href: `/apps/records/modern-manager` };
              case 'Editable Records':
                return { ...child, href: `/apps/records/editable` };
              default:
                return child;
            }
          })
        };
      }
      return item;
    });
    
    // Filter out Developer Tools for non-super_admin users
    if (user.role !== 'super_admin') {
      dynamicMenuItems = dynamicMenuItems.filter(item => {
        // Remove Developer Tools section and its items
        if (item.subheader === '🛠️ Developer Tools') return false;
        return true;
      });
    }
    
    return dynamicMenuItems;
  }
  
  // For priest role, show User Dashboard menu
  if (user && user.role === 'priest') {
    return [
      {
        navlabel: true,
        subheader: '📊 Dashboards',
      },
      {
        id: uniqueId(),
        title: 'User Dashboard',
        icon: IconLayoutDashboard,
        href: '/dashboards/user',
      },
      {
        navlabel: true,
        subheader: '⛪ Church',
      },
      {
        id: uniqueId(),
        title: 'Notes',
        icon: IconNotes,
        href: '/apps/notes',
      },
      {
        id: uniqueId(),
        title: 'Orthodox Calendar',
        icon: IconCalendar,
        href: '/apps/liturgical-calendar',
      },
      {
        id: uniqueId(),
        title: 'Records System',
        icon: IconFileDescription,
        href: '#',
        children: [
          // Modern Enhanced Records
          {
            id: uniqueId(),
            title: 'Records',
            icon: IconRocket,
            href: '/apps/records/baptism',
            chip: 'NEW',
            chipColor: 'primary',
          },
          {
            id: uniqueId(),
            title: 'OCR Uploads',
            icon: IconFileDescription,
            href: `/devel/enhanced-ocr-uploader?church_id=${churchId}`,
          },
        ],
      },
      {
        navlabel: true,
        subheader: '💬 Social',
      },
      {
        id: uniqueId(),
        title: 'Email',
        icon: IconMessage,
        href: '/apps/email',
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
    ];
  }
  
  // For other non-admin users, show simplified menu with basic functionality
  return [
    {
      navlabel: true,
      subheader: '📊 Dashboards',
    },
    {
      id: uniqueId(),
      title: 'Enhanced Modern Dashboard',
      icon: IconLayoutDashboard,
      href: '/dashboards/modern',
    },
    {
      navlabel: true,
      subheader: '⛪ Church',
    },
    {
      id: uniqueId(),
      title: 'Notes',
      icon: IconNotes,
      href: '/apps/notes',
    },
    {
      id: uniqueId(),
      title: 'Orthodox Calendar',
      icon: IconCalendar,
      href: '/apps/liturgical-calendar',
    },
    {
      id: uniqueId(),
      title: 'Records System',
      icon: IconFileDescription,
      href: '#',
      children: [
        // Modern Enhanced Records
        {
          id: uniqueId(),
          title: 'Records',
          icon: IconRocket,
          href: '/apps/records/baptism',
          chip: 'NEW',
          chipColor: 'primary',
        },
        {
          id: uniqueId(),
          title: 'OCR Uploads',
          icon: IconFileDescription,
          href: `/devel/enhanced-ocr-uploader?church_id=${churchId}`,
        },
        {
          id: uniqueId(),
          title: 'OCR Setup Wizard',
          icon: IconSettings,
          href: `/devel/ocr-setup-wizard?church_id=${churchId}`,
        },
      ],
    },
    {
      navlabel: true,
      subheader: '💬 Social',
    },
    {
      id: uniqueId(),
      title: 'Email',
      icon: IconMessage,
      href: '/apps/email',
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
  ];
};

export default Menuitems;
