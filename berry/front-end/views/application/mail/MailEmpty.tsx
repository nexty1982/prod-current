// material-ui
import { useTheme } from '@mui/material/styles';
import CardMedia from '@mui/material/CardMedia';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';
import imageEmpty from 'assets/images/maintenance/empty.svg';
import imageDarkEmpty from 'assets/images/maintenance/empty-dark.svg';

// ==============================|| NO/EMPTY MAIL ||============================== //

export default function MailEmpty() {
  const theme = useTheme();

  return (
    <Stack spacing={gridSpacing} sx={{ alignItems: 'center' }}>
      <CardMedia
        component="img"
        image={theme.palette.mode === ThemeMode.DARK ? imageDarkEmpty : imageEmpty}
        title="Slider5 image"
        sx={{ maxWidth: 720 }}
      />
      <Stack spacing={1}>
        <Typography variant="h1" color="inherit">
          There is No Mail
        </Typography>
        <Typography variant="body2">When You have message that will Display here</Typography>
      </Stack>
    </Stack>
  );
}
