// mui
import Grid from '@mui/material/Grid';

// project imports
import HoverDataCard from 'ui-component/cards/HoverDataCard';

// assets
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const widgetData = [
  { number: 30200, label: 'Funds' },
  { number: 9320, label: 'Earning' },
  { number: 15234, label: 'Fees' }
];

// ==============================|| STATEMENT - OVERVIEW ||============================== //

export default function OverView() {
  return (
    <Grid container spacing={1}>
      <Grid container spacing={2.5} size={12}>
        {widgetData.map((data, index) => (
          <Grid key={index} size={{ xs: 12, sm: 4 }}>
            <HoverDataCard
              title={data.label}
              iconPrimary={data?.number > 10000 ? ArrowUpwardIcon : ArrowDownwardIcon}
              primary={`${data.number}`}
              secondary="8% less Last 3 Months"
              color={data?.number > 10000 ? 'success.dark' : 'error.main'}
            />
          </Grid>
        ))}
      </Grid>
    </Grid>
  );
}
