// assets
import { IconKey, IconReceipt2, IconBug, IconBellRinging, IconPhoneCall, IconQuestionMark, IconShieldLock } from '@tabler/icons-react';
import { NavItemType } from 'types';

// constant
const icons = {
  IconKey,
  IconReceipt2,
  IconBug,
  IconBellRinging,
  IconPhoneCall,
  IconQuestionMark,
  IconShieldLock
};

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const pages: NavItemType = {
  id: 'pages',
  title: 'pages',
  caption: 'pages-caption',
  icon: icons.IconKey,
  type: 'group',
  children: [
    {
      id: 'authentication',
      title: 'authentication',
      type: 'collapse',
      icon: icons.IconKey,
      children: [
        {
          id: 'authentication1',
          title: 'authentication 1',
          type: 'collapse',
          children: [
            {
              id: 'login1',
              title: 'login',
              type: 'item',
              url: '/pages/login/login1',
              target: true
            },
            {
              id: 'register1',
              title: 'register',
              type: 'item',
              url: '/pages/register/register1',
              target: true
            },
            {
              id: 'forgot-password1',
              title: 'forgot-password',
              type: 'item',
              url: '/pages/forgot-password/forgot-password1',
              target: true
            },
            {
              id: 'check-mail1',
              title: 'check-mail',
              type: 'item',
              url: '/pages/check-mail/check-mail1',
              target: true
            },
            {
              id: 'reset-password1',
              title: 'reset-password',
              type: 'item',
              url: '/pages/reset-password/reset-password1',
              target: true
            },
            {
              id: 'code-verification1',
              title: 'code-verification',
              type: 'item',
              url: '/pages/code-verification/code-verification1',
              target: true
            }
          ]
        },
        {
          id: 'authentication2',
          title: 'authentication 2',
          type: 'collapse',
          children: [
            {
              id: 'login2',
              title: 'login',
              type: 'item',
              url: '/pages/login/login2',
              target: true
            },
            {
              id: 'register2',
              title: 'register',
              type: 'item',
              url: '/pages/register/register2',
              target: true
            },
            {
              id: 'forgot-password2',
              title: 'forgot-password',
              type: 'item',
              url: '/pages/forgot-password/forgot-password2',
              target: true
            },
            {
              id: 'check-mail2',
              title: 'check-mail',
              type: 'item',
              url: '/pages/check-mail/check-mail2',
              target: true
            },
            {
              id: 'reset-password2',
              title: 'reset-password',
              type: 'item',
              url: '/pages/reset-password/reset-password2',
              target: true
            },
            {
              id: 'code-verification2',
              title: 'code-verification',
              type: 'item',
              url: '/pages/code-verification/code-verification2',
              target: true
            }
          ]
        },
        {
          id: 'authentication3',
          title: 'authentication 3',
          type: 'collapse',
          children: [
            {
              id: 'login3',
              title: 'login',
              type: 'item',
              url: '/pages/login/login3',
              target: true
            },
            {
              id: 'register3',
              title: 'register',
              type: 'item',
              url: '/pages/register/register3',
              target: true
            },
            {
              id: 'forgot-password3',
              title: 'forgot-password',
              type: 'item',
              url: '/pages/forgot-password/forgot-password3',
              target: true
            },
            {
              id: 'check-mail3',
              title: 'check-mail',
              type: 'item',
              url: '/pages/check-mail/check-mail3',
              target: true
            },
            {
              id: 'reset-password3',
              title: 'reset-password',
              type: 'item',
              url: '/pages/reset-password/reset-password3',
              target: true
            },
            {
              id: 'code-verification3',
              title: 'code-verification',
              type: 'item',
              url: '/pages/code-verification/code-verification3',
              target: true
            }
          ]
        }
      ]
    },
    {
      id: 'price',
      title: 'pricing',
      type: 'collapse',
      icon: icons.IconReceipt2,
      children: [
        {
          id: 'price1',
          title: 'price 01',
          type: 'item',
          url: '/pages/price/price1'
        },
        {
          id: 'price2',
          title: 'price 02',
          type: 'item',
          url: '/pages/price/price2'
        }
      ]
    },
    {
      id: 'maintenance',
      title: 'maintenance',
      type: 'collapse',
      icon: icons.IconBug,
      children: [
        {
          id: 'error',
          title: 'error-404',
          type: 'item',
          url: '/pages/error',
          target: true
        },
        {
          id: '500',
          title: 'error-500',
          type: 'item',
          url: '/pages/500',
          target: true
        },
        {
          id: 'coming-soon',
          title: 'coming-soon',
          type: 'collapse',
          children: [
            {
              id: 'coming-soon1',
              title: 'coming-soon 01',
              type: 'item',
              url: '/pages/coming-soon1',
              target: true
            },
            {
              id: 'coming-soon2',
              title: 'coming-soon 02',
              type: 'item',
              url: '/pages/coming-soon2',
              target: true
            }
          ]
        },
        {
          id: 'under-construction',
          title: 'under-construction',
          type: 'item',
          url: '/pages/under-construction',
          target: true
        }
      ]
    },
    {
      id: 'landing',
      title: 'landing',
      type: 'item',
      icon: icons.IconBellRinging,
      url: '/pages/landing',
      target: true
    },
    {
      id: 'contact-us',
      title: 'contact-us',
      type: 'item',
      icon: icons.IconPhoneCall,
      url: '/pages/contact-us',
      target: true
    },
    {
      id: 'faqs',
      title: 'faqs',
      type: 'item',
      icon: icons.IconQuestionMark,
      url: '/pages/faqs',
      target: true
    },
    {
      id: 'privacy-policy',
      title: 'privacy-policy',
      type: 'item',
      icon: icons.IconShieldLock,
      url: '/pages/privacy-policy',
      target: true
    }
  ]
};

export default pages;
