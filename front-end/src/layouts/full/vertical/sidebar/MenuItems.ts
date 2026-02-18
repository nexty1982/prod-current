import OrthodoxChurchIcon from '@/shared/ui/OrthodoxChurchIcon';
import {
    IconActivity,
    IconBell,
    IconBorderAll,
    IconBug,
    IconCalendar,
    IconCards,
    IconChartBar,
    IconCheckbox,
    IconDatabase,
    IconEdit,
    IconFileDescription,
    IconGitBranch,
    IconLayout,
    IconLayoutDashboard,
    IconMap,
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
    IconUser,
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
  // ========================================================================
  // DASHBOARDS
  // ========================================================================
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
  {
    id: uniqueId(),
    title: 'Control Panel',
    icon: IconSettings,
    href: '/admin/control-panel',
  },

  // ========================================================================
  // CHURCH MANAGEMENT (matches Control Panel category 1)
  // ========================================================================
  {
    navlabel: true,
    subheader: '⛪ Church Management',
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

  // ========================================================================
  // RECORDS & OCR (matches Control Panel category 2)
  // ========================================================================
  {
    navlabel: true,
    subheader: '📋 Records & OCR',
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
      {
        id: uniqueId(),
        title: 'Live Table Builder',
        icon: IconBorderAll,
        href: '/devel-tools/live-table-builder',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'OM Charts',
    icon: IconChartBar,
    href: '/apps/om-charts',
    chip: 'NEW',
    chipColor: 'primary',
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

  // ========================================================================
  // CRM & OUTREACH (matches Control Panel category 3)
  // ========================================================================
  {
    navlabel: true,
    subheader: '📣 CRM & Outreach',
  },
  {
    id: uniqueId(),
    title: 'CRM Dashboard',
    icon: IconUsers,
    href: '/devel-tools/crm',
  },
  {
    id: uniqueId(),
    title: 'US Church Map',
    icon: IconPoint,
    href: '/devel-tools/us-church-map',
  },

  // ========================================================================
  // SYSTEM & SERVER (matches Control Panel category 4)
  // ========================================================================
  {
    navlabel: true,
    subheader: '🖥️ System & Server',
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
      {
        id: uniqueId(),
        title: 'Admin Settings',
        icon: IconSettings,
        href: '/admin/settings',
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

  // ========================================================================
  // AI & AUTOMATION (matches Control Panel category 5)
  // ========================================================================
  {
    navlabel: true,
    subheader: '🤖 AI & Automation',
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

  // ========================================================================
  // OM DAILY (matches Control Panel category 6)
  // ========================================================================
  {
    navlabel: true,
    subheader: '📅 OM Daily',
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

  // ========================================================================
  // BERRY COMPONENTS (super_admin only, stage 1 prototypes)
  // ========================================================================
  {
    navlabel: true,
    subheader: 'Berry Components',
  },
  {
    id: uniqueId(),
    title: 'CRM',
    icon: IconUsers,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Lead Management',
        icon: IconPoint,
        href: '/berry/crm/leads',
      },
      {
        id: uniqueId(),
        title: 'Contact Management',
        icon: IconPoint,
        href: '/berry/crm/contacts',
      },
      {
        id: uniqueId(),
        title: 'Sales Management',
        icon: IconPoint,
        href: '/berry/crm/sales',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Calendar',
    icon: IconCalendar,
    href: '/berry/calendar',
  },
  {
    id: uniqueId(),
    title: 'Map',
    icon: IconMap,
    href: '/berry/map',
  },
  {
    id: uniqueId(),
    title: 'Card Gallery',
    icon: IconCards,
    href: '/berry/cards',
  },
  {
    id: uniqueId(),
    title: 'Profiles',
    icon: IconUser,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Account Settings',
        icon: IconPoint,
        href: '/berry/profile/settings',
      },
      {
        id: uniqueId(),
        title: 'Account Profile',
        icon: IconPoint,
        href: '/berry/profile/account',
      },
    ],
  },

  // ========================================================================
  // DEVELOPER TOOLS (super_admin only)
  // ========================================================================
  {
    navlabel: true,
    subheader: '🛠️ Developer Tools',
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
        id: uniqueId(),
        title: 'OM Charts',
        icon: IconChartBar,
        href: '/apps/om-charts',
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
      id: uniqueId(),
      title: 'OM Charts',
      icon: IconChartBar,
      href: '/apps/om-charts',
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
