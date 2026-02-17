// types
import { Article, DraftItem } from 'types/blog';

import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Avatar3 from 'assets/images/users/avatar-3.png';
import Avatar4 from 'assets/images/users/avatar-4.png';

// hashtags data
export const hashTagData = [
  {
    title: 'Code&Passion',
    details: 'Dive into coding insights, experiences & idea.',
    label: 'New',
    color: 'success',
    active: '5 min ago',
    challengers: 104
  },
  {
    title: 'DesignInspire',
    details: 'Explore creative design ideas, innovations and experience.',
    label: 'Closed',
    color: 'error',
    active: '2 hrs ago',
    challengers: 121
  },
  {
    title: 'ShareYourVoice',
    details: 'Discover unique perspectives and personal stories.',
    label: 'New',
    color: 'success',
    active: '10 min ago',
    challengers: 162
  }
];

// drafts data
export const draftData: DraftItem[] = [
  {
    title: 'Responsive UI Design With Material-UI & React',
    subTitle: 'Responsive UI Design With Material-UI & React',
    label: 'React',
    color: 'secondary',
    date: 'March 23, 2024'
  },
  {
    title: 'Data Visualization in React Using ApexCharts',
    subTitle: 'Data Visualization in React Using ApexCharts',
    label: 'React',
    color: 'secondary',
    date: 'April 13, 2024'
  },
  {
    title: 'Building Scalable APIs With Node.js',
    subTitle: 'Building Scalable APIs With Node.js and Express',
    label: 'Technology',
    color: 'primary',
    date: 'June 20, 2024'
  }
];

// article data
export const articles: Article[] = [
  {
    title: 'Responsive UI Design Angular',
    subTitle: 'Responsive UI Design With Angular',
    name: 'Brendan Smith',
    label: 'Angular',
    color: 'secondary',
    avatar: Avatar1,
    link: 'AngUI.io/',
    comments: '55k',
    status: '5 min ago'
  },
  {
    title: 'Data Visualization in React Using ApexCharts',
    subTitle: 'Data Visualization in React Using ApexCharts',
    name: 'Sophia Johnson',
    label: 'React',
    color: 'primary',
    avatar: Avatar3,
    link: 'ReactUI.io/',
    comments: '45k',
    status: '8 min ago'
  },
  {
    title: 'Building Scalable APIs With Node.js',
    subTitle: 'Building Scalable APIs With Node.js',
    name: 'Charlotte Brrown',
    label: 'Bootstrap',
    color: 'primary',
    avatar: Avatar2,
    link: 'Dashboard.io/',
    comments: '47k',
    status: '2 hrs ago'
  }
];

// users data
export const users = [
  {
    name: 'Brendan Smith',
    active: '5 minute ago',
    avatar: Avatar1
  },
  {
    name: 'Lula Hale',
    active: '5 minute ago',
    avatar: Avatar2
  },
  {
    name: 'Billy Park',
    active: '5 minute ago',
    avatar: Avatar3
  },
  {
    name: 'Norman Holland',
    active: '5 minute ago',
    avatar: Avatar4
  }
];
