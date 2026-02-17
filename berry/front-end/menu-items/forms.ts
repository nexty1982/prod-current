// assets
import {
  IconClipboardCheck,
  IconPictureInPicture,
  IconForms,
  IconBorderAll,
  IconChartDots,
  IconStairsUp,
  IconMapPin,
  IconTable
} from '@tabler/icons-react';
import { NavItemType } from 'types';

// constant
const icons = {
  IconClipboardCheck,
  IconPictureInPicture,
  IconForms,
  IconBorderAll,
  IconChartDots,
  IconStairsUp,
  IconMapPin,
  IconTable
};

// ==============================|| UI FORMS MENU ITEMS ||============================== //

const forms: NavItemType = {
  id: 'ui-forms',
  title: 'forms',
  icon: icons.IconPictureInPicture,
  type: 'group',
  children: [
    {
      id: 'components',
      title: 'components',
      type: 'collapse',
      icon: icons.IconPictureInPicture,
      children: [
        {
          id: 'autocomplete',
          title: 'autocomplete',
          type: 'item',
          url: '/components/autocomplete',
          breadcrumbs: false
        },
        {
          id: 'button',
          title: 'button',
          type: 'item',
          url: '/components/button',
          breadcrumbs: false
        },
        {
          id: 'checkbox',
          title: 'checkbox',
          type: 'item',
          url: '/components/checkbox',
          breadcrumbs: false
        },
        {
          id: 'date-time',
          title: 'date-time',
          type: 'item',
          url: '/components/date-time',
          breadcrumbs: false
        },
        {
          id: 'radio',
          title: 'radio',
          type: 'item',
          url: '/components/radio',
          breadcrumbs: false
        },
        {
          id: 'slider',
          title: 'slider',
          type: 'item',
          url: '/components/slider',
          breadcrumbs: false
        },
        {
          id: 'switch',
          title: 'switch',
          type: 'item',
          url: '/components/switch',
          breadcrumbs: false
        },
        {
          id: 'text-field',
          title: 'text-field',
          type: 'item',
          url: '/components/text-field',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'plugins',
      title: 'plugins',
      type: 'collapse',
      icon: icons.IconForms,
      children: [
        {
          id: 'frm-autocomplete',
          title: 'autocomplete',
          type: 'item',
          url: '/forms/frm-autocomplete',
          breadcrumbs: false
        },
        {
          id: 'frm-mask',
          title: 'mask',
          type: 'item',
          url: '/forms/frm-mask',
          breadcrumbs: false
        },
        {
          id: 'frm-clipboard',
          title: 'clipboard',
          type: 'item',
          url: '/forms/frm-clipboard',
          breadcrumbs: false
        },
        {
          id: 'frm-recaptcha',
          title: 'recaptcha',
          type: 'item',
          url: '/forms/frm-recaptcha',
          breadcrumbs: false
        },
        {
          id: 'frm-editor',
          title: 'editor',
          type: 'item',
          url: '/forms/frm-editor',
          breadcrumbs: false
        },
        {
          id: 'frm-modal',
          title: 'modal',
          type: 'item',
          url: '/forms/frm-modal',
          breadcrumbs: false
        },
        {
          id: 'frm-tooltip',
          title: 'tooltip',
          type: 'item',
          url: '/forms/frm-tooltip'
        },
        {
          id: 'frm-dropzone',
          title: 'dropzone',
          type: 'item',
          url: '/forms/frm-dropzone'
        }
      ]
    },
    {
      id: 'layouts',
      title: 'layouts',
      type: 'collapse',
      icon: icons.IconForms,
      children: [
        {
          id: 'frm-layouts',
          title: 'layouts',
          type: 'item',
          url: '/forms/layouts/layouts'
        },
        {
          id: 'frm-multi-column-forms',
          title: 'multi-column-forms',
          type: 'item',
          url: '/forms/layouts/multi-column-forms'
        },
        {
          id: 'frm-action-bar',
          title: 'action-bar',
          type: 'item',
          url: '/forms/layouts/action-bar'
        },
        {
          id: 'frm-sticky-action-bar',
          title: 'sticky-action-bar',
          type: 'item',
          url: '/forms/layouts/sticky-action-bar'
        }
      ]
    },
    {
      id: 'tables',
      title: 'table',
      type: 'collapse',
      icon: icons.IconBorderAll,
      children: [
        {
          id: 'tbl-basic',
          title: 'table-basic',
          type: 'item',
          url: '/tables/tbl-basic',
          breadcrumbs: false
        },
        {
          id: 'tbl-dense',
          title: 'table-dense',
          type: 'item',
          url: '/tables/tbl-dense',
          breadcrumbs: false
        },
        {
          id: 'tbl-enhanced',
          title: 'table-enhanced',
          type: 'item',
          url: '/tables/tbl-enhanced',
          breadcrumbs: false
        },
        {
          id: 'tbl-data',
          title: 'table-data',
          type: 'item',
          url: '/tables/tbl-data',
          breadcrumbs: false
        },
        {
          id: 'tbl-customized',
          title: 'table-customized',
          type: 'item',
          url: '/tables/tbl-customized',
          breadcrumbs: false
        },
        {
          id: 'tbl-sticky-header',
          title: 'table-sticky-header',
          type: 'item',
          url: '/tables/tbl-sticky-header',
          breadcrumbs: false
        },
        {
          id: 'tbl-collapse',
          title: 'table-collapse',
          type: 'item',
          url: '/tables/tbl-collapse',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'data-grid',
      title: 'data-grid',
      type: 'collapse',
      icon: icons.IconTable,
      children: [
        {
          id: 'data-grid-basic',
          title: 'data-grid-basic',
          type: 'item',
          url: '/data-grid/data-grid-basic',
          breadcrumbs: false
        },
        {
          id: 'data-grid-inline-editing',
          title: 'data-grid-inline-editing',
          type: 'item',
          url: '/data-grid/data-grid-inline-editing',
          breadcrumbs: false
        },
        {
          id: 'data-grid-column-groups',
          title: 'data-grid-column-groups',
          type: 'item',
          url: '/data-grid/data-grid-column-groups',
          breadcrumbs: false
        },
        {
          id: 'data-grid-save-restore',
          title: 'data-grid-save-restore',
          type: 'item',
          url: '/data-grid/data-grid-save-restore',
          breadcrumbs: false
        },
        {
          id: 'data-grid-quick-filter',
          title: 'data-grid-quick-filter',
          type: 'item',
          url: '/data-grid/data-grid-quick-filter',
          breadcrumbs: false
        },
        {
          id: 'data-grid-column-visibility',
          title: 'data-grid-column-visibility',
          type: 'item',
          url: '/data-grid/data-grid-column-visibility',
          breadcrumbs: false
        },
        {
          id: 'data-grid-column-virtualization',
          title: 'data-grid-column-virtualization',
          type: 'item',
          url: '/data-grid/data-grid-column-virtualization',
          breadcrumbs: false
        },
        {
          id: 'data-grid-column-menu',
          title: 'data-grid-column-menu',
          type: 'item',
          url: '/data-grid/data-grid-column-menu',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'charts',
      title: 'charts',
      type: 'collapse',
      icon: icons.IconChartDots,
      children: [
        {
          id: 'apexchart',
          title: 'apexchart',
          type: 'item',
          url: '/forms/charts/apexchart'
        },
        {
          id: 'organization-chart',
          title: 'organization-chart',
          type: 'item',
          url: '/forms/charts/orgchart'
        }
      ]
    },
    {
      id: 'map',
      title: 'map',
      type: 'item',
      icon: icons.IconMapPin,
      url: '/forms/map'
    },
    {
      id: 'forms-validation',
      title: 'forms-validation',
      type: 'item',
      url: '/forms/forms-validation',
      icon: icons.IconClipboardCheck
    },
    {
      id: 'forms-wizard',
      title: 'forms-wizard',
      type: 'item',
      url: '/forms/forms-wizard',
      icon: icons.IconStairsUp
    }
  ]
};

export default forms;
