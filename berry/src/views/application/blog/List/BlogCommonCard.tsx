import { MouseEvent, useState } from 'react';

import { Link } from 'react-router-dom';

// material-ui
import Chip, { ChipProps } from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';
import useConfig from 'hooks/useConfig';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import FiberManualRecordTwoToneIcon from '@mui/icons-material/FiberManualRecordTwoTone';
import ShareTwoToneIcon from '@mui/icons-material/ShareTwoTone';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import InsertCommentOutlinedIcon from '@mui/icons-material/InsertCommentOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';

import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Avatar3 from 'assets/images/users/avatar-3.png';
import Avatar4 from 'assets/images/users/avatar-4.png';
import Avatar5 from 'assets/images/users/avatar-5.png';

type BlogPost = {
  title: string;
  details: string;
  name: string;
  avatar: string;
  pro: boolean;
  image: string;
  likes: string;
  comments: string;
  label: string;
  color: ChipProps['color'];
  activity: string;
};

// blog data
const blogData: BlogPost[] = [
  {
    title: 'Mastering React Hooks: Advanced',
    details:
      'Dive deep into React Hooks and learn how to manage state and side effects effectively. This comprehensive guide covers useState, useEffect, use, and custom hooks for building powerful React applications.',
    name: 'John Doe',
    avatar: Avatar1,
    pro: true,
    image: 'blog-1',
    likes: '55k',
    comments: '45k',
    label: 'React',
    color: 'secondary',
    activity: '10 min ago'
  },
  {
    title: 'Building Scalable Applications with Angular',
    details:
      'Learn how to develop scalable, maintainable, and efficient web applications using Angular. This article covers Angular architecture, dependency injection, and best practices for large-scale projects.',
    name: 'Jane Smith',
    avatar: Avatar2,
    pro: false,
    image: 'blog-2',
    likes: '52k',
    comments: '40k',
    label: 'React',
    color: 'secondary',
    activity: '25 min ago'
  },
  {
    title: 'Designing Intuitive Interfaces with Material-UI',
    details:
      'Material-UI simplifies the process of designing responsive and accessible user interfaces. This guide explores best practices for using Material-UI components and customizing themes.',
    name: 'Emily Davis',
    avatar: Avatar3,
    pro: true,
    image: 'blog-3',
    likes: '57k',
    comments: '43k',
    label: 'React',
    color: 'secondary',
    activity: '15 min ago'
  },
  {
    title: 'Angular vs React: Choosing the Right Framework',
    details:
      'Angular and React are both popular front-end frameworks. This article provides a detailed comparison to help you choose the right one for your project, based on performance & scalability',
    name: 'Michael Lee',
    avatar: Avatar4,
    pro: false,
    image: 'blog-4',
    likes: '50k',
    comments: '41k',
    label: 'Angular',
    color: 'error',
    activity: '2 hrs ago'
  },
  {
    title: 'Creating Smooth Animations with React Transition Group',
    details:
      'React Transition Group is a powerful tool for managing animations in React applications. Learn how to implement smooth transitions and animations to enhance user experience.',
    name: 'Sarah Johnson',
    avatar: Avatar5,
    pro: false,
    image: 'blog-5',
    likes: '56k',
    comments: '45k',
    label: 'React',
    color: 'secondary',
    activity: '20 min ago'
  },
  {
    title: 'UX Design Principles for Modern Web Applications',
    details:
      'Discover essential UX design principles that can help you create intuitive, user-friendly web applications. This article covers usability, accessibility, and visual hierarchy.',
    name: 'David Brown',
    avatar: Avatar1,
    pro: true,
    image: 'blog-6',
    likes: '65k',
    comments: '51k',
    label: 'React',
    color: 'secondary',
    activity: '30 min ago'
  },
  {
    title: 'Material-UI Customization: Tailoring Your Components',
    details:
      'Learn how to customize Material-UI components to match your brand’s identity. This guide covers theming, styling overrides, and integrating custom components.',
    name: 'Harry Wilson',
    avatar: Avatar2,
    pro: false,
    image: 'blog-7',
    likes: '62k',
    comments: '45k',
    label: 'Angular',
    color: 'error',
    activity: '25 min ago'
  },
  {
    title: 'Creating Smooth Animations with React Transition Group',
    details:
      'React Transition Group is a powerful tool for managing animations in React applications. Learn how to implement smooth transitions and animations to enhance user experience.',
    name: 'Sarah Johnson',
    avatar: Avatar5,
    pro: false,
    image: 'blog-8',
    likes: '45k',
    comments: '37k',
    label: 'React',
    color: 'secondary',
    activity: '15 min ago'
  }
];

// ==============================|| BLOG - LIST - COMMON CARD ||============================== //

