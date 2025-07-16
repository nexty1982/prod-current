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
import {
  IconAperture,
  IconNotes,
  IconCalendar,
  IconMail,
  IconFileDescription,
  IconNotebook,
  IconFileCheck,
  IconPoint,
  IconEdit,
  IconSettings,
  IconUserCircle,
  IconBuildingChurch,
  IconUsers,
  IconLock,
  IconBrain,
  IconBorderAll,
  IconFiles,
} from '@tabler/icons-react';
import OrthodoxChurchIcon from 'src/components/shared/OrthodoxChurchIcon';

const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheader: '🔧 System Administration',
  },
  {
    id: uniqueId(),
    title: 'Orthodox Metrics',
    icon: IconBuildingChurch,
    href: '/admin/orthodox-metrics',
    chip: 'SaaS',
    chipColor: 'success',
  },
  {
    id: uniqueId(),
    title: 'AI Administration',
    icon: IconBrain,
    href: '/admin/ai',
    chip: 'Super',
    chipColor: 'error',
  },
  {
    id: uniqueId(),
    title: 'Settings',
    icon: IconSettings,
    href: '/admin/settings',
    chip: 'Super',
    chipColor: 'error',
  },

  {
    navlabel: true,
    subheader: '🔒 Access Control',
  },
  {
    id: uniqueId(),
    title: 'User & Access Management',
    icon: IconUsers,
    href: '/admin/users',
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
        title: 'Church Setup',
        icon: IconPoint,
        href: '/apps/client-management/church-setup',
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
    href: '/saints-peter-and-paul-Records', // [copilot-fix] Reverted to correct records page route
  },

  {
    navlabel: true,
    subheader: '🎨 Content Management',
  },
  {
    id: uniqueId(),
    title: 'CMS',
    icon: IconEdit,
    href: '/apps/cms/page-editor',
  },
  {
    id: uniqueId(),
    title: 'Site Clone',
    icon: IconFiles,
    href: '/apps/site-clone',
    chip: 'Super',
    chipColor: 'error',
  },
  {
    id: uniqueId(),
    title: 'Template Manager',
    icon: IconBorderAll,
    href: '/apps/client-management/template-manager',
  },
  {
    id: uniqueId(),
    title: 'Logs',
    icon: IconFileDescription,
    href: '/admin/logs',
    chip: 'Super',
    chipColor: 'error',
  },
];

export default Menuitems;
