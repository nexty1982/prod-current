import { ReactElement } from 'react';

// material-ui
import { Masonry } from '@mui/lab';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import { cards } from './CardData';
import PeopleCard from './PeopleCard';

// =============================|| LANDING - FEATURE PAGE ||============================= //

export default function PeopleSection() {
  let cardResult: ReactElement | ReactElement[] = <></>;
  if (cards && cards.length > 0) {
    cardResult = cards.map((card, index) => (
      <Grid key={index}>
        <PeopleCard
          id={card.id}
          image={card.image ? card.image : ''}
          name={card.name}
          tag={card.tag}
          content={card.content}
          view={card.view}
        />
      </Grid>
    ));
  }

  return (
    <Container>
      <Grid container spacing={7.5} sx={{ justifyContent: 'center' }}>
        <Grid sx={{ textAlign: 'center' }} size={12}>
          <Stack spacing={1.25} sx={{ alignItems: 'center' }}>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
              Testaments
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 400 }} align="center">
              Real users, real experiences – see what our customers say about Berry!
            </Typography>
          </Stack>
        </Grid>
        <Grid size={12}>
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Masonry columns={{ xs: 1, sm: 2, md: 3, xl: 4 }} spacing={2}>
              {cardResult}
            </Masonry>
            <Box>
              <Button variant="outlined" component={Link} href="https://links.codedthemes.com/hsqll" target="_blank">
                Read more
              </Button>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
