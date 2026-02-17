import { MouseEvent, useState } from 'react';

// material-ui
import Stack from '@mui/material/Stack';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import Avatar from 'ui-component/extended/Avatar';

// assets
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import FiberManualRecordTwoToneIcon from '@mui/icons-material/FiberManualRecordTwoTone';

import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Avatar3 from 'assets/images/users/avatar-3.png';

const users = [
  {
    avatar: Avatar1,
    title: 'Year Wrap-up 2023 - December Edition',
    name: 'Brendan Smith',
    likes: '45k',
    comments: '65k',
    views: '132',
    social: 'dasboard.io/',
    active: '5 min ago'
  },
  {
    avatar: Avatar2,
    title: 'Tech Trends 2024 - January Edition',
    name: 'Brian Sanders',
    likes: '40k',
    comments: '35k',
    views: '120',
    social: 'analytics.io/',
    active: '2 hrs ago'
  },
  {
    avatar: Avatar3,
    title: 'Quarterly Review 2024 - March Recap',
    name: 'Brittany Shaw',
    likes: '55k',
    comments: '50k',
    views: '142',
    social: 'statistics.io/',
    active: '10 min ago'
  }
];

// ==============================|| RECENT BLOG LIST ||============================== //

export default function RecentBlogList() {
  const [anchorEl, setAnchorEl] = useState<{ index: number; element: Element | null } | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>, index: number) => {
    setAnchorEl({ index, element: event.currentTarget as Element });
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <MainCard title="Recent Blog List" sx={{ '& .MuiCardContent-root': { p: 2.5 } }}>
      <Stack sx={{ gap: 2.5 }}>
        {users.map((user, index) => (
          <SubCard key={index} content={false} sx={{ p: 1.5 }}>
            <Stack sx={{ gap: 2 }}>
              <Stack sx={{ gap: 1.25 }}>
                <Stack direction="row" sx={{ gap: { xs: 2, sm: 1 }, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h5">{user.title}</Typography>
                  <IconButton size="small" onClick={(event) => handleClick(event, index)}>
                    <MoreVertIcon fontSize="small" sx={{ opacity: 0.6 }} aria-controls="menu-popular-card" aria-haspopup="true" />
                  </IconButton>
                  <Menu
                    id={`menu-popular-card-${index}`}
                    anchorEl={anchorEl?.element}
                    keepMounted
                    open={anchorEl?.index === index}
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
                    <MenuItem onClick={handleClose}>Edit</MenuItem>
                    <MenuItem onClick={handleClose}>Delete</MenuItem>
                  </Menu>
                </Stack>
                <Stack direction={{ sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: { xs: 1, sm: 2 } }}>
                  <Stack direction="row" sx={{ gap: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
                    <FavoriteBorderIcon
                      sx={{ cursor: 'pointer', fontSize: 16, color: 'grey.600' }}
                      aria-controls="menu-popular-card"
                      aria-haspopup="true"
                    />
                    <Typography variant="h6" sx={{ color: 'text.primary' }}>
                      {user.likes} likes
                    </Typography>
                    <Divider orientation="vertical" variant="middle" flexItem />
                    <ChatBubbleOutlineOutlinedIcon
                      sx={{ cursor: 'pointer', fontSize: 16, color: 'grey.600' }}
                      aria-controls="menu-popular-card"
                      aria-haspopup="true"
                    />
                    <Typography variant="h6" sx={{ color: 'text.primary' }}>
                      {user.comments} comments
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ gap: 1 }}>
                    <RemoveRedEyeOutlinedIcon
                      sx={{ cursor: 'pointer', fontSize: 16, color: 'grey.600' }}
                      aria-controls="menu-popular-card"
                      aria-haspopup="true"
                    />
                    <Typography variant="h6" sx={{ color: 'text.primary' }}>
                      {user.views}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption">
                  <FiberManualRecordTwoToneIcon sx={{ color: 'text.disabled', fontSize: 8, mr: 0.5 }} />
                  {user.active}
                </Typography>
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                  <Avatar size="badge" alt="User 1" src={user.avatar} />
                  <Stack>
                    <Typography variant="h6">{user.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'grey.600' }}>
                      {user.social}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </SubCard>
        ))}
      </Stack>
    </MainCard>
  );
}
