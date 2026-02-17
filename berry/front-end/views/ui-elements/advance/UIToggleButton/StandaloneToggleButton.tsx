import React from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import ToggleButton from '@mui/material/ToggleButton';

// assets
import CheckIcon from '@mui/icons-material/CheckTwoTone';

// ============================|| UI TOGGLE BUTTON - STANDALONE ||============================ //

export default function StandaloneToggleButton() {
  const [selected, setSelected] = React.useState(false);

  return (
    <Grid container sx={{ justifyContent: 'center' }}>
      <ToggleButton
        value="check"
        onChange={() => {
          setSelected(!selected);
        }}
        sx={{ color: 'success.dark', bgcolor: 'success.light' }}
        aria-label="standalone toggle button"
      >
        <CheckIcon />
      </ToggleButton>
    </Grid>
  );
}
