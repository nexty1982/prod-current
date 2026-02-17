// third party
import { FormattedMessage } from 'react-intl';

// assets
import { IconMenu, IconBoxMultiple, IconCircleOff, IconCircle, IconBrandGravatar, IconShape } from '@tabler/icons-react';
import { NavItemType } from 'types';

// constant
const icons = {
  IconMenu,
  IconBoxMultiple,
  IconCircleOff,
  IconCircle,
  IconBrandGravatar,
  IconShape
};

// ==============================|| SUPPORT MENU ITEMS ||============================== //

const support: NavItemType = {
  id: 'support',
  title: 'others',
  icon: icons.IconMenu,
  type: 'group',
  children: [
    {
      id: 'menu-level',
      title: 'menu-level',
      type: 'collapse',
      icon: icons.IconMenu,
      children: [
        {
          id: 'menu-level-1.1',
          title: 'level 1',
          type: 'item',
          url: '#'
        },
        {
          id: 'menu-level-1.2',
          title: 'level 1',
          type: 'collapse',
          children: [
            {
              id: 'menu-level-2.1',
              title: 'level 2',
              type: 'item',
              url: '#'
            },
            {
              id: 'menu-level-2.2',
              title: 'level 2',
              type: 'collapse',
              children: [
                {
                  id: 'menu-level-3.1',
                  title: 'level 3',
                  type: 'item',
                  url: '#'
                },
                {
                  id: 'menu-level-3.2',
                  title: 'level 3',
                  type: 'item',
                  url: '#'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'menu-level-subtitle',
      title: 'menu-level-subtitle',
      caption: 'menu-level-subtitle-caption',
      type: 'collapse',
      icon: icons.IconBoxMultiple,
      children: [
        {
          id: 'sub-menu-level-1.1',
          title: 'level 1',
          caption: 'menu-level-subtitle-item',
          type: 'item',
          url: '#'
        },
        {
          id: 'sub-menu-level-1.2',
          title: 'level 1',
          caption: 'menu-level-subtitle-collapse',
          type: 'collapse',
          children: [
            {
              id: 'sub-menu-level-2.1',
              title: 'level 2',
              caption: 'menu-level-subtitle-sub-item',
              type: 'item',
              url: '#'
            }
          ]
        }
      ]
    },
    {
      id: 'disabled-menu',
      title: 'disabled-menu',
      type: 'item',
      url: '#',
      icon: icons.IconCircleOff,
      disabled: true
    },
    {
      id: 'oval-chip-menu',
      title: 'oval-chip-menu',
      type: 'item',
      url: '#',
      icon: icons.IconCircle,
      chip: {
        label: '9',
        color: 'primary',
        variant: 'filled'
      }
    },
    {
      id: 'user-chip-menu',
      title: 'avatar',
      type: 'item',
      url: '#',
      icon: icons.IconBrandGravatar,
      chip: {
        label: 'coded',
        color: 'primary',
        avatar: <FormattedMessage id="c" />,
        size: 'small',
        variant: 'filled'
      }
    },
    {
      id: 'outline-chip-menu',
      title: 'outlined',
      type: 'item',
      url: '#',
      icon: icons.IconShape,
      chip: {
        label: 'outlined',
        variant: 'outlined',
        color: 'primary'
      }
    }
  ]
};

export default support;
