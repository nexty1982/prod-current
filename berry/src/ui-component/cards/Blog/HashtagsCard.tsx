import { useState, MouseEvent } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Chip, { ChipProps } from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Menu from '@mui/material/Menu';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// assets
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import FiberManualRecordTwoToneIcon from '@mui/icons-material/FiberManualRecordTwoTone';

interface BlogData {
  title: string;
  details: string;
  label: string;
  color: string;
  active: string;
  challengers: number;
}

interface HashtagsCardProps {
  title: string;
  blogData: BlogData[];
  showAcceptButton: boolean;
}

// ==============================|| BLOG - HASHTAG CARD ||============================== //

export default function HashtagsCard({ title, blogData, showAcceptButton }: HashtagsCardProps) {
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
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleClose}>Today</MenuItem>
            <MenuItem onClick={handleClose}>This Month</MenuItem>
            <MenuItem onClick={handleClose}>This Year</MenuItem>
          </Menu>
        </>
      }
      content={false}
    >
      <List sx={{ p: 0 }}>
        {blogData.map((data, index) => (
          <ListItem key={index} sx={{ p: '16px 24px' }} alignItems="flex-start" divider>
            <ListItemText sx={{ m: 0 }}>
              <Stack>
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, justifyContent: 'flex-start' }}>
                    <Typography variant="h5">#{data.title}</Typography>
                    <Chip
                      color={data.color as ChipProps['color']}
                      label={data.label}
                      size="small"
                      variant="filled"
                      sx={{ borderRadius: 0.75, '& .MuiChip-label': { color: 'background.paper' } }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <FiberManualRecordTwoToneIcon sx={{ color: 'text.disabled', fontSize: 8, mr: 0.5 }} />
                    {data.active}
                  </Typography>
                </Stack>
                <Stack sx={{ gap: 1.5, mt: 0.25 }}>
                  <Typography variant="caption">{data.details}</Typography>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'baseline' }}>
                      <FiberManualRecordTwoToneIcon sx={{ color: 'text.disabled', fontSize: 8, mr: 0.5 }} />
                      {data.challengers} challengers
                    </Typography>
                    {showAcceptButton && (
                      <Button size="small" variant="outlined">
                        Accept
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Stack>
            </ListItemText>
          </ListItem>
        ))}
      </List>
      <CardActions sx={{ p: 1.25, justifyContent: 'center' }}>
        <Button size="small" disableElevation>
          View All
          <ChevronRightOutlinedIcon sx={{ mb: 0.25 }} fontSize="small" />
        </Button>
      </CardActions>
    </MainCard>
  );
}
