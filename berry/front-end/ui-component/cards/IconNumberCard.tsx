// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from './MainCard';
import { GenericCardProps } from 'types';

// =============================|| ICON NUMBER CARD ||============================= //

interface IconNumberCardProps extends GenericCardProps {}

export default function IconNumberCard({ title, primary, color, iconPrimary }: IconNumberCardProps) {
  const IconPrimary = iconPrimary!;
  const primaryIcon = iconPrimary ? <IconPrimary /> : null;

  return (
    <MainCard>
      <Grid container spacing={2} sx={{ alignItems: 'center' }}>
        <Grid size={12}>
          <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Grid>
              <Typography variant="subtitle2" sx={{ color }}>
                {primaryIcon}
              </Typography>
              <Typography variant="h5" color="inherit">
                {title}
              </Typography>
            </Grid>
            <Grid>
              <Typography variant="h3">{primary}</Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
}
