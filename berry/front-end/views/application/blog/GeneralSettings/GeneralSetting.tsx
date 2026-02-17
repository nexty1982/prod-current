// material-ui
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import PublicTwoToneIcon from '@mui/icons-material/PublicTwoTone';

// ==============================|| GENERAL SETTING ||============================== //

export default function GeneralSetting() {
  return (
    <MainCard title="General Settings">
      <Grid container spacing={gridSpacing}>
        <Grid size={12}>
          <TextField fullWidth label="Publication Name" defaultValue="Berry" />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="About Me"
            defaultValue="Berry React is modern admin dashboard template made using Material-UI library. I write all possible details of roadmap, features, Material-UI through this blogs."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            id="input-with-icon-textfield"
            label="Twitter Profile"
            fullWidth
            defaultValue="http://twitter.com/username"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <TwitterIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            id="input-with-icon-textfield"
            label="Instagram Profile"
            fullWidth
            defaultValue="http://instagram.com/username"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <InstagramIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            id="input-with-icon-textfield"
            label="Github Profile"
            fullWidth
            defaultValue="http://github.com/username"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <GitHubIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            id="input-with-icon-textfield"
            label="Your Website"
            fullWidth
            defaultValue="https://berrydashboard.com"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PublicTwoToneIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            id="input-with-icon-textfield"
            label="Your Youtube Channel"
            fullWidth
            defaultValue="https://www.youtube.com/channel/UCiZG__BaRkT1OuZl5ifzO6A"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <YouTubeIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            id="input-with-icon-textfield"
            label="Linkedin Profile"
            fullWidth
            defaultValue="http://linkdin.com/username"
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkedInIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>
      </Grid>
    </MainCard>
  );
}
