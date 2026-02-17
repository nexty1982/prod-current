// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from './MainCard';
import { GenericCardProps } from 'types';

// ==============================|| REPORT CARD ||============================== //

interface ReportCardProps extends GenericCardProps {}

export default function ReportCard({ primary, secondary, iconPrimary, color }: ReportCardProps) {
  const IconPrimary = iconPrimary!;
  const primaryIcon = iconPrimary ? <IconPrimary fontSize="large" /> : null;

  return (
    <MainCard>
      <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Grid>
          <Stack spacing={1}>
            <Typography variant="h3">{primary}</Typography>
            <Typography variant="body1">{secondary}</Typography>
          </Stack>
        </Grid>
        <Grid>
          <Typography variant="h2" sx={{ color }}>
            {primaryIcon}
          </Typography>
        </Grid>
      </Grid>
    </MainCard>
  );
}
