// material-ui
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';

// project imports
import SubCard from 'ui-component/cards/SubCard';

// ==============================|| BLOG - VIDEO CARD ||============================== //

export default function VideoCard() {
  return (
    <SubCard title="Video Background" contentSX={{ '&:last-child': { pb: 2.5 } }}>
      <FormGroup>
        <FormControlLabel control={<Checkbox defaultChecked />} label="Last header" />
        <FormControlLabel control={<Checkbox />} label="Post archives" />
        <FormControlLabel control={<Checkbox />} label="Hero Section" />
      </FormGroup>
    </SubCard>
  );
}
