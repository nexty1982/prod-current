// assets
import { IconBrandFramer, IconTypography, IconPalette, IconShadow, IconWindmill, IconLayoutGridAdd } from '@tabler/icons-react';
import { NavItemType } from 'types';

// constant
const icons = {
  IconTypography,
  IconPalette,
  IconShadow,
  IconWindmill,
  IconBrandFramer,
  IconLayoutGridAdd
};

// ==============================|| UTILITIES MENU ITEMS ||============================== //

const utilities: NavItemType = {
  id: 'utilities',
  title: 'utilities',
  icon: icons.IconTypography,
  type: 'group',
  children: [
    {
      id: 'util-typography',
      title: 'typography',
      type: 'item',
      url: '/utils/util-typography',
      icon: icons.IconTypography,
      breadcrumbs: false
    },
    {
      id: 'util-color',
      title: 'color',
      type: 'item',
      url: '/utils/util-color',
      icon: icons.IconPalette,
      breadcrumbs: false
    },
    {
      id: 'util-shadow',
      title: 'shadow',
      type: 'item',
      url: '/utils/util-shadow',
      icon: icons.IconShadow,
      breadcrumbs: false
    },
    {
      id: 'icons',
      title: 'icons',
      type: 'collapse',
      icon: icons.IconWindmill,
      children: [
        {
          id: 'tabler-icons',
          title: 'tabler-icons',
          type: 'item',
          url: 'https://tabler-icons.io/',
          external: true,
          target: true,
          breadcrumbs: false
        },
        {
          id: 'material-icons',
          title: 'material-icons',
          type: 'item',
          url: 'https://mui.com/material-ui/material-icons/#main-content',
          external: true,
          target: true,
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'util-animation',
      title: 'animation',
      type: 'item',
      url: '/utils/util-animation',
      icon: icons.IconBrandFramer,
      breadcrumbs: false
    },
    {
      id: 'util-grid',
      title: 'grid',
      type: 'item',
      url: '/utils/util-grid',
      icon: icons.IconLayoutGridAdd,
      breadcrumbs: false
    }
  ]
};

export default utilities;
