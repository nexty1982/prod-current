// material ui
import Grid from '@mui/material/Grid';

// third party
import ReCAPTCHA from 'react-google-recaptcha';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// assets
import LinkIcon from '@mui/icons-material/Link';

// ==============================|| PLUGIN - GOOGLE RECAPTCHA ||============================== //

export default function RecaptchaPage() {
  const handleOnChange = () => {};

  return (
    <MainCard
      title="ReCaptcha"
      secondary={
        <SecondaryAction icon={<LinkIcon sx={{ fontSize: 'small' }} />} link="https://www.npmjs.com/package/react-google-recaptcha" />
      }
    >
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 12, lg: 6 }}>
          <SubCard sx={{ overflowX: 'auto' }} title="ReCaptcha Example">
            <ReCAPTCHA sitekey="6LdzqbcaAAAAALrGEZWQHIHUhzJZc8O-KSTdTTh_" onChange={handleOnChange} />
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
