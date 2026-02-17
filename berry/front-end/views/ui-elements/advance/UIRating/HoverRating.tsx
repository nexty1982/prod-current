import React from 'react';

// project imports
import { KeyedObject } from 'types';

// material-ui
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// rating labels
const labels: KeyedObject = {
  0.5: 'Useless',
  1: 'Useless+',
  1.5: 'Poor',
  2: 'Poor+',
  2.5: 'Normal',
  3: 'Normal+',
  3.5: 'Good',
  4: 'Good+',
  4.5: 'Excellent',
  5: 'Excellent+'
};

// ===============================|| UI RATING - HOVER ||=============================== //

export default function HoverRating() {
  const [value, setValue] = React.useState<number | null>(2);
  const [hover, setHover] = React.useState<number>(-1);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
      <Rating
        name="hover-feedback"
        value={value}
        precision={0.5}
        onChange={(event: React.SyntheticEvent<Element, Event>, newValue: number | null) => {
          setValue(newValue);
        }}
        onChangeActive={(event: React.SyntheticEvent<Element, Event>, newHover: number) => {
          setHover(newHover);
        }}
      />
      {value !== null && (
        <Box
          sx={{
            ml: 2
          }}
        >
          {labels[hover !== -1 ? hover : value]}
        </Box>
      )}
    </Stack>
  );
}
