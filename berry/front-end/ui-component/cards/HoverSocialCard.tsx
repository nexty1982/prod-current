// material-ui
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// types
import { GenericCardProps } from 'types';

// ===========================|| HOVER SOCIAL CARD ||=========================== //

interface HoverSocialCardProps extends GenericCardProps {}

export default function HoverSocialCard({ primary, secondary, iconPrimary, color }: HoverSocialCardProps) {
  const IconPrimary = iconPrimary!;
  const primaryIcon = iconPrimary ? <IconPrimary fontSize="large" /> : null;

  return (
    <Card
      sx={{
        bgcolor: color,
        position: 'relative',
        color: '#fff',
        '&:hover svg': {
          opacity: '1',
          transform: 'scale(1.1)'
        }
      }}
    >
      <CardContent>
        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            right: 15,
            top: 25,
            color: '#fff',
            '&> svg': {
              width: 40,
              height: 40,
              opacity: '0.4',
              transition: 'all .3s ease-in-out'
            }
          }}
        >
          {primaryIcon}
        </Typography>
        <Grid container spacing={0}>
          <Grid size={12}>
            <Typography variant="h3" color="inherit">
              {secondary}
            </Typography>
          </Grid>
          <Grid size={12}>
            <Typography variant="subtitle2" color="inherit">
              {primary}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
