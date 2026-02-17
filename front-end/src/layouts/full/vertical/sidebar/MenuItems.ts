import OrthodoxChurchIcon from '@/shared/ui/OrthodoxChurchIcon';
import {
    IconActivity,
    IconBell,
    IconBorderAll,
    IconBug,
    IconCheckbox,
    IconDatabase,
    IconEdit,
    IconFileDescription,
    IconGitBranch,
    IconLayout,
    IconLayoutDashboard,
    IconMessage,
    IconNotes,
    IconPalette,
    IconPoint,
    IconRocket,
    IconSettings,
    IconShield,
    IconSitemap,
    IconTerminal,
    IconTool,
    IconUserPlus,
    IconUsers,
    IconWriting,
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';

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
        title: 'Log Search',
        icon: IconDatabase,
        href: '/admin/log-search',
      },
      {
        id: uniqueId(),
        title: 'Session Management',
        icon: IconShield,
        href: '/admin/sessions',
      },
      {
        id: uniqueId(),
        title: 'Admin Settings',
        icon: IconSettings,
        href: '/admin/settings',
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
        title: 'Editable Records',
        icon: IconEdit,
        href: '/apps/records/editable',
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
    title: 'OM-Spec',
    icon: IconFileDescription,
    href: '/church/om-spec',
  },
  // DEVELOPER TOOLS SECTION
  {
    navlabel: true,
    subheader: '🛠️ Developer Tools',
  },
  {
    id: uniqueId(),
    title: 'OM Daily',
    icon: IconCheckbox,
    href: '/admin/control-panel/om-daily',
  },
  {
    id: uniqueId(),
    title: 'Daily Tasks',
    icon: IconCheckbox,
    href: '/devel-tools/daily-tasks',
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
        title: 'Menu Editor',
        icon: IconLayout,
        href: '/devel-tools/menu-editor',
      },
      {
        id: uniqueId(),
        title: 'Dynamic Records Inspector',
        icon: IconDatabase,
        href: '/devel/dynamic-records',
      },
      {
        id: uniqueId(),
        title: 'OMTrace Console',
        icon: IconSitemap,
        href: '/devel-tools/omtrace',
      },
      {
        id: uniqueId(),
        title: 'Refactor Console',
        icon: IconTool,
        href: '/devel-tools/refactor-console',
      },
      {
        id: uniqueId(),
        title: 'API Explorer',
        icon: IconBug,
        href: '/devel-tools/api-explorer',
      },
      {
        id: uniqueId(),
        title: 'Live Table Builder',
        icon: IconBorderAll,
        href: '/devel-tools/live-table-builder',
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
        title: 'Git Operations',
        icon: IconGitBranch,
        href: '/devel-tools/git-operations',
      },
      {
        id: uniqueId(),
        title: 'Build Info',
        icon: IconGitBranch,
        href: '/devel-tools/build-info',
      },
      {
        id: uniqueId(),
        title: 'Conversation Log',
        icon: IconMessage,
        href: '/devel-tools/conversation-log',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'OCR Studio',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'OCR Studio',
        icon: IconFileDescription,
        href: '/devel/ocr-studio',
      },
      {
        id: uniqueId(),
        title: 'Upload',
        icon: IconFileDescription,
        href: '/devel/ocr-studio/upload',
      },
      {
        id: uniqueId(),
        title: 'Job Monitor',
        icon: IconActivity,
        href: '/devel/ocr-studio/jobs',
      },
      {
        id: uniqueId(),
        title: 'Table Extractor',
        icon: IconBorderAll,
        href: '/devel/ocr-studio/table-extractor',
      },
      {
        id: uniqueId(),
        title: 'Layout Templates',
        icon: IconLayout,
        href: '/devel/ocr-studio/layout-templates',
      },
      {
        id: uniqueId(),
        title: 'Activity Monitor',
        icon: IconActivity,
        href: '/devel/ocr-activity-monitor',
      },
      {
        id: uniqueId(),
        title: 'OCR Settings',
        icon: IconSettings,
        href: '/devel/ocr-studio/settings',
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
            href: `/devel/ocr-studio/upload`,
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
      title: 'Records System',
      icon: IconFileDescription,
      href: '#',
      children: [
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
          href: `/devel/ocr-studio/upload`,
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
