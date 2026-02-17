import { cloneElement, CSSProperties, ReactElement, SyntheticEvent } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useScrollTrigger from '@mui/material/useScrollTrigger';

// project imports
import { ThemeMode } from 'config';
import SubCard from 'ui-component/cards/SubCard';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import HighlightOffTwoToneIcon from '@mui/icons-material/HighlightOffTwoTone';
import BusinessTwoToneIcon from '@mui/icons-material/BusinessTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import MailTwoToneIcon from '@mui/icons-material/MailTwoTone';
import CallTwoToneIcon from '@mui/icons-material/CallTwoTone';
import PinDropTwoToneIcon from '@mui/icons-material/PinDropTwoTone';
import CakeTwoToneIcon from '@mui/icons-material/CakeTwoTone';
import InfoTwoToneIcon from '@mui/icons-material/InfoTwoTone';
import ChatBubbleTwoToneIcon from '@mui/icons-material/ChatBubbleTwoTone';
import NotInterestedTwoToneIcon from '@mui/icons-material/NotInterestedTwoTone';

// types
import { UserProfile } from 'types/user-profile';

// sticky details card
interface ElevationScrollProps {
  children: ReactElement<{ style?: CSSProperties }>;
  window?: Window | Node;
}

function ElevationScroll({ children, window }: ElevationScrollProps) {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 130,
    target: window || undefined
  });

  return cloneElement(children, {
    style: {
      position: trigger ? 'fixed' : 'relative',
      top: trigger ? 83 : 0,
      width: trigger ? 318 : '100%'
    }
  });
}

// ==============================|| CONTACT CARD/LIST USER DETAILS ||============================== //

interface UserDetailsProps {
  user: UserProfile;
  onClose: (e: SyntheticEvent) => void;
  onEditClick: (e: SyntheticEvent) => void;
}

export default function UserDetails({ user, onClose, onEditClick, ...others }: UserDetailsProps) {
  const theme = useTheme();

  const avatarProfile = user.avatar && getImageUrl(`${user.avatar}`, ImagePath.USERS);

  return (
    <ElevationScroll {...others}>
      <SubCard
        content={false}
        sx={{
          bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50',
          width: '100%',
          maxWidth: 342,
          height: 'calc(100vh - 105px)',
          overflowY: 'auto'
        }}
      >
        <Grid container spacing={gridSpacing} sx={{ p: 3 }}>
          <Grid size={12}>
            <Grid container spacing={1} sx={{ alignItems: 'center' }}>
              <Grid>
                <Avatar alt={user.name} src={avatarProfile} sx={{ width: 64, height: 64 }} />
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="h5" sx={{ fontSize: '1rem' }}>
                      {user.name}
                    </Typography>
                  </Grid>
                  <Grid size={12}>
                    <Chip label="Work" />
                  </Grid>
                </Grid>
              </Grid>
              <Grid>
                <IconButton onClick={onClose} size="large">
                  <HighlightOffTwoToneIcon />
                </IconButton>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Button variant="outlined" fullWidth startIcon={<ChatBubbleTwoToneIcon />} onClick={onEditClick}>
                  Edit
                </Button>
              </Grid>
              <Grid size={6}>
                <Button variant="outlined" color="secondary" fullWidth startIcon={<NotInterestedTwoToneIcon />}>
                  Block
                </Button>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Divider />
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid>
                <BusinessTwoToneIcon sx={{ verticalAlign: 'sub', fontSize: '1.125rem', mr: 0.625 }} />
              </Grid>
              <Grid size="grow">
                <Typography variant="body2">{user.company}</Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid>
                <WorkTwoToneIcon sx={{ verticalAlign: 'sub', fontSize: '1.125rem', mr: 0.625 }} />
              </Grid>
              <Grid size="grow">
                <Typography variant="body2">{user.role}</Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid>
                <MailTwoToneIcon sx={{ verticalAlign: 'sub', fontSize: '1.125rem', mr: 0.625 }} />
              </Grid>
              <Grid size="grow">
                <Typography variant="body2" sx={{ mb: 0.625 }}>
                  {user.work_email}
                  <Typography component="span" color="primary">
                    work
                  </Typography>
                </Typography>
                <Typography variant="body2">
                  {user.personal_email}
                  <Typography component="span" color="secondary">
                    Personal
                  </Typography>
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid>
                <CallTwoToneIcon sx={{ verticalAlign: 'sub', fontSize: '1.125rem', mr: 0.625 }} />
              </Grid>
              <Grid size="grow">
                <Typography variant="body2" sx={{ mb: 0.625 }}>
                  {user.work_phone}{' '}
                  <Typography component="span" color="primary">
                    work
                  </Typography>
                </Typography>
                <Typography variant="body2">
                  {user.personal_phone}{' '}
                  <Typography component="span" color="secondary">
                    Personal
                  </Typography>
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid>
                <PinDropTwoToneIcon sx={{ verticalAlign: 'sub', fontSize: '1.125rem', mr: 0.625 }} />
              </Grid>
              <Grid size="grow">
                <Typography variant="body2">{user.location}</Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid>
                <CakeTwoToneIcon sx={{ verticalAlign: 'sub', fontSize: '1.125rem', mr: 0.625 }} />
              </Grid>
              <Grid size="grow">
                <Typography variant="body2">November 30, 1997</Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid>
                <InfoTwoToneIcon sx={{ verticalAlign: 'sub', fontSize: '1.125rem', mr: 0.625 }} />
              </Grid>
              <Grid size="grow">
                <Typography variant="body2" sx={{ mb: 0.625 }}>
                  {user.birthdayText}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </SubCard>
    </ElevationScroll>
  );
}
