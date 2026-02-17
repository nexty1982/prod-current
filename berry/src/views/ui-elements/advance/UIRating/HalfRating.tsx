// material-ui
import Grid from '@mui/material/Grid';
import Rating from '@mui/material/Rating';

// ===============================|| UI RATING - HALF ||=============================== //

export default function HalfRating() {
  return (
    <>
      <Grid container sx={{ justifyContent: 'center', mb: 1 }}>
        <Rating name="half-rating" defaultValue={2.5} precision={0.5} />
      </Grid>
      <Grid container sx={{ justifyContent: 'center' }}>
        <Rating name="half-rating-read" defaultValue={2.5} precision={0.5} readOnly />
      </Grid>
    </>
  );
}
