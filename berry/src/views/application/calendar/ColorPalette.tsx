// material-ui
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

// project imports
import { ColorPaletteProps } from 'types';

// ==============================|| CALENDAR COLOR PALETTE ||============================== //

export default function ColorPalette({ color, label, value }: ColorPaletteProps) {
  return (
    <FormControlLabel
      value={value}
      control={<Radio sx={{ color, '&.Mui-checked': { color } }} />}
      label={label || ''}
      sx={{ pr: label ? 1 : 0 }}
    />
  );
}
