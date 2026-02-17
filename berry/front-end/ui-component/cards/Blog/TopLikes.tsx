import { SyntheticEvent, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';

// assets
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';

// ==============================|| BLOG - TOP LIKES ||============================== //

interface User {
  name: string;
  active: string;
  avatar: string;
}

interface TopLikesProps {
  users: User[];
  title?: string;
}

export default function TopLikes({ users, title }: TopLikesProps) {
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const handleClick = (event: SyntheticEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <MainCard
      title={title}
      secondary={
        <>
          <IconButton size="small" onClick={handleClick}>
            <MoreVertIcon fontSize="small" sx={{ opacity: 0.6 }} aria-controls="menu-popular-card" aria-haspopup="true" />
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
        </>
      }
      content={false}
      headerSX={{ p: 2.5 }}
    >
      <List disablePadding>
        {users.map((user, index) => (
          <ListItem
            key={index}
            sx={{ p: '12px 20px' }}
            alignItems="center"
            divider
            secondaryAction={
              <IconButton>
                <PersonAddAlt1OutlinedIcon sx={{ fontSize: 18, color: 'grey.500' }} />
              </IconButton>
            }
          >
            <ListItemAvatar sx={{ minWidth: 48 }}>
              <Avatar alt={user.name} size="xs" src={user.avatar} />
            </ListItemAvatar>
            <ListItemText
              sx={{ m: 0 }}
              primary={user.name}
              slotProps={{ primary: { variant: 'h6' }, secondary: { variant: 'caption' } }}
              secondary={user.active}
            />
          </ListItem>
        ))}
      </List>
      <CardActions sx={{ p: 1.25, justifyContent: 'center' }}>
        <Button size="small" disableElevation>
          See More
          <ChevronRightOutlinedIcon fontSize="small" />
        </Button>
      </CardActions>
    </MainCard>
  );
}
