// project imports
import { useGetMenu } from 'api/menu';

// assets
import { IconChartArcs, IconClipboardList, IconChartInfographic, IconLoader } from '@tabler/icons-react';

// types
import { NavItemType } from 'types';

const icons = {
  widget: IconChartArcs,
  statistics: IconChartArcs,
  data: IconClipboardList,
  chart: IconChartInfographic
};

const loadingMenu: NavItemType = {
  id: 'group-widget-loading',
  title: 'widget',
  type: 'group',
  children: [
    {
      id: 'statistics1',
      title: 'loading',
      type: 'item',
      icon: IconLoader,
      url: '/widget/statistics',
      breadcrumbs: false
    },
    {
      id: 'data1',
      title: 'loading',
      type: 'item',
      icon: IconLoader,
      url: '/widget/data',
      breadcrumbs: false
    },
    {
      id: 'chart1',
      title: 'loading',
      type: 'item',
      icon: IconLoader,
      url: '/widget/chart',
      breadcrumbs: false
    }
  ]
};

// ==============================|| MENU ITEMS - API ||============================== //

export function Menu() {
  const { menu, menuLoading } = useGetMenu();

  if (menuLoading) return loadingMenu;

  const SubChildrenLis = (subChildrenLis: NavItemType[]) => {
    return subChildrenLis?.map((subList: NavItemType) => {
      return {
        ...subList,
        title: subList.title,
        // @ts-ignore
        icon: icons[subList.icon]
      };
    });
  };

  const menuItem = (subList: NavItemType) => {
    let list: NavItemType = {
      ...subList,
      title: subList.title,
      // @ts-ignore
      icon: icons[subList.icon]
    };

    if (subList.type === 'collapse') {
      list.children = SubChildrenLis(subList.children!);
    }
    return list;
  };

  const withoutMenu = menu?.children?.filter((item: NavItemType) => item.id !== 'no-menu');

  const ChildrenList: NavItemType[] | undefined = withoutMenu?.map((subList: NavItemType) => menuItem(subList));

  let menuList: NavItemType = {
    ...menu,
    title: menu?.title,
    // @ts-ignore
    icon: icons[menu?.icon],
    children: ChildrenList
  };

  return menuList;
}
