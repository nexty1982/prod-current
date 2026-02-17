// material-ui
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

// project imports
import SubCard from 'ui-component/cards/SubCard';

// ==============================|| BLOG - COMMENT CARD ||============================== //

export default function CommentCard() {
  return (
    <SubCard title="Show Comment" contentSX={{ '&:last-child': { pb: 2.5 } }}>
      <FormControlLabel control={<Switch defaultChecked />} label="Show comment" />
    </SubCard>
  );
}
