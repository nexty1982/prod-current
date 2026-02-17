// material-ui
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

// project imports
import SubCard from 'ui-component/cards/SubCard';

// ==============================|| BLOG - LIKE CARD ||============================== //

export default function LikeCard() {
  return (
    <SubCard title="Show Like" contentSX={{ '&:last-child': { pb: 2.5 } }}>
      <FormControlLabel control={<Switch defaultChecked />} label="Show like" />
    </SubCard>
  );
}
