// material-ui
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from './MainCard';

// types
import { GenericCardProps } from 'types';

// ============================|| ROUND ICON CARD ||============================ //

interface Props {
  primary: string;
  secondary: string;
  content: string;
  iconPrimary: GenericCardProps['iconPrimary'];
  color: string;
  bgcolor: string;
}

export default function RoundIconCard({ primary, secondary, content, iconPrimary, color, bgcolor }: Props) {
  const IconPrimary = iconPrimary!;
  const primaryIcon = iconPrimary ? <IconPrimary fontSize="large" /> : null;

  return (
    <MainCard>
      <Grid container spacing={0} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Grid>
          <Stack spacing={1}>
            <Typography variant="h5" color="inherit">
              {primary}
            </Typography>
            <Typography variant="h3">{secondary}</Typography>
            <Typography variant="subtitle2" color="inherit">
              {content}
            </Typography>
          </Stack>
        </Grid>
        <Grid>
          <Avatar sx={{ bgcolor, color, width: 48, height: 48, '& .MuiSvgIcon-root': { fontSize: '1.5rem' } }} aria-label="theme icon">
            {primaryIcon}
          </Avatar>
        </Grid>
      </Grid>
    </MainCard>
  );
}