export default function BlogCommonCard() {
  const { mode } = useConfig();
  const [isList, setIsList] = useState(false);

  const handleRadioChange = (event: any) => {
    setIsList(event.target.value === 'list');
  };

  const [share, setShare] = useState<{ index: number; element: Element | null } | null>(null);

  const handleShareClick = (event: MouseEvent<HTMLButtonElement>, index: number) => {
    setShare({ index, element: event.currentTarget as Element });
  };

  const handleShareClose = () => {
    setShare(null);
  };

  const iconDesign = { mr: 1, fontSize: 16 };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2.5, width: '100%' }}>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 500 }}>
            All Post
          </Typography>
          <Box sx={{ p: 1, border: 1, borderColor: mode === ThemeMode.DARK ? 'divider' : 'grey.300', borderRadius: 2 }}>
            <RadioGroup
              row
              aria-label="layout"
              onChange={handleRadioChange}
              value={isList ? 'list' : 'grid'}
              name="row-radio-buttons-group"
            >
              <FormControlLabel
                sx={{ mx: 0 }}
                control={<Radio value="grid" sx={{ display: 'none' }} />}
                label={
                  <Avatar
                    size="sm"
                    variant="rounded"
                    sx={{
                      mr: 1.25,
                      bgcolor: !isList ? 'primary.main' : 'transparent',
                      color: !isList ? 'common.white' : 'grey.500'
                    }}
                  >
                    <GridViewOutlinedIcon />
                  </Avatar>
                }
              />
              <FormControlLabel
                control={<Radio value="list" sx={{ display: 'none' }} />}
                sx={{ mx: 0 }}
                label={
                  <Avatar
                    size="sm"
                    variant="rounded"
                    sx={{
                      bgcolor: isList ? 'primary.main' : 'transparent',
                      color: isList ? 'common.white' : 'grey.500'
                    }}
                  >
                    <ViewAgendaOutlinedIcon />
                  </Avatar>
                }
              />
            </RadioGroup>
          </Box>
        </Stack>
      </Grid>
      {blogData.map((data, index) => (
        <Grid key={index} size={{ xs: 12, sm: isList ? 12 : 6 }}>
          <MainCard sx={{ height: 1, '& .MuiCardContent-root': { height: 1 } }}>
            <Stack sx={{ height: 1, justifyContent: 'space-between', gap: gridSpacing }}>
              <Stack direction={isList ? { sm: 'row' } : 'column'} sx={{ gap: 2 }}>
                <CardMedia
                  component="img"
                  image={data.avatar && getImageUrl(`${data.image}.png`, ImagePath.BLOG)}
                  title="image1"
                  sx={{ borderRadius: 2, width: isList ? { sm: '30%', xl: '20%' } : 'inherit' }}
                />
                <Stack sx={{ gap: 1 }}>
                  <Typography variant="h4" component={Link} to="/apps/blog/blog-details" sx={{ fontWeight: 500, textDecoration: 'none' }}>
                    {data.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'grey.600' }}>
                    {data.details}
                  </Typography>
                </Stack>
              </Stack>
              <Stack direction={isList ? { sm: 'row' } : 'column'} sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Stack direction="row" sx={{ gap: 1, alignItems: { sm: 'center' } }}>
                  <Avatar size="sm" alt="User 1" src={data.avatar} />
                  <Stack sx={{ gap: 0.25 }}>
                    <Stack direction="row" sx={{ alignItems: { sm: 'center' }, gap: 1, justifyContent: 'flex-start' }}>
                      <Typography variant="h5">{data.name}</Typography>
                      {data.pro && <Chip label="PRO" size="small" sx={{ pt: 0.25 }} color="success" />}
                    </Stack>
                    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                      <Chip label={data.label} size="small" color={data.color} />
                      <Stack direction="row" sx={{ gap: 0.5, alignItems: 'baseline' }}>
                        <FiberManualRecordTwoToneIcon color="disabled" sx={{ fontSize: 8 }} />
                        <Typography variant="caption">{data.activity}</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
                <Stack direction="row" sx={{ gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" sx={{ gap: 2 }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'baseline' }}>
                      <FiberManualRecordTwoToneIcon color="disabled" sx={{ fontSize: 8, verticalAlign: 'center', mr: 0.5 }} />
                      {data.likes} likes
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'baseline' }}>
                      <FiberManualRecordTwoToneIcon color="disabled" sx={{ fontSize: 8, verticalAlign: 'center', mr: 0.5 }} />
                      {data.comments} Comments
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
                    <IconButton size="small" onClick={(event) => handleShareClick(event, index)}>
                      <ShareTwoToneIcon color="disabled" sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Menu
                      id="menu-popular-card"
                      anchorEl={share?.element}
                      keepMounted
                      open={share?.index === index}
                      onClose={handleShareClose}
                      variant="selectedMenu"
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right'
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                      }}
                    >
                      <MenuItem onClick={handleShareClose}>
                        <ShareTwoToneIcon sx={iconDesign} /> Share Now
                      </MenuItem>
                      <MenuItem onClick={handleShareClose}>
                        <PeopleAltOutlinedIcon sx={iconDesign} />
                        Share to Friends
                      </MenuItem>
                      <MenuItem onClick={handleShareClose}>
                        <InsertCommentOutlinedIcon sx={iconDesign} /> Send in Messanger
                      </MenuItem>
                      <MenuItem onClick={handleShareClose}>
                        <ContentCopyOutlinedIcon sx={iconDesign} /> Copy Link
                      </MenuItem>
                    </Menu>
                    <IconButton size="small">
                      <BookmarkBorderIcon color="disabled" sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </MainCard>
        </Grid>
      ))}
      <Grid size={12}>
        <MainCard content={false} sx={{ '& .MuiPagination-ul': { justifyContent: 'flex-end', p: 1 } }}>
          <Pagination count={24} defaultPage={1} shape="rounded" siblingCount={0} boundaryCount={1} color="primary" />
        </MainCard>
      </Grid>
    </Grid>
  );
}
