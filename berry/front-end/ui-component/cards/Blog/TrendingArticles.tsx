import { MouseEvent, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CardActions from '@mui/material/CardActions';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';

// types
import { Article } from 'types/blog';

// assets
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import FiberManualRecordTwoToneIcon from '@mui/icons-material/FiberManualRecordTwoTone';

interface TrendingArticlesProps {
  title?: string;
  articles: Article[];
}
// ==============================|| BLOG - TRENDING ARTICLES ||============================== //

export default function TrendingArticles({ title, articles }: TrendingArticlesProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
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
      headerSX={{ p: 2.5 }}
      content={false}
    >
      <List sx={{ p: 0 }}>
        {articles.map((data, index) => (
          <ListItem key={index} sx={{ p: '16px 20px' }} divider>
            <ListItemText sx={{ m: 0 }}>
              <Stack sx={{ gap: 1.5 }}>
                <Stack sx={{ gap: 0.5 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Chip label={data.label} size="small" color={data.color} />
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'baseline' }}>
                      <FiberManualRecordTwoToneIcon sx={{ color: 'text.disabled', fontSize: 8, mr: 0.5 }} />
                      {data.status}
                    </Typography>
                  </Stack>
                  <Typography variant="h5">{data.title}</Typography>
                  <Typography variant="caption">{data.subTitle}</Typography>
                </Stack>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <FiberManualRecordTwoToneIcon sx={{ color: 'text.disabled', fontSize: 8, mr: 0.5 }} />
                    {data.comments} comments
                  </Typography>
                  <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                    <Avatar alt={data.name} src={data.avatar} sx={{ height: 26, width: 26 }} />
                    <Stack>
                      <Typography variant="h6">{data.name}</Typography>
                      <Typography variant="caption">{data.link}</Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Stack>
            </ListItemText>
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
