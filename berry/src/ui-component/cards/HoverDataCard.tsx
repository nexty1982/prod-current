// material-ui
import { SvgIconTypeMap } from '@mui/material/SvgIcon';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { OverridableComponent } from '@mui/material/OverridableComponent';

// project imports
import MainCard from './MainCard';
import { GenericCardProps } from 'types';

interface HoverDataCardProps extends GenericCardProps {
  iconPrimary: OverridableComponent<SvgIconTypeMap<{}, 'svg'>> & { muiName: string };
}

// ============================|| HOVER DATA CARD ||============================ //

export default function HoverDataCard({ title, iconPrimary, primary, secondary, color }: HoverDataCardProps) {
  const IconPrimary = iconPrimary;
  const primaryIcon = iconPrimary !== undefined ? <IconPrimary fontSize="large" sx={{ width: 20, height: 20, color }} /> : null;

  return (
    <MainCard>
      <Stack spacing={1.75} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" color="inherit">
          {title}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mx: 'auto' }}>
          {primaryIcon}
          <Typography variant="h3">{primary}</Typography>
        </Stack>
        <Typography variant="body2" color="textSecondary">
          {secondary}
        </Typography>
      </Stack>
    </MainCard>
  );
}
