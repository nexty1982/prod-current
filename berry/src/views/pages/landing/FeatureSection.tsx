// material-ui
import { useTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CardMedia from '@mui/material/CardMedia';

// project imports
import FadeInWhenVisible from './Animation';
import { ThemeMode } from 'config';
import SubCard from 'ui-component/cards/SubCard';
import Avatar from 'ui-component/extended/Avatar';

// assets
import Offer1 from 'assets/images/landing/offer/offer-1.png';
import Offer2 from 'assets/images/landing/offer/offer-2.png';
import Offer3 from 'assets/images/landing/offer/offer-3.png';
import Offer4 from 'assets/images/landing/offer/offer-4.png';
import Offer5 from 'assets/images/landing/offer/offer-5.png';
import Offer6 from 'assets/images/landing/offer/offer-6.png';

interface OfferCardProps {
  title: string;
  caption: string;
  image: string;
}

function OfferCard({ title, caption, image }: OfferCardProps) {
  const theme = useTheme();
  const AvaterSx = { bgcolor: 'transparent', color: 'secondary.main', width: 56, height: 56 };

  return (
    <FadeInWhenVisible>
      <SubCard
        sx={{
          bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.800' : 'grey.100',
          borderColor: 'divider',
          '&:hover': { boxShadow: 'none' },
          height: 1
        }}
      >
        <Stack spacing={4}>
          <Avatar variant="rounded" sx={AvaterSx}>
            <CardMedia component="img" src={image} alt="Beautiful User Interface" />
          </Avatar>
          <Stack spacing={2}>
            <Typography variant="h3" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '1rem' }}>
              {caption}
            </Typography>
          </Stack>
        </Stack>
      </SubCard>
    </FadeInWhenVisible>
  );
}

// =============================|| LANDING - FEATURE PAGE ||============================= //

export default function FeatureSection() {
  return (
    <Container>
      <Grid container spacing={7.5} sx={{ justifyContent: 'center' }}>
        <Grid sx={{ textAlign: 'center' }} size={{ xs: 12, md: 6 }}>
          <Grid container spacing={1.5}>
            <Grid size={12}>
              <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                What does Berry offer?
              </Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="body2" sx={{ fontSize: '1rem' }}>
                Berry is a reliable choice for your admin panel needs, offering a wide range of features to easily manage your backend
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={12}>
          <Grid container spacing={5} sx={{ justifyContent: 'center', '&> .MuiGrid-root > div': { height: '100%' } }}>
            <Grid size={{ md: 4, sm: 6 }}>
              <OfferCard
                title="Beautiful User Interface"
                caption="Berry can improve the user experience of your web application by providing a clear and intuitive layout, and consistent look and feel."
                image={Offer1}
              />
            </Grid>
            <Grid size={{ md: 4, sm: 6 }}>
              <OfferCard
                title="Time and Cost Savings"
                caption="Berry can save developers time and effort by providing a pre-built user interface, allowing them to focus on other aspects of the project."
                image={Offer2}
              />
            </Grid>
            <Grid size={{ md: 4, sm: 6 }}>
              <OfferCard
                title="Reduce Development Complexity"
                caption="Berry simplifies admin panel development with easy theme setup and clear code with flexible layouts options."
                image={Offer3}
              />
            </Grid>
            <Grid size={{ md: 4, sm: 6 }}>
              <OfferCard
                title="Improved Scalability"
                caption="Berry uses scalable technologies and resources to ensure that your admin panel remains efficient and effective as your needs evolve."
                image={Offer4}
              />
            </Grid>
            <Grid size={{ md: 4, sm: 6 }}>
              <OfferCard
                title=" Well-Documented and Supported"
                caption="With a range of resources including user guides, tutorials, and FAQs to help users understand and effectively use the Berry."
                image={Offer5}
              />
            </Grid>
            <Grid size={{ md: 4, sm: 6 }}>
              <OfferCard
                title="Performance Centric"
                caption="Berry is a performance-centric dashboard template that is designed to deliver optimal performance for your admin panel."
                image={Offer6}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}
