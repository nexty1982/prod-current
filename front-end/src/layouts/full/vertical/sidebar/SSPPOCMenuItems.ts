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
  IconCalendar,
  IconFileDescription,
  IconUserCircle,
  IconScan,
} from '@tabler/icons-react';

// Custom menu items for SSPPOC users
const createSSPPOCMenuItems = (churchId: string): MenuitemsType[] => [
  {
    navlabel: true,
    subheader: '🕍 Saints Peter and Paul Orthodox Church',
  },
  {
    id: uniqueId(),
    title: 'Records Management',
    icon: IconFileDescription,
    href: '/saints-peter-and-paul-Records',
  },
  {
    id: uniqueId(),
    title: 'Liturgical Calendar',
    icon: IconCalendar,
    href: '/apps/liturgical-calendar',
    external: true,
  },
  {
    id: uniqueId(),
    title: 'OCR Admin Interface',
    icon: IconScan,
    href: `/admin/church/${churchId}/ocr`,
  },
  {
    id: uniqueId(),
    title: 'User Profile',
    icon: IconUserCircle,
    href: '/user-profile',
  },
];

export default createSSPPOCMenuItems;
