// This is example of menu item without group for horizontal layout. There will be no children.

// assets
import { IconBrandChrome } from '@tabler/icons-react';

// types
import { NavItemType } from 'types';

// ==============================|| MENU ITEMS - SAMPLE PAGE ||============================== //

const icons = {
  IconBrandChrome
};
const samplePage: NavItemType = {
  id: 'sample-page',
  title: 'sample-page',
  icon: icons.IconBrandChrome,
  type: 'group',
  url: '/sample-page'
};

export default samplePage;
