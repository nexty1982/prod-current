// material-ui
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// assets
import { IconCircleCheck } from '@tabler/icons-react';
import DownloadIcon from '@mui/icons-material/Download';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import LayerLeft from 'assets/images/landing/customization-left.png';
import LayerRight from 'assets/images/landing/customization-right.png';

// ==============================|| LANDING - CUSTOMIZE ||============================== //

export default function CustomizeSection() {
  const listSX = {
    display: 'flex',
    gap: '0.7rem',
    padding: '10px 0',
    fontSize: '1rem',
    color: 'grey.900',
    svg: { color: 'secondary.main', minWidth: 20 }
  };

  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Grid container spacing={{ xs: 1.5, sm: 2.5, md: 3, lg: 5 }} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Grid sx={{ img: { width: '100%' } }} size={{ xs: 12, md: 6 }}>
          <Stack sx={{ width: '75%', mb: 5, mx: 'auto' }}>
            <CardMedia component="img" image={LayerLeft} alt="Layer" />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' }, mb: 2 }}>
                Easy Developer Experience
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'text.primary',
                  fontSize: '1rem',
                  zIndex: '99',
                  width: { xs: '100%', sm: '100%', md: 'calc(100% - 20%)' }
                }}
              >
                Berry has made it easy for developers of any skill level to use their product.
              </Typography>
            </Grid>
            <Grid size={12}>
              <Typography sx={listSX}>
                <IconCircleCheck size={20} />A straightforward and simple folder structure.
              </Typography>
              <Typography sx={listSX}>
                <IconCircleCheck size={20} />
                Code that is organized in a clear and logical manner.
              </Typography>
              <Typography sx={listSX}>
                <IconCircleCheck size={20} />
                Setting up Typography and Color schemes is easy and effortless.
              </Typography>
              <Typography sx={listSX}>
                <IconCircleCheck size={20} />
                Multiple layout options that can be easily adjusted.
              </Typography>
              <Typography sx={listSX}>
                <IconCircleCheck size={20} />A theme that can be easily configured on a single page.
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={12}>
          <Grid container spacing={2.5} direction={{ xs: 'column-reverse', md: 'row' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Grid container spacing={2.5}>
                <Grid size={12}>
                  <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' }, mb: 2 }}>
                    Figma Design System
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: 'text.primary', fontSize: '1rem', zIndex: '99', width: { xs: '100%', md: 'calc(100% - 20%)' } }}
                  >
                    Streamlining the development process and saving you time and effort in the initial design phase.
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography sx={listSX}>
                    <IconCircleCheck size={20} />
                    Professional Kit for Designer
                  </Typography>
                  <Typography sx={listSX}>
                    <IconCircleCheck size={20} />
                    Properly Organised Pages
                  </Typography>
                  <Typography sx={listSX}>
                    <IconCircleCheck size={20} />
                    Dark/Light Design
                  </Typography>
                  <Typography sx={listSX}>
                    <IconCircleCheck size={20} />
                    *Figma file included only in Plus & Extended Licenses.
                  </Typography>
                  <Typography sx={listSX}>
                    <IconCircleCheck size={20} />A theme that can be easily configured on a single page.
                  </Typography>
                  <Stack direction="row" sx={{ gap: 1.5 }}>
                    <Button
                      startIcon={<ShoppingCartIcon />}
                      sx={{ boxShadow: 'none', my: 4 }}
                      variant="contained"
                      component={Link}
                      href="https://codedthemes.com/item/berry-figma-ui-kit/"
                      target="_blank"
                    >
                      Buy Figma
                    </Button>
                    <Button
                      startIcon={<DownloadIcon />}
                      sx={{ boxShadow: 'none', my: 4 }}
                      variant="outlined"
                      component={Link}
                      href="https://codedthemes.com/item/berry-free-figma-ui-kit/"
                      target="_blank"
                    >
                      Free Figma
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Grid>
            <Grid sx={{ img: { width: '100%' } }} size={{ xs: 12, md: 6 }}>
              <Stack sx={{ width: '70%', mx: 'auto' }}>
                <CardMedia component="img" image={LayerRight} alt="Layer" />
              </Stack>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}
