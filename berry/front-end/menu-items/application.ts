import { NavItemType } from 'types';

// assets
import {
  IconApps,
  IconUserCheck,
  IconBasket,
  IconFileInvoice,
  IconMessages,
  IconLayoutKanban,
  IconMail,
  IconCalendar,
  IconNfc,
  IconHeadphones,
  IconArticle,
  IconLifebuoy
} from '@tabler/icons-react';

// constant
const icons = {
  IconApps,
  IconUserCheck,
  IconBasket,
  IconFileInvoice,
  IconMessages,
  IconLayoutKanban,
  IconMail,
  IconCalendar,
  IconNfc,
  IconHeadphones,
  IconArticle,
  IconLifebuoy
};

// ==============================|| MENU ITEMS - APPLICATION ||============================== //

const application: NavItemType = {
  id: 'application',
  title: 'application',
  icon: icons.IconApps,
  type: 'group',
  children: [
    {
      id: 'users',
      title: 'users',
      type: 'collapse',
      icon: icons.IconUserCheck,
      children: [
        {
          id: 'posts',
          title: 'social-profile',
          type: 'item',
          link: '/apps/user/social-profile/:tab',
          url: '/apps/user/social-profile/posts',
          breadcrumbs: false
        },
        {
          id: 'account-profile',
          title: 'account-profile',
          type: 'collapse',
          children: [
            {
              id: 'profile1',
              title: 'profile 01',
              type: 'item',
              url: '/apps/user/account-profile/profile1'
            },
            {
              id: 'profile2',
              title: 'profile 02',
              type: 'item',
              url: '/apps/user/account-profile/profile2'
            },
            {
              id: 'profile3',
              title: 'profile 03',
              type: 'item',
              url: '/apps/user/account-profile/profile3'
            }
          ]
        },
        {
          id: 'user-card',
          title: 'cards',
          type: 'collapse',
          children: [
            {
              id: 'card1',
              title: 'style 01',
              type: 'item',
              url: '/apps/user/card/card1'
            },
            {
              id: 'card2',
              title: 'style 02',
              type: 'item',
              url: '/apps/user/card/card2'
            },
            {
              id: 'card3',
              title: 'style 03',
              type: 'item',
              url: '/apps/user/card/card3'
            }
          ]
        },
        {
          id: 'user-list',
          title: 'list',
          type: 'collapse',
          children: [
            {
              id: 'list1',
              title: 'style 01',
              type: 'item',
              url: '/apps/user/list/list1'
            },
            {
              id: 'list2',
              title: 'style 02',
              type: 'item',
              url: '/apps/user/list/list2'
            }
          ]
        }
      ]
    },
    {
      id: 'customer',
      title: 'customer',
      type: 'collapse',
      icon: icons.IconHeadphones,
      children: [
        {
          id: 'customer-list',
          title: 'customer-list',
          type: 'item',
          url: '/apps/customer/customer-list'
        },
        {
          id: 'order-list',
          title: 'order-list',
          type: 'item',
          url: '/apps/customer/order-list'
        },
        {
          id: 'create-invoice',
          title: 'create-invoice',
          type: 'item',
          url: '/apps/customer/create-invoice',
          breadcrumbs: false
        },
        {
          id: 'order-details',
          title: 'order-details',
          type: 'item',
          url: '/apps/customer/order-details'
        },
        {
          id: 'product',
          title: 'product',
          type: 'item',
          url: '/apps/customer/product'
        },
        {
          id: 'product-review',
          title: 'product-review',
          type: 'item',
          url: '/apps/customer/product-review',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'chat',
      title: 'chat',
      type: 'item',
      icon: icons.IconMessages,
      url: '/apps/chat'
    },
    {
      id: 'kanban',
      title: 'kanban',
      type: 'item',
      icon: icons.IconLayoutKanban,
      link: '/apps/kanban/:tab',
      url: '/apps/kanban/board',
      breadcrumbs: false
    },
    {
      id: 'mail',
      title: 'mail',
      type: 'item',
      icon: icons.IconMail,
      url: '/apps/mail'
    },
    {
      id: 'calendar',
      title: 'calendar',
      type: 'item',
      url: '/apps/calendar',
      icon: icons.IconCalendar
    },
    {
      id: 'contact',
      title: 'contact',
      type: 'collapse',
      icon: icons.IconNfc,
      children: [
        {
          id: 'c-card',
          title: 'cards',
          type: 'item',
          url: '/apps/contact/c-card',
          breadcrumbs: false
        },
        {
          id: 'c-list',
          title: 'list',
          type: 'item',
          url: '/apps/contact/c-list',
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'e-commerce',
      title: 'e-commerce',
      type: 'collapse',
      icon: icons.IconBasket,
      children: [
        {
          id: 'products',
          title: 'products',
          type: 'item',
          url: '/apps/e-commerce/products'
        },
        {
          id: 'product-details',
          title: 'product-details',
          type: 'item',
          link: '/apps/e-commerce/product-details/:id',
          url: '/apps/e-commerce/product-details/1',
          breadcrumbs: false
        },
        {
          id: 'product-list',
          title: 'product-list',
          type: 'item',
          url: '/apps/e-commerce/product-list'
        },
        {
          id: 'checkout',
          title: 'checkout',
          type: 'item',
          url: '/apps/e-commerce/checkout'
        }
      ]
    },
    {
      id: 'invoice',
      title: 'invoice',
      type: 'collapse',
      icon: icons.IconFileInvoice,
      children: [
        {
          id: 'invoice-dashboard',
          title: 'dashboard',
          type: 'item',
          url: '/apps/invoice/dashboard',
          breadcrumbs: false
        },
        {
          id: 'create-invoice',
          title: 'create',
          type: 'item',
          url: '/apps/invoice/create-invoice',
          breadcrumbs: false
        },
        {
          id: 'invoice-list',
          title: 'list',
          type: 'item',
          url: '/apps/invoice/invoice-list'
        },
        {
          id: 'edit-invoice',
          title: 'edit',
          type: 'item',
          url: '/apps/invoice/edit-invoice'
        },
        {
          id: 'invoice-details',
          title: 'details',
          type: 'item',
          url: '/apps/invoice/invoice-details'
        },
        {
          id: 'client',
          title: 'client',
          type: 'collapse',
          children: [
            {
              id: 'add-client',
              title: 'create',
              type: 'item',
              url: '/apps/invoice/client/add-client'
            },
            {
              id: 'client-list',
              title: 'list',
              type: 'item',
              url: '/apps/invoice/client/client-list'
            }
          ]
        },
        {
          id: 'item',
          title: 'item',
          type: 'collapse',
          children: [
            {
              id: 'add-item',
              title: 'create',
              type: 'item',
              url: '/apps/invoice/items/add-item'
            },
            {
              id: 'item-list',
              title: 'list',
              type: 'item',
              url: '/apps/invoice/items/item-list'
            }
          ]
        },
        {
          id: 'payment',
          title: 'payment',
          type: 'collapse',
          children: [
            {
              id: 'add-payment',
              title: 'create',
              type: 'item',
              url: '/apps/invoice/payment/add-payment'
            },
            {
              id: 'payment-list',
              title: 'list',
              type: 'item',
              url: '/apps/invoice/payment/payment-list'
            },
            {
              id: 'payment-details',
              title: 'details',
              type: 'item',
              url: '/apps/invoice/payment/payment-details'
            }
          ]
        }
      ]
    },
    {
      id: 'crm',
      title: 'crm',
      type: 'collapse',
      icon: icons.IconLifebuoy,
      children: [
        {
          id: 'lead-management',
          title: 'lead-management',
          type: 'collapse',
          children: [
            {
              id: 'lm-overview',
              title: 'overview',
              type: 'item',
              url: '/apps/crm/lead-management/lm-overview'
            },
            {
              id: 'lm-lead-list',
              title: 'lead-list',
              type: 'item',
              url: '/apps/crm/lead-management/lm-lead-list'
            }
          ]
        },

        {
          id: 'contact-management',
          title: 'contact-management',
          type: 'collapse',
          children: [
            {
              id: 'cm-contact-card',
              title: 'contact-card',
              type: 'item',
              url: '/apps/crm/contact-management/cm-contact-card'
            },
            {
              id: 'cm-contact-list',
              title: 'contact-list',
              type: 'item',
              url: '/apps/crm/contact-management/cm-contact-list'
            },
            {
              id: 'cm-reminders-followup',
              title: 'reminders-followup',
              type: 'item',
              url: '/apps/crm/contact-management/cm-reminders-followup'
            },
            {
              id: 'cm-communication-history',
              title: 'communication-history',
              type: 'item',
              url: '/apps/crm/contact-management/cm-communication-history'
            }
          ]
        },
        {
          id: 'sales-management',
          title: 'sales-management',
          type: 'collapse',
          children: [
            {
              id: 'sm-statement',
              title: 'statement',
              type: 'item',
              url: '/apps/crm/sales-management/sm-statement'
            },
            {
              id: 'sm-refund',
              title: 'refund',
              type: 'item',
              url: '/apps/crm/sales-management/sm-refund'
            },
            {
              id: 'sm-earning',
              title: 'earning',
              type: 'item',
              url: '/apps/crm/sales-management/sm-earning'
            }
          ]
        }
      ]
    },
    {
      id: 'blog',
      title: 'blog',
      type: 'collapse',
      icon: icons.IconArticle,
      children: [
        {
          id: 'dashboard',
          title: 'dashboard',
          type: 'item',
          url: '/apps/blog/dashboard'
        },
        {
          id: 'general-settings',
          title: 'general-settings',
          type: 'item',
          url: '/apps/blog/general-settings'
        },
        {
          id: 'add-new',
          title: 'add-new',
          type: 'item',
          url: '/apps/blog/add-new'
        },
        {
          id: 'edit',
          title: 'edit',
          type: 'item',
          url: '/apps/blog/edit'
        },
        {
          id: 'blog-list',
          title: 'blog-list',
          type: 'item',
          url: '/apps/blog/blog-list'
        },
        {
          id: 'blog-details',
          title: 'blog-details',
          type: 'item',
          url: '/apps/blog/blog-details'
        }
      ]
    }
  ]
};

export default application;
