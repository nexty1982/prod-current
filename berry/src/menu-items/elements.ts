// assets
import { IconBrush, IconTools } from '@tabler/icons-react';
import { NavItemType } from 'types';

// constant
const icons = {
  IconBrush,
  IconTools
};

// ==============================|| UI ELEMENTS MENU ITEMS ||============================== //

const elements: NavItemType = {
  id: 'ui-element',
  title: 'ui-element',
  icon: icons.IconBrush,
  type: 'group',
  children: [
    {
      id: 'basic',
      title: 'basic',
      caption: 'basic-caption',
      type: 'collapse',
      icon: icons.IconBrush,
      children: [
        {
          id: 'accordion',
          title: 'accordion',
          type: 'item',
          url: '/basic/accordion',
          breadcrumbs: false
        },
        {
          id: 'avatar',
          title: 'avatar',
          type: 'item',
          url: '/basic/avatar',
          breadcrumbs: false
        },
        {
          id: 'badges',
          title: 'badges',
          type: 'item',
          url: '/basic/badges',
          breadcrumbs: false
        },
        {
          id: 'breadcrumb',
          title: 'breadcrumb',
          type: 'item',
          url: '/basic/breadcrumb'
        },
        {
          id: 'cards',
          title: 'cards',
          type: 'item',
          url: '/basic/cards',
          breadcrumbs: false
        },
        {
          id: 'chip',
          title: 'chip',
          type: 'item',
          url: '/basic/chip',
          breadcrumbs: false
        },
        {
          id: 'list',
          title: 'list',
          type: 'item',
          url: '/basic/list',
          breadcrumbs: false
        },
        {
          id: 'tabs',
          title: 'tabs',
          type: 'item',
          url: '/basic/tabs',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'advance',
      title: 'advance',
      type: 'collapse',
      icon: icons.IconTools,
      children: [
        {
          id: 'alert',
          title: 'alert',
          type: 'item',
          url: '/advance/alert',
          breadcrumbs: false
        },
        {
          id: 'dialog',
          title: 'dialog',
          type: 'item',
          url: '/advance/dialog',
          breadcrumbs: false
        },
        {
          id: 'pagination',
          title: 'pagination',
          type: 'item',
          url: '/advance/pagination',
          breadcrumbs: false
        },
        {
          id: 'progress',
          title: 'progress',
          type: 'item',
          url: '/advance/progress',
          breadcrumbs: false
        },
        {
          id: 'rating',
          title: 'rating',
          type: 'item',
          url: '/advance/rating',
          breadcrumbs: false
        },
        {
          id: 'snackbar',
          title: 'snackbar',
          type: 'item',
          url: '/advance/snackbar',
          breadcrumbs: false
        },
        {
          id: 'skeleton',
          title: 'skeleton',
          type: 'item',
          url: '/advance/skeleton',
          breadcrumbs: false
        },
        {
          id: 'speeddial',
          title: 'speeddial',
          type: 'item',
          url: '/advance/speeddial',
          breadcrumbs: false
        },
        {
          id: 'timeline',
          title: 'timeline',
          type: 'item',
          url: '/advance/timeline',
          breadcrumbs: false
        },
        {
          id: 'toggle-button',
          title: 'toggle-button',
          type: 'item',
          url: '/advance/toggle-button',
          breadcrumbs: false
        },
        {
          id: 'treeview',
          title: 'treeview',
          type: 'item',
          url: '/advance/treeview',
          breadcrumbs: false
        }
      ]
    }
  ]
};

export default elements;
