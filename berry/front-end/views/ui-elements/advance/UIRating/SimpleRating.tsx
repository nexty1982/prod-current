import React from 'react';

// material-ui
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ===============================|| UI RATING - SIMPLE ||=============================== //

export default function SimpleRating() {
  const [value, setValue] = React.useState<number | null>(2);

  return (
    <Stack sx={{ gap: { xs: 3, sm: 1.5 }, alignItems: 'center' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
        <Typography component="legend">Controlled</Typography>
        <Rating
          name="simple-controlled"
          value={value}
          onChange={(event: React.SyntheticEvent<Element, Event>, newValue: number | null) => {
            setValue(newValue);
          }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
        <Typography component="legend">Read only</Typography>
        <Rating name="read-only" value={value} readOnly />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
        <Typography component="legend">Disabled</Typography>
        <Rating name="disabled" value={value} disabled />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
        <Typography component="legend">Pristine</Typography>
        <Rating name="pristine" value={null} />
      </Stack>
    </Stack>
  );
}
