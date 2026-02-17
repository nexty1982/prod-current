import { MouseEvent, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from 'ui-component/extended/Avatar';

// types
import { DraftItem } from 'types/blog';

// assets
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ModeEditOutlinedIcon from '@mui/icons-material/ModeEditOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import FiberManualRecordTwoToneIcon from '@mui/icons-material/FiberManualRecordTwoTone';

interface DraftsProps {
  title: string;
  avatarCount: number;
  draftData: DraftItem[];
}

// ==============================|| BLOG - DRAFT ||============================== //

export default function Drafts({ title, avatarCount, draftData }: DraftsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" sx={{ gap: { xs: 2, sm: 1 }, alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              {title}
              <Avatar color="error" sx={{ height: 22, width: 22, fontSize: 12, fontWeight: 500, color: 'common.white' }}>
                {avatarCount}
              </Avatar>
            </Stack>
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
          </Stack>
        }
      />
      <Divider />
      <List sx={{ p: 0 }}>
        {draftData.map((data, index) => (
          <ListItem key={index} sx={{ p: '16px 24px' }} alignItems="flex-start" divider>
            <ListItemText
              sx={{ m: 0 }}
              primary={
                <Stack sx={{ pb: 1.5, gap: 0.25 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Chip label={data.label} size="small" sx={{ fontWeight: 500, fontSize: 12 }} color={data.color} />
                    <IconButton size="small">
                      <ModeEditOutlinedIcon fontSize="small" sx={{ color: 'grey.500' }} />
                    </IconButton>
                  </Stack>
                  <Typography variant="h5">{data.title}</Typography>
                  <Typography variant="caption">{data.subTitle}</Typography>
                </Stack>
              }
              secondary={
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'baseline' }}>
                  <FiberManualRecordTwoToneIcon sx={{ color: 'text.disabled', fontSize: 8, mr: 0.5 }} />
                  Last update {data.date}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
      <CardActions sx={{ p: 1.25, justifyContent: 'center' }}>
        <Button size="small" disableElevation>
          View All
          <ChevronRightOutlinedIcon fontSize="small" sx={{ mt: -0.25 }} />
        </Button>
      </CardActions>
    </Card>
  );
}
