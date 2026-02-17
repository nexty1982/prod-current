// material-ui
import Grid from '@mui/material/Grid';

// project imports
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import TotalIncomeLightCard from 'ui-component/cards/TotalIncomeLightCard';

import { gridSpacing } from 'store/constant';

// assets
import PersonAddAlt1TwoToneIcon from '@mui/icons-material/PersonAddAlt1TwoTone';
import StorefrontTwoToneIcon from '@mui/icons-material/StorefrontTwoTone';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';

const widgetData = [
  { number: 120, label: 'Meeting attends', icon: <VideoCameraFrontIcon fontSize="inherit" /> },
  { number: 234, label: 'Sales improve', icon: <StorefrontTwoToneIcon fontSize="inherit" /> },
  { number: 234, label: 'New users', icon: <PersonAddAlt1TwoToneIcon fontSize="inherit" /> }
];

// ==============================|| LEAD CARDS ||============================== //

export default function LeadCards({ isLoading }: { isLoading: boolean }) {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard isLoading={isLoading} />
      </Grid>
      {widgetData.map((data, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeLightCard key={index} icon={data.icon} label={data.label} total={data.number} isLoading={isLoading} />
        </Grid>
      ))}
    </Grid>
  );
}
