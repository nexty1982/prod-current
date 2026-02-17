import { MouseEvent, useState } from 'react';

// material-ui
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import InsertCommentOutlinedIcon from '@mui/icons-material/InsertCommentOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ShareTwoToneIcon from '@mui/icons-material/ShareTwoTone';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import FiberManualRecordTwoToneIcon from '@mui/icons-material/FiberManualRecordTwoTone';

import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Avatar3 from 'assets/images/users/avatar-3.png';

// blog data
const blogData = [
  {
    title: 'Building Scalable Applications with Angular',
    details:
      'Learn how to develop scalable, maintainable, and efficient web applications using Angular. This article covers Angular architecture, dependency injection, and best practices for large-scale projects.',
    name: 'Jane Smith',
    avatar: Avatar1,
    pro: true,
    image: 'blog-1',
    label: 'Angular',
    link: 'AngUI.io/',
    time: 15,
    likes: '30k',
    comments: '25k'
  },
  {
    title: 'UX Design Principles for Modern Web Applications',
    details:
      'Discover essential UX design principles that can help you create intuitive, user-friendly web applications. This article covers usability, accessibility, and visual hierarchy.',
    name: 'David Brown',
    avatar: Avatar2,
    pro: false,
    image: 'blog-2',
    label: 'UI/UX',
    link: 'ui/ux-dashboard.io/',
    time: 26,
    likes: '45k',
    comments: '35k'
  },
  {
    title: 'Material-UI Customization: Tailoring Your Components',
    details:
      'Learn how to customize Material-UI components to match your brand’s identity. This guide covers theming, styling overrides, and integrating custom components.',
    name: 'Harry Wilson',
    avatar: Avatar3,
    pro: true,
    image: 'blog-3',
    label: 'Material UI',
    link: 'material-ui-dashboard.io/',
    time: 36,
    likes: '72k',
    comments: '55k'
  }
];

// ==============================|| BLOG - DETAILS - COMMON CARD ||============================== //

export default function BlogCommonCard() {
  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const [share, setShare] = useState<{ index: number; element: Element | null } | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShareClick = (event: MouseEvent<HTMLButtonElement>, index: number) => {
    setShare({ index, element: event.currentTarget as Element });
  };

  const handleShareClose = () => {
    setShare(null);
  };

  const iconDesign = { mr: 1, fontSize: 16 };

  return (
    <>
      <Stack direction="row" sx={{ gap: { xs: 2, sm: 1 }, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4" sx={{ color: 'grey.700', fontWeight: 500 }}>
          More Articles
        </Typography>
        <IconButton size="small" onClick={handleClick}>
          <MoreVertIcon sx={{ opacity: 0.6 }} aria-controls="menu-popular-card" aria-haspopup="true" />
        </IconButton>
        <Menu
          id="menu-popular-card"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleClose}
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
          <MenuItem onClick={handleClose}>Today</MenuItem>
          <MenuItem onClick={handleClose}>This Month</MenuItem>
          <MenuItem onClick={handleClose}>This Year </MenuItem>
        </Menu>
      </Stack>
      {blogData.map((data, index) => (
        <MainCard key={index} sx={{ '.MuiCardContent-root': { p: 2.5 } }}>
          <Stack sx={{ gap: 2.5 }}>
            <Stack direction={{ sm: 'row' }} sx={{ gap: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  image={data.avatar && getImageUrl(`${data.image}.png`, ImagePath.BLOG)}
                  title="image1"
                  sx={{ borderRadius: 2, width: { xs: 1, sm: 203 }, height: { xs: 224, sm: 112 } }}
                />
                <Chip label={data.label} size="small" color="secondary" sx={{ position: 'absolute', top: 10, left: 10 }} />
              </Box>
              <Stack direction="row" sx={{ gap: 2, alignItems: 'flex-start' }}>
                <Stack sx={{ gap: 0.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 500 }}>
                    {data.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'grey.600' }}>
                    {data.details}
                  </Typography>
                </Stack>
                <IconButton>
                  <BookmarkBorderIcon color="disabled" sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            </Stack>

            <Stack direction={{ sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}>
              <Stack direction="row" sx={{ gap: 1, alignItems: { sm: 'center' } }}>
                <Avatar size="sm" alt="User 1" src={data.avatar} />
                <Stack sx={{ gap: 0.25 }}>
                  <Stack direction="row" sx={{ alignItems: { sm: 'center' }, gap: 1, justifyContent: 'flex-start' }}>
                    <Typography variant="h5">{data.name}</Typography>
                    {data.pro && <Chip label="PRO" size="small" sx={{ pt: 0.25 }} color="success" />}
                  </Stack>
                  <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption">{data.link}</Typography>
                    <Stack direction="row" sx={{ gap: 0.5, alignItems: 'baseline' }}>
                      <FiberManualRecordTwoToneIcon color="disabled" sx={{ fontSize: 8 }} />
                      <Typography variant="caption">{data.time} min ago</Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Stack>
              <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
                <Stack direction="row" sx={{ gap: 3 }}>
                  <Stack direction="row" sx={{ gap: 0.5, alignItems: 'baseline' }}>
                    <FiberManualRecordTwoToneIcon color="disabled" sx={{ fontSize: 8 }} />
                    <Typography variant="caption">{data.likes} likes</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ gap: 0.5, alignItems: 'baseline' }}>
                    <FiberManualRecordTwoToneIcon color="disabled" sx={{ fontSize: 8 }} />
                    <Typography variant="caption">{data.comments} Comments</Typography>
                  </Stack>
                </Stack>
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
              </Stack>
            </Stack>
          </Stack>
        </MainCard>
      ))}
    </>
  );
}
