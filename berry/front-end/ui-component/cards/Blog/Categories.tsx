// material-ui
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';

// project imports
import SubCard from 'ui-component/cards/SubCard';

// assets
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';

// ==============================|| BLOG - CATEGORIES ||============================== //

export default function Categories() {
  return (
    <SubCard
      title="Categories"
      secondary={
        <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} startIcon={<AddOutlinedIcon />} color="primary">
          Add new categories
        </Button>
      }
      sx={{ '& .MuiCardHeader-action': { mr: 0 } }}
      actions={
        <Button size="small" disableElevation>
          See more <ExpandMoreOutlinedIcon fontSize="small" sx={{ mb: 0.25 }} />
        </Button>
      }
      footerSX={{ p: 1.25, justifyContent: 'center' }}
    >
      <FormGroup>
        <FormControlLabel control={<Checkbox defaultChecked />} label="React" />
        <FormControlLabel control={<Checkbox />} label="Angular" />
        <FormControlLabel control={<Checkbox />} label="Vue" />
        <FormControlLabel control={<Checkbox />} label="Figma" />
        <FormControlLabel control={<Checkbox />} label="Web Designing" />
      </FormGroup>
    </SubCard>
  );
}
