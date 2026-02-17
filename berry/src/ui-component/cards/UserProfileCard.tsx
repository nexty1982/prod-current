// material-ui
import { useTheme, styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from '../extended/Avatar';
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import ChatBubbleTwoToneIcon from '@mui/icons-material/ChatBubbleTwoTone';

// types
import { UserProfileCardProps } from 'types/user';

// styles
const FacebookWrapper = styled(Button)({
  padding: 8,
  background: 'rgba(66, 103, 178, 0.2)',
  '& svg': {
    color: '#4267B2'
  },
  '&:hover': {
    background: '#4267B2',
    '& svg': {
      color: '#fff'
    }
  }
});

const TwitterWrapper = styled(Button)({
  padding: 8,
  background: 'rgba(29, 161, 242, 0.2)',
  '& svg': {
    color: '#1DA1F2'
  },
  '&:hover': {
    background: '#1DA1F2',
    '& svg': {
      color: '#fff'
    }
  }
});

const LinkedInWrapper = styled(Button)({
  padding: 8,
  background: 'rgba(14, 118, 168, 0.12)',
  '& svg': {
    color: '#0E76A8'
  },
  '&:hover': {
    background: '#0E76A8',
    '& svg': {
      color: '#fff'
    }
  }
});

// ==============================|| USER PROFILE CARD ||============================== //

export default function UserProfileCard({ avatar, name, profile, role, status }: UserProfileCardProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'grey.50',
        border: '1px solid',
        borderColor: 'divider',
        textAlign: 'center'
      }}
    >
      <CardMedia
        component="img"
        image={profile && getImageUrl(`${profile}`, ImagePath.PROFILE)}
        title="Slider5 image"
        sx={{ height: '125px' }}
      />
      <CardContent sx={{ p: 2, pb: '16px !important' }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Grid container spacing={gridSpacing}>
              <Grid size={12}>
                <Avatar
                  alt={name}
                  src={avatar && getImageUrl(`${avatar}`, ImagePath.USERS)}
                  sx={{ width: 72, height: 72, m: '-50px auto 0' }}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid sx={{ alignItems: 'center' }} size={12}>
            <Grid container spacing={1}>
              <Grid size={12}>
                <Typography variant="h4">{name}</Typography>
              </Grid>
              <Grid size={12}>
                <Typography variant="body2">{role}</Typography>
              </Grid>
              <Grid size={12}>
                {status === 'Active' ? (
                  <Chip label="Active" size="small" color="success" />
                ) : (
                  <Chip label="Rejected" size="small" color="error" />
                )}
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid size={4}>
                <FacebookWrapper fullWidth aria-label="facebook-icon">
                  <FacebookIcon />
                </FacebookWrapper>
              </Grid>
              <Grid size={4}>
                <TwitterWrapper fullWidth aria-label="twitter-icon">
                  <TwitterIcon />
                </TwitterWrapper>
              </Grid>
              <Grid size={4}>
                <LinkedInWrapper fullWidth aria-label="linkedin-icon">
                  <LinkedInIcon />
                </LinkedInWrapper>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Button variant="outlined" fullWidth startIcon={<ChatBubbleTwoToneIcon />}>
              Message
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
